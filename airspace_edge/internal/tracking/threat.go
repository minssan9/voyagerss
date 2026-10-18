package tracking

import (
	"math"

	"github.com/minssan9/voyagerss/airspace_edge/internal/proto"
)

// ThreatRules scores confirmed tracks for alerting (observation only).
type ThreatRules struct {
	NearM, FarM           float64
	ClosingFullMps        float64
	UnknownRangeProximity float64
	BirdFactor            float64
	High, Medium          float64
}

func DefaultThreatRules() ThreatRules {
	return ThreatRules{NearM: 30, FarM: 150, ClosingFullMps: 8, UnknownRangeProximity: 0.3, BirdFactor: 0.3, High: 0.65, Medium: 0.35}
}

func clamp01(v float64) float64 { return math.Max(0, math.Min(1, v)) }

// Assess returns the level and a 0..1 score.
func (r ThreatRules) Assess(rangeM, radialVelocity *float64, label string, confirmed bool) (string, float64) {
	if !confirmed {
		return proto.ThreatLow, 0
	}
	proximity := r.UnknownRangeProximity
	if rangeM != nil {
		proximity = clamp01((r.FarM - *rangeM) / (r.FarM - r.NearM))
	}
	closing := 0.0
	if radialVelocity != nil {
		closing = clamp01(-*radialVelocity / r.ClosingFullMps)
	}
	bonus := 0.05
	if label == "drone" {
		bonus = 0.10
	}
	score := 0.55*proximity + 0.35*closing + bonus
	if label == "bird" {
		score *= r.BirdFactor
	}
	score = math.Round(clamp01(score)*1000) / 1000
	switch {
	case score >= r.High:
		return proto.ThreatHigh, score
	case score >= r.Medium:
		return proto.ThreatMedium, score
	}
	return proto.ThreatLow, score
}
