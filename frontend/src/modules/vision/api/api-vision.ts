import service from '@/api/common/axios-voyagerss'
import axios from 'axios'

export interface ApiEnvelope<T> {
  result: 'SUCCESS' | 'ERROR'
  message: string
  data: T | null
}

export interface VisionEndpoints {
  camBaseUrl: string
  judgeBaseUrl: string
}

export interface JudgeRecord {
  id: number
  created_at: string
  endpoint: string
  question: string
  choices: string[] | null
  result: Record<string, number>
  image_filename: string
  device: string
  model_name: string
}

function readError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string') {
      return (data as { message: string }).message
    }
    return error.message
  }
  return '요청에 실패했습니다.'
}

async function unwrap<T>(request: Promise<{ data: ApiEnvelope<T> }>): Promise<ApiEnvelope<T>> {
  try {
    const response = await request
    return response.data
  } catch (error) {
    return { result: 'ERROR', message: readError(error), data: null }
  }
}

export function visionAssetUrl(path: string): string {
  const base = String(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  return `${base}${path}`
}

export function getVisionConfig(): Promise<ApiEnvelope<VisionEndpoints>> {
  return unwrap(service.get('/vision/config'))
}

export function saveVisionConfig(body: VisionEndpoints): Promise<ApiEnvelope<VisionEndpoints>> {
  return unwrap(service.put('/vision/config', body))
}

export function getCamStatus(): Promise<ApiEnvelope<Record<string, unknown>>> {
  return unwrap(service.get('/vision/cam/status'))
}

export function getJudgeHealth(): Promise<ApiEnvelope<{ device: string; model_name: string }>> {
  return unwrap(service.get('/vision/judge/health'))
}

export function listJudgeRecords(): Promise<ApiEnvelope<JudgeRecord[]>> {
  return unwrap(service.get('/vision/judge/records'))
}

function judgeForm(image: File, question: string, choices?: string): FormData {
  const form = new FormData()
  form.append('image', image)
  form.append('question', question)
  if (choices !== undefined) {
    form.append('choices', choices)
  }
  return form
}

const multipart = {
  timeout: 180000,
  transformRequest: [(data: FormData, headers: Record<string, unknown>) => {
    if (headers) {
      delete headers['Content-Type']
    }
    return data
  }],
}

export function postJudgeBool(image: File, question: string): Promise<ApiEnvelope<{ probability: number }>> {
  return unwrap(service.post('/vision/judge/bool', judgeForm(image, question), multipart))
}

export function postJudgeChoice(
  image: File,
  question: string,
  choices: string,
): Promise<ApiEnvelope<{ probabilities: Record<string, number> }>> {
  return unwrap(service.post('/vision/judge/choice', judgeForm(image, question, choices), multipart))
}
