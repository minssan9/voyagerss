# Nuxt3 설치 예제

`nuxt.config.ts`에 embed.js를 script로 추가:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      script: [
        {
          src: 'https://widget.example.com/embed.js',
          'data-app-id': 'your-app-id',
          'data-locale': 'ko',
          'data-accent': '#0A84FF',
          defer: true,
        },
      ],
    },
  },
})
```

composable로 래핑해서 사용:

```ts
// composables/useFeedback.ts
export function useFeedback() {
  const open  = () => (window as any).Feedback?.open();
  const close = () => (window as any).Feedback?.close();

  const identify = (ctx: Record<string, unknown>) =>
    (window as any).Feedback?.identify(ctx);

  onMounted(() => {
    (window as any).Feedback?.on('submitted', (p: { issueId: string }) => {
      console.log('Issue created:', p.issueId);
    });
  });

  return { open, close, identify };
}
```

```vue
<!-- pages/index.vue -->
<script setup lang="ts">
const { open, identify } = useFeedback();
const { data: user } = useAuth(); // your auth composable

onMounted(() => {
  if (user.value) identify({ email: user.value.email });
});
</script>

<template>
  <button @click="open">피드백 보내기</button>
</template>
```
