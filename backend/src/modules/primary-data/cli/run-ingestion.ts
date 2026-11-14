import '../../../load-env';
import { configService } from '../../../config/config-service';
import { runPrimaryDataIngestion } from '../ingestion/runner';

async function main(): Promise<void> {
  const arg = process.argv[2] ?? 'daily';
  await configService.initialize();

  const mode =
    arg === 'dry-run' ? 'dry-run' : arg === 'backfill' ? 'backfill' : 'daily';
  const dryRun = mode === 'dry-run' || process.env.PD_DRY_RUN === 'true';

  const report = await runPrimaryDataIngestion({
    mode: dryRun ? 'dry-run' : mode,
    dryRun,
    skipLock: dryRun || process.env.PD_SKIP_LOCK === 'true',
  });

  console.log(JSON.stringify(report, null, 2));
  if (report.status === 'error') process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
