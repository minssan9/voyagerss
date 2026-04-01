// 인천적십자병원 장례식장
// URL: http://www.rchfuneral.co.kr/
import { BaseScraper } from './base-scraper';
import { ScrapedFuneral } from '../types';

export class IncheonRedCrossScraper extends BaseScraper {
  readonly funeralHomeName = '인천적십자병원 장례식장';
  readonly funeralHomeUrl = 'http://www.rchfuneral.co.kr';
  readonly region = 'INCHEON' as const;

  parse(html: string): ScrapedFuneral[] {
    const $ = this.load(html);
    const results: ScrapedFuneral[] = [];

    // Look for mourning room status table on main page
    $('table tbody tr, .binso-list tr, .funeral-info tr').each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length < 2) return;

      const texts = cells.toArray().map(c => $(c).text().trim());
      const deceasedName = texts.find(t => t.length >= 2 && !/^\d+$/.test(t) &&
        !['호실', '고인명', '상주', '발인일'].includes(t));

      if (!deceasedName) return;

      const roomNumber = texts[0];
      const chiefMourner = texts[2] || undefined;
      const funeralDate = texts[3] || undefined;

      results.push(this.makeRecord({
        deceasedName,
        roomNumber,
        chiefMourner,
        funeralDate,
        rawData: JSON.stringify(texts)
      }));
    });

    return results;
  }
}
