# Feedback Widget — 설치 가이드 (배포용)

> 이 문서는 **위젯을 자신의 웹사이트에 설치하려는 운영자/개발자** 를 위한 배포용 가이드입니다.
> 버전: v1.0 · 최소 요구 브라우저: Chrome 90+, Safari 14+, Firefox 88+, Edge 90+

---

## 1. 위젯이 하는 일

방문자가 화면 우하단 버튼을 눌러 **의견·버그·기능 요청** 을 제출하면 자동으로 팀의 GitHub 저장소에 이슈/PR로 연결됩니다. 설치하는 쪽은 **`<script>` 한 줄** 만 넣으면 됩니다.

- 호스트 페이지 CSS 에 영향 없음 (iframe 격리)
- 페이지 로딩 차단 없음 (async, 4KB gzip)
- 비로그인 방문자 이메일만 받으면 제출 가능
- 스크린샷 첨부 지원 (선택)

---

## 2. 30초 설치 (Quick Start)

`</body>` 직전에 아래 한 줄만 붙여넣으세요.

```html
<script
  src="https://widget.example.com/embed.js"
  data-app-id="YOUR_APP_ID"
  async
  defer
></script>
```

`YOUR_APP_ID` 는 관리자 페이지 → **Settings → Widget** 에서 복사합니다.
저장 후 사이트를 새로고침하면 우하단에 파란 원형 버튼이 나타납니다.

---

## 3. 플랫폼별 삽입 예시

### 3-1. 일반 HTML / 정적 사이트
```html
<!doctype html>
<html>
  <body>
    <!-- 기존 내용 -->

    <script
      src="https://widget.example.com/embed.js"
      data-app-id="abc123"
      async defer></script>
  </body>
</html>
```

### 3-2. WordPress
관리자 → **외모(Appearance) → 위젯** 또는 `footer.php` 에 동일한 `<script>` 삽입.
또는 "Insert Headers and Footers" 플러그인의 Footer 영역에 붙여넣기.

### 3-3. Nuxt 3
`app.vue` 또는 레이아웃 파일:
```vue
<script setup>
useHead({
  script: [{
    src: 'https://widget.example.com/embed.js',
    'data-app-id': 'abc123',
    async: true, defer: true, body: true,
  }],
})
</script>
```

### 3-4. Next.js (App Router)
`app/layout.tsx`:
```tsx
import Script from 'next/script'

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="https://widget.example.com/embed.js"
          data-app-id="abc123"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}
```

### 3-5. React (CRA/Vite)
`index.html` 의 `<body>` 끝에 `<script>` 를 그대로 넣거나, `useEffect` 에서 동적 주입:
```tsx
useEffect(() => {
  const s = document.createElement('script')
  s.src = 'https://widget.example.com/embed.js'
  s.async = true; s.defer = true
  s.dataset.appId = 'abc123'
  document.body.appendChild(s)
  return () => { s.remove() }
}, [])
```

### 3-6. Shopify
**Online Store → Themes → Edit code → Layout → theme.liquid** 의 `</body>` 직전에 삽입.

### 3-7. Webflow
**Project Settings → Custom Code → Footer Code** 에 붙여넣기.

### 3-8. Google Tag Manager
- **Tags → New → Custom HTML**
- 트리거: All Pages
- HTML 에 `<script>` 그대로 입력

---

## 4. 옵션 (data 속성)

| 속성 | 기본값 | 설명 |
|------|-------|------|
| `data-app-id` | (필수) | 관리자에서 발급한 앱 식별자 |
| `data-position` | `bottom-right` | `bottom-right` / `bottom-left` / `top-right` / `top-left` |
| `data-offset-x` | `24` | 가장자리에서 px |
| `data-offset-y` | `24` | 가장자리에서 px |
| `data-theme` | `auto` | `auto` / `light` / `dark` |
| `data-accent` | `#0A84FF` | 버튼·강조색 (hex) |
| `data-locale` | `auto` | `auto` / `ko` / `en` / `ja` |
| `data-z-index` | `2147483000` | 호스트와 충돌 시 조정 |
| `data-hide-on-mobile` | `false` | 모바일 숨김 |
| `data-launcher` | `true` | `false` 시 FAB 숨기고 JS API 로만 열기 |

예:
```html
<script src="https://widget.example.com/embed.js"
        data-app-id="abc123"
        data-position="bottom-left"
        data-accent="#111111"
        data-locale="ko"
        async defer></script>
```

---

## 5. JavaScript API

로드 후 `window.Feedback` 네임스페이스 사용.

```js
// 위젯 열기 / 닫기
Feedback.open()
Feedback.close()
Feedback.toggle()

// 사용자 정보 자동 채우기 (로그인 사용자)
Feedback.identify({
  userId: 'u_123',
  email: 'hong@example.com',
  name: '홍길동',
  meta: { plan: 'pro', orgId: 'org_9' }
})

// 사용자 전환 / 로그아웃 시 초기화
Feedback.reset()

// 특정 컨텍스트로 열기 (예: 현재 기능 태그 부여)
Feedback.open({ subject: '검색 결과 오류', tags: ['search'] })

// 이벤트 리스너
Feedback.on('submitted', (payload) => console.log(payload.issueId))
Feedback.on('opened',   () => {})
Feedback.on('closed',   () => {})
Feedback.on('error',    (err) => {})
```

**커스텀 런처 예시 (FAB 숨김 + 자체 버튼)**
```html
<script src="https://widget.example.com/embed.js"
        data-app-id="abc123" data-launcher="false" async defer></script>

<button id="my-feedback-btn">의견 보내기</button>
<script>
  document.getElementById('my-feedback-btn')
    .addEventListener('click', () => Feedback.open())
</script>
```

---

## 6. 로드 전 대기 패턴

스크립트가 아직 초기화되지 않았을 수 있으므로 안전하게:
```html
<script>
  window.FeedbackQueue = window.FeedbackQueue || []
  function fb(){ (window.Feedback?.ready ? window.Feedback : window.FeedbackQueue).push(arguments) }
  fb('identify', { userId: 'u_1', email: 'a@b.com' })
</script>
<script src="https://widget.example.com/embed.js"
        data-app-id="abc123" async defer></script>
```
위젯은 로드되면 큐를 순차 실행합니다.

---

## 7. 도메인 등록 & 보안

위젯은 **Origin 화이트리스트** 를 통해서만 동작합니다.

1. 관리자 페이지 → Settings → Widget → **Allowed Origins** 에 도메인 추가
   - 예: `https://example.com`, `https://*.example.com`
2. 로컬 개발은 `http://localhost:3000` 같은 origin 을 추가
3. 허용되지 않은 origin 에서는 `embed.js` 가 조기 종료하고 콘솔에 경고 출력

### CSP (Content Security Policy) 설정
호스트 페이지에 CSP 가 있다면 다음을 허용해야 합니다.
```
script-src  'self' https://widget.example.com;
frame-src   https://widget.example.com;
connect-src 'self' https://api.example.com;
img-src     'self' data: https://widget.example.com;
```

### 개인정보 / GDPR
- 위젯은 기본적으로 IP, User-Agent, referrer URL, 방문자가 입력한 본문만 전송합니다.
- 쿠키는 사용하지 않습니다 (session은 host 도메인 scope 에 없음).
- `Feedback.identify()` 로 넘긴 정보는 서버에 저장됩니다 — 민감정보(주민번호, 카드번호 등)는 절대 넘기지 마세요.
- 요청 삭제(RTBF): 관리자 페이지에서 email 기준 purge 가능.

---

## 8. 국제화 (Locale)

`data-locale="auto"` 이면 `navigator.language` 를 기준으로 자동 선택됩니다.
지원: `ko`, `en`, `ja` (추가 언어는 요청 부탁드립니다).

커스텀 문구 오버라이드:
```html
<script>
  window.FeedbackConfig = {
    strings: {
      placeholder: '무엇을 도와드릴까요?',
      submit: '보내기',
      thankYou: '전달했습니다. 감사합니다!'
    }
  }
</script>
<script src="https://widget.example.com/embed.js"
        data-app-id="abc123" async defer></script>
```

---

## 9. 접근성 (a11y)

- FAB 에 `aria-label="Open feedback"` 자동 부여
- 키보드: `Tab` 포커스, `Enter` 열기, `Esc` 닫기
- 다이얼로그 열리면 포커스 트랩, 배경 `aria-hidden`
- 컬러 컨트라스트 WCAG AA 이상 (커스텀 accent 지정 시 자동 보정)

---

## 10. 성능

| 항목 | 값 |
|------|-----|
| embed.js 크기 | 약 3–4KB (gzip) |
| iframe 로드 시점 | **FAB 클릭 후** (lazy) |
| 호스트 LCP 영향 | 측정 불가 수준 |
| 네트워크 요청 | 초기 1회 (embed.js) |

모바일 3G 환경에서도 FAB 자체는 200ms 안에 표시되며, 본 iframe 은 사용자 클릭 시점에 로드되어 페이지 성능을 해치지 않습니다.

---

## 11. 테스트 체크리스트 (설치자용)

- [ ] `<script>` 삽입 후 새로고침, 우하단 FAB 표시되는지
- [ ] FAB 클릭 → 폼이 열리고 입력 가능한지
- [ ] 제출 후 "감사합니다" 메시지가 보이는지
- [ ] 관리자 페이지 **Issues** 목록에 새 항목이 나타나는지
- [ ] 브라우저 콘솔에 에러/CSP 경고 없는지
- [ ] 다른 주요 페이지(홈, 결제 등)에서도 정상 표시되는지
- [ ] 모바일에서 FAB 가 겹치지 않는지 (offset 조정)

---

## 12. 제거

HTML 에서 `<script>` 태그만 삭제하면 즉시 제거됩니다. 캐시가 남을 수 있으니 강력 새로고침(Ctrl+Shift+R) 권장.

동적 제거가 필요하면:
```js
Feedback.destroy()   // iframe·FAB·리스너 모두 해제
```

---

## 13. FAQ

**Q. SPA 라우팅 시 매번 다시 주입해야 하나요?**
아니요. 한 번만 삽입되면 라우트 변경에도 유지됩니다.

**Q. iframe 대신 인라인 DOM 으로 쓸 수 있나요?**
호스트 CSS 오염 위험이 있어 기본은 iframe. 필요 시 `data-mode="inline"` 옵션을 요청하세요(로드맵).

**Q. 우리 API 로 프록시 할 수 있나요?**
`data-api-endpoint` 옵션으로 커스텀 엔드포인트 지정 가능. 자체 호스팅 플랜에서 지원.

**Q. 위젯 도메인을 우리 서브도메인으로 쓰고 싶어요.**
`feedback.our-domain.com` → `widget.example.com` 으로 CNAME. 관리자에게 문의.

**Q. reCAPTCHA 는 언제 활성화되나요?**
스팸 임계 초과 시 자동. 수동 강제는 Settings → Widget → "Require CAPTCHA".

---

## 14. 지원

- 문서: https://docs.example.com/widget
- 이슈 제보: support@example.com
- 상태 페이지: https://status.example.com

---

## 부록 A. 스니펫 복사용

```html
<!-- Feedback Widget -->
<script
  src="https://widget.example.com/embed.js"
  data-app-id="YOUR_APP_ID"
  data-position="bottom-right"
  data-accent="#0A84FF"
  data-locale="auto"
  async defer
></script>
```
