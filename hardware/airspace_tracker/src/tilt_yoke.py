"""Tilt U-yoke: tilt servo on the +X arm, 608 bearing on the -X arm."""

from cadgen import build123d as bd
from cadgen import step, stl

from config import (
    BEARING_ARM_IN_X,
    BEARING_ARM_T,
    BEARING_LIP_HOLE_D,
    BRG_OD,
    BRG_W,
    CABLE_HOLE_D,
    CABLE_HOLE_X,
    M3_CLEAR_D,
    M3_HEAD_D,
    M3_SELF_TAP_D,
    SERVO_ARM_IN_X,
    SERVO_ARM_T,
    SERVO_HOLE_PITCH_L,
    SERVO_HOLE_PITCH_W,
    SERVO_L,
    SERVO_SHAFT_OFFSET,
    SERVO_W,
    TIE_GROOVE_DEPTH,
    TIE_SLOT_L,
    TIE_SLOT_W,
    TIE_SLOT_Y,
    TILT_AXIS_Z,
    TOL,
    YOKE_BASE_T,
    YOKE_HOLE_X,
    YOKE_HOLE_Y,
    YOKE_W,
)
from lib.geom import box, cyl_x, cyl_z, union

SERVO_ARM_OUT_X = SERVO_ARM_IN_X + SERVO_ARM_T
BEARING_ARM_OUT_X = BEARING_ARM_IN_X - BEARING_ARM_T


def arm(x0, x1):
    return box(x0, x1, -YOKE_W / 2, YOKE_W / 2, 0, TILT_AXIS_Z) + cyl_x(0, TILT_AXIS_Z, x0, x1, YOKE_W)


@step(out="../STEP/tilt_yoke.step")
@stl(out="../STL/tilt_yoke.stl")
def tilt_yoke():
    base = box(BEARING_ARM_OUT_X, SERVO_ARM_OUT_X, -YOKE_W / 2, YOKE_W / 2, 0, YOKE_BASE_T)
    body = base + arm(SERVO_ARM_IN_X, SERVO_ARM_OUT_X) + arm(BEARING_ARM_OUT_X, BEARING_ARM_IN_X)

    # Servo body passes through the arm lengthwise along Z, shaft on the tilt axis.
    zc = TILT_AXIS_Z - SERVO_SHAFT_OFFSET
    x0, x1 = SERVO_ARM_IN_X - 1, SERVO_ARM_OUT_X + 1
    cuts = [box(x0, x1, -SERVO_W / 2 - TOL, SERVO_W / 2 + TOL, zc - SERVO_L / 2 - TOL, zc + SERVO_L / 2 + TOL)]
    cuts += [
        cyl_x(sy * SERVO_HOLE_PITCH_W / 2, zc + sz * SERVO_HOLE_PITCH_L / 2, x0, x1, M3_SELF_TAP_D)
        for sy in (-1, 1)
        for sz in (-1, 1)
    ]

    cuts.append(cyl_x(0, TILT_AXIS_Z, BEARING_ARM_OUT_X - 1, BEARING_ARM_OUT_X + BRG_W, BRG_OD + 0.1))
    cuts.append(cyl_x(0, TILT_AXIS_Z, BEARING_ARM_OUT_X, BEARING_ARM_IN_X + 1, BEARING_LIP_HOLE_D))

    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * YOKE_HOLE_X, sy * YOKE_HOLE_Y
            cuts.append(cyl_z(x, y, -1, YOKE_BASE_T + 1, M3_CLEAR_D))
            cuts.append(cyl_z(x, y, YOKE_BASE_T - 2.5, YOKE_BASE_T + 1, M3_HEAD_D))
    cuts.append(cyl_z(0, 0, -1, YOKE_BASE_T + 1, 8.0))
    cuts.append(cyl_z(CABLE_HOLE_X, 0, -1, YOKE_BASE_T + 1, CABLE_HOLE_D))
    # Cable-tie anchor: down one slot, along the underside groove, up the other.
    tx0, tx1 = CABLE_HOLE_X - TIE_SLOT_W / 2, CABLE_HOLE_X + TIE_SLOT_W / 2
    for sy in (-1, 1):
        y = sy * TIE_SLOT_Y
        cuts.append(box(tx0, tx1, y - TIE_SLOT_L / 2, y + TIE_SLOT_L / 2, -1, YOKE_BASE_T + 1))
    cuts.append(box(tx0, tx1, -TIE_SLOT_Y - TIE_SLOT_L / 2, TIE_SLOT_Y + TIE_SLOT_L / 2, -1, TIE_GROOVE_DEPTH))

    body -= union(cuts)
    body.label = "tilt_yoke"
    return body


if __name__ == "__main__":
    tilt_yoke()
