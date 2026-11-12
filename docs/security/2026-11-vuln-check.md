# 2026-11 취약점 점검 — voyagerss

점검일: 2026-11-07. 기준 브랜치는 `origin/main`.

`frontend`는 lockfile로 `npm audit --omit=dev`. 집계는 critical 1, high 17, moderate 2, low 0이다.

| 심각도 | 패키지 | 수정 |
| --- | --- | --- |
| critical | quasar | 있음 |
| high | vue-i18n, @intlify/* | 있음 |
| high | axios, form-data, vue, @vue/server-renderer | 있음 |
| high | socket.io-client, socket.io-parser, ws | socket.io-client@2.5.0 로 묶임 |
| high | rollup, postcss, nanoid, source-map-js, zod | 있음. zod는 4.6.7 |
| high | js-cookie | 수정 버전 없음 |

`backend`에는 lockfile이 없다. `npm install --package-lock-only --ignore-scripts`로 그 시점의 트리를 만든 뒤 같은 감사를 했다. 그 lockfile은 커밋하지 않았다. 집계는 critical 3, high 20, moderate 47, low 2이다. critical은 simple-git, @simple-git/argv-parser, tar(sqlite3 쪽)이다. high에는 nodemailer(10.3.1), multer(@nestjs/platform-express@12.4.0), puppeteer-core@25.16.0, sqlite3@6.0.1, yahoo-finance2가 있다.

`vision`의 `/vision/live` 화면 파일은 이 브랜치에 없어 feature map에서 뺐다.

코드: `backend/src/modules/workschd/tests/workschd-api.test.ts` 62행은 테스트 전용 JWT 폴백이다. 운영 설정 파일에서는 같은 패턴을 보지 못했다.

상위 조치: 프론트 Quasar와 socket.io 계열, 백엔드 lockfile 작성 후 simple-git·sqlite3·nodemailer를 수정 버전으로 올린다.
