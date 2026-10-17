"""MG996R + disc horn placeholder for assembly fit checks (not printed)."""

from cadgen import build123d as bd
from cadgen import step

from config import (
    HORN_D,
    HORN_T,
    HORN_TOP,
    SERVO_ABOVE_TAB,
    SERVO_BELOW_TAB,
    SERVO_L,
    SERVO_SHAFT_OFFSET,
    SERVO_SPLINE_TOP,
    SERVO_TAB_SPAN,
    SERVO_TAB_T,
    SERVO_W,
)
from lib.geom import box, cyl_z


@step(out="../STEP/servo_mg996r.step")
def servo():
    cx = -SERVO_SHAFT_OFFSET
    body = box(cx - SERVO_L / 2, cx + SERVO_L / 2, -SERVO_W / 2, SERVO_W / 2, -SERVO_BELOW_TAB, SERVO_ABOVE_TAB)
    tabs = box(cx - SERVO_TAB_SPAN / 2, cx + SERVO_TAB_SPAN / 2, -SERVO_W / 2 + 1, SERVO_W / 2 - 1, -SERVO_TAB_T, 0)
    spline = cyl_z(0, 0, SERVO_ABOVE_TAB, SERVO_SPLINE_TOP, 6.0)
    horn = cyl_z(0, 0, HORN_TOP - HORN_T, HORN_TOP, HORN_D)
    result = body + tabs + spline + horn
    result.label = "servo_mg996r"
    return result


if __name__ == "__main__":
    servo()
