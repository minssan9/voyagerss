import { computed, onBeforeUnmount, ref } from 'vue'
import type { ApiEnvelope } from '@/modules/vision/api/api-vision'
import { nextDelay, toScores, topScore } from '@/modules/vision/utils/frame-capture'

type JudgeData = { probability?: number; probabilities?: Record<string, number> }

export interface LiveSample {
  at: number
  latencyMs: number
  scores: Record<string, number>
  top: { label: string; value: number } | null
}

/** 분석 1회. 프레임이 아직 준비되지 않았으면 null */
export type AnalyzeFn = (signal: AbortSignal) => Promise<ApiEnvelope<JudgeData> | null>

const HISTORY_SIZE = 40

/**
 * "최신 프레임 1건만 in-flight" 방식의 실시간 판정 루프.
 * 응답이 오면 바로(또는 interval 이 남았으면 그만큼 대기 후) 다음 프레임을 보내므로
 * 모델이 느려도 요청이 쌓이지 않는다.
 */
export function useLiveJudge(analyze: AnalyzeFn, intervalMs: () => number) {
  const running = ref(false)
  const busy = ref(false)
  const samples = ref<LiveSample[]>([])
  const errorMessage = ref('')
  const errorCount = ref(0)

  let controller: AbortController | null = null
  let wakeTimer: ReturnType<typeof setTimeout> | null = null
  let wake: (() => void) | null = null
  let generation = 0

  const latest = computed(() => samples.value[samples.value.length - 1] ?? null)
  const avgLatency = computed(() => {
    if (samples.value.length === 0) return 0
    return samples.value.reduce((sum, s) => sum + s.latencyMs, 0) / samples.value.length
  })
  /** 최근 10초 동안의 초당 판정 수 */
  const throughput = computed(() => {
    const now = latest.value?.at ?? 0
    const recent = samples.value.filter((s) => now - s.at <= 10000)
    if (recent.length < 2) return 0
    const span = (recent[recent.length - 1].at - recent[0].at) / 1000
    return span > 0 ? (recent.length - 1) / span : 0
  })

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      wake = resolve
      wakeTimer = setTimeout(resolve, ms)
    })
  }

  /** true 면 판정 성공 */
  async function runOnce(): Promise<boolean> {
    const ctrl = new AbortController()
    controller = ctrl
    busy.value = true
    const started = performance.now()
    try {
      const result = await analyze(ctrl.signal)
      if (ctrl.signal.aborted) return false
      if (!result) {
        errorMessage.value = ''
        return false
      }
      if (result.result !== 'SUCCESS') {
        errorMessage.value = result.message
        errorCount.value += 1
        return false
      }
      errorMessage.value = ''
      const scores = toScores(result.data)
      const sample: LiveSample = {
        at: Date.now(),
        latencyMs: performance.now() - started,
        scores,
        top: topScore(scores),
      }
      samples.value = [...samples.value, sample].slice(-HISTORY_SIZE)
      return true
    } finally {
      if (controller === ctrl) {
        busy.value = false
        controller = null
      }
    }
  }

  async function start(): Promise<void> {
    if (running.value) return
    running.value = true
    errorCount.value = 0
    const gen = ++generation
    while (running.value && gen === generation) {
      const started = performance.now()
      const ok = await runOnce()
      if (!running.value || gen !== generation) break
      // 프레임 미준비·오류 시에는 과도한 재시도를 막기 위해 최소 500ms 대기
      const delay = nextDelay(intervalMs(), performance.now() - started)
      await sleep(ok ? delay : Math.max(500, delay))
    }
  }

  function stop(): void {
    running.value = false
    generation += 1
    busy.value = false
    controller?.abort()
    if (wakeTimer) clearTimeout(wakeTimer)
    wake?.()
    wake = null
    wakeTimer = null
  }

  function reset(): void {
    samples.value = []
    errorMessage.value = ''
    errorCount.value = 0
  }

  onBeforeUnmount(stop)

  return { running, busy, samples, latest, avgLatency, throughput, errorMessage, errorCount, start, stop, runOnce, reset }
}
