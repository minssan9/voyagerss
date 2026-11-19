import service from '@/api/common/axios-voyagerss'

export type SubmissionType = 'COMPANY' | 'SYSTEM'

export interface ConsultingSubmissionPayload {
  type: SubmissionType
  companyName: string
  contactName: string
  email: string
  phone?: string
  message?: string
  locale?: string
  consent: boolean
  /** honeypot — 화면에 보이지 않는 필드, 항상 빈 값 */
  website?: string
  files: File[]
}

export interface ConsultingSubmissionResult {
  id: number
  fileCount: number
}

/** 업로드 제한 — backend consulting-submission.service.ts 와 동일 */
export const SUBMISSION_LIMITS = {
  maxFiles: 10,
  maxFileBytes: 10 * 1024 * 1024,
  maxTotalBytes: 18 * 1024 * 1024,
  extensions: [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.ppt', '.pptx', '.hwp', '.hwpx',
    '.txt', '.md', '.json', '.yaml', '.yml', '.sql', '.png', '.jpg', '.jpeg', '.zip'
  ]
} as const

/**
 * 기업/시스템 분석 문서 제출 (비로그인 공개 API)
 * 예) await submitConsultingDocuments({ type: 'COMPANY', companyName, contactName, email, consent: true, files })
 */
export async function submitConsultingDocuments(
  payload: ConsultingSubmissionPayload,
  onProgress?: (percent: number) => void
): Promise<ConsultingSubmissionResult> {
  const form = new FormData()
  const { files, ...fields } = payload
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v))
  })
  files.forEach((f) => form.append('files', f, f.name))

  const { data } = await service.post<ConsultingSubmissionResult>('/consulting/submissions', form, {
    timeout: 120_000,
    // 공통 인스턴스의 JSON Content-Type 을 덮어써야 FormData 가 multipart(boundary 자동)로 전송된다
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    }
  })
  return data
}
