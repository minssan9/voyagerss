// airspace-edge runs on the Raspberry Pi of the pan-tilt mount: camera drone detection +
// mmWave radar -> fused tracks -> gimbal follow, reporting to the NestJS airspace module.
// Observation, recording and alerting only.
//
//	airspace-edge --simulate --server http://localhost:9002 --listen :8090
//	airspace-edge --camera rpicam --radar /dev/ttyUSB1 --gimbal pca9685 --server https://... --token ...
package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/minssan9/voyagerss/airspace_edge/internal/edge"
	"github.com/minssan9/voyagerss/airspace_edge/internal/gimbal"
	"github.com/minssan9/voyagerss/airspace_edge/internal/link"
	"github.com/minssan9/voyagerss/airspace_edge/internal/radar"
	"github.com/minssan9/voyagerss/airspace_edge/internal/sim"
	"github.com/minssan9/voyagerss/airspace_edge/internal/tracking"
	"github.com/minssan9/voyagerss/airspace_edge/internal/vision"
)

func env(key, def string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return def
}

func envFloat(key string, def float64) float64 {
	if v, err := strconv.ParseFloat(os.Getenv(key), 64); err == nil {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if v, err := strconv.Atoi(os.Getenv(key)); err == nil {
		return v
	}
	return def
}

type options struct {
	simulate              bool
	camera, radarSpec     string
	gimbalSpec, i2cBus    string
	width, height, fps    int
	hfov, vfov, skyRatio  float64
	server, token, listen string
	snapHz, frameHz       float64
	radarBaud             int
	maxFrames             int
}

func parse() options {
	var o options
	flag.BoolVar(&o.simulate, "simulate", false, "virtual camera, radar and targets")
	flag.StringVar(&o.camera, "camera", env("AIRSPACE_CAMERA", "rpicam"), "rpicam | off (ignored with --simulate)")
	flag.StringVar(&o.radarSpec, "radar", env("AIRSPACE_RADAR", "off"), "off | sim | serial port, e.g. /dev/ttyUSB1")
	flag.IntVar(&o.radarBaud, "radar-baud", envInt("AIRSPACE_RADAR_BAUD", 921600), "radar data UART baud")
	flag.StringVar(&o.gimbalSpec, "gimbal", env("AIRSPACE_GIMBAL", "mock"), "mock | pca9685")
	flag.StringVar(&o.i2cBus, "i2c-bus", env("AIRSPACE_I2C_BUS", "1"), "I2C bus for the PCA9685")
	flag.IntVar(&o.width, "width", envInt("AIRSPACE_WIDTH", 640), "frame width")
	flag.IntVar(&o.height, "height", envInt("AIRSPACE_HEIGHT", 480), "frame height")
	flag.IntVar(&o.fps, "fps", envInt("AIRSPACE_FPS", 20), "frames per second")
	flag.Float64Var(&o.hfov, "hfov", envFloat("AIRSPACE_HFOV", 66), "camera horizontal FOV (Pi Camera 3: 66)")
	flag.Float64Var(&o.vfov, "vfov", envFloat("AIRSPACE_VFOV", 41), "camera vertical FOV (Pi Camera 3: 41)")
	flag.Float64Var(&o.skyRatio, "sky-ratio", envFloat("AIRSPACE_SKY_RATIO", 1), "top fraction of the frame to analyse")
	flag.StringVar(&o.server, "server", env("AIRSPACE_SERVER_URL", ""), "voyagerss backend, e.g. http://localhost:9002")
	flag.StringVar(&o.token, "token", env("AIRSPACE_INGEST_TOKEN", ""), "X-Airspace-Token for ingest")
	flag.Float64Var(&o.snapHz, "push-hz", envFloat("AIRSPACE_PUSH_HZ", 5), "snapshot pushes per second")
	flag.Float64Var(&o.frameHz, "frame-hz", envFloat("AIRSPACE_FRAME_HZ", 5), "JPEG uploads per second (0 = off)")
	flag.StringVar(&o.listen, "listen", env("AIRSPACE_LISTEN", ":8090"), "local debug page address (empty = off)")
	flag.IntVar(&o.maxFrames, "max-frames", 0, "stop after this many cycles (tests)")
	flag.Parse()
	if o.simulate && o.radarSpec == "off" {
		o.radarSpec = "sim"
	}
	return o
}

func newSessionID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func main() {
	o := parse()
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx, o); err != nil {
		log.Fatal(err)
	}
}

func run(ctx context.Context, o options) error {
	var driver gimbal.Driver = gimbal.NewMock()
	if o.gimbalSpec == "pca9685" {
		d, err := gimbal.OpenPCA9685(o.i2cBus, 0x40, 50)
		if err != nil {
			return err
		}
		driver = d
	}
	detCfg := vision.DefaultDetectorConfig()
	detCfg.SkyRatio = o.skyRatio

	cameraMode := o.camera
	if o.simulate {
		cameraMode = "sim"
	}
	radarMode := o.radarSpec
	if radarMode != "off" && radarMode != "sim" {
		radarMode = "serial"
	}
	sys := &edge.System{
		SessionID:  newSessionID(),
		Lens:       tracking.Lens{HFOV: o.hfov, VFOV: o.vfov, Width: o.width, Height: o.height},
		Detector:   vision.NewDetector(detCfg),
		Tracker:    tracking.NewTracker(tracking.DefaultConfig(), tracking.DefaultThreatRules()),
		Gimbal:     gimbal.NewController(driver, gimbal.DefaultConfig()),
		CameraMode: cameraMode,
		RadarMode:  radarMode,
	}
	defer driver.Release()

	var world *sim.World
	if o.simulate || o.radarSpec == "sim" {
		world = sim.NewWorld(nil, time.Now().UnixNano())
		world.Loop = 40
	}

	radarCh := make(chan radar.Frame, 16)
	if radarMode == "serial" {
		go func() {
			if err := radar.ReadSerial(ctx, o.radarSpec, o.radarBaud, radarCh); err != nil {
				log.Printf("[radar] %v", err)
			}
		}()
	}

	var cam *vision.RpicamSource
	if !o.simulate && o.camera == "rpicam" {
		c, err := vision.StartRpicam(ctx, o.width, o.height, o.fps)
		if err != nil {
			return err
		}
		cam = c
		defer cam.Close()
	}

	var local *link.Local
	if o.listen != "" {
		local = link.NewLocal()
		addr, err := local.Serve(o.listen)
		if err != nil {
			return err
		}
		log.Printf("[airspace-edge] debug page http://%s/", addr)
	}
	var pusher *link.Pusher
	if o.server != "" {
		pusher = link.NewPusher(link.NewClient(o.server, o.token))
		pusher.Run(ctx, o.snapHz, o.frameHz)
	}
	log.Printf("[airspace-edge] session=%s camera=%s radar=%s gimbal=%s server=%s",
		sys.SessionID, cameraMode, radarMode, o.gimbalSpec, orOff(o.server))

	period := time.Second / time.Duration(o.fps)
	tick := time.NewTicker(period)
	defer tick.Stop()
	start := time.Now()
	lastJPEG := time.Time{}
	jpegEvery := time.Duration(0)
	if o.frameHz > 0 {
		jpegEvery = time.Duration(float64(time.Second) / o.frameHz)
	}

	for n := 0; o.maxFrames == 0 || n < o.maxFrames; n++ {
		var frame *vision.Gray
		var t float64
		switch {
		case o.simulate:
			select {
			case <-ctx.Done():
				return nil
			case <-tick.C:
			}
			t = float64(n) / float64(o.fps)
			frame = world.CameraFrame(t, sys.Gimbal.Pan, sys.Gimbal.Tilt, sys.Lens)
		case cam != nil:
			f, err := cam.Read()
			if err != nil {
				if ctx.Err() != nil {
					return nil
				}
				return fmt.Errorf("camera: %w", err)
			}
			frame, t = f, time.Since(start).Seconds()
		default:
			select {
			case <-ctx.Done():
				return nil
			case <-tick.C:
			}
			t = time.Since(start).Seconds()
		}

		var radarFrames []radar.Frame
		if world != nil && radarMode == "sim" {
			radarFrames = append(radarFrames, world.RadarFrame(t, sys.Gimbal.Pan, sys.Gimbal.Tilt))
		}
	drain:
		for {
			select {
			case f := <-radarCh:
				radarFrames = append(radarFrames, f)
			default:
				break drain
			}
		}
		if pusher != nil {
		cmds:
			for {
				select {
				case c := <-pusher.Commands:
					sys.Gimbal.Apply(c)
					log.Printf("[airspace-edge] command #%d %s", c.Seq, c.Mode)
				default:
					break cmds
				}
			}
		}

		tracks := sys.Step(t, frame, radarFrames)
		snap := sys.Snapshot(t, tracks)
		var jpeg []byte
		if frame != nil && jpegEvery > 0 && time.Since(lastJPEG) >= jpegEvery {
			if j, err := sys.Overlay(frame, tracks); err == nil {
				jpeg, lastJPEG = j, time.Now()
			}
		}
		if local != nil {
			local.Publish(snap, jpeg)
		}
		if pusher != nil {
			pusher.Offer(snap, jpeg)
		}
	}
	return nil
}

func orOff(s string) string {
	if s == "" {
		return "off"
	}
	return s
}
