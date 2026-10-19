"""Lid: carries the pan servo (shaft on the pan axis) and the turntable skid ring."""

from cadgen import build123d as bd
from cadgen import step, stl

from config import (
    BASE_L,
    BASE_W,
    CABLE_HOLE_D,
    CABLE_HOLE_X,
    CORNER_BOSS_X,
    CORNER_BOSS_Y,
    LID_T,
    M3_CLEAR_D,
    M3_HEAD_D,
    M3_SELF_TAP_D,
    RABBET_DEPTH,
    RIM_T,
    SERVO_HOLE_PITCH_L,
    SERVO_HOLE_PITCH_W,
    SERVO_L,
    SERVO_SHAFT_OFFSET,
    SERVO_W,
    SKID_H,
    SKID_R_IN,
    SKID_R_OUT,
    TOL,
)
from lib.geom import box, cyl_z, union


@step(out="../STEP/base_lid.step")
@stl(out="../STL/base_lid.stl")
def base_lid():
    plate = box(-BASE_L / 2, BASE_L / 2, -BASE_W / 2, BASE_W / 2, 0, LID_T)
    skid = cyl_z(0, 0, LID_T - 0.1, LID_T + SKID_H, 2 * SKID_R_OUT) - cyl_z(0, 0, LID_T - 1, LID_T + SKID_H + 1, 2 * SKID_R_IN)
    body = plate + skid

    cx = -SERVO_SHAFT_OFFSET
    cuts = [box(cx - SERVO_L / 2 - TOL, cx + SERVO_L / 2 + TOL, -SERVO_W / 2 - TOL, SERVO_W / 2 + TOL, -1, LID_T + 1)]
    cuts += [
        cyl_z(cx + sx * SERVO_HOLE_PITCH_L / 2, sy * SERVO_HOLE_PITCH_W / 2, -1, LID_T + 1, M3_SELF_TAP_D)
        for sx in (-1, 1)
        for sy in (-1, 1)
    ]
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * CORNER_BOSS_X, sy * CORNER_BOSS_Y
            cuts.append(cyl_z(x, y, -1, LID_T + 1, M3_CLEAR_D))
            cuts.append(cyl_z(x, y, LID_T - 2, LID_T + 1, M3_HEAD_D))
    cuts.append(cyl_z(CABLE_HOLE_X, 0, -1, LID_T + 1, CABLE_HOLE_D))
    # Rabbet around the underside edge receives the enclosure rim.
    ix, iy = BASE_L / 2 - RIM_T - TOL, BASE_W / 2 - RIM_T - TOL
    cuts.append(
        box(-BASE_L / 2 - 1, BASE_L / 2 + 1, -BASE_W / 2 - 1, BASE_W / 2 + 1, -1, RABBET_DEPTH)
        - box(-ix, ix, -iy, iy, -2, RABBET_DEPTH + 1)
    )

    body -= union(cuts)
    body.label = "base_lid"
    return body


if __name__ == "__main__":
    base_lid()
