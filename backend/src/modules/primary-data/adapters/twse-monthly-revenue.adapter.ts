import { configService } from '../../../config/config-service';
import type { AdapterRunContext, AdapterRunResult, ObservationUpsert, SourceAdapter } from '../types';
import { buildFetchRecord, httpGetJson, persistFetchAndObservations } from './adapter-utils';
import { rocYmToIsoYm } from './twse-roc-date';

const ENDPOINT = 'https://openapi.twse.com.tw/v1/opendata/t187ap05_L';

export class TwseMonthlyRevenueAdapter implements SourceAdapter {
  readonly id = 'twse_monthly_revenue';

  isConfigured(): boolean {
    return true;
  }

  async run(ctx: AdapterRunContext): Promise<AdapterRunResult> {
    const symbols = parseSymbolFilter();
    const { status, body, parsed } = await httpGetJson(ENDPOINT);
    if (status !== 200 || !Array.isArray(parsed)) {
      const fetch = buildFetchRecord(
        this.id,
        'twse:t187ap05_L:latest',
        ENDPOINT,
        status,
        body,
        'Asia/Taipei',
        null,
        null,
        'http_or_parse_error',
        `status=${status}`,
      );
      await persistFetchAndObservations(ctx, fetch, []);
      return {
        adapterId: this.id,
        status: 'error',
        fetches: 1,
        observationsWritten: 0,
        errors: [`TWSE HTTP ${status}`],
      };
    }

    const rows = parsed as Record<string, string>[];
    let periodYm: string | null = null;
    const observations: ObservationUpsert[] = [];
    for (const row of rows) {
      const code = row['公司代號'];
      if (!code) continue;
      if (symbols.size > 0 && !symbols.has(code)) continue;
      const ymRoc = row['資料年月'];
      const isoYm = rocYmToIsoYm(ymRoc);
      periodYm = isoYm;
      const revenueRaw = row['營業收入-當月營收'];
      const yoyRaw = row['營業收入-去年同月增減(%)'];
      if (!revenueRaw || revenueRaw === '--') continue;
      const revenue = Number(revenueRaw.replace(/,/g, ''));
      const yoy = yoyRaw && yoyRaw !== '--' ? Number(yoyRaw) : null;
      observations.push({
        adapterId: this.id,
        seriesKey: `twse:revenue:${code}`,
        entityId: code,
        entityName: row['公司名稱'] ?? null,
        metric: 'revenue_current_month_ntk',
        periodType: 'month',
        periodStart: isoYm,
        periodEnd: isoYm,
        valueNumeric: revenue,
        valueJson: {
          industry: row['產業別'] ?? null,
          yoy_pct: yoy,
          note: row['備註'] ?? null,
        },
        unit: 'TWD_thousands',
        sourceIdentifier: `twse:t187ap05_L:${code}:${isoYm}`,
        revisionTag: row['出表日期'] ?? null,
      });
    }

    const fetch = buildFetchRecord(
      this.id,
      `twse:t187ap05_L:${periodYm ?? 'unknown'}`,
      ENDPOINT,
      status,
      body,
      'Asia/Taipei',
      periodYm,
      periodYm,
      null,
      null,
    );
    const { written } = await persistFetchAndObservations(ctx, fetch, observations);
    return {
      adapterId: this.id,
      status: 'success',
      fetches: 1,
      observationsWritten: written,
      errors: [],
    };
  }
}

function parseSymbolFilter(): Set<string> {
  const raw = configService.get('PD_TWSE_SYMBOLS', '') || '';
  if (!raw.trim()) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
