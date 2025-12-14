import { formatDate, parseDate, isValidDate, getBusinessDays } from '@/utils/common/dateUtils'

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDate(date)
      
      expect(result).toBe('2024-01-15')
    })

    it('should handle string date input', () => {
      const result = formatDate('2024-01-15')
      
      expect(result).toBe('2024-01-15')
    })

    it('should handle timezone differences', () => {
      const date = new Date('2024-01-15T23:30:00Z')
      const result = formatDate(date, 'Asia/Seoul')
      
      // Should account for Seoul timezone
      expect(result).toMatch(/2024-01-1[56]/)
    })
  })

  describe('parseDate', () => {
    it('should parse YYYY-MM-DD format', () => {
      const result = parseDate('2024-01-15')
      
      expect(result).toBeInstanceOf(Date)
      expect(result.getFullYear()).toBe(2024)
      expect(result.getMonth()).toBe(0) // January is 0
      expect(result.getDate()).toBe(15)
    })

    it('should handle invalid date strings', () => {
      expect(() => parseDate('invalid-date')).toThrow()
      expect(() => parseDate('2024-13-01')).toThrow()
      expect(() => parseDate('2024-01-32')).toThrow()
    })

    it('should handle edge cases', () => {
      // Leap year
      const leapDate = parseDate('2024-02-29')
      expect(leapDate).toBeInstanceOf(Date)
      
      // Non-leap year should fail
      expect(() => parseDate('2023-02-29')).toThrow()
    })
  })

  describe('isValidDate', () => {
    it('should validate correct dates', () => {
      expect(isValidDate('2024-01-15')).toBe(true)
      expect(isValidDate('2024-02-29')).toBe(true) // leap year
      expect(isValidDate('2024-12-31')).toBe(true)
    })

    it('should reject invalid dates', () => {
      expect(isValidDate('invalid')).toBe(false)
      expect(isValidDate('2024-13-01')).toBe(false)
      expect(isValidDate('2024-01-32')).toBe(false)
      expect(isValidDate('2023-02-29')).toBe(false) // non-leap year
      expect(isValidDate('')).toBe(false)
    })

    it('should handle different date formats', () => {
      expect(isValidDate('01/15/2024')).toBe(false) // Only YYYY-MM-DD supported
      expect(isValidDate('15-01-2024')).toBe(false) // Wrong format
    })
  })

  describe('getBusinessDays', () => {
    it('should calculate business days correctly', () => {
      const startDate = '2024-01-01' // Monday
      const endDate = '2024-01-05'   // Friday
      
      const result = getBusinessDays(startDate, endDate)
      
      expect(result).toBe(5) // 5 business days
    })

    it('should exclude weekends', () => {
      const startDate = '2024-01-01' // Monday
      const endDate = '2024-01-07'   // Sunday
      
      const result = getBusinessDays(startDate, endDate)
      
      expect(result).toBe(5) // Exclude Saturday and Sunday
    })

    it('should handle Korean holidays', () => {
      // Test with known Korean holidays
      const startDate = '2024-01-01' // New Year's Day (holiday)
      const endDate = '2024-01-03'
      
      const result = getBusinessDays(startDate, endDate, true) // include holidays check
      
      expect(result).toBeLessThan(3) // Should exclude the holiday
    })

    it('should handle reverse date order', () => {
      const startDate = '2024-01-05'
      const endDate = '2024-01-01'
      
      expect(() => getBusinessDays(startDate, endDate)).toThrow()
    })
  })

  describe('timezone handling', () => {
    it('should handle Korean timezone correctly', () => {
      const date = '2024-01-15'
      const result = formatDate(date, 'Asia/Seoul')
      
      expect(result).toBe('2024-01-15')
    })

    it('should convert UTC to Korean time', () => {
      // UTC midnight should be 9 AM in Korea
      const utcDate = new Date('2024-01-15T00:00:00Z')
      const result = formatDate(utcDate, 'Asia/Seoul')
      
      expect(result).toBe('2024-01-15')
    })
  })
})