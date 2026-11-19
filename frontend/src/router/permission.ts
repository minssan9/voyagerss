import { Router, RouteLocationNormalized } from 'vue-router'
import Cookies from 'js-cookie'
import { useUserStore } from '@/stores/common/store_user'
import { applyRouteHead } from '@/utils/head'
import { LoadingService } from '@/utils/loading'
import {
  decideRouteAccess,
  getEffectiveMeta,
  hasMainAccessToken,
  isWhitelisted
} from './route-access'

const WORKER_APP_PREFIXES = ['/workschd/m', '/account/']

function isOutsideWorkerApp(path: string): boolean {
  if (path.startsWith('/workschd/team/join')) return false
  if (WORKER_APP_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))) return false
  if (path === '/401' || path === '/403' || path === '/login') return false
  return true
}

/** Paths that never run RBAC (exact or prefix*). */
const whiteList = [
  '/login',
  '/signup',
  '/redirect',
  '/about',
  '/subscription',
  '/privacy-policy',
  '/terms',
  '/401',
  '/403',
  '/404',
  '/workschd/login',
  '/aipr/login',
  '/auth/callback',
  '/workschd/auth/callback'
]

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to: RouteLocationNormalized) => {
    LoadingService.start()
    try {
      const userStore = useUserStore()
      const cookieToken = Cookies.get('accessToken') ?? null
      const storeToken = userStore.accessToken

      const quickMeta = getEffectiveMeta(to.matched)
      const hasMain = hasMainAccessToken(storeToken, cookieToken)

      if (hasMain && !userStore.user.accountRoles?.length) {
        try {
          await userStore.fetchUser()
        } catch (e) {
          console.error('Navigation guard: fetchUser failed', e)
        }
      }

      const workerPath = to.path.length > 1 && to.path.endsWith('/') ? to.path.slice(0, -1) : to.path
      if (userStore.isWorker && isOutsideWorkerApp(workerPath)) {
        return '/workschd/m/tasks'
      }

      if (quickMeta.public || (isWhitelisted(to.path, whiteList) && !quickMeta.integrated)) {
        return true
      }

      const shouldHydrateProfile =
        hasMain &&
        quickMeta.requiresAuth &&
        (!quickMeta.adminAuth || quickMeta.requiresAuth) &&
        !userStore.user.accountRoles?.length

      if (shouldHydrateProfile) {
        try {
          await userStore.fetchUser()
        } catch (e) {
          console.error('Navigation guard: fetchUser failed', e)
          if (!import.meta.env.DEV) {
            await userStore.logout()
          }
        }
      }

      if (hasMain && (quickMeta.integrated || !userStore.rbacProfile)) {
        try {
          await userStore.fetchRbacProfile()
        } catch (e) {
          console.error('Navigation guard: fetchRbacProfile failed', e)
        }
      }

      const decision = decideRouteAccess({
        path: to.path,
        fullPath: to.fullPath,
        whiteList,
        matched: to.matched,
        storeAccessToken: userStore.accessToken,
        cookieAccessToken: cookieToken,
        accountRoles: userStore.user.accountRoles,
        rbacPagePermissions: userStore.rbacPagePermissions,
        rbacModules: import.meta.env.DEV
          ? ['workschd', 'aviation', 'aipr', 'vision']
          : userStore.rbacProfile?.modules,
        rbacIsAdmin: import.meta.env.DEV ? true : userStore.rbacProfile?.isAdmin
      })

      if (decision.action === 'allow') {
        return true
      }
      return { path: decision.path, query: decision.query }
    } catch (error) {
      console.error('Navigation guard error:', error)
      return { path: '/401', query: { redirect: to.fullPath } }
    }
  })

  router.afterEach((to) => {
    applyRouteHead(to)
    LoadingService.done()
  })

  router.onError((e, to) => {
    LoadingService.done()
    // 배포 후 옛 번들이 이미 삭제된 화면 청크를 요청하면 이동이 조용히 실패한다 → 해당 경로로 전체 새로고침
    if (isChunkLoadError(e) && reloadOnce(to.fullPath)) return
    console.error('Navigation guard error:', e)
  })
}

const CHUNK_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|is not a valid JavaScript MIME type|Unable to preload CSS/i
const CHUNK_RELOAD_KEY = 'voy-chunk-reload'

export function isChunkLoadError(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e ?? '')
  return CHUNK_ERROR_PATTERN.test(message)
}

/** 같은 경로로 연속 새로고침되는 무한 루프 방지 (10초 내 1회) */
function reloadOnce(fullPath: string): boolean {
  try {
    const last = JSON.parse(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 'null') as { path: string; at: number } | null
    if (last && last.path === fullPath && Date.now() - last.at < 10_000) return false
    sessionStorage.setItem(CHUNK_RELOAD_KEY, JSON.stringify({ path: fullPath, at: Date.now() }))
  } catch {
    // storage 불가 시에도 1회 새로고침은 시도
  }
  window.location.assign(fullPath)
  return true
}
