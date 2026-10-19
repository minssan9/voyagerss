"""Sensor head in print orientation: sensor face on the bed, open back up.

The axle then prints horizontally (layers along its length, strongest in bending)
and needs only a short support under it.
"""

from cadgen import build123d as bd
from cadgen import stl

from config import HEAD_D
from sensor_head import sensor_head


@stl(out="../STL/sensor_head_print.stl")
def sensor_head_print():
    body = bd.Pos(0, 0, HEAD_D / 2) * bd.Rot(-90, 0, 0) * sensor_head()
    body.label = "sensor_head_print"
    return body


if __name__ == "__main__":
    sensor_head_print()
