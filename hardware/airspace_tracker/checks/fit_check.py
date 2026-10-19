"""Part validity + interference sweep over the pan/tilt range.

Run from hardware/airspace_tracker:  python checks/fit_check.py
"""

import sys
from itertools import combinations
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from cadgen import read_step  # noqa: E402
from cadgen.geometry import overlap_volume  # noqa: E402

from assembly import posed_parts  # noqa: E402
from config import MIN_ELECTRONICS_CLEARANCE  # noqa: E402

PRINTED = ["base_enclosure", "base_lid", "pan_turntable", "tilt_yoke", "sensor_head", "fit_coupon"]
POSES = [(pan, tilt) for pan in (0, 90, 180) for tilt in (-10, 0, 45, 90)]
MAX_OVERLAP_MM3 = 0.01

failures = []

for name in PRINTED:
    shape = read_step(f"STEP/{name}.step")
    solids = shape.solids()
    bb = shape.bounding_box()
    print(f"{name:16s} solids={len(solids)} valid={shape.is_valid} "
          f"vol={shape.volume / 1000:.1f}cm3 size=({bb.size.X:.1f}, {bb.size.Y:.1f}, {bb.size.Z:.1f})")
    if len(solids) != 1 or not shape.is_valid:
        failures.append(f"{name}: expected one valid solid")

for pan, tilt in POSES:
    bodies = [(p.label, s) for p in posed_parts(pan, tilt) for s in p.solids()]
    for (la, a), (lb, b) in combinations(bodies, 2):
        if not a.bounding_box().overlaps(b.bounding_box()):
            continue
        v = overlap_volume(a, b)
        if v > MAX_OVERLAP_MM3:
            failures.append(f"pan={pan} tilt={tilt}: {la} x {lb} overlap {v:.2f} mm3")
    print(f"pose pan={pan:3d} tilt={tilt:3d} checked")

# Pan servo is fixed to the lid, so one pose covers its clearance to the boards.
parts = {p.label: p for p in posed_parts(0, 0)}
for board in ("pi5", "pca9685"):
    gap = parts["pan_servo"].distance_to(parts[board])
    print(f"pan_servo -> {board}: {gap:.1f} mm")
    if gap < MIN_ELECTRONICS_CLEARANCE:
        failures.append(f"pan_servo too close to {board}: {gap:.1f} mm < {MIN_ELECTRONICS_CLEARANCE} mm")

print("\n".join(failures) or "OK: no interference")
sys.exit(1 if failures else 0)
