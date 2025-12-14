import { date } from 'quasar'

export function formatDateRange(start?: string, end?: string): string {
  if (!start || !end) return '-'
  
  const startDate = date.formatDate(start, 'YYYY.MM.DD')
  const endDate = date.formatDate(end, 'YYYY.MM.DD')
  
  if (startDate === endDate) {
    return startDate
  }
  return `${startDate} - ${endDate}`
}

export function formatTimeRange(start?: string, end?: string): string {
  if (!start || !end) return '-'
  
  const startTime = date.formatDate(start, 'HH:mm')
  const endTime = date.formatDate(end, 'HH:mm')
  
  return `${startTime} - ${endTime}`
} 