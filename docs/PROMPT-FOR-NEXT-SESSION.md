# 다음 세션 시작 프롬프트

다음 세션에서 Claude에게 아래 프롬프트를 전달하면 빠르게 작업을 이어갈 수 있습니다.

---

## 📋 Option 1: 간단 버전 (추천)

```
이전 세션에서 작업하던 Workschd 모듈 개발을 이어서 진행해줘.

브랜치: claude/add-admin-mobile-pages-ce5N4
이전 세션 요약: docs/SESSION-SUMMARY.md
다음 작업 가이드: docs/NEXT-SESSION.md

먼저 이 두 문서를 읽고, 현재 상태를 파악한 후 다음 작업을 제안해줘.
```

---

## 📋 Option 2: 상세 버전 (특정 작업 지정)

### 테스트 및 버그 수정 작업 시작

```
Workschd 모듈 개발 세션을 이어서 진행하려고 해.

**현재 상태:**
- 브랜치: claude/add-admin-mobile-pages-ce5N4
- 이전 세션 요약: docs/SESSION-SUMMARY.md
- 커밋: 5개 커밋 완료, 모두 푸시됨

**이전 세션에서 완료한 작업:**
- 프론트엔드: 알림 시스템, OAuth2, 관리자 대시보드 추가
- 백엔드: 알림 API 확장, 체크인/체크아웃 API 추가
- API 경로 동기화 완료 (24개 엔드포인트)

**중요: 미완료 작업**
- Prisma 마이그레이션 실행 필요 (joinedAt, leftAt 필드 추가)
  → 이전 세션에서 Prisma 바이너리 다운로드 실패로 실행하지 못함

**다음 작업 요청:**
1. docs/SESSION-SUMMARY.md와 docs/NEXT-SESSION.md를 읽고 현재 상태 파악
2. Prisma 마이그레이션 실행 (또는 실행 방법 안내)
3. 백엔드 API 테스트 (특히 체크인/체크아웃)
4. 프론트엔드-백엔드 통합 테스트
5. 발견된 버그가 있다면 수정

작업 시작해줘.
```

### 실시간 알림 구현 시작

```
Workschd 모듈에 실시간 알림 기능을 추가하려고 해.

**현재 상태:**
- 브랜치: claude/add-admin-mobile-pages-ce5N4
- 알림 시스템: 현재 30초 폴링 방식으로 구현됨
- 관련 파일:
  * frontend/src/components/workschd/notification/NotificationCenter.vue
  * backend/src/modules/workschd/services/NotificationService.ts

**목표:**
폴링 방식을 WebSocket으로 전환하여 실시간 알림 구현

**요청 작업:**
1. docs/SESSION-SUMMARY.md 확인하여 현재 알림 시스템 구조 파악
2. Socket.io를 사용한 WebSocket 구현 계획 수립
3. 백엔드 WebSocket 서버 설정
4. 프론트엔드 WebSocket 클라이언트 연결
5. NotificationCenter 컴포넌트 수정 (폴링 제거)
6. 테스트 및 커밋

작업 시작해줘.
```

### 테스트 코드 작성 시작

```
Workschd 모듈에 테스트 코드를 추가하려고 해.

**현재 상태:**
- 브랜치: claude/add-admin-mobile-pages-ce5N4
- 테스트 프레임워크: 미설정
- 24개 API 엔드포인트 완성됨

**목표:**
Jest와 Supertest를 사용한 백엔드 테스트 코드 작성

**요청 작업:**
1. docs/SESSION-SUMMARY.md 확인
2. Jest, Supertest 설정
3. TaskService 단위 테스트 작성
4. NotificationService 단위 테스트 작성
5. API 통합 테스트 작성
6. 테스트 실행 및 커버리지 확인

작업 시작해줘.
```

---

## 📋 Option 3: 탐색적 시작 (Claude가 판단)

```
Workschd 모듈 개발을 이어서 하려고 해.

브랜치: claude/add-admin-mobile-pages-ce5N4

docs/SESSION-SUMMARY.md와 docs/NEXT-SESSION.md를 읽고:
1. 현재 상태 요약
2. 우선순위가 높은 작업 3가지 제안
3. 각 작업의 예상 소요 시간과 난이도

그 다음 어떤 작업부터 시작할지 물어봐줘.
```

---

## 📋 Option 4: 특정 문제 해결

```
Workschd 모듈에서 [특정 문제]가 발생했어.

**브랜치:** claude/add-admin-mobile-pages-ce5N4
**문제 상황:** [여기에 문제 설명]

**관련 파일:**
- [문제가 발생한 파일 경로]

docs/SESSION-SUMMARY.md를 참고하여 문제를 진단하고 해결 방안을 제시해줘.
```

---

## 🎯 추천 사용 시나리오

### 시나리오 1: 처음 이어서 작업할 때
→ **Option 1 (간단 버전)** 또는 **Option 3 (탐색적 시작)** 사용

### 시나리오 2: 특정 작업을 명확히 알고 있을 때
→ **Option 2 (상세 버전)** 에서 해당 섹션 사용

### 시나리오 3: 문제가 발생했을 때
→ **Option 4 (특정 문제 해결)** 사용

---

## 💡 프롬프트 사용 팁

1. **문서 참조 강조**: 항상 `docs/SESSION-SUMMARY.md`를 먼저 읽도록 요청
2. **브랜치 명시**: 정확한 브랜치 이름 제공
3. **현재 상태 파악**: Claude가 먼저 상태를 파악하도록 요청
4. **명확한 작업 지시**: 원하는 작업을 구체적으로 명시

---

## 📝 프롬프트 커스터마이징

필요에 따라 아래 요소를 추가/수정하세요:

```
**추가 컨텍스트:**
- 환경: [개발/스테이징/프로덕션]
- 마감일: [날짜]
- 우선순위: [높음/중간/낮음]

**제약사항:**
- [특정 라이브러리 사용 금지 등]

**참고사항:**
- [추가로 알아야 할 정보]
```

---

## ✅ 체크리스트

다음 세션 시작 전:
- [ ] 위 프롬프트 중 하나를 선택
- [ ] 필요시 커스터마이징
- [ ] Claude에게 프롬프트 전달
- [ ] Claude가 문서를 읽고 상태를 파악하는지 확인

---

**준비 완료!** 위 프롬프트를 복사하여 다음 세션에서 사용하세요.
