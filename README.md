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

## Environment

Single production template: [`.env.example`](.env.example). Local overrides go in `.env.local` (gitignored).
