package tracking

import (
	"math"
	"math/rand"
	"testing"

	"github.com/minssan9/voyagerss/airspace_edge/internal/proto"
)

func near(t *testing.T, got, want, tol float64, what string) {
	t.Helper()
	if math.Abs(got-want) > tol {
		t.Fatalf("%s = %.3f, want %.3f ± %.3f", what, got, want, tol)
	}
}

func TestHungarianFindsGlobalMinimum(t *testing.T) {
	// Greedy takes (0,0) then (1,1) = 11; the optimum is 2 + 1.5.
	got := Hungarian([][]float64{{1, 2}, {1.5, 10}}, 20)
	if len(got) != 2 || got[0] != (Pair{0, 1}) || got[1] != (Pair{1, 0}) {
		t.Fatalf("got %v", got)
	}
}

func TestHungarianGateAndRectangular(t *testing.T) {
	if got := Hungarian([][]float64{{1, 50, 3}}, 5); len(got) != 1 || got[0] != (Pair{0, 0}) {
		t.Fatalf("got %v", got)
	}
	if got := Hungarian([][]float64{{50}, {60}}, 5); len(got) != 0 {
		t.Fatalf("got %v", got)
	}
}

func TestSensorWorldRoundTrip(t *testing.T) {
	for _, pose := range [][2]float64{{0, 0}, {35, 20}, {-70, 60}} {
		v := SphericalToXYZ(12, -5, 40)
		back := WorldToSensor(SensorToWorld(v, pose[0], pose[1]), pose[0], pose[1])
		for i := range v {
			near(t, back[i], v[i], 1e-9, "roundtrip")
		}
	}
	az, el := SensorBearingToWorld(0, 0, 30, 15)
	near(t, az, 30, 1e-9, "boresight az")
	near(t, el, 15, 1e-9, "boresight el")
}

func TestPixelBearing(t *testing.T) {
	lens := Lens{HFOV: 66, VFOV: 41, Width: 640, Height: 480}
	az, el := lens.PixelToSensor(320, 240)
	near(t, az, 0, 1e-9, "centre az")
	near(t, el, 0, 1e-9, "centre el")
	az, _ = lens.PixelToSensor(640, 240)
	near(t, az, 33, 0.01, "edge az")
	px, py, ok := lens.Project(SphericalToXYZ(10, 5, 1))
	if !ok {
		t.Fatal("not projected")
	}
	baz, bel := lens.PixelToSensor(px, py)
	near(t, baz, 10, 1e-6, "project az")
	near(t, bel, 5, 1e-6, "project el")
}

func TestInverse(t *testing.T) {
	a := Mat{3, 3, []float64{4, 7, 2, 3, 6, 1, 2, 5, 3}}
	ai, ok := Inv(a)
	if !ok {
		t.Fatal("singular")
	}
	id := Mul(a, ai)
	for i := 0; i < 3; i++ {
		for j := 0; j < 3; j++ {
			want := 0.0
			if i == j {
				want = 1
			}
			near(t, id.At(i, j), want, 1e-9, "A*inv(A)")
		}
	}
}

func radar(az, el, r, vr float64) RadarMeasurement { return RadarMeasurement{az, el, r, vr, 20} }

func TestRadarTrackConfirmsAndEstimatesClosingSpeed(t *testing.T) {
	tr := NewTracker(DefaultConfig(), DefaultThreatRules())
	for k := 0; k < 10; k++ {
		ts := float64(k) * 0.1
		tr.Step(ts, nil, []RadarMeasurement{radar(10, 20, 100-6*ts, -6)})
	}
	c := tr.Confirmed()
	if len(c) != 1 {
		t.Fatalf("confirmed = %d", len(c))
	}
	p := c[0].Proto()
	near(t, *p.Range, 100-6*0.9, 1, "range")
	near(t, *p.RadialVelocity, -6, 0.5, "radial velocity")
	if len(p.Sources) != 1 || p.Sources[0] != "radar" {
		t.Fatalf("sources %v", p.Sources)
	}
}

func TestCameraAndRadarFuseIntoOneTrack(t *testing.T) {
	tr := NewTracker(DefaultConfig(), DefaultThreatRules())
	for k := 0; k < 8; k++ {
		tr.Step(float64(k)*0.1, []CameraMeasurement{{10.2, 19.8, "drone", 1}}, []RadarMeasurement{radar(10, 20, 80, -2)})
	}
	if len(tr.Tracks) != 1 {
		t.Fatalf("tracks = %d", len(tr.Tracks))
	}
	p := tr.Tracks[0].Proto()
	if len(p.Sources) != 2 || p.Label != "drone" || p.Range == nil {
		t.Fatalf("got %+v", p)
	}
	if p.Hits != 8 {
		t.Fatalf("hits = %d, want one per cycle", p.Hits)
	}
	if len(p.Trail) != 8 {
		t.Fatalf("trail = %d, want one point per cycle", len(p.Trail))
	}
}

func TestCameraOnlyTrackGainsRangeFromRadar(t *testing.T) {
	tr := NewTracker(DefaultConfig(), DefaultThreatRules())
	for k := 0; k < 5; k++ {
		tr.Step(float64(k)*0.1, []CameraMeasurement{{-20, 30, "aerial", 1}}, nil)
	}
	if tr.Tracks[0].Proto().Range != nil {
		t.Fatal("camera-only track should have no range")
	}
	tr.Step(0.5, []CameraMeasurement{{-20, 30, "aerial", 1}}, []RadarMeasurement{radar(-20.5, 30.5, 55, 0)})
	if len(tr.Tracks) != 1 {
		t.Fatalf("tracks = %d", len(tr.Tracks))
	}
	near(t, *tr.Tracks[0].Proto().Range, 55, 2, "range")
}

func TestTwoTargetsKeepIDsAndLostTrackIsDropped(t *testing.T) {
	tr := NewTracker(DefaultConfig(), DefaultThreatRules())
	for k := 0; k < 6; k++ {
		tr.Step(float64(k)*0.1, nil, []RadarMeasurement{radar(-30, 10, 60, 0), radar(30, 10, 90, 0)})
	}
	ids := map[int]int{}
	for _, trk := range tr.Tracks {
		ids[int(math.Round(trk.KF.X[0]))] = trk.ID
	}
	if len(ids) != 2 || ids[-30] == 0 || ids[30] == 0 {
		t.Fatalf("ids %v", ids)
	}
	for k := 6; k < 40; k++ {
		tr.Step(float64(k)*0.1, nil, []RadarMeasurement{radar(30, 10, 90, 0)})
	}
	if len(tr.Tracks) != 1 || tr.Tracks[0].ID != ids[30] {
		t.Fatalf("tracks %v", tr.Tracks)
	}
}

func TestClutterNeverConfirms(t *testing.T) {
	tr := NewTracker(DefaultConfig(), DefaultThreatRules())
	rng := rand.New(rand.NewSource(0))
	for k := 0; k < 30; k++ {
		tr.Step(float64(k)*0.1, nil, []RadarMeasurement{radar(rng.Float64()*120-60, rng.Float64()*60, 5+rng.Float64()*145, 0)})
	}
	if len(tr.Confirmed()) != 0 {
		t.Fatal("clutter confirmed")
	}
}

func TestDuplicateTracksMerge(t *testing.T) {
	tr := NewTracker(DefaultConfig(), DefaultThreatRules())
	for k := 0; k < 5; k++ {
		// Two radar clusters of one object 1° apart: born as two tracks, merged to one.
		tr.Step(float64(k)*0.1, nil, []RadarMeasurement{radar(20, 15, 100, -5), radar(21, 15.5, 101, -5)})
	}
	if len(tr.Tracks) != 1 {
		t.Fatalf("tracks = %d", len(tr.Tracks))
	}
}

func TestThreatLevels(t *testing.T) {
	r := DefaultThreatRules()
	cases := []struct {
		rng, vr *float64
		label   string
		conf    bool
		want    string
	}{
		{proto.F(25), proto.F(-8), "drone", true, proto.ThreatHigh},
		{proto.F(140), proto.F(1), "aerial", true, proto.ThreatLow},
		{proto.F(25), proto.F(-8), "bird", true, proto.ThreatLow},
		{proto.F(25), proto.F(-8), "drone", false, proto.ThreatLow},
		{nil, nil, "drone", true, proto.ThreatLow},
	}
	for i, c := range cases {
		if got, _ := r.Assess(c.rng, c.vr, c.label, c.conf); got != c.want {
			t.Fatalf("case %d: %s, want %s", i, got, c.want)
		}
	}
}
