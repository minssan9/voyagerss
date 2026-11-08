import { configService } from '../../../config/config-service';
import type { AdapterRunContext, AdapterRunResult, ObservationUpsert, SourceAdapter } from '../types';
import { buildFetchRecord, httpGetJson, persistFetchAndObservations } from './adapter-utils';

const ENDPOINT = 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L';

export class TwseSecurityMasterAdapter implements SourceAdapter {
  readonly id = 'twse_security_master';

  isConfigured(): boolean {
    return true;
  }

  async run(ctx: AdapterRunContext): Promise<AdapterRunResult> {
    const limit = Number(configService.get('PD_TWSE_MASTER_LIMIT', '0')) || 0;
    const { status, body, parsed } = await httpGetJson(ENDPOINT);
    if (status !== 200 || !Array.isArray(parsed)) {
      const fetch = buildFetchRecord(
        this.id,
        'twse:t187ap03_L',
        ENDPOINT,
        status,
        body,
        'Asia/Taipei',
        null,
        null,
        'http_or_parse_error',
        String(status),
      );
      await persistFetchAndObservations(ctx, fetch, []);
      return {
        adapterId: this.id,
        status: 'error',
        fetches: 1,
        observationsWritten: 0,
        errors: [`TWSE master HTTP ${status}`],
      };
    }

    const observations: ObservationUpsert[] = [];
    const rows = parsed as Record<string, string>[];
    const slice = limit > 0 ? rows.slice(0, limit) : rows;
    for (const row of slice) {
      const code = row['公司代號'];
      if (!code) continue;
      observations.push({
        adapterId: this.id,
        seriesKey: `twse:master:${code}`,
        entityId: code,
        entityName: row['公司名稱'] ?? null,
        metric: 'security_master_snapshot',
        periodType: 'snapshot',
        periodStart: 'latest',
        periodEnd: 'latest',
        valueNumeric: null,
        valueJson: row,
        unit: null,
        sourceIdentifier: `twse:t187ap03_L:${code}`,
        revisionTag: row['出表日期'] ?? null,
      });
    }

    const fetch = buildFetchRecord(
      this.id,
      'twse:t187ap03_L:latest',
      ENDPOINT,
      status,
      body,
      'Asia/Taipei',
      'latest',
      'latest',
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
