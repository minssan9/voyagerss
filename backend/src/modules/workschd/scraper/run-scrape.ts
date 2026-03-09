import dotenv from 'dotenv';
import path from 'path';
import { runAllScrapers } from './index';

async function main(): Promise<void> {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

  const report = await runAllScrapers();

  console.log('[Workschd Scraper] Completed');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error('[Workschd Scraper] Failed:', error);
  process.exit(1);
});
