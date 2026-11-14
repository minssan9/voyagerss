import cron from 'node-cron';
import { configService } from '../../config/config-service';
import { runPrimaryDataIngestion } from './ingestion/runner';

let running = false;
let started = false;

export function startPrimaryDataScheduler(): void {
  if (started) return;

  const enabled = configService.get('PD_INGESTION_ENABLED', 'false') === 'true';
  if (!enabled) {
    console.log('[PrimaryDataScheduler] Disabled (PD_INGESTION_ENABLED != true)');
    return;
  }

  const expression = configService.get('PD_INGESTION_CRON', '30 6 * * *')!;
  const timezone = configService.get('PD_INGESTION_TIMEZONE', 'Asia/Seoul')!;

  cron.schedule(
    expression,
    async () => {
      if (running) {
        console.log('[PrimaryDataScheduler] Skip: previous run still active');
        return;
      }
      running = true;
      try {
        console.log('[PrimaryDataScheduler] Daily ingestion started');
        const report = await runPrimaryDataIngestion({ mode: 'daily' });
        console.log(
          `[PrimaryDataScheduler] Finished status=${report.status} adapters=${report.adapterResults.length}`,
        );
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[PrimaryDataScheduler] Failed:', msg);
      } finally {
        running = false;
      }
    },
    { timezone },
  );

  started = true;
  console.log(`[PrimaryDataScheduler] Started cron="${expression}" tz="${timezone}"`);
}
