"""Sensor head: camera over radar on one boresight; tilt axis at the origin along X.

Sensors look along +Y at zero tilt. The +X cheek bolts to the tilt servo horn,
the -X axle runs in the yoke's 608 bearing.
"""

from cadgen import build123d as bd
from cadgen import step, stl

from config import (
    AXLE_D,
    AXLE_GAP,
    AXLE_LEN,
    BEARING_LIP,
    CAM_CENTER_Z,
    CAM_HOLE_PITCH_X,
    CAM_HOLE_PITCH_Z,
    CAM_LENS_FROM_TOP_HOLES,
    CAM_LENS_HOLE_D,
    CAM_STANDOFF_H,
    HEAD_D,
    HEAD_H,
    HEAD_SHELL,
    HEAD_W,
    HORN_CENTER_D,
    HORN_HOLE_R,
    M2_SELF_TAP_D,
    M25_SELF_TAP_D,
    RADAR_CENTER_Z,
    RADAR_HOLE_PITCH_X,
    RADAR_HOLE_PITCH_Z,
    RADAR_WINDOW_H,
    RADAR_WINDOW_W,
)
from lib.geom import box, cyl_x, cyl_y, union

RADAR_STANDOFF_H = 4.0


def cam_holes():
    z_top = CAM_CENTER_Z + CAM_LENS_FROM_TOP_HOLES
    return [(sx * CAM_HOLE_PITCH_X / 2, z) for sx in (-1, 1) for z in (z_top, z_top - CAM_HOLE_PITCH_Z)]


def radar_holes():
    return [
        (sx * RADAR_HOLE_PITCH_X / 2, RADAR_CENTER_Z + sz * RADAR_HOLE_PITCH_Z / 2)
        for sx in (-1, 1)
        for sz in (-1, 1)
    ]


@step(out="../STEP/sensor_head.step")
@stl(out="../STL/sensor_head.stl")
def sensor_head():
    hw, hd, hh, t = HEAD_W / 2, HEAD_D / 2, HEAD_H / 2, HEAD_SHELL
    front_in = hd - t

    parts = [
        box(-hw, hw, front_in, hd, -hh, hh),
        box(hw - t, hw, -hd, hd, -hh, hh),
        box(-hw, -hw + t, -hd, hd, -hh, hh),
        box(-hw, hw, -hd, hd, hh - t, hh),
        box(-hw, hw, -hd, hd, -hh, -hh + t),
        cyl_x(0, 0, -hw - AXLE_GAP - BEARING_LIP + 0.3, -hw + 0.1, 11.0),
        cyl_x(0, 0, -hw - AXLE_LEN, -hw + 0.1, AXLE_D),
    ]
    parts += [cyl_y(x, z, front_in - CAM_STANDOFF_H, front_in + 0.1, 5.0) for x, z in cam_holes()]
    parts += [cyl_y(x, z, front_in - RADAR_STANDOFF_H, front_in + 0.1, 5.5) for x, z in radar_holes()]
    body = union(parts)

    cuts = [
        cyl_y(0, CAM_CENTER_Z, front_in - 1, hd + 1, CAM_LENS_HOLE_D),
        box(-RADAR_WINDOW_W / 2, RADAR_WINDOW_W / 2, front_in - 1, hd + 1,
            RADAR_CENTER_Z - RADAR_WINDOW_H / 2, RADAR_CENTER_Z + RADAR_WINDOW_H / 2),
        cyl_x(0, 0, hw - t - 1, hw + 1, HORN_CENTER_D),
    ]
    cuts += [cyl_y(x, z, front_in - CAM_STANDOFF_H - 1, front_in + 2, M2_SELF_TAP_D) for x, z in cam_holes()]
    cuts += [cyl_y(x, z, front_in - RADAR_STANDOFF_H - 1, front_in + 2, M25_SELF_TAP_D) for x, z in radar_holes()]
    cuts += [
        cyl_x(y, z, hw - t - 1, hw + 1, 2.4)
        for y, z in ((HORN_HOLE_R, 0), (-HORN_HOLE_R, 0), (0, HORN_HOLE_R), (0, -HORN_HOLE_R))
    ]

    body -= union(cuts)
    body.label = "sensor_head"
    return body


if __name__ == "__main__":
    sensor_head()
