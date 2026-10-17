"""Pan turntable: screws onto the pan servo horn, carries the tilt yoke."""

from cadgen import build123d as bd
from cadgen import step, stl

from config import (
    CABLE_HOLE_D,
    CABLE_HOLE_X,
    HORN_CENTER_D,
    HORN_D,
    HORN_HOLE_R,
    HORN_POCKET_DEPTH,
    M3_INSERT_D,
    TOL,
    TURNTABLE_D,
    TURNTABLE_T,
    YOKE_HOLE_X,
    YOKE_HOLE_Y,
)
from lib.geom import cyl_z, union

HORN_SCREW_D = 2.4
HORN_SCREW_HEAD_D = 4.5


@step(out="../STEP/pan_turntable.step")
@stl(out="../STL/pan_turntable.stl")
def pan_turntable():
    body = cyl_z(0, 0, 0, TURNTABLE_T, TURNTABLE_D)

    cuts = [
        cyl_z(0, 0, -1, HORN_POCKET_DEPTH, HORN_D + 3 * TOL),
        cyl_z(0, 0, -1, TURNTABLE_T + 1, HORN_CENTER_D),
        cyl_z(CABLE_HOLE_X, 0, -1, TURNTABLE_T + 1, CABLE_HOLE_D),
    ]
    for x, y in ((HORN_HOLE_R, 0), (-HORN_HOLE_R, 0), (0, HORN_HOLE_R), (0, -HORN_HOLE_R)):
        cuts.append(cyl_z(x, y, -1, TURNTABLE_T + 1, HORN_SCREW_D))
        cuts.append(cyl_z(x, y, TURNTABLE_T - 2, TURNTABLE_T + 1, HORN_SCREW_HEAD_D))
    cuts += [
        cyl_z(sx * YOKE_HOLE_X, sy * YOKE_HOLE_Y, -1, TURNTABLE_T + 1, M3_INSERT_D)
        for sx in (-1, 1)
        for sy in (-1, 1)
    ]

    body -= union(cuts)
    body.label = "pan_turntable"
    return body


if __name__ == "__main__":
    pan_turntable()
