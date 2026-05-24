# Auto-PR (aipr) — Backend

NestJS API + BullMQ worker for the Auto-PR feedback platform. Runs as a **separate process** from the main Express backend.

## Layout

```
backend/
├── prisma/aipr.prisma          # Schema + @prisma/client-aipr
├── prisma/seed-aipr.ts
└── aipr/
    ├── apps/api/               # Nest + Fastify REST API (default port 3010)
    ├── apps/worker/            # plan / build queue processors
    ├── packages/db/            # Re-exports @prisma/client-aipr for workspace
    ├── packages/shared/
    ├── e2e/
    └── docs/
```

## Prerequisites

- Node 20+, pnpm 9+
- MySQL (`DATABASE_URL_AIPR`)
- Redis (BullMQ)

## Setup

From repository root:

```bash
npm run generate --prefix backend
npm run install:aipr
```

Copy [`.env.sample`](./.env.sample) values into the repo root `.env` (see also [`.env.example`](../../.env.example)).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev:aipr:api` | Nest API watch mode |
| `npm run dev:aipr:worker` | Worker watch mode |
| `npm run dev:aipr:admin` | Nuxt admin (frontend/aipr) |
| `npm run build:aipr` | Build API + worker + frontend apps |
| `npm run test:aipr` | Jest in aipr apps |

Inside `backend/aipr`:

```bash
pnpm db:migrate
pnpm db:seed
```

## API

- Global prefix: `api`
- Default port: `3010` (`PORT` / `AIPR_API_PORT`)
- Health: depends on Nest bootstrap logs
