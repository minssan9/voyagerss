import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuth } from '@/composables/auth/useAuth'

describe('useAuth composable', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('authentication state management', () => {
    it('should initialize with non-authenticated state', () => {
      const { isAuthenticated, user } = useAuth()
      
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
    })

    it('should set authenticated state after login', async () => {
      const { login, isAuthenticated, user } = useAuth()
      
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      }
      
      await login('testuser', 'password123')
      
      expect(isAuthenticated.value).toBe(true)
      expect(user.value).toEqual(mockUser)
    })

    it('should clear state after logout', async () => {
      const { login, logout, isAuthenticated, user } = useAuth()
      
      // Login first
      await login('testuser', 'password123')
      expect(isAuthenticated.value).toBe(true)
      
      // Then logout
      await logout()
      
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
    })
  })

  describe('token management', () => {
    it('should store token on successful login', async () => {
      const { login, getToken } = useAuth()
      
      await login('testuser', 'password123')
      const token = getToken()
      
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
    })

    it('should remove token on logout', async () => {
      const { login, logout, getToken } = useAuth()
      
      await login('testuser', 'password123')
      expect(getToken()).toBeTruthy()
      
      await logout()
      expect(getToken()).toBeFalsy()
    })

    it('should validate token expiration', () => {
      const { isTokenValid } = useAuth()
      
      // Test with expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid'
      expect(isTokenValid(expiredToken)).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should handle login errors gracefully', async () => {
      const { login, error, isAuthenticated } = useAuth()
      
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      
      await login('wronguser', 'wrongpass')
      
      expect(isAuthenticated.value).toBe(false)
      expect(error.value).toBeTruthy()
      expect(error.value).toContain('Network error')
    })

    it('should handle invalid credentials', async () => {
      const { login, error, isAuthenticated } = useAuth()
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid credentials' })
      })
      
      await login('wronguser', 'wrongpass')
      
      expect(isAuthenticated.value).toBe(false)
      expect(error.value).toContain('Invalid credentials')
    })
  })

  describe('persistence', () => {
    it('should restore auth state from localStorage', () => {
      // Simulate stored auth data
      localStorage.setItem('auth_token', 'valid-token')
      localStorage.setItem('auth_user', JSON.stringify({
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      }))
      
      const { isAuthenticated, user } = useAuth()
      
      expect(isAuthenticated.value).toBe(true)
      expect(user.value?.username).toBe('testuser')
    })

    it('should handle corrupted stored data', () => {
      // Simulate corrupted data
      localStorage.setItem('auth_user', 'invalid-json')
      
      const { isAuthenticated, user } = useAuth()
      
      expect(isAuthenticated.value).toBe(false)
      expect(user.value).toBeNull()
    })
  })
})