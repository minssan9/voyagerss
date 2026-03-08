// 부천세종병원 장례식장
// URL: https://bucheonse.funeralhow.com/
import { BaseScraper } from './base-scraper';
import { ScrapedFuneral } from '../types';

export class BucheonSejongScraper extends BaseScraper {
  readonly funeralHomeName = '부천세종병원 장례식장';
  readonly funeralHomeUrl = 'https://bucheonse.funeralhow.com';
  readonly region = 'BUCHEON' as const;

  parse(html: string): ScrapedFuneral[] {
    const $ = this.load(html);
    const results: ScrapedFuneral[] = [];

    $('.funeral-item, .deceased-item, table tbody tr, .obitu-list li').each((_, el) => {
      const name = $(el).find('.name, .deceased-name, td:nth-child(2), .title').first().text().trim();
      const room = $(el).find('.room, .binso, td:first-child').first().text().trim();
      const mourner = $(el).find('.mourner, td:nth-child(3)').first().text().trim();
      const date = $(el).find('.date, td:nth-child(4)').first().text().trim();

      if (!name || !(/[가-힣]{2,}/.test(name))) return;

      results.push(this.makeRecord({
        deceasedName: name,
        roomNumber: room || undefined,
        chiefMourner: mourner || undefined,
        funeralDate: date || undefined,
        rawData: JSON.stringify({ name, room, mourner, date })
      }));
    });

    if (results.length === 0) {
      $('table tbody tr').each((_, el) => {
        const cells = $(el).find('td');
        if (cells.length < 2) return;
        const texts = cells.toArray().map(c => $(c).text().trim());
        const deceasedName = texts.find(t => /[가-힣]{2,4}/.test(t) && t.length <= 8);
        if (!deceasedName) return;
        if (['고인명', '빈소', '상주'].includes(deceasedName)) return;
        results.push(this.makeRecord({
          deceasedName,
          roomNumber: texts[0] || undefined,
          chiefMourner: texts[2] || undefined,
          funeralDate: texts[3] || undefined,
          rawData: JSON.stringify(texts)
        }));
      });
    }

    return results;
  }
}
