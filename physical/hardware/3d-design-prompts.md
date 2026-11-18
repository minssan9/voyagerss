# 3D 설계 프롬프트

ESP32 팬/틸트 추적 카메라 하우징을 **Text-to-CAD**(Zoo, Adam CAD 등), **LLM → OpenSCAD/CadQuery 코드 생성**, **이미지 생성(콘셉트 렌더)** 에 쓰기 위한 프롬프트 모음입니다.

> 아래 치수는 대표값입니다. 부품 편차가 ±0.5mm 있으므로 **캘리퍼스로 실측 후 파라미터를 수정**하세요.

## 0. 공통 치수 (프롬프트에 붙여 넣는 기준표)

| 부품 | 치수 (mm) | 비고 |
|---|---|---|
| MG90S / SG90 본체 | 22.8 × 12.2 × 22.7 (탭 아래 높이 15.9) | 탭 포함 길이 32.5, 탭 두께 2.5 |
| 서보 장착 홀 | 간격 28.0, Ø2.2 | M2 셀프태핑 |
| 서보 출력축 | 본체 한쪽 끝에서 6.0 안쪽, 축 Ø4.8, 25T 스플라인 | 축 끝 높이 = 탭 위 +13 |
| 서보 십자 혼 | 팔 길이 반경 16, 두께 1.8, 허브 Ø7 | |
| XIAO ESP32S3 Sense | 21.0 × 17.8, 스택 높이 15.0 | USB-C 는 17.8mm 변 쪽 |
| OV2640 렌즈 모듈 | 8.5 × 8.5, 렌즈 경통 Ø8, 돌출 5 | 24pin FPC |
| AI-Thinker ESP32-CAM | 27.0 × 40.5 × 4.5 (+렌즈 돌출 8) | |
| WS2812B 1구 모듈 | Ø10 원형 PCB, 두께 3 | |
| DC 잭 패널형 | 장착 홀 Ø8 (M8 너트) | |
| 전원 분배 기판 | 30 × 40 × 1.6 | |

## 1. 마스터 디자인 브리프 (모든 도구 공통 맥락)

```text
Design a compact desktop pan-tilt tracking camera enclosure for 3D printing (FDM, PETG).
Style: minimalist industrial design inspired by Apple and Tesla — clean monolithic forms,
generous fillets (R3–R6 outer, R1 inner), no visible screws from the front, a single thin
light slit for a status LED, matte surfaces, seamless part lines.

Assemblies:
1. BASE: cylindrical puck Ø80 × 40 mm. Houses a vertical MG90S pan servo (output shaft up,
   shaft centered on the base axis), a 30×40 mm power PCB, a panel DC jack (Ø8 hole) on the
   rear, and a WS2812B LED behind a 1.2 mm wide frosted light slit wrapping 60° around the
   front lower edge. Bottom lid with 4 × M3 screws into heat-set inserts and 4 rubber-foot
   recesses Ø10 × 1 mm. Cable pass-through Ø8 at the top center next to the servo shaft.
2. PAN YOKE: U-shaped yoke that bolts to the pan servo cross horn (recessed horn pocket,
   2 × M2 screws), 2.5 mm walls, inner width 36 mm, arm height 38 mm. One arm holds the
   horizontal MG90S tilt servo (pocket with 2 × M2 tab screws), the opposite arm has a Ø3 mm
   pivot pin hole (or 625ZZ bearing seat Ø16 × 5) on the same axis as the tilt servo shaft.
3. CAMERA HEAD: rounded capsule 34 × 30 × 28 mm holding a Seeed XIAO ESP32S3 Sense
   (21 × 17.8 × 15 mm stack). Front face: Ø9 lens opening with 0.6 mm chamfer and a
   recessed glossy lens bezel ring Ø16. Rear: USB-C access slot 10 × 4.5 mm. Split into
   front shell + rear shell with an M2 screw from the bottom and a 0.8 mm tongue-and-groove
   seam. Side bosses: one with a cross-horn pocket for the tilt servo, the other with a
   Ø3 pivot pin, both on the head's center of mass.

Constraints:
- Tilt axis passes through the camera lens's optical center (minimizes parallax).
- Pan range ±80°, tilt range −45°…+45° without collision; show clearances ≥ 2 mm.
- Wall thickness 2.0 mm, press-fit clearance 0.2 mm, sliding clearance 0.3 mm.
- Every part printable without supports on its flat face (≤ 45° overhangs, bridges ≤ 15 mm).
- Cable path from head → yoke → base with an 80 mm slack loop, routed through the yoke arm.
- Overall height ≤ 120 mm, footprint ≤ Ø80 mm.
Output: separate bodies per part, units mm, export STEP + STL.
```

## 2. 부품별 프롬프트 (Text-to-CAD)

### 2-1. 베이스

```text
Create a 3D-printable cylindrical base, Ø80 mm × 40 mm, outer edge fillet R5, wall 2 mm.
Inside: a vertical pocket for an MG90S servo (body 22.8 × 12.2 mm, mounting tabs 32.5 mm
long at 15.9 mm height, tab holes Ø2.2 spaced 28 mm) positioned so the servo output shaft
(6 mm from one end of the body) is exactly on the cylinder's central axis, shaft pointing up
through a Ø12 hole in the top face. Add a Ø8 cable hole 14 mm off-center in the top face.
Rear wall: Ø8 hole for a panel DC jack, with a flat 14 × 14 mm spot-face inside.
Front lower edge: a 1.2 mm tall light slit spanning 60° of arc, backed by an internal Ø11
pocket for a round WS2812B module, facing outward.
Internal standoffs for a 30 × 40 mm PCB with M2 holes at the corners (3 mm inset).
Bottom: separate 2 mm lid, 4 × M3 countersunk holes into Ø4.2 × 5 mm heat-set insert bosses,
4 recesses Ø10 × 1 mm for rubber feet. Print orientation: base upside-down, lid flat.
```

### 2-2. 팬 요크 (U 브래킷)

```text
Design a U-shaped pan yoke. Base plate 44 × 20 × 3 mm with a recessed pocket matching a
servo cross horn (two arms 32 mm tip-to-tip, 5 mm wide, hub Ø7, depth 1.8 mm) and a Ø7
center hole for the horn screw, plus 2 × Ø2 holes on the horn arms.
Two vertical arms, 2.5 mm thick, 38 mm tall, inner gap 36 mm, with R4 fillets at the root.
Left arm: rectangular cut-out for an MG90S servo lying horizontally (body 22.8 × 12.2 mm,
tabs screwed to the outside of the arm with 2 × M2 at 28 mm spacing), servo shaft axis at
30 mm height. Right arm: coaxial Ø3.1 hole for a steel pin, or a 625ZZ bearing seat
Ø16.1 × 5 mm. Add a 6 × 4 mm internal cable channel up the right arm.
Print lying on its back without supports.
```

### 2-3. 카메라 헤드 (XIAO ESP32S3 Sense)

```text
Model a two-piece camera head shell, outer 34 × 30 × 28 mm rounded capsule (R6 edges).
Inside: a cradle for a Seeed XIAO ESP32S3 Sense (21 × 17.8 mm PCB, 15 mm stack height) with
the OV2640 lens (8.5 × 8.5 mm module, Ø8 barrel) facing forward through a Ø9 front hole.
The lens optical center must lie on the tilt axis. Rear shell: 10 × 4.5 mm USB-C slot
aligned with the board's connector, 4 ventilation slots 1.2 × 10 mm.
Side A boss: recessed pocket for a single-arm servo horn (arm 16 mm, hub Ø7, 1.8 mm deep)
with a Ø2.2 screw hole on the tilt axis. Side B boss: Ø3.1 pin hole on the same axis.
Bottom: Ø6 grommet hole for the 4-wire cable. Split along the vertical plane 10 mm behind
the front face, 0.8 mm tongue-and-groove, joined by one M2 screw from below.
```

### 2-4. 카메라 헤드 (ESP32-CAM 대체)

```text
Same capsule language as above but sized 46 × 34 × 22 mm to hold an AI-Thinker ESP32-CAM
(27 × 40.5 × 4.5 mm PCB, lens module protruding 8 mm, lens 9.5 mm from the top edge, centered).
Leave a 6 × 3 mm opening at the bottom edge for the 5V/GND/IO14/IO15/IO13 header wires,
and a removable rear cover to reach the RESET button. Antenna side keep-out: no material
thicker than 1.2 mm within 8 mm of the PCB antenna end.
```

## 3. OpenSCAD / CadQuery 코드 생성 프롬프트 (LLM 용)

```text
You are a mechanical CAD engineer. Write a single parametric OpenSCAD file (or CadQuery
Python if I say so) for a pan-tilt camera enclosure with these modules: base(), lid(),
pan_yoke(), head_front(), head_rear(), and an assembly() that places them with
pan_angle and tilt_angle parameters for collision checking.

Put every dimension as a named parameter at the top, grouped and commented:
- servo_body = [22.8, 12.2, 22.7]; servo_tab_len = 32.5; servo_tab_z = 15.9;
  servo_hole_pitch = 28; servo_shaft_offset = 6; horn_arm = 16; horn_hub_d = 7;
- board = [21, 17.8, 15]; lens_d = 8; lens_module = [8.5, 8.5];
- base_d = 80; base_h = 40; wall = 2; fit = 0.2; slide = 0.3; fillet = 5;
- pan_range = [-80, 80]; tilt_range = [-45, 45];
Rules: use minkowski or hull for fillets, $fn = 96 for curves, no magic numbers inside
modules, each module printable on its flat face without supports. Add an `explode` flag
and a `section` flag (cut along Y=0) for inspection. Output only the code.
```

## 4. 콘셉트 렌더 프롬프트 (이미지 생성)

```text
Product photography of a minimalist desktop pan-tilt AI tracking camera, matte warm-white
PETG body with a graphite-gray camera capsule, a single thin glowing cyan light line on the
base, small round glossy black lens, Apple-style industrial design, soft studio lighting,
seamless light gray background, 3/4 front view, 85mm lens, shallow depth of field, ultra
clean, no logos, no text --ar 4:3
```

변형: `glowing red light line` (STOP 상태), `exploded view technical illustration, isometric, labeled parts` (조립도).

## 5. 프린팅 설정

| 항목 | 값 |
|---|---|
| 소재 | PETG (서보 발열·햇빛에 PLA 보다 강함), 렌즈 베젤은 PLA 블랙 가능 |
| 레이어 | 0.2mm (헤드 쉘은 0.12mm) |
| 벽 / 인필 | 3벽, 25% 자이로이드 (요크는 40%) |
| 서포트 | 없음 (설계 조건) |
| 라이트 슬릿 | 1층(0.2mm) 반투명 PETG 브리지 → 확산판 역할 |
| 후처리 | M2/M3 열압입 인서트 (인두 220°C) |

## 6. 설계 검증 체크리스트

- [ ] 서보 혼을 90° 에서 끼웠을 때 요크·헤드가 정면을 향함
- [ ] `assembly(pan=±80, tilt=±45)` 에서 간섭 없음 (≥ 2mm)
- [ ] 틸트 축이 렌즈 광학 중심을 지남 (흔들림 시 화면 이동 최소화)
- [ ] 케이블 80mm 여유 루프가 팬 전 범위에서 당기지 않음
- [ ] USB-C 포트에 케이블 체결 가능 (헤드 분해 없이 펌웨어 업로드)
- [ ] 무게중심이 베이스 원 안쪽 (헤드 틸트 최대 시 넘어지지 않음)
