package radar

import (
	"math"
	"testing"
)

func approx(a, b, tol float64) bool { return math.Abs(a-b) <= tol }

func TestRoundTripThroughChunkedStream(t *testing.T) {
	points := []Point{{1, 10, 2, -3.5, 18.2}, {-2, 30, 5, 0.5, 9.9}}
	data := append([]byte("\x00garbage"), Encode(7, points)...)
	data = append(data, Encode(8, nil)...)
	var p Parser
	var frames []Frame
	for i := 0; i < len(data); i += 13 { // fed in small pieces like a UART
		frames = append(frames, p.Feed(data[i:min(i+13, len(data))])...)
	}
	if len(frames) != 2 || frames[0].Number != 7 || frames[1].Number != 8 {
		t.Fatalf("frames %+v", frames)
	}
	got := frames[0].Points
	if len(got) != 2 || len(frames[1].Points) != 0 {
		t.Fatalf("points %+v", got)
	}
	if !approx(got[0].Y, 10, 1e-5) || !approx(got[0].Doppler, -3.5, 1e-5) || !approx(got[1].SNR, 9.9, 1e-9) {
		t.Fatalf("decoded %+v", got)
	}
}

func TestCorruptHeaderIsSkipped(t *testing.T) {
	bad := Encode(1, []Point{{0, 5, 0, 0, 10}})
	bad[12] = 0xff // absurd packet length
	bad[13] = 0xff
	bad[14] = 0x0f
	frames := (&Parser{}).Feed(append(bad, Encode(2, []Point{{0, 6, 0, 0, 10}})...))
	if len(frames) != 1 || frames[0].Number != 2 {
		t.Fatalf("frames %+v", frames)
	}
}

func TestPointAngles(t *testing.T) {
	p := Point{X: 10, Y: 10}
	if !approx(p.AzimuthDeg(), 45, 1e-9) || !approx(p.ElevationDeg(), 0, 1e-9) || !approx(p.Range(), math.Sqrt(200), 1e-9) {
		t.Fatal(p)
	}
}

func sph(az, el, r float64) Point {
	a, e := az*math.Pi/180, el*math.Pi/180
	return Point{X: r * math.Cos(e) * math.Sin(a), Y: r * math.Cos(e) * math.Cos(a), Z: r * math.Sin(e)}
}

func TestClusterMergesNearbyAndSeparatesFar(t *testing.T) {
	pts := []Point{{0, 20, 5, -2, 15}, {0.3, 20.2, 5.1, -2.2, 12}, {10, 50, 10, 1, 20}}
	dets := Cluster(pts, 1.5, 4, 0)
	if len(dets) != 2 || dets[0].Points != 2 || !approx(dets[0].RadialVelocity, -2.1, 0.1) {
		t.Fatalf("%+v", dets)
	}
}

func TestClusterKeepsFarTargetWithAngularSpread(t *testing.T) {
	// At 100 m, 1.5° of angle error is 2.6 m between points, but it is one object.
	var pts []Point
	for _, az := range []float64{19, 20.5, 20} {
		p := sph(az, 10, 100)
		p.SNR = 15
		pts = append(pts, p)
	}
	if n := len(Cluster(pts, 1.5, 4, 0)); n != 1 {
		t.Fatalf("clusters = %d", n)
	}
}
