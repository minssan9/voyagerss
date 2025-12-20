import { ref, computed } from 'vue'
import { adminApi, type AdminUser } from '@/api/investand/adminApi'

// Global auth state
const currentUser = ref<AdminUser | null>(null)
const isAuthenticated = ref(false)
const loading = ref(false)

export function useAuth() {
  // Check if user has admin permissions
  const hasPermission = computed(() => (permission: string) => {
    if (!currentUser.value) return false
    return currentUser.value.permissions.includes(permission) || currentUser.value.role === 'admin'
  })

  // Check if user is admin
  const isAdmin = computed(() => {
    return currentUser.value?.role === 'admin'
  })

  // Get stored token
  function getStoredToken(): string | null {
    return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
  }

  // Get stored user
  function getStoredUser(): AdminUser | null {
    const userStr = localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user')
    if (userStr) {
      try {
        return JSON.parse(userStr)
      } catch {
        return null
      }
    }
    return null
  }

  // Initialize auth state from storage
  async function initAuth(): Promise<void> {
    loading.value = true
    try {
      const token = getStoredToken()
      const storedUser = getStoredUser()

      if (token && storedUser) {
        // Validate token with server
        const user = await adminApi.validateToken(token)
        currentUser.value = user
        isAuthenticated.value = true
      }
    } catch (error) {
      // Token is invalid, clear storage
      logout()
    } finally {
      loading.value = false
    }
  }

  // Login function
  async function login(username: string, password: string, rememberMe = false): Promise<void> {
    loading.value = true
    try {
      const response = await adminApi.login(username, password)
      
      // Store auth data
      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem('admin_token', response.token)
      storage.setItem('admin_user', JSON.stringify(response.user))

      // Update state
      currentUser.value = response.user
      isAuthenticated.value = true
    } finally {
      loading.value = false
    }
  }

  // Logout function
  function logout(): void {
    // Clear storage
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    sessionStorage.removeItem('admin_token')
    sessionStorage.removeItem('admin_user')

    // Clear state
    currentUser.value = null
    isAuthenticated.value = false
  }

  // Check authentication status
  function checkAuth(): boolean {
    const token = getStoredToken()
    const user = getStoredUser()
    
    if (token && user) {
      currentUser.value = user
      isAuthenticated.value = true
      return true
    }
    
    return false
  }

  // Refresh user data
  async function refreshUser(): Promise<void> {
    const token = getStoredToken()
    if (!token) return

    try {
      const user = await adminApi.validateToken(token)
      currentUser.value = user
      
      // Update stored user data
      const storage = localStorage.getItem('admin_token') ? localStorage : sessionStorage
      storage.setItem('admin_user', JSON.stringify(user))
    } catch (error) {
      logout()
    }
  }

  return {
    // State
    currentUser: computed(() => currentUser.value),
    isAuthenticated: computed(() => isAuthenticated.value),
    loading: computed(() => loading.value),
    
    // Computed
    hasPermission,
    isAdmin,
    
    // Methods
    initAuth,
    login,
    logout,
    checkAuth,
    refreshUser,
    getStoredToken
  }
}


