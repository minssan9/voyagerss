# Voyagerss

Monorepo: `backend/` (Nest/Express API) + `frontend/` (Vue 3 / Quasar).

## Documentation

- **[Setup & deployment](meta/docs/setup.md)**
- **[Documentation index](meta/docs/README.md)**
- **[Local MLX + AIPR guide](meta/docs/guides/aipr-local-mlx.md)**

## Quick start (local)

```bash
cp .env.example .env.local   # edit values — see Local development overrides in .env.example
npm run setup
npm run dev
```

## Environment

Single production template: [`.env.example`](.env.example). Local overrides go in `.env.local` (gitignored).
