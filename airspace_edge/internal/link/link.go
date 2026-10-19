// Package link talks to the NestJS airspace module and serves a local debug page.
//
// Outbound only, so the edge works behind NAT:
//
//	POST {server}/api/airspace/ingest  snapshot JSON  -> pending gimbal command (if any)
//	POST {server}/api/airspace/frame   overlay JPEG
package link

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/minssan9/voyagerss/airspace_edge/internal/proto"
)

type Client struct {
	Base   string
	Token  string
	HTTP   *http.Client
	warned bool
}

func NewClient(base, token string) *Client {
	return &Client{Base: base, Token: token, HTTP: &http.Client{Timeout: 3 * time.Second}}
}

func (c *Client) post(ctx context.Context, path, ctype string, body []byte) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.Base+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", ctype)
	if c.Token != "" {
		req.Header.Set("X-Airspace-Token", c.Token)
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if resp.StatusCode/100 != 2 {
		return nil, fmt.Errorf("%s: HTTP %d %s", path, resp.StatusCode, bytes.TrimSpace(data))
	}
	return data, nil
}

// Ingest sends a snapshot and returns the command the server is holding for us.
func (c *Client) Ingest(ctx context.Context, s proto.Snapshot) (*proto.Command, error) {
	body, err := json.Marshal(s)
	if err != nil {
		return nil, err
	}
	data, err := c.post(ctx, "/api/airspace/ingest", "application/json", body)
	if err != nil {
		return nil, err
	}
	var r proto.IngestResponse
	if err := json.Unmarshal(data, &r); err != nil {
		return nil, err
	}
	if r.Data == nil {
		return nil, nil
	}
	return r.Data.Command, nil
}

func (c *Client) Frame(ctx context.Context, jpeg []byte) error {
	_, err := c.post(ctx, "/api/airspace/frame", "image/jpeg", jpeg)
	return err
}

// Pusher sends the newest snapshot/frame at a fixed rate, dropping stale ones, and
// delivers received commands on Commands.
type Pusher struct {
	client   *Client
	mu       sync.Mutex
	snap     *proto.Snapshot
	frame    []byte
	Commands chan proto.Command
}

func NewPusher(c *Client) *Pusher {
	return &Pusher{client: c, Commands: make(chan proto.Command, 4)}
}

func (p *Pusher) Offer(s proto.Snapshot, jpeg []byte) {
	p.mu.Lock()
	p.snap = &s
	if jpeg != nil {
		p.frame = jpeg
	}
	p.mu.Unlock()
}

func (p *Pusher) Run(ctx context.Context, snapHz, frameHz float64) {
	go p.loop(ctx, snapHz, func() error {
		p.mu.Lock()
		s := p.snap
		p.snap = nil
		p.mu.Unlock()
		if s == nil {
			return nil
		}
		cmd, err := p.client.Ingest(ctx, *s)
		if err == nil && cmd != nil {
			select {
			case p.Commands <- *cmd:
			default:
			}
		}
		return err
	})
	go p.loop(ctx, frameHz, func() error {
		p.mu.Lock()
		f := p.frame
		p.frame = nil
		p.mu.Unlock()
		if f == nil {
			return nil
		}
		return p.client.Frame(ctx, f)
	})
}

func (p *Pusher) loop(ctx context.Context, hz float64, send func() error) {
	if hz <= 0 {
		return
	}
	tick := time.NewTicker(time.Duration(float64(time.Second) / hz))
	defer tick.Stop()
	failing := false
	for {
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
			if err := send(); err != nil {
				if !failing && ctx.Err() == nil {
					log.Printf("[link] server unreachable: %v", err) // logged once per outage
				}
				failing = true
			} else if failing {
				log.Printf("[link] server reachable again")
				failing = false
			}
		}
	}
}
