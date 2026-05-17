# Gateway nginx merge prompt (Voyagerss BE + FE)

Copy everything inside the fenced block below into Cursor/Claude **after** pasting your current gateway nginx config (`nginx -T` or `sites-enabled/*`).

---

```
당신은 Linux gateway nginx 운영자입니다.
목표: 기존 L7 gateway nginx 설정을 유지한 채, Voyagerss 프로덕션 트래픽만 추가합니다.
절대 전체 nginx.conf 또는 기존 server 블록을 삭제·교체하지 마세요.

## 배경
- TLS 종료: DigitalOcean Load Balancer (클라이언트 HTTPS:443 → droplet HTTP:80)
- Docker Compose 런타임: /data/voyagerss/docker-compose.yml
- 이미지: GHCR (GitHub Actions에서 build/push, droplet에서는 pull만)
- 백엔드(Express): 127.0.0.1:9002 — /api/*, /health, /socket.io/*
- 프론트(Vue SPA, 컨테이너 nginx): 127.0.0.1:9003 — 정적 파일만 (API 프록시 없음)
- FE 빌드 시 API URL: https://api.voyagerss.com (브라우저가 직접 API 호출)

## 내가 제공할 것 (먼저 붙여넣기)
1) 현재 gateway nginx 전체 또는 관련 파일
2) 이미 사용 중인 server_name 목록
3) DO LB가 넘기는 헤더 여부 (X-Forwarded-Proto, X-Forwarded-For)

## 병합 규칙 (필수)
1. 기존 upstream/server/location/ssl/listen 설정은 그대로 두고, Voyagerss용만 추가.
2. 동일 server_name 블록이 이미 있으면 새 server를 만들지 말고, 해당 server 안에 location만 추가/수정.
3. 포트 9002, 9003은 127.0.0.1에만 바인딩 — 외부 방화벽에 열지 않음.
4. gateway에서 certbot/SSL 추가하지 않음 (TLS는 DO LB).
5. 변경 후: sudo nginx -t && sudo systemctl reload nginx

## http {} 블록에 추가할 upstream (이름 충돌 시 접두사 조정)
upstream voyagerss_api {
    server 127.0.0.1:9002;
    keepalive 32;
}
upstream voyagerss_fe {
    server 127.0.0.1:9003;
    keepalive 16;
}

## X-Forwarded-Proto (기존 map이 없을 때만)
map $http_x_forwarded_proto $voyagerss_forwarded_proto {
    default $http_x_forwarded_proto;
    ''      $scheme;
}

## server_name api.voyagerss.com
참고 스니펫: deploy/nginx/api.voyagerss.com.conf
- location = /health → voyagerss_api/health
- location /api/ → voyagerss_api
- location /socket.io/ → voyagerss_api (WebSocket upgrade)
- location / → return 404

## server_name voyagerss.com
참고 스니펫: deploy/nginx/voyagerss.com.conf
- location / → voyagerss_fe (SPA)
- /api 를 FE로 프록시하지 말 것

## 검증
curl -fsS -H "Host: api.voyagerss.com" http://127.0.0.1/health
curl -fsS -o /dev/null -w "FE %{http_code}\n" -H "Host: voyagerss.com" http://127.0.0.1/

## 산출물
1. 변경 요약
2. diff 형태 패치
3. 충돌·위험 요소
4. 롤백 방법
```

Reference files in this repo:

- [`api.voyagerss.com.conf`](api.voyagerss.com.conf)
- [`voyagerss.com.conf`](voyagerss.com.conf)
