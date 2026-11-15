"""Keep-out envelopes for the Pi 5 (with Active Cooler) and PCA9685 (not printed).

Placed in base-enclosure coordinates so the assembly can check clearance to the
pan servo hanging through the lid.
"""

from cadgen import build123d as bd
from cadgen import step

from base_enclosure import BOARD_Z, PCA_CX, PI_X0, PI_Y0
from config import (
    PCA_HEADER_H,
    PCA_L,
    PCA_PCB_T,
    PCA_W,
    PI_COOLER_H,
    PI_L,
    PI_PCB_T,
    PI_PORTS_H,
    PI_PORTS_L,
    PI_W,
)
from lib.geom import box


def pi5():
    top = BOARD_Z + PI_PCB_T
    pcb = box(PI_X0, PI_X0 + PI_L, PI_Y0, PI_Y0 + PI_W, BOARD_Z, top)
    cooler = box(PI_X0, PI_X0 + PI_L - PI_PORTS_L, PI_Y0, PI_Y0 + PI_W, top - 0.1, top + PI_COOLER_H)
    ports = box(PI_X0 + PI_L - PI_PORTS_L, PI_X0 + PI_L, PI_Y0, PI_Y0 + PI_W, top - 0.1, top + PI_PORTS_H)
    result = pcb + cooler + ports
    result.label = "pi5_keepout"
    return result


def pca9685():
    top = BOARD_Z + PCA_PCB_T
    x0, x1 = PCA_CX - PCA_W / 2, PCA_CX + PCA_W / 2
    result = box(x0, x1, -PCA_L / 2, PCA_L / 2, BOARD_Z, top + PCA_HEADER_H)
    result.label = "pca9685_keepout"
    return result


@step(out="../STEP/electronics.step")
def electronics():
    return bd.Compound(children=[pi5(), pca9685()], label="electronics")


if __name__ == "__main__":
    electronics()
