<template>
  <div class="cl-page cd-page">
    <ConsultingHeader scrolled />

    <!-- 안내 -->
    <section class="cd-hero">
      <div class="cl-container">
        <p class="cl-eyebrow">{{ t('consulting.documents.eyebrow') }}</p>
        <h1 class="cd-hero__title">{{ t('consulting.documents.title') }}</h1>
        <p class="cd-hero__subtitle">{{ t('consulting.documents.subtitle') }}</p>
      </div>
    </section>

    <section class="cl-container cd-guide">
      <article
        v-for="group in guideGroups"
        :key="group.key"
        class="cd-guide__card"
        :class="{ 'is-selected': form.type === group.type }"
      >
        <header class="cd-guide__head">
          <q-icon :name="group.icon" size="26px" class="cd-guide__icon" />
          <div>
            <h2 class="cd-guide__title">{{ group.title }}</h2>
            <p class="cd-guide__desc">{{ group.desc }}</p>
          </div>
        </header>
        <ul class="cd-guide__list">
          <li v-for="(item, i) in group.items" :key="i" class="cd-guide__item">
            <span class="cd-tag" :class="`cd-tag--${item.level}`">{{ t(`consulting.documents.${item.level}`) }}</span>
            <div>
              <strong>{{ item.name }}</strong>
              <span class="cd-guide__note">{{ item.note }}</span>
            </div>
          </li>
        </ul>
        <button type="button" class="cl-btn cl-btn--outline cl-btn--sm cd-guide__pick" @click="pickType(group.type)">
          {{ t('consulting.documents.form.submit') }} →
        </button>
      </article>
    </section>

    <section class="cl-container">
      <ul class="cd-tips">
        <li v-for="(tip, i) in tips" :key="i"><q-icon name="shield" size="18px" /> {{ tip }}</li>
      </ul>
    </section>

    <!-- 제출 폼 -->
    <section id="submit" class="cl-container cd-form-wrap">
      <div class="cd-form-card">
        <template v-if="result">
          <div class="cd-success" role="status">
            <q-icon name="check_circle" size="48px" class="cd-success__icon" />
            <h2>{{ t('consulting.documents.form.success') }}</h2>
            <p>{{ t('consulting.documents.form.successDesc', { id: result.id, count: result.fileCount, email: submittedEmail }) }}</p>
            <button type="button" class="cl-btn cl-btn--outline" @click="reset">{{ t('consulting.documents.form.again') }}</button>
          </div>
        </template>

        <form v-else class="cd-form" novalidate @submit.prevent="onSubmit">
          <header class="cd-form__head">
            <h2>{{ t('consulting.documents.form.title') }}</h2>
            <p>{{ t('consulting.documents.form.subtitle') }}</p>
          </header>

          <fieldset class="cd-field">
            <legend class="cd-label">{{ t('consulting.documents.form.type') }} *</legend>
            <div class="cd-segment" role="radiogroup">
              <label v-for="g in guideGroups" :key="g.type" class="cd-segment__opt" :class="{ 'is-on': form.type === g.type }">
                <input v-model="form.type" type="radio" name="type" :value="g.type" />
                <q-icon :name="g.icon" size="18px" /> {{ g.title }}
              </label>
            </div>
          </fieldset>

          <div class="cd-grid">
            <label class="cd-field">
              <span class="cd-label">{{ t('consulting.documents.form.companyName') }} *</span>
              <input v-model.trim="form.companyName" class="cd-input" maxlength="200" autocomplete="organization" required />
            </label>
            <label class="cd-field">
              <span class="cd-label">{{ t('consulting.documents.form.contactName') }} *</span>
              <input v-model.trim="form.contactName" class="cd-input" maxlength="100" autocomplete="name" required />
            </label>
            <label class="cd-field">
              <span class="cd-label">{{ t('consulting.documents.form.email') }} *</span>
              <input v-model.trim="form.email" type="email" class="cd-input" maxlength="255" autocomplete="email" required />
            </label>
            <label class="cd-field">
              <span class="cd-label">{{ t('consulting.documents.form.phone') }}</span>
              <input v-model.trim="form.phone" type="tel" class="cd-input" maxlength="50" autocomplete="tel" />
            </label>
          </div>

          <label class="cd-field">
            <span class="cd-label">{{ t('consulting.documents.form.message') }}</span>
            <textarea v-model="form.message" class="cd-input cd-input--area" rows="4" maxlength="5000" :placeholder="t('consulting.documents.form.messagePlaceholder')" />
          </label>

          <!-- 봇 차단용 숨김 필드 -->
          <input v-model="form.website" class="cd-hp" tabindex="-1" autocomplete="off" aria-hidden="true" name="website" />

          <div class="cd-field">
            <span class="cd-label">{{ t('consulting.documents.form.files') }} *</span>
            <div
              class="cd-drop"
              :class="{ 'is-over': dragOver }"
              @dragover.prevent="dragOver = true"
              @dragleave.prevent="dragOver = false"
              @drop.prevent="onDrop"
            >
              <q-icon name="cloud_upload" size="36px" class="cd-drop__icon" />
              <p>
                {{ t('consulting.documents.form.drop') }}
                <button type="button" class="cd-drop__browse" @click="fileInput?.click()">{{ t('consulting.documents.form.browse') }}</button>
              </p>
              <p class="cd-drop__hint">
                {{ t('consulting.documents.form.limits', { count: SUBMISSION_LIMITS.maxFiles, file: mb(SUBMISSION_LIMITS.maxFileBytes), total: mb(SUBMISSION_LIMITS.maxTotalBytes) }) }}
              </p>
              <p class="cd-drop__hint">{{ t('consulting.documents.form.allowed', { ext: SUBMISSION_LIMITS.extensions.join(' ') }) }}</p>
              <input ref="fileInput" type="file" multiple class="cd-hp" :accept="SUBMISSION_LIMITS.extensions.join(',')" @change="onPick" />
            </div>

            <ul v-if="files.length" class="cd-files">
              <li v-for="(f, i) in files" :key="`${f.name}-${f.size}-${i}`" class="cd-files__item">
                <q-icon name="description" size="18px" />
                <span class="cd-files__name">{{ f.name }}</span>
                <span class="cd-files__size">{{ formatBytes(f.size) }}</span>
                <button type="button" class="cd-files__remove" :aria-label="t('consulting.documents.form.remove')" @click="removeFile(i)">✕</button>
              </li>
              <li class="cd-files__total">{{ files.length }} / {{ SUBMISSION_LIMITS.maxFiles }} · {{ formatBytes(totalBytes) }}</li>
            </ul>
          </div>

          <label class="cd-consent">
            <input v-model="form.consent" type="checkbox" />
            <span>
              {{ t('consulting.documents.form.consent') }}
              <router-link to="/privacy-policy" target="_blank">{{ t('consulting.documents.form.privacy') }}</router-link>
            </span>
          </label>

          <p v-if="errorMessage" class="cd-error" role="alert">{{ errorMessage }}</p>

          <button type="submit" class="cl-btn cl-btn--primary cd-submit" :disabled="submitting">
            <span v-if="submitting">{{ t('consulting.documents.form.submitting', { percent: progress }) }}</span>
            <span v-else>{{ t('consulting.documents.form.submit') }}</span>
          </button>
        </form>
      </div>
    </section>

    <ConsultingFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import ConsultingHeader from '@/components/landing/ConsultingHeader.vue'
import ConsultingFooter from '@/components/landing/ConsultingFooter.vue'
import { resolveMessages } from '@/utils/i18n-resolve'
import { SUBMISSION_LIMITS, submitConsultingDocuments, type SubmissionType } from '@/api/consulting/consulting-api'

interface DocItem { name: string; note: string; level: 'required' | 'optional' }

const { t, tm, rt, locale } = useI18n()
const route = useRoute()
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const guideGroups = computed(() => [
  {
    key: 'company',
    type: 'COMPANY' as SubmissionType,
    icon: 'apartment',
    title: t('consulting.documents.company.title'),
    desc: t('consulting.documents.company.desc'),
    items: resolveMessages<DocItem[]>(tm, rt, 'consulting.documents.company.items')
  },
  {
    key: 'system',
    type: 'SYSTEM' as SubmissionType,
    icon: 'dns',
    title: t('consulting.documents.system.title'),
    desc: t('consulting.documents.system.desc'),
    items: resolveMessages<DocItem[]>(tm, rt, 'consulting.documents.system.items')
  }
])
const tips = computed(() => resolveMessages<string[]>(tm, rt, 'consulting.documents.tips'))

// ?type=system 으로 들어오면 시스템 분석 선택
const initialType: SubmissionType = String(route.query.type ?? '').toUpperCase() === 'SYSTEM' ? 'SYSTEM' : 'COMPANY'
const form = reactive({
  type: initialType,
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  message: '',
  consent: false,
  website: ''
})
const files = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const submitting = ref(false)
const progress = ref(0)
const errorMessage = ref('')
const result = ref<{ id: number; fileCount: number } | null>(null)
const submittedEmail = ref('')

const totalBytes = computed(() => files.value.reduce((sum, f) => sum + f.size, 0))
const mb = (bytes: number) => Math.round(bytes / 1024 / 1024)
const extOf = (name: string) => (name.lastIndexOf('.') >= 0 ? name.slice(name.lastIndexOf('.')).toLowerCase() : '')

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function pickType(type: SubmissionType) {
  form.type = type
  document.getElementById('submit')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** 파일 추가 시점에 형식·크기·개수를 검사해 바로 알려준다 */
function addFiles(list: FileList | null) {
  errorMessage.value = ''
  for (const f of Array.from(list ?? [])) {
    if (!(SUBMISSION_LIMITS.extensions as readonly string[]).includes(extOf(f.name))) {
      errorMessage.value = t('consulting.documents.form.errors.fileType', { name: f.name })
      continue
    }
    if (f.size > SUBMISSION_LIMITS.maxFileBytes) {
      errorMessage.value = t('consulting.documents.form.errors.fileSize', { mb: mb(SUBMISSION_LIMITS.maxFileBytes), name: f.name })
      continue
    }
    if (files.value.length >= SUBMISSION_LIMITS.maxFiles) {
      errorMessage.value = t('consulting.documents.form.errors.tooManyFiles', { count: SUBMISSION_LIMITS.maxFiles })
      break
    }
    if (files.value.some((x) => x.name === f.name && x.size === f.size)) continue
    files.value.push(f)
  }
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  addFiles(input.files)
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  addFiles(e.dataTransfer?.files ?? null)
}

function removeFile(i: number) {
  files.value.splice(i, 1)
}

function validate(): string {
  if (!form.companyName || !form.contactName || !form.email) return t('consulting.documents.form.errors.required')
  if (!EMAIL_PATTERN.test(form.email)) return t('consulting.documents.form.errors.email')
  if (!files.value.length) return t('consulting.documents.form.errors.noFiles')
  if (totalBytes.value > SUBMISSION_LIMITS.maxTotalBytes) {
    return t('consulting.documents.form.errors.totalSize', { mb: mb(SUBMISSION_LIMITS.maxTotalBytes) })
  }
  if (!form.consent) return t('consulting.documents.form.errors.consent')
  return ''
}

async function onSubmit() {
  errorMessage.value = validate()
  if (errorMessage.value) return

  submitting.value = true
  progress.value = 0
  try {
    result.value = await submitConsultingDocuments(
      { ...form, locale: locale.value, files: files.value },
      (p) => { progress.value = p }
    )
    submittedEmail.value = form.email
  } catch (e: any) {
    // 서버 검증 메시지(i18n)가 있으면 그대로, 없으면 공통 메시지
    errorMessage.value = e?.response?.data?.message || t('consulting.documents.form.errors.server')
  } finally {
    submitting.value = false
  }
}

function reset() {
  result.value = null
  files.value = []
  form.message = ''
  form.consent = false
  progress.value = 0
}
</script>
