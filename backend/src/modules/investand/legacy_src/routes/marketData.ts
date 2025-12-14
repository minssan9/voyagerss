import { Router, Request, Response } from 'express';
import { DatabaseService } from '@/services/core/databaseService';

const router = Router();

// KOSPI 지수 데이터 조회
router.get('/kospi', async (req: Request, res: Response) => {
  try {
    const kospi = await DatabaseService.getLatestKOSPIData();
    if (!kospi) {
      return res.status(404).json({ success: false, message: 'KOSPI 데이터가 없습니다.' });
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
      return res.status(404).json({ success: false, message: 'KOSDAQ 데이터가 없습니다.' });
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

export default router; 