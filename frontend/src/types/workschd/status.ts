import { i18n } from '@/locales/i18n'

// Task status enum
export enum TaskStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Request status enum
export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export const taskStatusColors: Record<TaskStatus, string> = {
  [TaskStatus.SCHEDULED]: 'blue',
  [TaskStatus.IN_PROGRESS]: 'green',
  [TaskStatus.COMPLETED]: 'purple',
  [TaskStatus.CANCELLED]: 'grey'
}

export const requestStatusColors: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: 'orange',
  [RequestStatus.APPROVED]: 'green',
  [RequestStatus.REJECTED]: 'red',
  [RequestStatus.ACTIVE]: 'teal',
  [RequestStatus.INACTIVE]: 'grey'
}

function translateStatus(keyPrefix: string, status: string): string {
  const key = `${keyPrefix}.${status}`
  const translated = i18n.global.t(key)
  return translated === key ? status : translated
}

export function getTaskStatusLabel(status?: string): string {
  if (!status) return ''
  return translateStatus('task.statusLabels', status)
}

export function getTaskStatusColor(status?: string): string {
  if (!status) return 'grey'
  return taskStatusColors[status as TaskStatus] || 'grey'
}

export function getRequestStatusLabel(status?: string | null): string {
  if (!status) return ''
  return translateStatus('task.requestStatusLabels', status)
}

export function getRequestStatusColor(status?: string | null): string {
  if (!status) return 'grey'
  return requestStatusColors[status as RequestStatus] || 'grey'
}
