# Workschd 모듈 구현 가이드

**작성일**: 2026-01-11
**버전**: 1.0
**관련 문서**: [workschd-feature-spec.md](./workschd-feature-spec.md)

---

## 목차

1. [시작하기](#1-시작하기)
2. [Phase별 구현 체크리스트](#2-phase별-구현-체크리스트)
3. [코드 예제](#3-코드-예제)
4. [테스트 시나리오](#4-테스트-시나리오)
5. [트러블슈팅](#5-트러블슈팅)

---

## 1. 시작하기

### 1.1 사전 준비

#### 필수 도구
- Node.js 18+
- MySQL 8.x
- npm 또는 yarn
- Docker (선택)

#### 외부 서비스 계정
1. **Solapi (카카오톡 알림)**
   - https://www.solapi.com 회원가입
   - API Key 발급
   - 카카오톡 채널 연동
   - 발신번호 등록

2. **Google OAuth2**
   - https://console.cloud.google.com
   - 프로젝트 생성
   - OAuth 동의 화면 구성
   - OAuth 2.0 클라이언트 ID 생성

3. **Kakao Developers**
   - https://developers.kakao.com
   - 애플리케이션 생성
   - REST API 키 발급
   - Redirect URI 설정

4. **SMTP 서버 (이메일)**
   - Gmail App Password 또는
   - SendGrid, AWS SES 등

### 1.2 환경 설정

```bash
# 1. 저장소 클론 및 이동
cd /home/user/voyagerss

# 2. 백엔드 의존성 설치
cd backend
npm install

# 3. 프론트엔드 의존성 설치
cd ../frontend
npm install

# 4. 환경 변수 설정
cd ..
cp .env.example .env
# .env 파일 편집하여 설정값 입력
```

#### 환경 변수 예제 (.env)
```bash
# 데이터베이스
DATABASE_URL_WORKSCHD=mysql://root:password@localhost:3306/workschd

# JWT
JWT_SECRET=your_super_secret_key_change_this
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this

# 이메일
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_gmail_app_password
SMTP_FROM=noreply@voyagerss.com

# Solapi
SOLAPI_API_KEY=your_solapi_api_key
SOLAPI_API_SECRET=your_solapi_api_secret
SOLAPI_SENDER_PHONE=01012345678
SOLAPI_KAKAO_PFID=your_kakao_channel_id

# Google OAuth2
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/workschd/auth/google/callback

# Kakao OAuth2
KAKAO_REST_API_KEY=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_REDIRECT_URI=http://localhost:3000/api/workschd/auth/kakao/callback

# 프론트엔드
FRONTEND_URL=http://localhost:8080
```

### 1.3 데이터베이스 초기화

```bash
cd backend

# 1. Prisma 스키마 포맷팅
npx prisma format --schema=./prisma/workschd.prisma

# 2. 마이그레이션 생성
npx prisma migrate dev --name init_workschd --schema=./prisma/workschd.prisma

# 3. Prisma 클라이언트 생성
npx prisma generate --schema=./prisma/workschd.prisma

# 4. 데이터베이스 시드 (선택)
npm run seed:workschd
```

---

## 2. Phase별 구현 체크리스트

### Phase 1: 기본 인프라 ✅

#### 1.1 Prisma 스키마 업데이트
```bash
# 파일: backend/prisma/workschd.prisma
```

**체크리스트:**
- [ ] Account 모델에 socialProvider, socialProviderId 추가
- [ ] Task 모델에 currentWorkerCount, createdBy 추가
- [ ] TeamMember 모델에 role, joinedAt 추가
- [ ] Shop 모델에 phone, capacity 추가
- [ ] TaskEmployee 모델에 appliedAt, approvedAt 추가
- [ ] Notification 모델 추가
- [ ] 마이그레이션 실행

**명령어:**
```bash
# 스키마 수정 후
npx prisma migrate dev --name add_notification_oauth --schema=./prisma/workschd.prisma
npx prisma generate --schema=./prisma/workschd.prisma
```

#### 1.2 인증 미들웨어 구현
```bash
# 파일: backend/src/modules/workschd/middleware/authMiddleware.ts
```

**체크리스트:**
- [ ] authenticate 미들웨어 구현
- [ ] authorize 미들웨어 구현
- [ ] isTeamLeader 헬퍼 함수
- [ ] isHelper 헬퍼 함수
- [ ] 에러 처리

**테스트:**
```bash
# 인증 테스트
curl -X GET http://localhost:3000/api/workschd/task \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Phase 2: 알림 시스템 🔄

#### 2.1 NotificationService 구현
```bash
# 파일: backend/src/modules/workschd/services/NotificationService.ts
```

**체크리스트:**
- [ ] sendTaskCreatedNotification 메서드
- [ ] sendJoinRequestNotification 메서드
- [ ] sendJoinApprovedNotification 메서드
- [ ] sendTaskClosedNotification 메서드
- [ ] 알림 DB 저장 로직
- [ ] 에러 핸들링

#### 2.2 SolapiProvider 구현
```bash
# 파일: backend/src/modules/workschd/services/notification/SolapiProvider.ts
```

**체크리스트:**
- [ ] sendKakaoNotification 메서드
- [ ] sendSMS 메서드 (폴백)
- [ ] HMAC 서명 생성
- [ ] 에러 처리 및 재시도 로직
- [ ] 로깅

**테스트:**
```typescript
// 테스트 코드
import { SolapiProvider } from './SolapiProvider';

const provider = new SolapiProvider();
await provider.sendKakaoNotification({
  to: '01012345678',
  templateId: 'TEST_TEMPLATE',
  variables: { name: '테스트' }
});
```

#### 2.3 EmailProvider 구현
```bash
# 파일: backend/src/modules/workschd/services/notification/EmailProvider.ts
```

**체크리스트:**
- [ ] Nodemailer transporter 설정
- [ ] sendEmail 메서드
- [ ] HTML 템플릿 지원
- [ ] 에러 처리

**테스트:**
```typescript
import { EmailProvider } from './EmailProvider';

const provider = new EmailProvider();
await provider.sendEmail({
  to: 'test@example.com',
  subject: '테스트 이메일',
  html: '<h1>테스트</h1>'
});
```

#### 2.4 알림 API 엔드포인트
```bash
# 파일: backend/src/modules/workschd/controllers/NotificationController.ts
# 파일: backend/src/modules/workschd/routes/notificationRoutes.ts
```

**체크리스트:**
- [ ] GET /api/workschd/notifications (목록)
- [ ] GET /api/workschd/notifications/:id (상세)
- [ ] PUT /api/workschd/notifications/:id/read (읽음 처리)
- [ ] DELETE /api/workschd/notifications/:id (삭제)
- [ ] 페이지네이션
- [ ] 필터링 (type, status)

**테스트:**
```bash
# 알림 목록 조회
curl -X GET "http://localhost:3000/api/workschd/notifications?page=0&size=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 읽음 처리
curl -X PUT http://localhost:3000/api/workschd/notifications/1/read \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Phase 3: 장례식 관리 확장 🔄

#### 3.1 TaskService 확장
```bash
# 파일: backend/src/modules/workschd/services/TaskService.ts
```

**체크리스트:**
- [ ] createTask 메서드에 알림 발송 추가
- [ ] approveJoinRequest 메서드에 인원 마감 체크 추가
- [ ] rejectJoinRequest 메서드 추가
- [ ] cancelJoinRequest 메서드 추가
- [ ] getTaskEmployees 메서드
- [ ] 트랜잭션 처리

**코드 예제:**
```typescript
async createTask(data: any, createdByAccountId: number): Promise<Task> {
  const task = await prisma.$transaction(async (tx) => {
    // 1. Task 생성
    const newTask = await tx.task.create({
      data: {
        title: data.title,
        description: data.description,
        workerCount: data.workerCount,
        currentWorkerCount: 0,
        startDateTime: new Date(data.startDateTime),
        endDateTime: new Date(data.endDateTime),
        status: 'OPEN',
        teamId: data.teamId,
        shopId: data.shopId,
        createdBy: createdByAccountId
      }
    });

    // 2. 알림 발송 (비동기)
    setImmediate(async () => {
      await notificationService.sendTaskCreatedNotification(newTask.id);
    });

    return newTask;
  });

  return task;
}
```

#### 3.2 TaskController 확장
```bash
# 파일: backend/src/modules/workschd/controllers/TaskController.ts
```

**체크리스트:**
- [ ] POST /api/workschd/task (권한: TEAM_LEADER)
- [ ] PUT /api/workschd/task/:id (권한: TEAM_LEADER, 본인)
- [ ] DELETE /api/workschd/task/:id (권한: TEAM_LEADER, 본인)
- [ ] GET /api/workschd/task/:id/employees (권한: TEAM_LEADER)
- [ ] 입력 유효성 검증
- [ ] 에러 처리

**라우트 예제:**
```typescript
// routes/taskRoutes.ts
import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = Router();
const taskController = new TaskController();

// 장례식 생성 (팀장만)
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'TEAM_LEADER'),
  taskController.createTask
);

// 장례식 수정 (팀장, 본인만)
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'TEAM_LEADER'),
  taskController.updateTask
);

// 장례식 삭제
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN', 'TEAM_LEADER'),
  taskController.deleteTask
);

// 참여자 목록 (팀장만)
router.get(
  '/:id/employees',
  authenticate,
  authorize('ADMIN', 'TEAM_LEADER'),
  taskController.getTaskEmployees
);

export default router;
```

#### 3.3 참여 관리 API
```bash
# 파일: backend/src/modules/workschd/controllers/TaskEmployeeController.ts
```

**체크리스트:**
- [ ] POST /api/workschd/task/:taskId/request (참여 신청)
- [ ] POST /api/workschd/task/request/:requestId/approve (승인)
- [ ] POST /api/workschd/task/request/:requestId/reject (거절)
- [ ] DELETE /api/workschd/task/request/:requestId (취소)
- [ ] 중복 신청 방지
- [ ] 인원 초과 체크

**코드 예제:**
```typescript
// TaskEmployeeController.ts
async approveJoinRequest(req: AuthRequest, res: Response) {
  try {
    const requestId = parseInt(req.params.requestId);

    await prisma.$transaction(async (tx) => {
      // 1. 참여 신청 조회
      const taskEmployee = await tx.taskEmployee.findUnique({
        where: { id: requestId },
        include: { task: true }
      });

      if (!taskEmployee) {
        throw new Error('Join request not found');
      }

      // 2. 권한 체크 (팀장인지)
      const teamMember = await tx.teamMember.findFirst({
        where: {
          teamId: taskEmployee.task.teamId,
          accountId: req.user!.accountId,
          role: 'LEADER'
        }
      });

      if (!teamMember && !req.user!.roles.includes('ADMIN')) {
        throw new Error('Not authorized');
      }

      // 3. 승인 처리
      await tx.taskEmployee.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date()
        }
      });

      // 4. 현재 인원 증가
      const updatedTask = await tx.task.update({
        where: { id: taskEmployee.taskId },
        data: {
          currentWorkerCount: { increment: 1 }
        }
      });

      // 5. 알림 발송
      await notificationService.sendJoinApprovedNotification(
        taskEmployee.accountId,
        taskEmployee.taskId
      );

      // 6. 인원 마감 체크
      if (updatedTask.currentWorkerCount >= updatedTask.workerCount) {
        await tx.task.update({
          where: { id: updatedTask.id },
          data: { status: 'CLOSED' }
        });

        await notificationService.sendTaskClosedNotification(updatedTask.id);
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Approve join request error:', error);
    res.status(500).json({ message: 'Failed to approve join request' });
  }
}
```

---

### Phase 4: OAuth2 연동 🔄

#### 4.1 OAuth2Service 구현
```bash
# 파일: backend/src/modules/workschd/services/OAuth2Service.ts
```

**체크리스트:**
- [ ] getGoogleAuthUrl 메서드
- [ ] handleGoogleCallback 메서드
- [ ] getKakaoAuthUrl 메서드
- [ ] handleKakaoCallback 메서드
- [ ] 계정 찾기/생성 로직
- [ ] JWT 토큰 생성
- [ ] 에러 처리

**의존성 설치:**
```bash
npm install axios
```

#### 4.2 AuthController OAuth2 엔드포인트
```bash
# 파일: backend/src/modules/workschd/controllers/AuthController.ts
# 파일: backend/src/modules/workschd/routes/authRoutes.ts
```

**체크리스트:**
- [ ] GET /api/workschd/auth/google (리다이렉트)
- [ ] GET /api/workschd/auth/google/callback
- [ ] GET /api/workschd/auth/kakao (리다이렉트)
- [ ] GET /api/workschd/auth/kakao/callback
- [ ] 프론트엔드로 토큰 전달 (쿼리 또는 쿠키)

**라우트 예제:**
```typescript
// routes/authRoutes.ts
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.get('/kakao', authController.kakaoAuth);
router.get('/kakao/callback', authController.kakaoCallback);
```

**컨트롤러 예제:**
```typescript
// AuthController.ts
async googleAuth(req: Request, res: Response) {
  const authUrl = oauth2Service.getGoogleAuthUrl();
  res.redirect(authUrl);
}

async googleCallback(req: Request, res: Response) {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: 'No code provided' });
    }

    const result = await oauth2Service.handleGoogleCallback(code as string);

    // 프론트엔드로 리다이렉트 (토큰 포함)
    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?` +
      `accessToken=${result.accessToken}&` +
      `refreshToken=${result.refreshToken}`
    );
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
}
```

---

### Phase 5: 프론트엔드 통합 🔄

#### 5.1 알림 컴포넌트
```bash
# 디렉토리: frontend/src/components/workschd/notification/
```

**체크리스트:**
- [ ] NotificationList.vue (알림 목록)
- [ ] NotificationItem.vue (알림 아이템)
- [ ] NotificationBadge.vue (알림 뱃지)
- [ ] 실시간 업데이트 (폴링 또는 WebSocket)
- [ ] 읽음/삭제 기능

**API 연동:**
```typescript
// frontend/src/api/workschd/api-notification.ts
import service from '@/api/common/axios-voyagerss';

export const notificationApi = {
  // 알림 목록 조회
  getNotifications: (params: {
    page: number;
    size: number;
    type?: string;
    status?: string;
  }) => {
    return service.get('/workschd/notifications', { params });
  },

  // 읽음 처리
  markAsRead: (id: number) => {
    return service.put(`/workschd/notifications/${id}/read`);
  },

  // 삭제
  deleteNotification: (id: number) => {
    return service.delete(`/workschd/notifications/${id}`);
  }
};
```

#### 5.2 장례식 관리 UI
```bash
# 디렉토리: frontend/src/views/workschd/task/
```

**체크리스트:**
- [ ] TaskList.vue (목록, 필터링)
- [ ] TaskDetail.vue (상세, 참여자 목록)
- [ ] TaskCreateForm.vue (등록, 팀장 전용)
- [ ] TaskEditForm.vue (수정)
- [ ] JoinButton.vue (참여 신청 버튼)
- [ ] Quasar 컴포넌트 활용 (QTable, QCard, QDialog)

**컴포넌트 예제:**
```vue
<!-- TaskList.vue -->
<template>
  <q-page padding>
    <q-table
      title="장례식 목록"
      :rows="tasks"
      :columns="columns"
      row-key="id"
      v-model:pagination="pagination"
      @request="onRequest"
    >
      <template v-slot:top-right>
        <q-btn
          v-if="isTeamLeader"
          color="primary"
          label="장례식 등록"
          @click="showCreateDialog = true"
        />
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            flat
            dense
            icon="visibility"
            @click="viewDetail(props.row.id)"
          />
          <q-btn
            v-if="canJoin(props.row)"
            flat
            dense
            color="primary"
            label="참여 신청"
            @click="requestJoin(props.row.id)"
          />
        </q-td>
      </template>
    </q-table>

    <task-create-dialog
      v-model="showCreateDialog"
      @created="onTaskCreated"
    />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { taskApi } from '@/api/workschd/api-task';

const authStore = useAuthStore();
const tasks = ref([]);
const pagination = ref({ page: 1, rowsPerPage: 10 });
const showCreateDialog = ref(false);

const isTeamLeader = computed(() => {
  return authStore.user?.roles.includes('TEAM_LEADER');
});

const canJoin = (task: any) => {
  return (
    authStore.user?.roles.includes('HELPER') &&
    task.status === 'OPEN' &&
    task.currentWorkerCount < task.workerCount
  );
};

const columns = [
  { name: 'title', label: '제목', field: 'title', align: 'left' },
  { name: 'shopName', label: '장례식장', field: 'shop.name' },
  { name: 'startDateTime', label: '시작일시', field: 'startDateTime' },
  { name: 'workerCount', label: '필요 인원', field: 'workerCount' },
  { name: 'currentWorkerCount', label: '현재 인원', field: 'currentWorkerCount' },
  { name: 'status', label: '상태', field: 'status' },
  { name: 'actions', label: '액션', field: 'actions' }
];

const onRequest = async (props: any) => {
  const { page, rowsPerPage } = props.pagination;
  const response = await taskApi.getTasks({ page: page - 1, size: rowsPerPage });
  tasks.value = response.data.content;
  pagination.value.rowsNumber = response.data.totalElements;
};

const viewDetail = (id: number) => {
  // 상세 페이지로 이동
};

const requestJoin = async (taskId: number) => {
  try {
    await taskApi.requestJoin(taskId);
    // 성공 알림
  } catch (error) {
    // 에러 처리
  }
};

onMounted(() => {
  onRequest({ pagination: pagination.value });
});
</script>
```

#### 5.3 OAuth2 로그인 버튼
```bash
# 파일: frontend/src/components/auth/OAuth2Buttons.vue
```

**체크리스트:**
- [ ] GoogleLoginButton 컴포넌트
- [ ] KakaoLoginButton 컴포넌트
- [ ] 콜백 처리 페이지
- [ ] 토큰 저장 (Pinia store)

**컴포넌트 예제:**
```vue
<!-- OAuth2Buttons.vue -->
<template>
  <div class="oauth-buttons">
    <q-btn
      outline
      color="red"
      icon="fab fa-google"
      label="Google로 로그인"
      @click="loginWithGoogle"
    />
    <q-btn
      outline
      color="yellow-9"
      icon="fab fa-kickstarter"
      label="Kakao로 로그인"
      @click="loginWithKakao"
    />
  </div>
</template>

<script setup lang="ts">
const API_BASE = import.meta.env.VITE_API_BASE_URL;

const loginWithGoogle = () => {
  window.location.href = `${API_BASE}/api/workschd/auth/google`;
};

const loginWithKakao = () => {
  window.location.href = `${API_BASE}/api/workschd/auth/kakao`;
};
</script>
```

**콜백 처리 페이지:**
```vue
<!-- AuthCallback.vue -->
<template>
  <q-page class="flex flex-center">
    <q-spinner size="50px" color="primary" />
    <div>로그인 처리 중...</div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');
  const error = params.get('error');

  if (error) {
    // 에러 처리
    router.push('/login');
    return;
  }

  if (accessToken && refreshToken) {
    // 토큰 저장
    authStore.setTokens(accessToken, refreshToken);
    await authStore.fetchUser();
    router.push('/workschd/task');
  } else {
    router.push('/login');
  }
});
</script>
```

---

### Phase 6: 테스트 및 배포 🔄

#### 6.1 단위 테스트
```bash
# 디렉토리: backend/test/unit/
```

**체크리스트:**
- [ ] TaskService 테스트
- [ ] NotificationService 테스트
- [ ] OAuth2Service 테스트
- [ ] SolapiProvider 테스트 (모킹)
- [ ] EmailProvider 테스트 (모킹)

**테스트 프레임워크:**
```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev supertest @types/supertest
```

**테스트 예제:**
```typescript
// TaskService.test.ts
import { TaskService } from '../../../src/modules/workschd/services/TaskService';
import { workschdPrisma as prisma } from '../../../src/config/prisma';

describe('TaskService', () => {
  let taskService: TaskService;

  beforeAll(() => {
    taskService = new TaskService();
  });

  afterEach(async () => {
    // 테스트 데이터 정리
    await prisma.task.deleteMany();
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const taskData = {
        title: '테스트 장례식',
        description: '설명',
        workerCount: 5,
        startDateTime: new Date(),
        endDateTime: new Date(),
        teamId: 1,
        shopId: 1
      };

      const task = await taskService.createTask(taskData, 1);

      expect(task).toBeDefined();
      expect(task.title).toBe(taskData.title);
      expect(task.currentWorkerCount).toBe(0);
      expect(task.status).toBe('OPEN');
    });
  });

  describe('approveJoinRequest', () => {
    it('should approve join request and update worker count', async () => {
      // 테스트 로직
    });

    it('should close task when worker count is full', async () => {
      // 테스트 로직
    });
  });
});
```

#### 6.2 통합 테스트
```bash
# 디렉토리: backend/test/integration/
```

**체크리스트:**
- [ ] API 엔드포인트 테스트
- [ ] 인증/인가 테스트
- [ ] 알림 전송 플로우 테스트
- [ ] OAuth2 플로우 테스트

**테스트 예제:**
```typescript
// task.integration.test.ts
import request from 'supertest';
import app from '../../../src/app';

describe('Task API', () => {
  let authToken: string;

  beforeAll(async () => {
    // 로그인하여 토큰 획득
    const response = await request(app)
      .post('/api/workschd/auth/login')
      .send({
        email: 'teamleader@test.com',
        password: 'password'
      });

    authToken = response.body.accessToken;
  });

  describe('POST /api/workschd/task', () => {
    it('should create task as team leader', async () => {
      const response = await request(app)
        .post('/api/workschd/task')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '테스트 장례식',
          description: '설명',
          workerCount: 5,
          startDateTime: new Date().toISOString(),
          endDateTime: new Date().toISOString(),
          teamId: 1,
          shopId: 1
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should reject task creation without auth', async () => {
      const response = await request(app)
        .post('/api/workschd/task')
        .send({});

      expect(response.status).toBe(401);
    });
  });
});
```

#### 6.3 E2E 테스트
```bash
# 디렉토리: frontend/test/e2e/
```

**체크리스트:**
- [ ] 장례식 등록 플로우
- [ ] 참여 신청 플로우
- [ ] 알림 수신 확인
- [ ] OAuth2 로그인 플로우

**도구:**
```bash
npm install --save-dev cypress
```

#### 6.4 배포
```bash
# Docker 빌드
docker-compose build

# 프로덕션 실행
docker-compose up -d
```

**체크리스트:**
- [ ] 환경 변수 설정 (프로덕션)
- [ ] 데이터베이스 마이그레이션
- [ ] HTTPS 설정
- [ ] 로그 모니터링 설정
- [ ] Solapi 프로덕션 설정
- [ ] OAuth2 Redirect URI 업데이트

---

## 3. 코드 예제

### 3.1 완전한 TaskService 예제

```typescript
// backend/src/modules/workschd/services/TaskService.ts
import { Task, TaskEmployee } from '@prisma/client-workschd';
import { workschdPrisma as prisma } from '../../../config/prisma';
import { NotificationService } from './NotificationService';

export class TaskService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async createTask(data: any, createdByAccountId: number): Promise<Task> {
    const task = await prisma.$transaction(async (tx) => {
      const newTask = await tx.task.create({
        data: {
          title: data.title,
          description: data.description,
          workerCount: data.workerCount,
          currentWorkerCount: 0,
          startDateTime: new Date(data.startDateTime),
          endDateTime: new Date(data.endDateTime),
          status: 'OPEN',
          teamId: data.teamId,
          shopId: data.shopId,
          createdBy: createdByAccountId
        }
      });

      return newTask;
    });

    // 비동기 알림 발송
    setImmediate(async () => {
      await this.notificationService.sendTaskCreatedNotification(task.id);
    });

    return task;
  }

  async getTaskById(id: number): Promise<Task | null> {
    return await prisma.task.findUnique({
      where: { id },
      include: {
        shop: true,
        team: true,
        taskEmployees: {
          include: {
            account: {
              select: {
                accountId: true,
                username: true,
                email: true,
                phone: true
              }
            }
          }
        }
      }
    });
  }

  async getAllTasks(params: {
    page: number;
    size: number;
    region?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ content: Task[]; totalElements: number; totalPages: number }> {
    const where: any = {};

    if (params.region) {
      where.team = { region: params.region };
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.startDate || params.endDate) {
      where.startDateTime = {};
      if (params.startDate) {
        where.startDateTime.gte = params.startDate;
      }
      if (params.endDate) {
        where.startDateTime.lte = params.endDate;
      }
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          shop: true,
          team: true
        },
        skip: params.page * params.size,
        take: params.size,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.task.count({ where })
    ]);

    return {
      content: tasks,
      totalElements: total,
      totalPages: Math.ceil(total / params.size)
    };
  }

  async updateTask(id: number, data: any): Promise<void> {
    await prisma.task.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        workerCount: data.workerCount,
        startDateTime: data.startDateTime ? new Date(data.startDateTime) : undefined,
        endDateTime: data.endDateTime ? new Date(data.endDateTime) : undefined,
        shopId: data.shopId
      }
    });
  }

  async deleteTask(id: number): Promise<void> {
    await prisma.task.delete({
      where: { id }
    });
  }

  async createJoinRequest(taskId: number, accountId: number): Promise<TaskEmployee> {
    const existing = await prisma.taskEmployee.findFirst({
      where: { taskId, accountId }
    });

    if (existing) {
      throw new Error('이미 참여 신청했습니다');
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw new Error('장례식을 찾을 수 없습니다');
    }

    if (task.status !== 'OPEN') {
      throw new Error('마감된 장례식입니다');
    }

    if (task.currentWorkerCount >= task.workerCount) {
      throw new Error('인원이 마감되었습니다');
    }

    const taskEmployee = await prisma.taskEmployee.create({
      data: {
        taskId,
        accountId,
        status: 'PENDING',
        appliedAt: new Date()
      }
    });

    // 팀장에게 알림
    await this.notificationService.sendJoinRequestNotification(taskId, accountId);

    return taskEmployee;
  }

  async approveJoinRequest(requestId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const taskEmployee = await tx.taskEmployee.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date()
        }
      });

      const task = await tx.task.update({
        where: { id: taskEmployee.taskId },
        data: {
          currentWorkerCount: { increment: 1 }
        }
      });

      // 승인 알림
      await this.notificationService.sendJoinApprovedNotification(
        taskEmployee.accountId,
        task.id
      );

      // 인원 마감 체크
      if (task.currentWorkerCount >= task.workerCount) {
        await tx.task.update({
          where: { id: task.id },
          data: { status: 'CLOSED' }
        });

        await this.notificationService.sendTaskClosedNotification(task.id);
      }
    });
  }

  async rejectJoinRequest(requestId: number): Promise<void> {
    const taskEmployee = await prisma.taskEmployee.update({
      where: { id: requestId },
      data: { status: 'REJECTED' }
    });

    // 거절 알림
    await this.notificationService.sendJoinRejectedNotification(
      taskEmployee.accountId,
      taskEmployee.taskId
    );
  }

  async cancelJoinRequest(requestId: number, accountId: number): Promise<void> {
    const taskEmployee = await prisma.taskEmployee.findUnique({
      where: { id: requestId }
    });

    if (!taskEmployee) {
      throw new Error('참여 신청을 찾을 수 없습니다');
    }

    if (taskEmployee.accountId !== accountId) {
      throw new Error('권한이 없습니다');
    }

    if (taskEmployee.status !== 'PENDING') {
      throw new Error('대기 중인 신청만 취소할 수 있습니다');
    }

    await prisma.taskEmployee.delete({
      where: { id: requestId }
    });
  }

  async getTaskEmployees(taskId: number): Promise<TaskEmployee[]> {
    return await prisma.taskEmployee.findMany({
      where: { taskId },
      include: {
        account: {
          select: {
            accountId: true,
            username: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { appliedAt: 'asc' }
    });
  }
}
```

---

## 4. 테스트 시나리오

### 시나리오 1: 장례식 등록 및 알림 발송

1. **팀장 로그인**
   ```bash
   POST /api/workschd/auth/login
   Body: { email: "teamleader@example.com", password: "password" }
   ```

2. **장례식 등록**
   ```bash
   POST /api/workschd/task
   Headers: { Authorization: "Bearer TOKEN" }
   Body: {
     "title": "서울 장례식장 근무",
     "description": "장례식 진행 도움",
     "workerCount": 3,
     "startDateTime": "2026-01-15T09:00:00Z",
     "endDateTime": "2026-01-15T18:00:00Z",
     "teamId": 1,
     "shopId": 1
   }
   ```

3. **알림 확인** (상조도우미)
   ```bash
   GET /api/workschd/notifications
   Headers: { Authorization: "Bearer HELPER_TOKEN" }
   ```

4. **결과 검증**
   - 장례식 생성됨 (status: OPEN)
   - 지역 팀 도우미들에게 알림 발송됨
   - 카카오톡 + 이메일 전송 확인

---

### 시나리오 2: 참여 신청 및 승인

1. **도우미 로그인**
   ```bash
   POST /api/workschd/auth/login
   Body: { email: "helper@example.com", password: "password" }
   ```

2. **참여 신청**
   ```bash
   POST /api/workschd/task/1/request
   Headers: { Authorization: "Bearer HELPER_TOKEN" }
   ```

3. **팀장이 승인**
   ```bash
   POST /api/workschd/task/request/1/approve
   Headers: { Authorization: "Bearer LEADER_TOKEN" }
   ```

4. **결과 검증**
   - TaskEmployee.status = APPROVED
   - Task.currentWorkerCount 증가
   - 도우미에게 승인 알림 발송

---

### 시나리오 3: 인원 마감 처리

1. **3명 참여 신청 및 승인** (workerCount = 3)
2. **3번째 승인 시 자동 마감**
   - Task.status = CLOSED
   - 팀 전체에 마감 알림 발송
3. **추가 참여 신청 시도**
   - 에러: "인원이 마감되었습니다"

---

## 5. 트러블슈팅

### 5.1 Solapi 알림 전송 실패

**증상:**
- 카카오톡 알림이 전송되지 않음
- 에러: "Authentication failed"

**해결:**
1. API Key/Secret 확인
2. HMAC 서명 알고리즘 검증
3. 발신번호 등록 확인
4. 카카오톡 채널 연동 상태 확인
5. Solapi 콘솔에서 전송 로그 확인

**디버깅:**
```typescript
console.log('Solapi Request:', {
  to: params.to,
  from: this.senderPhone,
  templateId: params.templateId
});
```

---

### 5.2 OAuth2 콜백 에러

**증상:**
- OAuth2 로그인 후 에러 발생
- 리다이렉트 URL 불일치

**해결:**
1. Google/Kakao 콘솔에서 Redirect URI 확인
2. 환경 변수 GOOGLE_REDIRECT_URI 확인
3. HTTPS vs HTTP 확인 (프로덕션은 HTTPS 필수)
4. 쿼리 파라미터 누락 확인

**디버깅:**
```typescript
console.log('Redirect URI:', process.env.GOOGLE_REDIRECT_URI);
console.log('Received code:', code);
```

---

### 5.3 Prisma 마이그레이션 충돌

**증상:**
- 마이그레이션 실행 시 에러
- "Unique constraint failed"

**해결:**
```bash
# 1. 마이그레이션 리셋 (개발 환경만!)
npx prisma migrate reset --schema=./prisma/workschd.prisma

# 2. 마이그레이션 재생성
npx prisma migrate dev --name fix_schema --schema=./prisma/workschd.prisma

# 3. 프로덕션 배포 (리셋 없이)
npx prisma migrate deploy --schema=./prisma/workschd.prisma
```

---

### 5.4 인원 마감 동시성 문제

**증상:**
- 인원 초과 승인됨 (race condition)

**해결:**
- Prisma 트랜잭션 사용
- optimistic locking 적용

```typescript
await prisma.$transaction(async (tx) => {
  const task = await tx.task.findUnique({
    where: { id: taskId }
  });

  if (task.currentWorkerCount >= task.workerCount) {
    throw new Error('인원 초과');
  }

  // 승인 로직...
});
```

---

## 다음 단계

1. **Phase 1 완료 후**: Prisma 스키마 업데이트 및 마이그레이션
2. **Phase 2 완료 후**: 알림 시스템 테스트
3. **Phase 3 완료 후**: 장례식 관리 E2E 테스트
4. **Phase 4 완료 후**: OAuth2 플로우 검증
5. **Phase 5 완료 후**: 프론트엔드 통합 테스트
6. **Phase 6 완료 후**: 프로덕션 배포

---

**문서 끝**
