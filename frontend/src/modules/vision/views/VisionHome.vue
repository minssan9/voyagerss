<template>
  <div class="page-vision">
    <header class="page-vision__header">
      <h1 class="page-vision__title">Vision 구성</h1>
      <p class="page-vision__lead">실행 중인 vision_cam, vision_judge 프로세스 주소를 저장하고 연결을 확인합니다.</p>
    </header>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-card flat bordered class="page-vision__card">
          <q-card-section>
            <div class="page-vision__card-title">vision_cam</div>
            <q-input v-model="camBaseUrl" outlined dense label="Base URL" class="q-mt-sm" />
            <q-banner v-if="camMessage" class="q-mt-sm" rounded :class="camOk ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'">
              {{ camMessage }}
            </q-banner>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-6">
        <q-card flat bordered class="page-vision__card">
          <q-card-section>
            <div class="page-vision__card-title">vision_judge</div>
            <q-input v-model="judgeBaseUrl" outlined dense label="Base URL" class="q-mt-sm" />
            <q-banner v-if="judgeMessage" class="q-mt-sm" rounded :class="judgeOk ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'">
              {{ judgeMessage }}
            </q-banner>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="page-vision__actions">
      <q-btn color="primary" unelevated no-caps label="저장 후 연결 확인" :loading="isSaving" @click="saveAndCheck" />
      <q-btn outline no-caps label="카메라 테스트" @click="router.push('/vision/cam')" />
      <q-btn outline no-caps label="판정 테스트" @click="router.push('/vision/judge')" />
    </div>
    <q-banner v-if="saveMessage" rounded class="bg-red-1 text-red-10">{{ saveMessage }}</q-banner>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getCamStatus, getJudgeHealth, getVisionConfig, saveVisionConfig } from '@/modules/vision/api/api-vision'

const router = useRouter()
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
    camMessage.value = fps === null ? '연결됨' : `연결됨 · fps ${fps}`
  } else {
    camMessage.value = status.message
  }
}

async function checkJudge() {
  const health = await getJudgeHealth()
  judgeOk.value = health.result === 'SUCCESS'
  if (health.result === 'SUCCESS' && health.data) {
    judgeMessage.value = `연결됨 · ${health.data.device} · ${health.data.model_name}`
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
