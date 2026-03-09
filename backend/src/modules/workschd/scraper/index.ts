import { FuneralHomeSource, ScrapeReport, ScrapeResult } from './types';
import { initDb, clearOldFunerals, insertFunerals, syncFuneralHomes } from './db';

// Original 9 sites
import { InhaHospitalScraper } from './sites/inha-hospital';
import { IncheonMedicalScraper } from './sites/incheon-medical';
import { IncheonRedCrossScraper } from './sites/incheon-red-cross';
import { IncheonCitizenScraper } from './sites/incheon-citizen';
import { IncheonCatholicScraper } from './sites/incheon-catholic';
import { BucheonCatholicScraper } from './sites/bucheon-catholic';
import { BucheonCitizenScraper } from './sites/bucheon-citizen';
import { BucheonSoonchunhyangScraper } from './sites/bucheon-soonchunhyang';
import { BucheonSejongScraper } from './sites/bucheon-sejong';

// Additional 12 sites
import { IncheonSonglimCheonggiwwaScraper } from './sites/incheon-songlim-cheonggiwwa';
import { IncheonInternationalMaryScraper } from './sites/incheon-international-mary';
import { IncheonGeomdanTopScraper } from './sites/incheon-geomdan-top';
import { IncheonBoramScraper } from './sites/incheon-boram';
import { IncheonGilHospitalScraper } from './sites/incheon-gil-hospital';
import { IncheonGanseokScraper } from './sites/incheon-ganseok';
import { IncheonSeongScraper } from './sites/incheon-seong';
import { IncheonShillakwonScraper } from './sites/incheon-shillakwon';
import { IncheonSaecheonnyeonScraper } from './sites/incheon-saecheonnyeon';
import { IncheonHallimScraper } from './sites/incheon-hallim';
import { IncheonGyeyangCheonggiwwaScraper } from './sites/incheon-gyeyang-cheonggiwwa';
import { IncheonGyeyangSejongScraper } from './sites/incheon-gyeyang-sejong';

import { BaseScraper } from './sites/base-scraper';

const ALL_SCRAPERS: BaseScraper[] = [
  // 인천 (Incheon) — 17 sites
  new InhaHospitalScraper(),
  new IncheonMedicalScraper(),
  new IncheonRedCrossScraper(),
  new IncheonCitizenScraper(),
  new IncheonCatholicScraper(),
  new IncheonBoramScraper(),
  new IncheonGilHospitalScraper(),
  new IncheonGanseokScraper(),
  new IncheonSeongScraper(),
  new IncheonShillakwonScraper(),
  new IncheonSaecheonnyeonScraper(),
  new IncheonHallimScraper(),
  new IncheonSonglimCheonggiwwaScraper(),
  new IncheonInternationalMaryScraper(),
  new IncheonGeomdanTopScraper(),
  new IncheonGyeyangCheonggiwwaScraper(),
  new IncheonGyeyangSejongScraper(),

  // 부천 (Bucheon) — 4 sites
  new BucheonCatholicScraper(),
  new BucheonCitizenScraper(),
  new BucheonSoonchunhyangScraper(),
  new BucheonSejongScraper(),
];

export async function runAllScrapers(): Promise<ScrapeReport> {
  const startedAt = new Date().toISOString();

  // Ensure DB is ready
  await initDb();
  await syncFuneralHomes(getFuneralHomeSources());
  await clearOldFunerals();

  const bySource: ScrapeReport['bySource'] = [];
  const errors: string[] = [];
  let totalScraped = 0;

  // Run scrapers sequentially to avoid overwhelming target servers
  for (const scraper of ALL_SCRAPERS) {
    try {
      console.log(`[Scraper] Starting: ${scraper.funeralHomeName}`);
      const result: ScrapeResult = await scraper.run();
      const scrapedCount = result.funerals.length;
      let savedCount = 0;

      if (result.error) {
        errors.push(`${result.funeralHomeName}: ${result.error}`);
      }

      if (scrapedCount > 0) {
        savedCount = await insertFunerals(result.funerals);
        totalScraped += savedCount;
        console.log(
          `[Scraper] ${result.funeralHomeName}: ${savedCount} funerals saved (scraped ${scrapedCount})`
        );
      } else {
        console.log(`[Scraper] ${result.funeralHomeName}: no funerals found${result.error ? ` (${result.error})` : ''}`);
      }

      bySource.push({
        name: result.funeralHomeName,
        count: savedCount,
        error: result.error
      });
    } catch (err: any) {
      const msg = `${scraper.funeralHomeName}: unexpected error - ${err.message}`;
      errors.push(msg);
      bySource.push({ name: scraper.funeralHomeName, count: 0, error: err.message });
      console.error(`[Scraper] ${msg}`);
    }

    // Polite delay between requests (1 second)
    await delay(1000);
  }

  const finishedAt = new Date().toISOString();
  return { startedAt, finishedAt, totalScraped, bySource, errors };
}

export async function getScraperStatus(): Promise<{ sites: string[]; dbPath: string }> {
  return {
    sites: ALL_SCRAPERS.map(s => `${s.funeralHomeName} (${s.region})`),
    dbPath: 'DATABASE_URL_WORKSCHD (Prisma)'
  };
}

export async function syncScraperFuneralHomes(): Promise<{ synced: number }> {
  const synced = await syncFuneralHomes(getFuneralHomeSources());
  return { synced };
}

function getFuneralHomeSources(): FuneralHomeSource[] {
  return ALL_SCRAPERS.map((scraper) => ({
    funeralHomeName: scraper.funeralHomeName,
    funeralHomeUrl: scraper.funeralHomeUrl,
    listingUrl: scraper.listingUrl,
    region: scraper.region
  }));
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
