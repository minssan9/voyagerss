// Package radar reads the TI IWR6843 mmWave SDK out-of-box demo UART output.
//
// A frame is magic (8 B) + header (8 x uint32) + TLVs. Used TLVs:
//
//	1: detected points, float32 x, y, z, doppler
//	7: side info per point, int16 snr, noise in 0.1 dB
//
// Sensor frame: +y ahead, +x right, +z up; metres and m/s (doppler + = receding).
package radar

import (
	"bytes"
	"encoding/binary"
	"math"
)

var Magic = []byte{0x02, 0x01, 0x04, 0x03, 0x06, 0x05, 0x08, 0x07}

const (
	headerSize  = 8 * 4
	tlvHdrSize  = 8
	pointSize   = 16
	sideSize    = 4
	tlvPoints   = 1
	tlvSideInfo = 7
	maxPacket   = 64 * 1024
)

type Point struct {
	X, Y, Z, Doppler, SNR float64
}

func (p Point) Range() float64 { return math.Sqrt(p.X*p.X + p.Y*p.Y + p.Z*p.Z) }

func (p Point) AzimuthDeg() float64 { return math.Atan2(p.X, p.Y) * 180 / math.Pi }

func (p Point) ElevationDeg() float64 { return math.Atan2(p.Z, math.Hypot(p.X, p.Y)) * 180 / math.Pi }

type Frame struct {
	Number int
	Points []Point
}

// Encode builds the bytes the parser reads; used by the simulator and tests.
func Encode(number int, points []Point) []byte {
	var tlvs bytes.Buffer
	numTLVs := 0
	if len(points) > 0 {
		body := make([]byte, 0, len(points)*pointSize)
		side := make([]byte, 0, len(points)*sideSize)
		for _, p := range points {
			body = binary.LittleEndian.AppendUint32(body, math.Float32bits(float32(p.X)))
			body = binary.LittleEndian.AppendUint32(body, math.Float32bits(float32(p.Y)))
			body = binary.LittleEndian.AppendUint32(body, math.Float32bits(float32(p.Z)))
			body = binary.LittleEndian.AppendUint32(body, math.Float32bits(float32(p.Doppler)))
			side = binary.LittleEndian.AppendUint16(side, uint16(int16(math.Round(p.SNR*10))))
			side = binary.LittleEndian.AppendUint16(side, 0)
		}
		for _, tlv := range []struct {
			typ  uint32
			body []byte
		}{{tlvPoints, body}, {tlvSideInfo, side}} {
			_ = binary.Write(&tlvs, binary.LittleEndian, [2]uint32{tlv.typ, uint32(len(tlv.body))})
			tlvs.Write(tlv.body)
		}
		numTLVs = 2
	}
	total := len(Magic) + headerSize + tlvs.Len()
	out := append([]byte(nil), Magic...)
	for _, v := range []uint32{0x03060000, uint32(total), 0xA6843, uint32(number), 0, uint32(len(points)), uint32(numTLVs), 0} {
		out = binary.LittleEndian.AppendUint32(out, v)
	}
	return append(out, tlvs.Bytes()...)
}

// Parser accumulates UART bytes and yields complete frames.
type Parser struct{ buf []byte }

func (ps *Parser) Feed(data []byte) []Frame {
	ps.buf = append(ps.buf, data...)
	var frames []Frame
	for {
		start := bytes.Index(ps.buf, Magic)
		if start < 0 {
			if keep := len(Magic) - 1; len(ps.buf) > keep {
				ps.buf = append(ps.buf[:0], ps.buf[len(ps.buf)-keep:]...)
			}
			return frames
		}
		ps.buf = ps.buf[start:]
		if len(ps.buf) < len(Magic)+headerSize {
			return frames
		}
		h := func(i int) uint32 { return binary.LittleEndian.Uint32(ps.buf[len(Magic)+4*i:]) }
		total := int(h(1))
		if total < len(Magic)+headerSize || total > maxPacket {
			ps.buf = ps.buf[len(Magic):] // corrupt header: resync on the next magic
			continue
		}
		if len(ps.buf) < total {
			return frames
		}
		packet := append([]byte(nil), ps.buf[:total]...)
		number, numPoints, numTLVs := int(h(3)), int(h(5)), int(h(6))
		ps.buf = ps.buf[total:]
		if f, ok := parsePacket(packet, number, numPoints, numTLVs); ok {
			frames = append(frames, f)
		}
	}
}

func parsePacket(packet []byte, number, numPoints, numTLVs int) (Frame, bool) {
	off := len(Magic) + headerSize
	var points []Point
	var snrs []float64
	for i := 0; i < numTLVs; i++ {
		if off+tlvHdrSize > len(packet) {
			return Frame{}, false
		}
		typ := binary.LittleEndian.Uint32(packet[off:])
		length := int(binary.LittleEndian.Uint32(packet[off+4:]))
		off += tlvHdrSize
		if length < 0 || off+length > len(packet) {
			return Frame{}, false
		}
		body := packet[off : off+length]
		off += length
		switch typ {
		case tlvPoints:
			n := min(numPoints, length/pointSize)
			points = make([]Point, n)
			for j := 0; j < n; j++ {
				f := func(k int) float64 {
					return float64(math.Float32frombits(binary.LittleEndian.Uint32(body[j*pointSize+4*k:])))
				}
				points[j] = Point{X: f(0), Y: f(1), Z: f(2), Doppler: f(3)}
			}
		case tlvSideInfo:
			for j := 0; j+sideSize <= length; j += sideSize {
				snrs = append(snrs, float64(int16(binary.LittleEndian.Uint16(body[j:])))/10)
			}
		}
	}
	for i := range points {
		if i < len(snrs) {
			points[i].SNR = snrs[i]
		}
	}
	return Frame{Number: number, Points: points}, true
}
