"""Tolerance test print: the critical fits from the real parts on one small plate.

Print this first and try the servo, a 608 bearing, horn screws, an M3 heat-set
insert and the 1/4"-20 nut. Adjust TOL / the *_D values in config.py if a fit is off.
"""

from cadgen import build123d as bd
from cadgen import step, stl

from config import (
    BEARING_ARM_T,
    BEARING_LIP_HOLE_D,
    BRG_OD,
    BRG_W,
    HORN_CENTER_D,
    HORN_HOLE_R,
    LID_T,
    M3_INSERT_D,
    M3_INSERT_DEPTH,
    M3_SELF_TAP_D,
    SERVO_HOLE_PITCH_L,
    SERVO_HOLE_PITCH_W,
    SERVO_L,
    SERVO_W,
    TOL,
    TRIPOD_BOLT_D,
    TRIPOD_BOSS_D,
    TRIPOD_BOSS_H,
    TRIPOD_NUT_AF,
    TRIPOD_NUT_T,
)
from lib.geom import box, cyl_x, cyl_z, hex_z, union

PLATE_X0, PLATE_X1 = -60.0, 64.0
PLATE_Y = 25.0
SERVO_CX = -30.0
BRG_WALL_X = 6.0
BRG_AXIS_Z = 16.0
HORN_X, HORN_Y = 36.0, 11.0
TRIPOD_X, TRIPOD_Y = 36.0, -12.0
INSERT_X, INSERT_Y = 56.0, 16.0
INSERT_BOSS_D = 8.0
INSERT_BOSS_H = M3_INSERT_DEPTH + 2.0
HORN_SCREW_D = 2.4


@step(out="../STEP/fit_coupon.step")
@stl(out="../STL/fit_coupon.stl")
def fit_coupon():
    plate = box(PLATE_X0, PLATE_X1, -PLATE_Y, PLATE_Y, 0, LID_T)
    brg_wall = box(BRG_WALL_X, BRG_WALL_X + BEARING_ARM_T, -14, 14, 0, BRG_AXIS_Z + 14)
    tripod = cyl_z(TRIPOD_X, TRIPOD_Y, 0, TRIPOD_BOSS_H, TRIPOD_BOSS_D)
    insert = cyl_z(INSERT_X, INSERT_Y, 0, INSERT_BOSS_H, INSERT_BOSS_D)
    body = union([plate, brg_wall, tripod, insert])

    # Same servo pocket and screw holes as the lid.
    cuts = [box(SERVO_CX - SERVO_L / 2 - TOL, SERVO_CX + SERVO_L / 2 + TOL, -SERVO_W / 2 - TOL, SERVO_W / 2 + TOL, -1, LID_T + 1)]
    cuts += [
        cyl_z(SERVO_CX + sx * SERVO_HOLE_PITCH_L / 2, sy * SERVO_HOLE_PITCH_W / 2, -1, LID_T + 1, M3_SELF_TAP_D)
        for sx in (-1, 1)
        for sy in (-1, 1)
    ]
    # Horizontal 608 seat, printed the same way as the yoke's bearing arm.
    cuts.append(cyl_x(0, BRG_AXIS_Z, BRG_WALL_X - 1, BRG_WALL_X + BRG_W, BRG_OD + 0.1))
    cuts.append(cyl_x(0, BRG_AXIS_Z, BRG_WALL_X, BRG_WALL_X + BEARING_ARM_T + 1, BEARING_LIP_HOLE_D))
    cuts.append(cyl_z(HORN_X, HORN_Y, -1, LID_T + 1, HORN_CENTER_D))
    cuts += [
        cyl_z(HORN_X + dx, HORN_Y + dy, -1, LID_T + 1, HORN_SCREW_D)
        for dx, dy in ((HORN_HOLE_R, 0), (-HORN_HOLE_R, 0), (0, HORN_HOLE_R), (0, -HORN_HOLE_R))
    ]
    cuts.append(hex_z(TRIPOD_X, TRIPOD_Y, -0.1, TRIPOD_NUT_T, TRIPOD_NUT_AF + 2 * TOL))
    cuts.append(cyl_z(TRIPOD_X, TRIPOD_Y, -0.1, TRIPOD_BOSS_H + 0.1, TRIPOD_BOLT_D))
    cuts.append(cyl_z(INSERT_X, INSERT_Y, INSERT_BOSS_H - M3_INSERT_DEPTH, INSERT_BOSS_H + 0.1, M3_INSERT_D))

    body -= union(cuts)
    body.label = "fit_coupon"
    return body


if __name__ == "__main__":
    fit_coupon()
