# Auto-PR (aipr) — Frontend

Nuxt admin UI and embeddable feedback widgets. Separate from the main Quasar SPA.

## Apps

| App | Port (dev) | Description |
|-----|------------|-------------|
| `admin-web` | 3011 | Issue/run admin dashboard |
| `widget-app` | (see package.json) | Feedback widget host |
| `widget-embed` | 4173 | Vite embed script |

## Setup

```bash
npm run install:aipr   # from repo root (includes this workspace)
npm run dev:aipr:admin
```

Point `API_URL` / Nuxt runtime config at the aipr API (`http://localhost:3010` by default).
