# 배포 가이드 (Deployment Guide)

> Frontend → Vercel, Backend → DigitalOcean 배포 구조

---

## 목차

1. [사전 준비 사항](#1-사전-준비-사항)
2. [DigitalOcean 백엔드 설정](#2-digitalocean-백엔드-설정)
3. [Vercel 프론트엔드 설정](#3-vercel-프론트엔드-설정)
4. [GitHub Actions 설정](#4-github-actions-설정)
5. [도메인 및 SSL 설정](#5-도메인-및-ssl-설정)
6. [배포 전 체크리스트](#6-배포-전-체크리스트)
7. [배포 후 검증](#7-배포-후-검증)
8. [문제 해결](#8-문제-해결)

---

## 1. 사전 준비 사항

### 필요한 계정
- [ ] **GitHub** 계정 (리포지토리 접근)
- [ ] **Vercel** 계정 (https://vercel.com)
- [ ] **DigitalOcean** 계정 (https://digitalocean.com)
- [ ] **도메인** (선택사항, 권장)

### 필요한 API 키
- [ ] Gemini AI API Key
- [ ] Telegram Bot Token
- [ ] KIS API Key/Secret (한국투자증권)
- [ ] DART API Key (금융감독원)
- [ ] BOK API Key (한국은행)
- [ ] Kakao Client ID (OAuth)
- [ ] Channel Talk Plugin Key

### 필요한 인프라
- [ ] MySQL 데이터베이스 (4개 스키마: voyagers, aviation, investand, workschd)
- [ ] SMTP 서버 (이메일 발송용)

---

## 2. DigitalOcean 백엔드 설정

### 2.1 Droplet 생성

1. DigitalOcean 대시보드에서 **Create → Droplets** 클릭
2. 설정:
   - **Region**: Singapore 또는 Seoul (가까운 곳)
   - **Image**: Ubuntu 22.04 LTS
   - **Size**: Basic, 2GB RAM / 1 CPU 이상 권장
   - **Authentication**: SSH Key 추가

### 2.2 서버 초기 설정

SSH로 서버 접속 후 다음 명령어 실행:

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose 설치
sudo apt install docker-compose-plugin -y

# 재로그인 (docker 그룹 적용)
exit
# 다시 SSH 접속
```

### 2.3 GitHub Actions Self-Hosted Runner 설정

1. GitHub 리포지토리 → **Settings** → **Actions** → **Runners**
2. **New self-hosted runner** 클릭
3. Linux 선택 후 표시되는 명령어를 DigitalOcean 서버에서 실행:

```bash
# 디렉토리 생성
mkdir actions-runner && cd actions-runner

# Runner 다운로드 (버전은 GitHub에서 확인)
curl -o actions-runner-linux-x64-2.xxx.x.tar.gz -L https://github.com/actions/runner/releases/download/v2.xxx.x/actions-runner-linux-x64-2.xxx.x.tar.gz
tar xzf ./actions-runner-linux-x64-2.xxx.x.tar.gz

# Runner 설정 (GitHub에서 제공하는 토큰 사용)
./config.sh --url https://github.com/YOUR_USERNAME/voyagerss --token YOUR_TOKEN

# 서비스로 설치 (자동 시작)
sudo ./svc.sh install
sudo ./svc.sh start
```

### 2.4 프로젝트 클론 및 환경 설정

```bash
# 프로젝트 디렉토리로 이동
cd /home/$USER
git clone https://github.com/YOUR_USERNAME/voyagerss.git
cd voyagerss

# 환경 변수 파일 생성
cp .env.example .env.prod
nano .env.prod  # 아래 내용 참고하여 수정
```

### 2.5 Backend .env.prod 설정

```env
# ============================================
# 기본 설정
# ============================================
NODE_ENV=production
BACKEND_PORT=6172

# ============================================
# 데이터베이스 (실제 값으로 변경 필수!)
# ============================================
DATABASE_URL="mysql://USER:PASSWORD@DB_HOST:3306/voyagers"
DATABASE_URL_AVIATION="mysql://USER:PASSWORD@DB_HOST:3306/aviation"
DATABASE_URL_INVESTAND="mysql://USER:PASSWORD@DB_HOST:3306/investand"
DATABASE_URL_WORKSCHD="mysql://USER:PASSWORD@DB_HOST:3306/workschd"

# ============================================
# CORS 설정 (Vercel 도메인으로 변경!)
# ============================================
FRONTEND_URL=https://voyagerss.vercel.app
ALLOWED_ORIGINS=https://voyagerss.vercel.app,https://www.voyagerss.com

# ============================================
# 보안
# ============================================
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_chars

# ============================================
# Rate Limiting
# ============================================
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=100

# ============================================
# 외부 API 키
# ============================================
BOK_API_KEY=your_bok_api_key
KIS_API_KEY=your_kis_api_key
KIS_API_SECRET=your_kis_api_secret
DART_API_KEY=your_dart_api_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GEMINI_API_KEY=your_gemini_api_key

# ============================================
# 이메일 (SMTP)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# ============================================
# Swagger
# ============================================
SWAGGER_PROD_URL=https://api.voyagerss.com
```

### 2.6 수동 배포 테스트

```bash
cd /home/$USER/voyagerss

# Docker 빌드 및 실행
docker compose up -d --build

# 상태 확인
docker compose ps

# 로그 확인
docker compose logs -f backend

# 헬스 체크
curl http://localhost:6172/health
```

---

## 3. Vercel 프론트엔드 설정

### 3.1 Vercel 프로젝트 연결

1. https://vercel.com 로그인
2. **Add New** → **Project** 클릭
3. GitHub 리포지토리 **voyagerss** 선택
4. **Root Directory**: `frontend` 입력
5. **Framework Preset**: Vite 자동 감지됨

### 3.2 환경 변수 설정

Vercel 프로젝트 → **Settings** → **Environment Variables**에서 다음 변수 추가:

| 변수명 | 값 (예시) | 환경 |
|--------|----------|------|
| `VITE_API_BASE_URL` | `https://api.voyagerss.com/api` | Production |
| `VITE_API_URL` | `https://api.voyagerss.com` | Production |
| `VITE_API_WEB` | `https://api.voyagerss.com` | Production |
| `VITE_APP_TITLE` | `Voyagerss` | All |
| `VITE_GEMINI_API_KEY` | `your_key` | Production |
| `VITE_CHANNEL_TALK_PLUGIN_KEY` | `your_key` | Production |
| `VITE_KAKAO_CLIENT_ID` | `your_key` | Production |
| `VITE_DATA_ASSEMBLY_KEY` | `your_key` | Production |
| `VITE_DATA_PUBLIC_KEY` | `your_key` | Production |

> ⚠️ **중요**: `VITE_API_URL`을 실제 백엔드 도메인으로 변경하세요!

### 3.3 vercel.json API 프록시 수정

`frontend/vercel.json` 파일의 백엔드 URL을 실제 도메인으로 수정:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.voyagerss.com/api/:path*"  // 실제 도메인으로 변경!
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3.4 배포

1. 변경사항을 GitHub에 push
2. Vercel이 자동으로 빌드 및 배포
3. 배포 완료 후 제공된 URL 확인 (예: `voyagerss.vercel.app`)

---

## 4. GitHub Actions 설정

### 4.1 Repository Secrets 설정

GitHub 리포지토리 → **Settings** → **Secrets and variables** → **Actions**

**필수 Secret 추가:**

| Secret 이름 | 값 |
|-------------|-----|
| `DOTENV_PROD` | `.env.prod` 파일 전체 내용 |

**DOTENV_PROD 설정 방법:**

1. 위에서 작성한 `.env.prod` 내용 전체 복사
2. GitHub Secrets에 `DOTENV_PROD` 이름으로 추가

### 4.2 워크플로 동작 방식

```
main 브랜치에 push
       ↓
   CI 워크플로 실행 (ci.yml)
   - Backend 빌드 테스트
   - Frontend 빌드 테스트
       ↓
   CI 성공 시
       ↓
   Deploy 워크플로 실행 (deploy-backend.yml)
   - Self-hosted runner에서 실행
   - .env.prod 파일 생성
   - Docker Compose로 백엔드 배포
   - 헬스 체크
```

---

## 5. 도메인 및 SSL 설정

### 5.1 도메인 DNS 설정

DNS 관리 페이지에서 다음 레코드 추가:

| 타입 | 이름 | 값 |
|------|------|-----|
| A | api | DigitalOcean Droplet IP |
| CNAME | www | voyagerss.vercel.app |
| CNAME | @ | voyagerss.vercel.app (또는 A 레코드) |

### 5.2 Vercel 커스텀 도메인 설정

1. Vercel 프로젝트 → **Settings** → **Domains**
2. 도메인 추가 (예: `voyagerss.com`, `www.voyagerss.com`)
3. DNS 설정 안내에 따라 설정

### 5.3 백엔드 SSL 설정 (Nginx + Let's Encrypt)

DigitalOcean 서버에서:

```bash
# Nginx 설치
sudo apt install nginx -y

# Certbot 설치
sudo apt install certbot python3-certbot-nginx -y

# Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/api.voyagerss.com
```

Nginx 설정 내용:

```nginx
server {
    listen 80;
    server_name api.voyagerss.com;

    location / {
        proxy_pass http://localhost:6172;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 설정 활성화
sudo ln -s /etc/nginx/sites-available/api.voyagerss.com /etc/nginx/sites-enabled/

# Nginx 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx

# SSL 인증서 발급 (이메일 입력 필요)
sudo certbot --nginx -d api.voyagerss.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

---

## 6. 배포 전 체크리스트

### 백엔드 (DigitalOcean)

- [ ] Droplet 생성 및 SSH 접속 확인
- [ ] Docker 및 Docker Compose 설치
- [ ] GitHub Actions Runner 설치 및 실행 중
- [ ] `.env.prod` 파일 작성 완료
- [ ] 데이터베이스 연결 테스트
- [ ] `docker compose up -d --build` 성공
- [ ] `curl http://localhost:6172/health` 응답 확인
- [ ] 방화벽 포트 열기 (80, 443, 6172)

### 프론트엔드 (Vercel)

- [ ] Vercel 프로젝트 생성 및 GitHub 연결
- [ ] Root Directory를 `frontend`로 설정
- [ ] 환경 변수 모두 설정
- [ ] `vercel.json`의 API URL을 실제 백엔드 도메인으로 변경
- [ ] 빌드 성공 확인

### GitHub

- [ ] `DOTENV_PROD` Secret 설정
- [ ] Self-hosted runner가 Online 상태인지 확인

### 도메인/SSL

- [ ] DNS A 레코드 설정 (api 서브도메인)
- [ ] Nginx 리버스 프록시 설정
- [ ] Let's Encrypt SSL 인증서 발급
- [ ] HTTPS 접속 확인

### CORS 설정

- [ ] `ALLOWED_ORIGINS`에 Vercel 프로덕션 URL 포함
- [ ] `FRONTEND_URL`이 Vercel URL과 일치

---

## 7. 배포 후 검증

### API 헬스 체크

```bash
# 로컬에서 백엔드 헬스 체크
curl https://api.voyagerss.com/health

# 예상 응답
# {"status":"healthy","timestamp":"2024-..."}
```

### CORS 테스트

```bash
# CORS preflight 요청 테스트
curl -X OPTIONS https://api.voyagerss.com/api/workschd/teams \
  -H "Origin: https://voyagerss.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -v

# 응답 헤더에 다음이 포함되어야 함:
# Access-Control-Allow-Origin: https://voyagerss.vercel.app
# Access-Control-Allow-Credentials: true
```

### 프론트엔드 테스트

1. `https://voyagerss.vercel.app` 접속
2. 브라우저 개발자 도구 → Network 탭 열기
3. API 요청이 정상적으로 백엔드로 전송되는지 확인
4. CORS 에러가 없는지 확인

### 전체 플로우 테스트

- [ ] 로그인/회원가입 동작
- [ ] API 데이터 조회 동작
- [ ] 파일 업로드 동작 (있는 경우)

---

## 8. 문제 해결

### CORS 에러 발생 시

1. 백엔드 로그 확인:
```bash
docker compose logs -f backend | grep -i cors
```

2. `ALLOWED_ORIGINS`에 프론트엔드 도메인이 정확히 포함되어 있는지 확인
3. 프로토콜(https/http) 일치 여부 확인
4. 트레일링 슬래시(/) 없이 도메인만 입력했는지 확인

### 502 Bad Gateway 에러

1. 백엔드 컨테이너 상태 확인:
```bash
docker compose ps
docker compose logs backend
```

2. Nginx 설정 확인:
```bash
sudo nginx -t
sudo systemctl status nginx
```

### GitHub Actions 실패

1. Runner 상태 확인 (GitHub → Settings → Actions → Runners)
2. 서버에서 runner 서비스 상태 확인:
```bash
cd ~/actions-runner
./svc.sh status
```

3. Secrets가 올바르게 설정되었는지 확인

### 데이터베이스 연결 실패

1. DATABASE_URL 형식 확인:
```
mysql://사용자:비밀번호@호스트:포트/데이터베이스명
```

2. 특수문자가 있으면 URL 인코딩 필요 (예: `@` → `%40`)

3. 데이터베이스 서버 방화벽에서 DigitalOcean IP 허용 여부 확인

---

## 빠른 명령어 참조

```bash
# 백엔드 재배포
cd ~/voyagerss && git pull && docker compose up -d --build

# 로그 확인
docker compose logs -f backend

# 컨테이너 재시작
docker compose restart backend

# 전체 중지
docker compose down

# Nginx 재시작
sudo systemctl restart nginx

# SSL 인증서 갱신
sudo certbot renew
```

---

## 연락처

문제 발생 시 GitHub Issues에 등록해주세요:
https://github.com/minssan9/voyagerss/issues
