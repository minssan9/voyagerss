import service from '@/api/common/axios-voyagerss.js'
import { useUserStore } from '@/stores/common/store_user'
import type { RbacProfile } from '@/modules/workschd/api/api-rbac'
import Cookies from 'js-cookie'

const DEV_ADMIN = {
  email: 'admin@workschd.test',
  password: 'password123!',
}

const ALL_MODULES = ['workschd', 'aviation', 'aipr', 'vision']

function withDevMenu(profile: RbacProfile | null): RbacProfile {
  const roles = profile?.roles ?? []
  const hasAdmin = roles.some((role) => role.code === 'ADMIN' || role.code === 'SUPER_ADMIN')
  return {
    userId: profile?.userId ?? 'dev-admin',
    roles: hasAdmin ? roles : [...roles, { code: 'ADMIN', module: 'ALL' }],
    pages: profile?.pages ?? [],
    modules: ALL_MODULES,
    isAdmin: true,
  }
}

export async function bootDevSession() {
  if (!import.meta.env.DEV || import.meta.env.VITE_DEV_AUTO_LOGIN === 'false') return

  const userStore = useUserStore()
  const existing = userStore.accessToken || Cookies.get('accessToken')
  if (existing) {
    userStore.setAccessToken(String(existing).replace(/^Bearer\s+/i, ''))
    try {
      await userStore.fetchUser()
    } catch (error) {
      console.warn('[dev] existing session profile load failed', error)
    }
    try {
      await userStore.fetchRbacProfile()
    } catch (error) {
      console.warn('[dev] existing session RBAC load failed', error)
    }
    if (!userStore.isWorker) {
      userStore.rbacProfile = withDevMenu(userStore.rbacProfile)
    }
    return
  }

  try {
    const response = await service.post<{ accessToken: string; refreshToken?: string }>(
      '/identity/auth/login',
      DEV_ADMIN,
    )
    const { accessToken, refreshToken } = response.data
    userStore.setAccessToken(accessToken)
    if (refreshToken) userStore.setRefreshToken(refreshToken)
    await userStore.login(accessToken)
    try {
      await userStore.fetchUser()
    } catch (error) {
      console.warn('[dev] test account profile load failed', error)
    }
    await userStore.fetchRbacProfile()
  } catch (error) {
    console.warn('[dev] test account auto-login failed', error)
  }

  if (!userStore.isWorker) {
    userStore.rbacProfile = withDevMenu(userStore.rbacProfile)
  }
}
