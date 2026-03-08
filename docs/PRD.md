# PRD — Workschd Funeral Scraper & Board Feature

**Date**: 2026-03-08
**Session**: claude/add-claude-documentation-UwV1M
**Status**: Implemented & Merged

---

## 1. Overview

This document describes the product requirements for the funeral home scraping system and live board UI implemented in the `workschd` module of the Voyagerss platform. The feature enables funeral home operators to automatically gather live 빈소 현황 (mourning room status) from 21 funeral home websites in the Incheon and Bucheon regions, and to assign workers to those funerals through the existing task management system.

---

## 2. Problem Statement

Funeral home operators (상조 서비스 팀장) currently assign workers manually, requiring them to separately monitor multiple funeral home websites for new 빈소 openings. This is time-consuming, error-prone, and causes delays in worker assignment.

**Goals:**
- Automatically scrape live funeral data from 21 websites every time a team leader triggers a refresh
- Present the data in a single unified board
- Let team leaders convert a scraped funeral record into a task with one action
- Let workers (helpers) browse the board and apply for work directly

---

## 3. Scope

### In Scope
- Backend scraper for 21 funeral home sites (인천 17 + 부천 4)
- SQLite storage for scraped data (separate from MySQL/Prisma)
- REST API: trigger scrape, list results, link to task
- Frontend: `FuneralBoardView`, `FuneralDetailModal`, `AdminFuneralModal`
- Google + Kakao OAuth2 login page for the workschd module
- OAuth2 callback handler that stores tokens via Pinia
- `isTeamLeader` getter in the user store bridging backend/frontend role names

### Out of Scope
- Automated scheduled scraping (cron) — manual trigger only
- Push notifications when new funerals appear
- Payment or invoicing

---

## 4. Users & Roles

| Role | Backend Value | Frontend Value | Access |
|------|--------------|----------------|--------|
| Admin | `ADMIN` | `OWNER` | Full access |
| Team Leader | `TEAM_LEADER` | `MANAGER` | Trigger scrapes, create tasks, approve workers |
| Helper / Worker | `HELPER` | `WORKER` | View board, apply for work |

---

## 5. Functional Requirements

### 5.1 Scraper Engine

| ID | Requirement |
|----|------------|
| S-01 | System scrapes 21 funeral home websites on demand when a TEAM_LEADER calls `POST /api/workschd/scrape` |
| S-02 | Scrapers run sequentially with 1-second delay between each site to avoid IP bans |
| S-03 | Scraped records are stored in SQLite (`data/scraper.db`) — not MySQL |
| S-04 | Records older than 7 days are purged automatically on each scrape run |
| S-05 | API only returns records from the last 3 days |
| S-06 | Each site implements `BaseScraper` with `parse(html): ScrapedFuneral[]` |
| S-07 | Korean EUC-KR encoded pages are automatically decoded via `iconv-lite` |

**Covered Sites (21 total):**

*인천 (17):* 인하대병원, 인천광역시의료원, 인천적십자병원, 인천시민장례식장, 인천성모장례식장, 인천보람, 길병원, 간석장례식장, 성인천병원, 인천 쉴낙원, 새천년장례식장, 한림병원, 송림청기와, 국제성모병원, 검단탑종합병원, 계양청기와, 계양세종병원

*부천 (4):* 부천성모장례식장, 부천시민장례식장, 부천순천향대학병원, 부천세종병원

### 5.2 REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/workschd/scrape` | TEAM_LEADER+ | Trigger scrape of all 21 sites |
| `GET` | `/api/workschd/scraped-funerals` | Authenticated | List results (filter: region, name, page) |
| `GET` | `/api/workschd/scraper/status` | Authenticated | List configured scraper sites |
| `POST` | `/api/workschd/scraped-funerals/:id/link-task` | TEAM_LEADER+ | Link scraped funeral → Task |

### 5.3 Funeral Board UI (`FuneralBoardView.vue`)

| ID | Requirement |
|----|------------|
| U-01 | Displays scraped funerals as cards in a responsive grid |
| U-02 | Region filter chips: 전체 / 인천 (blue) / 부천 (red) |
| U-03 | Text search by funeral home name or deceased name |
| U-04 | TEAM_LEADER sees "새로고침" button to trigger a fresh scrape |
| U-05 | Scrape result toast auto-dismisses after 6 seconds |
| U-06 | Clicking a card opens `FuneralDetailModal` |
| U-07 | Pagination support |
| U-08 | Apple/Tesla minimalist aesthetic: `#f5f5f7` background, `#fff` cards, `#1d1d1f` buttons |

### 5.4 Funeral Detail Modal (`FuneralDetailModal.vue`)

| ID | Requirement |
|----|------------|
| U-09 | Bottom-sheet style (`border-radius: 20px 20px 0 0`, `slideUp` animation) |
| U-10 | Shows deceased info grid: 빈소 / 상주 / 발인일 / 장례일 / 장지 / 종교 |
| U-11 | **TEAM_LEADER view**: if no task linked → show worker count stepper + title input + "태스크 등록" button |
| U-12 | **TEAM_LEADER view**: if task linked → show linked indicator + "관리" button → opens `AdminFuneralModal` |
| U-13 | **HELPER view**: if task exists and already applied → show application status (PENDING/APPROVED/REJECTED) with cancel option |
| U-14 | **HELPER view**: if task exists and not applied → show "근무 신청하기" button |
| U-15 | **HELPER view**: if no task → show "아직 근무 태스크가 등록되지 않았습니다" notice |

### 5.5 Admin Worker Management Modal (`AdminFuneralModal.vue`)

| ID | Requirement |
|----|------------|
| U-16 | Center-positioned modal (max-width 540px, `fadeIn` animation) |
| U-17 | Shows task summary: status badge, worker count ratio, title |
| U-18 | Lists all applicants with avatar, name, email, application date |
| U-19 | Filter tabs: 전체 / 대기 / 승인 / 거절 |
| U-20 | Per-row approve / reject buttons for PENDING applications |

### 5.6 Authentication

| ID | Requirement |
|----|------------|
| A-01 | `WorkschdLogin.vue` at `/workschd/login` — Google + Kakao OAuth login buttons |
| A-02 | OAuth buttons redirect to `/api/workschd/auth/google` and `/api/workschd/auth/kakao` |
| A-03 | `AuthCallback.vue` at `/auth/callback` handles backend redirect with `?accessToken=...&refreshToken=...` |
| A-04 | Callback stores tokens via `userStore.setAccessToken()` / `userStore.setRefreshToken()` + `userStore.login()` |
| A-05 | On success, redirect to `/workschd/funeral-board`; on error, redirect to `/workschd/login` |

### 5.7 User Store

| ID | Requirement |
|----|------------|
| ST-01 | `isTeamLeader` getter added to `store_user.ts` |
| ST-02 | Checks `TEAM_LEADER` \| `ADMIN` (backend roles) and `MANAGER` \| `OWNER` (frontend roles) for compatibility |

---

## 6. Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| Performance | Scrape of all 21 sites completes within 60 seconds (1s delay × 21 + parse time) |
| Reliability | Individual scraper failure does not stop others; partial results are stored |
| Data freshness | Records older than 7 days are purged; UI shows last 3 days only |
| Rate limiting | 1-second delay between each scraper request to prevent IP bans |
| Security | Scrape trigger and task linking restricted to TEAM_LEADER / ADMIN roles via JWT middleware |
| Storage | Scraped data in SQLite (not MySQL); does not pollute the main Prisma schema |
| UI | Apple/Tesla minimalist aesthetic: `-apple-system` font, `#f5f5f7` bg, `#1d1d1f` near-black CTA |

---

## 7. Data Model

### ScrapedFuneral (SQLite)
```
id               INTEGER PRIMARY KEY AUTOINCREMENT
funeral_home_name TEXT
funeral_home_url  TEXT
region            TEXT  -- 'INCHEON' | 'BUCHEON'
deceased_name     TEXT
room_number       TEXT
chief_mourner     TEXT
funeral_date      TEXT
burial_date       TEXT
burial_place      TEXT
religion          TEXT
raw_data          TEXT
scraped_at        TEXT
task_id           INTEGER  -- nullable; set when linked to a Task
created_at        TEXT
```

### Relationship
```
ScrapedFuneral ──(task_id)──► Task (MySQL/Prisma)
                                │
                                └──► TaskEmployee (join requests from HELPERs)
```

---

## 8. File Manifest

### Backend (new files)
| File | Purpose |
|------|---------|
| `backend/src/modules/workschd/scraper/types.ts` | `ScrapedFuneral`, `ScrapeResult`, `ScrapeReport` interfaces |
| `backend/src/modules/workschd/scraper/db.ts` | SQLite CRUD wrapper |
| `backend/src/modules/workschd/scraper/index.ts` | Orchestrator — runs all 21 scrapers |
| `backend/src/modules/workschd/scraper/sites/base-scraper.ts` | Abstract base class |
| `backend/src/modules/workschd/scraper/sites/*.ts` | 21 site-specific scraper classes |
| `backend/src/modules/workschd/controllers/ScraperController.ts` | HTTP handlers |

### Backend (modified files)
| File | Change |
|------|--------|
| `backend/src/modules/workschd/routes.ts` | Added 4 scraper routes + `ScraperController` import |
| `backend/package.json` | Added `cheerio`, `puppeteer-core` |

### Frontend (new files)
| File | Purpose |
|------|---------|
| `frontend/src/api/workschd/api-scraper.ts` | Scraper API client |
| `frontend/src/views/workschd/FuneralBoardView.vue` | Live funeral board |
| `frontend/src/views/workschd/task/dialog/FuneralDetailModal.vue` | Detail + apply modal |
| `frontend/src/views/workschd/task/dialog/AdminFuneralModal.vue` | Worker management modal |
| `frontend/src/views/workschd/WorkschdLogin.vue` | Google + Kakao login page |
| `frontend/src/views/common/auth/AuthCallback.vue` | OAuth2 callback handler |

### Frontend (modified files)
| File | Change |
|------|--------|
| `frontend/src/stores/common/store_user.ts` | Added `isTeamLeader` getter |
| `frontend/src/router/workschd/routes.ts` | Added FuneralBoard, AdminDashboard, WorkschdAuthCallback routes |
| `frontend/src/router/routes.ts` | Added `/workschd/login` and `/auth/callback` top-level routes |

### Docs
| File | Purpose |
|------|---------|
| `CLAUDE.md` | Comprehensive AI assistant guide for the entire repository |

---

## 9. Routes Summary

### Backend API
```
POST /api/workschd/scrape
GET  /api/workschd/scraped-funerals?region=&funeralHomeName=&page=&size=
GET  /api/workschd/scraper/status
POST /api/workschd/scraped-funerals/:id/link-task
```

### Frontend Routes
```
/workschd/funeral-board        → FuneralBoardView.vue
/workschd/admin/dashboard      → AdminDashboard.vue
/workschd/auth/callback        → AuthCallback.vue  (nested, WorkschdAuthCallback)
/workschd/login                → WorkschdLogin.vue
/auth/callback                 → AuthCallback.vue  (top-level, for backend OAuth redirect)
```

---

## 10. Acceptance Criteria

- [ ] `POST /api/workschd/scrape` returns a `ScrapeReport` with `totalScraped`, `bySource`, and `errors`
- [ ] `GET /api/workschd/scraped-funerals` returns paginated results filterable by region
- [ ] Records older than 7 days are absent from the database after a scrape run
- [ ] HELPER cannot call `POST /api/workschd/scrape` (403)
- [ ] `FuneralBoardView` shows "새로고침" button only to TEAM_LEADER / ADMIN users
- [ ] Clicking a funeral card opens `FuneralDetailModal` with correct deceased info
- [ ] TEAM_LEADER can create a task from a funeral record; the record's `task_id` is updated
- [ ] HELPER can apply for work on a linked task; status is visible in the modal
- [ ] Google OAuth login redirects correctly through `/api/workschd/auth/google` → `/auth/callback` → `/workschd/funeral-board`
- [ ] `isTeamLeader` returns `true` for accounts with `TEAM_LEADER`, `ADMIN`, `MANAGER`, or `OWNER` roles
