package tracking

import "math"

// Mat is a small dense row-major matrix; the filter never exceeds 6x6.
type Mat struct {
	R, C int
	D    []float64
}

func NewMat(r, c int) Mat { return Mat{r, c, make([]float64, r*c)} }

func Eye(n int) Mat {
	m := NewMat(n, n)
	for i := 0; i < n; i++ {
		m.D[i*n+i] = 1
	}
	return m
}

func (m Mat) At(i, j int) float64     { return m.D[i*m.C+j] }
func (m Mat) Set(i, j int, v float64) { m.D[i*m.C+j] = v }

func Mul(a, b Mat) Mat {
	out := NewMat(a.R, b.C)
	for i := 0; i < a.R; i++ {
		for k := 0; k < a.C; k++ {
			aik := a.D[i*a.C+k]
			if aik == 0 {
				continue
			}
			for j := 0; j < b.C; j++ {
				out.D[i*b.C+j] += aik * b.D[k*b.C+j]
			}
		}
	}
	return out
}

func T(a Mat) Mat {
	out := NewMat(a.C, a.R)
	for i := 0; i < a.R; i++ {
		for j := 0; j < a.C; j++ {
			out.D[j*a.R+i] = a.D[i*a.C+j]
		}
	}
	return out
}

func Add(a, b Mat) Mat {
	out := NewMat(a.R, a.C)
	for i := range a.D {
		out.D[i] = a.D[i] + b.D[i]
	}
	return out
}

func Sub(a, b Mat) Mat {
	out := NewMat(a.R, a.C)
	for i := range a.D {
		out.D[i] = a.D[i] - b.D[i]
	}
	return out
}

// Inv inverts a square matrix by Gauss-Jordan with partial pivoting.
func Inv(a Mat) (Mat, bool) {
	n := a.R
	m := NewMat(n, 2*n)
	for i := 0; i < n; i++ {
		for j := 0; j < n; j++ {
			m.Set(i, j, a.At(i, j))
		}
		m.Set(i, n+i, 1)
	}
	for col := 0; col < n; col++ {
		piv := col
		for r := col + 1; r < n; r++ {
			if math.Abs(m.At(r, col)) > math.Abs(m.At(piv, col)) {
				piv = r
			}
		}
		if math.Abs(m.At(piv, col)) < 1e-12 {
			return Mat{}, false
		}
		if piv != col {
			for j := 0; j < 2*n; j++ {
				t := m.At(col, j)
				m.Set(col, j, m.At(piv, j))
				m.Set(piv, j, t)
			}
		}
		p := m.At(col, col)
		for j := 0; j < 2*n; j++ {
			m.Set(col, j, m.At(col, j)/p)
		}
		for r := 0; r < n; r++ {
			if r == col {
				continue
			}
			f := m.At(r, col)
			if f == 0 {
				continue
			}
			for j := 0; j < 2*n; j++ {
				m.Set(r, j, m.At(r, j)-f*m.At(col, j))
			}
		}
	}
	out := NewMat(n, n)
	for i := 0; i < n; i++ {
		for j := 0; j < n; j++ {
			out.Set(i, j, m.At(i, n+j))
		}
	}
	return out, true
}

func Diag(v ...float64) Mat {
	m := NewMat(len(v), len(v))
	for i, x := range v {
		m.Set(i, i, x)
	}
	return m
}

// Measurement models. Camera sees [az, el]; radar sees [az, el, r, radial velocity = d_r].
var (
	CameraH = Mat{2, 6, []float64{
		1, 0, 0, 0, 0, 0,
		0, 1, 0, 0, 0, 0,
	}}
	RadarH = Mat{4, 6, []float64{
		1, 0, 0, 0, 0, 0,
		0, 1, 0, 0, 0, 0,
		0, 0, 1, 0, 0, 0,
		0, 0, 0, 0, 0, 1,
	}}
)

// Kalman is a constant-velocity filter on x = [az, el, r, d_az, d_el, d_r].
type Kalman struct {
	X          []float64
	P          Mat
	AngleAccel float64
	RangeAccel float64
	RangeKnown bool
}

func NewKalman(az, el float64, r, vr *float64) *Kalman {
	k := &Kalman{X: []float64{az, el, 100, 0, 0, 0}, AngleAccel: 6, RangeAccel: 4}
	rVar, vVar := 80.0*80.0, 100.0
	if r != nil {
		k.X[2], rVar, k.RangeKnown = *r, 4, true
	}
	if vr != nil {
		k.X[5], vVar = *vr, 1
	}
	k.P = Diag(4, 4, rVar, 25, 25, vVar)
	return k
}

func (k *Kalman) Predict(dt float64) {
	if dt <= 0 {
		return
	}
	F := Eye(6)
	F.Set(0, 3, dt)
	F.Set(1, 4, dt)
	F.Set(2, 5, dt)
	for i := 0; i < 3; i++ {
		k.X[i] += dt * k.X[i+3]
	}
	k.X[0] = WrapDeg(k.X[0])
	Q := NewMat(6, 6)
	q := []float64{k.AngleAccel * k.AngleAccel, k.AngleAccel * k.AngleAccel, k.RangeAccel * k.RangeAccel}
	for i := 0; i < 3; i++ {
		Q.Set(i, i, q[i]*math.Pow(dt, 4)/4)
		Q.Set(i, i+3, q[i]*math.Pow(dt, 3)/2)
		Q.Set(i+3, i, q[i]*math.Pow(dt, 3)/2)
		Q.Set(i+3, i+3, q[i]*dt*dt)
	}
	k.P = Add(Mul(Mul(F, k.P), T(F)), Q)
}

func (k *Kalman) innovation(z []float64, H, R Mat) (Mat, Mat) {
	y := NewMat(len(z), 1)
	for i := range z {
		hx := 0.0
		for j := 0; j < 6; j++ {
			hx += H.At(i, j) * k.X[j]
		}
		y.D[i] = z[i] - hx
	}
	y.D[0] = WrapDeg(y.D[0])
	S := Add(Mul(Mul(H, k.P), T(H)), R)
	return y, S
}

// Mahalanobis2 is the squared Mahalanobis distance of z from the prediction.
func (k *Kalman) Mahalanobis2(z []float64, H, R Mat) float64 {
	y, S := k.innovation(z, H, R)
	Si, ok := Inv(S)
	if !ok {
		return math.Inf(1)
	}
	return Mul(Mul(T(y), Si), y).D[0]
}

func (k *Kalman) Update(z []float64, H, R Mat) {
	y, S := k.innovation(z, H, R)
	Si, ok := Inv(S)
	if !ok {
		return
	}
	K := Mul(Mul(k.P, T(H)), Si)
	dx := Mul(K, y)
	for i := range k.X {
		k.X[i] += dx.D[i]
	}
	k.X[0] = WrapDeg(k.X[0])
	k.P = Mul(Sub(Eye(6), Mul(K, H)), k.P)
	if H.R > 2 {
		k.RangeKnown = true
	}
}
