import { BaseRepository } from '@/repositories/core/BaseRepository'
import type { 
  DartDisclosureData, 
  DartStockDisclosureBatchData, 
  DartStockDisclosureBatchResult 
} from '@/types/collectors/dartTypes'

/**
 * DART 공시정보 리포지토리
 * 공시 데이터 CRUD 작업 전담
 */
export class DartDisclosureRepository extends BaseRepository {

  // ================================
  // CREATE OPERATIONS
  // ================================

  /**
   * 공시정보 저장 (단일)
   */
  static async saveDisclosure(data: {
    receiptNumber: string
    corpCode: string
    corpName: string
    stockCode?: string
    reportName: string
    reportCode: string
    flrName: string
    receiptDate: string
    disclosureDate: string
    remarks?: string
  }): Promise<void> {
    this.validateRequired(data, ['receiptNumber', 'corpCode', 'corpName', 'reportName'])

    try {
      await this.prisma.dartDisclosure.upsert({
        where: { receiptNumber: data.receiptNumber },
        update: {
          corpName: data.corpName,
          stockCode: data.stockCode || '',
          reportName: data.reportName,
          reportCode: data.reportCode,
          flrName: data.flrName,
          receiptDate: this.validateAndFormatDate(data.receiptDate),
          disclosureDate: this.validateAndFormatDate(data.disclosureDate),
          remarks: data.remarks || '',
          updatedAt: new Date()
        },
        create: {
          receiptNumber: data.receiptNumber,
          corpCode: data.corpCode,
          corpName: data.corpName,
          stockCode: data.stockCode || '',
          reportName: data.reportName,
          reportCode: data.reportCode,
          flrName: data.flrName,
          receiptDate: this.validateAndFormatDate(data.receiptDate),
          disclosureDate: this.validateAndFormatDate(data.disclosureDate),
          remarks: data.remarks || ''
        }
      })

      this.logSuccess('DART 공시정보 저장', data.receiptNumber)
    } catch (error) {
      this.logError('DART 공시정보 저장', data.receiptNumber, error)
      throw error
    }
  }

  /**
   * 공시정보 배치 저장
   */
  static async saveDisclosuresBatch(disclosures: DartDisclosureData[]): Promise<{
    success: number
    failed: number
    errors: string[]
  }> {
    const results = { success: 0, failed: 0, errors: [] as string[] }

    return this.measureTime(async () => {
      return this.executeTransaction(async (prisma) => {
        for (const disclosure of disclosures) {
          try {
            await prisma.dartDisclosure.upsert({
              where: { receiptNumber: disclosure.receiptNumber },
              update: {
                corpName: disclosure.corpName,
                stockCode: disclosure.stockCode || '',
                reportName: disclosure.reportName,
                reportCode: disclosure.reportCode,
                flrName: disclosure.flrName,
                receiptDate: this.validateAndFormatDate(disclosure.receiptDate),
                disclosureDate: this.validateAndFormatDate(disclosure.disclosureDate),
                remarks: disclosure.remarks || '',
                updatedAt: new Date()
              },
              create: {
                receiptNumber: disclosure.receiptNumber,
                corpCode: disclosure.corpCode,
                corpName: disclosure.corpName,
                stockCode: disclosure.stockCode || '',
                reportName: disclosure.reportName,
                reportCode: disclosure.reportCode,
                flrName: disclosure.flrName,
                receiptDate: this.validateAndFormatDate(disclosure.receiptDate),
                disclosureDate: this.validateAndFormatDate(disclosure.disclosureDate),
                remarks: disclosure.remarks || ''
              }
            })
            results.success++
          } catch (error) {
            results.failed++
            results.errors.push(`${disclosure.receiptNumber}: ${error}`)
          }
        }

        this.logBatchResult('DART 공시정보 저장', results.success, disclosures.length)
        return results
      })
    }, `DART 공시정보 배치 저장 (${disclosures.length}건)`)
  }

  // ================================
  // READ OPERATIONS
  // ================================

  /**
   * 접수번호로 공시정보 조회
   */
  static async findByReceiptNumber(receiptNumber: string) {
    try {
      return await this.prisma.dartDisclosure.findUnique({
        where: { receiptNumber }
      })
    } catch (error) {
      this.logError('DART 공시정보 조회', receiptNumber, error)
      throw error
    }
  }

  /**
   * 기업코드별 공시정보 조회
   */
  static async findByCorpCode(corpCode: string, limit: number = 50) {
    try {
      return await this.prisma.dartDisclosure.findMany({
        where: { corpCode },
        orderBy: { disclosureDate: 'desc' },
        take: limit
      })
    } catch (error) {
      this.logError('기업별 공시정보 조회', corpCode, error)
      throw error
    }
  }

  /**
   * 날짜 범위별 공시정보 조회
   */
  static async findByDateRange(startDate: string, endDate: string) {
    try {
      return await this.prisma.dartDisclosure.findMany({
        where: {
          disclosureDate: {
            gte: this.validateAndFormatDate(startDate),
            lte: this.validateAndFormatDate(endDate)
          }
        },
        orderBy: { disclosureDate: 'desc' }
      })
    } catch (error) {
      this.logError('날짜별 공시정보 조회', `${startDate}~${endDate}`, error)
      throw error
    }
  }

  /**
   * 보고서 타입별 공시정보 조회
   */
  static async findByReportType(reportCode: string, limit: number = 100) {
    try {
      return await this.prisma.dartDisclosure.findMany({
        where: { reportCode },
        orderBy: { disclosureDate: 'desc' },
        take: limit
      })
    } catch (error) {
      this.logError('보고서타입별 공시정보 조회', reportCode, error)
      throw error
    }
  }

  // ================================
  // UPDATE OPERATIONS
  // ================================

  /**
   * 공시정보 업데이트
   */
  static async updateDisclosure(receiptNumber: string, updateData: Partial<{
    corpName: string
    stockCode: string
    reportName: string
    flrName: string
    remarks: string
  }>) {
    try {
      const result = await this.prisma.dartDisclosure.update({
        where: { receiptNumber },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      })

      this.logSuccess('DART 공시정보 업데이트', receiptNumber)
      return result
    } catch (error) {
      this.logError('DART 공시정보 업데이트', receiptNumber, error)
      throw error
    }
  }

  // ================================
  // DELETE OPERATIONS
  // ================================

  /**
   * 공시정보 삭제 (단일)
   */
  static async deleteDisclosure(receiptNumber: string): Promise<void> {
    try {
      await this.prisma.dartDisclosure.delete({
        where: { receiptNumber }
      })

      this.logSuccess('DART 공시정보 삭제', receiptNumber)
    } catch (error) {
      this.logError('DART 공시정보 삭제', receiptNumber, error)
      throw error
    }
  }

  /**
   * 오래된 공시정보 정리 (90일 이전)
   */
  static async cleanupOldDisclosures(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    try {
      const result = await this.prisma.dartDisclosure.deleteMany({
        where: {
          disclosureDate: {
            lt: cutoffDate
          }
        }
      })

      this.logSuccess('오래된 공시정보 정리', `${result.count}건 삭제`)
      return result.count
    } catch (error) {
      this.logError('오래된 공시정보 정리', `${retentionDays}일 이전`, error)
      throw error
    }
  }

  // ================================
  // ANALYTICS OPERATIONS
  // ================================

  /**
   * 공시정보 통계 조회
   */
  static async getDisclosureStats(startDate: string, endDate: string) {
    try {
      const [total, byReportType] = await Promise.all([
        // 전체 건수
        this.prisma.dartDisclosure.count({
          where: {
            disclosureDate: {
              gte: this.validateAndFormatDate(startDate),
              lte: this.validateAndFormatDate(endDate)
            }
          }
        }),
        // 보고서 타입별 통계
        this.prisma.dartDisclosure.groupBy({
          by: ['reportCode'],
          where: {
            disclosureDate: {
              gte: this.validateAndFormatDate(startDate),
              lte: this.validateAndFormatDate(endDate)
            }
          },
          _count: true
        })
      ])

      return {
        total,
        byReportType: byReportType.reduce((acc, item) => {
          acc[item.reportCode] = item._count
          return acc
        }, {} as Record<string, number>)
      }
    } catch (error) {
      this.logError('공시정보 통계 조회', `${startDate}~${endDate}`, error)
      throw error
    }
  }

  // ================================
  // ADVANCED STOCK DISCLOSURE OPERATIONS
  // ================================

  /**
   * 데이터 필터링 조건 확인 (Unknown Company 및 0 값 필터링)
   */
  private static shouldFilterData(data: any): boolean {
    // corpName이 'Unknown Company'인 경우 필터링
    if (data.majorHoldingCorpName === 'Unknown Company' || 
        data.corpName === 'Unknown Company') {
      return true
    }
    
    // changeRatio와 changeShares가 모두 0인 경우 필터링
    const changeRatio = parseFloat(data.majorHoldingChangeRatio || data.changeRatio || '0')
    const changeShares = parseFloat(data.majorHoldingChangeShares || data.changeAmount || '0')
    
    if (changeRatio === 0 && changeShares === 0) {
      return true
    }
    
    return false
  }

  /**
   * 통합 지분공시 배치 저장 (단일/배치 처리 통합, 중복 제거 최적화)
   */
  static async saveBatchStockDisclosureDetails(
    dataList: DartStockDisclosureBatchData | DartStockDisclosureBatchData[]
  ): Promise<DartStockDisclosureBatchResult> {
    const startTime = Date.now()
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 단일 데이터도 배열로 변환하여 통일된 처리
    const inputData = Array.isArray(dataList) ? dataList : [dataList]
    
    const result: DartStockDisclosureBatchResult = {
      success: false,
      transactionId,
      operationsCompleted: 0,
      operationsFailed: 0,
      saved: 0,
      updated: 0,
      failed: 0,
      errors: [],
      processingTime: 0
    }

    try {
      // 1. 중복 제거: receiptNumber 기준으로 Map 사용 (첫 번째 항목만 유지)
      const deduplicatedData = new Map<string, DartStockDisclosureBatchData>()
      
      for (const data of inputData) {
        const receiptNumber = data.majorHoldingReceiptNumber || data.receiptNumber
        if (!deduplicatedData.has(receiptNumber)) {
          deduplicatedData.set(receiptNumber, data)
        }
        // 중복된 경우 무시 (첫 번째 항목만 유지)
      }
      
      const uniqueDataList = Array.from(deduplicatedData.values())
      console.log(`[DB] 중복 제거: ${inputData.length} -> ${uniqueDataList.length} 건`)
      
      // 2. 필터링 조건에 따라 데이터 제외 (Unknown Company 및 0 값 필터링)
      const filteredDataList = uniqueDataList.filter(data => !this.shouldFilterData(data))
      
      if (filteredDataList.length !== uniqueDataList.length) {
        console.log(`[DB] 필터링: ${uniqueDataList.length} -> ${filteredDataList.length} 건 (Unknown Company 및 0 값 제외)`)
      }
      
      // 3. 기업 정보 캐시 구축 (필터링된 데이터 기준)
      const corpCodes = new Set<string>()
      for (const data of filteredDataList) {
        const corpCode = data.majorHoldingCorpCode || 
          data.receiptNumber.substring(8, 16) || 
          data.receiptNumber.substring(0, 8)
        corpCodes.add(corpCode)
      }
      
      const companies = await this.prisma.dartCompany.findMany({
        where: { corpCode: { in: Array.from(corpCodes) } },
        select: { corpCode: true, corpName: true }
      })
      
      const corpNameCache = new Map<string, string>()
      companies.forEach(c => corpNameCache.set(c.corpCode, c.corpName))
      
      // 4. 기존 데이터 조회 (필터링된 receiptNumber 기준)
      const receiptNumbers = filteredDataList.map(d => d.majorHoldingReceiptNumber || d.receiptNumber)
      const existingRecords = await this.prisma.dartStockHolding.findMany({
        where: { receiptNumber: { in: receiptNumbers } },
        select: { id: true, receiptNumber: true }
      })
      
      const existingMap = new Map<string, { id: number }>()
      existingRecords.forEach(record => {
        if (record.receiptNumber) {
          existingMap.set(record.receiptNumber, { id: record.id })
        }
      })
      
      // 5. 배치 처리 (트랜잭션 사용)
      await this.prisma.$transaction(async (tx) => {
        const createOperations: any[] = []
        const updateOperations: any[] = []
        
        for (const data of filteredDataList) {
          try {
            const receiptNumber = data.majorHoldingReceiptNumber || data.receiptNumber
            const dateStr = data.receiptNumber.substring(0, 8)
            const reportDate = new Date(`${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`)
            const corpCode = data.majorHoldingCorpCode || 
              data.receiptNumber.substring(8, 16) || 
              data.receiptNumber.substring(0, 8)
            const reporterName = data.topMajorHolder || data.reporterName || 'Unknown'
            
            // 필수 필드들 설정
            const stockCode = data.majorHoldingCorpCode ? 
              await this.getStockCodeFromCorpCode(data.majorHoldingCorpCode) : null
            const finalReportDate = data.majorHoldingReceiptDate ? 
              new Date(data.majorHoldingReceiptDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')) : reportDate
            const changeReason = data.majorHoldingReportReason || data.changeReason || 'Unknown'
            const corpName = data.majorHoldingCorpName || corpNameCache.get(corpCode) || 'Unknown Company'
            
            const recordData = {
              receiptNumber: receiptNumber,
              receiptDate: finalReportDate,
              corpCode: corpCode,
              corpName: corpName,
              stockCode: stockCode,
              reportType: data.majorHoldingReportType || '일반',
              reporterName: reporterName,
              holdingShares: data.majorHoldingShares || String(Math.floor((data.afterHolding || 0) * 1000000)),
              changeShares: data.majorHoldingChangeShares || String(data.changeAmount || 0),
              holdingRatio: data.majorHoldingRatio || String(data.afterHolding || 0),
              changeRatio: data.majorHoldingChangeRatio || String(data.beforeHolding && data.afterHolding ? 
                data.afterHolding - data.beforeHolding : 0),
              majorTransactionShares: data.majorHoldingTransactionShares || null,
              majorTransactionRatio: data.majorHoldingTransactionRatio || null,
              reportReason: data.majorHoldingReportReason || null,
              changeReason: changeReason,
              reportDate: finalReportDate,
              isu_exctv_ofcps: 'N',
              isu_exctv_rgist_at: 'N',
              isu_main_shrholdr: 'N'
            }
            
            if (existingMap.has(receiptNumber)) {
              // 업데이트 작업
              updateOperations.push({
                where: { id: existingMap.get(receiptNumber)!.id },
                data: recordData
              })
            } else {
              // 생성 작업
              createOperations.push({
                ...recordData,
                createdAt: new Date()
              })
            }
            
            result.operationsCompleted++
          } catch (itemError) {
            result.operationsFailed++
            result.failed++
            result.errors.push({
              receiptNumber: data.receiptNumber,
              error: itemError instanceof Error ? itemError.message : String(itemError)
            })
            this.logError('배치 지분공시 항목 처리', data.receiptNumber, itemError)
          }
        }
        
        // 5. 배치 실행
        if (updateOperations.length > 0) {
          for (const updateOp of updateOperations) {
            await tx.dartStockHolding.update(updateOp)
            result.updated++
          }
        }
        
        if (createOperations.length > 0) {
          await tx.dartStockHolding.createMany({
            data: createOperations,
            skipDuplicates: true
          })
          result.saved += createOperations.length
        }
      })
      
      result.success = result.operationsFailed === 0
      result.processingTime = Date.now() - startTime
      
      this.logBatchResult('통합 지분공시 배치 저장', result.operationsCompleted, uniqueDataList.length)
      console.log(`[DB] 처리 시간: ${result.processingTime}ms, 저장: ${result.saved}, 업데이트: ${result.updated}, 실패: ${result.failed}`)
      
    } catch (error) {
      result.success = false
      result.processingTime = Date.now() - startTime
      result.errors.push({
        receiptNumber: 'BATCH_ERROR',
        error: error instanceof Error ? error.message : String(error)
      })
      
      this.logError('통합 지분공시 배치 저장', `${inputData.length}건`, error)
      throw error
    }
    
    return result
  }

  /**
   * 기업코드에서 기업명 조회 헬퍼 함수
   */
  private static async getCorpNameFromCode(corpCode: string): Promise<string> {
    try {
      const company = await this.prisma.dartCompany.findUnique({
        where: { corpCode },
        select: { corpName: true }
      })
      
      return company?.corpName || 'Unknown Company'
    } catch (error) {
      this.logError('기업명 조회', corpCode, error)
      return 'Unknown Company'
    }
  }

  /**
   * 중요한 소유권 변동 조회
   */
  static async getSignificantOwnershipChanges(days: number = 7): Promise<any[]> {
    try {
      return await this.prisma.dartStockHolding.findMany({
        where: {
          AND: [
            {
              OR: [
                { reportDate: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
                { receiptDate: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } }
              ]
            },
            {
              OR: [
                { changeRatio: { gte: '5.0' } }, // 5% 이상 증가
                { changeRatio: { lte: '-5.0' } }, // 5% 이상 감소
                { holdingRatio: { gte: '5.0' } } // 5% 이상 보유
              ]
            }
          ]
        },
        orderBy: [
          { receiptDate: 'desc' },
          { reportDate: 'desc' }
        ]
      })
    } catch (error) {
      this.logError('중요 소유권 변동 조회', `${days}일`, error)
      throw error
    }
  }

  /**
   * 소유권 변동 트렌드 분석
   */
  static async analyzeOwnershipTrends(corpCode: string, days: number = 30): Promise<{
    trends: any[];
    summary: {
      totalChanges: number;
      significantChanges: number;
      averageChangeRatio: number;
      dominantTrend: 'accumulation' | 'disposal' | 'stable';
    };
  }> {
    try {
      const trends = await this.prisma.dartStockHolding.findMany({
        where: {
          corpCode,
          OR: [
            { reportDate: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } },
            { receiptDate: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } }
          ]
        },
        orderBy: [
          { receiptDate: 'desc' },
          { reportDate: 'desc' }
        ]
      })

      const totalChanges = trends.length
      const significantChanges = trends.filter(t => Math.abs(Number(t.changeRatio)) >= 5).length
      const avgChange = trends.length > 0 ? 
        trends.reduce((sum, t) => sum + Number(t.changeRatio), 0) / trends.length : 0
      
      const dominantTrend = avgChange > 1 ? 'accumulation' : 
                           avgChange < -1 ? 'disposal' : 'stable'

      return {
        trends,
        summary: {
          totalChanges,
          significantChanges,
          averageChangeRatio: avgChange,
          dominantTrend
        }
      }
    } catch (error) {
      this.logError('소유권 트렌드 분석', corpCode, error)
      throw error
    }
  }

  /**
   * 기업 코드로 주식 코드 조회
   */
  private static async getStockCodeFromCorpCode(corpCode: string): Promise<string | null> {
    try {
      const company = await this.prisma.dartCompany.findUnique({
        where: { corpCode },
        select: { stockCode: true }
      })
      return company?.stockCode || null
    } catch (error) {
      this.logError('주식 코드 조회', corpCode, error)
      return null
    }
  }

  /**
   * 주식 보유현황 데이터 조회
   */
  static async getStockHoldings(params: {
    corpCode?: string
    corpName?: string
    startDate: string
    endDate: string
    reporterName?: string
    changeReason?: string
    reportReason?: string
    page: number
    limit: number
  }): Promise<any[]> {
    try {
      const { corpCode, corpName, startDate, endDate, reporterName, changeReason, reportReason, page, limit } = params
      
      // 날짜 범위 조건 (receiptDate 또는 reportDate)
      const dateRangeCondition = {
        OR: [
          { receiptDate: { gte: new Date(startDate), lte: new Date(endDate) } },
          { reportDate: { gte: new Date(startDate), lte: new Date(endDate) } }
        ]
      }

      // AND 조건 배열 구성
      const andConditions: any[] = [dateRangeCondition]

      // 기업 코드 필터링
      if (corpCode) {
        andConditions.push({ corpCode })
      }

      // 기업명 필터링
      if (corpName) {
        andConditions.push({ corpName: { contains: corpName } })
      }

      // 보고자명 필터링
      if (reporterName) {
        andConditions.push({ reporterName: { contains: reporterName } })
      }

      // 변동사유 필터링 (changeReason 또는 reportReason)
      if (changeReason || reportReason) {
        const reasonFilter: any[] = []
        if (changeReason) {
          reasonFilter.push({ changeReason: { contains: changeReason } })
        }
        if (reportReason) {
          reasonFilter.push({ reportReason: { contains: reportReason } })
        }
        if (reasonFilter.length > 0) {
          andConditions.push({ OR: reasonFilter })
        }
      }

      // 최종 whereClause 구성
      const whereClause: any = andConditions.length === 1 
        ? dateRangeCondition 
        : { AND: andConditions }

      const holdings = await this.prisma.dartStockHolding.findMany({
        where: whereClause,
        orderBy: [
          { receiptDate: 'desc' },
          { reportDate: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      })

      return holdings
    } catch (error) {
      this.logError('주식 보유현황 조회', JSON.stringify(params), error)
      return []
    }
  }

  /**
   * 주식 보유현황 데이터 총 개수 조회 (페이징용)
   */
  static async getStockHoldingsCount(params: {
    corpCode?: string
    corpName?: string
    startDate: string
    endDate: string
    reporterName?: string
    changeReason?: string
    reportReason?: string
  }): Promise<number> {
    try {
      const { corpCode, corpName, startDate, endDate, reporterName, changeReason, reportReason } = params
      
      // 날짜 범위 조건 (receiptDate 또는 reportDate)
      const dateRangeCondition = {
        OR: [
          { receiptDate: { gte: new Date(startDate), lte: new Date(endDate) } },
          { reportDate: { gte: new Date(startDate), lte: new Date(endDate) } }
        ]
      }

      // AND 조건 배열 구성
      const andConditions: any[] = [dateRangeCondition]

      // 기업 코드 필터링
      if (corpCode) {
        andConditions.push({ corpCode })
      }

      // 기업명 필터링
      if (corpName) {
        andConditions.push({ corpName: { contains: corpName } })
      }

      // 보고자명 필터링
      if (reporterName) {
        andConditions.push({ reporterName: { contains: reporterName } })
      }

      // 변동사유 필터링 (changeReason 또는 reportReason)
      if (changeReason || reportReason) {
        const reasonFilter: any[] = []
        if (changeReason) {
          reasonFilter.push({ changeReason: { contains: changeReason } })
        }
        if (reportReason) {
          reasonFilter.push({ reportReason: { contains: reportReason } })
        }
        if (reasonFilter.length > 0) {
          andConditions.push({ OR: reasonFilter })
        }
      }

      // 최종 whereClause 구성
      const whereClause: any = andConditions.length === 1 
        ? dateRangeCondition 
        : { AND: andConditions }

      const count = await this.prisma.dartStockHolding.count({
        where: whereClause
      })

      return count
    } catch (error) {
      this.logError('주식 보유현황 카운트 조회', JSON.stringify(params), error)
      return 0
    }
  }

  /**
   * 장내매수로 인한 지분증가 건 조회 (일일 리포트용)
   * @param date - 조회할 날짜 (YYYY-MM-DD 형식)
   * @returns 필터링된 주식 보유 현황 목록
   */
  static async getMarketBuyIncreaseHoldings(date: string): Promise<any[]> {
    try {
      const targetDate = new Date(date)
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

      const holdings = await this.prisma.dartStockHolding.findMany({
        where: {
          AND: [
            {
              OR: [
                { receiptDate: { gte: startOfDay, lte: endOfDay } },
                { reportDate: { gte: startOfDay, lte: endOfDay } }
              ]
            },
            {
              reportReason: {
                contains: '장내매수로 인한 지분증가'
              }
            }
          ]
        },
        orderBy: [
          { changeRatio: 'desc' },
          { receiptDate: 'desc' }
        ]
      })

      // changeRatio가 0보다 큰 항목만 필터링 (String 타입이므로 parseFloat 사용)
      const filteredHoldings = holdings.filter(holding => {
        const changeRatio = parseFloat(holding.changeRatio || '0')
        return changeRatio > 0
      })

      this.logSuccess('장내매수 지분증가 조회', `${filteredHoldings.length}건`)
      return filteredHoldings
    } catch (error) {
      this.logError('장내매수 지분증가 조회', date, error)
      return []
    }
  }
}