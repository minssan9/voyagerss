import { createRouter, createWebHistory } from 'vue-router'
import { setupRouterGuards } from './permission'
import { Loading } from 'quasar'
import { routes } from './routes'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

// Setup navigation guards
setupRouterGuards(router)

// Handle errors that might prevent afterEach from firing
router.onError(() => {
    Loading.hide()
})

export default router


