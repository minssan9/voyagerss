import cron from 'node-cron';
import { runAllScrapers } from './index';

let running = false;
let started = false;

export function startWorkschdScraperScheduler(): void {
  if (started) {
    return;
  }

  const enabled = process.env.WORKSCHD_SCRAPER_ENABLED === 'true';
  if (!enabled) {
    console.log('[WorkschdScraperScheduler] Disabled (WORKSCHD_SCRAPER_ENABLED != true)');
    return;
  }

  const expression = process.env.WORKSCHD_SCRAPER_CRON || '*/30 * * * *';

  cron.schedule(expression, async () => {
    if (running) {
      console.log('[WorkschdScraperScheduler] Skip run: previous job still running');
      return;
    }

    running = true;
    try {
      console.log('[WorkschdScraperScheduler] Scheduled scraping started');
      const report = await runAllScrapers();
      console.log(
        `[WorkschdScraperScheduler] Completed: saved=${report.totalScraped}, errors=${report.errors.length}`
      );
    } catch (error: any) {
      console.error('[WorkschdScraperScheduler] Failed:', error?.message || error);
    } finally {
      running = false;
    }
  });

  started = true;
  console.log(`[WorkschdScraperScheduler] Started with cron="${expression}"`);
}

