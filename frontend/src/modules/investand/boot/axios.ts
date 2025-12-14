import { boot } from 'quasar/wrappers'
import axios, { AxiosInstance } from 'axios'

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance
    $api: AxiosInstance
  }
}

// API 기본 설정
// Development: Use local backend, Production: Use relative path (proxied by nginx)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api')


// API 베이스 URL 설정
const api = axios.create({ 
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
})

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    console.log(`API 요청: ${config.method?.toUpperCase()} ${config.url}`)

    // Add Authorization header if token exists
    const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => {
    console.error('API 요청 오류:', error)
    return Promise.reject(error)
  }
)

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    console.log(`API 응답: ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error('API 응답 오류:', error.response?.status, error.response?.data)

    // Handle authentication errors
    if (error.response?.status === 401) {
      // Token expired or invalid, clear auth data
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      sessionStorage.removeItem('admin_token')
      sessionStorage.removeItem('admin_user')

      // Redirect to login if not already there
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login'
      }
    }

    return Promise.reject(error)
  }
)

export default boot(({ app }) => {
  // Vue 앱에 axios 인스턴스를 주입
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api } 