# Workschd 모듈 기능 개발 명세서

**작성일**: 2026-01-11
**버전**: 1.0
**프로젝트**: Voyagerss - Workschd Module

---

## 목차

1. [개요](#1-개요)
2. [기존 시스템 분석](#2-기존-시스템-분석)
3. [요구사항 정의](#3-요구사항-정의)
4. [엔티티 설계](#4-엔티티-설계)
5. [역할 및 권한 설계](#5-역할-및-권한-설계)
6. [핵심 기능 명세](#6-핵심-기능-명세)
7. [알림 시스템 설계](#7-알림-시스템-설계)
8. [OAuth2 인증 연동](#8-oauth2-인증-연동)
9. [API 엔드포인트 명세](#9-api-엔드포인트-명세)
10. [데이터베이스 스키마 변경](#10-데이터베이스-스키마-변경)
11. [개발 일정 및 우선순위](#11-개발-일정-및-우선순위)
12. [기술 스택](#12-기술-스택)

---

## 1. 개요

### 1.1 목적
상조 서비스 관리 시스템 구축을 위한 Workschd 모듈 기능 확장. 팀장이 장례식을 등록하면 지역별 상조도우미들에게 알림을 발송하고, 도우미들이 참여 신청을 할 수 있는 시스템 구현.

### 1.2 핵심 기능
- 장례식 등록 및 관리
- 지역별 팀 기반 알림 발송
- 상조도우미 참여 신청 및 승인
- 인원 마감 자동 안내
- 카카오톡/이메일 알림 연동
- OAuth2 소셜 로그인 (Google, Kakao)

### 1.3 사용자 역할
- **팀장 (TEAM_LEADER)**: 장례식 등록, 참여 신청 승인, 인원 관리
- **상조도우미 (HELPER)**: 장례식 조회, 참여 신청, 일정 확인

---

## 2. 기존 시스템 분석

### 2.1 기술 스택
#### 백엔드
- **프레임워크**: Express.js (Node.js) + TypeScript
- **ORM**: Prisma
- **데이터베이스**: MySQL
- **인증**: JWT (bcrypt)
- **API 문서**: Swagger/JSDoc

#### 프론트엔드
- **프레임워크**: Vue 3 + Quasar 2
- **상태 관리**: Pinia
- **HTTP 클라이언트**: Axios
- **빌드 도구**: Vite

### 2.2 기존 엔티티

```
Account (계정)
├── accountId, username, email, phone, password
├── status, accessToken, refreshToken
└── Relations: AccountRole[], AccountInfo, TeamMember[], TaskEmployee[]

AccountRole (역할)
├── accountId, roleType
└── 기존: ADMIN, USER 등

Team (팀)
├── id, name, region, scheduleType
├── invitationHash, location
└── Relations: TeamMember[], Shop[], Task[]

Shop (매장/장례식장)
├── id, teamId, name, district, address
└── status (ACTIVE/INACTIVE)

Task (작업/장례식)
├── id, title, description
├── workerCount, startDateTime, endDateTime
├── status, teamId, shopId
└── Relations: TaskEmployee[]

TaskEmployee (작업 참여자)
├── taskId, accountId
└── status (PENDING, APPROVED, INACTIVE, ACTIVE)
```

### 2.3 기존 기능
- ✅ 계정 관리 (회원가입, 로그인)
- ✅ JWT 인증
- ✅ 팀 관리
- ✅ 작업(Task) 생성/수정/삭제
- ✅ 참여 신청 (TaskEmployee)
- ✅ 참여 승인

### 2.4 부족한 기능
- ❌ 알림 시스템 (카카오톡, 이메일)
- ❌ OAuth2 소셜 로그인
- ❌ 역할 기반 권한 제어 (TEAM_LEADER, HELPER)
- ❌ 인원 마감 자동 알림
- ❌ 실시간 알림 전송 로직

---

## 3. 요구사항 정의

### 3.1 기능 요구사항

#### FR-1: 역할 관리
- FR-1.1: 팀장(TEAM_LEADER) 역할 추가
- FR-1.2: 상조도우미(HELPER) 역할 추가
- FR-1.3: 역할별 권한 제어 (미들웨어)

#### FR-2: 장례식 관리
- FR-2.1: 팀장이 장례식 등록 (장례식장, 일정, 필요 인원)
- FR-2.2: 장례식 상세 정보 조회
- FR-2.3: 장례식 수정/삭제 (팀장만)
- FR-2.4: 장례식 목록 조회 (필터: 지역, 상태, 날짜)

#### FR-3: 알림 시스템
- FR-3.1: 장례식 등록 시 지역별 팀 도우미들에게 알림 발송
  - 카카오톡 알림 (Solapi)
  - 이메일 알림
- FR-3.2: 참여 신청 시 팀장에게 알림
- FR-3.3: 참여 승인 시 도우미에게 알림
- FR-3.4: 인원 마감 시 팀 전체에 공유 안내 알림

#### FR-4: 참여 관리
- FR-4.1: 상조도우미가 장례식 참여 신청
- FR-4.2: 팀장이 참여 신청 승인/거절
- FR-4.3: 인원 수 자동 체크 및 마감 처리
- FR-4.4: 참여자 목록 조회

#### FR-5: OAuth2 인증
- FR-5.1: Google 로그인 연동
- FR-5.2: Kakao 로그인 연동
- FR-5.3: 소셜 계정 연결/해제

### 3.2 비기능 요구사항

#### NFR-1: 성능
- 알림 전송은 비동기 처리 (Queue 시스템 고려)
- API 응답 시간 < 500ms

#### NFR-2: 보안
- JWT 토큰 기반 인증 유지
- OAuth2 표준 준수
- 역할 기반 접근 제어 (RBAC)

#### NFR-3: 확장성
- 알림 채널 추가 용이 (SMS, Push 등)
- 다중 지역 팀 지원

---

## 4. 엔티티 설계

### 4.1 엔티티 관계도 (ERD)

```
Account (계정)
├── accountId (PK)
├── username, email, phone, password
├── status, accessToken, refreshToken
├── socialProvider (NEW: GOOGLE, KAKAO, null)
├── socialProviderId (NEW)
└── Relations: AccountRole[], TeamMember[], TaskEmployee[], Notification[]

AccountRole (역할) - 확장
├── id (PK)
├── accountId (FK)
└── roleType (ADMIN, USER, TEAM_LEADER, HELPER) ← NEW

Team (지역별 팀)
├── id (PK)
├── name, region
├── scheduleType, location
└── Relations: TeamMember[], Shop[], Task[]

TeamMember (팀 멤버)
├── id (PK)
├── teamId (FK)
├── accountId (FK)
├── role (LEADER, MEMBER) ← NEW
└── Relations: Team, Account

Shop (장례식장)
├── id (PK)
├── teamId (FK)
├── name, district, address
├── status (ACTIVE, INACTIVE)
├── phone, capacity (NEW)
└── Relations: Team, Task[]

Task (장례식) - 확장
├── id (PK)
├── title, description
├── workerCount (필요 인원)
├── currentWorkerCount (현재 신청 인원) ← NEW
├── startDateTime, endDateTime
├── status (OPEN, CLOSED, COMPLETED, CANCELLED)
├── teamId (FK), shopId (FK)
├── createdBy (accountId) ← NEW
└── Relations: Team, Shop, TaskEmployee[], Notification[]

TaskEmployee (참여자)
├── id (PK)
├── taskId (FK)
├── accountId (FK)
├── status (PENDING, APPROVED, REJECTED, CANCELLED)
├── appliedAt, approvedAt ← NEW
└── Relations: Task, Account

Notification (알림) - NEW
├── id (PK)
├── accountId (FK) - 수신자
├── taskId (FK) - 관련 장례식
├── type (TASK_CREATED, JOIN_REQUEST, JOIN_APPROVED, TASK_CLOSED)
├── channel (EMAIL, KAKAO, SMS)
├── status (PENDING, SENT, FAILED)
├── message, sentAt
└── Relations: Account, Task

NotificationTemplate (알림 템플릿) - NEW
├── id (PK)
├── type (TASK_CREATED, JOIN_REQUEST, etc.)
├── channel (EMAIL, KAKAO)
├── subject, body (템플릿 내용)
└── variables (JSON)
```

### 4.2 엔티티 상세 설명

#### 4.2.1 Account (계정) - 확장
```typescript
// 기존 필드 유지 + 소셜 로그인 필드 추가
interface Account {
  accountId: number;
  username: string;
  email?: string;
  phone?: string;
  password: string; // 소셜 로그인 시 null 가능
  status: string;
  accessToken?: string;
  refreshToken?: string;
  profileImageUrl?: string;
  profileVideoUrl?: string;

  // NEW: 소셜 로그인
  socialProvider?: 'GOOGLE' | 'KAKAO' | null;
  socialProviderId?: string;

  // Relations
  accountRoles: AccountRole[];
  teamMembers: TeamMember[];
  taskEmployees: TaskEmployee[];
  notifications: Notification[];
}
```

#### 4.2.2 AccountRole (역할) - 확장
```typescript
enum RoleType {
  ADMIN = 'ADMIN',
  USER = 'USER',
  TEAM_LEADER = 'TEAM_LEADER', // NEW: 팀장
  HELPER = 'HELPER'             // NEW: 상조도우미
}
```

#### 4.2.3 TeamMember (팀 멤버) - 확장
```typescript
interface TeamMember {
  id: number;
  teamId: number;
  accountId: number;
  role: 'LEADER' | 'MEMBER'; // NEW: 팀 내 역할
  joinedAt?: Date;
}
```

#### 4.2.4 Task (장례식) - 확장
```typescript
interface Task {
  id: number;
  title: string;
  description?: string;
  workerCount: number;          // 필요 인원
  currentWorkerCount: number;   // NEW: 현재 승인된 인원
  startDateTime: Date;
  endDateTime: Date;
  status: 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
  teamId: number;
  shopId: number;
  createdBy: number;            // NEW: 작성자 (팀장)

  // Relations
  team: Team;
  shop: Shop;
  taskEmployees: TaskEmployee[];
  notifications: Notification[];
}
```

#### 4.2.5 Notification (알림) - NEW
```typescript
interface Notification {
  id: number;
  accountId: number;            // 수신자
  taskId?: number;              // 관련 장례식
  type: NotificationType;
  channel: NotificationChannel;
  status: 'PENDING' | 'SENT' | 'FAILED';
  message: string;
  metadata?: JSON;              // 추가 데이터
  sentAt?: Date;
  createdAt: Date;
}

enum NotificationType {
  TASK_CREATED = 'TASK_CREATED',           // 장례식 등록
  JOIN_REQUEST = 'JOIN_REQUEST',           // 참여 신청
  JOIN_APPROVED = 'JOIN_APPROVED',         // 참여 승인
  JOIN_REJECTED = 'JOIN_REJECTED',         // 참여 거절
  TASK_CLOSED = 'TASK_CLOSED',            // 인원 마감
  TASK_UPDATED = 'TASK_UPDATED',          // 장례식 정보 변경
  TASK_CANCELLED = 'TASK_CANCELLED'       // 장례식 취소
}

enum NotificationChannel {
  EMAIL = 'EMAIL',
  KAKAO = 'KAKAO',
  SMS = 'SMS'
}
```

---

## 5. 역할 및 권한 설계

### 5.1 역할 정의

| 역할 | RoleType | 설명 | 권한 |
|------|----------|------|------|
| 관리자 | ADMIN | 시스템 관리자 | 모든 권한 |
| 일반 사용자 | USER | 기본 사용자 | 조회 권한 |
| 팀장 | TEAM_LEADER | 팀 리더 | 장례식 등록/수정/삭제, 참여 승인/거절 |
| 상조도우미 | HELPER | 상조 서비스 도우미 | 장례식 조회, 참여 신청 |

### 5.2 권한 매트릭스

| 기능 | ADMIN | TEAM_LEADER | HELPER | USER |
|------|-------|-------------|--------|------|
| 장례식 조회 | ✅ | ✅ | ✅ | ✅ |
| 장례식 등록 | ✅ | ✅ | ❌ | ❌ |
| 장례식 수정 | ✅ | ✅ (본인) | ❌ | ❌ |
| 장례식 삭제 | ✅ | ✅ (본인) | ❌ | ❌ |
| 참여 신청 | ✅ | ❌ | ✅ | ❌ |
| 참여 승인/거절 | ✅ | ✅ (본인 팀) | ❌ | ❌ |
| 팀 관리 | ✅ | ✅ (본인 팀) | ❌ | ❌ |
| 알림 설정 | ✅ | ✅ | ✅ | ✅ |

### 5.3 권한 체크 미들웨어

```typescript
// backend/src/modules/workschd/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { workschdPrisma as prisma } from '../../../config/prisma';

export interface AuthRequest extends Request {
  user?: {
    accountId: number;
    email: string;
    roles: string[];
  };
}

// JWT 인증 미들웨어
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // 사용자 및 역할 조회
    const account = await prisma.account.findUnique({
      where: { accountId: decoded.accountId },
      include: { accountRoles: true }
    });

    if (!account) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = {
      accountId: account.accountId,
      email: account.email!,
      roles: account.accountRoles.map(r => r.roleType)
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// 역할 확인 미들웨어
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const hasRole = req.user.roles.some(role => roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
};

// 팀장 권한 확인
export const isTeamLeader = authorize('ADMIN', 'TEAM_LEADER');

// 도우미 권한 확인
export const isHelper = authorize('ADMIN', 'TEAM_LEADER', 'HELPER');
```

---

## 6. 핵심 기능 명세

### 6.1 장례식 등록 플로우

```
[팀장] 장례식 등록
   ↓
1. 입력: 장례식장, 제목, 설명, 일정, 필요 인원
   ↓
2. Task 생성 (status: OPEN)
   ↓
3. 지역별 팀 도우미 조회
   ↓
4. 알림 생성 (Notification)
   ├── 카카오톡 (Solapi)
   └── 이메일
   ↓
5. 비동기 알림 전송
   ↓
[상조도우미] 알림 수신
```

### 6.2 참여 신청 플로우

```
[상조도우미] 장례식 조회
   ↓
1. 참여 가능한 장례식 목록 확인
   ↓
2. 참여 신청 (TaskEmployee 생성, status: PENDING)
   ↓
3. 팀장에게 알림 발송
   ↓
[팀장] 알림 수신
   ↓
4. 참여 신청 목록 확인
   ↓
5. 승인/거절
   ├── 승인: status → APPROVED, currentWorkerCount++
   └── 거절: status → REJECTED
   ↓
6. 도우미에게 결과 알림
   ↓
7. 인원 마감 체크
   └── if (currentWorkerCount >= workerCount)
       ├── Task.status → CLOSED
       └── 팀 전체 알림 발송
```

### 6.3 인원 마감 로직

```typescript
// backend/src/modules/workschd/services/TaskService.ts

async approveJoinRequest(requestId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. 참여 신청 승인
    const taskEmployee = await tx.taskEmployee.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date()
      },
      include: { task: true }
    });

    // 2. 현재 인원 증가
    const task = await tx.task.update({
      where: { id: taskEmployee.taskId },
      data: {
        currentWorkerCount: { increment: 1 }
      }
    });

    // 3. 승인 알림 발송
    await notificationService.sendJoinApprovedNotification(
      taskEmployee.accountId,
      task.id
    );

    // 4. 인원 마감 체크
    if (task.currentWorkerCount >= task.workerCount) {
      // 4-1. 상태 변경
      await tx.task.update({
        where: { id: task.id },
        data: { status: 'CLOSED' }
      });

      // 4-2. 팀 전체 알림
      await notificationService.sendTaskClosedNotification(task.id);
    }
  });
}
```

---

## 7. 알림 시스템 설계

### 7.1 알림 아키텍처

```
[이벤트 발생]
   ↓
NotificationService
   ↓
   ├── NotificationQueue (비동기)
   │    ↓
   │    ├── EmailProvider (Nodemailer)
   │    ├── KakaoProvider (Solapi)
   │    └── SMSProvider (Solapi) - Optional
   │
   └── Notification DB 저장
```

### 7.2 Solapi (카카오톡 알림) 연동

#### 7.2.1 설정
```bash
# .env
SOLAPI_API_KEY=your_api_key
SOLAPI_API_SECRET=your_api_secret
SOLAPI_SENDER_PHONE=발신자번호
SOLAPI_KAKAO_PFID=카카오톡채널ID
```

#### 7.2.2 구현
```typescript
// backend/src/modules/workschd/services/notification/SolapiProvider.ts
import axios from 'axios';
import crypto from 'crypto';

export class SolapiProvider {
  private apiKey: string;
  private apiSecret: string;
  private senderPhone: string;
  private kakaoPfId: string;

  constructor() {
    this.apiKey = process.env.SOLAPI_API_KEY!;
    this.apiSecret = process.env.SOLAPI_API_SECRET!;
    this.senderPhone = process.env.SOLAPI_SENDER_PHONE!;
    this.kakaoPfId = process.env.SOLAPI_KAKAO_PFID!;
  }

  // 카카오톡 알림톡 발송
  async sendKakaoNotification(params: {
    to: string;         // 수신자 전화번호
    templateId: string; // 템플릿 ID
    variables: any;     // 치환 변수
  }): Promise<boolean> {
    try {
      const url = 'https://api.solapi.com/messages/v4/send';
      const timestamp = Date.now().toString();
      const salt = crypto.randomBytes(16).toString('hex');

      // HMAC 서명 생성
      const signature = crypto
        .createHmac('sha256', this.apiSecret)
        .update(timestamp + salt)
        .digest('hex');

      const response = await axios.post(
        url,
        {
          message: {
            to: params.to,
            from: this.senderPhone,
            type: 'ATA', // 알림톡
            kakaoOptions: {
              pfId: this.kakaoPfId,
              templateId: params.templateId,
              variables: params.variables
            }
          }
        },
        {
          headers: {
            'Authorization': `HMAC-SHA256 apiKey=${this.apiKey}, date=${timestamp}, salt=${salt}, signature=${signature}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.statusCode === '2000';
    } catch (error) {
      console.error('Solapi Kakao send error:', error);
      return false;
    }
  }

  // SMS 발송 (폴백)
  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      const url = 'https://api.solapi.com/messages/v4/send';
      const timestamp = Date.now().toString();
      const salt = crypto.randomBytes(16).toString('hex');

      const signature = crypto
        .createHmac('sha256', this.apiSecret)
        .update(timestamp + salt)
        .digest('hex');

      const response = await axios.post(
        url,
        {
          message: {
            to,
            from: this.senderPhone,
            type: 'SMS',
            text: message
          }
        },
        {
          headers: {
            'Authorization': `HMAC-SHA256 apiKey=${this.apiKey}, date=${timestamp}, salt=${salt}, signature=${signature}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.statusCode === '2000';
    } catch (error) {
      console.error('Solapi SMS send error:', error);
      return false;
    }
  }
}
```

### 7.3 이메일 발송 (Nodemailer)

```typescript
// backend/src/modules/workschd/services/notification/EmailProvider.ts
import nodemailer from 'nodemailer';

export class EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `"Workschd" <${process.env.SMTP_FROM}>`,
        to: params.to,
        subject: params.subject,
        html: params.html
      });
      return true;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }
}
```

### 7.4 통합 알림 서비스

```typescript
// backend/src/modules/workschd/services/NotificationService.ts
import { workschdPrisma as prisma } from '../../../config/prisma';
import { SolapiProvider } from './notification/SolapiProvider';
import { EmailProvider } from './notification/EmailProvider';

export class NotificationService {
  private solapiProvider: SolapiProvider;
  private emailProvider: EmailProvider;

  constructor() {
    this.solapiProvider = new SolapiProvider();
    this.emailProvider = new EmailProvider();
  }

  // 장례식 등록 알림
  async sendTaskCreatedNotification(taskId: number): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        shop: true,
        team: {
          include: {
            teamMembers: {
              include: {
                account: {
                  include: { accountRoles: true }
                }
              }
            }
          }
        }
      }
    });

    if (!task) return;

    // 팀 내 도우미들에게 알림
    const helpers = task.team.teamMembers.filter(member =>
      member.account.accountRoles.some(role => role.roleType === 'HELPER')
    );

    for (const helper of helpers) {
      // DB 저장
      const notification = await prisma.notification.create({
        data: {
          accountId: helper.accountId,
          taskId: task.id,
          type: 'TASK_CREATED',
          channel: 'KAKAO',
          status: 'PENDING',
          message: `새로운 장례식이 등록되었습니다: ${task.title}`
        }
      });

      // 비동기 전송 (Queue 사용 권장)
      this.sendKakaoNotification(notification.id, helper.account, task);
      this.sendEmailNotification(notification.id, helper.account, task);
    }
  }

  // 카카오톡 전송
  private async sendKakaoNotification(
    notificationId: number,
    account: any,
    task: any
  ): Promise<void> {
    try {
      const result = await this.solapiProvider.sendKakaoNotification({
        to: account.phone,
        templateId: 'TASK_CREATED_TEMPLATE',
        variables: {
          title: task.title,
          shopName: task.shop.name,
          startDate: task.startDateTime.toLocaleDateString('ko-KR'),
          workerCount: task.workerCount
        }
      });

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: result ? 'SENT' : 'FAILED',
          sentAt: new Date()
        }
      });
    } catch (error) {
      console.error('Kakao notification error:', error);
    }
  }

  // 이메일 전송
  private async sendEmailNotification(
    notificationId: number,
    account: any,
    task: any
  ): Promise<void> {
    try {
      const html = `
        <h2>새로운 장례식이 등록되었습니다</h2>
        <p><strong>제목:</strong> ${task.title}</p>
        <p><strong>장례식장:</strong> ${task.shop.name}</p>
        <p><strong>일정:</strong> ${task.startDateTime.toLocaleDateString('ko-KR')}</p>
        <p><strong>필요 인원:</strong> ${task.workerCount}명</p>
        <p><a href="${process.env.FRONTEND_URL}/workschd/task/${task.id}">자세히 보기</a></p>
      `;

      const result = await this.emailProvider.sendEmail({
        to: account.email,
        subject: `[Workschd] 새로운 장례식: ${task.title}`,
        html
      });

      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          channel: 'EMAIL',
          status: result ? 'SENT' : 'FAILED',
          sentAt: new Date()
        }
      });
    } catch (error) {
      console.error('Email notification error:', error);
    }
  }

  // 참여 승인 알림
  async sendJoinApprovedNotification(
    accountId: number,
    taskId: number
  ): Promise<void> {
    const account = await prisma.account.findUnique({
      where: { accountId }
    });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { shop: true }
    });

    if (!account || !task) return;

    await prisma.notification.create({
      data: {
        accountId,
        taskId,
        type: 'JOIN_APPROVED',
        channel: 'KAKAO',
        status: 'PENDING',
        message: `참여 신청이 승인되었습니다: ${task.title}`
      }
    });

    // 알림 전송 로직...
  }

  // 인원 마감 알림
  async sendTaskClosedNotification(taskId: number): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        team: {
          include: {
            teamMembers: {
              include: { account: true }
            }
          }
        }
      }
    });

    if (!task) return;

    // 팀 전체에 알림
    for (const member of task.team.teamMembers) {
      await prisma.notification.create({
        data: {
          accountId: member.accountId,
          taskId: task.id,
          type: 'TASK_CLOSED',
          channel: 'KAKAO',
          status: 'PENDING',
          message: `인원이 마감되었습니다: ${task.title}`
        }
      });
    }
  }
}
```

---

## 8. OAuth2 인증 연동

### 8.1 Google OAuth2

#### 8.1.1 설정
```bash
# .env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/workschd/auth/google/callback
```

#### 8.1.2 구현
```typescript
// backend/src/modules/workschd/services/OAuth2Service.ts
import axios from 'axios';
import { workschdPrisma as prisma } from '../../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class OAuth2Service {
  // Google 로그인 URL 생성
  getGoogleAuthUrl(): string {
    const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: 'code',
      scope: 'openid profile email',
      access_type: 'offline',
      prompt: 'consent'
    });
    return `${baseUrl}?${params.toString()}`;
  }

  // Google 콜백 처리
  async handleGoogleCallback(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: any;
  }> {
    // 1. 액세스 토큰 교환
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      }
    );

    const { access_token } = tokenResponse.data;

    // 2. 사용자 정보 가져오기
    const userInfoResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${access_token}` }
      }
    );

    const googleUser = userInfoResponse.data;

    // 3. 계정 찾기 또는 생성
    let account = await prisma.account.findFirst({
      where: {
        socialProvider: 'GOOGLE',
        socialProviderId: googleUser.id
      },
      include: { accountRoles: true }
    });

    if (!account) {
      // 신규 계정 생성
      account = await prisma.account.create({
        data: {
          username: googleUser.name,
          email: googleUser.email,
          password: await bcrypt.hash(Math.random().toString(), 10), // 랜덤 비밀번호
          status: 'ACTIVE',
          socialProvider: 'GOOGLE',
          socialProviderId: googleUser.id,
          profileImageUrl: googleUser.picture,
          accountRoles: {
            create: [{ roleType: 'USER' }]
          }
        },
        include: { accountRoles: true }
      });
    }

    // 4. JWT 생성
    const jwtAccessToken = jwt.sign(
      {
        accountId: account.accountId,
        email: account.email,
        roles: account.accountRoles.map(r => r.roleType)
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const jwtRefreshToken = jwt.sign(
      { accountId: account.accountId },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '7d' }
    );

    // 5. 토큰 저장
    await prisma.account.update({
      where: { accountId: account.accountId },
      data: {
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken
      }
    });

    return {
      accessToken: jwtAccessToken,
      refreshToken: jwtRefreshToken,
      user: account
    };
  }
}
```

### 8.2 Kakao OAuth2

#### 8.2.1 설정
```bash
# .env
KAKAO_REST_API_KEY=your_rest_api_key
KAKAO_CLIENT_SECRET=your_client_secret
KAKAO_REDIRECT_URI=http://localhost:3000/api/workschd/auth/kakao/callback
```

#### 8.2.2 구현
```typescript
// OAuth2Service.ts에 추가

// Kakao 로그인 URL 생성
getKakaoAuthUrl(): string {
  const baseUrl = 'https://kauth.kakao.com/oauth/authorize';
  const params = new URLSearchParams({
    client_id: process.env.KAKAO_REST_API_KEY!,
    redirect_uri: process.env.KAKAO_REDIRECT_URI!,
    response_type: 'code',
    scope: 'profile_nickname,profile_image,account_email'
  });
  return `${baseUrl}?${params.toString()}`;
}

// Kakao 콜백 처리
async handleKakaoCallback(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  user: any;
}> {
  // 1. 액세스 토큰 교환
  const tokenResponse = await axios.post(
    'https://kauth.kakao.com/oauth/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.KAKAO_REST_API_KEY!,
      client_secret: process.env.KAKAO_CLIENT_SECRET!,
      redirect_uri: process.env.KAKAO_REDIRECT_URI!,
      code
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  );

  const { access_token } = tokenResponse.data;

  // 2. 사용자 정보 가져오기
  const userInfoResponse = await axios.get(
    'https://kapi.kakao.com/v2/user/me',
    {
      headers: { Authorization: `Bearer ${access_token}` }
    }
  );

  const kakaoUser = userInfoResponse.data;

  // 3. 계정 찾기 또는 생성
  let account = await prisma.account.findFirst({
    where: {
      socialProvider: 'KAKAO',
      socialProviderId: kakaoUser.id.toString()
    },
    include: { accountRoles: true }
  });

  if (!account) {
    account = await prisma.account.create({
      data: {
        username: kakaoUser.properties.nickname,
        email: kakaoUser.kakao_account?.email,
        password: await bcrypt.hash(Math.random().toString(), 10),
        status: 'ACTIVE',
        socialProvider: 'KAKAO',
        socialProviderId: kakaoUser.id.toString(),
        profileImageUrl: kakaoUser.properties.profile_image,
        accountRoles: {
          create: [{ roleType: 'USER' }]
        }
      },
      include: { accountRoles: true }
    });
  }

  // 4. JWT 생성 (Google과 동일)
  const jwtAccessToken = jwt.sign(
    {
      accountId: account.accountId,
      email: account.email,
      roles: account.accountRoles.map(r => r.roleType)
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  const jwtRefreshToken = jwt.sign(
    { accountId: account.accountId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  await prisma.account.update({
    where: { accountId: account.accountId },
    data: {
      accessToken: jwtAccessToken,
      refreshToken: jwtRefreshToken
    }
  });

  return {
    accessToken: jwtAccessToken,
    refreshToken: jwtRefreshToken,
    user: account
  };
}
```

---

## 9. API 엔드포인트 명세

### 9.1 인증 API

#### 9.1.1 기존 인증
```
POST /api/workschd/auth/login
POST /api/workschd/auth/signup
POST /api/workschd/auth/refresh
```

#### 9.1.2 OAuth2 인증 (NEW)
```
GET  /api/workschd/auth/google
     - Google 로그인 페이지로 리다이렉트

GET  /api/workschd/auth/google/callback
     - Query: code
     - Response: { accessToken, refreshToken, user }

GET  /api/workschd/auth/kakao
     - Kakao 로그인 페이지로 리다이렉트

GET  /api/workschd/auth/kakao/callback
     - Query: code
     - Response: { accessToken, refreshToken, user }
```

### 9.2 장례식 API (확장)

```
GET  /api/workschd/task
     - Query: page, size, region, status, startDate, endDate
     - Response: { content: Task[], totalElements, totalPages }
     - 권한: 모든 인증된 사용자

GET  /api/workschd/task/:id
     - Response: Task (with shop, team, taskEmployees)
     - 권한: 모든 인증된 사용자

POST /api/workschd/task
     - Body: { title, description, workerCount, startDateTime, endDateTime, teamId, shopId }
     - Response: Task
     - 권한: TEAM_LEADER, ADMIN

PUT  /api/workschd/task/:id
     - Body: { title, description, workerCount, startDateTime, endDateTime, shopId }
     - Response: Task
     - 권한: TEAM_LEADER (본인), ADMIN

DELETE /api/workschd/task/:id
     - Response: { success: true }
     - 권한: TEAM_LEADER (본인), ADMIN

GET  /api/workschd/task/:id/employees
     - Response: TaskEmployee[] (참여자 목록)
     - 권한: TEAM_LEADER (본인 팀), ADMIN
```

### 9.3 참여 관리 API

```
POST /api/workschd/task/:taskId/request
     - 참여 신청
     - Response: TaskEmployee
     - 권한: HELPER

POST /api/workschd/task/request/:requestId/approve
     - 참여 승인
     - Response: { success: true }
     - 권한: TEAM_LEADER (본인 팀), ADMIN

POST /api/workschd/task/request/:requestId/reject
     - 참여 거절 (NEW)
     - Response: { success: true }
     - 권한: TEAM_LEADER (본인 팀), ADMIN

DELETE /api/workschd/task/request/:requestId
     - 참여 신청 취소 (NEW)
     - Response: { success: true }
     - 권한: HELPER (본인)
```

### 9.4 알림 API (NEW)

```
GET  /api/workschd/notifications
     - 내 알림 목록
     - Query: page, size, type, status
     - Response: { content: Notification[], totalElements, totalPages }
     - 권한: 인증된 사용자

GET  /api/workschd/notifications/:id
     - 알림 상세
     - Response: Notification
     - 권한: 인증된 사용자 (본인)

PUT  /api/workschd/notifications/:id/read
     - 알림 읽음 처리 (NEW)
     - Response: { success: true }
     - 권한: 인증된 사용자 (본인)

DELETE /api/workschd/notifications/:id
     - 알림 삭제
     - Response: { success: true }
     - 권한: 인증된 사용자 (본인)
```

### 9.5 계정 관리 API (확장)

```
GET  /api/workschd/accounts/me
     - 내 정보 조회
     - Response: Account (with roles)
     - 권한: 인증된 사용자

PUT  /api/workschd/accounts/me
     - 내 정보 수정
     - Body: { username, phone, profileImageUrl }
     - Response: Account
     - 권한: 인증된 사용자

POST /api/workschd/accounts/me/roles
     - 역할 추가 (NEW)
     - Body: { roleType: 'HELPER' | 'TEAM_LEADER' }
     - Response: AccountRole
     - 권한: ADMIN 또는 팀장 승인 필요

DELETE /api/workschd/accounts/me/roles/:roleId
     - 역할 삭제 (NEW)
     - Response: { success: true }
     - 권한: ADMIN
```

---

## 10. 데이터베이스 스키마 변경

### 10.1 Prisma 스키마 업데이트

```prisma
// backend/prisma/workschd.prisma

model Account {
  accountId       Int       @id @default(autoincrement()) @map("account_id")
  username        String    @map("username") @db.VarChar(100)
  email           String?   @map("email") @db.VarChar(512)
  phone           String?   @map("phone") @db.VarChar(20)
  password        String    @map("password")
  status          String    @map("status")
  accessToken     String?   @map("access_token") @db.Text
  refreshToken    String?   @map("refresh_token") @db.Text
  profileImageUrl String?   @map("profile_image_url")
  profileVideoUrl String?   @map("profile_video_url")

  // NEW: 소셜 로그인
  socialProvider   String?   @map("social_provider") // GOOGLE, KAKAO
  socialProviderId String?   @map("social_provider_id")

  // Relations
  accountRoles    AccountRole[]
  accountInfo     AccountInfo?
  teamMembers     TeamMember[]
  taskEmployees   TaskEmployee[]
  notifications   Notification[]     // NEW

  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@unique([socialProvider, socialProviderId])
  @@map("account")
}

model AccountRole {
  id        Int     @id @default(autoincrement())
  accountId Int     @map("account_id")
  roleType  String  @map("role_type") // ADMIN, USER, TEAM_LEADER, HELPER

  account   Account @relation(fields: [accountId], references: [accountId])

  @@map("account_role")
}

model Team {
  id                  Int      @id @default(autoincrement())
  name                String
  region              String
  scheduleType        String?   @map("schedule_type")
  invitationHash      String?   @map("invitation_hash")
  invitationCreatedAt DateTime? @map("invitation_created_at")
  invitationExpireAt  DateTime? @map("invitation_expire_at")
  location            String?

  teamMembers         TeamMember[]
  shops               Shop[]
  tasks               Task[]

  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  @@map("team")
}

model TeamMember {
  id        Int      @id @default(autoincrement())
  teamId    Int      @map("team_id")
  accountId Int      @map("account_id")
  role      String   @default("MEMBER") @map("role") // LEADER, MEMBER (NEW)
  joinedAt  DateTime @default(now()) @map("joined_at") // NEW

  team      Team     @relation(fields: [teamId], references: [id])
  account   Account  @relation(fields: [accountId], references: [accountId])

  @@map("team_member")
}

model Shop {
  id        Int     @id @default(autoincrement())
  teamId    Int     @map("team_id")
  name      String
  district  String?
  status    String  @default("ACTIVE")
  address   String?
  phone     String? // NEW
  capacity  Int?    // NEW: 수용 인원

  team      Team    @relation(fields: [teamId], references: [id])
  tasks     Task[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("shop")
}

model Task {
  id                 Int      @id @default(autoincrement())
  title              String
  description        String?  @db.Text
  workerCount        Int      @map("worker_count")
  currentWorkerCount Int      @default(0) @map("current_worker_count") // NEW
  startDateTime      DateTime @map("start_date_time")
  endDateTime        DateTime @map("end_date_time")
  status             String   // OPEN, CLOSED, COMPLETED, CANCELLED
  teamId             Int      @map("team_id")
  shopId             Int      @map("shop_id")
  createdBy          Int      @map("created_by") // NEW: 작성자

  team               Team            @relation(fields: [teamId], references: [id])
  shop               Shop            @relation(fields: [shopId], references: [id])
  taskEmployees      TaskEmployee[]
  notifications      Notification[]   // NEW

  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  @@map("task")
}

model TaskEmployee {
  id         Int       @id @default(autoincrement())
  taskId     Int       @map("task_id")
  accountId  Int       @map("account_id")
  status     String    @default("PENDING") // PENDING, APPROVED, REJECTED, CANCELLED
  appliedAt  DateTime  @default(now()) @map("applied_at") // NEW
  approvedAt DateTime? @map("approved_at") // NEW

  task       Task      @relation(fields: [taskId], references: [id])
  account    Account   @relation(fields: [accountId], references: [accountId])

  @@unique([taskId, accountId])
  @@map("task_employee")
}

// NEW: 알림
model Notification {
  id        Int       @id @default(autoincrement())
  accountId Int       @map("account_id")
  taskId    Int?      @map("task_id")
  type      String    // TASK_CREATED, JOIN_REQUEST, JOIN_APPROVED, TASK_CLOSED
  channel   String    // EMAIL, KAKAO, SMS
  status    String    @default("PENDING") // PENDING, SENT, FAILED
  message   String    @db.Text
  metadata  String?   @db.Json // 추가 데이터
  sentAt    DateTime? @map("sent_at")
  isRead    Boolean   @default(false) @map("is_read") // NEW

  account   Account   @relation(fields: [accountId], references: [accountId])
  task      Task?     @relation(fields: [taskId], references: [id])

  createdAt DateTime  @default(now()) @map("created_at")

  @@map("notification")
}
```

### 10.2 마이그레이션 단계

```bash
# 1. 스키마 수정 후 마이그레이션 생성
npx prisma migrate dev --name add_notification_and_oauth

# 2. Prisma 클라이언트 재생성
npx prisma generate --schema=./prisma/workschd.prisma

# 3. 데이터베이스 동기화 확인
npx prisma db push --schema=./prisma/workschd.prisma
```

---

## 11. 개발 일정 및 우선순위

### Phase 1: 기본 인프라 (1주)
- [x] 기존 코드 분석
- [ ] Prisma 스키마 업데이트
  - [ ] Account 소셜 로그인 필드 추가
  - [ ] Task currentWorkerCount, createdBy 필드 추가
  - [ ] TeamMember role, joinedAt 필드 추가
  - [ ] Notification 모델 추가
  - [ ] Shop phone, capacity 필드 추가
- [ ] 마이그레이션 실행
- [ ] 역할 미들웨어 구현 (authenticate, authorize)

### Phase 2: 알림 시스템 (1-2주)
- [ ] NotificationService 구현
- [ ] SolapiProvider 구현 (카카오톡)
- [ ] EmailProvider 구현 (Nodemailer)
- [ ] 알림 템플릿 작성
- [ ] 비동기 Queue 시스템 (선택: Bull, Redis)
- [ ] 알림 API 엔드포인트
  - [ ] GET /api/workschd/notifications
  - [ ] PUT /api/workschd/notifications/:id/read
  - [ ] DELETE /api/workschd/notifications/:id

### Phase 3: 장례식 관리 확장 (1주)
- [ ] TaskService 확장
  - [ ] createTask 시 알림 발송 로직 추가
  - [ ] approveJoinRequest 시 인원 마감 체크
  - [ ] 인원 마감 시 알림 발송
- [ ] TaskController 확장
  - [ ] GET /api/workschd/task (필터링)
  - [ ] POST /api/workschd/task (권한 체크)
  - [ ] PUT /api/workschd/task/:id
  - [ ] DELETE /api/workschd/task/:id
  - [ ] GET /api/workschd/task/:id/employees
- [ ] 참여 관리 API
  - [ ] POST /api/workschd/task/request/:requestId/reject
  - [ ] DELETE /api/workschd/task/request/:requestId

### Phase 4: OAuth2 연동 (1주)
- [ ] OAuth2Service 구현
  - [ ] Google 로그인
  - [ ] Kakao 로그인
- [ ] AuthController OAuth2 엔드포인트
  - [ ] GET /api/workschd/auth/google
  - [ ] GET /api/workschd/auth/google/callback
  - [ ] GET /api/workschd/auth/kakao
  - [ ] GET /api/workschd/auth/kakao/callback
- [ ] 프론트엔드 OAuth2 버튼 추가

### Phase 5: 프론트엔드 통합 (1-2주)

#### 5.1 관리자 페이지 (Admin Pages)
- [x] TaskManage.vue - 데스크톱 관리 페이지 (AG Grid 사용)
  - 팀장/관리자가 장례식 등록, 수정, 삭제
  - 참여 신청 승인/거절
  - 캘린더 뷰 및 자동 스케줄링
- [ ] 관리자 대시보드
  - [ ] AdminDashboard.vue - 전체 통계 및 현황
  - [ ] TaskStatistics.vue - 장례식 통계
  - [ ] WorkerManagement.vue - 도우미 관리
- [ ] 알림 관리
  - [ ] NotificationManagement.vue - 알림 템플릿 관리

#### 5.2 모바일 페이지 (Mobile Pages)

##### 5.2.1 관리자용 모바일 (Manager Mobile)
- [x] TaskManageMobile.vue - 모바일 관리 페이지
  - 장례식 목록 및 등록/수정
  - 참여 신청 승인/거절
  - 모바일 최적화 UI (Q-List, Q-Card)

##### 5.2.2 사용자용 모바일 (Worker Mobile)
- [x] TaskListMobile.vue - 사용자별 모바일 페이지
  - 상조도우미가 참여 가능한 장례식 목록 조회
  - 참여 신청 기능
  - 내 신청 내역 확인
  - 출근/퇴근 체크인

#### 5.3 공통 컴포넌트
- [ ] 알림 컴포넌트
  - [ ] NotificationList.vue - 알림 목록
  - [ ] NotificationItem.vue - 알림 아이템
  - [ ] NotificationBadge.vue - 실시간 알림 카운트
  - [ ] NotificationCenter.vue - 알림 센터 (드롭다운)
- [x] 장례식 관리 UI (부분 완성)
  - [x] TaskDialog.vue - 장례식 등록/수정 다이얼로그
  - [x] TaskEmployeeGrid.vue - 참여자 목록 그리드
  - [ ] TaskDetail.vue - 장례식 상세 페이지 (개선 필요)
  - [ ] TaskFilters.vue - 필터링 컴포넌트
- [ ] OAuth2 로그인 버튼
  - [ ] OAuth2Buttons.vue - Google/Kakao 로그인 버튼
  - [ ] AuthCallback.vue - OAuth2 콜백 처리 페이지

#### 5.4 API 연동
- [x] api-task.ts - 기본 Task API (부분 완성)
  - [x] fetchTasks, createTask, updateTask, deleteTask
  - [x] createTaskEmployeeRequest, approveJoinRequest
  - [x] getTaskEmployees, checkIn, checkOut
  - [ ] rejectJoinRequest - 참여 거절 (추가 필요)
  - [ ] cancelJoinRequest - 참여 취소 (추가 필요)
- [ ] api-notification.ts - 알림 API (신규)
  - [ ] getNotifications - 알림 목록
  - [ ] markAsRead - 읽음 처리
  - [ ] deleteNotification - 알림 삭제
- [ ] api-auth.ts - OAuth2 인증 API (신규)
  - [ ] googleLogin - Google 로그인 URL
  - [ ] kakaoLogin - Kakao 로그인 URL
  - [ ] handleOAuthCallback - 콜백 처리

#### 5.5 상태 관리 (Pinia Store)
- [ ] notification.ts - 알림 상태 관리
  - [ ] 알림 목록 저장
  - [ ] 읽지 않은 알림 카운트
  - [ ] 실시간 폴링 또는 WebSocket
- [ ] auth.ts - 인증 상태 관리 (확장)
  - [ ] OAuth2 토큰 저장
  - [ ] 사용자 역할 관리 (TEAM_LEADER, HELPER)

### Phase 6: 테스트 및 배포 (1주)
- [ ] 단위 테스트
  - [ ] TaskService 테스트
  - [ ] NotificationService 테스트
  - [ ] OAuth2Service 테스트
- [ ] 통합 테스트
  - [ ] API 엔드포인트 테스트
  - [ ] 알림 전송 테스트
- [ ] E2E 테스트
  - [ ] 장례식 등록 → 알림 → 참여 신청 → 승인 → 마감 플로우
- [ ] 배포
  - [ ] 환경 변수 설정
  - [ ] Docker 이미지 빌드
  - [ ] 프로덕션 배포

**총 예상 기간**: 6-8주

---

## 12. 기술 스택

### 12.1 백엔드

| 항목 | 기술 | 버전 |
|------|------|------|
| 런타임 | Node.js | 18+ |
| 언어 | TypeScript | 5.x |
| 프레임워크 | Express.js | 4.x |
| ORM | Prisma | 5.x |
| 데이터베이스 | MySQL | 8.x |
| 인증 | JWT | - |
| 암호화 | bcrypt | - |
| 이메일 | Nodemailer | - |
| 카카오톡 | Solapi | - |
| OAuth2 | axios | - |
| 스케줄링 | node-cron | - |
| 로깅 | Winston | - |

### 12.2 프론트엔드

| 항목 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Vue | 3.x |
| UI 라이브러리 | Quasar | 2.x |
| 상태 관리 | Pinia | 2.x |
| HTTP 클라이언트 | Axios | 1.x |
| 빌드 도구 | Vite | 5.x |
| 라우팅 | Vue Router | 4.x |
| 국제화 | vue-i18n | 9.x |

### 12.3 인프라

| 항목 | 기술 |
|------|------|
| 컨테이너 | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| 배포 | (TBD) |

---

## 부록

### A. 환경 변수 목록

```bash
# 데이터베이스
DATABASE_URL_WORKSCHD=mysql://user:password@localhost:3306/workschd

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret

# 이메일 (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@voyagerss.com

# Solapi (카카오톡, SMS)
SOLAPI_API_KEY=your_api_key
SOLAPI_API_SECRET=your_api_secret
SOLAPI_SENDER_PHONE=010-1234-5678
SOLAPI_KAKAO_PFID=your_kakao_channel_id

# Google OAuth2
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/workschd/auth/google/callback

# Kakao OAuth2
KAKAO_REST_API_KEY=your_rest_api_key
KAKAO_CLIENT_SECRET=your_client_secret
KAKAO_REDIRECT_URI=http://localhost:3000/api/workschd/auth/kakao/callback

# 프론트엔드 URL
FRONTEND_URL=http://localhost:8080
```

### B. 참고 문서

- **Prisma 문서**: https://www.prisma.io/docs
- **Express.js 문서**: https://expressjs.com
- **Vue 3 문서**: https://vuejs.org
- **Quasar 문서**: https://quasar.dev
- **Solapi 문서**: https://docs.solapi.com
- **Google OAuth2**: https://developers.google.com/identity/protocols/oauth2
- **Kakao 로그인**: https://developers.kakao.com/docs/latest/ko/kakaologin/common

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0 | 2026-01-11 | AI | 초기 명세서 작성 |

---

**문서 끝**
