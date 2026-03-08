// Types for the funeral home scraper module

export interface ScrapedFuneral {
  funeralHomeName: string;
  funeralHomeUrl: string;
  region: 'INCHEON' | 'BUCHEON';
  deceasedName: string;
  roomNumber?: string;
  chiefMourner?: string;
  funeralDate?: string;    // ISO string or human-readable
  burialDate?: string;
  burialPlace?: string;
  religion?: string;
  rawData?: string;        // JSON stringified raw scraped object
  scrapedAt: string;       // ISO datetime string
}

export interface ScrapeResult {
  funeralHomeName: string;
  funeralHomeUrl: string;
  region: 'INCHEON' | 'BUCHEON';
  funerals: ScrapedFuneral[];
  error?: string;
}

export interface ScrapeReport {
  startedAt: string;
  finishedAt: string;
  totalScraped: number;
  bySource: Array<{
    name: string;
    count: number;
    error?: string;
  }>;
  errors: string[];
}
