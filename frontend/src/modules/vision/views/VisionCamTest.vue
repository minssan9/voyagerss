<template>
  <div class="page-vision">
    <header class="page-vision__header">
      <h1 class="page-vision__title">카메라 테스트</h1>
      <p class="page-vision__lead">MJPEG 스트림과 /status 결정을 1초마다 읽습니다.</p>
    </header>

    <div class="page-vision__actions">
      <q-btn outline no-caps label="구성" @click="router.push('/vision')" />
      <q-btn outline no-caps label="스트림 다시 열기" @click="reloadStream" />
    </div>

    <q-banner v-if="statusMessage && !statusOk" rounded class="bg-red-1 text-red-10">{{ statusMessage }}</q-banner>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-7">
        <q-card flat bordered>
          <q-card-section>
            <img class="page-vision__stream" :src="streamSrc" alt="vision_cam stream" />
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-5">
        <q-card flat bordered>
          <q-card-section>
            <div class="page-vision__card-title">status</div>
            <p v-if="statusOk" class="page-vision__meta">fps {{ fpsText }}</p>
            <pre class="page-vision__mono">{{ statusText }}</pre>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getCamStatus, visionAssetUrl } from '@/modules/vision/api/api-vision'

const router = useRouter()
const streamToken = ref(Date.now())
const statusPayload = ref<Record<string, unknown> | null>(null)
const statusMessage = ref('')
const statusOk = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const streamSrc = computed(() => `${visionAssetUrl('/vision/cam/stream')}?t=${streamToken.value}`)
const statusText = computed(() => statusPayload.value ? JSON.stringify(statusPayload.value, null, 2) : statusMessage.value)
const fpsText = computed(() => {
  const fps = statusPayload.value?.fps
  return typeof fps === 'number' ? String(fps) : '-'
})

function reloadStream() {
  streamToken.value = Date.now()
}

async function poll() {
  const status = await getCamStatus()
  statusOk.value = status.result === 'SUCCESS'
  if (status.result === 'SUCCESS') {
    statusPayload.value = status.data
    statusMessage.value = ''
  } else {
    statusPayload.value = null
    statusMessage.value = status.message
  }
}

onMounted(() => {
  void poll()
  timer = setInterval(() => { void poll() }, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>
