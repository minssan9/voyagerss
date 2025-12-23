import service from '@/api/axios-voyagerss'

// Fear & Greed API Types
export interface FearGreedIndex {
  value: number
  level: string
  date: string
  components: {
    priceMomentum: number
    investorSentiment: number
    putCallRatio: number
    volatilityIndex: number
    safeHavenDemand: number
  }
}

export interface FearGreedHistoryItem {
  date: string
  value: number
  level: string
}

export interface FearGreedStats {
  distribution: {
    extremeFear: number
    fear: number
    neutral: number
    greed: number
    extremeGreed: number
  }
  total: number
  averageIndex: number
  lastUpdated: string
}

export interface FearGreedCalculationResult {
  date: string
  value: number
  level: string
  confidence: number
  components: {
    priceMomentum: number
    investorSentiment: number
    putCallRatio: number
    volatilityIndex: number
    safeHavenDemand: number
  }
}

export interface FearGreedRangeResult {
  date: string
  value: number
  level: string
  status: 'success' | 'failed'
  message?: string
}

// Fear & Greed API Service
export const fearGreedApi = {
  // 현재 Fear & Greed Index 조회
  async getCurrentIndex(): Promise<FearGreedIndex> {
    try {
      const response = await service.get<{ success: boolean; data: FearGreedIndex; timestamp: string }>(
        '/investand/fear-greed/current'
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed current index fetch failed:', error)
      throw new Error('현재 Fear & Greed Index 조회에 실패했습니다.')
    }
  },

  // Fear & Greed Index 히스토리 조회
  async getHistory(days: number = 30): Promise<FearGreedHistoryItem[]> {
    try {
      const response = await service.get<{
        success: boolean;
        data: FearGreedHistoryItem[];
        meta: { totalDays: number; requestedDays: number };
        timestamp: string
      }>(
        `/investand/fear-greed/history?days=${days}`
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed history fetch failed:', error)
      throw new Error('Fear & Greed Index 히스토리 조회에 실패했습니다.')
    }
  },

  // 특정 날짜의 Fear & Greed Index 조회
  async getIndexByDate(date: string): Promise<FearGreedHistoryItem> {
    try {
      const response = await service.get<{ success: boolean; data: FearGreedHistoryItem; timestamp: string }>(
        `/investand/fear-greed/date/${date}`
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed index by date fetch failed:', error)
      throw new Error('특정 날짜 Fear & Greed Index 조회에 실패했습니다.')
    }
  },

  // Fear & Greed Index 통계 조회
  async getStats(): Promise<FearGreedStats> {
    try {
      const response = await service.get<{ success: boolean; data: FearGreedStats; timestamp: string }>(
        '/investand/fear-greed/stats'
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed stats fetch failed:', error)
      throw new Error('Fear & Greed Index 통계 조회에 실패했습니다.')
    }
  },

  // 수동 Index 계산 (관리자 기능)
  async calculateIndex(date: string): Promise<FearGreedCalculationResult> {
    try {
      const response = await service.post<{ success: boolean; data: FearGreedCalculationResult }>(
        '/investand/fear-greed/calculate',
        { date }
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed index calculation failed:', error)
      throw new Error('Fear & Greed Index 계산에 실패했습니다.')
    }
  },

  // 범위 재계산 (관리자 기능)
  async recalculateRange(startDate: string, endDate: string): Promise<FearGreedRangeResult[]> {
    try {
      const response = await service.post<{ success: boolean; data: FearGreedRangeResult[] }>(
        '/investand/fear-greed/recalculate-range',
        { startDate, endDate }
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed range recalculation failed:', error)
      throw new Error('Fear & Greed Index 범위 재계산에 실패했습니다.')
    }
  },

  // Index 구성 요소 상세 조회
  async getComponents(date: string): Promise<FearGreedIndex['components']> {
    try {
      const response = await service.get<{ success: boolean; data: FearGreedIndex['components'] }>(
        `/investand/fear-greed/components/${date}`
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed components fetch failed:', error)
      throw new Error('Fear & Greed Index 구성 요소 조회에 실패했습니다.')
    }
  },

  // Index 레벨별 통계 조회
  async getLevelStats(): Promise<{
    extremeFear: number
    fear: number
    neutral: number
    greed: number
    extremeGreed: number
    total: number
    averageIndex: number
  }> {
    try {
      const response = await service.get<{
        success: boolean;
        data: {
          distribution: {
            extremeFear: number
            fear: number
            neutral: number
            greed: number
            extremeGreed: number
          }
          total: number
          averageIndex: number
          lastUpdated: string
        }
      }>(
        '/investand/fear-greed/stats'
      )
      return {
        ...response.data.data.distribution,
        total: response.data.data.total,
        averageIndex: response.data.data.averageIndex
      }
    } catch (error) {
      console.error('Fear & Greed level stats fetch failed:', error)
      throw new Error('Fear & Greed Index 레벨별 통계 조회에 실패했습니다.')
    }
  },

  // Index 트렌드 분석
  async getTrendAnalysis(days: number = 30): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable'
    averageChange: number
    volatility: number
    prediction: number
  }> {
    try {
      const response = await service.get<{
        success: boolean;
        data: {
          trend: 'increasing' | 'decreasing' | 'stable'
          averageChange: number
          volatility: number
          prediction: number
        }
      }>(
        `/investand/fear-greed/trend?days=${days}`
      )
      return response.data.data
    } catch (error) {
      console.error('Fear & Greed trend analysis failed:', error)
      throw new Error('Fear & Greed Index 트렌드 분석에 실패했습니다.')
    }
  },

  // Index 알림 설정 (관리자 기능)
  async setAlertThreshold(threshold: {
    extremeFear: number
    fear: number
    neutral: number
    greed: number
    extremeGreed: number
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await service.post<{ success: boolean; message: string }>(
        '/investand/fear-greed/alerts/threshold',
        threshold
      )
      return response.data
    } catch (error) {
      console.error('Fear & Greed alert threshold setting failed:', error)
      throw new Error('Fear & Greed Index 알림 임계값 설정에 실패했습니다.')
    }
  },

  // Index 데이터 내보내기
  async exportData(params: {
    startDate: string
    endDate: string
    format: 'csv' | 'json' | 'excel'
  }): Promise<Blob> {
    try {
      const response = await service.get(
        `/investand/fear-greed/export?startDate=${params.startDate}&endDate=${params.endDate}&format=${params.format}`,
        { responseType: 'blob' }
      )
      return response.data
    } catch (error) {
      console.error('Fear & Greed data export failed:', error)
      throw new Error('Fear & Greed Index 데이터 내보내기에 실패했습니다.')
    }
  }
}

export default fearGreedApi


