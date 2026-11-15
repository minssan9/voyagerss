package link

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"sync"

	"github.com/minssan9/voyagerss/airspace_edge/internal/proto"
)

// Local serves an on-site debug view: / (page), /status, /tracks, /stream.mjpg.
type Local struct {
	mu    sync.Mutex
	cond  *sync.Cond
	snap  proto.Snapshot
	jpeg  []byte
	frame uint64
}

func NewLocal() *Local {
	l := &Local{}
	l.cond = sync.NewCond(&l.mu)
	return l
}

func (l *Local) Publish(s proto.Snapshot, jpeg []byte) {
	l.mu.Lock()
	l.snap = s
	if jpeg != nil {
		l.jpeg = jpeg
		l.frame++
	}
	l.mu.Unlock()
	l.cond.Broadcast()
}

const page = `<!doctype html><html><head><meta charset="utf-8"><title>airspace-edge</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;background:#111;color:#eee;font-family:system-ui,sans-serif}main{max-width:960px;margin:0 auto;padding:16px}
img{width:100%;border-radius:12px}pre{background:#1c1c1e;padding:12px;border-radius:12px;font-size:12px;overflow:auto}</style></head>
<body><main><h3>airspace-edge</h3><img src="/stream.mjpg"><pre id="s"></pre></main>
<script>setInterval(()=>fetch('/tracks').then(r=>r.json()).then(j=>{document.getElementById('s').textContent=JSON.stringify(j,null,2)}).catch(()=>{}),500)</script>
</body></html>`

func (l *Local) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		fmt.Fprint(w, page)
	})
	mux.HandleFunc("GET /status", func(w http.ResponseWriter, r *http.Request) {
		l.mu.Lock()
		s := l.snap
		l.mu.Unlock()
		writeJSON(w, s)
	})
	mux.HandleFunc("GET /tracks", func(w http.ResponseWriter, r *http.Request) {
		l.mu.Lock()
		s := l.snap
		l.mu.Unlock()
		writeJSON(w, map[string]any{"ts": s.Ts, "tracks": s.Tracks})
	})
	mux.HandleFunc("GET /stream.mjpg", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "multipart/x-mixed-replace; boundary=frame")
		w.Header().Set("Cache-Control", "no-cache")
		flusher, _ := w.(http.Flusher)
		var seen uint64
		ctx := r.Context()
		go func() { <-ctx.Done(); l.cond.Broadcast() }()
		for {
			l.mu.Lock()
			for l.frame == seen && ctx.Err() == nil {
				l.cond.Wait()
			}
			jpeg, n := l.jpeg, l.frame
			l.mu.Unlock()
			if ctx.Err() != nil {
				return
			}
			seen = n
			if _, err := fmt.Fprintf(w, "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %d\r\n\r\n", len(jpeg)); err != nil {
				return
			}
			if _, err := w.Write(append(jpeg, '\r', '\n')); err != nil {
				return
			}
			if flusher != nil {
				flusher.Flush()
			}
		}
	})
	return mux
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	_ = json.NewEncoder(w).Encode(v)
}

// Serve listens on addr; returns the bound address (useful with ":0").
func (l *Local) Serve(addr string) (string, error) {
	ln, err := net.Listen("tcp", addr)
	if err != nil {
		return "", err
	}
	go func() { _ = http.Serve(ln, l.Handler()) }()
	return ln.Addr().String(), nil
}
