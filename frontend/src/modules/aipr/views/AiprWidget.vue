<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { z } from 'zod';
import api from '../api/api-aipr';

const route = useRoute();

// ── Localized Strings ────────────────────────────────────────────────────────
const strings = {
  ko: {
    title: '피드백 보내기',
    close: '닫기',
    success: '피드백이 성공적으로 전송되었습니다. 감사합니다!',
    submit: '보내기',
    submitting: '전송 중...',
    labelTitle: '제목',
    labelBody: '내용 (최소 10자)',
    labelEmail: '이메일 주소 (선택사항)',
    labelFile: '스크린샷 첨부 (선택사항)',
    errorFile: '10MB 이하의 이미지 파일만 첨부 가능합니다.',
  },
  en: {
    title: 'Send Feedback',
    close: 'Close',
    success: 'Feedback submitted successfully. Thank you!',
    submit: 'Submit',
    submitting: 'Submitting...',
    labelTitle: 'Title',
    labelBody: 'Description (min 10 chars)',
    labelEmail: 'Email address (optional)',
    labelFile: 'Attach screenshot (optional)',
    errorFile: 'Only image files up to 10MB are allowed.',
  }
};

const locale = computed(() => {
  const q = route.query.locale as string;
  return (q === 'en' || q === 'ko') ? q : 'ko';
});

const t = (key: keyof typeof strings.ko) => {
  return strings[locale.value][key] || strings.en[key];
};

// ── Schema ────────────────────────────────────────────────────────────────────
const Schema = z.object({
  title:         z.string().min(1),
  body:          z.string().min(10),
  reporterEmail: z.string().email().optional().or(z.literal('')),
});

// ── State ─────────────────────────────────────────────────────────────────────
const form = reactive({ title: '', body: '', reporterEmail: (route.query.email as string) || '' });
const errors = reactive<Record<string, string>>({ title: '', body: '', reporterEmail: '', file: '' });
const file = ref<File | null>(null);
const isSubmitting = ref(false);
const isSubmitted = ref(false);

// ── PostMessage helper ────────────────────────────────────────────────────────
function sendToParent(msg: { type: string; payload?: any }) {
  window.parent.postMessage(msg, '*');
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  sendToParent({ type: 'ready' });

  // Keyboard Esc to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') sendToParent({ type: 'close' });
  });

  // Notify parent of height updates
  resizeObserver = new ResizeObserver(() => {
    sendToParent({
      type: 'resize',
      payload: { height: document.body.scrollHeight }
    });
  });
  resizeObserver.observe(document.body);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// ── File handling ─────────────────────────────────────────────────────────────
function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null;
  errors.file = '';
  if (f) {
    if (!f.type.startsWith('image/')) {
      errors.file = t('errorFile');
      file.value = null;
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      errors.file = t('errorFile');
      file.value = null;
      return;
    }
  }
  file.value = f;
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleFormSubmit() {
  errors.title = '';
  errors.body = '';
  errors.reporterEmail = '';
  errors.file = '';

  const parsed = Schema.safeParse(form);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    if (fieldErrors.title) errors.title = fieldErrors.title[0];
    if (fieldErrors.body) errors.body = fieldErrors.body[0];
    if (fieldErrors.reporterEmail) errors.reporterEmail = fieldErrors.reporterEmail[0];
    return;
  }

  isSubmitting.value = true;
  try {
    let attachmentS3Keys: { s3Key: string; mime: string; size: number }[] = [];

    // 1. Get S3 presigned URL and upload file if present
    if (file.value) {
      const presignRes = await api.post<{ uploadUrl: string; s3Key: string; mime: string }>(
        '/feedback/presign',
        { filename: file.value.name, mime: file.value.type, size: file.value.size }
      );
      await fetch(presignRes.uploadUrl, { method: 'PUT', body: file.value });
      attachmentS3Keys = [{ s3Key: presignRes.s3Key, mime: presignRes.mime, size: file.value.size }];
    }

    // 2. Submit issue to API
    const res = await api.post<{ id: string; status: string }>('/feedback', {
      ...parsed.data,
      reporterEmail: parsed.data.reporterEmail || undefined,
      attachmentS3Keys,
    });

    isSubmitted.value = true;
    sendToParent({ type: 'submitted', payload: { issueId: res.id } });
    setTimeout(() => sendToParent({ type: 'close' }), 2000);
  } catch (err: any) {
    errors.body = err.message || 'Submission failed. Please try again.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="widget-root" role="dialog" aria-modal="true" :aria-label="t('title')">
    <header class="widget-header">
      <h1 class="widget-title">{{ t('title') }}</h1>
      <button
        class="btn-close"
        :aria-label="t('close')"
        @click="sendToParent({ type: 'close' })"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </header>

    <!-- Success -->
    <div v-if="isSubmitted" class="success-state" role="status" aria-live="polite">
      <svg class="success-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="11" stroke="#30d158" stroke-width="1.5"/>
        <path d="M7 12l3.5 3.5L17 8" stroke="#30d158" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p class="success-msg">{{ t('success') }}</p>
    </div>

    <!-- Form -->
    <form v-else class="widget-form" novalidate @submit.prevent="handleFormSubmit">
      <div class="field">
        <label for="fb-title" class="label">{{ t('labelTitle') }} <span aria-hidden="true">*</span></label>
        <input
          id="fb-title"
          v-model="form.title"
          type="text"
          :class="['input', { 'error-input': errors.title }]"
          maxlength="200"
          autocomplete="off"
          :aria-describedby="errors.title ? 'err-title' : undefined"
          :aria-invalid="!!errors.title"
        />
        <span id="err-title" class="error-msg" role="alert" v-if="errors.title">{{ errors.title }}</span>
      </div>

      <div class="field">
        <label for="fb-body" class="label">{{ t('labelBody') }} <span aria-hidden="true">*</span></label>
        <textarea
          id="fb-body"
          v-model="form.body"
          rows="5"
          :class="['textarea', { 'error-input': errors.body }]"
          maxlength="10000"
          :aria-describedby="errors.body ? 'err-body' : undefined"
          :aria-invalid="!!errors.body"
        />
        <span id="err-body" class="error-msg" role="alert" v-if="errors.body">{{ errors.body }}</span>
      </div>

      <div class="field">
        <label for="fb-email" class="label">{{ t('labelEmail') }}</label>
        <input
          id="fb-email"
          v-model="form.reporterEmail"
          type="email"
          :class="['input', { 'error-input': errors.reporterEmail }]"
          autocomplete="email"
          :aria-describedby="errors.reporterEmail ? 'err-email' : undefined"
          :aria-invalid="!!errors.reporterEmail"
        />
        <span id="err-email" class="error-msg" role="alert" v-if="errors.reporterEmail">{{ errors.reporterEmail }}</span>
      </div>

      <div class="field">
        <label for="fb-file" class="label">{{ t('labelFile') }}</label>
        <input
          id="fb-file"
          type="file"
          accept="image/*"
          class="file-input"
          :aria-describedby="errors.file ? 'err-file' : undefined"
          @change="onFileChange"
        />
        <span v-if="file" class="file-name">📎 {{ file.name }}</span>
        <span id="err-file" class="error-msg" role="alert" v-if="errors.file">{{ errors.file }}</span>
      </div>

      <button
        type="submit"
        class="btn-submit"
        :disabled="isSubmitting"
        :aria-busy="isSubmitting"
      >
        {{ isSubmitting ? t('submitting') : t('submit') }}
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
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #1c1c1e;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.widget-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #1c1c1e;
}

.btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: #f2f2f7;
  color: #8e8e93;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.btn-close:hover {
  background: #e5e5ea;
  color: #1c1c1e;
}

.widget-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: #3a3a3c;
}

.input, .textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d1d6;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
  background-color: #ffffff;
  color: #1c1c1e;
}

.input:focus, .textarea:focus {
  border-color: #007aff;
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
}

.error-input {
  border-color: #ff3b30;
}

.error-input:focus {
  border-color: #ff3b30;
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.15);
}

.error-msg {
  font-size: 12px;
  color: #ff3b30;
}

.file-input {
  padding: 4px 0;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  color: #8e8e93;
}

.file-name {
  font-size: 12px;
  color: #8e8e93;
  margin-top: -4px;
}

.btn-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 44px;
  border: none;
  border-radius: 8px;
  background-color: #007aff;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-submit:hover:not(:disabled) {
  background-color: #0062cc;
}

.btn-submit:disabled {
  background-color: #aeaeb2;
  cursor: not-allowed;
}

.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex: 1;
  text-align: center;
  padding: 40px 0;
}

.success-icon {
  width: 48px;
  height: 48px;
}

.success-msg {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: #1c1c1e;
}
</style>
