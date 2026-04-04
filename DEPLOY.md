# Voyagerss 배포 가이드 (Vercel + AWS)

프론트엔드는 **Vercel**, 백엔드는 **AWS EC2** (CodeBuild + CodeDeploy) 로 운영합니다.

---

## 아키텍처 개요

```
[사용자] → [Vercel (Frontend SPA)]
              │
              │ VITE_API_BASE_URL
              ▼
         [AWS EC2 (Backend API)]
              │
              ▼
         [AWS RDS MySQL 8]
```

| 구성요소 | 서비스 | 설명 |
|----------|--------|------|
| Frontend | Vercel | Vue 3 + Quasar SPA (정적 호스팅) |
| Backend | AWS EC2 | Express + Prisma API (PM2 관리) |
| Database | AWS RDS | MySQL 8 (4개 DB: voyagers, workschd, investand, aviation) |
| CI/CD | AWS CodeBuild → CodeDeploy | GitHub push → 자동 빌드 → EC2 배포 |

---

## 1. Frontend — Vercel 배포

### 1-1. Vercel 프로젝트 연결

1. [Vercel Dashboard](https://vercel.com/dashboard)에서 **New Project** 클릭
2. GitHub 리포지토리 `minssan9/voyagerss` 연결
3. 설정:
   - **Framework Preset**: Vue.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install --force`
   - **Output Directory**: `dist`

### 1-2. 환경 변수 설정 (Vercel Dashboard)

**Settings > Environment Variables**에서 추가:

| 변수명 | 값 (예시) | 설명 |
|--------|-----------|------|
| `VITE_API_BASE_URL` | `https://api.voyagerss.com/api` | 백엔드 API Base URL |
| `VITE_API_URL` | `https://api.voyagerss.com` | 백엔드 서버 URL |
| `VITE_API_WEB` | `https://api.voyagerss.com` | WebSocket URL |
| `VITE_APP_TITLE` | `Voyagerss` | 앱 타이틀 |
| `VITE_GEMINI_API_KEY` | `(your key)` | Gemini AI API Key |
| `VITE_KAKAO_CLIENT_ID` | `(your key)` | Kakao 클라이언트 ID |

> **주의**: `VITE_API_BASE_URL`은 반드시 백엔드 API의 전체 경로 (`/api` 포함)로 설정해야 합니다. 프론트엔드 axios는 이 값을 baseURL로 사용합니다.

### 1-3. 자동 배포

- `main` 브랜치에 push 시 자동 빌드 및 배포
- PR 생성 시 Preview Deployment 자동 생성
- `vercel.json`이 SPA 라우팅 rewrite, 캐시 헤더, 보안 헤더를 자동 설정

### 1-4. 커스텀 도메인

Vercel Dashboard → **Settings > Domains** → 도메인 추가 후 DNS 레코드 설정

---

## 2. Backend — AWS 배포

### 2-1. 사전 준비

#### AWS 리소스

| 리소스 | 설명 |
|--------|------|
| EC2 인스턴스 | Amazon Linux 2023 / Ubuntu 22.04, t3.small 이상 |
| RDS MySQL 8 | db.t3.micro 이상, 4개 DB 생성 필요 |
| S3 버킷 | CodeBuild 아티팩트 저장용 |
| IAM Role | CodeBuild, CodeDeploy, EC2 역할 |
| CodeBuild 프로젝트 | GitHub 소스 연결 |
| CodeDeploy 애플리케이션 | EC2 배포 그룹 |

#### EC2 초기 설정

```bash
# Node.js 20 설치
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs   # Amazon Linux
# sudo apt install -y nodejs  # Ubuntu

# PM2 설치
sudo npm install -g pm2

# CodeDeploy Agent 설치
sudo yum install -y ruby wget
cd /home/ec2-user
wget https://aws-codedeploy-ap-northeast-2.s3.ap-northeast-2.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto

# 앱 디렉토리 생성
mkdir -p /home/ec2-user/voyagerss/logs
```

#### RDS 데이터베이스 생성

```sql
CREATE DATABASE voyagers CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE workschd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE investand CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE aviation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### EC2 환경변수 파일

`.env.production.example`을 참조하여 EC2에 `/home/ec2-user/voyagerss/.env` 생성:

```bash
sudo nano /home/ec2-user/voyagerss/.env
# .env.production.example 내용을 실제 값으로 채워 넣기
```

### 2-2. AWS CodeBuild 설정

#### CodeBuild 프로젝트 생성

1. **AWS Console > CodeBuild > Create Project**
2. 설정:
   - **Source**: GitHub → `minssan9/voyagerss`
   - **Branch**: `main`
   - **Environment**: Managed image, Ubuntu, Standard 7.0, Node.js 20
   - **Buildspec**: `buildspec.yml` (리포지토리 루트)
   - **Artifacts**: S3 버킷 → `voyagerss-deploy-artifacts/`

#### Parameter Store 설정

`buildspec.yml`이 참조하는 환경변수를 **AWS Systems Manager Parameter Store**에 등록:

```bash
aws ssm put-parameter --name "/voyagerss/prod/DATABASE_URL" \
  --value "mysql://user:pass@rds-endpoint:3306/voyagers" \
  --type SecureString

aws ssm put-parameter --name "/voyagerss/prod/DATABASE_URL_AVIATION" \
  --value "mysql://user:pass@rds-endpoint:3306/aviation" \
  --type SecureString

aws ssm put-parameter --name "/voyagerss/prod/DATABASE_URL_INVESTAND" \
  --value "mysql://user:pass@rds-endpoint:3306/investand" \
  --type SecureString

aws ssm put-parameter --name "/voyagerss/prod/DATABASE_URL_WORKSCHD" \
  --value "mysql://user:pass@rds-endpoint:3306/workschd" \
  --type SecureString
```

#### IAM Policy (CodeBuild)

CodeBuild 서비스 역할에 추가:

```json
{
  "Effect": "Allow",
  "Action": [
    "ssm:GetParameters",
    "ssm:GetParameter"
  ],
  "Resource": "arn:aws:ssm:ap-northeast-2:*:parameter/voyagerss/*"
}
```

### 2-3. AWS CodeDeploy 설정

#### CodeDeploy 애플리케이션 생성

1. **AWS Console > CodeDeploy > Create Application**
   - **Application name**: `voyagerss-backend`
   - **Compute platform**: EC2/On-premises

2. **Deployment Group 생성**
   - **Name**: `voyagerss-prod`
   - **Service role**: CodeDeploy용 IAM Role
   - **Deployment type**: In-place
   - **EC2 instances**: 태그 기반 (예: `Name = voyagerss-backend`)
   - **Deployment config**: `CodeDeployDefault.AllAtOnce`

#### EC2 IAM Role

EC2 인스턴스 역할에 다음 정책 추가:
- `AmazonS3ReadOnlyAccess` (아티팩트 다운로드)
- `AmazonSSMManagedInstanceCore` (Systems Manager)

### 2-4. 배포 파이프라인

#### 수동 배포

```bash
# 1. CodeBuild 실행
aws codebuild start-build --project-name voyagerss-backend

# 2. CodeDeploy 배포 (빌드 완료 후)
aws deploy create-deployment \
  --application-name voyagerss-backend \
  --deployment-group-name voyagerss-prod \
  --s3-location bucket=voyagerss-deploy-artifacts,key=backend-latest.zip,bundleType=zip
```

#### CodePipeline 자동화 (권장)

CodePipeline으로 GitHub → CodeBuild → CodeDeploy 연결:

1. **Source**: GitHub (main 브랜치)
2. **Build**: CodeBuild 프로젝트
3. **Deploy**: CodeDeploy 애플리케이션

---

## 3. 배포 흐름 요약

### Frontend (Vercel)
```
git push main → Vercel 자동 감지 → npm install --force → npm run build → CDN 배포 → 라이브
```

### Backend (AWS)
```
git push main → CodePipeline 트리거 → CodeBuild (npm ci → prisma generate → tsc build)
             → S3 아티팩트 업로드 → CodeDeploy → EC2 (PM2 restart) → health check
```

---

## 4. CORS 설정

백엔드 `.env`에서 Vercel 프론트엔드 도메인을 허용:

```bash
FRONTEND_URL=https://voyagerss.vercel.app
ALLOWED_ORIGINS=https://voyagerss.vercel.app,https://yourdomain.com,https://www.yourdomain.com
```

---

## 5. SSL/HTTPS

| 서비스 | SSL |
|--------|-----|
| Vercel Frontend | 자동 (Let's Encrypt) |
| AWS Backend | ALB + ACM Certificate 또는 Nginx reverse proxy + Certbot |

AWS EC2에 직접 HTTPS 필요 시:

```bash
# Nginx 설치 (reverse proxy)
sudo yum install -y nginx

# Certbot으로 SSL 인증서 발급
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

Nginx reverse proxy 설정:
```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:9002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. 모니터링

```bash
# PM2 상태 확인
pm2 status
pm2 logs voyagerss-backend

# 헬스 체크
curl https://api.yourdomain.com/health

# PM2 시스템 부팅 시 자동 시작
pm2 startup
pm2 save
```

---

## 7. 롤백

### Vercel
- Dashboard > Deployments > 이전 배포 선택 > **Promote to Production**

### AWS CodeDeploy
```bash
# 이전 배포로 롤백
aws deploy create-deployment \
  --application-name voyagerss-backend \
  --deployment-group-name voyagerss-prod \
  --revision revisionType=S3,s3Location='{bucket=voyagerss-deploy-artifacts,key=backend-previous.zip,bundleType=zip}'
```

---

## 8. 체크리스트

### 배포 전
- [ ] RDS MySQL 8 인스턴스 생성 + 4개 DB 생성
- [ ] EC2 인스턴스 생성 + Node.js 20 + PM2 + CodeDeploy Agent 설치
- [ ] EC2에 `/home/ec2-user/voyagerss/.env` 생성 (실제 값)
- [ ] Parameter Store에 DATABASE_URL_* 등록
- [ ] CodeBuild 프로젝트 생성
- [ ] CodeDeploy 애플리케이션 + 배포 그룹 생성
- [ ] S3 아티팩트 버킷 생성
- [ ] Vercel 프로젝트 연결 + 환경변수 설정
- [ ] CORS ALLOWED_ORIGINS에 Vercel 도메인 추가
- [ ] JWT_SECRET을 강력한 랜덤 문자열로 변경

### 배포 후
- [ ] `curl https://api.yourdomain.com/health` 정상 응답 확인
- [ ] Vercel 프론트엔드에서 API 연결 확인
- [ ] 회원가입/로그인 플로우 정상 동작 확인
- [ ] PM2 startup 설정 완료
- [ ] SSL 인증서 설정 완료
