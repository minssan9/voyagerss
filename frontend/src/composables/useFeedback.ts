import { ref } from 'vue'
import service from '@/api/common/axios-voyagerss'

export interface FeedbackItem {
  id: number
  title: string
  content: string
  pageUrl?: string | null
  status: string
  fileName?: string | null
  fileMime?: string | null
  createdAt: string
  updatedAt: string
  account?: { accountId: number; username: string; email: string } | null
}

export interface FeedbackListResult {
  items: FeedbackItem[]
  total: number
  page: number
  pageSize: number
}

export interface CreateFeedbackPayload {
  title: string
  content: string
  pageUrl?: string
  fileName?: string
  fileMime?: string
  fileBase64?: string
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result ?? '')
      resolve(result.substring(result.indexOf(',') + 1))
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function useFeedback() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function createFeedback(payload: CreateFeedbackPayload & { file?: File | null }) {
    loading.value = true
    error.value = null
    try {
      const { file, ...rest } = payload
      const body: CreateFeedbackPayload = { ...rest }

      if (file) {
        body.fileName = file.name
        body.fileMime = file.type
        body.fileBase64 = await fileToBase64(file)
      }

      const { data } = await service.post('/v2/feedback', body)
      return data as { id: number; status: string }
    } catch (e: any) {
      error.value = e?.message ?? '피드백 등록에 실패했습니다.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchFeedbackList(params: { status?: string; page?: number; pageSize?: number } = {}) {
    loading.value = true
    error.value = null
    try {
      const { data } = await service.get('/v2/feedback', { params })
      return data as FeedbackListResult
    } catch (e: any) {
      error.value = e?.message ?? '피드백 목록을 불러오지 못했습니다.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateFeedbackStatus(id: number, status: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await service.patch(`/v2/feedback/${id}`, { status })
      return data as { id: number; status: string }
    } catch (e: any) {
      error.value = e?.message ?? '피드백 상태 변경에 실패했습니다.'
      throw e
    } finally {
      loading.value = false
    }
  }

  function getFeedbackFileUrl(id: number): string {
    const baseURL = (service.defaults.baseURL ?? '').replace(/\/$/, '')
    return `${baseURL}/v2/feedback/${id}/file`
  }

  return {
    loading,
    error,
    createFeedback,
    fetchFeedbackList,
    updateFeedbackStatus,
    getFeedbackFileUrl,
  }
}
