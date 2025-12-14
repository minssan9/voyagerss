import { Router, RouteLocationNormalized } from 'vue-router'
import { useUserStore } from '@/stores/modules/store_user'
import { LoadingService } from '@/utils/loading'

// Whitelist routes that don't require authentication
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
  '/404'
]

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: any) => {
    // Start progress bar
    LoadingService.start()

    const userStore = useUserStore()
    const hasToken = userStore.accessToken
    
    // Allow access to whitelisted routes
    if (whiteList.includes(to.path) || whiteList.some(path => path.endsWith('*') && to.path.startsWith(path.slice(0, -1)))) {
      next()
      return
    }

    // Check if user is authenticated
    if (!hasToken) {
      next(`/401?redirect=${to.path}`)
      return
    }

    try {
      // Check route permissions
      const userRole = userStore.role
      const requiredRoles = to.meta?.roles as string[] | undefined

      // If route requires specific roles
      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(userRole)) {
          next('/403')
          return
        }
      }

      next()
    } catch (error) {
      // Handle any errors during authentication check
      console.error('Navigation guard error:', error)
      userStore.resetUserState()
      next(`/401?redirect=${to.path}`)
    }
  })

  router.afterEach(() => {
    // Complete progress bar
    LoadingService.done()
  })

  router.onError(() => {
    // Ensure progress bar is completed on error
    LoadingService.done()
  })
} 