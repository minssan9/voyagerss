<template>
  <div class="page-vision">
    <header class="page-vision__header">
      <h1 class="page-vision__title">{{ t('vision.home.title') }}</h1>
      <p class="page-vision__lead">{{ t('vision.home.lead') }}</p>
    </header>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-card flat bordered class="page-vision__card">
          <q-card-section>
            <div class="page-vision__card-title">{{ t('vision.home.camTitle') }}</div>
            <q-input v-model="camBaseUrl" outlined dense :label="t('vision.home.baseUrl')" class="q-mt-sm" />
            <q-banner v-if="camMessage" class="q-mt-sm" rounded :class="camOk ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'">
              {{ camMessage }}
            </q-banner>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-6">
        <q-card flat bordered class="page-vision__card">
          <q-card-section>
            <div class="page-vision__card-title">{{ t('vision.home.judgeTitle') }}</div>
            <q-input v-model="judgeBaseUrl" outlined dense :label="t('vision.home.baseUrl')" class="q-mt-sm" />
            <q-banner v-if="judgeMessage" class="q-mt-sm" rounded :class="judgeOk ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'">
              {{ judgeMessage }}
            </q-banner>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="page-vision__actions">
      <q-btn color="primary" unelevated no-caps :label="t('vision.home.saveAndCheck')" :loading="isSaving" @click="saveAndCheck" />
      <q-btn outline no-caps :label="t('vision.home.camTest')" @click="router.push('/vision/cam')" />
      <q-btn outline no-caps :label="t('vision.home.judgeTest')" @click="router.push('/vision/judge')" />
      <q-btn outline no-caps :label="t('vision.home.liveTest')" @click="router.push('/vision/live')" />
    </div>
    <q-banner v-if="saveMessage" rounded class="bg-red-1 text-red-10">{{ saveMessage }}</q-banner>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getCamStatus, getJudgeHealth, getVisionConfig, saveVisionConfig } from '@/modules/vision/api/api-vision'

const router = useRouter()
const { t } = useI18n()
const camBaseUrl = ref('http://127.0.0.1:8080')
const judgeBaseUrl = ref('http://127.0.0.1:8000')
const camMessage = ref('')
const judgeMessage = ref('')
const camOk = ref(false)
const judgeOk = ref(false)
const saveMessage = ref('')
const isSaving = ref(false)

async function loadConfig() {
  const config = await getVisionConfig()
  if (config.result === 'SUCCESS' && config.data) {
    camBaseUrl.value = config.data.camBaseUrl
    judgeBaseUrl.value = config.data.judgeBaseUrl
    saveMessage.value = ''
  } else {
    saveMessage.value = config.message
  }
}

async function checkCam() {
  const status = await getCamStatus()
  camOk.value = status.result === 'SUCCESS'
  if (status.result === 'SUCCESS') {
    const fps = status.data && typeof status.data.fps === 'number' ? status.data.fps : null
    camMessage.value = fps === null
      ? t('vision.home.connected')
      : t('vision.home.connectedWithFps', { fps })
  } else {
    camMessage.value = status.message
  }
}

async function checkJudge() {
  const health = await getJudgeHealth()
  judgeOk.value = health.result === 'SUCCESS'
  if (health.result === 'SUCCESS' && health.data) {
    judgeMessage.value = t('vision.home.connectedWithDevice', {
      device: health.data.device,
      model: health.data.model_name,
    })
  } else {
    judgeMessage.value = health.message
  }
}

async function saveAndCheck() {
  isSaving.value = true
  saveMessage.value = ''
  const saved = await saveVisionConfig({
    camBaseUrl: camBaseUrl.value,
    judgeBaseUrl: judgeBaseUrl.value,
  })
  isSaving.value = false
  if (saved.result !== 'SUCCESS' || !saved.data) {
    saveMessage.value = saved.message
    return
  }
  camBaseUrl.value = saved.data.camBaseUrl
  judgeBaseUrl.value = saved.data.judgeBaseUrl
  await Promise.all([checkCam(), checkJudge()])
}

onMounted(async () => {
  await loadConfig()
  await Promise.all([checkCam(), checkJudge()])
})
</script>
