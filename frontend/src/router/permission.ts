import { Router, RouteLocationNormalized } from 'vue-router'
import Cookies from 'js-cookie'
import { useUserStore } from '@/stores/common/store_user'
import { LoadingService } from '@/utils/loading'
import {
  decideRouteAccess,
  getEffectiveMeta,
  hasMainAccessToken,
  isWhitelisted
} from './route-access'

/** Paths that never run RBAC (exact or prefix*). */
const whiteList = [
  '/',
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
  '/auth/callback',
  '/workschd/auth/callback',
  '/investand/admin/login'
]

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to: RouteLocationNormalized) => {
    LoadingService.start()
    try {
      const userStore = useUserStore()
      const cookieToken = Cookies.get('accessToken') ?? null
      const storeToken = userStore.accessToken

      const quickMeta = getEffectiveMeta(to.matched)

      if (quickMeta.public || isWhitelisted(to.path, whiteList)) {
        return true
      }

      const hasMain = hasMainAccessToken(storeToken, cookieToken)
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
          await userStore.logout()
        }
      }

      const decision = decideRouteAccess({
        path: to.path,
        fullPath: to.fullPath,
        whiteList,
        matched: to.matched,
        storeAccessToken: userStore.accessToken,
        cookieAccessToken: cookieToken,
        accountRoles: userStore.user.accountRoles
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

  router.afterEach(() => {
    LoadingService.done()
  })

  router.onError((e) => {
    LoadingService.done()
    console.error('Navigation guard error:', e)
  })
}
