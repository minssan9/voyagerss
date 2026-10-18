# airspace_edge — 공역 감시 edge (Go)

팬틸트 마운트(`hardware/airspace_tracker`)의 Raspberry Pi에서 도는 단일 바이너리.
카메라 드론 탐지 + TI IWR6843 mmWave 레이더를 융합 추적하고, 팬틸트로 카메라를 표적에 돌린다.
결과는 voyagerss 백엔드(NestJS `airspace` 모듈)로 보내고, 화면은 `/vision/airspace`(Vue).
**관측·기록·경보 전용**이며 무력화·발사 장치는 제어하지 않는다.

```text
[Pi] airspace-edge ──POST /api/airspace/ingest (스냅샷, 5 Hz)──▶ [NestJS] ──SSE──▶ [Vue]
                 ◀── 응답에 대기 중인 짐벌 명령 ───────────────
                 ──POST /api/airspace/frame (오버레이 JPEG, 5 Hz)─▶ MJPEG 중계 ─▶
```

edge가 먼저 연결하는 구조라 Pi가 사설망(NAT) 안에 있어도 영상·제어가 된다.

## 실행

```bash
make test                       # go vet + go test
make run-sim                    # 가상 표적·레이더·카메라, 백엔드 http://localhost:9002 로 전송
go run ./cmd/airspace-edge --simulate --listen :8090   # 백엔드 없이 http://localhost:8090/ 디버그 화면
make build-pi                   # bin/airspace-edge-linux-arm64 (cgo 없음)
```

| 플래그 / 환경변수 | 기본 | 설명 |
|---|---|---|
| `--simulate` | off | 가상 공역(40초 반복 시나리오) |
| `--camera` / `AIRSPACE_CAMERA` | `rpicam` | `rpicam`(rpicam-vid YUV420) \| `off` |
| `--radar` / `AIRSPACE_RADAR` | `off` | `off` \| `sim` \| 시리얼 포트(`/dev/ttyUSB1`) |
| `--gimbal` / `AIRSPACE_GIMBAL` | `mock` | `mock` \| `pca9685`(I²C 0x40) |
| `--server` / `AIRSPACE_SERVER_URL` | 없음 | 백엔드 주소 |
| `--token` / `AIRSPACE_INGEST_TOKEN` | 없음 | 백엔드와 같은 값 (운영 필수) |
| `--listen` / `AIRSPACE_LISTEN` | `:8090` | 현장 디버그 화면 `/`, `/status`, `/tracks`, `/stream.mjpg` |
| `--hfov` `--vfov` | 66, 41 | Pi Camera Module 3 표준 렌즈 |

## Pi 설치

```bash
sudo apt install -y rpicam-apps          # 카메라
sudo raspi-config nonint do_i2c 0        # I²C (PCA9685)
scp bin/airspace-edge-linux-arm64 pi@<pi>:/usr/local/bin/airspace-edge
sudo cp deploy/airspace-edge.env.example /etc/airspace-edge.env   # 값 채우기
sudo cp deploy/airspace-edge.service /etc/systemd/system/ && sudo systemctl enable --now airspace-edge
```

레이더 chirp 설정(.cfg)은 TI mmWave 데모 도구로 CLI 포트에 미리 보낸다. `--radar` 는 데이터 포트.

## 구조

| 패키지 | 역할 |
|---|---|
| `internal/proto` | 백엔드와 주고받는 JSON (`backend/src/modules/airspace/airspace.types.ts` 와 일치) |
| `internal/vision` | 흑백 배경 모델 + 8-연결 덩어리 + 프레임 간 지속성으로 소형 비행체 탐지, rpicam 입력, 오버레이 |
| `internal/radar` | IWR6843 TLV 파서, 극좌표 군집화, 시리얼 |
| `internal/tracking` | (방위각, 고각, 거리) 칼만 필터, 헝가리안 매칭, 트랙 병합·수명·궤적, 경보 등급 |
| `internal/gimbal` | PCA9685(periph.io)/mock, 모드: `auto` `lock` `manual` `home` |
| `internal/sim` | 가상 공역 |
| `internal/link` | 백엔드 전송·명령 수신, 현장 디버그 서버 |
| `internal/edge` | 한 주기(탐지→군집→추적→짐벌)와 스냅샷·오버레이 |

- 각도는 마운트 기준 월드 좌표: 팬 0° = 정면, 오른쪽 +, 틸트 0° = 수평, 위 +.
- 경보 점수 = 0.55·근접도(30–150 m) + 0.35·접근 속도(8 m/s 만점) + 분류 가중치. `bird` 는 0.3배. HIGH ≥ 0.65, MEDIUM ≥ 0.35.
- 탐지는 낮 하늘의 어두운 실루엣을 가정한다(`DarkOnly`). 화면 대부분이 한꺼번에 바뀌면(빠른 선회, 노출 변화) 배경을 다시 잡는다.
- 한계: 드론/새 구분 분류기는 없다(모든 카메라 표적은 `aerial`). 실제 하드웨어로는 미검증.
