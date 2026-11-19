import { onMounted, onUnmounted, type Ref } from 'vue'

/**
 * 휠 한 번 = 섹션 한 칸 이동 (CSS scroll-snap 보완)
 *
 * CSS `scroll-snap-type: y mandatory` 만 쓰면 작은 휠/트랙패드 입력은 원위치로 되돌아간다.
 * 데스크톱에서 휠 제스처 1회를 감지해 다음/이전 섹션으로 이동시키고,
 * 트랙패드 관성 스크롤이 여러 칸을 넘기지 않도록 제스처가 끝날 때까지 잠근다.
 *
 * - 섹션이 화면보다 길면 섹션 끝에 닿을 때까지 기본 스크롤 허용
 * - 모바일/낮은 화면/모션 최소화 설정에서는 동작하지 않음 (CSS proximity 사용)
 *
 * 사용 예)
 *   const root = ref<HTMLElement | null>(null)
 *   useSectionWheel(root, '[data-section]')
 */
export function useSectionWheel(root: Ref<HTMLElement | null>, selector: string, options: { lockMs?: number; gapMs?: number } = {}) {
  const lockMs = options.lockMs ?? 900
  const gapMs = options.gapMs ?? 180
  const ENABLE_QUERY = '(min-width: 901px) and (min-height: 701px) and (prefers-reduced-motion: no-preference)'

  let lockedUntil = 0
  let lastWheelAt = 0
  let mql: MediaQueryList | null = null

  const sections = () => Array.from(root.value?.querySelectorAll<HTMLElement>(selector) ?? [])

  function currentIndex(list: HTMLElement[]): number {
    const y = window.scrollY + window.innerHeight / 2
    let idx = 0
    list.forEach((el, i) => {
      if (el.offsetTop <= y) idx = i
    })
    return idx
  }

  function onWheel(e: WheelEvent) {
    if (!mql?.matches || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return

    const now = performance.now()
    const isNewGesture = now - lastWheelAt > gapMs
    lastWheelAt = now

    const list = sections()
    if (!list.length) return
    const idx = currentIndex(list)
    const cur = list[idx]
    const dir = e.deltaY > 0 ? 1 : -1

    // 화면보다 긴 섹션: 내부 스크롤 우선
    const top = cur.offsetTop
    const bottom = top + cur.offsetHeight
    const viewTop = window.scrollY
    const viewBottom = viewTop + window.innerHeight
    if (dir > 0 && viewBottom < bottom - 2) return
    if (dir < 0 && viewTop > top + 2) return

    e.preventDefault()
    if (now < lockedUntil || !isNewGesture) return

    const next = list[Math.min(Math.max(idx + dir, 0), list.length - 1)]
    if (next === cur) return
    lockedUntil = now + lockMs
    window.scrollTo({ top: dir > 0 ? next.offsetTop : next.offsetTop + Math.max(0, next.offsetHeight - window.innerHeight), behavior: 'smooth' })
  }

  onMounted(() => {
    mql = window.matchMedia(ENABLE_QUERY)
    window.addEventListener('wheel', onWheel, { passive: false })
  })

  onUnmounted(() => {
    window.removeEventListener('wheel', onWheel)
  })
}
