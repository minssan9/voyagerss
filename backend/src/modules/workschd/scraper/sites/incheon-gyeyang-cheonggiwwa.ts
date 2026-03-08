// 계양청기와 장례식장 (인천 계양구)
import { BaseScraper } from './base-scraper';
import { ScrapedFuneral } from '../types';

export class IncheonGyeyangCheonggiwwaScraper extends BaseScraper {
  readonly funeralHomeName = '계양청기와 장례식장';
  readonly funeralHomeUrl = 'https://www.gyeyangcheonggiwwa.co.kr';
  readonly region = 'INCHEON' as const;

  parse(html: string): ScrapedFuneral[] {
    const $ = this.load(html);
    const results: ScrapedFuneral[] = [];

    $('table tbody tr, .binso-list tr, .funeral-status tr').each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length < 2) return;
      const texts = cells.toArray().map(c => $(c).text().trim());
      if (texts.some(t => ['고인명', '빈소', '상주', '호실'].includes(t))) return;
      const deceasedName = texts.find(t => /[가-힣]{2,4}/.test(t) && t.length <= 8);
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
