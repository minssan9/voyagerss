export function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    'SCHEDULED': '예정됨',
    'IN_PROGRESS': '진행중',
    'COMPLETED': '완료됨',
    'CANCELLED': '취소됨'
  }
  return statusMap[status] || status
}

export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'SCHEDULED': 'blue',
    'IN_PROGRESS': 'green',
    'COMPLETED': 'purple',
    'CANCELLED': 'grey'
  }
  return colorMap[status] || 'grey'
}

export function getRequestStatusLabel(status: string | null): string {
  if (!status) return ''
  
  const statusMap: Record<string, string> = {
    'PENDING': '승인 대기중',
    'APPROVED': '승인됨',
    'REJECTED': '거절됨',
    'ACTIVE': '참여 중',
    'INACTIVE': '참여 종료'
  }
  return statusMap[status] || status
}

export function getRequestStatusColor(status: string | null): string {
  if (!status) return 'grey'
  
  const colorMap: Record<string, string> = {
    'PENDING': 'orange',
    'APPROVED': 'green',
    'REJECTED': 'red',
    'ACTIVE': 'teal',
    'INACTIVE': 'grey'
  }
  return colorMap[status] || 'grey'
} 

