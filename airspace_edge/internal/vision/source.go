package vision

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os/exec"
	"strconv"
)

// RpicamSource reads raw YUV420 frames from `rpicam-vid` (Raspberry Pi OS Bookworm)
// and yields the Y plane, which is the grayscale image the detector needs.
type RpicamSource struct {
	W, H, FPS int
	cmd       *exec.Cmd
	r         *bufio.Reader
}

func StartRpicam(ctx context.Context, w, h, fps int) (*RpicamSource, error) {
	cmd := exec.CommandContext(ctx, "rpicam-vid",
		"-t", "0", "-n", "--codec", "yuv420",
		"--width", strconv.Itoa(w), "--height", strconv.Itoa(h),
		"--framerate", strconv.Itoa(fps), "-o", "-")
	out, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("rpicam-vid: %w (sudo apt install rpicam-apps)", err)
	}
	return &RpicamSource{W: w, H: h, FPS: fps, cmd: cmd, r: bufio.NewReaderSize(out, w*h*2)}, nil
}

// Read blocks for the next frame.
func (s *RpicamSource) Read() (*Gray, error) {
	g := NewGray(s.W, s.H)
	if _, err := io.ReadFull(s.r, g.Pix); err != nil {
		return nil, err
	}
	chroma := s.W * s.H / 2 // U and V quarter planes
	if _, err := s.r.Discard(chroma); err != nil {
		return nil, err
	}
	return g, nil
}

func (s *RpicamSource) Close() error {
	if s.cmd.Process != nil {
		_ = s.cmd.Process.Kill()
	}
	return s.cmd.Wait()
}
