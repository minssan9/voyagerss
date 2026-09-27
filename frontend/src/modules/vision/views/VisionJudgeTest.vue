<template>
  <div class="page-vision">
    <header class="page-vision__header">
      <h1 class="page-vision__title">{{ t('vision.judge.title') }}</h1>
      <p class="page-vision__lead">{{ t('vision.judge.lead') }}</p>
    </header>

    <div class="page-vision__actions">
      <q-btn outline no-caps :label="t('vision.judge.config')" @click="router.push('/vision')" />
      <q-btn outline no-caps :label="t('vision.judge.refreshRecords')" :loading="isLoadingRecords" @click="loadRecords" />
    </div>

    <q-banner v-if="healthMessage" rounded :class="healthOk ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'">
      {{ healthMessage }}
    </q-banner>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-5">
        <q-card flat bordered>
          <q-card-section class="q-gutter-md">
            <q-file v-model="imageFile" outlined dense :label="t('vision.judge.image')" accept="image/*" />
            <q-input v-model="question" outlined dense :label="t('vision.judge.question')" />
            <q-btn-toggle
              v-model="mode"
              no-caps
              spread
              unelevated
              toggle-color="primary"
              :options="modeOptions"
            />
            <q-input v-if="mode === 'choice'" v-model="choices" outlined dense :label="t('vision.judge.choices')" />
            <q-btn color="primary" unelevated no-caps :label="t('vision.judge.submit')" :loading="isJudging" @click="submitJudge" />
            <q-banner v-if="judgeMessage" rounded :class="judgeOk ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'">
              {{ judgeMessage }}
            </q-banner>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-7">
        <q-card flat bordered>
          <q-card-section>
            <div class="page-vision__card-title">{{ t('vision.judge.recentRecords') }}</div>
            <p v-if="recordsMessage" class="page-vision__meta">{{ recordsMessage }}</p>
            <div v-for="record in records" :key="record.id" class="page-vision__record">
              <img class="page-vision__thumb" :src="imageSrc(record.image_filename)" :alt="record.question" />
              <div>
                <div class="page-vision__meta">#{{ record.id }} · {{ record.endpoint }} · {{ record.created_at }}</div>
                <div>{{ record.question }}</div>
                <div v-if="record.choices" class="page-vision__meta">{{ record.choices.join(', ') }}</div>
                <div>{{ formatResult(record.result) }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  getJudgeHealth,
  listJudgeRecords,
  postJudgeBool,
  postJudgeChoice,
  visionAssetUrl,
  type JudgeRecord,
} from '@/modules/vision/api/api-vision'

const router = useRouter()
const { t } = useI18n()
const imageFile = ref<File | null>(null)
const question = ref('')
const choices = ref('yes,no')
const mode = ref<'bool' | 'choice'>('bool')
const isJudging = ref(false)
const isLoadingRecords = ref(false)
const judgeOk = ref(false)
const judgeMessage = ref('')
const healthOk = ref(false)
const healthMessage = ref('')
const records = ref<JudgeRecord[]>([])
const recordsMessage = ref('')

const modeOptions = computed(() => [
  { label: t('vision.judge.modeBool'), value: 'bool' },
  { label: t('vision.judge.modeChoice'), value: 'choice' },
])

function imageSrc(filename: string): string {
  return visionAssetUrl(`/vision/judge/images/${encodeURIComponent(filename)}`)
}

function formatResult(result: Record<string, number>): string {
  return Object.entries(result)
    .map(([key, value]) => `${key}: ${(Number(value) * 100).toFixed(1)}%`)
    .join(' · ')
}

async function loadHealth() {
  const health = await getJudgeHealth()
  healthOk.value = health.result === 'SUCCESS'
  if (health.result === 'SUCCESS' && health.data) {
    healthMessage.value = `${health.data.device} · ${health.data.model_name}`
  } else {
    healthMessage.value = health.message
  }
}

async function loadRecords() {
  isLoadingRecords.value = true
  const listed = await listJudgeRecords()
  isLoadingRecords.value = false
  if (listed.result === 'SUCCESS' && listed.data) {
    records.value = listed.data
    recordsMessage.value = listed.data.length === 0 ? t('vision.judge.noRecords') : ''
  } else {
    records.value = []
    recordsMessage.value = listed.message
  }
}

async function submitJudge() {
  judgeMessage.value = ''
  if (!imageFile.value) {
    judgeOk.value = false
    judgeMessage.value = t('vision.judge.selectImage')
    return
  }
  isJudging.value = true
  if (mode.value === 'bool') {
    const result = await postJudgeBool(imageFile.value, question.value)
    judgeOk.value = result.result === 'SUCCESS'
    if (result.result === 'SUCCESS' && result.data) {
      judgeMessage.value = t('vision.judge.yesProbability', {
        percent: (result.data.probability * 100).toFixed(1),
      })
    } else {
      judgeMessage.value = result.message
    }
  } else {
    const result = await postJudgeChoice(imageFile.value, question.value, choices.value)
    judgeOk.value = result.result === 'SUCCESS'
    if (result.result === 'SUCCESS' && result.data) {
      judgeMessage.value = formatResult(result.data.probabilities)
    } else {
      judgeMessage.value = result.message
    }
  }
  isJudging.value = false
  if (judgeOk.value) {
    await loadRecords()
  }
}

onMounted(async () => {
  await Promise.all([loadHealth(), loadRecords()])
})
</script>
