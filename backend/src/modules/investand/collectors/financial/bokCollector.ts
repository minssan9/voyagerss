import axios from 'axios'

// BOK API 데이터 타입 정의
export interface InterestRateData {
  date: string
  baseRate: number
  callRate: number
  cd91Rate: number
  treasuryBond3Y: number
  treasuryBond10Y: number
}

export interface ExchangeRateData {
  date: string
  usdKrw: number
  eurKrw: number
  jpyKrw: number
  cnyKrw: number
}

export interface EconomicIndicatorData {
  date: string
  cpi: number
  ppi: number
  unemploymentRate: number
  gdpGrowthRate: number
}

export class BOKCollector {
  private static readonly BASE_URL = 'https://ecos.bok.or.kr/api'
  private static readonly API_KEY = process.env.BOK_API_KEY || 'sample_key'
  private static readonly TIMEOUT = 10000

  /**
   * 금리 데이터 수집 (기준금리, 콜금리, CD금리, 국고채 등)
   */
  static async fetchInterestRateData(date: string): Promise<InterestRateData | null> {
    try {
      console.log(`[BOK] 금리 데이터 수집 시작: ${date}`)
      
      const formattedDate = date.replace(/-/g, '')
      
      // 여러 금리 지표를 병렬로 수집
      const [baseRate, callRate, cd91Rate, treasury3Y, treasury10Y] = await Promise.all([
        this.fetchSingleIndicator('722Y001', formattedDate), // 기준금리
        this.fetchSingleIndicator('817Y002', formattedDate), // 콜금리
        this.fetchSingleIndicator('817Y003', formattedDate), // CD91일
        this.fetchSingleIndicator('817Y006', formattedDate), // 국고채3년
        this.fetchSingleIndicator('817Y007', formattedDate)  // 국고채10년
      ])

      return {
        date,
        baseRate: parseFloat(baseRate || '0'),
        callRate: parseFloat(callRate || '0'),
        cd91Rate: parseFloat(cd91Rate || '0'),
        treasuryBond3Y: parseFloat(treasury3Y || '0'),
        treasuryBond10Y: parseFloat(treasury10Y || '0')
      }

    } catch (error) {
      console.error(`[BOK] 금리 데이터 수집 실패 (${date}):`, (error as any)?.message)
      return null
    }
  }

  /**
   * 환율 데이터 수집
   */
  static async fetchExchangeRateData(date: string): Promise<ExchangeRateData | null> {
    try {
      console.log(`[BOK] 환율 데이터 수집 시작: ${date}`)
      
      const formattedDate = date.replace(/-/g, '')
      
      // 주요 환율 지표를 병렬로 수집
      const [usdKrw, eurKrw, jpyKrw, cnyKrw] = await Promise.all([
        this.fetchSingleIndicator('731Y001', formattedDate), // USD/KRW
        this.fetchSingleIndicator('731Y002', formattedDate), // EUR/KRW
        this.fetchSingleIndicator('731Y003', formattedDate), // JPY/KRW (100엔당)
        this.fetchSingleIndicator('731Y004', formattedDate)  // CNY/KRW
      ])

      return {
        date,
        usdKrw: parseFloat(usdKrw || '0'),
        eurKrw: parseFloat(eurKrw || '0'),
        jpyKrw: parseFloat(jpyKrw || '0'),
        cnyKrw: parseFloat(cnyKrw || '0')
      }

    } catch (error) {
      console.error(`[BOK] 환율 데이터 수집 실패 (${date}):`, (error as any)?.message)
      return null
    }
  }

  /**
   * 경제지표 데이터 수집 (CPI, PPI, 실업률 등)
   */
  static async fetchEconomicIndicatorData(date: string): Promise<EconomicIndicatorData | null> {
    try {
      console.log(`[BOK] 경제지표 데이터 수집 시작: ${date}`)
      
      const yearMonth = date.slice(0, 7).replace('-', '')
      
      // 월별 경제지표를 병렬로 수집
      const [cpi, ppi, unemploymentRate] = await Promise.all([
        this.fetchSingleIndicator('901Y009', yearMonth), // 소비자물가지수
        this.fetchSingleIndicator('404Y014', yearMonth), // 생산자물가지수  
        this.fetchSingleIndicator('200Y002', yearMonth)  // 실업률
      ])

      return {
        date,
        cpi: parseFloat(cpi || '0'),
        ppi: parseFloat(ppi || '0'),
        unemploymentRate: parseFloat(unemploymentRate || '0'),
        gdpGrowthRate: 0 // GDP는 분기별 데이터이므로 별도 처리 필요
      }

    } catch (error) {
      console.error(`[BOK] 경제지표 데이터 수집 실패 (${date}):`, (error as any)?.message)
      return null
    }
  }

  /**
   * 단일 지표 데이터 수집 (BOK ECOS API 공통 함수)
   */
  private static async fetchSingleIndicator(
    statCode: string,
    startDate: string,
    endDate?: string,
    cycle?: string,
    startCount: number = 1,
    endCount: number = 10,
    responseType: string = 'json',
    lang: string = 'kr'
  ): Promise<string | null> {
    try {
      // Determine cycle based on statCode and date format
      const determinedCycle = cycle || this.determineCycle(statCode, startDate)
      
      const url = `${this.BASE_URL}/StatisticSearch/${this.API_KEY}/${responseType}/${lang}/${startCount}/${endCount}/${statCode}/${determinedCycle}/${startDate}/${endDate || startDate}`
      
      const response = await axios.get(url, {
        timeout: this.TIMEOUT,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (!response.data?.StatisticSearch?.row?.length) {
        throw new Error(`[BOK] 지표 ${statCode} 데이터 없음: ${startDate}`)
      }
      
      const value = response.data.StatisticSearch.row[0].DATA_VALUE
      if (!value && value !== 0) {
        throw new Error(`[BOK] 지표 ${statCode} 데이터 값 누락: ${startDate}`)
      }

      return value

    } catch (error) {
      const errorMessage = `[BOK] 지표 ${statCode} 수집 실패: ${(error as any)?.message}`
      console.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 지표코드와 날짜 형식에 따라 주기 결정
   */
  private static determineCycle(statCode: string, date: string): string {
    // Monthly indicators (CPI, PPI, Unemployment Rate)
    const monthlyIndicators = ['901Y009', '404Y014', '200Y002']
    if (monthlyIndicators.includes(statCode)) {
      return 'M'
    }

    // Quarterly indicators (GDP)
    const quarterlyIndicators = ['200Y001']
    if (quarterlyIndicators.includes(statCode)) {
      return 'Q'
    }

    // Annual indicators
    const annualIndicators = ['200Y003']
    if (annualIndicators.includes(statCode)) {
      return 'A'
    }

    // Check date format
    if (date.length === 4) { // YYYY
      return 'A'
    } else if (date.length === 6) { // YYYYMM
      return 'M'
    } else if (date.includes('Q')) { // YYYYQ1
      return 'Q'
    }

    // Default to daily for all other cases
    return 'D'
  }

  /**
   * 특정 날짜의 모든 BOK 데이터 수집
   */
  static async collectDailyData(date: string): Promise<{
    interestRates: InterestRateData | null
    exchangeRates: ExchangeRateData | null
    economicIndicators: EconomicIndicatorData | null
  }> {
    console.log(`[BOK] ${date} 일일 데이터 수집 시작`)
    
    const results = {
      interestRates: null as InterestRateData | null,
      exchangeRates: null as ExchangeRateData | null,
      economicIndicators: null as EconomicIndicatorData | null
    }

    try {
      // 금리 데이터 수집
      try {
        results.interestRates = await this.fetchInterestRateData(date)
        console.log(`[BOK] 금리 데이터 수집 완료: ${date}`)
      } catch (error) {
        console.error(`[BOK] 금리 데이터 수집 실패 (${date}):`, (error as any)?.message)
      }

      // 환율 데이터 수집
      try {
        results.exchangeRates = await this.fetchExchangeRateData(date)
        console.log(`[BOK] 환율 데이터 수집 완료: ${date}`)
      } catch (error) {
        console.error(`[BOK] 환율 데이터 수집 실패 (${date}):`, (error as any)?.message)
      }

      // 경제지표 데이터 수집
      try {
        results.economicIndicators = await this.fetchEconomicIndicatorData(date)
        console.log(`[BOK] 경제지표 데이터 수집 완료: ${date}`)
      } catch (error) {
        console.error(`[BOK] 경제지표 데이터 수집 실패 (${date}):`, (error as any)?.message)
      }

      console.log(`[BOK] ${date} 일일 데이터 수집 완료`)
      return results

    } catch (error) {
      console.error(`[BOK] ${date} 일일 데이터 수집 중 오류:`, (error as any)?.message)
      return results
    }
  }

  /**
   * VKOSPI (변동성 지수) 데이터 수집
   */
  static async fetchVKOSPIData(date: string): Promise<number | null> {
    try {
      console.log(`[BOK] VKOSPI 데이터 수집 시작: ${date}`)
      
      const formattedDate = date.replace(/-/g, '')
      const vkospiValue = await this.fetchSingleIndicator('901Y010', formattedDate)
      
      return vkospiValue ? parseFloat(vkospiValue) : null

    } catch (error) {
      console.error(`[BOK] VKOSPI 데이터 수집 실패 (${date}):`, (error as any)?.message)
      return null
    }
  }

  /**
   * 국채 수익률 커브 데이터 수집 (안전자산 수요 측정용)
   */
  static async fetchBondYieldCurve(date: string): Promise<{
    yield1Y: number | null
    yield3Y: number | null
    yield5Y: number | null
    yield10Y: number | null
    yield20Y: number | null
  }> {
    try {
      console.log(`[BOK] 국채 수익률 커브 수집 시작: ${date}`)
      
      const formattedDate = date.replace(/-/g, '')
      
      const [yield1Y, yield3Y, yield5Y, yield10Y, yield20Y] = await Promise.all([
        this.fetchSingleIndicator('817Y004', formattedDate), // 국고채1년
        this.fetchSingleIndicator('817Y006', formattedDate), // 국고채3년
        this.fetchSingleIndicator('817Y005', formattedDate), // 국고채5년
        this.fetchSingleIndicator('817Y007', formattedDate), // 국고채10년
        this.fetchSingleIndicator('817Y008', formattedDate)  // 국고채20년
      ])

      return {
        yield1Y: yield1Y ? parseFloat(yield1Y) : null,
        yield3Y: yield3Y ? parseFloat(yield3Y) : null,
        yield5Y: yield5Y ? parseFloat(yield5Y) : null,
        yield10Y: yield10Y ? parseFloat(yield10Y) : null,
        yield20Y: yield20Y ? parseFloat(yield20Y) : null
      }

    } catch (error) {
      console.error(`[BOK] 국채 수익률 커브 수집 실패 (${date}):`, (error as any)?.message)
      return {
        yield1Y: null,
        yield3Y: null,
        yield5Y: null,
        yield10Y: null,
        yield20Y: null
      }
    }
  }

  /**
   * API 키 유효성 검증
   */
  static async validateApiKey(): Promise<boolean> {
    try {
      const testDate = new Date()
      testDate.setMonth(testDate.getMonth() - 1) // Subtract 1 month
      const formattedDate = testDate.toISOString().slice(0, 7).replace('-', '') // Format as YYYYMM
      const testResult = await this.fetchSingleIndicator('901Y009', formattedDate)
      return testResult !== null
    } catch (error) {
      console.error('[BOK] API 키 유효성 검증 실패:', (error as any)?.message)
      return false
    }
  }
} 