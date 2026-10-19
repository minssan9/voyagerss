// Package tracking fuses camera bearings and radar detections into tracks.
//
// World frame: mount-centred, +y ahead (pan 0), +x right, +z up. Azimuth is positive
// from +y toward +x, elevation positive up. Sensors ride on the pan-tilt head.
package tracking

import "math"

type Vec3 [3]float64

const deg = math.Pi / 180

func WrapDeg(a float64) float64 {
	a = math.Mod(a+180, 360)
	if a < 0 {
		a += 360
	}
	return a - 180
}

func SphericalToXYZ(azDeg, elDeg, r float64) Vec3 {
	az, el := azDeg*deg, elDeg*deg
	return Vec3{r * math.Cos(el) * math.Sin(az), r * math.Cos(el) * math.Cos(az), r * math.Sin(el)}
}

func XYZToSpherical(v Vec3) (azDeg, elDeg, r float64) {
	x, y, z := v[0], v[1], v[2]
	r = math.Sqrt(x*x + y*y + z*z)
	return math.Atan2(x, y) / deg, math.Atan2(z, math.Hypot(x, y)) / deg, r
}

func rotPan(v Vec3, panDeg float64) Vec3 {
	c, s := math.Cos(panDeg*deg), math.Sin(panDeg*deg)
	return Vec3{c*v[0] + s*v[1], -s*v[0] + c*v[1], v[2]}
}

func rotTilt(v Vec3, tiltDeg float64) Vec3 {
	c, s := math.Cos(tiltDeg*deg), math.Sin(tiltDeg*deg)
	return Vec3{v[0], c*v[1] - s*v[2], s*v[1] + c*v[2]}
}

func SensorToWorld(v Vec3, panDeg, tiltDeg float64) Vec3 {
	return rotPan(rotTilt(v, tiltDeg), panDeg)
}

func WorldToSensor(v Vec3, panDeg, tiltDeg float64) Vec3 {
	return rotTilt(rotPan(v, -panDeg), -tiltDeg)
}

func SensorBearingToWorld(azDeg, elDeg, panDeg, tiltDeg float64) (float64, float64) {
	az, el, _ := XYZToSpherical(SensorToWorld(SphericalToXYZ(azDeg, elDeg, 1), panDeg, tiltDeg))
	return az, el
}

// Lens is a pinhole camera model.
type Lens struct {
	HFOV, VFOV    float64
	Width, Height int
}

func (l Lens) focal() (fx, fy float64) {
	fx = float64(l.Width) / 2 / math.Tan(l.HFOV*deg/2)
	fy = float64(l.Height) / 2 / math.Tan(l.VFOV*deg/2)
	return
}

// PixelToSensor maps a pixel to a sensor-frame bearing.
func (l Lens) PixelToSensor(px, py float64) (azDeg, elDeg float64) {
	fx, fy := l.focal()
	az, el, _ := XYZToSpherical(Vec3{(px - float64(l.Width)/2) / fx, 1, (float64(l.Height)/2 - py) / fy})
	return az, el
}

// Project maps a sensor-frame vector to a pixel; ok is false behind the camera.
func (l Lens) Project(v Vec3) (px, py float64, ok bool) {
	if v[1] <= 1e-3 {
		return 0, 0, false
	}
	fx, fy := l.focal()
	return float64(l.Width)/2 + fx*v[0]/v[1], float64(l.Height)/2 - fy*v[2]/v[1], true
}

// AngleBetween returns the angle between two bearings in degrees.
func AngleBetween(az1, el1, az2, el2 float64) float64 {
	a, b := SphericalToXYZ(az1, el1, 1), SphericalToXYZ(az2, el2, 1)
	dot := a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
	return math.Acos(math.Max(-1, math.Min(1, dot))) / deg
}
