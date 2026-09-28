<template>
  <div class="page-vision">
    <header class="page-vision__header">
      <h1 class="page-vision__title">{{ t('vision.live.title') }}</h1>
      <p class="page-vision__lead">{{ t('vision.live.lead') }}</p>
    </header>

    <div class="page-vision__actions">
      <q-btn outline no-caps :label="t('vision.live.config')" @click="router.push('/vision')" />
      <q-btn outline no-caps :label="t('vision.live.judgeTest')" @click="router.push('/vision/judge')" />
    </div>

    <div class="row q-col-gutter-md">
      <!-- 입력 소스 + 미리보기 -->
      <div class="col-12 col-md-7">
        <q-card flat bordered>
          <q-card-section class="q-gutter-md">
            <q-btn-toggle
              v-model="source"
              no-caps
              spread
              unelevated
              toggle-color="primary"
              :options="sourceOptions"
            />

            <div class="page-vision__stage">
              <video
                v-show="source === 'webcam' || source === 'video'"
                ref="videoEl"
                class="page-vision__stage-media"
                autoplay
                muted
                playsinline
                :loop="source === 'video'"
                :controls="source === 'video'"
              />
              <img
                v-if="source === 'image' && imageUrl"
                ref="imageEl"
                class="page-vision__stage-media"
                :src="imageUrl"
                :alt="t('vision.live.sourceImage')"
              />
              <img
                v-if="source === 'cam'"
                class="page-vision__stage-media"
                :src="camStreamSrc"
                :alt="t('vision.cam.streamAlt')"
              />
              <div v-if="placeholder" class="page-vision__stage-empty">{{ placeholder }}</div>
              <div v-if="latest?.top" class="page-vision__badge" :class="{ 'page-vision__badge--busy': live.busy.value }">
                <span class="page-vision__badge-label">{{ latest.top.label }}</span>
                <span>{{ percent(latest.top.value) }}</span>
              </div>
            </div>

            <div v-if="source === 'webcam'" class="page-vision__source-row">
              <q-select
                v-model="deviceId"
                outlined
                dense
                emit-value
                map-options
                class="col"
                :options="deviceOptions"
                :label="t('vision.live.device')"
              />
              <q-btn outline no-caps :label="t('vision.live.restartWebcam')" @click="startWebcam" />
            </div>
            <q-file
              v-if="source === 'video'"
              v-model="videoFile"
              outlined
              dense
              accept="video/*"
              :label="t('vision.live.pickVideo')"
            />
            <q-file
              v-if="source === 'image'"
              v-model="imageFile"
              outlined
              dense
              accept="image/*"
              :label="t('vision.live.pickImage')"
            />
            <p v-if="source === 'cam'" class="page-vision__meta">{{ t('vision.live.camHint') }}</p>
            <q-banner v-if="sourceError" rounded class="bg-red-1 text-red-10">{{ sourceError }}</q-banner>
          </q-card-section>
        </q-card>
      </div>

      <!-- 판정 설정 + 결과 -->
      <div class="col-12 col-md-5 column q-gutter-y-md">
        <q-card flat bordered>
          <q-card-section class="q-gutter-md">
            <q-input v-model="question" outlined dense :label="t('vision.judge.question')" />
            <q-btn-toggle v-model="mode" no-caps spread unelevated toggle-color="primary" :options="modeOptions" />
            <q-input v-if="mode === 'choice'" v-model="choices" outlined dense :label="t('vision.judge.choices')" />
            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-select v-model="intervalMs" outlined dense emit-value map-options :options="intervalOptions" :label="t('vision.live.interval')" />
              </div>
              <div class="col-6">
                <q-select
                  v-model="maxEdge"
                  outlined
                  dense
                  emit-value
                  map-options
                  :disable="source === 'cam'"
                  :options="sizeOptions"
                  :label="t('vision.live.resolution')"
                />
              </div>
            </div>
            <div><q-toggle v-model="saveRecords" :label="t('vision.live.saveRecords')" /></div>
            <div class="page-vision__actions">
              <q-btn
                v-if="!live.running.value"
                color="primary"
                unelevated
                no-caps
                icon="play_arrow"
                :label="t('vision.live.start')"
                @click="startLive"
              />
              <q-btn v-else color="negative" unelevated no-caps icon="stop" :label="t('vision.live.stop')" @click="live.stop" />
              <q-btn
                outline
                no-caps
                icon="photo_camera"
                :label="t('vision.live.once')"
                :loading="live.busy.value && !live.running.value"
                :disable="live.running.value"
                @click="runOnce"
              />
              <q-btn flat no-caps :label="t('vision.live.reset')" @click="live.reset" />
            </div>
            <q-banner v-if="formError || live.errorMessage.value" rounded class="bg-red-1 text-red-10">
              {{ formError || live.errorMessage.value }}
            </q-banner>
          </q-card-section>
        </q-card>

        <q-card flat bordered>
          <q-card-section>
            <div class="page-vision__stats">
              <div class="page-vision__stat">
                <span class="page-vision__stat-value">{{ latest ? ms(latest.latencyMs) : '-' }}</span>
                <span class="page-vision__meta">{{ t('vision.live.latency') }}</span>
              </div>
              <div class="page-vision__stat">
                <span class="page-vision__stat-value">{{ live.samples.value.length ? ms(live.avgLatency.value) : '-' }}</span>
                <span class="page-vision__meta">{{ t('vision.live.avgLatency') }}</span>
              </div>
              <div class="page-vision__stat">
                <span class="page-vision__stat-value">{{ live.throughput.value.toFixed(2) }}</span>
                <span class="page-vision__meta">{{ t('vision.live.throughput') }}</span>
              </div>
              <div class="page-vision__stat">
                <span class="page-vision__stat-value">{{ live.samples.value.length }}</span>
                <span class="page-vision__meta">{{ t('vision.live.count', { errors: live.errorCount.value }) }}</span>
              </div>
            </div>

            <div class="page-vision__card-title q-mt-md">{{ t('vision.live.scores') }}</div>
            <p v-if="!latest" class="page-vision__meta">{{ t('vision.live.noResult') }}</p>
            <div v-for="(value, label) in latest?.scores ?? {}" :key="label" class="page-vision__score">
              <span class="page-vision__score-label">{{ label }}</span>
              <div class="page-vision__score-track">
                <div class="page-vision__score-fill" :style="{ width: percent(value) }" />
              </div>
              <span class="page-vision__score-value">{{ percent(value) }}</span>
            </div>

            <div class="page-vision__card-title q-mt-md">{{ t('vision.live.timeline') }}</div>
            <div class="page-vision__timeline">
              <div
                v-for="sample in live.samples.value"
                :key="sample.at"
                class="page-vision__timeline-bar"
                :style="{ height: percent(primaryValue(sample.scores)) }"
                :title="`${sample.top?.label ?? ''} ${percent(sample.top?.value ?? 0)} · ${ms(sample.latencyMs)}`"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
    <canvas ref="canvasEl" hidden />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  postJudgeBool,
  postJudgeCam,
  postJudgeChoice,
  visionAssetUrl,
  type JudgeMode,
} from '@/modules/vision/api/api-vision'
import { useLiveJudge } from '@/modules/vision/composables/useLiveJudge'
import { captureFrame } from '@/modules/vision/utils/frame-capture'

type LiveSource = 'webcam' | 'video' | 'image' | 'cam'

const router = useRouter()
const { t } = useI18n()

const source = ref<LiveSource>('webcam')
const question = ref('')
const mode = ref<JudgeMode>('bool')
const choices = ref('yes,no')
const intervalMs = ref(1000)
const maxEdge = ref(640)
const saveRecords = ref(false)
const formError = ref('')
const sourceError = ref('')

const videoEl = ref<HTMLVideoElement | null>(null)
const imageEl = ref<HTMLImageElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const videoFile = ref<File | null>(null)
const imageFile = ref<File | null>(null)
const imageUrl = ref('')
const videoUrl = ref('')
const deviceId = ref<string | null>(null)
const devices = ref<MediaDeviceInfo[]>([])
const camToken = ref(Date.now())
let mediaStream: MediaStream | null = null

const sourceOptions = computed(() => [
  { label: t('vision.live.sourceWebcam'), value: 'webcam', icon: 'videocam' },
  { label: t('vision.live.sourceVideo'), value: 'video', icon: 'movie' },
  { label: t('vision.live.sourceImage'), value: 'image', icon: 'image' },
  { label: t('vision.live.sourceCam'), value: 'cam', icon: 'router' },
])
const modeOptions = computed(() => [
  { label: t('vision.judge.modeBool'), value: 'bool' },
  { label: t('vision.judge.modeChoice'), value: 'choice' },
])
const intervalOptions = computed(() => [
  { label: t('vision.live.intervalMax'), value: 0 },
  { label: '0.5s', value: 500 },
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
])
const sizeOptions = [
  { label: '320px', value: 320 },
  { label: '480px', value: 480 },
  { label: '640px', value: 640 },
  { label: '960px', value: 960 },
]
const deviceOptions = computed(() => devices.value.map((d, i) => ({
  label: d.label || `Camera ${i + 1}`,
  value: d.deviceId,
})))
const camStreamSrc = computed(() => `${visionAssetUrl('/vision/cam/stream')}?t=${camToken.value}`)
const placeholder = computed(() => {
  if (source.value === 'video' && !videoUrl.value) return t('vision.live.pickVideo')
  if (source.value === 'image' && !imageUrl.value) return t('vision.live.pickImage')
  return ''
})

const live = useLiveJudge(analyze, () => intervalMs.value)
const latest = live.latest

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function ms(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`
}

/** 타임라인 막대 높이: bool 은 yes 확률, choice 는 최고 확률 */
function primaryValue(scores: Record<string, number>): number {
  if ('yes' in scores && mode.value === 'bool') return scores.yes
  return Math.max(0, ...Object.values(scores))
}

async function analyze(signal: AbortSignal) {
  const options = { save: saveRecords.value, signal }
  if (source.value === 'cam') {
    return postJudgeCam({ mode: mode.value, question: question.value, choices: choices.value, save: saveRecords.value }, signal)
  }
  const frameSource = source.value === 'image' ? imageEl.value : videoEl.value
  if (!frameSource || !canvasEl.value) return null
  const frame = await captureFrame(frameSource, canvasEl.value, maxEdge.value)
  if (!frame || signal.aborted) return null
  return mode.value === 'bool'
    ? postJudgeBool(frame, question.value, options)
    : postJudgeChoice(frame, question.value, choices.value, options)
}

function validate(): boolean {
  formError.value = ''
  if (!question.value.trim()) {
    formError.value = t('vision.live.questionRequired')
  } else if (source.value === 'video' && !videoUrl.value) {
    formError.value = t('vision.live.pickVideo')
  } else if (source.value === 'image' && !imageUrl.value) {
    formError.value = t('vision.live.pickImage')
  }
  return !formError.value
}

function startLive() {
  if (validate()) void live.start()
}

async function runOnce() {
  if (!validate()) return
  const ok = await live.runOnce()
  if (!ok && !live.errorMessage.value) {
    formError.value = t('vision.live.frameNotReady')
  }
}

// ---- 소스 관리 ----
function stopWebcam() {
  mediaStream?.getTracks().forEach((track) => track.stop())
  mediaStream = null
  if (videoEl.value) videoEl.value.srcObject = null
}

async function startWebcam() {
  sourceError.value = ''
  stopWebcam()
  if (!navigator.mediaDevices?.getUserMedia) {
    sourceError.value = t('vision.live.webcamUnsupported')
    return
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: deviceId.value ? { deviceId: { exact: deviceId.value } } : { facingMode: 'environment' },
      audio: false,
    })
    if (source.value !== 'webcam') {
      stopWebcam()
      return
    }
    if (videoEl.value) {
      videoEl.value.removeAttribute('src')
      videoEl.value.srcObject = mediaStream
    }
    const all = await navigator.mediaDevices.enumerateDevices()
    devices.value = all.filter((d) => d.kind === 'videoinput')
    if (!deviceId.value) {
      deviceId.value = mediaStream.getVideoTracks()[0]?.getSettings().deviceId ?? null
    }
  } catch (error) {
    sourceError.value = t('vision.live.webcamFailed', { detail: error instanceof Error ? error.message : String(error) })
  }
}

function replaceUrl(target: typeof imageUrl, file: File | null) {
  if (target.value) URL.revokeObjectURL(target.value)
  target.value = file ? URL.createObjectURL(file) : ''
}

async function applySource(next: LiveSource) {
  live.stop()
  sourceError.value = ''
  formError.value = ''
  await nextTick()
  if (next === 'webcam') {
    await startWebcam()
    return
  }
  stopWebcam()
  if (next === 'video' && videoEl.value) {
    videoEl.value.srcObject = null
    if (videoUrl.value) videoEl.value.src = videoUrl.value
  }
  if (next === 'cam') camToken.value = Date.now()
}

onMounted(() => { void applySource(source.value) })
watch(source, (next) => { void applySource(next) })
watch(deviceId, (next, prev) => {
  if (prev && next && next !== prev && source.value === 'webcam') void startWebcam()
})
watch(videoFile, (file) => {
  live.stop()
  replaceUrl(videoUrl, file)
  if (videoEl.value && source.value === 'video') {
    videoEl.value.srcObject = null
    videoEl.value.src = videoUrl.value
  }
})
watch(imageFile, (file) => replaceUrl(imageUrl, file))
watch(mode, () => live.reset())

onBeforeUnmount(() => {
  live.stop()
  stopWebcam()
  replaceUrl(imageUrl, null)
  replaceUrl(videoUrl, null)
})
</script>
