# WorkSchd Gap Analysis & Improvement Plan

> **Based on**: [PRD.md](file:///f:/repository/voyagerss/docs/PRD.md) v0.1.0  
> **Analysis date**: 2026-03-08 | **Status**: Draft

---

## 1. Current Implementation Summary

### 1.1 Routes (`router/workschd/routes.ts`)

| Route | Component | Status |
|-------|-----------|--------|
| `/workschd` | Home.vue | ✅ Implemented |
| `/workschd/team/join/:token` | TeamJoin.vue | ✅ Implemented |
| `/workschd/team/manage` | TeamManage.vue | ✅ Implemented |
| `/workschd/task/manage` | TaskManage.vue | ✅ Implemented |
| `/workschd/task/manage-mobile` | TaskManageMobile.vue | ✅ Implemented |
| `/workschd/task/list-mobile` | TaskListMobile.vue | ✅ Implemented |
| `/workschd/funeral-board` | FuneralBoardView.vue | ✅ Implemented |
| `/workschd/admin/dashboard` | AdminDashboard.vue | ✅ Implemented |
| `/workschd/auth/callback` | AuthCallback.vue | ✅ Implemented |

### 1.2 Views (No Route assigned)

| File | Description | Status |
|------|-------------|--------|
| `main/Dashboard.vue` | Stats cards, quick actions, today's schedule | ❌ No route |
| `main/Profile.vue` | Profile edit, password change | ❌ No route |
| `main/Subscription.vue` | Subscription plan selection | ❌ No route |
| `main/About.vue` | About page | ❌ No route |
| `main/PrivacyPolicy.vue` | Privacy policy | ❌ No route |
| `main/Terms.vue` | Terms of service | ❌ No route |
| `WorkschdLogin.vue` | Login page | ❌ No route |

### 1.3 APIs

| API File | Coverage |
|----------|----------|
| `api-task.ts` | Task CRUD |
| `api-team.ts` | Team CRUD, member management |
| `api-team-shop.ts` | Shop management |
| `api-team-schedule.ts` | Team schedule config |
| `api-account.ts` | Account management |
| `api-account-schedule.ts` | Account schedule |
| `api-notification.ts` | ⚠️ API exists but no UI |
| `api-statistics.ts` | ⚠️ API exists but limited UI |
| `api-scraper.ts` | Funeral board scraper |

### 1.4 Stores

| Store File | Coverage |
|------------|----------|
| `store_team.ts` | Team state management |

### 1.5 Empty Directories (Planned but not implemented)

- `views/workschd/account/` — Empty
- `views/workschd/auth/` — Empty
- `views/workschd/error/` — Empty

---

## 2. PRD vs Implementation Gap Analysis

### 2.1 P0 Features (Must-Have)

| PRD Feature | Current Status | Gap Description |
|-------------|---------|-----------------|
| **상조 요청 생성** | ⚠️ Partial | `TaskManage.vue`에서 Task 생성 가능하나, PRD의 "팀장 → 대상 팀 선택 → 인원/기간/업무 입력" 전용 워크플로우 미구현 |
| **요청 승인/거절** | ⚠️ Partial | `TeamApproveDialog.vue` 존재하나, **수신 팀장 전용 승인/거절 대시보드** 미구현. 알림 기반 처리 불가 |
| **직원 배정** | ⚠️ Partial | Task에 worker가 연결되나, 승인된 요청에 대한 **직원 매핑 전용 UI** 미구현 |
| **상조 근무 캘린더** | ⚠️ Stub | `TaskManage.vue`에 캘린더 스텁(stub) 존재 (`<!-- Stub: Calendar grid -->`). 실제 캘린더 컴포넌트 미구현 |

### 2.2 P1 Features (Should-Have)

| PRD Feature | Current Status | Gap Description |
|-------------|---------|-----------------|
| **이력 관리** | ❌ Not implemented | 요청/수행 이력 조회 및 필터 UI 전무. 전용 History 페이지 필요 |
| **알림 (Notification)** | ⚠️ API only | `api-notification.ts` 존재하나 **NotificationCenter UI** 미구현 |
| **대시보드** | ⚠️ Partial | `Dashboard.vue` 존재하나 route 미등록. 샘플 데이터로만 동작. 실제 API 연동 미완료 |

### 2.3 P2 Features (Nice-to-Have)

| PRD Feature | Current Status | Gap Description |
|-------------|---------|-----------------|
| **정산 리포트** | ❌ Not implemented | 월별 상조 근무 시간 집계 페이지 전무 |
| **조직도 연동** | ❌ Not implemented | 부서/직급 구조 관리 UI 전무 |
| **API 연동** | ❌ Not implemented | HR 시스템 연동 (v2 범위) |

### 2.4 Route 미등록 페이지

| Page | Priority | Description |
|------|----------|-------------|
| `Dashboard.vue` | 🔴 P0 | 대시보드 route 필수 등록 |
| `Profile.vue` | 🟡 P1 | 사용자 프로필 관리 |
| `Subscription.vue` | 🟢 P2 | 구독 관리 |
| `About.vue` | 🟢 P2 | About 페이지 |
| `PrivacyPolicy.vue` | 🟢 P2 | 개인정보처리방침 |
| `Terms.vue` | 🟢 P2 | 이용약관 |
| `WorkschdLogin.vue` | 🔴 P0 | 로그인 페이지 |

---

## 3. Improvement Plan — Routes & Views

### 3.1 Phase 1: Route Registration (Missing Routes)

> [!IMPORTANT]
> 6개 이상의 기구현 뷰 파일이 route에 등록되지 않아 접근 불가 상태입니다.

#### [MODIFY] [routes.ts](file:///f:/repository/voyagerss/frontend/src/router/workschd/routes.ts)

Add the following routes:

```typescript
// Dashboard (P0)
{
    path: 'dashboard',
    name: 'WorkschdDashboard',
    component: () => import('@/views/workschd/main/Dashboard.vue'),
    meta: { icon: 'dashboard', title: 'Dashboard' }
},
// Profile (P1)
{
    path: 'profile',
    name: 'WorkschdProfile',
    component: () => import('@/views/workschd/main/Profile.vue'),
    meta: { icon: 'person', title: 'Profile' }
},
// Login (P0) — outside children, separate route
{
    path: 'login',
    name: 'WorkschdLogin',
    component: () => import('@/views/workschd/WorkschdLogin.vue'),
    meta: { hidden: true }
},
// Subscription (P2)
{
    path: 'subscription',
    name: 'WorkschdSubscription',
    component: () => import('@/views/workschd/main/Subscription.vue'),
    meta: { icon: 'card_membership', title: 'Subscription' }
},
// About (P2)
{
    path: 'about',
    name: 'WorkschdAbout',
    component: () => import('@/views/workschd/main/About.vue'),
    meta: { icon: 'info', title: 'About', hidden: true }
},
// Privacy Policy (P2)
{
    path: 'privacy',
    name: 'WorkschdPrivacy',
    component: () => import('@/views/workschd/main/PrivacyPolicy.vue'),
    meta: { hidden: true }
},
// Terms (P2)
{
    path: 'terms',
    name: 'WorkschdTerms',
    component: () => import('@/views/workschd/main/Terms.vue'),
    meta: { hidden: true }
},
```

---

### 3.2 Phase 2: P0 Feature Improvements

#### 3.2.1 Work Request Workflow (상조 요청 생성/승인/거절)

> [!IMPORTANT]
> PRD 핵심 User Flow인 "요청 생성 → 대상 팀 선택 → 승인/거절 → 직원 배정"이 전용 UI로 구현되지 않았습니다.

| Action | File | Description |
|--------|------|-------------|
| [NEW] | `views/workschd/request/WorkRequestCreate.vue` | 상조 요청 생성 폼 (대상 팀, 인원수, 기간, 업무내용, 우선순위) |
| [NEW] | `views/workschd/request/WorkRequestList.vue` | 수신/발신 요청 목록 (상태 필터: PENDING/APPROVED/REJECTED/COMPLETED) |
| [NEW] | `views/workschd/request/WorkRequestDetail.vue` | 요청 상세 + 승인/거절/배정 액션 |
| [NEW] | `views/workschd/request/dialog/WorkRequestDialog.vue` | 요청 생성/수정 다이얼로그 |
| [NEW] | `views/workschd/request/dialog/AssignWorkerDialog.vue` | 승인된 요청에 직원 배정 다이얼로그 |
| [NEW] | `api/workschd/api-work-request.ts` | Work Request API (CRUD + approve/reject/assign) |
| [NEW] | `stores/workschd/store_work_request.ts` | Work Request 상태 관리 |

**Required routes:**

```typescript
// Work Request (P0)
{
    path: 'request/create',
    name: 'WorkRequestCreate',
    component: () => import('@/views/workschd/request/WorkRequestCreate.vue'),
    meta: { icon: 'add_circle', title: 'New Request', roles: ['MANAGER'] }
},
{
    path: 'request/list',
    name: 'WorkRequestList',
    component: () => import('@/views/workschd/request/WorkRequestList.vue'),
    meta: { icon: 'list_alt', title: 'Request Management' }
},
{
    path: 'request/:id',
    name: 'WorkRequestDetail',
    component: () => import('@/views/workschd/request/WorkRequestDetail.vue'),
    meta: { icon: 'description', hidden: true }
},
```

#### 3.2.2 Calendar (상조 근무 캘린더)

> [!WARNING]
> 현재 `TaskManage.vue`의 캘린더는 stub이며 실제 달력 컴포넌트가 아닙니다.

| Action | File | Description |
|--------|------|-------------|
| [NEW] | `views/workschd/calendar/CalendarView.vue` | FullCalendar 기반 주간/월간 캘린더 뷰 |
| [NEW] | `components/workschd/WorkCalendar.vue` | 재사용 가능한 캘린더 컴포넌트 |

**Required routes:**

```typescript
{
    path: 'calendar',
    name: 'WorkschdCalendar',
    component: () => import('@/views/workschd/calendar/CalendarView.vue'),
    meta: { icon: 'calendar_month', title: 'Calendar' }
},
```

---

### 3.3 Phase 3: P1 Feature Implementation

#### 3.3.1 History Management (이력 관리)

| Action | File | Description |
|--------|------|-------------|
| [NEW] | `views/workschd/history/WorkHistory.vue` | 요청/수행 이력 목록 (날짜 필터, 상태 필터, 팀 필터) |
| [NEW] | `api/workschd/api-history.ts` | 이력 기록 조회 API |

**Required route:**

```typescript
{
    path: 'history',
    name: 'WorkHistory',
    component: () => import('@/views/workschd/history/WorkHistory.vue'),
    meta: { icon: 'history', title: 'Work History', roles: ['MANAGER', 'ADMIN'] }
},
```

#### 3.3.2 Notification Center (알림)

| Action | File | Description |
|--------|------|-------------|
| [NEW] | `views/workschd/notification/NotificationCenter.vue` | 알림 목록 (읽음/안읽음, 유형 필터) |
| [NEW] | `components/workschd/NotificationBell.vue` | 헤더 알림 벨 (미읽음 카운트 배지) |
| [MODIFY] | `api/workschd/api-notification.ts` | 알림 UI 연동에 맞게 API 보완 |

**Required route:**

```typescript
{
    path: 'notifications',
    name: 'WorkschdNotifications',
    component: () => import('@/views/workschd/notification/NotificationCenter.vue'),
    meta: { icon: 'notifications', title: 'Notifications' }
},
```

#### 3.3.3 Dashboard Enhancement (대시보드 개선)

| Action | File | Description |
|--------|------|-------------|
| [MODIFY] | `views/workschd/main/Dashboard.vue` | 실제 API 연동, 샘플 데이터 제거, ChartJS 차트 추가 |
| [MODIFY] | `api/workschd/api-statistics.ts` | 대시보드 데이터 요구사항에 맞게 보완 |

---

### 3.4 Phase 4: P2 Feature Implementation

#### 3.4.1 Settlement Report (정산 리포트)

| Action | File | Description |
|--------|------|-------------|
| [NEW] | `views/workschd/report/SettlementReport.vue` | 월별 상조 근무 시간 집계 + 엑셀 내보내기 |
| [NEW] | `api/workschd/api-report.ts` | 정산 리포트 API |

**Required route:**

```typescript
{
    path: 'report/settlement',
    name: 'SettlementReport',
    component: () => import('@/views/workschd/report/SettlementReport.vue'),
    meta: { icon: 'assessment', title: 'Settlement Report', roles: ['ADMIN'] }
},
```

#### 3.4.2 Organization Chart (조직도 연동)

| Action | File | Description |
|--------|------|-------------|
| [NEW] | `views/workschd/org/OrgChart.vue` | 부서/직급 구조 트리 뷰 |
| [NEW] | `api/workschd/api-organization.ts` | 조직도 API |

---

### 3.5 Phase 5: Infrastructure Improvements

#### 3.5.1 Auth Guard & RBAC

| Action | File | Description |
|--------|------|-------------|
| [MODIFY] | `router/workschd/routes.ts` | `meta.requiresAuth`, `meta.roles` 활성화 (현재 주석처리) |
| [NEW] | `router/guards/auth-guard.ts` | Navigation guard for role-based access |

#### 3.5.2 Error Handling

| Action | File | Description |
|--------|------|-------------|
| [NEW] | `views/workschd/error/404.vue` | Not Found 페이지 |
| [NEW] | `views/workschd/error/403.vue` | Forbidden 페이지 |
| [NEW] | `views/workschd/error/500.vue` | Server Error 페이지 |

#### 3.5.3 Store Layer

| Action | File | Description |
|--------|------|-------------|
| [NEW] | `stores/workschd/store_task.ts` | Task 상태 관리 (현재 미존재) |
| [NEW] | `stores/workschd/store_notification.ts` | 알림 상태 관리 |

---

## 4. Implementation Priority Matrix

```
 Priority │ Feature                    │ Effort │ Phase
──────────┼────────────────────────────┼────────┼───────
 🔴 P0    │ Route registration (6 pages)│ Small  │ 1
 🔴 P0    │ Work Request workflow       │ Large  │ 2
 🔴 P0    │ Calendar view              │ Medium │ 2
 🟡 P1    │ Dashboard API integration  │ Medium │ 3
 🟡 P1    │ History page               │ Medium │ 3
 🟡 P1    │ Notification center        │ Medium │ 3
 🟡 P1    │ Auth guard & RBAC          │ Medium │ 5
 🟢 P2    │ Settlement report          │ Medium │ 4
 🟢 P2    │ Organization chart         │ Medium │ 4
 🟢 P2    │ Error pages                │ Small  │ 5
```

---

## 5. New File Summary

| Category | New Files | Modify Files |
|----------|-----------|-------------|
| Views | 10 | 2 |
| Components | 2 | 0 |
| API | 4 | 2 |
| Stores | 3 | 0 |
| Router | 0 | 1 |
| Guards | 1 | 0 |
| **Total** | **20** | **5** |

---

*This document is a living document. Update as features are implemented.*
