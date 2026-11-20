<template>
  <canvas ref="canvasRef" class="neural-globe" aria-hidden="true" />
</template>

<script setup lang="ts">
/**
 * 3D 뉴럴 글로브 (의존성 없는 Canvas 2D 원근 투영)
 * - 피보나치 구면 위 노드 + 가까운 노드끼리 연결선
 * - 자동 회전 + 포인터 위치에 따른 기울기(parallax)
 * - 화면 밖이거나 prefers-reduced-motion 이면 렌더 중지
 *
 * 사용 예) <NeuralGlobe :points="320" />
 */
import { onMounted, onUnmounted, ref } from 'vue'

const props = withDefaults(defineProps<{ points?: number; color?: string; accent?: string }>(), {
  points: 320,
  color: '120, 170, 255',
  accent: '190, 120, 255'
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

interface Vec3 { x: number; y: number; z: number }

let raf = 0
let visible = true
let io: IntersectionObserver | null = null
let ro: ResizeObserver | null = null
const pointer = { x: 0, y: 0, tx: 0, ty: 0 }

function fibonacciSphere(n: number): Vec3[] {
  const pts: Vec3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r })
  }
  return pts
}

/** 미리 계산한 이웃 연결 (각도가 가까운 노드끼리) */
function buildEdges(pts: Vec3[], maxDist: number): [number, number][] {
  const edges: [number, number][] = []
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x
      const dy = pts[i].y - pts[j].y
      const dz = pts[i].z - pts[j].z
      if (dx * dx + dy * dy + dz * dz < maxDist * maxDist) edges.push([i, j])
    }
  }
  return edges
}

const onPointerMove = (e: PointerEvent) => {
  pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2
  pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2
}

onMounted(() => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const pts = fibonacciSphere(props.points)
  const edges = buildEdges(pts, 2.2 / Math.sqrt(props.points) * 1.9)
  let w = 0
  let h = 0
  let dpr = 1

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = canvas.clientWidth
    h = canvas.clientHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  ro = new ResizeObserver(resize)
  ro.observe(canvas)

  let angle = 0
  const projected = pts.map(() => ({ x: 0, y: 0, z: 0, s: 0 }))

  const draw = () => {
    pointer.x += (pointer.tx - pointer.x) * 0.05
    pointer.y += (pointer.ty - pointer.y) * 0.05
    angle += 0.0025

    const ay = angle + pointer.x * 0.5
    const ax = 0.35 + pointer.y * 0.3
    const cosY = Math.cos(ay), sinY = Math.sin(ay)
    const cosX = Math.cos(ax), sinX = Math.sin(ax)
    const radius = Math.min(w, h) * 0.38
    const cx = w / 2
    const cy = h / 2
    const fov = 2.6

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]
      // Y축 회전 → X축 회전
      const x1 = p.x * cosY - p.z * sinY
      const z1 = p.x * sinY + p.z * cosY
      const y2 = p.y * cosX - z1 * sinX
      const z2 = p.y * sinX + z1 * cosX
      const s = fov / (fov + z2)
      projected[i].x = cx + x1 * radius * s
      projected[i].y = cy + y2 * radius * s
      projected[i].z = z2
      projected[i].s = s
    }

    ctx.clearRect(0, 0, w, h)

    // 중심 글로우
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.4)
    glow.addColorStop(0, `rgba(${props.color}, 0.18)`)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    ctx.lineWidth = 0.6
    for (const [a, b] of edges) {
      const pa = projected[a]
      const pb = projected[b]
      const depth = (2 - (pa.z + pb.z) / 2) / 3 // 앞쪽일수록 진하게
      ctx.strokeStyle = `rgba(${props.color}, ${0.05 + depth * 0.28})`
      ctx.beginPath()
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
      ctx.stroke()
    }

    const t = performance.now() / 1000
    for (let i = 0; i < projected.length; i++) {
      const p = projected[i]
      const front = p.z < 0
      const pulse = i % 17 === 0 ? 0.5 + 0.5 * Math.sin(t * 2 + i) : 0
      const size = (front ? 1.8 : 1.1) * p.s + pulse * 2.2
      ctx.fillStyle = pulse > 0
        ? `rgba(${props.accent}, ${0.5 + pulse * 0.5})`
        : `rgba(${props.color}, ${front ? 0.9 : 0.35})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    if (!reduced && visible) raf = requestAnimationFrame(draw)
  }

  io = new IntersectionObserver(([entry]) => {
    const was = visible
    visible = entry.isIntersecting
    if (visible && !was && !reduced) raf = requestAnimationFrame(draw)
  })
  io.observe(canvas)

  if (!reduced) window.addEventListener('pointermove', onPointerMove, { passive: true })
  draw()
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  io?.disconnect()
  ro?.disconnect()
  window.removeEventListener('pointermove', onPointerMove)
})
</script>
