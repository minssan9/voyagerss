"""Shared dimensions (mm) for the airspace tracker pan-tilt mount.

Vendor dimensions marked VERIFY are nominal datasheet values; measure the
actual part before printing.
"""

TOL = 0.2

M3_CLEAR_D = 3.4
M3_HEAD_D = 6.5
M3_INSERT_D = 4.0
M3_INSERT_DEPTH = 6.0
M3_SELF_TAP_D = 2.8
M25_SELF_TAP_D = 2.2
M2_SELF_TAP_D = 1.8

# MG996R servo. Frame: shaft on +Z at the origin, z=0 on the shaft-side face
# of the mounting tabs, body offset toward -X.
SERVO_L = 40.7
SERVO_W = 19.7
SERVO_BELOW_TAB = 29.0
SERVO_ABOVE_TAB = 7.8
SERVO_TAB_SPAN = 54.5
SERVO_TAB_T = 2.5
SERVO_HOLE_PITCH_L = 49.5
SERVO_HOLE_PITCH_W = 10.0
SERVO_SHAFT_OFFSET = 10.35
SERVO_SPLINE_TOP = 13.9

# Round disc horn (VERIFY hole radius against the horn in the box)
HORN_D = 25.0
HORN_T = 2.6
HORN_TOP = 14.5
HORN_HOLE_R = 8.0
HORN_CENTER_D = 6.0

# 608 bearing
BRG_OD = 22.0
BRG_ID = 8.0
BRG_W = 7.0

# Raspberry Pi 5
PI_L = 85.0
PI_W = 56.0
PI_HOLE_PITCH_L = 58.0
PI_HOLE_PITCH_W = 49.0
PI_HOLE_INSET = 3.5

# PCA9685 16-channel servo driver
PCA_L = 62.0
PCA_W = 25.0
PCA_HOLE_PITCH_L = 55.9
PCA_HOLE_PITCH_W = 19.0

# Base enclosure
BASE_L = 130.0
BASE_W = 100.0
BASE_H = 50.0
WALL = 2.4
FLOOR = 3.0
STANDOFF_H = 6.0
STANDOFF_D = 6.0
CORNER_BOSS_D = 8.0
CORNER_BOSS_X = BASE_L / 2 - 5.5
CORNER_BOSS_Y = BASE_W / 2 - 5.5
TRIPOD_NUT_AF = 11.1
TRIPOD_NUT_T = 5.6
TRIPOD_BOLT_D = 6.6
TRIPOD_BOSS_D = 20.0
TRIPOD_BOSS_H = 7.5
# Outer rim on the enclosure top that keys into a rabbet under the lid
RIM_T = 1.4
RIM_H = 1.5

# Lid / pan stage
LID_T = 4.0
SKID_R_IN = 41.0
SKID_R_OUT = 44.0
TURNTABLE_GAP = 14.0
SKID_H = TURNTABLE_GAP - 0.5
CABLE_HOLE_D = 12.0
CABLE_HOLE_X = 27.0
RABBET_DEPTH = RIM_H + 0.3

# Cable-tie anchor on the yoke base, either side of the cable hole
TIE_SLOT_W = 4.0
TIE_SLOT_L = 2.0
TIE_SLOT_Y = 10.0
TIE_GROOVE_DEPTH = 2.0

# Keep-out envelopes for parts not printed (VERIFY against the actual boards)
PI_PCB_T = 1.6
PI_COOLER_H = 10.0  # official Pi 5 Active Cooler, above the PCB
PI_PORTS_H = 16.0  # USB/Ethernet stack
PI_PORTS_L = 22.0
PCA_PCB_T = 1.6
PCA_HEADER_H = 12.0  # vertical servo headers + plugs
MIN_ELECTRONICS_CLEARANCE = 3.0

TURNTABLE_D = 92.0
TURNTABLE_T = 7.0
HORN_POCKET_DEPTH = SERVO_TAB_T + HORN_TOP - TURNTABLE_GAP

# Tilt yoke. Tilt axis is world X; the head is centred on the pan axis.
YOKE_W = 50.0
YOKE_BASE_T = 5.0
YOKE_HOLE_X = 25.0
YOKE_HOLE_Y = 18.0
TILT_AXIS_Z = 58.0
SERVO_ARM_T = 6.0
BEARING_LIP = 1.6
BEARING_ARM_T = BRG_W + BEARING_LIP
BEARING_LIP_HOLE_D = 16.0
AXLE_GAP = 3.0

# Sensor head
HEAD_W = 58.0
HEAD_D = 40.0
HEAD_H = 60.0
HEAD_SHELL = 4.0
AXLE_D = BRG_ID - 0.1

SERVO_GAP = HORN_TOP - SERVO_ARM_T  # cheek face to arm inner face, servo side
SERVO_ARM_IN_X = HEAD_W / 2 + SERVO_GAP
BEARING_ARM_IN_X = -(HEAD_W / 2 + AXLE_GAP)
AXLE_LEN = AXLE_GAP + BEARING_ARM_T

# Raspberry Pi Camera Module 3 (same footprint as v2)
CAM_HOLE_PITCH_X = 21.0
CAM_HOLE_PITCH_Z = 12.5
CAM_LENS_FROM_TOP_HOLES = 7.5  # VERIFY
CAM_LENS_HOLE_D = 14.0
CAM_STANDOFF_H = 3.0
CAM_CENTER_Z = 15.0

# mmWave radar window (default sized for IWR6843AOPEVM; VERIFY)
RADAR_WINDOW_W = 36.0
RADAR_WINDOW_H = 22.0
RADAR_HOLE_PITCH_X = 42.0
RADAR_HOLE_PITCH_Z = 20.0
RADAR_CENTER_Z = -14.0
