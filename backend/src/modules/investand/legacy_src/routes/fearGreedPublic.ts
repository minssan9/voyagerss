import { Router, Request, Response } from 'express';
import { DatabaseService } from '@/services/core/databaseService'

const router = Router();

// 샘플 Fear & Greed Index 데이터
const sampleData = {
  current: {
    value: 45,
    level: 'Fear',
    date: new Date().toISOString().split('T')[0],
    components: {
      priceMomentum: 42,
      investorSentiment: 38,
      putCallRatio: 55,
      volatilityIndex: 48,
      safeHavenDemand: 52
    }
  },
  history: [
    { date: '2024-12-01', value: 48, level: 'Neutral' },
    { date: '2024-11-30', value: 42, level: 'Fear' },
    { date: '2024-11-29', value: 55, level: 'Greed' },
    { date: '2024-11-28', value: 39, level: 'Fear' },
    { date: '2024-11-27', value: 62, level: 'Greed' }
  ]
};

/**
 * @swagger
 * /api/fear-greed/current:
 *   get:
 *     tags: [Fear & Greed Index]
 *     summary: Get current Fear & Greed Index
 *     description: Retrieve the latest Fear & Greed Index value with component breakdown
 *     responses:
 *       200:
 *         description: Current Fear & Greed Index retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/FearGreedIndex'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: No Fear & Greed Index data available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// 현재 Fear & Greed Index 조회 (실제 데이터)
router.get('/current', async (req: Request, res: Response) => {
  try {
    const latest = await DatabaseService.getLatestFearGreedIndex();
    if (!latest) {
      return res.status(404).json({ success: false, message: 'Fear & Greed Index 데이터가 없습니다.' });
    }
    return res.json({
      success: true,
      data: {
        value: latest.value,
        level: latest.level,
        date: latest.date ? latest.date.toISOString().split('T')[0] : '',
        components: {
          priceMomentum: latest.priceMomentum,
          investorSentiment: latest.investorSentiment,
          putCallRatio: latest.putCallRatio,
          volatilityIndex: latest.volatilityIndex,
          safeHavenDemand: latest.safeHavenDemand
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// Fear & Greed Index 히스토리 조회 (실제 데이터)
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const limitDays = Math.min(parseInt(days as string), 365);
    const history = await DatabaseService.getFearGreedIndexHistory(limitDays);
    res.json({
      success: true,
      data: history.map(item => ({
        date: item.date.toISOString().split('T')[0],
        value: item.value,
        level: item.level
      })),
      meta: {
        totalDays: history.length,
        requestedDays: limitDays
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 특정 날짜의 Fear & Greed Index 조회
router.get('/date/:date', (req: Request, res: Response) => {
  const { date } = req.params;
  
  // 날짜 파라미터 존재 여부 확인
  if (!date) {
    res.status(400).json({
      success: false,
      error: 'Date parameter is required.',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // 날짜 형식 검증 (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    res.status(400).json({
      success: false,
      error: 'Invalid date format. Use YYYY-MM-DD format.',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // 샘플 데이터에서 해당 날짜 찾기
  const dataForDate = sampleData.history.find(item => item.date === date);
  
  if (!dataForDate) {
    res.status(404).json({
      success: false,
      error: 'No data found for the specified date.',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  res.json({
    success: true,
    data: dataForDate,
    timestamp: new Date().toISOString()
  });
});

// Fear & Greed Index 레벨별 통계
router.get('/stats', (req: Request, res: Response) => {
  const stats = {
    extremeFear: 12,  // 0-25
    fear: 18,         // 25-45
    neutral: 25,      // 45-55
    greed: 20,        // 55-75
    extremeGreed: 15  // 75-100
  };
  
  res.json({
    success: true,
    data: {
      distribution: stats,
      total: Object.values(stats).reduce((sum, count) => sum + count, 0),
      averageIndex: 52.3,
      lastUpdated: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
});

export default router; 