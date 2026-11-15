package link

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/minssan9/voyagerss/airspace_edge/internal/proto"
)

func TestIngestSendsTokenAndReturnsCommand(t *testing.T) {
	var got proto.Snapshot
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/airspace/ingest" || r.Header.Get("X-Airspace-Token") != "tok" {
			http.Error(w, "bad", http.StatusUnauthorized)
			return
		}
		_ = json.NewDecoder(r.Body).Decode(&got)
		_, _ = io.WriteString(w, `{"result":"SUCCESS","message":"ok","data":{"events":0,"command":{"seq":4,"mode":"lock","trackId":7}}}`)
	}))
	defer srv.Close()

	cmd, err := NewClient(srv.URL, "tok").Ingest(context.Background(), proto.Snapshot{SessionID: "s1", Tracks: []proto.Track{}})
	if err != nil {
		t.Fatal(err)
	}
	if got.SessionID != "s1" || cmd == nil || cmd.Seq != 4 || cmd.Mode != proto.ModeLock || *cmd.TrackID != 7 {
		t.Fatalf("got %+v cmd %+v", got, cmd)
	}
	if _, err := NewClient(srv.URL, "wrong").Ingest(context.Background(), proto.Snapshot{}); err == nil {
		t.Fatal("expected an error on 401")
	}
}

func TestPusherDeliversCommandsAndFrames(t *testing.T) {
	frames := make(chan int, 4)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/api/airspace/frame":
			b, _ := io.ReadAll(r.Body)
			frames <- len(b)
		default:
			_, _ = io.WriteString(w, `{"result":"SUCCESS","message":"ok","data":{"events":0,"command":{"seq":1,"mode":"home"}}}`)
		}
	}))
	defer srv.Close()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	p := NewPusher(NewClient(srv.URL, ""))
	p.Run(ctx, 50, 50)
	p.Offer(proto.Snapshot{}, []byte{0xFF, 0xD8, 1, 2})
	select {
	case c := <-p.Commands:
		if c.Mode != proto.ModeHome {
			t.Fatalf("command %+v", c)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("no command")
	}
	select {
	case n := <-frames:
		if n != 4 {
			t.Fatalf("frame %d bytes", n)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("no frame")
	}
}

func TestLocalTracksEndpoint(t *testing.T) {
	l := NewLocal()
	l.Publish(proto.Snapshot{Ts: 1, Tracks: []proto.Track{{ID: 3}}}, nil)
	srv := httptest.NewServer(l.Handler())
	defer srv.Close()
	resp, err := http.Get(srv.URL + "/tracks")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var body struct {
		Ts     float64       `json:"ts"`
		Tracks []proto.Track `json:"tracks"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&body)
	if body.Ts != 1 || len(body.Tracks) != 1 || body.Tracks[0].ID != 3 {
		t.Fatalf("%+v", body)
	}
}
