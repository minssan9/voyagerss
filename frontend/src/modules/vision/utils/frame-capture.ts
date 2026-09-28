export type FrameSource = HTMLVideoElement | HTMLImageElement

export interface FrameSize {
  width: number
  height: number
}

/** 긴 변이 maxEdge 를 넘지 않도록 비율을 유지해 축소 (확대는 하지 않음) */
export function fitSize(width: number, height: number, maxEdge: number): FrameSize {
  if (width <= 0 || height <= 0) {
    return { width: 0, height: 0 }
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function sourceSize(source: FrameSource): FrameSize {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight }
  }
  return { width: source.naturalWidth, height: source.naturalHeight }
}

/** video/img 의 현재 화면을 JPEG Blob 으로 캡처. 준비되지 않았으면 null */
export function captureFrame(
  source: FrameSource,
  canvas: HTMLCanvasElement,
  maxEdge = 640,
  quality = 0.8,
): Promise<Blob | null> {
  const { width, height } = fitSize(sourceSize(source).width, sourceSize(source).height, maxEdge)
  if (width === 0 || height === 0) {
    return Promise.resolve(null)
  }
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return Promise.resolve(null)
  }
  ctx.drawImage(source, 0, 0, width, height)
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality))
}

/** bool/choice 응답을 { label: probability } 형태로 통일 */
export function toScores(data: { probability?: number; probabilities?: Record<string, number> } | null): Record<string, number> {
  if (!data) {
    return {}
  }
  if (typeof data.probability === 'number') {
    return { yes: data.probability, no: 1 - data.probability }
  }
  return data.probabilities ?? {}
}

/** 가장 확률이 높은 항목 */
export function topScore(scores: Record<string, number>): { label: string; value: number } | null {
  let best: { label: string; value: number } | null = null
  for (const [label, value] of Object.entries(scores)) {
    if (!best || value > best.value) {
      best = { label, value }
    }
  }
  return best
}

/** 다음 요청까지 대기 시간: 목표 간격에서 이번 소요 시간을 뺀 값 */
export function nextDelay(intervalMs: number, elapsedMs: number): number {
  return Math.max(0, intervalMs - elapsedMs)
}
