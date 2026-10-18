package radar

import "math"

// Detection is one point cluster; angles are sensor-frame.
type Detection struct {
	Range, AzimuthDeg, ElevationDeg, RadialVelocity, SNR float64
	Points                                               int
}

// Cluster links points whose range differs by <= rangeEps (m) and whose bearings are
// within angleEpsDeg. Radar angle error spreads points with range, so polar beats
// Cartesian distance here.
func Cluster(points []Point, rangeEps, angleEpsDeg, minSNR float64) []Detection {
	var pts []Point
	for _, p := range points {
		if p.SNR >= minSNR {
			pts = append(pts, p)
		}
	}
	seen := make([]bool, len(pts))
	var out []Detection
	for i := range pts {
		if seen[i] {
			continue
		}
		seen[i] = true
		group := []Point{}
		stack := []int{i}
		for len(stack) > 0 {
			j := stack[len(stack)-1]
			stack = stack[:len(stack)-1]
			group = append(group, pts[j])
			for k := range pts {
				if !seen[k] && near(pts[j], pts[k], rangeEps, angleEpsDeg) {
					seen[k] = true
					stack = append(stack, k)
				}
			}
		}
		var c Point
		total, best := 0.0, math.Inf(-1)
		for _, p := range group {
			w := math.Max(p.SNR, 0.1)
			total += w
			c.X += p.X * w
			c.Y += p.Y * w
			c.Z += p.Z * w
			c.Doppler += p.Doppler * w
			best = math.Max(best, p.SNR)
		}
		c.X, c.Y, c.Z, c.Doppler = c.X/total, c.Y/total, c.Z/total, c.Doppler/total
		out = append(out, Detection{
			Range: c.Range(), AzimuthDeg: c.AzimuthDeg(), ElevationDeg: c.ElevationDeg(),
			RadialVelocity: c.Doppler, SNR: best, Points: len(group),
		})
	}
	return out
}

func near(a, b Point, rangeEps, angleEpsDeg float64) bool {
	if math.Abs(a.Range()-b.Range()) > rangeEps {
		return false
	}
	dot := (a.X*b.X + a.Y*b.Y + a.Z*b.Z) / math.Max(a.Range()*b.Range(), 1e-9)
	return math.Acos(math.Max(-1, math.Min(1, dot)))*180/math.Pi <= angleEpsDeg
}
