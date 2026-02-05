# Workschd 모듈 API 테스트 계획

**작성일**: 2026-01-13
**대상 브랜치**: `claude/add-admin-mobile-pages-ce5N4`
**목적**: 새로 추가된 기능의 통합 테스트

---

## 📋 테스트 범위

### 1. 알림 시스템 API (5개 엔드포인트)
- ✅ 이미 구현 완료
- 🔄 통합 테스트 필요

### 2. 체크인/체크아웃 API (2개 엔드포인트)
- ✅ 이미 구현 완료
- ⚠️ Prisma 마이그레이션 후 테스트 가능

### 3. OAuth2 인증 API (4개 엔드포인트)
- ✅ 이미 구현 완료
- 🔄 수동 테스트 필요 (외부 서비스 연동)

---

## 🧪 테스트 케이스

### 1. 알림 시스템 테스트

#### 1.1 알림 목록 조회
```bash
# 엔드포인트
GET /api/workschd/notifications?page=0&size=10

# 테스트 시나리오
1. 인증된 사용자의 알림 목록 조회
2. 페이지네이션 동작 확인
3. 필터링 (type, status) 동작 확인

# 예상 응답
{
  "content": [
    {
      "id": 1,
      "type": "TASK_CREATED",
      "message": "새로운 장례식이 등록되었습니다",
      "isRead": false,
      "createdAt": "2026-01-13T10:00:00Z"
    }
  ],
  "totalElements": 1,
  "totalPages": 1
}

# 검증 항목
- ✅ 본인의 알림만 조회됨
- ✅ 페이지네이션 정상 작동
- ✅ 읽음/읽지 않음 상태 표시
```

#### 1.2 읽지 않은 알림 개수
```bash
# 엔드포인트
GET /api/workschd/notifications/unread/count

# 테스트 시나리오
1. 읽지 않은 알림 개수 조회
2. 알림 읽음 처리 후 개수 감소 확인

# 예상 응답
{
  "count": 5
}

# 검증 항목
- ✅ 정확한 개수 반환
- ✅ 실시간 업데이트 (폴링)
```

#### 1.3 알림 읽음 처리
```bash
# 엔드포인트
PUT /api/workschd/notifications/:id/read

# 테스트 시나리오
1. 특정 알림 읽음 처리
2. 읽지 않은 개수 감소 확인
3. 다른 사용자의 알림 처리 시도 (권한 오류)

# 예상 응답
{
  "success": true
}

# 검증 항목
- ✅ isRead가 true로 변경
- ✅ 권한 검증 정상 작동
```

#### 1.4 모든 알림 읽음 처리
```bash
# 엔드포인트
PUT /api/workschd/notifications/mark-all-read

# 테스트 시나리오
1. 모든 읽지 않은 알림 일괄 읽음 처리
2. 읽지 않은 개수가 0이 되는지 확인

# 예상 응답
{
  "success": true
}

# 검증 항목
- ✅ 모든 알림 isRead = true
- ✅ getUnreadCount() = 0
```

#### 1.5 알림 삭제
```bash
# 엔드포인트
DELETE /api/workschd/notifications/:id

# 테스트 시나리오
1. 특정 알림 삭제
2. 삭제 후 목록에서 사라지는지 확인
3. 다른 사용자의 알림 삭제 시도 (권한 오류)

# 예상 응답
{
  "success": true
}

# 검증 항목
- ✅ 알림 삭제됨
- ✅ 권한 검증 정상 작동
```

---

### 2. 체크인/체크아웃 테스트

#### 2.1 체크인 (정상 케이스)
```bash
# 엔드포인트
POST /api/workschd/task-employee/:taskEmployeeId/check-in

# 사전 조건
- TaskEmployee 상태가 APPROVED
- 체크인 기록이 없음 (joinedAt = null)

# 테스트 시나리오
1. 승인된 참여에 대해 체크인
2. joinedAt에 현재 시간 기록 확인

# 예상 응답
{
  "id": 1,
  "taskId": 1,
  "accountId": 1,
  "status": "APPROVED",
  "joinedAt": "2026-01-13T10:00:00.000Z",
  "leftAt": null
}

# 검증 항목
- ✅ joinedAt 값 설정됨
- ✅ 현재 시간 기록
```

#### 2.2 체크인 (에러 케이스)
```bash
# 케이스 1: 승인되지 않은 참여
- 상태: PENDING
- 예상 응답: 400 "승인된 참여만 체크인할 수 있습니다"

# 케이스 2: 이미 체크인됨
- joinedAt에 값이 있음
- 예상 응답: 400 "이미 체크인 되었습니다"

# 케이스 3: 다른 사용자의 참여
- accountId 불일치
- 예상 응답: 403 "권한이 없습니다"

# 케이스 4: 존재하지 않는 TaskEmployee
- 잘못된 taskEmployeeId
- 예상 응답: 404 "참여 정보를 찾을 수 없습니다"
```

#### 2.3 체크아웃 (정상 케이스)
```bash
# 엔드포인트
POST /api/workschd/task-employee/:taskEmployeeId/check-out

# 사전 조건
- 체크인 완료 (joinedAt 값 존재)
- 체크아웃 기록 없음 (leftAt = null)

# 테스트 시나리오
1. 체크인된 참여에 대해 체크아웃
2. leftAt에 현재 시간 기록 확인

# 예상 응답
{
  "id": 1,
  "taskId": 1,
  "accountId": 1,
  "status": "APPROVED",
  "joinedAt": "2026-01-13T10:00:00.000Z",
  "leftAt": "2026-01-13T18:00:00.000Z"
}

# 검증 항목
- ✅ leftAt 값 설정됨
- ✅ joinedAt < leftAt (시간 순서 확인)
```

#### 2.4 체크아웃 (에러 케이스)
```bash
# 케이스 1: 체크인 먼저 안함
- joinedAt = null
- 예상 응답: 400 "체크인을 먼저 해야 합니다"

# 케이스 2: 이미 체크아웃됨
- leftAt에 값이 있음
- 예상 응답: 400 "이미 체크아웃 되었습니다"

# 케이스 3: 권한 없음
- accountId 불일치
- 예상 응답: 403 "권한이 없습니다"
```

#### 2.5 체크인/체크아웃 전체 플로우
```bash
# 시나리오
1. 상조도우미가 장례식 참여 신청
   POST /api/workschd/task/:taskId/request

2. 팀장이 참여 승인
   POST /api/workschd/task/request/:requestId/approve

3. 상조도우미가 체크인
   POST /api/workschd/task-employee/:taskEmployeeId/check-in

4. 업무 수행

5. 상조도우미가 체크아웃
   POST /api/workschd/task-employee/:taskEmployeeId/check-out

6. 팀장이 참여자 목록 확인
   GET /api/workschd/task/:id/employees

# 검증 항목
- ✅ 전체 플로우 정상 작동
- ✅ 각 단계별 상태 변화 확인
- ✅ joinedAt, leftAt 값 기록 확인
```

---

### 3. OAuth2 인증 테스트

#### 3.1 Google OAuth2
```bash
# 엔드포인트
GET /api/workschd/auth/google

# 테스트 시나리오
1. Google 인증 페이지로 리다이렉트 확인
2. 인증 완료 후 콜백 처리
3. JWT 토큰 발급 확인

# 사전 조건
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET 환경 변수 설정
- Google Cloud Console에 Redirect URI 등록

# 검증 항목
- ✅ Google 인증 페이지로 리다이렉트
- ✅ 콜백 URL에 accessToken, refreshToken 포함
- ✅ 프론트엔드로 올바른 리다이렉트
```

#### 3.2 Kakao OAuth2
```bash
# 엔드포인트
GET /api/workschd/auth/kakao

# 테스트 시나리오
(Google과 동일한 패턴)

# 사전 조건
- KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET 환경 변수 설정
- Kakao Developers에 Redirect URI 등록
```

---

### 4. 통합 시나리오 테스트

#### 4.1 장례식 등록부터 완료까지
```bash
# 전체 플로우
1. 팀장 로그인
2. 장례식 등록
   - 알림 발송 확인 (팀원들에게)
3. 도우미 1이 참여 신청
   - 알림 발송 확인 (팀장에게)
4. 팀장이 참여 승인
   - 알림 발송 확인 (도우미 1에게)
5. 도우미 2, 3이 참여 신청 및 승인
6. 인원 마감 확인
   - 알림 발송 확인 (모든 팀원에게)
7. 도우미들이 순차적으로 체크인
8. 도우미들이 순차적으로 체크아웃
9. 팀장이 참여 내역 확인

# 검증 항목
- ✅ 모든 알림 정상 발송
- ✅ 체크인/체크아웃 기록 정확
- ✅ 상태 변화 정상
```

---

## 🛠️ 테스트 도구

### 1. Curl
```bash
# 예제
curl -X GET http://localhost:3000/api/workschd/notifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Postman/Insomnia
- Collection 생성
- 환경 변수 설정 (BASE_URL, TOKEN)
- 테스트 스크립트 작성

### 3. 자동화 테스트 (Jest + Supertest)
```javascript
describe('Notification API', () => {
  it('should get notifications list', async () => {
    const response = await request(app)
      .get('/api/workschd/notifications')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('content');
    expect(Array.isArray(response.body.content)).toBe(true);
  });
});
```

---

## 📊 테스트 체크리스트

### 우선순위 1: 알림 시스템
- [ ] 알림 목록 조회 (페이지네이션)
- [ ] 읽지 않은 알림 개수
- [ ] 알림 읽음 처리
- [ ] 모든 알림 읽음 처리
- [ ] 알림 삭제
- [ ] 권한 검증

### 우선순위 2: 체크인/체크아웃
- [ ] Prisma 마이그레이션 실행 ⚠️ 필수
- [ ] 체크인 (정상 케이스)
- [ ] 체크인 (에러 케이스 4가지)
- [ ] 체크아웃 (정상 케이스)
- [ ] 체크아웃 (에러 케이스 3가지)
- [ ] 전체 플로우 테스트

### 우선순위 3: OAuth2
- [ ] Google OAuth2 플로우
- [ ] Kakao OAuth2 플로우
- [ ] 토큰 발급 및 저장
- [ ] 프론트엔드 연동

### 우선순위 4: 통합 테스트
- [ ] 장례식 등록부터 완료까지 전체 플로우
- [ ] 알림 발송 확인
- [ ] 프론트엔드-백엔드 연동

---

## 🐛 알려진 이슈

### 1. Prisma 마이그레이션 미완료
- **상태**: SQL 파일 생성 완료, 실행 대기 중
- **영향**: 체크인/체크아웃 API 테스트 불가
- **해결**: `docs/MIGRATION-GUIDE.md` 참조하여 로컬 실행

### 2. 환경 변수 미설정
- **항목**: SOLAPI_*, GOOGLE_*, KAKAO_*, SMTP_*
- **영향**: OAuth2, 알림 발송 기능 테스트 불가
- **해결**: `.env` 파일 설정 필요

---

## 📚 관련 문서

- **마이그레이션 가이드**: `docs/MIGRATION-GUIDE.md`
- **세션 요약**: `docs/SESSION-SUMMARY.md`
- **API 엔드포인트 목록**: `docs/SESSION-SUMMARY.md` (24개 엔드포인트)
- **백엔드 Routes**: `backend/src/modules/workschd/routes.ts`

---

**문서 작성일**: 2026-01-13
