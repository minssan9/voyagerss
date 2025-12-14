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

// Task status display mappings
export const taskStatusLabels: Record<TaskStatus, string> = {
  [TaskStatus.SCHEDULED]: '예정됨',
  [TaskStatus.IN_PROGRESS]: '진행중',
  [TaskStatus.COMPLETED]: '완료됨',
  [TaskStatus.CANCELLED]: '취소됨'
}

export const taskStatusColors: Record<TaskStatus, string> = {
  [TaskStatus.SCHEDULED]: 'blue',
  [TaskStatus.IN_PROGRESS]: 'green',
  [TaskStatus.COMPLETED]: 'purple',
  [TaskStatus.CANCELLED]: 'grey'
}

// Request status display mappings
export const requestStatusLabels: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: '승인 대기중',
  [RequestStatus.APPROVED]: '승인됨',
  [RequestStatus.REJECTED]: '거절됨',
  [RequestStatus.ACTIVE]: '참여 중',
  [RequestStatus.INACTIVE]: '참여 종료'
}

export const requestStatusColors: Record<RequestStatus, string> = {
  [RequestStatus.PENDING]: 'orange',
  [RequestStatus.APPROVED]: 'green',
  [RequestStatus.REJECTED]: 'red',
  [RequestStatus.ACTIVE]: 'teal',
  [RequestStatus.INACTIVE]: 'grey'
}

// Helper functions for status display
export function getTaskStatusLabel(status?: string): string {
  if (!status) return ''
  return taskStatusLabels[status as TaskStatus] || status
}

export function getTaskStatusColor(status?: string): string {
  if (!status) return 'grey'
  return taskStatusColors[status as TaskStatus] || 'grey'
}

export function getRequestStatusLabel(status?: string | null): string {
  if (!status) return ''
  return requestStatusLabels[status as RequestStatus] || status
}

export function getRequestStatusColor(status?: string | null): string {
  if (!status) return 'grey'
  return requestStatusColors[status as RequestStatus] || 'grey'
} 