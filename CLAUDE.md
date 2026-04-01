# CLAUDE.md — Voyagerss Codebase Guide

**Last updated**: 2026-03-08
**Stack**: Node.js · Express · TypeScript · Prisma · Vue 3 · Quasar · Pinia

---

## 1. Project Overview

**Voyagerss** is a unified multi-domain platform consisting of three domain modules:

| Module | Purpose |
|--------|---------|
| `workschd` | Funeral home worker scheduling (상조 서비스) — team/task/notification management + live scraper |
| `aviation` | Aviation quiz system, airport navigation, route data |
| `investand` | Financial/investment analytics and stock market data |

Each module has its own Prisma schema, database, controllers, services, and frontend views.

---

## 2. Repository Structure

```
voyagerss/
├── backend/                        # Node.js / Express / TypeScript API
│   ├── prisma/
│   │   ├── workschd.prisma         # MySQL schema for workschd
│   │   ├── aviation.prisma         # MySQL schema for aviation
│   │   └── investand.prisma        # MySQL schema for investand
│   ├── src/
│   │   ├── app.ts                  # Express app entry point
│   │   ├── config/
│   │   │   └── prisma.ts           # Exports workschdPrisma, investandPrisma, aviationPrisma
│   │   └── modules/
│   │       ├── workschd/           # Funeral/scheduling module
│   │       │   ├── controllers/    # HTTP request handlers
│   │       │   ├── services/       # Business logic
│   │       │   ├── middleware/     # authMiddleware.ts (JWT + RBAC)
│   │       │   ├── scraper/        # Live funeral data scraper (NEW)
│   │       │   │   ├── index.ts    # Orchestrator — runs all 21 scrapers
│   │       │   │   ├── db.ts       # SQLite wrapper for scraped data
│   │       │   │   ├── types.ts    # ScrapedFuneral, ScrapeResult interfaces
│   │       │   │   └── sites/      # Per-site scraper classes (21 total)
│   │       │   └── routes.ts       # All workschd routes
│   │       ├── aviation/
│   │       └── investand/
│   ├── data/                       # SQLite DB files (auto-created, gitignored)
│   │   └── scraper.db              # Scraped funeral data (SQLite)
│   └── package.json
│
├── frontend/                       # Vue 3 / Quasar / Pinia SPA
│   └── src/
│       ├── api/workschd/
│       │   ├── api-task.ts         # Task CRUD + employee management
│       │   ├── api-team.ts
│       │   ├── api-scraper.ts      # Funeral scraper API (NEW)
│       │   └── axios.js            # Axios instance with JWT interceptors
│       ├── views/workschd/
│       │   ├── FuneralBoardView.vue        # Live funeral board (Apple/Tesla style) (NEW)
│       │   ├── task/
│       │   │   ├── TaskManage.vue          # Team leader task management
│       │   │   ├── TaskManageMobile.vue
│       │   │   ├── TaskListMobile.vue      # Worker task list
│       │   │   ├── grid/TaskEmployeeGrid.vue
│       │   │   └── dialog/
│       │   │       ├── TaskDialog.vue
│       │   │       ├── FuneralDetailModal.vue  # Funeral detail + apply (NEW)
│       │   │       └── AdminFuneralModal.vue   # Admin worker assignment (NEW)
│       │   ├── team/               # Team management views
│       │   └── main/               # Landing, Dashboard, About, Terms...
│       ├── stores/
│       │   ├── common/store_user.ts        # Auth state (accessToken, roles, accountId)
│       │   └── workschd/store_team.ts
│       ├── router/workschd/routes.ts       # Workschd sub-routes
│       └── types/workschd/                 # Task, TaskEmployee, status types
│
├── docs/
│   ├── workschd-feature-spec.md    # Feature specification
│   ├── workschd-implementation-guide.md
│   └── multi_schema_guide.md
├── .env.example
├── AGENTS.md                       # Root agent rules
├── SETUP.md
└── CLAUDE.md                       # ← this file
```

---

## 3. Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Language | TypeScript 5 |
| ORM | Prisma 5 (multi-schema) |
| Databases | MySQL 8 (main), SQLite (scraped data) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| HTTP client | axios |
| Scraping | axios + cheerio (HTML parsing) |
| Cron | node-cron |
| Logging | winston |
| Docs | Swagger (swagger-jsdoc + swagger-ui-express) |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 (Composition API + `<script setup>`) |
| UI Library | Quasar Framework 2 |
| State | Pinia |
| Build | Vite |
| HTTP | axios (via common axios-voyagerss instance) |
| Grid | AG Grid |
| Charts | Chart.js |
| Router | Vue Router 4 |

---

## 4. Development Commands

```bash
# Backend (from /backend)
npm install          # Install dependencies
npm run dev          # ts-node dev server (nodemon)
npm run build        # TypeScript compile → dist/
npm run lint         # ESLint
npm run generate     # Generate all Prisma clients (runs on postinstall)
npm run test         # Jest tests

# Frontend (from /frontend)
npm install
npm run dev          # Vite dev server (default port 8080)
npm run build        # Production build
npm run lint         # ESLint

# Prisma (from /backend)
npx prisma generate --schema=./prisma/workschd.prisma
npx prisma migrate dev --name <name> --schema=./prisma/workschd.prisma
npx prisma migrate deploy --schema=./prisma/workschd.prisma   # production
npx prisma studio --schema=./prisma/workschd.prisma
```

---

## 5. Environment Variables

Copy `.env.example` to `.env` at repo root. Key variables:

```bash
# Databases
DATABASE_URL_WORKSCHD=mysql://user:pass@localhost:3306/workschd
DATABASE_URL_INVESTAND=mysql://user:pass@localhost:3306/investand
DATABASE_URL_AVIATION=mysql://user:pass@localhost:3306/aviation
SCRAPER_DB_PATH=./data/scraper.db   # SQLite path for scraped funeral data

# Auth
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# OAuth2
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/workschd/auth/google/callback
KAKAO_REST_API_KEY=...
KAKAO_CLIENT_SECRET=...
KAKAO_REDIRECT_URI=http://localhost:3000/api/workschd/auth/kakao/callback

# Notifications
SOLAPI_API_KEY=...          # Kakao/SMS notifications
SOLAPI_API_SECRET=...
SOLAPI_SENDER_PHONE=...
SMTP_HOST=smtp.gmail.com
SMTP_USER=...
SMTP_PASS=...               # Gmail App Password

# Frontend
FRONTEND_URL=http://localhost:8080
VITE_API_URL=http://localhost:3000/api
```

---

## 6. Architecture & Conventions

### Backend Module Pattern
Each domain module follows the same layered structure:
```
Controller → Service → Prisma Client
```
- **Controllers** handle HTTP requests, call services, return JSON.
- **Services** contain all business logic and DB operations.
- **Routes** wire controllers to Express router with middleware.
- **No DTOs directory** — use TypeScript interfaces inline or in `types/`.

### API Route Convention
```
GET    /api/workschd/task              # list
GET    /api/workschd/task/:id          # detail
POST   /api/workschd/task              # create
PUT    /api/workschd/task/:id          # update
DELETE /api/workschd/task/:id          # delete
POST   /api/workschd/task/:id/request  # sub-resource action
```
Note: routes use **kebab-case** paths, not snake_case (despite AGENTS.md saying snake_case — the actual codebase uses kebab).

### Naming
| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `auth-middleware.ts`, `api-task.ts` |
| Classes | PascalCase | `TaskService`, `AuthController` |
| Components | PascalCase | `FuneralBoardView.vue`, `TaskDialog.vue` |
| Variables/functions | camelCase | `fetchTasks`, `workerCount` |
| DB tables (Prisma `@@map`) | snake_case | `task_employee`, `team_member` |

### Prisma Multi-Schema Setup
Three separate `.prisma` files, each generating its own client:
```typescript
// backend/src/config/prisma.ts
export const workschdPrisma = new WorkschdClient();   // @prisma/client-workschd
export const investandPrisma = new InvestandClient();  // @prisma/client-investand
export const aviationPrisma = new AviationClient();    // @prisma/client-aviation
```
Always import the correct client for the module you're working in.

---

## 7. Workschd Module Deep Dive

The workschd module is the most active and complex. It manages funeral home worker scheduling.

### Domain Model

```
Team (1) ──────────────────────── TeamMember (n)
  │                                    │
  │ has many                           │ Account (user)
  │                                    │ role: LEADER | MEMBER
  ▼
Shop (장례식장) ──── Task (장례식 근무) ──── TaskEmployee (신청)
                         │                    │
                         │                    │ status: PENDING | APPROVED
                         │                    │         REJECTED | CANCELLED
                         └── Notification
```

**ScrapedFuneral** (SQLite — separate from Prisma):
- Populated by the scraper module from real funeral home websites
- Can be linked to a `Task` via `task_id` after a leader creates a task from it

### Roles & Authorization
| Role | Access |
|------|--------|
| `ADMIN` | Full access to everything |
| `TEAM_LEADER` | Create/manage tasks, approve/reject worker requests, trigger scraper |
| `HELPER` | View task list, apply for work, cancel own applications |

Middleware helpers in `authMiddleware.ts`:
```typescript
authenticate          // Verifies JWT, attaches req.user
isTeamLeader          // authorize('ADMIN', 'TEAM_LEADER')
isHelper              // authorize('ADMIN', 'TEAM_LEADER', 'HELPER')
isAdmin               // authorize('ADMIN')
isTeamOwner           // Checks TeamMember.role === 'LEADER' for a specific team
isTaskOwner           // Checks Task.createdBy === req.user.accountId
```

### Task Lifecycle
```
OPEN → (workers apply) → CLOSED (when currentWorkerCount >= workerCount)
     → COMPLETED (after funeral ends)
     → CANCELLED
```

### OAuth2 Flow
```
Frontend button → GET /api/workschd/auth/google
               → Google OAuth redirect
               → GET /api/workschd/auth/google/callback
               → JWT tokens issued
               → Redirect to FRONTEND_URL/auth/callback?accessToken=...&refreshToken=...
```

### Notification System
Uses `NotificationService` → `SolapiProvider` (Kakao/SMS) + `EmailProvider` (SMTP).
Notifications are fired with `setImmediate()` to not block HTTP responses.
Notification types: `TASK_CREATED`, `JOIN_REQUEST`, `JOIN_APPROVED`, `JOIN_REJECTED`, `TASK_CLOSED`, `TASK_UPDATED`, `TASK_CANCELLED`.

---

## 8. Funeral Scraper Module

**Location**: `backend/src/modules/workschd/scraper/`

### Overview
Scrapes live 빈소 현황 (mourning room status) from 21 funeral home websites in Incheon and Bucheon. Stores results in a local SQLite database.

### Architecture
```
index.ts (orchestrator)
  └── runs each site scraper sequentially (1s delay between each)
       └── BaseScraper (abstract)
            ├── fetchHtml() — axios GET with Korean User-Agent
            ├── load() — returns cheerio CheerioAPI
            └── makeRecord() — creates ScrapedFuneral with defaults
```

### Covered Sites (21 total)

**인천 (17):**
- 인하대병원, 인천광역시의료원, 인천적십자병원, 인천시민장례식장, 인천성모장례식장
- 인천보람, 길병원, 간석장례식장, 성인천병원, 인천 쉴낙원
- 새천년장례식장, 한림병원, 송림청기와, 국제성모병원, 검단탑종합병원
- 계양청기와, 계양세종병원

**부천 (4):**
- 부천성모장례식장, 부천시민장례식장, 부천순천향대학병원, 부천세종병원

### API Endpoints
```
POST /api/workschd/scrape                              # Trigger scrape (TEAM_LEADER+)
GET  /api/workschd/scraped-funerals                    # List results (authenticated)
     ?region=INCHEON|BUCHEON&funeralHomeName=&page=&size=
GET  /api/workschd/scraper/status                      # List configured sites
POST /api/workschd/scraped-funerals/:id/link-task      # Link funeral → task
     body: { taskId: number }
```

### SQLite Schema (auto-created at startup)
```sql
CREATE TABLE scraped_funeral (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  funeral_home_name TEXT, funeral_home_url TEXT, region TEXT,
  deceased_name TEXT, room_number TEXT, chief_mourner TEXT,
  funeral_date TEXT, burial_date TEXT, burial_place TEXT, religion TEXT,
  raw_data TEXT, scraped_at TEXT, task_id INTEGER, created_at TEXT
)
```
Old records (>7 days) are purged on each scrape run. The API query filters to show only last 3 days.

### Adding a New Scraper
1. Create `backend/src/modules/workschd/scraper/sites/<name>.ts` extending `BaseScraper`
2. Implement `funeralHomeName`, `funeralHomeUrl`, `region`, `parse(html)`
3. Import and add to `ALL_SCRAPERS` array in `index.ts`

```typescript
export class MyNewScraper extends BaseScraper {
  readonly funeralHomeName = '○○장례식장';
  readonly funeralHomeUrl = 'https://example.com';
  readonly region = 'INCHEON' as const;

  // Optional — override if listing page differs from homepage
  get listingUrl(): string { return 'https://example.com/funeral/list'; }

  parse(html: string): ScrapedFuneral[] {
    const $ = this.load(html);
    const results: ScrapedFuneral[] = [];
    // ... cheerio parsing ...
    results.push(this.makeRecord({ deceasedName: '홍길동', roomNumber: '1호' }));
    return results;
  }
}
```

---

## 9. Frontend Conventions

### Vue 3 Component Pattern
All components use `<script setup lang="ts">` (Composition API).

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/common/store_user';

const props = defineProps<{ ... }>();
const emit = defineEmits<{ close: []; 'task-created': [taskId: number] }>();
</script>
```

### API Calls
Each domain has its own API module under `frontend/src/api/workschd/`.
All return `Promise<AxiosResponse<T>>`. Handle errors in the component with try/catch.

```typescript
import scraperApi from '@/api/workschd/api-scraper';
const res = await scraperApi.getScrapedFunerals({ region: 'INCHEON', page: 0 });
```

### Auth Store (`store_user.ts`)
Provides: `accountId`, `roles: string[]`, `accessToken`, `teamId`.
Check roles: `userStore.roles.includes('TEAM_LEADER')`.

### UI Style Guide (workschd module)
The workschd module follows an **Apple/Tesla minimalist** aesthetic:
- Background: `#f5f5f7` (light gray)
- Cards: `#fff` with subtle `border-radius: 16px` and `1px solid rgba(0,0,0,0.06)`
- Font: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui`
- Primary action: `background: #1d1d1f` (near-black), `color: #fff`, `border-radius: 12px`
- Secondary text: `#6e6e73`
- Region badges: blue for 인천, red for 부천
- Modals: bottom sheet style (`border-radius: 20px 20px 0 0`) with `backdrop-filter: blur(4px)`
- No heavy shadows, no gradients, minimal color use

### Route Registration
Workschd routes are in `frontend/src/router/workschd/routes.ts`.
All routes are nested under `/workschd` with lazy-loaded components.

```typescript
{ path: 'funeral-board', name: 'FuneralBoard',
  component: () => import('@/views/workschd/FuneralBoardView.vue') }
```

---

## 10. Git Commit Convention

Format: `<type>(<scope>): <subject>` (English only, imperative present tense)

```
feat(workschd): add funeral home scraper for Incheon/Bucheon
fix(backend): correct JWT expiry handling in authMiddleware
docs(root): update CLAUDE.md with scraper module documentation
refactor(frontend): extract FuneralDetailModal from TaskDialog
chore(backend): add cheerio and puppeteer-core dependencies
```

**Types**: `feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `chore`
**Scopes**: `workschd` · `aviation` · `investand` · `backend` · `frontend` · `root` · `api` · `scraper`

---

## 11. Key Files Quick Reference

| File | Purpose |
|------|---------|
| `backend/src/app.ts` | Express app setup, route mounting |
| `backend/src/config/prisma.ts` | Prisma client instances |
| `backend/src/modules/workschd/routes.ts` | All workschd API routes |
| `backend/src/modules/workschd/middleware/authMiddleware.ts` | JWT auth + RBAC |
| `backend/src/modules/workschd/services/TaskService.ts` | Core task CRUD + join request logic |
| `backend/src/modules/workschd/services/OAuth2Service.ts` | Google/Kakao OAuth2 |
| `backend/src/modules/workschd/services/NotificationService.ts` | Kakao/SMS/email notifications |
| `backend/src/modules/workschd/scraper/index.ts` | Scraper orchestrator (21 sites) |
| `backend/src/modules/workschd/scraper/db.ts` | SQLite CRUD for scraped funerals |
| `frontend/src/api/workschd/api-task.ts` | Task API (create, update, join, approve) |
| `frontend/src/api/workschd/api-scraper.ts` | Scraper API |
| `frontend/src/views/workschd/FuneralBoardView.vue` | Live funeral board UI |
| `frontend/src/views/workschd/task/dialog/FuneralDetailModal.vue` | Funeral detail + apply modal |
| `frontend/src/views/workschd/task/dialog/AdminFuneralModal.vue` | Admin worker assignment modal |
| `frontend/src/stores/common/store_user.ts` | User auth state |
| `docs/workschd-feature-spec.md` | Full feature specification |

---

## 12. Common Pitfalls

1. **Wrong Prisma client** — Always use `workschdPrisma` for the workschd module. Never use the default `PrismaClient` import.
2. **Multiple Prisma schemas** — When modifying the schema, run `prisma generate` for the specific `.prisma` file, not the generic command.
3. **Scraper EUC-KR** — Many Korean sites use EUC-KR encoding. `BaseScraper.fetchHtml()` detects and decodes it. Install `iconv-lite` if not present.
4. **SQLite is separate** — Scraped funeral data lives in SQLite (`data/scraper.db`), not MySQL. The `scraped_funeral` table is not a Prisma model.
5. **Role strings** — Roles are stored as plain strings in `AccountRole.roleType`: `'ADMIN'`, `'TEAM_LEADER'`, `'HELPER'`. No enum type.
6. **Task status** — Valid values: `'OPEN'`, `'CLOSED'`, `'COMPLETED'`, `'CANCELLED'`. The DB enforces nothing (plain string field).
7. **Frontend store imports** — Use `@/stores/common/store_user` (not `@/stores/workschd/...`) for auth state.
8. **Scraper rate limiting** — The scraper adds a 1-second delay between sites. Do not remove this — it prevents IP bans.
