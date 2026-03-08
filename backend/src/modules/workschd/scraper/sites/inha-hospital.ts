// 인하대병원 장례식장
// Listing URL: https://www.inha.com/site/funeral/hall/deceased
import { BaseScraper } from './base-scraper';
import { ScrapedFuneral } from '../types';

export class InhaHospitalScraper extends BaseScraper {
  readonly funeralHomeName = '인하대병원 장례식장';
  readonly funeralHomeUrl = 'https://www.inha.com/site/funeral/main';
  readonly region = 'INCHEON' as const;

  get listingUrl(): string {
    return 'https://www.inha.com/site/funeral/hall/deceased';
  }

  parse(html: string): ScrapedFuneral[] {
    const $ = this.load(html);
    const results: ScrapedFuneral[] = [];

    // The page lists mourning rooms with deceased information in table rows
    // Typical selectors for this type of Korean hospital funeral page
    $('table tbody tr, .deceased-list li, .funeral-list .item').each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length === 0) return;

      // Try to extract from table columns: 빈소, 고인명, 상주, 발인일, 장지
      const roomNumber = $(cells.get(0)).text().trim();
      const deceasedName = $(cells.get(1)).text().trim();
      const chiefMourner = $(cells.get(2)).text().trim();
      const funeralDate = $(cells.get(3)).text().trim();
      const burialPlace = $(cells.get(4)).text().trim();

      if (!deceasedName || deceasedName === '고인명' || deceasedName === '성명') return;

      results.push(this.makeRecord({
        deceasedName,
        roomNumber: roomNumber || undefined,
        chiefMourner: chiefMourner || undefined,
        funeralDate: funeralDate || undefined,
        burialPlace: burialPlace || undefined,
        rawData: JSON.stringify({ roomNumber, deceasedName, chiefMourner, funeralDate, burialPlace })
      }));
    });

    return results;
  }
}
