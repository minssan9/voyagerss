import { configService } from '../../../config/config-service';
import type { AdapterRunContext, AdapterRunResult, ObservationUpsert, SourceAdapter } from '../types';
import { buildFetchRecord, persistFetchAndObservations } from './adapter-utils';
import { resilientFetch } from '../http/resilient-http';

export class DartCorpMasterAdapter implements SourceAdapter {
  readonly id = 'dart_corp_master';

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

    const limit = Number(configService.get('PD_DART_CORP_LIMIT', '500')) || 500;
    const url = `https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key=${encodeURIComponent(apiKey)}`;
    const res = await resilientFetch({ url, timeoutMs: 120_000 });
    const body = res.body;

    const observations = parseCorpXml(body, limit);
    const fetch = buildFetchRecord(
      this.id,
      'dart:corpCode.xml',
      'https://opendart.fss.or.kr/api/corpCode.xml',
      res.status,
      body.slice(0, 500_000),
      'Asia/Seoul',
      'latest',
      'latest',
      res.status !== 200 ? 'http_error' : null,
      res.status !== 200 ? `status=${res.status}` : null,
    );
    const { written } = await persistFetchAndObservations(ctx, fetch, observations);
    return {
      adapterId: this.id,
      status: res.status === 200 ? 'success' : 'error',
      fetches: 1,
      observationsWritten: written,
      errors: res.status === 200 ? [] : [`DART corpCode HTTP ${res.status}`],
    };
  }
}

function parseCorpXml(xml: string, limit: number): ObservationUpsert[] {
  const rows: ObservationUpsert[] = [];
  const listRegex = /<list>([\s\S]*?)<\/list>/g;
  let match: RegExpExecArray | null;
  let count = 0;
  while ((match = listRegex.exec(xml)) !== null && count < limit) {
    const block = match[1];
    const corpCode = extractTag(block, 'corp_code');
    const corpName = extractTag(block, 'corp_name');
    const stockCode = extractTag(block, 'stock_code');
    if (!corpCode) continue;
    rows.push({
      adapterId: 'dart_corp_master',
      seriesKey: `dart:corp:${corpCode}`,
      entityId: stockCode || corpCode,
      entityName: corpName,
      metric: 'corp_master_snapshot',
      periodType: 'snapshot',
      periodStart: 'latest',
      periodEnd: 'latest',
      valueNumeric: null,
      valueJson: { corp_code: corpCode, corp_name: corpName, stock_code: stockCode },
      unit: null,
      sourceIdentifier: `opendart:corp_code:${corpCode}`,
      revisionTag: null,
    });
    count += 1;
  }
  return rows;
}

function extractTag(block: string, tag: string): string | null {
  const m = new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(block);
  return m ? m[1].trim() : null;
}
