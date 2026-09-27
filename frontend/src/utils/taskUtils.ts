import { i18n } from '@/locales/i18n'

function translateStatus(keyPrefix: string, status: string): string {
  const key = `${keyPrefix}.${status}`
  const translated = i18n.global.t(key)
  return translated === key ? status : translated
}

export function getStatusLabel(status: string): string {
  return translateStatus('task.statusLabels', status)
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    SCHEDULED: 'blue',
    IN_PROGRESS: 'green',
    COMPLETED: 'purple',
    CANCELLED: 'grey'
  }
  return colorMap[status] || 'grey'
}

export function getRequestStatusLabel(status: string | null): string {
  if (!status) return ''
  return translateStatus('task.requestStatusLabels', status)
}

export function getRequestStatusColor(status: string | null): string {
  if (!status) return 'grey'

  const colorMap: Record<string, string> = {
    PENDING: 'orange',
    APPROVED: 'green',
    REJECTED: 'red',
    ACTIVE: 'teal',
    INACTIVE: 'grey'
  }
  return colorMap[status] || 'grey'
}
