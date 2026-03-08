// 인천성모장례식장 (Catholic)
// URL: http://icfh.catholicfuneral.co.kr/cmm/main/mainPage.do
import { BaseScraper } from './base-scraper';
import { ScrapedFuneral } from '../types';

export class IncheonCatholicScraper extends BaseScraper {
  readonly funeralHomeName = '인천성모장례식장';
  readonly funeralHomeUrl = 'http://icfh.catholicfuneral.co.kr';
  readonly region = 'INCHEON' as const;

  get listingUrl(): string {
    return 'http://icfh.catholicfuneral.co.kr/cmm/main/mainPage.do';
  }

  parse(html: string): ScrapedFuneral[] {
    const $ = this.load(html);
    const results: ScrapedFuneral[] = [];

    // Java/.do based site (Spring MVC) — standard table layout
    $('table.funeral-table tbody tr, table tbody tr, .mourning-list tr').each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length < 2) return;

      const texts = cells.toArray().map(c => $(c).text().trim());
      if (texts.some(t => ['고인명', '빈소', '호실', '상주'].includes(t))) return;

      const deceasedName = texts.find(t => /[가-힣]{2,4}/.test(t) && t.length <= 8);
      if (!deceasedName) return;

      const roomNumber = texts[0];
      const chiefMourner = texts[2] || undefined;
      const funeralDate = texts[3] || undefined;
      const burialDate = texts[4] || undefined;

      results.push(this.makeRecord({
        deceasedName,
        roomNumber,
        chiefMourner,
        funeralDate,
        burialDate,
        religion: '천주교',
        rawData: JSON.stringify(texts)
      }));
    });

    return results;
  }
}
