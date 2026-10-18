package radar

import (
	"context"
	"log"

	"go.bug.st/serial"
)

// ReadSerial streams frames from the IWR6843 data UART until ctx ends. The chirp
// configuration (.cfg) is sent to the CLI port beforehand with TI's demo tools.
func ReadSerial(ctx context.Context, port string, baud int, out chan<- Frame) error {
	p, err := serial.Open(port, &serial.Mode{BaudRate: baud})
	if err != nil {
		return err
	}
	go func() {
		<-ctx.Done()
		p.Close()
	}()
	var parser Parser
	buf := make([]byte, 4096)
	for {
		n, err := p.Read(buf)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			return err
		}
		for _, f := range parser.Feed(buf[:n]) {
			select {
			case out <- f:
			default:
				log.Printf("[radar] dropping frame %d: consumer is behind", f.Number)
			}
		}
	}
}
