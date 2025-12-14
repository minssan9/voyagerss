import {
  createRouter,
  createWebHistory,
} from 'vue-router'
import { useAuth } from '@/composables/auth/useAuth'

import routes from './routes'

const Router = createRouter({
  scrollBehavior: () => ({ left: 0, top: 0 }),
  routes,
  history: createWebHistory()
})

// Navigation guards for admin authentication
Router.beforeEach((to, _from, next) => {
  const { checkAuth } = useAuth()
  const isAuthenticated = checkAuth()

  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      // Redirect to admin login
      next({ name: 'admin-login' })
      return
    }
  }

  // Check if route requires guest (not authenticated)
  if (to.meta.requiresGuest) {
    if (isAuthenticated) {
      // Redirect to admin dashboard
      next({ name: 'admin-dashboard' })
      return
    }
  }

  // // Set page title
  // if (to.meta.title) {
  //   document.title = `${to.meta.title} | investand`
  // }

  next()
})

export default Router 