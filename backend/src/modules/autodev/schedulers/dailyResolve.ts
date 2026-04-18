import cron from 'node-cron';
import { autodevPrisma } from '../../../config/prisma';

export function startDailyResolveScheduler(): void {
  // Runs weekdays at 09:00
  cron.schedule('0 9 * * 1-5', async () => {
    console.log('[dailyResolve] Running stale job cleanup...');
    try {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const result = await autodevPrisma.job.updateMany({
        where: {
          status: 'RUNNING',
          startedAt: { lt: fourHoursAgo },
        },
        data: { status: 'FAILED', finishedAt: new Date() },
      });
      console.log(`[dailyResolve] Marked ${result.count} stale running jobs as FAILED`);
    } catch (err) {
      console.error('[dailyResolve] Error during stale job cleanup:', err);
    }
  });

  console.log('[dailyResolve] Scheduler registered (0 9 * * 1-5)');
}
