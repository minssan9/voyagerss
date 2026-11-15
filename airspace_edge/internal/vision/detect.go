// Package vision finds small moving objects against the sky in grayscale frames.
package vision

import "math"

// Gray is an 8-bit grayscale frame (the Y plane of the camera's YUV420 output).
type Gray struct {
	W, H int
	Pix  []uint8
}

func NewGray(w, h int) *Gray { return &Gray{w, h, make([]uint8, w*h)} }

// Downscale shrinks by an integer factor with a box filter.
func (g *Gray) Downscale(f int) *Gray {
	if f <= 1 {
		return g
	}
	out := NewGray(g.W/f, g.H/f)
	n := f * f
	for y := 0; y < out.H; y++ {
		for x := 0; x < out.W; x++ {
			sum := 0
			for dy := 0; dy < f; dy++ {
				row := (y*f + dy) * g.W
				for dx := 0; dx < f; dx++ {
					sum += int(g.Pix[row+x*f+dx])
				}
			}
			out.Pix[y*out.W+x] = uint8(sum / n)
		}
	}
	return out
}

// Box is x, y, w, h in full-resolution pixels.
type Box struct{ X, Y, W, H int }

func (b Box) Center() (float64, float64) {
	return float64(b.X) + float64(b.W)/2, float64(b.Y) + float64(b.H)/2
}

type Detection struct {
	Label string
	Box   Box
	Score float64
}

type DetectorConfig struct {
	AnalysisWidth int     // frames wider than this are box-downscaled
	SkyRatio      float64 // analyse only the top fraction of the frame
	MinArea       int     // blob area range, analysis pixels
	MaxArea       int
	MaxAspect     float64
	DiffThreshold float64 // |pixel - background| to count as foreground
	LearnRate     float64 // background running-average rate
	WarmupFrames  int
	PersistWindow int // a blob must be seen PersistMin of the last PersistWindow frames
	PersistMin    int
	MaxJump       float64 // max blob movement between frames, analysis pixels
	// MotionResetRatio: foreground above this fraction of the frame resets the background.
	MotionResetRatio float64
	// DarkOnly: targets are silhouettes darker than the sky (daytime). Brightening pixels
	// are ghosts of moved objects and are learned at once. Set false for lit targets at night.
	DarkOnly bool
}

func DefaultDetectorConfig() DetectorConfig {
	return DetectorConfig{
		AnalysisWidth: 640, SkyRatio: 1, MinArea: 4, MaxArea: 1500, MaxAspect: 4,
		DiffThreshold: 18, LearnRate: 0.05, WarmupFrames: 20, PersistWindow: 8, PersistMin: 5, MaxJump: 25,
		MotionResetRatio: 0.2, DarkOnly: true,
	}
}

type candidate struct {
	cx, cy float64
	box    Box
	hits   []bool
}

// Detector tracks small blobs over frames and reports those that persist, so one-frame
// flicker (leaves, cloud edges, sensor noise) is ignored.
type Detector struct {
	Cfg    DetectorConfig
	bg     []float32
	bw, bh int
	frames int
	cands  []*candidate
	Blobs  int
	Moving bool
}

func NewDetector(cfg DetectorConfig) *Detector { return &Detector{Cfg: cfg} }

func (d *Detector) Analyze(frame *Gray) []Detection {
	scale := 1
	if d.Cfg.AnalysisWidth > 0 && frame.W > d.Cfg.AnalysisWidth {
		scale = int(math.Ceil(float64(frame.W) / float64(d.Cfg.AnalysisWidth)))
	}
	g := frame.Downscale(scale)
	skyH := max(1, int(float64(g.H)*d.Cfg.SkyRatio))
	n := g.W * skyH

	if d.bg == nil || d.bw != g.W || d.bh != skyH {
		d.bg, d.bw, d.bh, d.frames, d.cands = make([]float32, n), g.W, skyH, 0, nil
		for i := 0; i < n; i++ {
			d.bg[i] = float32(g.Pix[i])
		}
	}
	d.frames++
	mask := make([]bool, n)
	thr := float32(d.Cfg.DiffThreshold)
	rate := float32(d.Cfg.LearnRate)
	fgCount := 0
	for i := 0; i < n; i++ {
		p := float32(g.Pix[i])
		diff := p - d.bg[i]
		fg := diff < -thr || (!d.Cfg.DarkOnly && diff > thr)
		mask[i] = fg
		switch {
		case fg:
			fgCount++ // do not learn a target into the background
		case diff > thr:
			d.bg[i] = p // a ghost: something dark that was learned has moved away
		default:
			d.bg[i] += rate * diff
		}
	}
	// Most of the frame changed at once: the gimbal slewed or the exposure jumped.
	// Restart the background from this frame instead of reporting the whole sky.
	d.Moving = float64(fgCount) > d.Cfg.MotionResetRatio*float64(n)
	if d.Moving {
		for i := 0; i < n; i++ {
			d.bg[i] = float32(g.Pix[i])
		}
		d.Blobs = 0
		return nil
	}

	blobs := d.blobs(mask, g.W, skyH)
	d.Blobs = len(blobs)
	if d.frames <= d.Cfg.WarmupFrames {
		d.cands = nil
		return nil
	}
	d.associate(blobs)

	var out []Detection
	for _, c := range d.cands {
		hits := 0
		for _, h := range c.hits {
			if h {
				hits++
			}
		}
		if !c.hits[len(c.hits)-1] || hits < d.Cfg.PersistMin {
			continue
		}
		b := c.box
		out = append(out, Detection{
			Label: "aerial",
			Box:   Box{b.X * scale, b.Y * scale, b.W * scale, b.H * scale},
			Score: math.Round(float64(hits)/float64(d.Cfg.PersistWindow)*1000) / 1000,
		})
	}
	return out
}

// blobs labels 8-connected foreground components and keeps small, compact ones.
func (d *Detector) blobs(mask []bool, w, h int) []candidate {
	seen := make([]bool, len(mask))
	var out []candidate
	stack := make([]int, 0, 64)
	for i, fg := range mask {
		if !fg || seen[i] {
			continue
		}
		seen[i] = true
		stack = append(stack[:0], i)
		area, x0, y0, x1, y1 := 0, w, h, -1, -1
		for len(stack) > 0 {
			j := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			area++
			x, y := j%w, j/w
			x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
			for dy := -1; dy <= 1; dy++ {
				for dx := -1; dx <= 1; dx++ {
					nx, ny := x+dx, y+dy
					if nx < 0 || ny < 0 || nx >= w || ny >= h {
						continue
					}
					k := ny*w + nx
					if mask[k] && !seen[k] {
						seen[k] = true
						stack = append(stack, k)
					}
				}
			}
		}
		bw, bh := x1-x0+1, y1-y0+1
		boxArea := bw * bh
		if max(area, boxArea) < d.Cfg.MinArea || max(area, boxArea) > d.Cfg.MaxArea {
			continue
		}
		if float64(max(bw, bh))/float64(max(1, min(bw, bh))) > d.Cfg.MaxAspect {
			continue
		}
		out = append(out, candidate{cx: float64(x0) + float64(bw)/2, cy: float64(y0) + float64(bh)/2, box: Box{x0, y0, bw, bh}})
	}
	return out
}

func (d *Detector) associate(blobs []candidate) {
	used := make([]bool, len(blobs))
	for _, c := range d.cands {
		best, bestD := -1, d.Cfg.MaxJump
		for i, b := range blobs {
			if used[i] {
				continue
			}
			if dist := math.Hypot(b.cx-c.cx, b.cy-c.cy); dist <= bestD {
				best, bestD = i, dist
			}
		}
		if best < 0 {
			c.hits = append(c.hits, false)
		} else {
			used[best] = true
			c.cx, c.cy, c.box = blobs[best].cx, blobs[best].cy, blobs[best].box
			c.hits = append(c.hits, true)
		}
		if len(c.hits) > d.Cfg.PersistWindow {
			c.hits = c.hits[len(c.hits)-d.Cfg.PersistWindow:]
		}
	}
	for i, b := range blobs {
		if !used[i] {
			nb := b
			nb.hits = []bool{true}
			d.cands = append(d.cands, &nb)
		}
	}
	kept := d.cands[:0]
	for _, c := range d.cands {
		for _, h := range c.hits {
			if h {
				kept = append(kept, c)
				break
			}
		}
	}
	d.cands = kept
}
