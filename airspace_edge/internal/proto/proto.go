// Package proto holds the JSON messages exchanged with the NestJS airspace module
// (backend/src/modules/airspace/airspace.types.ts). Keep both sides in sync.
package proto

// Threat levels, lowest first.
const (
	ThreatLow    = "LOW"
	ThreatMedium = "MEDIUM"
	ThreatHigh   = "HIGH"
)

// Gimbal modes. Pointing only: the mount carries a camera and a radar, nothing else.
const (
	ModeAuto   = "auto"
	ModeLock   = "lock"
	ModeManual = "manual"
	ModeHome   = "home"
)

// TrailPoint is [azimuth deg, elevation deg, range m or null].
type TrailPoint [3]*float64

type Track struct {
	ID             int          `json:"id"`
	Status         string       `json:"status"`
	Label          string       `json:"label"`
	Azimuth        float64      `json:"azimuth"`
	Elevation      float64      `json:"elevation"`
	Range          *float64     `json:"range"`
	RadialVelocity *float64     `json:"radialVelocity"`
	AngularRate    [2]float64   `json:"angularRate"`
	Sources        []string     `json:"sources"`
	Hits           int          `json:"hits"`
	Age            float64      `json:"age"`
	Threat         string       `json:"threat"`
	ThreatScore    float64      `json:"threatScore"`
	UpdatedAt      float64      `json:"updatedAt"`
	Position       *[3]float64  `json:"position,omitempty"`
	Trail          []TrailPoint `json:"trail"`
}

type Gimbal struct {
	Pan        float64 `json:"pan"`
	Tilt       float64 `json:"tilt"`
	TargetID   *int    `json:"targetId"`
	Mode       string  `json:"mode"`
	LockID     *int    `json:"lockId"`
	CommandSeq int     `json:"commandSeq"`
}

type Sensors struct {
	Camera string `json:"camera"`
	Radar  string `json:"radar"`
}

type Camera struct {
	HFOV float64 `json:"hfov"`
	VFOV float64 `json:"vfov"`
}

type Snapshot struct {
	SessionID string  `json:"sessionId"`
	Ts        float64 `json:"ts"`
	T         float64 `json:"t"`
	FPS       float64 `json:"fps"`
	Gimbal    Gimbal  `json:"gimbal"`
	Sensors   Sensors `json:"sensors"`
	Camera    Camera  `json:"camera"`
	Tracks    []Track `json:"tracks"`
}

// Command is issued from the UI and handed to the edge in the ingest response.
type Command struct {
	Seq     int      `json:"seq"`
	Mode    string   `json:"mode"`
	TrackID *int     `json:"trackId,omitempty"`
	Pan     *float64 `json:"pan,omitempty"`
	Tilt    *float64 `json:"tilt,omitempty"`
}

// IngestResponse mirrors the backend ApiEnvelope around { events, command }.
type IngestResponse struct {
	Result  string `json:"result"`
	Message string `json:"message"`
	Data    *struct {
		Events  int      `json:"events"`
		Command *Command `json:"command"`
	} `json:"data"`
}

func F(v float64) *float64 { return &v }
func I(v int) *int         { return &v }
