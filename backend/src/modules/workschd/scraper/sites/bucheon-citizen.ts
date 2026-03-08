// 부천시민장례식장 (구 세일장례식장)
// URL: http://bucheonseil.itrocks.kr/
import { BaseScraper } from './base-scraper';
import { ScrapedFuneral } from '../types';

export class BucheonCitizenScraper extends BaseScraper {
  readonly funeralHomeName = '부천시민장례식장';
  readonly funeralHomeUrl = 'http://bucheonseil.itrocks.kr';
  readonly region = 'BUCHEON' as const;

  parse(html: string): ScrapedFuneral[] {
    const $ = this.load(html);
    const results: ScrapedFuneral[] = [];

    $('table tr').each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length < 2) return;

      const texts = cells.toArray().map(c => $(c).text().trim());
      if (texts.some(t => ['번호', '고인명', '빈소', '상주', '호실'].includes(t))) return;

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
