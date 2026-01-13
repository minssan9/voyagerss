# Prisma 마이그레이션 실행 가이드

**마이그레이션 이름**: `add_check_in_out_fields`
**생성일**: 2026-01-13
**목적**: TaskEmployee 테이블에 출퇴근 체크인/체크아웃 필드 추가

---

## 📋 변경 내역

### 추가되는 컬럼
- `joined_at` (DATETIME): 출근 시간 (체크인)
- `left_at` (DATETIME): 퇴근 시간 (체크아웃)

### 영향받는 테이블
- `task_employee`

---

## 🚀 실행 방법

### 방법 1: Prisma CLI 사용 (권장)

```bash
cd /home/user/voyagerss/backend

# 1. 환경 변수 설정 확인
cat .env | grep DATABASE_URL_WORKSCHD

# 2. 마이그레이션 적용
npx prisma migrate deploy --schema=./prisma/workschd.prisma

# 3. Prisma Client 재생성
npx prisma generate --schema=./prisma/workschd.prisma
```

### 방법 2: MySQL 직접 실행

```bash
# 1. MySQL 접속
mysql -h [HOST] -u [USER] -p [DATABASE]

# 2. SQL 실행
ALTER TABLE `task_employee`
ADD COLUMN `joined_at` DATETIME(3) NULL,
ADD COLUMN `left_at` DATETIME(3) NULL;

# 3. 확인
DESCRIBE task_employee;

# 4. Prisma Client 재생성
cd /home/user/voyagerss/backend
npx prisma generate --schema=./prisma/workschd.prisma
```

### 방법 3: Docker 환경

```bash
# Docker MySQL 컨테이너 접속
docker exec -it [CONTAINER_NAME] mysql -u root -p

# SQL 실행 (위 방법 2와 동일)
```

---

## 🔍 마이그레이션 파일 위치

```
backend/prisma/migrations/20260113153735_add_check_in_out_fields/migration.sql
```

### SQL 내용
```sql
-- AlterTable
ALTER TABLE `task_employee` ADD COLUMN `joined_at` DATETIME(3) NULL,
    ADD COLUMN `left_at` DATETIME(3) NULL;
```

---

## ✅ 검증 방법

### 1. 데이터베이스 직접 확인
```sql
DESCRIBE task_employee;
```

**예상 결과**:
```
+--------------+--------------+------+-----+---------+----------------+
| Field        | Type         | Null | Key | Default | Extra          |
+--------------+--------------+------+-----+---------+----------------+
| id           | int          | NO   | PRI | NULL    | auto_increment |
| task_id      | int          | NO   | MUL | NULL    |                |
| account_id   | int          | NO   | MUL | NULL    |                |
| status       | varchar(255) | YES  |     | PENDING |                |
| applied_at   | datetime(3)  | NO   |     | CURRENT_|                |
| approved_at  | datetime(3)  | YES  |     | NULL    |                |
| joined_at    | datetime(3)  | YES  |     | NULL    |                | ← 새로 추가
| left_at      | datetime(3)  | YES  |     | NULL    |                | ← 새로 추가
+--------------+--------------+------+-----+---------+----------------+
```

### 2. Prisma Studio 확인
```bash
cd /home/user/voyagerss/backend
npx prisma studio --schema=./prisma/workschd.prisma
```

브라우저에서 `task_employee` 모델을 열어 `joinedAt`, `leftAt` 필드가 표시되는지 확인

### 3. API 테스트
```bash
# 체크인 API 테스트
curl -X POST http://localhost:3000/api/workschd/task-employee/1/check-in \
  -H "Authorization: Bearer YOUR_TOKEN"

# 예상 응답
{
  "id": 1,
  "taskId": 1,
  "accountId": 1,
  "status": "APPROVED",
  "joinedAt": "2026-01-13T15:37:35.000Z",  ← 추가됨
  "leftAt": null
}
```

---

## 🐛 트러블슈팅

### 문제 1: "Column already exists" 에러
**원인**: 컬럼이 이미 존재함
**해결**:
```sql
-- 컬럼 존재 여부 확인
SHOW COLUMNS FROM task_employee LIKE 'joined_at';

-- 이미 존재하면 마이그레이션 스킵
```

### 문제 2: Prisma Client 에러
**원인**: Prisma Client가 업데이트되지 않음
**해결**:
```bash
cd backend
rm -rf node_modules/@prisma/client-workschd
npx prisma generate --schema=./prisma/workschd.prisma
```

### 문제 3: 데이터베이스 연결 실패
**원인**: DATABASE_URL_WORKSCHD 환경 변수 미설정
**해결**:
```bash
# .env 파일에 추가
echo "DATABASE_URL_WORKSCHD=mysql://user:password@localhost:3306/workschd" >> .env

# 연결 테스트
npx prisma db pull --schema=./prisma/workschd.prisma
```

### 문제 4: Prisma 바이너리 다운로드 실패
**원인**: 네트워크 제한 또는 방화벽
**해결**:
- 방법 2 (MySQL 직접 실행) 사용
- 또는 프록시 설정:
```bash
export HTTP_PROXY=http://proxy.example.com:8080
export HTTPS_PROXY=http://proxy.example.com:8080
npx prisma migrate deploy
```

---

## 📚 관련 문서

- **Prisma 스키마**: `backend/prisma/workschd.prisma`
- **TaskService**: `backend/src/modules/workschd/services/TaskService.ts`
- **API Routes**: `backend/src/modules/workschd/routes.ts`
- **세션 요약**: `docs/SESSION-SUMMARY.md`

---

## 🔗 관련 API 엔드포인트

마이그레이션 완료 후 사용 가능한 API:

```
POST /api/workschd/task-employee/:taskEmployeeId/check-in
POST /api/workschd/task-employee/:taskEmployeeId/check-out
```

**체크인 로직**:
1. TaskEmployee 상태가 APPROVED인지 확인
2. 이미 체크인 되었는지 확인 (joinedAt 값 체크)
3. joinedAt에 현재 시간 설정

**체크아웃 로직**:
1. 체크인이 먼저 되었는지 확인 (joinedAt 존재)
2. 이미 체크아웃 되었는지 확인 (leftAt 값 체크)
3. leftAt에 현재 시간 설정

---

## ⚠️ 주의사항

1. **백업 필수**: 마이그레이션 실행 전 반드시 데이터베이스 백업
   ```bash
   mysqldump -u root -p workschd > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **프로덕션 환경**: 스테이징 환경에서 먼저 테스트 후 프로덕션 적용

3. **다운타임**: ALTER TABLE은 테이블 잠금이 발생할 수 있으므로 트래픽이 적은 시간에 실행

4. **롤백 방법**: 문제 발생 시 롤백 SQL
   ```sql
   ALTER TABLE `task_employee`
   DROP COLUMN `joined_at`,
   DROP COLUMN `left_at`;
   ```

---

**문서 작성일**: 2026-01-13
**최종 업데이트**: 2026-01-13
