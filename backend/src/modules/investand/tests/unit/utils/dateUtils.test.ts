import { formatDate, parseDate, isValidDateString, isBusinessDay, getLastBusinessDay } from '@/utils/common/dateUtils'

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDate(date)

      expect(result).toMatch(/2024-01-1[45]/)
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
  })

  describe('isValidDateString', () => {
    it('should validate correct dates', () => {
      expect(isValidDateString('2024-01-15')).toBe(true)
      expect(isValidDateString('2024-02-29')).toBe(true) // leap year
      expect(isValidDateString('2024-12-31')).toBe(true)
    })

    it('should reject invalid dates', () => {
      expect(isValidDateString('invalid')).toBe(false)
      expect(isValidDateString('2024-13-01')).toBe(false)
      expect(isValidDateString('2024-01-32')).toBe(false)
      expect(isValidDateString('')).toBe(false)
    })

    it('should handle different date formats', () => {
      expect(isValidDateString('01/15/2024')).toBe(false) // Only YYYY-MM-DD supported
      expect(isValidDateString('15-01-2024')).toBe(false) // Wrong format
    })
  })

  describe('isBusinessDay', () => {
    it('should identify weekdays as business days', () => {
      const monday = new Date('2024-01-01') // Monday
      const friday = new Date('2024-01-05') // Friday

      expect(isBusinessDay(monday)).toBe(true)
      expect(isBusinessDay(friday)).toBe(true)
    })

    it('should identify weekends as non-business days', () => {
      const saturday = new Date('2024-01-06') // Saturday
      const sunday = new Date('2024-01-07') // Sunday

      expect(isBusinessDay(saturday)).toBe(false)
      expect(isBusinessDay(sunday)).toBe(false)
    })
  })

  describe('getLastBusinessDay', () => {
    it('should return the same date if it is a business day', () => {
      const monday = new Date('2024-01-01') // Monday
      const result = getLastBusinessDay(monday)

      expect(formatDate(result)).toBe('2024-01-01')
    })

    it('should return previous Friday if date is Saturday', () => {
      const saturday = new Date('2024-01-06') // Saturday
      const result = getLastBusinessDay(saturday)

      expect(formatDate(result)).toBe('2024-01-05') // Friday
    })

    it('should return previous Friday if date is Sunday', () => {
      const sunday = new Date('2024-01-07') // Sunday
      const result = getLastBusinessDay(sunday)

      expect(formatDate(result)).toBe('2024-01-05') // Friday
    })
  })
})