import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { runAllScrapers, getScraperStatus, syncScraperFuneralHomes } from '../scraper/index';
import { queryFunerals, linkFuneralToTask, queryFuneralHomes } from '../scraper/db';

export class ScraperController {
  /**
   * POST /api/workschd/scrape
   * Trigger a full scrape of all funeral home websites.
   * Requires TEAM_LEADER or ADMIN role.
   */
  async triggerScrape(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log(`[ScraperController] Scrape triggered by accountId=${req.user?.accountId}`);

      // Run scraper (may take 30-60s depending on network)
      const report = await runAllScrapers();

      res.json({
        success: true,
        report
      });
    } catch (error: any) {
      console.error('[ScraperController] Scrape failed:', error);
      res.status(500).json({ message: 'Scrape failed', error: error.message });
    }
  }

  /**
   * GET /api/workschd/scraped-funerals
   * List scraped funeral ceremonies.
   * Query params: region (INCHEON|BUCHEON), funeralHomeName, page, size
   */
  async getScrapedFunerals(req: AuthRequest, res: Response): Promise<void> {
    try {
      const region = req.query.region as 'INCHEON' | 'BUCHEON' | undefined;
      const funeralHomeName = req.query.funeralHomeName as string | undefined;
      const page = parseInt(req.query.page as string) || 0;
      const size = parseInt(req.query.size as string) || 20;

      const result = await queryFunerals({ region, funeralHomeName, page, size });

      res.json(result);
    } catch (error: any) {
      console.error('[ScraperController] Query failed:', error);
      res.status(500).json({ message: 'Failed to fetch scraped funerals', error: error.message });
    }
  }

  /**
   * GET /api/workschd/funeral-homes
   * List funeral homes stored in DB.
   * Query params: region (INCHEON|BUCHEON), isActive (true|false), page, size
   */
  async getFuneralHomes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const region = req.query.region as 'INCHEON' | 'BUCHEON' | undefined;
      const isActiveRaw = req.query.isActive as string | undefined;
      const isActive = isActiveRaw === undefined ? undefined : isActiveRaw === 'true';
      const page = parseInt(req.query.page as string) || 0;
      const size = parseInt(req.query.size as string) || 50;

      const result = await queryFuneralHomes({ region, isActive, page, size });
      res.json(result);
    } catch (error: any) {
      console.error('[ScraperController] Funeral homes query failed:', error);
      res.status(500).json({ message: 'Failed to fetch funeral homes', error: error.message });
    }
  }

  /**
   * GET /api/workschd/scraper/status
   * Returns scraper configuration info (available sites, DB path).
   */
  async getStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const status = await getScraperStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to get scraper status', error: error.message });
    }
  }

  /**
   * POST /api/workschd/scraper/funeral-homes/sync
   * Sync scraper source list into DB funeral_home table.
   */
  async syncFuneralHomes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await syncScraperFuneralHomes();
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('[ScraperController] Funeral home sync failed:', error);
      res.status(500).json({ message: 'Failed to sync funeral homes', error: error.message });
    }
  }

  /**
   * POST /api/workschd/scraped-funerals/:funeralId/link-task
   * Link a scraped funeral record to a Task (for tracking which task was created from it).
   * Body: { taskId: number }
   */
  async linkToTask(req: AuthRequest, res: Response): Promise<void> {
    try {
      const funeralId = parseInt(req.params.funeralId);
      const { taskId } = req.body;

      if (!funeralId || !taskId) {
        res.status(400).json({ message: 'funeralId and taskId are required' });
        return;
      }

      await linkFuneralToTask(funeralId, taskId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[ScraperController] Link failed:', error);
      res.status(500).json({ message: 'Failed to link funeral to task', error: error.message });
    }
  }
}
