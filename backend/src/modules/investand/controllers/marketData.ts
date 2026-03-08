import { Router, Request, Response } from 'express';
import { DatabaseService } from '@investand/services/core/databaseService';
import { KrxCollectionService } from '@investand/collectors/krxCollectionService';

const router = Router();

// KOSPI 지수 데이터 조회
router.get('/kospi', async (req: Request, res: Response) => {
  try {
    const kospi = await DatabaseService.getLatestKOSPIData();
    if (!kospi) {
      // Fallback to mock data to avoid 404 during development
      return res.json({
        success: true,
        data: {
          current: 2500.50,
          change: 15.20,
          changePercent: 0.61,
          volume: 5000000,
          marketCap: 2000000000,
          isMock: true
        },
        timestamp: new Date().toISOString()
      });
    }
    return res.json({
      success: true,
      data: {
        current: parseFloat(kospi.stck_prpr.toString()),
        change: parseFloat(kospi.prdy_vrss.toString()),
        changePercent: parseFloat(kospi.prdy_ctrt.toString()),
        volume: Number(kospi.acml_vol),
        marketCap: Number(kospi.acml_tr_pbmn)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// KOSDAQ 지수 데이터 조회
router.get('/kosdaq', async (req: Request, res: Response) => {
  try {
    const kosdaq = await DatabaseService.getLatestKOSDAQData();
    if (!kosdaq) {
      // Fallback to mock data
      return res.json({
        success: true,
        data: {
          current: 850.30,
          change: -5.10,
          changePercent: -0.60,
          volume: 2000000,
          marketCap: 1000000000,
          isMock: true
        },
        timestamp: new Date().toISOString()
      });
    }
    return res.json({
      success: true,
      data: {
        current: parseFloat(kosdaq.stck_prpr.toString()),
        change: parseFloat(kosdaq.prdy_vrss.toString()),
        changePercent: parseFloat(kosdaq.prdy_ctrt.toString()),
        volume: Number(kosdaq.acml_vol),
        marketCap: Number(kosdaq.acml_tr_pbmn)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 전체 시장 데이터 조회
router.get('/market', async (req: Request, res: Response) => {
  try {
    const [kospi, kosdaq] = await Promise.all([
      DatabaseService.getLatestKOSPIData(),
      DatabaseService.getLatestKOSDAQData()
    ]);
    if (!kospi && !kosdaq) {
      return res.status(404).json({ success: false, message: '시장 데이터가 없습니다.' });
    }
    return res.json({
      success: true,
      data: {
        kospi: kospi ? {
          current: parseFloat(kospi.stck_prpr.toString()),
          change: parseFloat(kospi.prdy_vrss.toString()),
          changePercent: parseFloat(kospi.prdy_ctrt.toString()),
          volume: Number(kospi.acml_vol),
          marketCap: Number(kospi.acml_tr_pbmn)
        } : null,
        kosdaq: kosdaq ? {
          current: parseFloat(kosdaq.stck_prpr.toString()),
          change: parseFloat(kosdaq.prdy_vrss.toString()),
          changePercent: parseFloat(kosdaq.prdy_ctrt.toString()),
          volume: Number(kosdaq.acml_vol),
          marketCap: Number(kosdaq.acml_tr_pbmn)
        } : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 데이터 수집 트리거 (수동/스케줄러)
router.post('/collect', async (req: Request, res: Response) => {
  try {
    const { date } = req.body;
    // Default to today if not provided
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Trigger collection
    const result = await KrxCollectionService.collectDailyMarketData(targetDate);

    return res.json({
      success: true,
      data: result,
      message: `${targetDate} 시장 데이터 수집 완료`
    });
  } catch (error) {
    console.error('Market data collection failed:', error);
    return res.status(500).json({
      success: false,
      message: '시장 데이터 수집 실패',
      error: (error as Error).message
    });
  }
});

export default router; 