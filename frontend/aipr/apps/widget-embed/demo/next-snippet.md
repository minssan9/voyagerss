# Next.js 설치 예제

```tsx
// app/layout.tsx (App Router)
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Script
          src="https://widget.example.com/embed.js"
          data-app-id="your-app-id"
          data-locale="ko"
          data-accent="#0A84FF"
          strategy="lazyOnload"
          onLoad={() => {
            // identify logged-in user
            (window as any).Feedback?.identify({ email: 'user@example.com' });
          }}
        />
      </body>
    </html>
  );
}
```

Hook으로 래핑:

```tsx
// hooks/useFeedback.ts
'use client';
import { useEffect } from 'react';

declare global {
  interface Window {
    Feedback: {
      open: () => void;
      close: () => void;
      toggle: () => void;
      identify: (ctx: Record<string, unknown>) => void;
      on: (event: string, fn: (p?: unknown) => void) => void;
    };
  }
}

export function useFeedback() {
  useEffect(() => {
    window.Feedback?.on('submitted', (p) => {
      console.log('Issue created:', (p as any)?.issueId);
    });
  }, []);

  return {
    open:     () => window.Feedback?.open(),
    close:    () => window.Feedback?.close(),
    identify: (ctx: Record<string, unknown>) => window.Feedback?.identify(ctx),
  };
}
```
