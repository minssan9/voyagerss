<template>
  <div class="page-vision">
    <header class="page-vision__header">
      <h1 class="page-vision__title">{{ t('vision.cam.title') }}</h1>
      <p class="page-vision__lead">{{ t('vision.cam.lead') }}</p>
    </header>

    <div class="page-vision__actions">
      <q-btn outline no-caps :label="t('vision.cam.config')" @click="router.push('/vision')" />
      <q-btn outline no-caps :label="t('vision.cam.reloadStream')" @click="reloadStream" />
      <q-btn
        v-if="sourceMode === 'camera'"
        outline
        no-caps
        :label="t('vision.cam.stopCamera')"
        @click="stopCamera"
      />
    </div>

    <q-btn-toggle
      v-model="sourceMode"
      no-caps
      spread
      unelevated
      toggle-color="primary"
      :options="sourceOptions"
    />

    <q-banner v-if="sourceMode !== 'server'" rounded class="bg-blue-1 text-blue-10">
      {{ t('vision.cam.browserHint') }}
    </q-banner>
    <q-banner v-if="inputMessage" rounded class="bg-red-1 text-red-10">{{ inputMessage }}</q-banner>
    <q-banner v-if="statusMessage && !statusOk" rounded class="bg-red-1 text-red-10">{{ statusMessage }}</q-banner>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-7">
        <q-card flat bordered>
          <q-card-section class="q-gutter-md">
            <div v-show="sourceMode === 'camera' || isSnapping">
              <div class="page-vision__meta">{{ t('vision.cam.preview') }}</div>
              <video ref="liveVideo" class="page-vision__preview" autoplay muted playsinline />
            </div>

            <template v-if="sourceMode === 'photo'">
              <q-file v-model="photoFile" outlined dense :label="t('vision.cam.photo')" accept="image/*" />
              <q-btn outline no-caps :label="t('vision.cam.snap')" :loading="isSnapping" @click="snapPhoto" />
              <img v-if="photoPreviewUrl" class="page-vision__preview" :src="photoPreviewUrl" :alt="t('vision.cam.preview')" />
            </template>

            <template v-if="sourceMode === 'video'">
              <q-file v-model="videoFile" outlined dense :label="t('vision.cam.video')" accept="video/*" />
              <video
                v-show="videoUrl"
                ref="fileVideo"
                class="page-vision__preview"
                :src="videoUrl"
                controls
                playsinline
                @play="onVideoPlay"
                @pause="onVideoPause"
                @ended="onVideoPause"
              />
            </template>

            <div>
              <div class="page-vision__meta">{{ t('vision.cam.overlay') }}</div>
              <img class="page-vision__stream" :src="streamSrc" :alt="t('vision.cam.streamAlt')" />
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-5">
        <q-card flat bordered>
          <q-card-section class="q-gutter-md">
            <div class="page-vision__card-title">{{ t('vision.cam.status') }}</div>
            <p v-if="statusOk" class="page-vision__meta">fps {{ fpsText }}</p>
            <pre class="page-vision__mono">{{ statusText }}</pre>
            <q-input v-model="question" outlined dense :label="t('vision.judge.question')" />
            <q-btn-toggle
              v-model="judgeMode"
              no-caps
              spread
              unelevated
              toggle-color="primary"
              :options="judgeModeOptions"
            />
            <q-input v-if="judgeMode === 'choice'" v-model="choices" outlined dense :label="t('vision.judge.choices')" />
            <q-btn
              color="primary"
              unelevated
              no-caps
              :label="t('vision.cam.judgeFrame')"
              :loading="isJudging"
              @click="judgeCurrentFrame"
            />
            <q-banner v-if="judgeMessage" rounded :class="judgeOk ? 'bg-green-1 text-green-10' : 'bg-red-1 text-red-10'">
              {{ judgeMessage }}
            </q-banner>
          </q-card-section>
        </q-card>
      </div>
    </div>
    <canvas ref="captureCanvas" class="page-vision__capture" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  getCamStatus,
  postCamFrame,
  postJudgeBool,
  postJudgeChoice,
  visionAssetUrl,
} from '@/modules/vision/api/api-vision'

type SourceMode = 'server' | 'camera' | 'photo' | 'video'

const FRAME_INTERVAL_MS = 150

const router = useRouter()
const { t } = useI18n()
const sourceMode = ref<SourceMode>('server')
const streamToken = ref(Date.now())
const statusPayload = ref<Record<string, unknown> | null>(null)
const statusMessage = ref('')
const statusOk = ref(false)
const inputMessage = ref('')
const liveVideo = ref<HTMLVideoElement | null>(null)
const fileVideo = ref<HTMLVideoElement | null>(null)
const captureCanvas = ref<HTMLCanvasElement | null>(null)
const photoFile = ref<File | null>(null)
const videoFile = ref<File | null>(null)
const photoPreviewUrl = ref('')
const videoUrl = ref('')
const lastFrameFile = ref<File | null>(null)
const cameraStream = ref<MediaStream | null>(null)
const isSnapping = ref(false)
const question = ref('')
const choices = ref('yes,no')
const judgeMode = ref<'bool' | 'choice'>('bool')
const isJudging = ref(false)
const judgeOk = ref(false)
const judgeMessage = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null
let sampleTimer: ReturnType<typeof setInterval> | null = null
let frameInFlight = false

const streamSrc = computed(() => `${visionAssetUrl('/vision/cam/stream')}?t=${streamToken.value}`)
const statusText = computed(() => statusPayload.value ? JSON.stringify(statusPayload.value, null, 2) : statusMessage.value)
const fpsText = computed(() => {
  const fps = statusPayload.value?.fps
  return typeof fps === 'number' ? String(fps) : '-'
})
const sourceOptions = computed(() => [
  { label: t('vision.cam.sourceServer'), value: 'server' },
  { label: t('vision.cam.sourceCamera'), value: 'camera' },
  { label: t('vision.cam.sourcePhoto'), value: 'photo' },
  { label: t('vision.cam.sourceVideo'), value: 'video' },
])
const judgeModeOptions = computed(() => [
  { label: t('vision.judge.modeBool'), value: 'bool' },
  { label: t('vision.judge.modeChoice'), value: 'choice' },
])

function reloadStream() {
  streamToken.value = Date.now()
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
    return t('vision.cam.permissionDenied')
  }
  return error instanceof Error ? error.message : t('vision.errors.requestFailed')
}

function releaseCamera() {
  cameraStream.value?.getTracks().forEach((track) => track.stop())
  cameraStream.value = null
  if (liveVideo.value) {
    liveVideo.value.srcObject = null
  }
}

function stopSampling() {
  if (sampleTimer) {
    clearInterval(sampleTimer)
    sampleTimer = null
  }
}

function startSampling() {
  stopSampling()
  sampleTimer = setInterval(() => { void sendSample() }, FRAME_INTERVAL_MS)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startPolling() {
  stopPolling()
  void poll()
  pollTimer = setInterval(() => { void poll() }, 1000)
}

async function startCamera(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) {
    inputMessage.value = t('vision.cam.permissionDenied')
    return false
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: false,
    })
    cameraStream.value = stream
    await nextTick()
    const video = liveVideo.value
    if (!video) {
      releaseCamera()
      inputMessage.value = t('vision.cam.frameUnavailable')
      return false
    }
    video.srcObject = stream
    await video.play()
    return true
  } catch (error) {
    releaseCamera()
    inputMessage.value = cameraErrorMessage(error)
    return false
  }
}

function stopCamera() {
  stopSampling()
  releaseCamera()
  sourceMode.value = 'server'
}

function frameFromVideo(video: HTMLVideoElement): Promise<Blob | null> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
    return Promise.resolve(null)
  }
  const canvas = captureCanvas.value
  if (!canvas) {
    return Promise.resolve(null)
  }
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const context = canvas.getContext('2d')
  if (!context) {
    return Promise.resolve(null)
  }
  context.drawImage(video, 0, 0)
  return blobFromCanvas(canvas)
}

function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7)
  })
}

async function publishFrame(blob: Blob) {
  frameInFlight = true
  try {
    const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' })
    lastFrameFile.value = file
    const result = await postCamFrame(file)
    statusOk.value = result.result === 'SUCCESS'
    if (result.result === 'SUCCESS') {
      statusPayload.value = result.data
      statusMessage.value = ''
    } else {
      statusPayload.value = null
      statusMessage.value = result.message
    }
  } finally {
    frameInFlight = false
  }
}

async function sendSample() {
  if (frameInFlight) {
    return
  }
  const video = sourceMode.value === 'camera' ? liveVideo.value : sourceMode.value === 'video' ? fileVideo.value : null
  if (!video) {
    return
  }
  if (sourceMode.value === 'video' && (video.paused || video.ended)) {
    return
  }
  const blob = await frameFromVideo(video)
  if (!blob || sourceMode.value === 'server' || sourceMode.value === 'photo') {
    return
  }
  await publishFrame(blob)
}

function replacePreview(blob: Blob) {
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value)
  }
  photoPreviewUrl.value = URL.createObjectURL(blob)
}

async function analyzePhoto(file: File) {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch (error) {
    inputMessage.value = error instanceof Error ? error.message : t('vision.errors.requestFailed')
    return
  }
  const canvas = captureCanvas.value
  if (!canvas) {
    bitmap.close()
    return
  }
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return
  }
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  const blob = await blobFromCanvas(canvas)
  if (!blob) {
    inputMessage.value = t('vision.cam.frameUnavailable')
    return
  }
  replacePreview(blob)
  reloadStream()
  await publishFrame(blob)
}

async function waitForVideoFrame(video: HTMLVideoElement): Promise<void> {
  if (video.videoWidth > 0) {
    return
  }
  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(finish, 2000)
    function finish() {
      window.clearTimeout(timer)
      video.removeEventListener('loadeddata', finish)
      resolve()
    }
    video.addEventListener('loadeddata', finish)
  })
}

async function snapPhoto() {
  inputMessage.value = ''
  isSnapping.value = true
  await nextTick()
  const started = await startCamera()
  if (!started || !liveVideo.value) {
    isSnapping.value = false
    return
  }
  await waitForVideoFrame(liveVideo.value)
  const blob = await frameFromVideo(liveVideo.value)
  releaseCamera()
  isSnapping.value = false
  if (!blob) {
    inputMessage.value = t('vision.cam.frameUnavailable')
    return
  }
  replacePreview(blob)
  reloadStream()
  await publishFrame(blob)
}

function onVideoPlay() {
  if (sourceMode.value !== 'video') {
    return
  }
  reloadStream()
  startSampling()
}

function onVideoPause() {
  if (sourceMode.value === 'video') {
    stopSampling()
  }
}

async function applySource(mode: SourceMode) {
  stopSampling()
  releaseCamera()
  inputMessage.value = ''
  judgeMessage.value = ''
  await nextTick()
  if (mode === 'server') {
    reloadStream()
    startPolling()
    return
  }
  stopPolling()
  reloadStream()
  if (mode === 'camera') {
    const started = await startCamera()
    if (started && sourceMode.value === 'camera') {
      startSampling()
    }
  }
}

async function poll() {
  const status = await getCamStatus()
  if (sourceMode.value !== 'server') {
    return
  }
  statusOk.value = status.result === 'SUCCESS'
  if (status.result === 'SUCCESS') {
    statusPayload.value = status.data
    statusMessage.value = ''
  } else {
    statusPayload.value = null
    statusMessage.value = status.message
  }
}

async function judgeCurrentFrame() {
  judgeMessage.value = ''
  if (!lastFrameFile.value) {
    judgeOk.value = false
    judgeMessage.value = t('vision.cam.judgeNeedFrame')
    return
  }
  if (!question.value.trim()) {
    judgeOk.value = false
    judgeMessage.value = t('vision.cam.questionRequired')
    return
  }
  isJudging.value = true
  if (judgeMode.value === 'bool') {
    const result = await postJudgeBool(lastFrameFile.value, question.value)
    judgeOk.value = result.result === 'SUCCESS'
    if (result.result === 'SUCCESS' && result.data) {
      judgeMessage.value = t('vision.judge.yesProbability', {
        percent: (result.data.probability * 100).toFixed(1),
      })
    } else {
      judgeMessage.value = result.message
    }
  } else {
    const result = await postJudgeChoice(lastFrameFile.value, question.value, choices.value)
    judgeOk.value = result.result === 'SUCCESS'
    if (result.result === 'SUCCESS' && result.data) {
      judgeMessage.value = Object.entries(result.data.probabilities)
        .map(([key, value]) => `${key}: ${(Number(value) * 100).toFixed(1)}%`)
        .join(' · ')
    } else {
      judgeMessage.value = result.message
    }
  }
  isJudging.value = false
}

watch(sourceMode, (mode) => {
  void applySource(mode)
})

watch(photoFile, (file) => {
  if (file && sourceMode.value === 'photo') {
    inputMessage.value = ''
    void analyzePhoto(file)
  }
})

watch(videoFile, (file) => {
  stopSampling()
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value)
  }
  videoUrl.value = file ? URL.createObjectURL(file) : ''
})

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  stopPolling()
  stopSampling()
  releaseCamera()
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value)
  }
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value)
  }
})
</script>
