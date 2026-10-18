package vision

import (
	"math/rand"
	"testing"
)

// sky is a bright gradient with mild noise; the bottom 40% is dark ground.
func sky(rng *rand.Rand) *Gray {
	g := NewGray(320, 240)
	for y := 0; y < g.H; y++ {
		for x := 0; x < g.W; x++ {
			v := 210 - y/4 + rng.Intn(5) - 2
			if y >= 144 {
				v = 50 + rng.Intn(5) - 2
			}
			g.Pix[y*g.W+x] = uint8(v)
		}
	}
	return g
}

func disc(g *Gray, cx, cy, r int, v uint8) {
	for y := cy - r; y <= cy+r; y++ {
		for x := cx - r; x <= cx+r; x++ {
			if (x-cx)*(x-cx)+(y-cy)*(y-cy) <= r*r && x >= 0 && y >= 0 && x < g.W && y < g.H {
				g.Pix[y*g.W+x] = v
			}
		}
	}
}

func newDet(mod func(*DetectorConfig)) (*Detector, *rand.Rand) {
	cfg := DefaultDetectorConfig()
	cfg.WarmupFrames, cfg.PersistWindow, cfg.PersistMin = 20, 6, 4
	if mod != nil {
		mod(&cfg)
	}
	d := NewDetector(cfg)
	rng := rand.New(rand.NewSource(1))
	for i := 0; i < 25; i++ {
		d.Analyze(sky(rng))
	}
	return d, rng
}

func TestSmallMovingBlobDetectedAfterPersistence(t *testing.T) {
	d, rng := newDet(nil)
	var first, last []Detection
	for i := 0; i < 8; i++ {
		g := sky(rng)
		disc(g, 60+i*6, 50+i*2, 4, 30)
		got := d.Analyze(g)
		if i == 0 {
			first = got
		}
		last = got
	}
	if len(first) != 0 {
		t.Fatal("one frame must not be enough")
	}
	if len(last) != 1 || last[0].Label != "aerial" {
		t.Fatalf("got %+v", last)
	}
	cx, _ := last[0].Box.Center()
	if cx < 60+7*6-8 || cx > 60+7*6+8 {
		t.Fatalf("centre x = %.1f", cx)
	}
}

func TestSingleFrameFlickerIgnored(t *testing.T) {
	d, rng := newDet(nil)
	g := sky(rng)
	disc(g, 100, 40, 4, 30)
	if len(d.Analyze(g)) != 0 {
		t.Fatal("flicker detected")
	}
	for i := 0; i < 6; i++ {
		if len(d.Analyze(sky(rng))) != 0 {
			t.Fatal("flicker detected later")
		}
	}
}

func TestMotionBelowSkyLineIgnored(t *testing.T) {
	d, rng := newDet(func(c *DetectorConfig) { c.SkyRatio = 0.6 })
	for i := 0; i < 8; i++ {
		g := sky(rng)
		disc(g, 60+i*6, 200, 4, 255)
		if len(d.Analyze(g)) != 0 {
			t.Fatal("ground motion detected")
		}
	}
}

func TestLargeObjectRejected(t *testing.T) {
	d, rng := newDet(func(c *DetectorConfig) { c.MaxArea = 400 })
	for i := 0; i < 8; i++ {
		g := sky(rng)
		disc(g, 80+i*5, 60, 35, 20)
		if len(d.Analyze(g)) != 0 {
			t.Fatal("large object detected")
		}
	}
}

func TestWholeFrameChangeResetsBackground(t *testing.T) {
	d, rng := newDet(nil)
	g := sky(rng)
	for i := range g.Pix {
		g.Pix[i] /= 2 // exposure jump or fast slew
	}
	if got := d.Analyze(g); len(got) != 0 || !d.Moving {
		t.Fatalf("got %+v moving=%v", got, d.Moving)
	}
}

func TestDownscaleKeepsFullResolutionBoxes(t *testing.T) {
	cfg := DefaultDetectorConfig()
	cfg.AnalysisWidth, cfg.WarmupFrames, cfg.PersistWindow, cfg.PersistMin = 320, 5, 4, 3
	d := NewDetector(cfg)
	big := func(cx int) *Gray {
		g := NewGray(640, 480)
		for i := range g.Pix {
			g.Pix[i] = 200
		}
		disc(g, cx, 100, 8, 20)
		return g
	}
	for i := 0; i < 6; i++ {
		d.Analyze(func() *Gray {
			g := NewGray(640, 480)
			for j := range g.Pix {
				g.Pix[j] = 200
			}
			return g
		}())
	}
	var got []Detection
	for i := 0; i < 5; i++ {
		got = d.Analyze(big(300 + i*8))
	}
	if len(got) != 1 {
		t.Fatalf("got %+v", got)
	}
	cx, cy := got[0].Box.Center()
	if cx < 320 || cx > 345 || cy < 90 || cy > 110 {
		t.Fatalf("centre (%.0f, %.0f) not in full-resolution pixels", cx, cy)
	}
}

func TestGhostOfLearnedTargetFades(t *testing.T) {
	cfg := DefaultDetectorConfig()
	cfg.WarmupFrames, cfg.PersistWindow, cfg.PersistMin = 3, 6, 4
	d := NewDetector(cfg)
	rng := rand.New(rand.NewSource(2))
	for i := 0; i < 10; i++ { // a target present from the first frame is learned as background
		g := sky(rng)
		disc(g, 100, 60, 4, 30)
		d.Analyze(g)
	}
	for i := 0; i < 8; i++ { // it leaves; the bright hole it leaves must not become a detection
		if got := d.Analyze(sky(rng)); len(got) != 0 {
			t.Fatalf("ghost detected: %+v", got)
		}
	}
}
