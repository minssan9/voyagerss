# Voyagerss

Monorepo: `backend/` (Nest/Express API) + `frontend/` (Vue 3 / Quasar) + `vision_cam/` (OpenCV camera) + `vision_judge/` (Qwen3-VL image judge).

`pnpm dev` starts the API, the web app, and both Python vision processes. Module details: [vision_cam/README.md](vision_cam/README.md), [vision_judge/README.md](vision_judge/README.md).

## Documentation

- **[Architecture](meta/docs/architecture.md)**
- **[Setup & deployment](meta/docs/setup.md)**
- **[Documentation index](meta/docs/README.md)**
- **[Local MLX + AIPR guide](meta/docs/guides/aipr-local-mlx.md)**

## Quick start (local)

```bash
cp .env.example .env.local   # edit values — see Local development overrides in .env.example
npm run setup
pnpm dev
```

## Local ports

`pnpm dev` starts these four processes. `predev` frees the same ports first.

| Port | Service | Config |
|------|---------|--------|
| 9002 | NestJS API | `BACKEND_PORT` |
| 9003 | Vue / Quasar / Vite | `FRONTEND_PORT` — proxies `/api` and `/socket.io` to 9002 |
| 8000 | vision_judge (Qwen3-VL) | `PORT`, `VISION_JUDGE_BASE_URL` |
| 8080 | vision_cam MJPEG stream | `VISION_CAM_STREAM_PORT` |

Open the app at http://localhost:9003.

## Local test accounts

Password for every account below is `password123!`.

| Email | Role |
|-------|------|
| `leader@example.com` | workschd team leader |
| `member@example.com` | workschd worker |
| `admin@workschd.test` | administrator |

## Environment

Single production template: [`.env.example`](.env.example). Local overrides go in `.env.local` (gitignored).
