package tracking

import (
	"math"
	"sort"

	"github.com/minssan9/voyagerss/airspace_edge/internal/proto"
)

const (
	chi2TwoDOF99  = 9.21
	chi2FourDOF99 = 13.28
	trailLen      = 30
)

// CameraMeasurement is a world-frame bearing from the drone detector.
type CameraMeasurement struct {
	Az, El float64
	Label  string
	Score  float64
}

// RadarMeasurement is a world-frame radar cluster.
type RadarMeasurement struct {
	Az, El, Range, RadialVelocity, SNR float64
}

type Config struct {
	CameraSigmaDeg      float64
	RadarAngleSigmaDeg  float64
	RadarRangeSigmaM    float64
	RadarVelocitySigma  float64
	ConfirmHits         int
	TentativeMaxMisses  int
	MaxCoastS           float64
	MinRadarSNRForBirth float64
	MergeAngleDeg       float64
	MergeRangeM         float64
}

func DefaultConfig() Config {
	return Config{
		CameraSigmaDeg: 0.6, RadarAngleSigmaDeg: 2, RadarRangeSigmaM: 0.6, RadarVelocitySigma: 0.4,
		ConfirmHits: 3, TentativeMaxMisses: 3, MaxCoastS: 2, MinRadarSNRForBirth: 10,
		MergeAngleDeg: 2.5, MergeRangeM: 5,
	}
}

type Track struct {
	ID          int
	KF          *Kalman
	Created     float64
	Updated     float64
	Label       string
	Hits        int
	Misses      int
	Confirmed   bool
	CameraHits  int
	RadarHits   int
	Threat      string
	ThreatScore float64
	Trail       []proto.TrailPoint
}

func (t *Track) Range() *float64 {
	if !t.KF.RangeKnown {
		return nil
	}
	r := t.KF.X[2]
	return &r
}

func round(v float64, d int) float64 {
	p := math.Pow(10, float64(d))
	return math.Round(v*p) / p
}

func (t *Track) Proto() proto.Track {
	x := t.KF.X
	out := proto.Track{
		ID:          t.ID,
		Status:      "tentative",
		Label:       t.Label,
		Azimuth:     round(x[0], 2),
		Elevation:   round(x[1], 2),
		AngularRate: [2]float64{round(x[3], 2), round(x[4], 2)},
		Sources:     []string{},
		Hits:        t.Hits,
		Age:         round(t.Updated-t.Created, 2),
		Threat:      t.Threat,
		ThreatScore: t.ThreatScore,
		UpdatedAt:   round(t.Updated, 3),
		Trail:       append([]proto.TrailPoint(nil), t.Trail...),
	}
	if t.Confirmed {
		out.Status = "confirmed"
	}
	if t.CameraHits > 0 {
		out.Sources = append(out.Sources, "camera")
	}
	if t.RadarHits > 0 {
		out.Sources = append(out.Sources, "radar")
	}
	if t.KF.RangeKnown {
		out.Range = proto.F(round(x[2], 1))
		out.RadialVelocity = proto.F(round(x[5], 2))
		p := SphericalToXYZ(x[0], x[1], x[2])
		out.Position = &[3]float64{round(p[0], 1), round(p[1], 1), round(p[2], 1)}
	}
	return out
}

type Tracker struct {
	Cfg    Config
	Rules  ThreatRules
	Tracks []*Track
	nextID int
	lastT  *float64
	rCam   Mat
	rRadar Mat
}

func NewTracker(cfg Config, rules ThreatRules) *Tracker {
	return &Tracker{
		Cfg: cfg, Rules: rules, nextID: 1,
		rCam: Diag(cfg.CameraSigmaDeg*cfg.CameraSigmaDeg, cfg.CameraSigmaDeg*cfg.CameraSigmaDeg),
		rRadar: Diag(cfg.RadarAngleSigmaDeg*cfg.RadarAngleSigmaDeg, cfg.RadarAngleSigmaDeg*cfg.RadarAngleSigmaDeg,
			cfg.RadarRangeSigmaM*cfg.RadarRangeSigmaM, cfg.RadarVelocitySigma*cfg.RadarVelocitySigma),
	}
}

func (tr *Tracker) Confirmed() []*Track {
	var out []*Track
	for _, t := range tr.Tracks {
		if t.Confirmed {
			out = append(out, t)
		}
	}
	return out
}

func (tr *Tracker) Find(id int) *Track {
	for _, t := range tr.Tracks {
		if t.ID == id {
			return t
		}
	}
	return nil
}

// Step advances all tracks to time t and folds in this cycle's measurements.
func (tr *Tracker) Step(t float64, cams []CameraMeasurement, radars []RadarMeasurement) []*Track {
	dt := 0.0
	if tr.lastT != nil {
		dt = t - *tr.lastT
	}
	tr.lastT = &t
	for _, trk := range tr.Tracks {
		trk.KF.Predict(dt)
	}

	updated := map[int]bool{}
	radarZ := make([][]float64, len(radars))
	for i, m := range radars {
		radarZ[i] = []float64{m.Az, m.El, m.Range, m.RadialVelocity}
	}
	radarLeft := tr.match(radarZ, RadarH, tr.rRadar, chi2FourDOF99, updated, func(trk *Track, j int) {
		trk.RadarHits++
		tr.hit(trk, t)
	})
	// Birth radar tracks first so the camera sees the same object on them; the camera may
	// also update tracks the radar already updated this cycle (both sensors on one object).
	for _, j := range radarLeft {
		m := radars[j]
		if m.SNR >= tr.Cfg.MinRadarSNRForBirth {
			trk := tr.newTrack(t, NewKalman(m.Az, m.El, proto.F(m.Range), proto.F(m.RadialVelocity)))
			trk.RadarHits = 1
			updated[trk.ID] = true
		}
	}
	camZ := make([][]float64, len(cams))
	for i, m := range cams {
		camZ[i] = []float64{m.Az, m.El}
	}
	camLeft := tr.match(camZ, CameraH, tr.rCam, chi2TwoDOF99, updated, func(trk *Track, j int) {
		trk.CameraHits++
		if l := cams[j].Label; l != "aerial" || trk.Label == "aerial" {
			trk.Label = l
		}
		tr.hit(trk, t)
	})
	for _, trk := range tr.Tracks {
		if !updated[trk.ID] {
			trk.Misses++
		}
	}
	for _, j := range camLeft {
		trk := tr.newTrack(t, NewKalman(cams[j].Az, cams[j].El, nil, nil))
		trk.CameraHits, trk.Label = 1, cams[j].Label
	}

	tr.merge()
	tr.prune(t)
	for _, trk := range tr.Tracks {
		var vr *float64
		if trk.KF.RangeKnown {
			vr = proto.F(trk.KF.X[5])
		}
		trk.Threat, trk.ThreatScore = tr.Rules.Assess(trk.Range(), vr, trk.Label, trk.Confirmed)
	}
	return tr.Tracks
}

func (tr *Tracker) match(z [][]float64, H, R Mat, gate float64, updated map[int]bool, onHit func(*Track, int)) []int {
	if len(z) == 0 || len(tr.Tracks) == 0 {
		left := make([]int, len(z))
		for i := range z {
			left[i] = i
		}
		return left
	}
	cands := append([]*Track(nil), tr.Tracks...)
	cost := make([][]float64, len(cands))
	for i, trk := range cands {
		cost[i] = make([]float64, len(z))
		for j := range z {
			cost[i][j] = trk.KF.Mahalanobis2(z[j], H, R)
		}
	}
	matched := map[int]bool{}
	for _, p := range Hungarian(cost, gate) {
		trk := cands[p.Row]
		trk.KF.Update(z[p.Col], H, R)
		onHit(trk, p.Col)
		updated[trk.ID] = true
		matched[p.Col] = true
	}
	var left []int
	for j := range z {
		if !matched[j] {
			left = append(left, j)
		}
	}
	return left
}

func (tr *Tracker) hit(trk *Track, t float64) {
	first := trk.Updated != t // two sensors in one cycle count once
	if first {
		trk.Hits++
	} else if len(trk.Trail) > 0 {
		trk.Trail = trk.Trail[:len(trk.Trail)-1]
	}
	trk.Misses = 0
	trk.Updated = t
	if trk.Hits >= tr.Cfg.ConfirmHits {
		trk.Confirmed = true
	}
	trk.appendTrail()
}

func (trk *Track) appendTrail() {
	var r *float64
	if trk.KF.RangeKnown {
		r = proto.F(round(trk.KF.X[2], 1))
	}
	trk.Trail = append(trk.Trail, proto.TrailPoint{proto.F(round(trk.KF.X[0], 2)), proto.F(round(trk.KF.X[1], 2)), r})
	if len(trk.Trail) > trailLen {
		trk.Trail = trk.Trail[len(trk.Trail)-trailLen:]
	}
}

func (tr *Tracker) newTrack(t float64, kf *Kalman) *Track {
	trk := &Track{ID: tr.nextID, KF: kf, Created: t, Updated: t, Label: "aerial", Hits: 1, Threat: proto.ThreatLow}
	tr.nextID++
	trk.appendTrail()
	tr.Tracks = append(tr.Tracks, trk)
	return trk
}

// merge folds duplicate tracks of one object, keeping the ranged, confirmed, oldest one.
func (tr *Tracker) merge() {
	ranked := append([]*Track(nil), tr.Tracks...)
	sort.SliceStable(ranked, func(a, b int) bool {
		x, y := ranked[a], ranked[b]
		if x.KF.RangeKnown != y.KF.RangeKnown {
			return x.KF.RangeKnown
		}
		if x.Confirmed != y.Confirmed {
			return x.Confirmed
		}
		if x.Hits != y.Hits {
			return x.Hits > y.Hits
		}
		return x.ID < y.ID
	})
	var kept []*Track
	for _, trk := range ranked {
		var twin *Track
		for _, k := range kept {
			if tr.sameObject(k, trk) {
				twin = k
				break
			}
		}
		if twin == nil {
			kept = append(kept, trk)
			continue
		}
		twin.CameraHits += trk.CameraHits
		twin.RadarHits += trk.RadarHits
		if twin.Label == "aerial" {
			twin.Label = trk.Label
		}
	}
	sort.Slice(kept, func(a, b int) bool { return kept[a].ID < kept[b].ID })
	tr.Tracks = kept
}

func (tr *Tracker) sameObject(a, b *Track) bool {
	if AngleBetween(a.KF.X[0], a.KF.X[1], b.KF.X[0], b.KF.X[1]) > tr.Cfg.MergeAngleDeg {
		return false
	}
	if a.KF.RangeKnown && b.KF.RangeKnown {
		return math.Abs(a.KF.X[2]-b.KF.X[2]) <= tr.Cfg.MergeRangeM
	}
	return true
}

func (tr *Tracker) prune(t float64) {
	var kept []*Track
	for _, trk := range tr.Tracks {
		if (trk.Confirmed && t-trk.Updated <= tr.Cfg.MaxCoastS) || (!trk.Confirmed && trk.Misses < tr.Cfg.TentativeMaxMisses) {
			kept = append(kept, trk)
		}
	}
	tr.Tracks = kept
}
