# 다음 세션 빠른 시작 가이드

> 이전 세션: 2026-01-11 - Workschd 프론트엔드/백엔드 개발 완료

---

## 🚀 빠른 시작 (5분)

### 1. 브랜치 확인
```bash
cd /home/user/voyagerss
git checkout claude/add-admin-mobile-pages-ce5N4
git pull origin claude/add-admin-mobile-pages-ce5N4
```

### 2. 이전 세션 요약 확인
```bash
cat docs/SESSION-SUMMARY.md
```

### 3. ⚠️ 중요: Prisma 마이그레이션 실행
```bash
cd backend
npx prisma migrate dev --name add_check_in_out_fields --schema=./prisma/workschd.prisma
npx prisma generate --schema=./prisma/workschd.prisma
```

> **이전 세션에서 미완료**: Prisma 바이너리 다운로드 실패로 마이그레이션을 실행하지 못했습니다.
> 로컬 환경에서 위 명령어를 **반드시 실행**해야 합니다.

---

## 📋 현재 상태

### ✅ 완료된 항목
- 프론트엔드: 알림 시스템, OAuth2, 관리자 대시보드
- 백엔드: 알림 API, OAuth2 API, 체크인/체크아웃 API
- API 경로 동기화 완료
- Git 커밋/푸시 완료 (3개 커밋)

### ⏳ 미완료/테스트 필요
- [ ] Prisma 마이그레이션 실행
- [ ] 통합 테스트 (프론트엔드 ↔ 백엔드)
- [ ] OAuth2 로그인 플로우 테스트
- [ ] 체크인/체크아웃 기능 테스트

---

## 🎯 다음 작업 추천

### Option 1: 테스트 및 버그 수정 (추천)
**목적**: 현재 기능의 안정성 확보

**작업 순서**:
1. Prisma 마이그레이션 실행 및 확인
2. 개발 서버 실행 (백엔드/프론트엔드)
3. 기능별 테스트:
   - 알림 시스템 (생성, 읽음, 삭제)
   - OAuth2 로그인 (Google, Kakao)
   - 체크인/체크아웃
4. 발견된 버그 수정
5. 커밋 및 푸시

**예상 소요 시간**: 1-2시간

---

### Option 2: 실시간 알림 구현
**목적**: 폴링 → WebSocket으로 업그레이드

**작업 순서**:
1. Socket.io 설치
   ```bash
   cd backend && npm install socket.io
   cd frontend && npm install socket.io-client
   ```
2. 백엔드 WebSocket 서버 설정
3. 프론트엔드 WebSocket 클라이언트 연결
4. NotificationCenter 컴포넌트 수정 (폴링 제거)
5. 테스트 및 커밋

**예상 소요 시간**: 2-3시간

---

### Option 3: 테스트 코드 작성
**목적**: 자동화된 테스트 구축

**작업 순서**:
1. Jest/Supertest 설정
2. TaskService 단위 테스트
3. NotificationService 단위 테스트
4. API 통합 테스트
5. 프론트엔드 컴포넌트 테스트 (Vue Test Utils)

**예상 소요 시간**: 3-4시간

---

### Option 4: 새로운 기능 추가
**목적**: 추가 기능 구현

**추천 기능**:
- 알림 템플릿 관리 페이지
- 통계/리포트 기능
- 사용자 프로필 관리
- 모바일 푸시 알림

**예상 소요 시간**: 기능에 따라 다름

---

## 🔧 개발 서버 실행

### 터미널 1: 백엔드
```bash
cd /home/user/voyagerss/backend
npm run dev
```

### 터미널 2: 프론트엔드
```bash
cd /home/user/voyagerss/frontend
npm run dev
```

---

## 📚 주요 파일 위치

### 최근 추가된 파일
```
frontend/src/
├── api/workschd/api-notification.ts
├── components/auth/OAuth2Buttons.vue
├── components/workschd/notification/
│   ├── NotificationCenter.vue
│   └── NotificationItem.vue
└── views/
    ├── common/auth/AuthCallback.vue
    └── workschd/admin/AdminDashboard.vue

backend/src/modules/workschd/
├── controllers/
│   ├── NotificationController.ts
│   └── TaskController.ts
├── services/
│   ├── NotificationService.ts
│   └── TaskService.ts
└── routes.ts
```

### 핵심 설정 파일
```
backend/
├── prisma/workschd.prisma         # Prisma 스키마
├── .env                           # 환경 변수
└── src/modules/workschd/routes.ts # API 라우팅

frontend/
├── src/router/workschd/routes.ts  # 프론트엔드 라우팅
└── src/api/workschd/              # API 클라이언트
```

---

## 🐛 트러블슈팅

### Prisma 마이그레이션 실패 시
```bash
# 1. Prisma 재설치
cd backend
npm install prisma@latest @prisma/client@latest

# 2. 마이그레이션 리셋 (개발 환경만!)
npx prisma migrate reset --schema=./prisma/workschd.prisma

# 3. 마이그레이션 재실행
npx prisma migrate dev --schema=./prisma/workschd.prisma
```

### 백엔드 서버 시작 실패 시
```bash
# 1. node_modules 삭제 및 재설치
cd backend
rm -rf node_modules package-lock.json
npm install

# 2. Prisma 재생성
npx prisma generate --schema=./prisma/workschd.prisma

# 3. 서버 재시작
npm run dev
```

### API 호출 실패 시
```bash
# 1. 백엔드 서버 로그 확인
# 2. 브라우저 개발자 도구 → Network 탭 확인
# 3. API 경로 확인 (docs/SESSION-SUMMARY.md 참조)
```

---

## 🔍 유용한 명령어

### Git
```bash
# 최근 커밋 확인
git log --oneline -5

# 변경 파일 확인
git status

# 변경 내용 확인
git diff

# 특정 커밋 확인
git show 9ce48ce
```

### Prisma
```bash
cd backend

# 스키마 확인
cat prisma/workschd.prisma | grep -A 10 "model TaskEmployee"

# 데이터베이스 확인
npx prisma studio --schema=./prisma/workschd.prisma

# 마이그레이션 상태 확인
npx prisma migrate status --schema=./prisma/workschd.prisma
```

### 로그 확인
```bash
# 백엔드 로그
tail -f backend/logs/app.log

# 특정 에러 검색
grep -r "error" backend/src/modules/workschd/
```

---

## 📞 긴급 롤백 (문제 발생 시)

### Git 롤백
```bash
# 마지막 커밋 취소 (변경사항 유지)
git reset --soft HEAD~1

# 마지막 커밋 완전 취소
git reset --hard HEAD~1

# 특정 커밋으로 롤백
git reset --hard c5b8a9b
```

### Prisma 마이그레이션 롤백
```bash
cd backend

# 마이그레이션 리셋 (개발 환경만!)
npx prisma migrate reset --schema=./prisma/workschd.prisma

# 특정 마이그레이션 적용 해제
npx prisma migrate resolve --rolled-back "20260111_add_check_in_out_fields" --schema=./prisma/workschd.prisma
```

---

## ✅ 세션 시작 체크리스트

**시작 전 (필수)**:
- [ ] Git 브랜치 확인 (`claude/add-admin-mobile-pages-ce5N4`)
- [ ] 최신 변경사항 pull
- [ ] `docs/SESSION-SUMMARY.md` 읽기

**개발 환경 준비**:
- [ ] Prisma 마이그레이션 실행
- [ ] Backend 의존성 설치 확인
- [ ] Frontend 의존성 설치 확인
- [ ] 환경 변수 설정 확인 (`.env`)

**서버 시작**:
- [ ] Backend 서버 실행 (`http://localhost:3000`)
- [ ] Frontend 서버 실행 (`http://localhost:8080`)
- [ ] 데이터베이스 연결 확인

**기본 테스트**:
- [ ] API Health Check (`GET /api/health`)
- [ ] 프론트엔드 접속 확인
- [ ] 콘솔 에러 확인

---

## 💡 도움말

### 명세서 확인
```bash
# 기능 명세
cat docs/workschd-feature-spec.md

# 구현 가이드
cat docs/workschd-implementation-guide.md

# 이전 세션 요약
cat docs/SESSION-SUMMARY.md
```

### API 테스트
```bash
# curl 사용
curl -X GET http://localhost:3000/api/workschd/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# 또는 Postman/Insomnia 사용
```

### 코드 검색
```bash
# 특정 함수 찾기
grep -r "checkIn" backend/src/modules/workschd/

# 특정 파일 찾기
find . -name "*Notification*"

# 특정 텍스트 찾기
grep -r "joined_at" backend/
```

---

**준비 완료!** 위 체크리스트를 따라 시작하세요. 🚀

**추천**: Option 1 (테스트 및 버그 수정)부터 시작하는 것을 권장합니다.
