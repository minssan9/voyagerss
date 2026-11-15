package gimbal

import (
	"math"

	"github.com/minssan9/voyagerss/airspace_edge/internal/proto"
	"github.com/minssan9/voyagerss/airspace_edge/internal/tracking"
)

// Config uses world angles (pan 0 = ahead, right +; tilt 0 = level, up +).
// Servo degrees = Center + Sign * world degrees; adjust Sign/Center to the assembly.
type Config struct {
	PanChannel, TiltChannel int
	PanMin, PanMax          float64
	TiltMin, TiltMax        float64
	PanCenter, PanSign      float64
	TiltCenter, TiltSign    float64
	MaxRateDps              float64
	DeadbandDeg             float64
	LeadS                   float64
	SwitchMargin            float64
	LostTimeoutS            float64
	HomePan, HomeTilt       float64
}

func DefaultConfig() Config {
	return Config{
		PanChannel: 0, TiltChannel: 1, PanMin: -90, PanMax: 90, TiltMin: -10, TiltMax: 90,
		PanCenter: 90, PanSign: 1, TiltCenter: 90, TiltSign: -1,
		MaxRateDps: 120, DeadbandDeg: 0.5, LeadS: 0.15, SwitchMargin: 0.15, LostTimeoutS: 3,
		HomePan: 0, HomeTilt: 20,
	}
}

// Controller decides where the head points:
//
//	auto   follow the confirmed track with the highest alert score
//	lock   follow one track chosen by the operator; back to auto if it stays lost
//	manual hold the operator's pan/tilt
//	home   go to the home pose and stay
type Controller struct {
	Cfg        Config
	Driver     Driver
	Pan, Tilt  float64
	Mode       string
	TargetID   *int
	LockID     *int
	CommandSeq int
	manualPan  float64
	manualTilt float64
	lastT      *float64
	lastSeen   *float64
}

func NewController(d Driver, cfg Config) *Controller {
	c := &Controller{Cfg: cfg, Driver: d, Pan: cfg.HomePan, Tilt: cfg.HomeTilt, Mode: proto.ModeAuto}
	c.send()
	return c
}

// Apply takes an operator command; commands at or below the last seq are ignored.
func (c *Controller) Apply(cmd proto.Command) {
	if cmd.Seq <= c.CommandSeq {
		return
	}
	c.CommandSeq = cmd.Seq
	switch cmd.Mode {
	case proto.ModeAuto:
		c.Mode, c.LockID = proto.ModeAuto, nil
	case proto.ModeLock:
		if cmd.TrackID != nil {
			c.Mode, c.LockID, c.lastSeen = proto.ModeLock, proto.I(*cmd.TrackID), nil
		}
	case proto.ModeManual:
		c.Mode, c.LockID, c.TargetID = proto.ModeManual, nil, nil
		c.manualPan, c.manualTilt = c.Pan, c.Tilt
		if cmd.Pan != nil {
			c.manualPan = *cmd.Pan
		}
		if cmd.Tilt != nil {
			c.manualTilt = *cmd.Tilt
		}
	case proto.ModeHome:
		c.Mode, c.LockID, c.TargetID = proto.ModeHome, nil, nil
	}
}

func (c *Controller) selectAuto(tracks []*tracking.Track) *tracking.Track {
	var best, current *tracking.Track
	for _, t := range tracks {
		if !t.Confirmed {
			continue
		}
		if c.TargetID != nil && t.ID == *c.TargetID {
			current = t
		}
		if best == nil || t.ThreatScore > best.ThreatScore ||
			(t.ThreatScore == best.ThreatScore && rangeOr(t) < rangeOr(best)) {
			best = t
		}
	}
	if current != nil && best != nil && best.ThreatScore-current.ThreatScore < c.Cfg.SwitchMargin {
		return current
	}
	return best
}

func rangeOr(t *tracking.Track) float64 {
	if r := t.Range(); r != nil {
		return *r
	}
	return math.Inf(1)
}

// Update steps the head toward its goal and returns the commanded pose.
func (c *Controller) Update(tracks []*tracking.Track, now float64) (float64, float64) {
	dt := 0.0
	if c.lastT != nil {
		dt = math.Max(0, now-*c.lastT)
	}
	c.lastT = &now

	wantPan, wantTilt := c.Pan, c.Tilt
	switch c.Mode {
	case proto.ModeManual:
		wantPan, wantTilt = c.manualPan, c.manualTilt
	case proto.ModeHome:
		wantPan, wantTilt = c.Cfg.HomePan, c.Cfg.HomeTilt
	default:
		var target *tracking.Track
		if c.Mode == proto.ModeLock {
			for _, t := range tracks {
				if t.ID == *c.LockID {
					target = t
				}
			}
		} else {
			target = c.selectAuto(tracks)
		}
		switch {
		case target != nil:
			c.TargetID, c.lastSeen = proto.I(target.ID), proto.F(now)
			x := target.KF.X
			wantPan, wantTilt = x[0]+x[3]*c.Cfg.LeadS, x[1]+x[4]*c.Cfg.LeadS
		case c.lastSeen != nil && now-*c.lastSeen < c.Cfg.LostTimeoutS:
			// briefly lost: wait where it was
		default:
			if c.Mode == proto.ModeLock { // the locked track is gone: hand back to auto
				c.Mode, c.LockID = proto.ModeAuto, nil
			}
			c.TargetID = nil
			wantPan, wantTilt = c.Cfg.HomePan, c.Cfg.HomeTilt
		}
	}

	wantPan = math.Max(c.Cfg.PanMin, math.Min(c.Cfg.PanMax, wantPan))
	wantTilt = math.Max(c.Cfg.TiltMin, math.Min(c.Cfg.TiltMax, wantTilt))
	step := c.Cfg.MaxRateDps * dt
	c.Pan = approach(c.Pan, wantPan, step, c.Cfg.DeadbandDeg)
	c.Tilt = approach(c.Tilt, wantTilt, step, c.Cfg.DeadbandDeg)
	c.send()
	return c.Pan, c.Tilt
}

func (c *Controller) Proto() proto.Gimbal {
	return proto.Gimbal{
		Pan: math.Round(c.Pan*100) / 100, Tilt: math.Round(c.Tilt*100) / 100,
		TargetID: c.TargetID, Mode: c.Mode, LockID: c.LockID, CommandSeq: c.CommandSeq,
	}
}

func (c *Controller) send() {
	_ = c.Driver.SetAngle(c.Cfg.PanChannel, c.Cfg.PanCenter+c.Cfg.PanSign*c.Pan)
	_ = c.Driver.SetAngle(c.Cfg.TiltChannel, c.Cfg.TiltCenter+c.Cfg.TiltSign*c.Tilt)
}

func approach(cur, target, maxStep, deadband float64) float64 {
	err := target - cur
	if math.Abs(err) <= deadband {
		return cur
	}
	return cur + math.Max(-maxStep, math.Min(maxStep, err))
}
