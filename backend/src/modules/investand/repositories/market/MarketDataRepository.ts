import { BaseRepository } from '@investand/repositories/core/BaseRepository'
import type {
  krxStockData,
  InvestorTradingData,
  OptionData,
  StockClosingPriceData
} from '@investand/interfaces/krxTypes'
import type {
  InterestRateData,
  ExchangeRateData,
  EconomicIndicatorData
} from '@investand/collectors/financial/bokCollector'

/**
 * 시장데이터 리포지토리
 * KOSPI/KOSDAQ, 투자자거래, 옵션, 금리, 환율 등 시장 관련 데이터 처리
 */
export class MarketDataRepository extends BaseRepository {

  // ================================
  // KOSPI/KOSDAQ DATA OPERATIONS
  // ================================

  /**
   * KRX 주식데이터 저장 (KOSPI/KOSDAQ)
   */
  static async saveStockData(data: krxStockData, market: 'KOSPI' | 'KOSDAQ'): Promise<void> {
    this.validateRequired(data, ['date'])

    const model = market === 'KOSPI' ? 'kospiData' : 'kosdaqData'
    const { date, ...fields } = data

    try {
      await (this.prisma as any)[model].upsert({
        where: { date: this.validateAndFormatDate(date) },
        update: {
          ...fields,
          updatedAt: new Date()
        },
        create: {
          date: this.validateAndFormatDate(date),
          ...fields
        }
      })

      this.logSuccess(`${market} 데이터 저장`, date)
    } catch (error) {
      this.logError(`${market} 데이터 저장`, date, error)
      throw error
    }
  }

  /**
   * KRX 데이터 배치 저장
   */
  static async saveStockDataBatch(
    kospiData: krxStockData[],
    kosdaqData: krxStockData[]
  ): Promise<{
    kospiSuccess: number
    kosdaqSuccess: number
    totalErrors: number
  }> {
    const results = { kospiSuccess: 0, kosdaqSuccess: 0, totalErrors: 0 }

    return this.measureTime(async () => {
      return this.executeTransaction(async (prisma) => {
        // KOSPI 데이터 저장
        for (const data of kospiData) {
          try {
            const { date, ...fields } = data
            await prisma.kospiData.upsert({
              where: { date: this.validateAndFormatDate(date) },
              update: { ...fields, updatedAt: new Date() },
              create: { date: this.validateAndFormatDate(date), ...fields }
            })
            results.kospiSuccess++
          } catch (error) {
            results.totalErrors++
          }
        }

        // KOSDAQ 데이터 저장
        for (const data of kosdaqData) {
          try {
            const { date, ...fields } = data
            await prisma.kosdaqData.upsert({
              where: { date: this.validateAndFormatDate(date) },
              update: { ...fields, updatedAt: new Date() },
              create: { date: this.validateAndFormatDate(date), ...fields }
            })
            results.kosdaqSuccess++
          } catch (error) {
            results.totalErrors++
          }
        }

        this.logBatchResult(
          'KRX 주식데이터 저장',
          results.kospiSuccess + results.kosdaqSuccess,
          kospiData.length + kosdaqData.length
        )
        return results
      })
    }, `KRX 배치 저장 (KOSPI: ${kospiData.length}, KOSDAQ: ${kosdaqData.length})`)
  }

  // ================================
  // STOCK CLOSING PRICE OPERATIONS
  // ================================

  /**
   * 개별 종목 종가 저장
   */
  static async saveStockClosingPrice(data: StockClosingPriceData): Promise<void> {
    this.validateRequired(data, ['date', 'stockCode', 'closingPrice'])

    try {
      await this.prisma.stockClosingPrice.upsert({
        where: {
          date_stockCode: {
            date: this.validateAndFormatDate(data.date),
            stockCode: data.stockCode
          }
        },
        update: {
          stockName: data.stockName,
          marketType: data.marketType,
          closingPrice: BigInt(data.closingPrice),
          openingPrice: BigInt(data.openingPrice),
          highPrice: BigInt(data.highPrice),
          lowPrice: BigInt(data.lowPrice),
          volume: BigInt(data.volume),
          tradingValue: BigInt(data.tradingValue),
          priceChange: BigInt(data.priceChange),
          changeRate: data.changeRate,
          changeSign: data.changeSign,
          per: data.per ?? null,
          pbr: data.pbr ?? null,
          eps: data.eps ?? null,
          marketCap: data.marketCap ? BigInt(data.marketCap) : null,
          foreignHoldRatio: data.foreignHoldRatio ?? null,
          updatedAt: new Date()
        },
        create: {
          date: this.validateAndFormatDate(data.date),
          stockCode: data.stockCode,
          stockName: data.stockName,
          marketType: data.marketType,
          closingPrice: BigInt(data.closingPrice),
          openingPrice: BigInt(data.openingPrice),
          highPrice: BigInt(data.highPrice),
          lowPrice: BigInt(data.lowPrice),
          volume: BigInt(data.volume),
          tradingValue: BigInt(data.tradingValue),
          priceChange: BigInt(data.priceChange),
          changeRate: data.changeRate,
          changeSign: data.changeSign,
          per: data.per ?? null,
          pbr: data.pbr ?? null,
          eps: data.eps ?? null,
          marketCap: data.marketCap ? BigInt(data.marketCap) : null,
          foreignHoldRatio: data.foreignHoldRatio ?? null
        }
      })

      this.logSuccess('종목 종가 저장', `${data.stockCode} (${data.date})`)
    } catch (error) {
      this.logError('종목 종가 저장', `${data.stockCode} (${data.date})`, error)
      throw error
    }
  }

  /**
   * 여러 종목 종가 배치 저장
   */
  static async saveStockClosingPriceBatch(
    dataList: StockClosingPriceData[]
  ): Promise<{
    successCount: number
    errorCount: number
    errors: Array<{ stockCode: string; error: string }>
  }> {
    const results = {
      successCount: 0,
      errorCount: 0,
      errors: [] as Array<{ stockCode: string; error: string }>
    }

    return this.measureTime(async () => {
      return this.executeTransaction(async (prisma) => {
        for (const data of dataList) {
          try {
            await prisma.stockClosingPrice.upsert({
              where: {
                date_stockCode: {
                  date: this.validateAndFormatDate(data.date),
                  stockCode: data.stockCode
                }
              },
              update: {
                stockName: data.stockName,
                marketType: data.marketType,
                closingPrice: BigInt(data.closingPrice),
                openingPrice: BigInt(data.openingPrice),
                highPrice: BigInt(data.highPrice),
                lowPrice: BigInt(data.lowPrice),
                volume: BigInt(data.volume),
                tradingValue: BigInt(data.tradingValue),
                priceChange: BigInt(data.priceChange),
                changeRate: data.changeRate,
                changeSign: data.changeSign,
                per: data.per ?? null,
                pbr: data.pbr ?? null,
                eps: data.eps ?? null,
                marketCap: data.marketCap ? BigInt(data.marketCap) : null,
                foreignHoldRatio: data.foreignHoldRatio ?? null,
                updatedAt: new Date()
              },
              create: {
                date: this.validateAndFormatDate(data.date),
                stockCode: data.stockCode,
                stockName: data.stockName,
                marketType: data.marketType,
                closingPrice: BigInt(data.closingPrice),
                openingPrice: BigInt(data.openingPrice),
                highPrice: BigInt(data.highPrice),
                lowPrice: BigInt(data.lowPrice),
                volume: BigInt(data.volume),
                tradingValue: BigInt(data.tradingValue),
                priceChange: BigInt(data.priceChange),
                changeRate: data.changeRate,
                changeSign: data.changeSign,
                per: data.per ?? null,
                pbr: data.pbr ?? null,
                eps: data.eps ?? null,
                marketCap: data.marketCap ? BigInt(data.marketCap) : null,
                foreignHoldRatio: data.foreignHoldRatio ?? null
              }
            })
            results.successCount++
          } catch (error) {
            results.errorCount++
            results.errors.push({
              stockCode: data.stockCode,
              error: (error as Error).message
            })
          }
        }

        this.logBatchResult('종목 종가 배치 저장', results.successCount, dataList.length)
        return results
      })
    }, `종목 종가 배치 저장 (${dataList.length}개)`)
  }

  /**
   * 종목별 종가 이력 조회
   */
  static async getStockClosingPriceHistory(
    stockCode: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    try {
      const data = await this.prisma.stockClosingPrice.findMany({
        where: {
          stockCode,
          date: {
            gte: this.validateAndFormatDate(startDate),
            lte: this.validateAndFormatDate(endDate)
          }
        },
        orderBy: { date: 'asc' }
      })

      return data
    } catch (error) {
      this.logError('종목 종가 이력 조회', stockCode, error)
      throw error
    }
  }

  /**
   * 특정 날짜의 모든 종목 종가 조회
   */
  static async getStockClosingPricesByDate(
    date: string,
    marketType?: 'KOSPI' | 'KOSDAQ'
  ): Promise<any[]> {
    try {
      const whereClause: any = {
        date: this.validateAndFormatDate(date)
      }

      if (marketType) {
        whereClause.marketType = marketType
      }

      const data = await this.prisma.stockClosingPrice.findMany({
        where: whereClause,
        orderBy: { stockCode: 'asc' }
      })

      return data
    } catch (error) {
      this.logError('날짜별 종목 종가 조회', date, error)
      throw error
    }
  }

  /**
   * 최신 종목 종가 조회
   */
  static async getLatestStockClosingPrice(stockCode: string): Promise<any | null> {
    try {
      const data = await this.prisma.stockClosingPrice.findFirst({
        where: { stockCode },
        orderBy: { date: 'desc' }
      })

      return data
    } catch (error) {
      this.logError('최신 종목 종가 조회', stockCode, error)
      throw error
    }
  }

  // ================================
  // INVESTOR TRADING OPERATIONS
  // ================================

  /**
   * 투자자별 매매동향 저장
   */
  static async saveInvestorTradingData(data: InvestorTradingData): Promise<void> {
    this.validateRequired(data, ['date'])

    const { date, ...fields } = data

    try {
      await this.prisma.investorTrading.upsert({
        where: { date: this.validateAndFormatDate(date) },
        update: {
          ...fields,
          updatedAt: new Date()
        },
        create: {
          date: this.validateAndFormatDate(date),
          ...fields
        }
      })

      this.logSuccess('투자자별 매매동향 저장', date)
    } catch (error) {
      this.logError('투자자별 매매동향 저장', date, error)
      throw error
    }
  }

  // ================================
  // OPTION DATA OPERATIONS
  // ================================

  /**
   * 옵션 데이터 저장
   */
  static async saveOptionData(data: OptionData): Promise<void> {
    this.validateRequired(data, ['date', 'putVolume', 'callVolume'])

    try {
      await this.prisma.optionData.upsert({
        where: { date: this.validateAndFormatDate(data.date) },
        update: {
          putVolume: BigInt(data.putVolume),
          callVolume: BigInt(data.callVolume),
          putCallRatio: data.putCallRatio,
          updatedAt: new Date()
        },
        create: {
          date: this.validateAndFormatDate(data.date),
          putVolume: BigInt(data.putVolume),
          callVolume: BigInt(data.callVolume),
          putCallRatio: data.putCallRatio
        }
      })

      this.logSuccess('옵션 데이터 저장', data.date)
    } catch (error) {
      this.logError('옵션 데이터 저장', data.date, error)
      throw error
    }
  }

  // ================================
  // ECONOMIC DATA OPERATIONS
  // ================================

  /**
   * 금리 데이터 저장
   */
  static async saveInterestRateData(data: InterestRateData): Promise<void> {
    this.validateRequired(data, ['date'])

    try {
      await this.prisma.interestRateData.upsert({
        where: { date: this.validateAndFormatDate(data.date) },
        update: {
          baseRate: data.baseRate,
          callRate: data.callRate,
          cd91Rate: data.cd91Rate,
          treasuryBond3Y: data.treasuryBond3Y,
          treasuryBond10Y: data.treasuryBond10Y,
          updatedAt: new Date()
        },
        create: {
          date: this.validateAndFormatDate(data.date),
          baseRate: data.baseRate,
          callRate: data.callRate,
          cd91Rate: data.cd91Rate,
          treasuryBond3Y: data.treasuryBond3Y,
          treasuryBond10Y: data.treasuryBond10Y
        }
      })

      this.logSuccess('금리 데이터 저장', data.date)
    } catch (error) {
      this.logError('금리 데이터 저장', data.date, error)
      throw error
    }
  }

  /**
   * 환율 데이터 저장
   */
  static async saveExchangeRateData(data: ExchangeRateData): Promise<void> {
    this.validateRequired(data, ['date'])

    try {
      await this.prisma.exchangeRateData.upsert({
        where: { date: this.validateAndFormatDate(data.date) },
        update: {
          usdKrw: data.usdKrw,
          eurKrw: data.eurKrw,
          jpyKrw: data.jpyKrw,
          cnyKrw: data.cnyKrw,
          updatedAt: new Date()
        },
        create: {
          date: this.validateAndFormatDate(data.date),
          usdKrw: data.usdKrw,
          eurKrw: data.eurKrw,
          jpyKrw: data.jpyKrw,
          cnyKrw: data.cnyKrw
        }
      })

      this.logSuccess('환율 데이터 저장', data.date)
    } catch (error) {
      this.logError('환율 데이터 저장', data.date, error)
      throw error
    }
  }

  /**
   * 경제지표 데이터 저장
   */
  static async saveEconomicIndicatorData(data: EconomicIndicatorData): Promise<void> {
    this.validateRequired(data, ['date'])

    try {
      await this.prisma.economicIndicatorData.upsert({
        where: { date: this.validateAndFormatDate(data.date) },
        update: {
          cpi: data.cpi,
          ppi: data.ppi,
          unemploymentRate: data.unemploymentRate,
          gdpGrowthRate: data.gdpGrowthRate,
          updatedAt: new Date()
        },
        create: {
          date: this.validateAndFormatDate(data.date),
          cpi: data.cpi,
          ppi: data.ppi,
          unemploymentRate: data.unemploymentRate,
          gdpGrowthRate: data.gdpGrowthRate
        }
      })

      this.logSuccess('경제지표 데이터 저장', data.date)
    } catch (error) {
      this.logError('경제지표 데이터 저장', data.date, error)
      throw error
    }
  }

  // ================================
  // VOLATILITY INDEX OPERATIONS
  // ================================

  /**
   * VKOSPI 데이터 저장
   */
  static async saveVKOSPIData(date: string, value: number): Promise<void> {
    this.validateRequired({ date, value }, ['date', 'value'])

    try {
      await this.prisma.vkospiData.upsert({
        where: { date: this.validateAndFormatDate(date) },
        update: {
          value,
          updatedAt: new Date()
        },
        create: {
          date: this.validateAndFormatDate(date),
          value
        }
      })

      this.logSuccess('VKOSPI 데이터 저장', date)
    } catch (error) {
      this.logError('VKOSPI 데이터 저장', date, error)
      throw error
    }
  }

  /**
   * 채권 수익률 곡선 데이터 저장
   */
  static async saveBondYieldCurveData(date: string, yields: {
    y1m?: number
    y3m?: number
    y6m?: number
    y1y?: number
    y2y?: number
    y3y?: number
    y5y?: number
    y10y?: number
    y20y?: number
    y30y?: number
  }): Promise<void> {
    this.validateRequired({ date }, ['date'])

    try {
      await this.prisma.bondYieldCurveData.upsert({
        where: { date: this.validateAndFormatDate(date) },
        update: {
          ...yields,
          updatedAt: new Date()
        },
        create: {
          date: this.validateAndFormatDate(date),
          ...yields
        }
      })

      this.logSuccess('채권 수익률 곡선 저장', date)
    } catch (error) {
      this.logError('채권 수익률 곡선 저장', date, error)
      throw error
    }
  }

  // ================================
  // QUERY OPERATIONS
  // ================================

  /**
   * 날짜 범위별 시장데이터 조회
   */
  static async getMarketDataByDateRange(startDate: string, endDate: string) {
    try {
      const [kospiData, kosdaqData, investorData, optionData, bondYieldData] = await Promise.all([
        this.prisma.kospiData.findMany({
          where: {
            date: {
              gte: this.validateAndFormatDate(startDate),
              lte: this.validateAndFormatDate(endDate)
            }
          },
          orderBy: { date: 'asc' }
        }),
        this.prisma.kosdaqData.findMany({
          where: {
            date: {
              gte: this.validateAndFormatDate(startDate),
              lte: this.validateAndFormatDate(endDate)
            }
          },
          orderBy: { date: 'asc' }
        }),
        this.prisma.investorTrading.findMany({
          where: {
            date: {
              gte: this.validateAndFormatDate(startDate),
              lte: this.validateAndFormatDate(endDate)
            }
          },
          orderBy: { date: 'asc' }
        }),
        this.prisma.optionData.findMany({
          where: {
            date: {
              gte: this.validateAndFormatDate(startDate),
              lte: this.validateAndFormatDate(endDate)
            }
          },
          orderBy: { date: 'asc' }
        }),
        this.prisma.bondYieldCurveData.findMany({
          where: {
            date: {
              gte: this.validateAndFormatDate(startDate),
              lte: this.validateAndFormatDate(endDate)
            }
          },
          orderBy: { date: 'asc' }
        })
      ])

      return {
        kospiData,
        kosdaqData,
        investorData,
        optionData,
        bondYieldData
      }
    } catch (error) {
      this.logError('시장데이터 조회', `${startDate}~${endDate}`, error)
      throw error
    }
  }

  /**
   * 최신 시장데이터 조회
   */
  static async getLatestMarketData() {
    try {
      const [latestKospi, latestKosdaq, latestInvestor, latestOption, latestVkospi] = await Promise.all([
        this.prisma.kospiData.findFirst({ orderBy: { date: 'desc' } }),
        this.prisma.kosdaqData.findFirst({ orderBy: { date: 'desc' } }),
        this.prisma.investorTrading.findFirst({ orderBy: { date: 'desc' } }),
        this.prisma.optionData.findFirst({ orderBy: { date: 'desc' } }),
        this.prisma.vkospiData.findFirst({ orderBy: { date: 'desc' } })
      ])

      return {
        kospi: latestKospi,
        kosdaq: latestKosdaq,
        investor: latestInvestor,
        option: latestOption,
        vkospi: latestVkospi
      }
    } catch (error) {
      this.logError('최신 시장데이터 조회', '', error)
      throw error
    }
  }
}