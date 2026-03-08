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
      const html = await this.fetchHtml(this.listingUrl);
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
    const response: AxiosResponse<string> = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      },
      responseType: 'arraybuffer'  // handle EUC-KR encoded sites
    });

    // Try UTF-8 first; if garbled, decode as EUC-KR
    const buffer = Buffer.from(response.data as ArrayBuffer);
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

  protected load(html: string): cheerio.CheerioAPI {
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
}
