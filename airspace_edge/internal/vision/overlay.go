package vision

import (
	"bytes"
	"image"
	"image/color"
	"image/jpeg"

	"golang.org/x/image/font"
	"golang.org/x/image/font/basicfont"
	"golang.org/x/image/math/fixed"
)

var (
	ColorDetect = color.RGBA{255, 60, 60, 255}
	ColorHigh   = color.RGBA{239, 68, 68, 255}
	ColorMedium = color.RGBA{245, 158, 11, 255}
	ColorLow    = color.RGBA{16, 185, 129, 255}
	ColorHUD    = color.RGBA{255, 255, 255, 255}
)

// Canvas is an RGB copy of a gray frame for drawing the operator overlay.
type Canvas struct{ *image.RGBA }

func NewCanvas(g *Gray) Canvas {
	img := image.NewRGBA(image.Rect(0, 0, g.W, g.H))
	for i, v := range g.Pix {
		j := i * 4
		img.Pix[j], img.Pix[j+1], img.Pix[j+2], img.Pix[j+3] = v, v, v, 255
	}
	return Canvas{img}
}

func (c Canvas) set(x, y int, col color.RGBA) {
	if image.Pt(x, y).In(c.Rect) {
		c.SetRGBA(x, y, col)
	}
}

func (c Canvas) Box(x, y, w, h, thick int, col color.RGBA) {
	for t := 0; t < thick; t++ {
		for i := x - t; i <= x+w+t; i++ {
			c.set(i, y-t, col)
			c.set(i, y+h+t, col)
		}
		for j := y - t; j <= y+h+t; j++ {
			c.set(x-t, j, col)
			c.set(x+w+t, j, col)
		}
	}
}

func (c Canvas) Cross(x, y, size int, col color.RGBA) {
	for i := -size; i <= size; i++ {
		c.set(x+i, y, col)
		c.set(x, y+i, col)
	}
}

func (c Canvas) Text(x, y int, s string, col color.RGBA) {
	d := font.Drawer{Dst: c.RGBA, Src: image.NewUniform(col), Face: basicfont.Face7x13, Dot: fixed.P(x, y)}
	d.DrawString(s)
}

func (c Canvas) JPEG(quality int) ([]byte, error) {
	var buf bytes.Buffer
	err := jpeg.Encode(&buf, c.RGBA, &jpeg.Options{Quality: quality})
	return buf.Bytes(), err
}
