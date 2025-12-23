import { KrxCollector } from '@investand/collectors/financial/krxCollector'

describe('KrxCollector', () => {
  describe('fetchKOSPIData', () => {
    it('should fetch KOSPI data successfully', async () => {
      const testDate = '2024-01-01'
      const result = await KrxCollector.fetchKOSPIData(testDate)
      
      expect(result).toHaveProperty('date')
      expect(result).toHaveProperty('close')
      expect(result).toHaveProperty('volume')
      expect(typeof result.close).toBe('string')
      expect(typeof result.volume).toBe('string')
    })

    it('should handle API errors gracefully', async () => {
      // Mock API failure
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('API Error'))
      
      const result = await KrxCollector.fetchKOSPIData('2024-01-01')
      
      // Should return neutral/default values on error
      expect(result).toBeDefined()
      expect(typeof result.close).toBe('string')
      
      jest.restoreAllMocks()
    })

    it('should validate date format', async () => {
      await expect(
        KrxCollector.fetchKOSPIData('invalid-date')
      ).rejects.toThrow()
    })
  })

  describe('fetchInvestorTradingData', () => {
    it('should fetch investor trading data with proper structure', async () => {
      const testDate = '2024-01-01'
      const result = await KrxCollector.fetchInvestorTradingData(testDate)
      
      expect(result).toHaveProperty('date')
      expect(result).toHaveProperty('individual')
      expect(result).toHaveProperty('foreign')
      expect(result).toHaveProperty('institutional')
      
      // Check that trading values are properly formatted
      expect(typeof result.individual).toBe('string')
      expect(typeof result.foreign).toBe('string')
      expect(typeof result.institutional).toBe('string')
    })

    it('should handle weekend/holiday dates', async () => {
      // Test with a Sunday (no trading day)
      const sunday = '2024-01-07' // Assuming this is a Sunday
      const result = await KrxCollector.fetchInvestorTradingData(sunday)
      
      // Should handle gracefully, possibly return previous trading day data
      expect(result).toBeDefined()
    })
  })

  describe('API authentication', () => {
    it('should handle token refresh', async () => {
      // This test would verify token refresh mechanism
      const tokenSpy = jest.spyOn(KrxCollector, 'getAccessToken' as any)
      
      await KrxCollector.fetchKOSPIData('2024-01-01')
      
      expect(tokenSpy).toHaveBeenCalled()
      
      jest.restoreAllMocks()
    })
  })
})