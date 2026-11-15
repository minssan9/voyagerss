"""Full pan-tilt tracker assembly at a sample pose."""

from cadgen import build123d as bd
from cadgen import glb, step

from base_enclosure import base_enclosure
from base_lid import base_lid
from config import BASE_H, LID_T, SERVO_ARM_IN_X, SERVO_ARM_T, SERVO_TAB_T, TILT_AXIS_Z, TURNTABLE_GAP, TURNTABLE_T
from electronics import pca9685, pi5
from pan_turntable import pan_turntable
from sensor_head import sensor_head
from servo import servo
from tilt_yoke import tilt_yoke

PAN_DEG = 30.0
TILT_DEG = 25.0


def placed(loc, shape, label):
    child = loc * shape
    child.label = label
    return child


def posed_parts(pan_deg, tilt_deg):
    lid_top = BASE_H + LID_T
    tt_z = lid_top + TURNTABLE_GAP
    pan = bd.Pos(0, 0, tt_z) * bd.Rot(0, 0, pan_deg)
    yoke_frame = pan * bd.Pos(0, 0, TURNTABLE_T)

    return [
        placed(bd.Pos(0, 0, 0), base_enclosure(), "base_enclosure"),
        placed(bd.Pos(0, 0, 0), pi5(), "pi5"),
        placed(bd.Pos(0, 0, 0), pca9685(), "pca9685"),
        placed(bd.Pos(0, 0, BASE_H), base_lid(), "base_lid"),
        placed(bd.Pos(0, 0, lid_top + SERVO_TAB_T), servo(), "pan_servo"),
        placed(pan, pan_turntable(), "pan_turntable"),
        placed(yoke_frame, tilt_yoke(), "tilt_yoke"),
        placed(
            yoke_frame * bd.Pos(SERVO_ARM_IN_X + SERVO_ARM_T, 0, TILT_AXIS_Z) * bd.Rot(0, -90, 0),
            servo(),
            "tilt_servo",
        ),
        placed(yoke_frame * bd.Pos(0, 0, TILT_AXIS_Z) * bd.Rot(tilt_deg, 0, 0), sensor_head(), "sensor_head"),
    ]


@step(out="../STEP/assembly.step")
@glb(out="../GLB/assembly.glb")
def assembly():
    return bd.Compound(children=posed_parts(PAN_DEG, TILT_DEG), label="airspace_tracker")


if __name__ == "__main__":
    assembly()
