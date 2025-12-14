/**
 * 날짜 관련 유틸리티 함수들
 */

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 영업일 여부 확인 (월~금)
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  return day >= 1 && day <= 5 // 월요일(1) ~ 금요일(5)
}

/**
 * 가장 최근 영업일 조회
 */
export function getLastBusinessDay(date?: Date): Date {
  const targetDate = date ? new Date(date) : new Date()
  
  while (!isBusinessDay(targetDate)) {
    targetDate.setDate(targetDate.getDate() - 1)
  }
  
  return targetDate
}

/**
 * 문자열을 Date 객체로 변환
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString)
}

/**
 * 두 날짜 사이의 일수 계산
 */
export function getDaysBetween(startDate: Date, endDate: Date): number {
  const timeDiff = endDate.getTime() - startDate.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

/**
 * N일 전 날짜 구하기
 */
export function getDaysAgo(days: number, baseDate?: Date): Date {
  const date = baseDate ? new Date(baseDate) : new Date()
  date.setDate(date.getDate() - days)
  return date
}

/**
 * 날짜 문자열이 유효한지 확인
 */
export function isValidDateString(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateString)) return false
  
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
} 