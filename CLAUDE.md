# voyagerss

백엔드 API(NestJS + Express 라우터) + Vue 3/Quasar 웹 + Python 비전 프로세스 2개(vision_cam, vision_judge)로 구성된 모노레포. 도메인 모듈: workschd(근무 스케줄), aviation, aipr(Auto-PR), vision, rbac/identity.

공통 규칙은 AGENTS.md 참조 (`backend/AGENTS.md`, `backend/src/modules/AGENTS.md`, `frontend/AGENTS.md`, `frontend/src/api/AGENTS.md`, `frontend/src/components/AGENTS.md`). 화면 목록은 `FEATURE_MAP.md`.

## Stack
- Backend: TypeScript 5.3, NestJS 11 (`@nestjs/core`), Express 4, Prisma 5.22, socket.io 4, node-cron 4, Jest 29
- Frontend: Vue 3.4, Quasar 2.16, Pinia 2, vue-router 4, Vite 4, Axios, Vitest 4, Playwright 1.51
- vision_judge: Python ≥3.11, FastAPI, torch, transformers (Qwen3-VL)
- vision_cam: Python, OpenCV 4.x (`<5` 고정)
- 인프라: MySQL (Prisma, 단일 `DATABASE_URL`), Redis(Bull 큐/SSE), Docker(GHCR) 배포

## Commands
루트 (`package.json`):
- `npm run setup` — backend/frontend 의존성 설치
- `pnpm dev` — be(9002) / fe(9003) / vision_judge(8000) / vision_cam(8080) 동시 실행 (`predev`가 포트 정리)
- `pnpm dev:be`, `pnpm dev:fe`, `pnpm dev:vision`
- `npm run build:all`, `npm run lint`, `npm run format`
- `npm run deploy:smoke`, `npm run deploy:smoke:fe`

backend (`backend/package.json`):
- `npm run dev` / `npm run build` / `npm test` (jest) / `npm run lint`
- `npm run generate` — 5개 Prisma 스키마 client 생성 (`postinstall`에서 자동 실행)
- `npm run db:migrate`, `npm run migrate:deploy`, `npm run seed:config`, `npm run seed:aipr-config`, `npm run seed:local`

frontend (`frontend/package.json`):
- `npm run dev` / `npm run build` / `npm test` (vitest) / `npm run test:e2e` (playwright) / `npm run lint`

## Structure
- `backend/src/main.ts` — Nest 부트스트랩, 전역 prefix `api`, aipr Express 라우터를 `/api/aipr`에 마운트, aipr worker 초기화
- `backend/src/app.module.ts` — Config, Prisma, Rbac, Common, Identity, Workschd, Aviation, Vision 모듈
- `backend/src/modules/<domain>/` — 도메인 모듈 (aipr, aviation, common, data, identity, rbac, vision, workschd)
- `backend/src/config/` — DB 기반 설정 서비스, 시드/스키마 마이그레이터
- `backend/prisma/` — `workschd`, `aviation`, `aipr`, `rbac`, `identity` `.prisma` 스키마, `sql/`, 시드
- `frontend/src/modules/<domain>/` — 도메인별 `api/`, `router/`, `store/`, `views/` (aipr, aviation, vision, workschd)
- `frontend/src/router/` — `routes.ts`, `permission.ts`(가드), `route-access.ts`
- `frontend/src/api/`, `frontend/src/stores/common/`, `frontend/src/layout/`, `frontend/src/components/`
- `frontend/e2e/` — Playwright 테스트
- `vision_cam/`, `vision_judge/` — Python 프로세스 (각 README 참고)
- `meta/docs/` — 아키텍처/셋업/스펙 문서, `meta/deploy/` — docker-compose, nginx, 스모크 스크립트
- `.github/workflows/` — `ci.yml`(Unified CI), `deploy-production.yml`(GHCR)

## Conventions
- Backend 레이어: Controller → Service → Prisma. Nest 컨트롤러는 `nest-controllers/`, aipr는 Express `routes.ts` 방식
- 전역 `ValidationPipe({ whitelist, transform })`, `I18nExceptionFilter`
- API 응답 래퍼: `{ result: "SUCCESS" | "ERROR", message, data }` (backend/AGENTS.md)
- 도메인별 Prisma 서비스: `backend/src/prisma/*-prisma.service.ts`
- Frontend: `<script setup lang="ts">`, `@` = `src`, Pinia 스토어, `<style scoped>` 금지 — 전역 SCSS(`src/assets/styles`) + BEM
- 파일명: backend kebab-case, Vue 컴포넌트 PascalCase

## Gotchas
- 환경변수 로딩: `backend/src/load-env.ts`가 루트의 `../.env.local` → `../.env` 순으로 로드. backend 디렉터리에서 실행해야 경로가 맞음
- `DATABASE_URL` 하나로 모든 스키마 공유. 레거시 `DATABASE_URL_*` 키는 자동으로 채워짐
- JWT/OAuth/API 키/SMTP/CORS 등 런타임 설정은 DB(`workschd.system_config`, `aipr.system_config`)에 저장되며 `CONFIG_ENCRYPTION_KEY`로 암호화. 신규 DB는 `seed:config`, `seed:aipr-config` 필요
- `backend/src/modules/workschd/controllers/`는 import되지 않는 레거시 Express 컨트롤러. 실제 라우트는 `nest-controllers/`
- aipr 모듈은 `AppModule`에 없고 `main.ts`에서 Express 라우터로 직접 마운트됨
- 루트 스크립트는 `npm`과 `pnpm`이 섞여 있음 (`setup`은 npm, `dev`는 pnpm)
- CI(`ci.yml`) 백엔드 테스트 단계는 주석 처리됨 — 로컬에서 `npm test` 직접 실행
- 로컬 테스트 계정은 `README.md` 참고
