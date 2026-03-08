// 인천광역시의료원 장례식장
// URL: https://www.icmc.or.kr/guide/guide13.php?tsort=4&msort=50&ssort=57
import { BaseScraper } from './base-scraper';
import { ScrapedFuneral } from '../types';

export class IncheonMedicalScraper extends BaseScraper {
  readonly funeralHomeName = '인천광역시의료원 장례식장';
  readonly funeralHomeUrl = 'https://www.icmc.or.kr';
  readonly region = 'INCHEON' as const;

  get listingUrl(): string {
    return 'https://www.icmc.or.kr/guide/guide13.php?tsort=4&msort=50&ssort=57';
  }

  parse(html: string): ScrapedFuneral[] {
    const $ = this.load(html);
    const results: ScrapedFuneral[] = [];

    // PHP-based site — table or div layout
    $('table tbody tr').each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length < 2) return;

      const deceasedName = $(cells.get(0)).text().trim() || $(cells.get(1)).text().trim();
      const roomNumber = $(cells.get(0)).text().trim();
      const chiefMourner = cells.length > 2 ? $(cells.get(2)).text().trim() : undefined;
      const funeralDate = cells.length > 3 ? $(cells.get(3)).text().trim() : undefined;

      if (!deceasedName || deceasedName.length < 2) return;
      // Skip header rows
      if (['고인명', '성명', '빈소', '호실'].includes(deceasedName)) return;

      results.push(this.makeRecord({
        deceasedName,
        roomNumber: roomNumber !== deceasedName ? roomNumber : undefined,
        chiefMourner,
        funeralDate,
        rawData: JSON.stringify({ roomNumber, deceasedName, chiefMourner, funeralDate })
      }));
    });

    return results;
  }
}
