// 인천 쉴낙원 장례식장
// URL: https://www.shillakwon.com/bbs/board.php?bo_table=find_user (deceased search)
import { BaseScraper } from './base-scraper';
import { ScrapedFuneral } from '../types';

export class IncheonShillakwonScraper extends BaseScraper {
  readonly funeralHomeName = '인천 쉴낙원 장례식장';
  readonly funeralHomeUrl = 'https://www.shillakwon.com';
  readonly region = 'INCHEON' as const;

  get listingUrl(): string {
    // The board listing of deceased / mourning rooms
    return 'https://www.shillakwon.com/bbs/board.php?bo_table=find_user';
  }

  parse(html: string): ScrapedFuneral[] {
    const $ = this.load(html);
    const results: ScrapedFuneral[] = [];

    // Gnuboard-based site — list rows
    $('.bo_list table tbody tr, .board-list tbody tr, table tbody tr').each((_, el) => {
      const cells = $(el).find('td');
      if (cells.length < 2) return;
      const texts = cells.toArray().map(c => $(c).text().replace(/\s+/g, ' ').trim());
      if (texts.some(t => ['번호', '고인명', '빈소', '상주'].includes(t))) return;

      // Gnuboard: title column usually contains the name
      const titleCell = $(el).find('.td_subject, .bo_tit, td:nth-child(2)').first().text().trim();
      const deceasedName = titleCell.replace(/[^\uAC00-\uD7AF\s]/g, '').trim().split(' ')[0];

      if (!deceasedName || deceasedName.length < 2) return;

      results.push(this.makeRecord({
        deceasedName,
        chiefMourner: texts[3] || undefined,
        funeralDate: texts[4] || undefined,
        rawData: JSON.stringify(texts)
      }));
    });

    return results;
  }
}
