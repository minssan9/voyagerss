import { configService } from '../../../config/config-service';
import type { AdapterRunContext, AdapterRunResult, ObservationUpsert, SourceAdapter } from '../types';
import { buildFetchRecord, httpGetJson, persistFetchAndObservations } from './adapter-utils';

const DEFAULT_SERIES = ['BAMLC0A0CM', 'BAMLH0A0HYM2', 'BAA10Y', 'AAA10Y', 'DGS10'] as const;

function lookbackStart(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export class FredCreditSpreadsAdapter implements SourceAdapter {
  readonly id = 'fred_credit_spreads';

  isConfigured(): boolean {
    const key = configService.get('FRED_API_KEY', '') || process.env.FRED_API_KEY || '';
    return key.length > 0;
  }

  async run(ctx: AdapterRunContext): Promise<AdapterRunResult> {
    const apiKey = configService.get('FRED_API_KEY', '') || process.env.FRED_API_KEY || '';
    if (!apiKey) {
      return {
        adapterId: this.id,
        status: 'skipped',
        fetches: 0,
        observationsWritten: 0,
        errors: [],
        unavailableReason: 'FRED_API_KEY not configured',
      };
    }

    const seriesList =
      (configService.get('PD_FRED_CREDIT_SERIES', '') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) || [];
    const series = seriesList.length > 0 ? seriesList : [...DEFAULT_SERIES];

    const lookbackDays = Number(configService.get('PD_FRED_LOOKBACK_DAYS', '120')) || 120;
    const start = lookbackStart(lookbackDays);
    const errors: string[] = [];
    let fetches = 0;
    let observationsWritten = 0;

    for (const seriesId of series) {
      const url =
        `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(seriesId)}` +
        `&api_key=${encodeURIComponent(apiKey)}&file_type=json&observation_start=${start}`;
      const fingerprint = `fred:${seriesId}:${start}`;
      try {
        const { status, body, parsed } = await httpGetJson(url);
        fetches += 1;
        if (status !== 200 || !parsed || typeof parsed !== 'object') {
          const fetch = buildFetchRecord(
            this.id,
            fingerprint,
            url,
            status,
            body,
            'UTC',
            start,
            null,
            'http_or_parse_error',
            `status=${status}`,
          );
          if (!ctx.dryRun) await persistFetchAndObservations(ctx, fetch, []);
          errors.push(`${seriesId}: HTTP ${status}`);
          continue;
        }

        const observations = mapFredObservations(parsed, seriesId);
        const periodEnd =
          observations.length > 0
            ? observations[observations.length - 1].periodStart
            : null;
        const fetch = buildFetchRecord(
          this.id,
          fingerprint,
          url,
          status,
          body,
          'UTC',
          start,
          periodEnd,
          null,
          null,
        );
        const { written } = await persistFetchAndObservations(ctx, fetch, observations);
        observationsWritten += written;
      } catch (e) {
        errors.push(`${seriesId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return {
      adapterId: this.id,
      status: errors.length === 0 ? 'success' : errors.length < series.length ? 'partial' : 'error',
      fetches,
      observationsWritten,
      errors,
    };
  }
}

export function mapFredObservationsForTest(payload: unknown, seriesId: string): ObservationUpsert[] {
  return mapFredObservations(payload, seriesId);
}

function mapFredObservations(payload: unknown, seriesId: string): ObservationUpsert[] {
  const root = payload as { observations?: Array<{ date?: string; value?: string }> };
  if (!Array.isArray(root.observations)) return [];
  const rows: ObservationUpsert[] = [];
  for (const obs of root.observations) {
    if (!obs.date || obs.value === undefined || obs.value === '.') continue;
    const numeric = Number(obs.value);
    if (Number.isNaN(numeric)) continue;
    rows.push({
      adapterId: 'fred_credit_spreads',
      seriesKey: `fred:${seriesId}`,
      entityId: null,
      entityName: seriesId,
      metric: 'index_value',
      periodType: 'day',
      periodStart: obs.date,
      periodEnd: obs.date,
      valueNumeric: numeric,
      valueJson: { series_id: seriesId, date: obs.date },
      unit: 'percent_or_index',
      sourceIdentifier: `fred.stlouisfed.org:${seriesId}:${obs.date}`,
      revisionTag: null,
    });
  }
  return rows;
}
