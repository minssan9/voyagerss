// Package gimbal points the camera/radar pan-tilt head (hardware/airspace_tracker).
package gimbal

import (
	"fmt"
	"math"
	"sync"
	"time"

	"periph.io/x/conn/v3/i2c"
	"periph.io/x/conn/v3/i2c/i2creg"
	"periph.io/x/host/v3"
)

// Driver sets a servo channel to an angle in servo degrees (0..180).
type Driver interface {
	SetAngle(channel int, servoDeg float64) error
	Release() error
}

// Mock remembers the last command per channel (development and tests).
type Mock struct {
	mu     sync.Mutex
	Angles map[int]float64
}

func NewMock() *Mock { return &Mock{Angles: map[int]float64{}} }

func (m *Mock) SetAngle(ch int, deg float64) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Angles[ch] = deg
	return nil
}

func (m *Mock) Release() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Angles = map[int]float64{}
	return nil
}

const (
	regMode1    = 0x00
	regMode2    = 0x01
	regPrescale = 0xFE
	regLED0OnL  = 0x06
)

// PCA9685 drives servos through the 16-channel PWM board over I2C.
type PCA9685 struct {
	dev        *i2c.Dev
	closer     interface{ Close() error }
	periodUs   float64
	MinPulseUs float64
	MaxPulseUs float64
}

func OpenPCA9685(bus string, addr uint16, freqHz float64) (*PCA9685, error) {
	if _, err := host.Init(); err != nil {
		return nil, err
	}
	b, err := i2creg.Open(bus)
	if err != nil {
		return nil, fmt.Errorf("open i2c bus %q: %w", bus, err)
	}
	p := &PCA9685{dev: &i2c.Dev{Addr: addr, Bus: b}, closer: b, periodUs: 1e6 / freqHz, MinPulseUs: 500, MaxPulseUs: 2500}
	prescale := byte(math.Round(25e6/(4096*freqHz)) - 1)
	for _, w := range [][]byte{{regMode1, 0x10}, {regPrescale, prescale}, {regMode2, 0x04}, {regMode1, 0x20}} {
		if err := p.dev.Tx(w, nil); err != nil {
			b.Close()
			return nil, fmt.Errorf("pca9685 init: %w", err)
		}
	}
	time.Sleep(5 * time.Millisecond)
	return p, nil
}

func (p *PCA9685) SetAngle(ch int, deg float64) error {
	deg = math.Max(0, math.Min(180, deg))
	pulse := p.MinPulseUs + (p.MaxPulseUs-p.MinPulseUs)*deg/180
	return p.write(ch, uint16(math.Round(pulse*4096/p.periodUs)))
}

func (p *PCA9685) Release() error {
	for ch := 0; ch < 16; ch++ {
		if err := p.write(ch, 0); err != nil {
			return err
		}
	}
	return p.closer.Close()
}

func (p *PCA9685) write(ch int, off uint16) error {
	reg := byte(regLED0OnL + 4*ch)
	return p.dev.Tx([]byte{reg, 0, 0, byte(off), byte(off >> 8)}, nil)
}
