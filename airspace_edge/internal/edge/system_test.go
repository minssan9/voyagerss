package edge

import (
	"encoding/json"
	"math"
	"testing"

	"github.com/minssan9/voyagerss/airspace_edge/internal/gimbal"
	"github.com/minssan9/voyagerss/airspace_edge/internal/proto"
	"github.com/minssan9/voyagerss/airspace_edge/internal/radar"
	"github.com/minssan9/voyagerss/airspace_edge/internal/sim"
	"github.com/minssan9/voyagerss/airspace_edge/internal/tracking"
	"github.com/minssan9/voyagerss/airspace_edge/internal/vision"
)

func newSystem() *System {
	return &System{
		SessionID:  "test",
		Lens:       tracking.Lens{HFOV: 66, VFOV: 41, Width: 640, Height: 480},
		Detector:   vision.NewDetector(vision.DefaultDetectorConfig()),
		Tracker:    tracking.NewTracker(tracking.DefaultConfig(), tracking.DefaultThreatRules()),
		Gimbal:     gimbal.NewController(gimbal.NewMock(), gimbal.DefaultConfig()),
		CameraMode: "sim", RadarMode: "sim",
	}
}

func run(s *System, w *sim.World, seconds float64) ([]*tracking.Track, float64) {
	const fps = 20
	var tracks []*tracking.Track
	var t float64
	for k := 0; k < int(seconds*fps); k++ {
		t = float64(k) / fps
		frame := w.CameraFrame(t, s.Gimbal.Pan, s.Gimbal.Tilt, s.Lens)
		tracks = s.Step(t, frame, []radar.Frame{w.RadarFrame(t, s.Gimbal.Pan, s.Gimbal.Tilt)})
	}
	return tracks, t
}

func TestSingleDroneIsFusedTrackedAndFollowed(t *testing.T) {
	drone := sim.Target{Name: "d", Position: tracking.SphericalToXYZ(25, 20, 70), Velocity: tracking.Vec3{-1, -4, 0}, SizeM: 0.4, End: math.Inf(1)}
	s := newSystem()
	tracks, ts := run(s, sim.NewWorld([]sim.Target{drone}, 3), 8)
	var confirmed []*tracking.Track
	for _, tr := range tracks {
		if tr.Confirmed {
			confirmed = append(confirmed, tr)
		}
	}
	if len(confirmed) != 1 {
		t.Fatalf("confirmed = %d", len(confirmed))
	}
	tr := confirmed[0]
	pos, _ := drone.At(ts)
	az, el, r := tracking.XYZToSpherical(pos)
	if math.Abs(tr.KF.X[0]-az) > 2 || math.Abs(tr.KF.X[1]-el) > 2 || math.Abs(*tr.Range()-r) > 4 {
		t.Fatalf("track %.1f %.1f %.1f vs truth %.1f %.1f %.1f", tr.KF.X[0], tr.KF.X[1], *tr.Range(), az, el, r)
	}
	if p := tr.Proto(); len(p.Sources) != 2 {
		t.Fatalf("sources %v, want camera and radar", p.Sources)
	}
	if s.Gimbal.TargetID == nil || *s.Gimbal.TargetID != tr.ID {
		t.Fatal("gimbal is not following the track")
	}
	if math.Abs(s.Gimbal.Pan-az) > 3 || math.Abs(s.Gimbal.Tilt-el) > 3 {
		t.Fatalf("pose %.1f %.1f vs %.1f %.1f", s.Gimbal.Pan, s.Gimbal.Tilt, az, el)
	}
}

func TestTwoTargetsTwoTracks(t *testing.T) {
	targets := []sim.Target{
		{Name: "a", Position: tracking.SphericalToXYZ(-20, 25, 60), End: math.Inf(1), SizeM: 0.4},
		{Name: "b", Position: tracking.SphericalToXYZ(30, 15, 100), End: math.Inf(1), SizeM: 0.4},
	}
	tracks, _ := run(newSystem(), sim.NewWorld(targets, 3), 4)
	var azs []int
	for _, tr := range tracks {
		if tr.Confirmed {
			azs = append(azs, int(math.Round(tr.KF.X[0]/10)))
		}
	}
	if len(azs) != 2 || azs[0] != -2 || azs[1] != 3 {
		t.Fatalf("azimuths/10 = %v", azs)
	}
}

func TestSnapshotMatchesBackendContract(t *testing.T) {
	drone := sim.Target{Name: "d", Position: tracking.SphericalToXYZ(0, 20, 50), Velocity: tracking.Vec3{0, -3, 0}, End: math.Inf(1), SizeM: 0.4}
	s := newSystem()
	tracks, ts := run(s, sim.NewWorld([]sim.Target{drone}, 3), 2)
	s.Gimbal.Apply(proto.Command{Seq: 3, Mode: proto.ModeManual, Pan: proto.F(10)})
	data, err := json.Marshal(s.Snapshot(ts, tracks))
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	_ = json.Unmarshal(data, &m)
	for _, k := range []string{"sessionId", "ts", "gimbal", "sensors", "camera", "tracks"} {
		if _, ok := m[k]; !ok {
			t.Fatalf("missing %s in %s", k, data)
		}
	}
	g := m["gimbal"].(map[string]any)
	if g["mode"] != "manual" || g["commandSeq"].(float64) != 3 {
		t.Fatalf("gimbal %v", g)
	}
	tr := m["tracks"].([]any)[0].(map[string]any)
	for _, k := range []string{"id", "status", "label", "azimuth", "elevation", "range", "radialVelocity", "threat", "threatScore", "sources", "trail"} {
		if _, ok := tr[k]; !ok {
			t.Fatalf("track missing %s", k)
		}
	}
	if len(tr["trail"].([]any)) == 0 {
		t.Fatal("empty trail")
	}
}

func TestOverlayEncodesJPEG(t *testing.T) {
	drone := sim.Target{Name: "d", Position: tracking.SphericalToXYZ(0, 20, 50), End: math.Inf(1), SizeM: 0.4}
	s := newSystem()
	w := sim.NewWorld([]sim.Target{drone}, 3)
	tracks, ts := run(s, w, 2)
	jpeg, err := s.Overlay(w.CameraFrame(ts, s.Gimbal.Pan, s.Gimbal.Tilt, s.Lens), tracks)
	if err != nil || len(jpeg) < 1000 || jpeg[0] != 0xFF || jpeg[1] != 0xD8 {
		t.Fatalf("jpeg %d bytes, err %v", len(jpeg), err)
	}
}
