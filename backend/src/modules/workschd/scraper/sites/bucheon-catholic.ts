// 부천성모장례식장 (Catholic)
// URL: http://bfh.catholicfuneral.co.kr/cmm/main/mainPage.do
import { BaseScraper } from './base-scraper';
import { ScrapedFuneral } from '../types';

export class BucheonCatholicScraper extends BaseScraper {
  readonly funeralHomeName = '부천성모장례식장';
  readonly funeralHomeUrl = 'http://bfh.catholicfuneral.co.kr';
  readonly region = 'BUCHEON' as const;

  get listingUrl(): string {
    return 'http://bfh.catholicfuneral.co.kr/cmm/main/mainPage.do';
  }

  parse(html: string): ScrapedFuneral[] {
    const $ = this.load(html);
    const results: ScrapedFuneral[] = [];

    $('table tbody tr, .mourning-list tr').each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length < 2) return;

      const texts = cells.toArray().map(c => $(c).text().trim());
      if (texts.some(t => ['고인명', '빈소', '호실', '상주'].includes(t))) return;

      const deceasedName = texts.find(t => /[가-힣]{2,4}/.test(t) && t.length <= 8);
      if (!deceasedName) return;

      results.push(this.makeRecord({
        deceasedName,
        roomNumber: texts[0] || undefined,
        chiefMourner: texts[2] || undefined,
        funeralDate: texts[3] || undefined,
        burialDate: texts[4] || undefined,
        religion: '천주교',
        rawData: JSON.stringify(texts)
      }));
    });

    return results;
  }
}
