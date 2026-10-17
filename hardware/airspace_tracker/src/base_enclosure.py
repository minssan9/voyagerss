"""Open-top electronics tub: Raspberry Pi 5, PCA9685, 1/4"-20 tripod nut."""

from cadgen import build123d as bd
from cadgen import step, stl

from config import (
    BASE_H,
    BASE_L,
    BASE_W,
    CORNER_BOSS_D,
    CORNER_BOSS_X,
    CORNER_BOSS_Y,
    FLOOR,
    M25_SELF_TAP_D,
    M3_INSERT_D,
    M3_INSERT_DEPTH,
    PCA_HOLE_PITCH_L,
    PCA_HOLE_PITCH_W,
    PCA_W,
    PI_HOLE_INSET,
    PI_HOLE_PITCH_L,
    PI_HOLE_PITCH_W,
    PI_L,
    PI_W,
    RIM_H,
    RIM_T,
    STANDOFF_D,
    STANDOFF_H,
    TOL,
    TRIPOD_BOLT_D,
    TRIPOD_BOSS_D,
    TRIPOD_BOSS_H,
    TRIPOD_NUT_AF,
    TRIPOD_NUT_T,
    WALL,
)
from lib.geom import box, cyl_x, cyl_z, hex_z, union

IN_X = BASE_L / 2 - WALL
IN_Y = BASE_W / 2 - WALL

# Pi 5 sits in the +X/-Y corner: USB/Ethernet face +X, USB-C/HDMI face -Y.
PI_X0 = IN_X - 8.0 - PI_L
PI_Y0 = -IN_Y + 1.0
PCA_CX = -IN_X + 1.0 + PCA_W / 2
BOARD_Z = FLOOR + STANDOFF_H


def pi_holes():
    xs = (PI_X0 + PI_HOLE_INSET, PI_X0 + PI_HOLE_INSET + PI_HOLE_PITCH_L)
    ys = (PI_Y0 + PI_HOLE_INSET, PI_Y0 + PI_HOLE_INSET + PI_HOLE_PITCH_W)
    return [(x, y) for x in xs for y in ys]


def pca_holes():
    return [(PCA_CX + sx * PCA_HOLE_PITCH_W / 2, sy * PCA_HOLE_PITCH_L / 2) for sx in (-1, 1) for sy in (-1, 1)]


def corners():
    return [(sx * CORNER_BOSS_X, sy * CORNER_BOSS_Y) for sx in (-1, 1) for sy in (-1, 1)]


@step(out="../STEP/base_enclosure.step")
@stl(out="../STL/base_enclosure.stl")
def base_enclosure():
    shell = box(-BASE_L / 2, BASE_L / 2, -BASE_W / 2, BASE_W / 2, 0, BASE_H)
    shell -= box(-IN_X, IN_X, -IN_Y, IN_Y, FLOOR, BASE_H + 1)

    holes = pi_holes() + pca_holes()
    adds = [cyl_z(x, y, FLOOR - 0.1, BOARD_Z, STANDOFF_D) for x, y in holes]
    # Square corner blocks fused into the walls hold the lid inserts.
    r = CORNER_BOSS_D / 2
    for x, y in corners():
        xs = sorted((x - r if x > 0 else x + r, IN_X + 1 if x > 0 else -IN_X - 1))
        ys = sorted((y - r if y > 0 else y + r, IN_Y + 1 if y > 0 else -IN_Y - 1))
        adds.append(box(*xs, *ys, FLOOR - 0.1, BASE_H))
    adds.append(cyl_z(0, 0, FLOOR - 0.1, TRIPOD_BOSS_H, TRIPOD_BOSS_D))
    rx, ry = BASE_L / 2, BASE_W / 2
    adds.append(
        box(-rx, rx, -ry, ry, BASE_H - 0.1, BASE_H + RIM_H)
        - box(-rx + RIM_T, rx - RIM_T, -ry + RIM_T, ry - RIM_T, BASE_H - 1, BASE_H + RIM_H + 1)
    )
    body = shell + union(adds)

    cuts = [cyl_z(x, y, FLOOR, BOARD_Z + 0.1, M25_SELF_TAP_D) for x, y in holes]
    cuts += [cyl_z(x, y, BASE_H - M3_INSERT_DEPTH, BASE_H + 0.1, M3_INSERT_D) for x, y in corners()]
    cuts.append(hex_z(0, 0, -0.1, TRIPOD_NUT_T, TRIPOD_NUT_AF + 2 * TOL))
    cuts.append(cyl_z(0, 0, -0.1, TRIPOD_BOSS_H + 0.1, TRIPOD_BOLT_D))

    # Pi USB/Ethernet (+X wall) and USB-C/micro-HDMI (-Y wall)
    cuts.append(box(IN_X - 1, BASE_L / 2 + 1, PI_Y0 + 3.6, PI_Y0 + PI_W - 2.0, BOARD_Z - 1, BOARD_Z + 19))
    cuts.append(box(PI_X0 + 4, PI_X0 + 46, -BASE_W / 2 - 1, -IN_Y + 1, BOARD_Z - 1, BOARD_Z + 12))
    # Servo power barrel jack (-X wall)
    cuts.append(cyl_x(-30.0, 20.0, -BASE_L / 2 - 1, -IN_X + 1, 8.0))
    # Vent slots (+Y wall)
    cuts += [box(x - 1.5, x + 1.5, IN_Y - 1, BASE_W / 2 + 1, 22, 42) for x in range(-40, 41, 10)]

    body -= union(cuts)
    body.label = "base_enclosure"
    return body


if __name__ == "__main__":
    base_enclosure()
