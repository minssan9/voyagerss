import { configService } from '../../../config/config-service';
import type { AdapterRunContext, AdapterRunResult, ObservationUpsert, SourceAdapter } from '../types';
import { buildFetchRecord, httpGetJson, persistFetchAndObservations } from './adapter-utils';

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

export class DartDisclosureIndexAdapter implements SourceAdapter {
  readonly id = 'dart_disclosure_index';

  isConfigured(): boolean {
    const key = configService.get('DART_API_KEY', '') || process.env.DART_API_KEY || '';
    return key.length > 0;
  }

  async run(ctx: AdapterRunContext): Promise<AdapterRunResult> {
    const apiKey = configService.get('DART_API_KEY', '') || process.env.DART_API_KEY || '';
    if (!apiKey) {
      return {
        adapterId: this.id,
        status: 'skipped',
        fetches: 0,
        observationsWritten: 0,
        errors: [],
        unavailableReason: 'DART_API_KEY not configured',
      };
    }

    const lookbackDays = Number(configService.get('PD_DART_DISCLOSURE_DAYS', '3')) || 3;
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - lookbackDays);

    const url =
      `https://opendart.fss.or.kr/api/list.json?crtfc_key=${encodeURIComponent(apiKey)}` +
      `&bgn_de=${yyyymmdd(start)}&end_de=${yyyymmdd(end)}&page_count=100&page_no=1`;
    const { status, body, parsed } = await httpGetJson(url);
    const observations: ObservationUpsert[] = [];

    if (parsed && typeof parsed === 'object') {
      const root = parsed as { status?: string; list?: Array<Record<string, string>> };
      if (root.status && root.status !== '000' && root.status !== '013') {
        const fetch = buildFetchRecord(
          this.id,
          `dart:list:${yyyymmdd(start)}-${yyyymmdd(end)}`,
          'https://opendart.fss.or.kr/api/list.json',
          status,
          body,
          'Asia/Seoul',
          yyyymmdd(start),
          yyyymmdd(end),
          `dart_status_${root.status}`,
          body.slice(0, 200),
        );
        await persistFetchAndObservations(ctx, fetch, []);
        return {
          adapterId: this.id,
          status: 'error',
          fetches: 1,
          observationsWritten: 0,
          errors: [`DART status ${root.status}`],
        };
      }
      for (const item of root.list ?? []) {
        const rcept = item.rcept_no;
        if (!rcept) continue;
        observations.push({
          adapterId: this.id,
          seriesKey: `dart:disclosure:${item.corp_code ?? 'unknown'}`,
          entityId: item.stock_code || item.corp_code || null,
          entityName: item.corp_name ?? null,
          metric: 'disclosure_index',
          periodType: 'day',
          periodStart: item.rcept_dt ?? yyyymmdd(end),
          periodEnd: item.rcept_dt ?? yyyymmdd(end),
          valueNumeric: null,
          valueJson: item,
          unit: null,
          sourceIdentifier: `opendart:rcept:${rcept}`,
          revisionTag: item.report_nm ?? null,
        });
      }
    }

    const fetch = buildFetchRecord(
      this.id,
      `dart:list:${yyyymmdd(start)}-${yyyymmdd(end)}`,
      'https://opendart.fss.or.kr/api/list.json',
      status,
      body,
      'Asia/Seoul',
      yyyymmdd(start),
      yyyymmdd(end),
      status !== 200 ? 'http_error' : null,
      null,
    );
    const { written } = await persistFetchAndObservations(ctx, fetch, observations);
    return {
      adapterId: this.id,
      status: status === 200 ? 'success' : 'error',
      fetches: 1,
      observationsWritten: written,
      errors: status === 200 ? [] : [`HTTP ${status}`],
    };
  }
}
