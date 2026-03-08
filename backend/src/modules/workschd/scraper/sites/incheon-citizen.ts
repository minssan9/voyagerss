// 인천시민장례식장
// URL: http://siminfh.com/
import { BaseScraper } from './base-scraper';
import { ScrapedFuneral } from '../types';

export class IncheonCitizenScraper extends BaseScraper {
  readonly funeralHomeName = '인천시민장례식장';
  readonly funeralHomeUrl = 'http://siminfh.com';
  readonly region = 'INCHEON' as const;

  parse(html: string): ScrapedFuneral[] {
    const $ = this.load(html);
    const results: ScrapedFuneral[] = [];

    // PHP-based site; look for tables with 빈소 현황
    $('table tr').each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length < 2) return;

      const texts = cells.toArray().map(c => $(c).text().trim());
      // Filter out header-like rows
      if (texts.some(t => ['번호', '고인명', '빈소', '호실', '성명'].includes(t))) return;
      // Find deceased name candidate (Korean characters, 2+ chars)
      const deceasedName = texts.find(t => /[가-힣]{2,}/.test(t) && t.length <= 10);
      if (!deceasedName) return;

      results.push(this.makeRecord({
        deceasedName,
        roomNumber: texts[0] || undefined,
        chiefMourner: texts[2] || undefined,
        funeralDate: texts[3] || undefined,
        rawData: JSON.stringify(texts)
      }));
    });

    return results;
  }
}
