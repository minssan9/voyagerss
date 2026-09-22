# citygame — 인프라 아키텍처 & 배포

`citygame` 모듈(실시간 지도 연동 도시 건설 게임)의 인프라 구성과 무료 티어 배포 경로를 정리합니다. 기존 Voyagerss 백엔드/프론트엔드는 DigitalOcean droplet + docker-compose로 배포되어 있으며([DEPLOY-DIGITALOCEAN.md](../../deploy/DEPLOY-DIGITALOCEAN.md)), 아래 내용은 그 대체 혹은 추가 배포 경로입니다.

## 현재 구현 상태

| 영역 | 상태 |
|---|---|
| WebGPU/WebGL2 엔진, 카메라, 단축키 | ✅ 구현 (Phase 1) |
| 실좌표 ↔ 가상 그리드 매핑 (슬리피맵 타일, zoom 18) | ✅ 구현 |
| Leaflet 기반 위치 선택 · 타일 선점 UI | ✅ 구현 |
| Socket.IO `/citygame` 네임스페이스, 타일 기반 room, 인접 타일 스트리밍 | ✅ 구현 |
| 건물/도로 배치·철거 실시간 동기화 | ✅ 구현 (서버 메모리 상태) |
| 카메라 거리 기반 spatial partitioning (반경 1~3타일) | ✅ 구현 |
| Postgres/PostGIS 영속화 | ⏳ 스키마만 존재 (`backend/prisma/citygame.prisma`), 실제 조회/저장 미연결 |
| 게임패드 입력 | ✅ 구현 (액션 레이어로 키보드와 동일 취급) |
| Tauri/Electron 패키징, Steamworks 연동 | ⏳ 미착수 (아래 "향후 확장" 참고) |

실시간 상태(타일 선점, 배치된 건물)는 현재 백엔드 프로세스 메모리에만 존재합니다. 인스턴스가 여러 개이거나 재시작되면 상태가 리셋됩니다 — 아래 Supabase 연동은 이 문제를 해결하기 위한 다음 단계입니다.

## 아키텍처

```
Browser (Vue3 + Babylon.js)
  ├─ Leaflet (OSM 타일) ── 실좌표 선택/선점 UI
  └─ socket.io-client ─────────────┐
                                   │  /citygame namespace
                                   ▼
NestJS backend (기존 프로세스, 포트 공유)
  └─ CityGameGatewayService
       ├─ room = `tile:{z}/{x}/{y}` (슬리피맵 타일)
       ├─ 인접 반경(N) 이내 room만 join → 먼 타일은 아예 브로드캐스트 대상에서 제외
       └─ 상태: Map 기반 in-memory (claims, placed objects)
```

- 타일 좌표계는 OSM/Mapbox와 동일한 슬리피맵 타일(zoom 18)을 사용합니다 — `frontend/src/modules/citygame/geo/tileMath.ts`, `backend/src/modules/citygame/geo/tileMath.ts` (프론트/백엔드가 별도 프로젝트라 상수·로직을 의도적으로 중복— `config/world.ts` 두 곳 값이 반드시 일치해야 함).
- Socket.IO는 기존 `webSocketService`가 만든 서버에 `/citygame` 네임스페이스로 얹혀 있습니다(`backend/src/main.ts`). 새 포트/새 nginx 설정이 필요 없습니다 — 기존 `/socket.io/` 프록시가 그대로 재사용됩니다.

## 무료 티어 배포

### 1. 프론트엔드 — Vercel

`frontend/vercel.json`이 이미 존재합니다. Vercel 대시보드에서 저장소를 연결하고 Root Directory를 `frontend`로 지정하면 됩니다. Cloudflare Pages도 동일한 빌드 설정(`npm run build`, output `dist`)으로 대체 가능합니다.

### 2. 백엔드 — Render (또는 Fly.io)

루트의 [`render.yaml`](../../../render.yaml)이 Blueprint입니다. 기존 `backend/Dockerfile`을 그대로 재사용하므로 droplet 이미지와 빌드가 동일합니다.

```bash
# Render: 대시보드에서 "New > Blueprint"로 저장소 연결 → render.yaml 인식
# Fly.io 대안: 별도 설정 파일 없이도 동일 Dockerfile로 배포 가능
cd backend && fly launch
```

배포 후 Render/Fly 대시보드에서 `DATABASE_URL`, `CONFIG_ENCRYPTION_KEY`, `ALLOWED_ORIGINS` 등 민감 환경변수를 설정하세요(`render.yaml`에는 값을 넣지 않았습니다).

> **주의**: `render.yaml`의 `BACKEND_PORT=10000`은 시작값입니다. Render의 Docker 런타임 포트 감지 방식은 배포 전 Render 공식 문서에서 재확인하세요 — 이 리포에서 실제로 배포/검증하지는 않았습니다.

### 3. citygame 전용 DB — Supabase (Postgres + PostGIS)

1. [supabase.com](https://supabase.com)에서 무료 프로젝트 생성.
2. SQL Editor에서 `create extension if not exists postgis;` 실행 (향후 공간 인덱스용).
3. 프로젝트의 Connection string(Transaction pooler 권장)을 `.env`의 `CITYGAME_DATABASE_URL`에 설정.
4. `cd backend && npm run migrate:citygame` 으로 `citygame_tile`, `citygame_placed_building` 테이블 생성.
5. `CityGameGatewayService`를 in-memory `Map` 대신 Prisma 클라이언트(`@prisma/client-citygame`)로 바꾸는 작업은 아직 남아 있습니다 — 현재는 스키마만 준비된 상태입니다.

## 향후 확장 — 데스크톱/콘솔 패키징

- **Tauri**: `frontend/`가 이미 순수 Vite 앱이므로 `cd frontend && npm install -D @tauri-apps/cli && npx tauri init`으로 그대로 감쌀 수 있습니다. Rust 툴체인이 필요해 이 세션에서는 스캐폴딩하지 않았습니다.
- **입력 → 게임패드**: `frontend/src/modules/citygame/config/actions.ts`가 키보드/게임패드를 공통 `GameAction`으로 매핑합니다. Steam Deck/컨트롤러 지원 시 이 파일의 `GAMEPAD_BUTTON_ACTION_MAP`만 조정하면 되고, `CameraController`/`CityGamePage`는 액션 단위로만 동작하므로 추가 변경이 필요 없습니다.
- **Steamworks**: 인증/클라우드 세이브/업적은 Tauri sidecar 또는 Rust 플러그인으로 Steamworks SDK를 래핑해야 하며, 실제 Steam App ID·SDK 바이너리가 필요해 이 리포에는 포함하지 않았습니다.
