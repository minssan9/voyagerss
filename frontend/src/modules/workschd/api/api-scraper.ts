import { AxiosResponse } from 'axios';
import service from './axios';

export interface ScrapedFuneral {
  id: number;
  funeralHomeName: string;
  funeralHomeUrl: string;
  region: 'INCHEON' | 'BUCHEON';
  deceasedName: string;
  roomNumber?: string;
  chiefMourner?: string;
  funeralDate?: string;
  burialDate?: string;
  burialPlace?: string;
  religion?: string;
  scrapedAt: string;
  taskId?: number;
}

export interface ScrapedFuneralPage {
  content: ScrapedFuneral[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface ScrapeReport {
  startedAt: string;
  finishedAt: string;
  totalScraped: number;
  bySource: Array<{ name: string; count: number; error?: string }>;
  errors: string[];
}

export interface FuneralHome {
  id: number;
  name: string;
  homeUrl: string;
  listingUrl: string;
  region: 'INCHEON' | 'BUCHEON';
  isActive: boolean;
  lastScrapedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuneralHomePage {
  content: FuneralHome[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface ScraperStatus {
  sites: string[];
  dbPath: string;
}

const triggerScrape = (): Promise<AxiosResponse<{ success: boolean; report: ScrapeReport }>> => {
  return service.post('/workschd/scrape');
};

const getScrapedFunerals = (params?: {
  region?: 'INCHEON' | 'BUCHEON';
  funeralHomeName?: string;
  page?: number;
  size?: number;
}): Promise<AxiosResponse<ScrapedFuneralPage>> => {
  return service.get('/workschd/scraped-funerals', { params });
};

const getFuneralHomes = (params?: {
  region?: 'INCHEON' | 'BUCHEON';
  isActive?: boolean;
  page?: number;
  size?: number;
}): Promise<AxiosResponse<FuneralHomePage>> => {
  return service.get('/workschd/funeral-homes', { params });
};

const syncFuneralHomes = (): Promise<AxiosResponse<{ success: boolean; synced: number }>> => {
  return service.post('/workschd/scraper/funeral-homes/sync');
};

const getScraperStatus = (): Promise<AxiosResponse<ScraperStatus>> => {
  return service.get('/workschd/scraper/status');
};

const linkFuneralToTask = (funeralId: number, taskId: number): Promise<AxiosResponse<{ success: boolean }>> => {
  return service.post(`/workschd/scraped-funerals/${funeralId}/link-task`, { taskId });
};

export default {
  triggerScrape,
  getScrapedFunerals,
  getFuneralHomes,
  syncFuneralHomes,
  getScraperStatus,
  linkFuneralToTask
};
