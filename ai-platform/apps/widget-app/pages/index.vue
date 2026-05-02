<script setup lang="ts">
import { z } from 'zod';

const config = useRuntimeConfig();
const { t } = useI18n();
const { send, onMessage } = usePostMessage();

// ── Schema ────────────────────────────────────────────────────────────────────
const Schema = z.object({
  title:         z.string().min(1),
  body:          z.string().min(10),
  reporterEmail: z.string().email().optional().or(z.literal('')),
});

// ── State ─────────────────────────────────────────────────────────────────────
const form = reactive({ title: '', body: '', reporterEmail: '' });
const errors = reactive<Record<string, string>>({ title: '', body: '', reporterEmail: '', file: '' });
const file    = ref<File | null>(null);
const submitting = ref(false);
const submitted  = ref(false);

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(() => {
  send({ type: 'ready' });

  // Close on Esc from parent
  onMessage((e) => {
    if (e.data?.type === 'close') { /* parent-initiated close */ }
  });

  // Keyboard Esc inside iframe
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') send({ type: 'close' });
  });

  // Notify parent of height changes
  const ro = new ResizeObserver(() => {
    send({ type: 'resize', payload: { height: document.body.scrollHeight } });
  });
  ro.observe(document.body);
  onUnmounted(() => ro.disconnect());
});

// ── File handling ─────────────────────────────────────────────────────────────
function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null;
  errors.file = '';
  if (f) {
    if (!f.type.startsWith('image/')) { errors.file = t('errorFile'); file.value = null; return; }
    if (f.size > 10 * 1024 * 1024)    { errors.file = t('errorFile'); file.value = null; return; }
  }
  file.value = f;
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submit() {
  // Reset errors
  Object.keys(errors).forEach((k) => (errors[k] = ''));

  const parsed = Schema.safeParse(form);
  if (!parsed.success) {
    for (const [field, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      errors[field] = msgs?.[0] ?? '';
    }
    return;
  }

  submitting.value = true;
  try {
    let attachmentS3Keys: { s3Key: string; mime: string; size: number }[] = [];

    // 1. Upload screenshot via presigned URL
    if (file.value) {
      const presignRes = await $fetch<{ uploadUrl: string; s3Key: string; mime: string }>(
        `${config.public.apiUrl}/api/feedback/presign`,
        {
          method: 'POST',
          body: { filename: file.value.name, mime: file.value.type, size: file.value.size },
        },
      );
      await fetch(presignRes.uploadUrl, { method: 'PUT', body: file.value });
      attachmentS3Keys = [{ s3Key: presignRes.s3Key, mime: presignRes.mime, size: file.value.size }];
    }

    // 2. Submit feedback
    const res = await $fetch<{ id: string; status: string }>(
      `${config.public.apiUrl}/api/feedback`,
      {
        method: 'POST',
        body: {
          ...parsed.data,
          reporterEmail: parsed.data.reporterEmail || undefined,
          attachmentS3Keys,
        },
      },
    );

    submitted.value = true;
    send({ type: 'submitted', payload: { issueId: res.id } });
    setTimeout(() => send({ type: 'close' }), 2000);
  } catch (err: unknown) {
    console.error(err);
    errors.body = 'Submission failed. Please try again.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="widget-root" role="dialog" aria-modal="true" :aria-label="t('title')">
    <!-- Header -->
    <header class="widget-header">
      <h1 class="widget-title">{{ t('title') }}</h1>
      <button
        class="btn-close"
        :aria-label="t('close')"
        @click="send({ type: 'close' })"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </header>

    <!-- Success state -->
    <div v-if="submitted" class="success-state" role="status" aria-live="polite">
      <svg class="success-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="11" stroke="var(--color-success)" stroke-width="1.5"/>
        <path d="M7 12l3.5 3.5L17 8" stroke="var(--color-success)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>{{ t('success') }}</p>
    </div>

    <!-- Form -->
    <form v-else class="widget-form" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="fb-title">{{ t('labelTitle') }} <span aria-hidden="true">*</span></label>
        <input
          id="fb-title"
          v-model="form.title"
          type="text"
          :class="{ error: errors.title }"
          maxlength="200"
          autocomplete="off"
          :aria-describedby="errors.title ? 'err-title' : undefined"
          :aria-invalid="!!errors.title"
        />
        <span id="err-title" class="error-msg" role="alert">{{ errors.title }}</span>
      </div>

      <div class="field">
        <label for="fb-body">{{ t('labelBody') }} <span aria-hidden="true">*</span></label>
        <textarea
          id="fb-body"
          v-model="form.body"
          rows="5"
          :class="{ error: errors.body }"
          maxlength="10000"
          :aria-describedby="errors.body ? 'err-body' : undefined"
          :aria-invalid="!!errors.body"
        />
        <span id="err-body" class="error-msg" role="alert">{{ errors.body }}</span>
      </div>

      <div class="field">
        <label for="fb-email">{{ t('labelEmail') }}</label>
        <input
          id="fb-email"
          v-model="form.reporterEmail"
          type="email"
          :class="{ error: errors.reporterEmail }"
          autocomplete="email"
          :aria-describedby="errors.reporterEmail ? 'err-email' : undefined"
          :aria-invalid="!!errors.reporterEmail"
        />
        <span id="err-email" class="error-msg" role="alert">{{ errors.reporterEmail }}</span>
      </div>

      <div class="field">
        <label for="fb-file">{{ t('labelFile') }}</label>
        <input
          id="fb-file"
          type="file"
          accept="image/*"
          class="file-input"
          :aria-describedby="errors.file ? 'err-file' : undefined"
          @change="onFileChange"
        />
        <span v-if="file" class="file-name">📎 {{ file.name }}</span>
        <span id="err-file" class="error-msg" role="alert">{{ errors.file }}</span>
      </div>

      <button
        type="submit"
        class="btn btn-primary"
        :disabled="submitting"
        :aria-busy="submitting"
      >
        {{ submitting ? t('submitting') : t('submit') }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.widget-root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 20px;
  background: var(--color-bg);
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.widget-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

.btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: var(--color-surface);
  color: var(--color-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-close:hover { background: var(--color-border); color: var(--color-text); }

.widget-form { display: flex; flex-direction: column; gap: 16px; }

.file-input {
  padding: 8px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
  color: var(--color-muted);
}

.file-name {
  font-size: 12px;
  color: var(--color-muted);
  margin-top: -8px;
}

/* ── Success ─────────────────────────────────────────────────────────── */
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex: 1;
  text-align: center;
  color: var(--color-text);
  padding: 40px 0;
}

.success-icon { width: 48px; height: 48px; }
</style>
