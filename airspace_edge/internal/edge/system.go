// Package edge wires detection, radar, tracking and the gimbal into one cycle.
package edge

import (
	"fmt"
	"image/color"
	"math"
	"time"

	"github.com/minssan9/voyagerss/airspace_edge/internal/gimbal"
	"github.com/minssan9/voyagerss/airspace_edge/internal/proto"
	"github.com/minssan9/voyagerss/airspace_edge/internal/radar"
	"github.com/minssan9/voyagerss/airspace_edge/internal/tracking"
	"github.com/minssan9/voyagerss/airspace_edge/internal/vision"
)

type System struct {
	SessionID  string
	Lens       tracking.Lens
	Detector   *vision.Detector
	Tracker    *tracking.Tracker
	Gimbal     *gimbal.Controller
	CameraMode string
	RadarMode  string
	MinSNR     float64

	lastDetections []vision.Detection
	frameTimes     []float64
}

// Step runs one cycle on a frame (nil if the camera is off) and the radar frames
// received since the last cycle.
func (s *System) Step(t float64, frame *vision.Gray, radarFrames []radar.Frame) []*tracking.Track {
	pan, tilt := s.Gimbal.Pan, s.Gimbal.Tilt // pose when this frame was captured
	s.frameTimes = append(s.frameTimes, t)
	if len(s.frameTimes) > 30 {
		s.frameTimes = s.frameTimes[1:]
	}

	var cams []tracking.CameraMeasurement
	s.lastDetections = nil
	if frame != nil {
		s.lastDetections = s.Detector.Analyze(frame)
		for _, d := range s.lastDetections {
			px, py := d.Box.Center()
			saz, sel := s.Lens.PixelToSensor(px, py)
			az, el := tracking.SensorBearingToWorld(saz, sel, pan, tilt)
			cams = append(cams, tracking.CameraMeasurement{Az: az, El: el, Label: d.Label, Score: d.Score})
		}
	}

	var radars []tracking.RadarMeasurement
	for _, f := range radarFrames {
		for _, d := range radar.Cluster(f.Points, 1.5, 4, s.MinSNR) {
			az, el := tracking.SensorBearingToWorld(d.AzimuthDeg, d.ElevationDeg, pan, tilt)
			radars = append(radars, tracking.RadarMeasurement{Az: az, El: el, Range: d.Range, RadialVelocity: d.RadialVelocity, SNR: d.SNR})
		}
	}

	tracks := s.Tracker.Step(t, cams, radars)
	s.Gimbal.Update(tracks, t)
	return tracks
}

func (s *System) FPS() float64 {
	n := len(s.frameTimes)
	if n < 2 {
		return 0
	}
	span := s.frameTimes[n-1] - s.frameTimes[0]
	if span <= 0 {
		return 0
	}
	return math.Round(float64(n-1)/span*10) / 10
}

func (s *System) Snapshot(t float64, tracks []*tracking.Track) proto.Snapshot {
	out := proto.Snapshot{
		SessionID: s.SessionID,
		Ts:        math.Round(float64(time.Now().UnixMilli())) / 1000,
		T:         math.Round(t*1000) / 1000,
		FPS:       s.FPS(),
		Gimbal:    s.Gimbal.Proto(),
		Sensors:   proto.Sensors{Camera: s.CameraMode, Radar: s.RadarMode},
		Camera:    proto.Camera{HFOV: s.Lens.HFOV, VFOV: s.Lens.VFOV},
		Tracks:    make([]proto.Track, 0, len(tracks)),
	}
	for _, tr := range tracks {
		out.Tracks = append(out.Tracks, tr.Proto())
	}
	return out
}

func threatColor(level string) color.RGBA {
	switch level {
	case proto.ThreatHigh:
		return vision.ColorHigh
	case proto.ThreatMedium:
		return vision.ColorMedium
	}
	return vision.ColorLow
}

// Overlay draws detections, confirmed tracks and the pose HUD; returns JPEG bytes.
func (s *System) Overlay(frame *vision.Gray, tracks []*tracking.Track) ([]byte, error) {
	c := vision.NewCanvas(frame)
	for _, d := range s.lastDetections {
		c.Box(d.Box.X, d.Box.Y, d.Box.W, d.Box.H, 1, vision.ColorDetect)
	}
	pan, tilt := s.Gimbal.Pan, s.Gimbal.Tilt
	for _, tr := range tracks {
		if !tr.Confirmed {
			continue
		}
		px, py, ok := s.Lens.Project(tracking.WorldToSensor(tracking.SphericalToXYZ(tr.KF.X[0], tr.KF.X[1], 1), pan, tilt))
		if !ok || px < 0 || py < 0 || px >= float64(frame.W) || py >= float64(frame.H) {
			continue
		}
		col := threatColor(tr.Threat)
		c.Box(int(px)-11, int(py)-11, 22, 22, 2, col)
		label := fmt.Sprintf("T%d %s", tr.ID, tr.Threat)
		if r := tr.Range(); r != nil {
			label += fmt.Sprintf(" %.0fm", *r)
		}
		c.Text(int(px)+15, int(py)-12, label, col)
	}
	c.Cross(frame.W/2, frame.H/2, 9, vision.ColorHUD)
	target := "-"
	if s.Gimbal.TargetID != nil {
		target = fmt.Sprint(*s.Gimbal.TargetID)
	}
	c.Text(8, frame.H-10, fmt.Sprintf("PAN %+.1f TILT %+.1f %s TGT %s RADAR %s", pan, tilt, s.Gimbal.Mode, target, s.RadarMode), vision.ColorHUD)
	return c.JPEG(70)
}
