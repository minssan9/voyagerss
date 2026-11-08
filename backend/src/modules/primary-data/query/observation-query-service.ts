import {
  findLatestObservation,
  findObservationsForQuery,
} from '../repository/primary-data-repository';
import type { ObservationQueryResult } from '../types';

export interface QueryOptions {
  seriesKey: string;
  metric: string;
  /** Observation period anchor YYYY-MM or YYYY-MM-DD */
  asOfPeriod: string;
  maxStalenessSeconds?: number;
  now?: Date;
}

function periodCompare(a: string, b: string): number {
  return a.localeCompare(b);
}

export function selectObservationForAsOf<T extends { period_start: string; period_end: string }>(
  candidates: T[],
  asOfPeriod: string,
): T | null {
  const onOrBefore = candidates.filter((row) => row.period_start <= asOfPeriod);
  const exact = onOrBefore.find(
    (row) => row.period_start <= asOfPeriod && row.period_end >= asOfPeriod,
  );
  return (
    exact ??
    onOrBefore.sort((a, b) => periodCompare(b.period_start, a.period_start))[0] ??
    null
  );
}

export async function queryObservationWithFallback(
  options: QueryOptions,
): Promise<ObservationQueryResult> {
  const now = options.now ?? new Date();
  const maxStale = options.maxStalenessSeconds ?? 86400 * 45;

  const candidates = await findObservationsForQuery(
    options.seriesKey,
    options.metric,
    options.asOfPeriod,
  );

  const best = selectObservationForAsOf(candidates, options.asOfPeriod);

  if (!best) {
    const latest = await findLatestObservation(options.seriesKey, options.metric);
    if (!latest) {
      return emptyResult(options, null);
    }
    const staleSeconds = Math.floor((now.getTime() - new Date(latest.fetched_at).getTime()) / 1000);
    if (periodCompare(latest.period_start, options.asOfPeriod) > 0) {
      return emptyResult(options, 'no_lookahead');
    }
    return {
      found: true,
      valueNumeric: latest.value_numeric,
      valueJson: parseJson(latest.value_json),
      unit: latest.unit,
      observationPeriodStart: latest.period_start,
      observationPeriodEnd: latest.period_end,
      asOf: options.asOfPeriod,
      retrievedAt: new Date(latest.fetched_at).toISOString(),
      sourceUrl: latest.source_url,
      sourceIdentifier: latest.source_identifier,
      stalenessSeconds: staleSeconds,
      fallbackReason: staleSeconds > maxStale ? 'stale_latest_only' : 'latest_only',
      adapterId: latest.adapter_id,
      seriesKey: latest.series_key,
      metric: latest.metric,
    };
  }

  const staleSeconds = Math.floor((now.getTime() - new Date(best.fetched_at).getTime()) / 1000);
  let fallbackReason: string | null = null;
  if (best.period_start !== options.asOfPeriod || best.period_end < options.asOfPeriod) {
    fallbackReason = 'historical_period_substitute';
  }
  if (staleSeconds > maxStale) {
    fallbackReason = fallbackReason ? `${fallbackReason},stale` : 'stale';
  }

  return {
    found: true,
    valueNumeric: best.value_numeric,
    valueJson: parseJson(best.value_json),
    unit: best.unit,
    observationPeriodStart: best.period_start,
    observationPeriodEnd: best.period_end,
    asOf: options.asOfPeriod,
    retrievedAt: new Date(best.fetched_at).toISOString(),
    sourceUrl: best.source_url,
    sourceIdentifier: best.source_identifier,
    stalenessSeconds: staleSeconds,
    fallbackReason,
    adapterId: best.adapter_id,
    seriesKey: best.series_key,
    metric: best.metric,
  };
}

function parseJson(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function emptyResult(
  options: QueryOptions,
  reason: string | null,
): ObservationQueryResult {
  return {
    found: false,
    valueNumeric: null,
    valueJson: null,
    unit: null,
    observationPeriodStart: options.asOfPeriod,
    observationPeriodEnd: options.asOfPeriod,
    asOf: options.asOfPeriod,
    retrievedAt: null,
    sourceUrl: null,
    sourceIdentifier: null,
    stalenessSeconds: null,
    fallbackReason: reason,
    adapterId: '',
    seriesKey: options.seriesKey,
    metric: options.metric,
  };
}
