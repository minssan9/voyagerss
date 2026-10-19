// Package sim is a virtual airspace for running the edge without hardware: constant-
// velocity targets seen by a radar and a camera on the current pan-tilt pose.
package sim

import (
	"math"
	"math/rand"

	"github.com/minssan9/voyagerss/airspace_edge/internal/radar"
	"github.com/minssan9/voyagerss/airspace_edge/internal/tracking"
	"github.com/minssan9/voyagerss/airspace_edge/internal/vision"
)

type Target struct {
	Name       string
	Position   tracking.Vec3 // world metres at Start
	Velocity   tracking.Vec3 // m/s
	SizeM      float64
	Start, End float64
}

func (t Target) At(ts float64) (tracking.Vec3, bool) {
	if ts < t.Start || ts > t.End {
		return tracking.Vec3{}, false
	}
	dt := ts - t.Start
	return tracking.Vec3{t.Position[0] + dt*t.Velocity[0], t.Position[1] + dt*t.Velocity[1], t.Position[2] + dt*t.Velocity[2]}, true
}

// DefaultScenario: a drone approaching from ahead-right, a bird crossing on the left,
// and a second drone appearing later. Loops every 40 s.
func DefaultScenario() []Target {
	return []Target{
		{"drone-a", tracking.SphericalToXYZ(20, 15, 120), tracking.Vec3{-1.5, -6, -0.5}, 0.35, 0, 18},
		{"bird", tracking.SphericalToXYZ(-35, 25, 60), tracking.Vec3{4, 0.5, 0.2}, 0.25, 0, 25},
		{"drone-b", tracking.SphericalToXYZ(-10, 30, 90), tracking.Vec3{2, -3, 0}, 0.35, 8, 34},
	}
}

type World struct {
	Targets       []Target
	Loop          float64
	RadarFOVDeg   float64
	RadarMaxRange float64
	AngleNoiseDeg float64
	RangeNoiseM   float64
	ClutterPerFrm float64
	rng           *rand.Rand
	frameNumber   int
}

func NewWorld(targets []Target, seed int64) *World {
	if targets == nil {
		targets = DefaultScenario()
	}
	return &World{
		Targets: targets, RadarFOVDeg: 60, RadarMaxRange: 150, AngleNoiseDeg: 0.8, RangeNoiseM: 0.3,
		ClutterPerFrm: 1.5, rng: rand.New(rand.NewSource(seed)),
	}
}

func (w *World) clock(t float64) float64 {
	if w.Loop > 0 {
		return math.Mod(t, w.Loop)
	}
	return t
}

func (w *World) RadarFrame(t, pan, tilt float64) radar.Frame {
	t = w.clock(t)
	w.frameNumber++
	var pts []radar.Point
	for _, tg := range w.Targets {
		pos, ok := tg.At(t)
		if !ok {
			continue
		}
		az, el, r := tracking.XYZToSpherical(tracking.WorldToSensor(pos, pan, tilt))
		if r > w.RadarMaxRange || math.Abs(az) > w.RadarFOVDeg || math.Abs(el) > w.RadarFOVDeg {
			continue
		}
		norm := math.Sqrt(pos[0]*pos[0] + pos[1]*pos[1] + pos[2]*pos[2])
		radial := (tg.Velocity[0]*pos[0] + tg.Velocity[1]*pos[1] + tg.Velocity[2]*pos[2]) / norm
		snr := math.Max(6, 30-20*math.Log10(math.Max(r, 1)/10))
		for k := 0; k < 2+w.rng.Intn(3); k++ {
			v := tracking.SphericalToXYZ(az+w.rng.NormFloat64()*w.AngleNoiseDeg, el+w.rng.NormFloat64()*w.AngleNoiseDeg,
				r+w.rng.NormFloat64()*w.RangeNoiseM)
			pts = append(pts, radar.Point{X: v[0], Y: v[1], Z: v[2], Doppler: radial + w.rng.NormFloat64()*0.1,
				SNR: snr + w.rng.NormFloat64()})
		}
	}
	for k := 0; k < poisson(w.rng, w.ClutterPerFrm); k++ {
		v := tracking.SphericalToXYZ(w.rng.Float64()*2*w.RadarFOVDeg-w.RadarFOVDeg, -5+w.rng.Float64()*(w.RadarFOVDeg+5),
			5+w.rng.Float64()*(w.RadarMaxRange-5))
		pts = append(pts, radar.Point{X: v[0], Y: v[1], Z: v[2], Doppler: w.rng.NormFloat64() * 0.3, SNR: w.rng.Float64() * 8})
	}
	return radar.Frame{Number: w.frameNumber, Points: pts}
}

// CameraFrame renders a sky gradient with each target as a dark disc sized by range.
func (w *World) CameraFrame(t, pan, tilt float64, lens tracking.Lens) *vision.Gray {
	t = w.clock(t)
	g := vision.NewGray(lens.Width, lens.Height)
	for y := 0; y < g.H; y++ {
		base := 205 - 25*float64(y)/float64(g.H)
		for x := 0; x < g.W; x++ {
			g.Pix[y*g.W+x] = uint8(math.Max(0, math.Min(255, base+w.rng.NormFloat64()*2)))
		}
	}
	fx := float64(lens.Width) / 2 / math.Tan(lens.HFOV*math.Pi/360)
	for _, tg := range w.Targets {
		pos, ok := tg.At(t)
		if !ok {
			continue
		}
		v := tracking.WorldToSensor(pos, pan, tilt)
		px, py, ok := lens.Project(v)
		if !ok || v[1] <= 1 {
			continue
		}
		rad := math.Max(2, math.Round(fx*tg.SizeM/v[1]))
		for dy := -rad; dy <= rad; dy++ {
			for dx := -rad; dx <= rad; dx++ {
				if dx*dx+dy*dy > rad*rad {
					continue
				}
				x, y := int(px+dx), int(py+dy)
				if x >= 0 && y >= 0 && x < g.W && y < g.H {
					g.Pix[y*g.W+x] = 42
				}
			}
		}
	}
	return g
}

func poisson(rng *rand.Rand, lambda float64) int {
	l, k, p := math.Exp(-lambda), 0, 1.0
	for {
		p *= rng.Float64()
		if p <= l {
			return k
		}
		k++
	}
}
