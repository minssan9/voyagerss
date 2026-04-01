import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedFuneral, ScrapeResult } from '../types';

export abstract class BaseScraper {
  abstract readonly funeralHomeName: string;
  abstract readonly funeralHomeUrl: string;
  abstract readonly region: 'INCHEON' | 'BUCHEON';

  /** Override to provide the specific listing URL if different from funeralHomeUrl */
  get listingUrl(): string {
    return this.funeralHomeUrl;
  }

  abstract parse(html: string): ScrapedFuneral[];

  async run(): Promise<ScrapeResult> {
    try {
      const listingUrl = this.getEffectiveListingUrl();
      const html = await this.fetchHtml(listingUrl);
      const funerals = this.parse(html);
      return {
        funeralHomeName: this.funeralHomeName,
        funeralHomeUrl: this.funeralHomeUrl,
        region: this.region,
        funerals
      };
    } catch (error: any) {
      console.error(`[${this.funeralHomeName}] Scrape error:`, error.message);
      return {
        funeralHomeName: this.funeralHomeName,
        funeralHomeUrl: this.funeralHomeUrl,
        region: this.region,
        funerals: [],
        error: error.message
      };
    }
  }

  protected async fetchHtml(url: string): Promise<string> {
    const candidates = this.buildCandidateUrls(url);
    let lastError: any = null;
    let response: AxiosResponse<ArrayBuffer> | null = null;

    for (const candidate of candidates) {
      try {
        response = await this.requestHtml(candidate);
        break;
      } catch (error: any) {
        lastError = error;
      }
    }

    if (!response) {
      throw lastError;
    }

    // Try UTF-8 first; if garbled, decode as EUC-KR
    const buffer = Buffer.from(response.data);
    const utf8 = buffer.toString('utf-8');

    // Detect EUC-KR by looking for charset in meta or HTTP header
    const contentType = response.headers['content-type'] || '';
    const isEucKr =
      contentType.toLowerCase().includes('euc-kr') ||
      utf8.toLowerCase().includes('euc-kr') ||
      utf8.toLowerCase().includes('ks_c_5601');

    if (isEucKr) {
      // Node.js doesn't natively decode EUC-KR — use iconv-lite if available
      try {
        const iconv = require('iconv-lite');
        return iconv.decode(buffer, 'EUC-KR');
      } catch {
        return utf8; // fallback
      }
    }

    return utf8;
  }

  protected load(html: string): any {
    return cheerio.load(html);
  }

  protected now(): string {
    return new Date().toISOString();
  }

  protected makeRecord(overrides: Partial<ScrapedFuneral> & { deceasedName: string }): ScrapedFuneral {
    return {
      funeralHomeName: this.funeralHomeName,
      funeralHomeUrl: this.funeralHomeUrl,
      region: this.region,
      scrapedAt: this.now(),
      ...overrides
    };
  }

  private async requestHtml(url: string): Promise<AxiosResponse<ArrayBuffer>> {
    return axios.get<ArrayBuffer>(url, {
      timeout: 25000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      responseType: 'arraybuffer'
    });
  }

  private toHttpFallbackUrl(url: string): string | null {
    if (!url.startsWith('https://')) {
      return null;
    }
    return `http://${url.slice('https://'.length)}`;
  }

  private buildCandidateUrls(url: string): string[] {
    const candidates: string[] = [];
    const pushUnique = (value: string | null) => {
      if (!value) return;
      if (!candidates.includes(value)) {
        candidates.push(value);
      }
    };

    pushUnique(url);
    pushUnique(this.toHttpFallbackUrl(url));
    pushUnique(this.removeWww(url));
    pushUnique(this.toHttpFallbackUrl(this.removeWww(url) || ''));

    return candidates;
  }

  private removeWww(url: string): string | null {
    if (!url.includes('://www.')) {
      return null;
    }
    return url.replace('://www.', '://');
  }

  private getEffectiveListingUrl(): string {
    const overrides = this.getListingUrlOverrides();
    return overrides[this.funeralHomeName] || this.listingUrl;
  }

  private getListingUrlOverrides(): Record<string, string> {
    const raw = process.env.WORKSCHD_SCRAPER_LISTING_URL_OVERRIDES_JSON;
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, string>;
      }
    } catch (error: any) {
      console.warn('[WorkschdScraper] Invalid WORKSCHD_SCRAPER_LISTING_URL_OVERRIDES_JSON:', error?.message);
    }

    return {};
  }
}
