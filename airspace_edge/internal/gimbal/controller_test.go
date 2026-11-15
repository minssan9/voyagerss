package gimbal

import (
	"math"
	"testing"

	"github.com/minssan9/voyagerss/airspace_edge/internal/proto"
	"github.com/minssan9/voyagerss/airspace_edge/internal/tracking"
)

type target struct{ az, el, r, vr float64 }

func confirmed(targets ...target) []*tracking.Track {
	tr := tracking.NewTracker(tracking.DefaultConfig(), tracking.DefaultThreatRules())
	for k := 0; k < 5; k++ {
		var ms []tracking.RadarMeasurement
		for _, t := range targets {
			ms = append(ms, tracking.RadarMeasurement{Az: t.az, El: t.el, Range: t.r, RadialVelocity: t.vr, SNR: 20})
		}
		tr.Step(float64(k)*0.1, nil, ms)
	}
	return tr.Tracks
}

func near(t *testing.T, got, want, tol float64, what string) {
	t.Helper()
	if math.Abs(got-want) > tol {
		t.Fatalf("%s = %.2f, want %.2f", what, got, want)
	}
}

func cfg(mod func(*Config)) Config {
	c := DefaultConfig()
	c.LeadS = 0
	if mod != nil {
		mod(&c)
	}
	return c
}

func TestStartsHomeAndWritesServoAngles(t *testing.T) {
	m := NewMock()
	NewController(m, cfg(nil))
	if m.Angles[0] != 90 || m.Angles[1] != 70 {
		t.Fatalf("angles %v", m.Angles)
	}
}

func TestRateLimitedSlew(t *testing.T) {
	tracks := confirmed(target{40, 30, 50, 0})
	c := NewController(NewMock(), cfg(func(c *Config) { c.MaxRateDps, c.HomeTilt = 100, 0 }))
	c.Update(tracks, 0)
	pan, tilt := c.Update(tracks, 0.1)
	near(t, pan, 10, 0.01, "pan")
	near(t, tilt, 10, 0.01, "tilt")
	for k := 2; k < 12; k++ {
		pan, tilt = c.Update(tracks, float64(k)*0.1)
	}
	near(t, pan, 40, 1, "pan")
	near(t, tilt, 30, 1, "tilt")
}

func TestClampsToLimits(t *testing.T) {
	tracks := confirmed(target{120, -40, 50, 0})
	c := NewController(NewMock(), cfg(func(c *Config) { c.MaxRateDps = 1e6 }))
	c.Update(tracks, 0)
	pan, tilt := c.Update(tracks, 1)
	if pan != 90 || tilt != -10 {
		t.Fatalf("pose %.1f %.1f", pan, tilt)
	}
}

func TestAutoPrefersHighestThreat(t *testing.T) {
	tracks := confirmed(target{-30, 20, 140, 0}, target{30, 20, 35, -6})
	c := NewController(NewMock(), cfg(func(c *Config) { c.MaxRateDps = 1e6 }))
	c.Update(tracks, 0)
	c.Update(tracks, 0.1)
	near(t, c.Pan, 30, 1, "pan toward the close, approaching target")
}

func TestLockFollowsChosenTrackThenFallsBackToAuto(t *testing.T) {
	tracks := confirmed(target{-30, 20, 140, 0}, target{30, 20, 35, -6})
	var far int
	for _, tr := range tracks {
		if tr.KF.X[0] < 0 {
			far = tr.ID
		}
	}
	c := NewController(NewMock(), cfg(func(c *Config) { c.MaxRateDps, c.LostTimeoutS = 1e6, 1 }))
	c.Apply(proto.Command{Seq: 1, Mode: proto.ModeLock, TrackID: proto.I(far)})
	c.Update(tracks, 0)
	c.Update(tracks, 0.1)
	near(t, c.Pan, -30, 1, "pan on locked track")
	if c.Mode != proto.ModeLock || *c.LockID != far {
		t.Fatalf("mode %s", c.Mode)
	}
	c.Update(nil, 0.5) // lost briefly: hold
	near(t, c.Pan, -30, 1, "hold")
	c.Update(nil, 2)
	if c.Mode != proto.ModeAuto || c.LockID != nil {
		t.Fatalf("mode %s lock %v", c.Mode, c.LockID)
	}
}

func TestManualAndHomeIgnoreTracksAndStaleCommands(t *testing.T) {
	tracks := confirmed(target{40, 30, 50, 0})
	c := NewController(NewMock(), cfg(func(c *Config) { c.MaxRateDps = 1e6 }))
	c.Apply(proto.Command{Seq: 5, Mode: proto.ModeManual, Pan: proto.F(-45), Tilt: proto.F(60)})
	c.Update(tracks, 0)
	c.Update(tracks, 0.1)
	near(t, c.Pan, -45, 0.01, "manual pan")
	near(t, c.Tilt, 60, 0.01, "manual tilt")
	c.Apply(proto.Command{Seq: 4, Mode: proto.ModeAuto}) // stale
	if c.Mode != proto.ModeManual {
		t.Fatal("stale command applied")
	}
	c.Apply(proto.Command{Seq: 6, Mode: proto.ModeHome})
	c.Update(tracks, 0.2)
	near(t, c.Pan, 0, 0.01, "home pan")
	near(t, c.Tilt, 20, 0.01, "home tilt")
	if g := c.Proto(); g.Mode != proto.ModeHome || g.CommandSeq != 6 {
		t.Fatalf("proto %+v", g)
	}
}
