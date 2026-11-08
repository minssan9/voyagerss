import { checksumBody, resilientFetch } from '../http/resilient-http';
import type { AdapterRunContext, ObservationUpsert, RawFetchRecord } from '../types';
import { insertSourceFetch, upsertObservations } from '../repository/primary-data-repository';

export async function persistFetchAndObservations(
  ctx: AdapterRunContext,
  fetch: RawFetchRecord,
  observations: ObservationUpsert[],
): Promise<{ fetchId: number; written: number }> {
  if (ctx.dryRun) {
    return { fetchId: 0, written: observations.length };
  }
  const fetchId = await insertSourceFetch(fetch);
  const written = await upsertObservations(fetchId, observations);
  return { fetchId, written };
}

export async function httpGetJson(
  url: string,
  fetchImpl?: typeof fetch,
): Promise<{ status: number; body: string; parsed: unknown }> {
  const res = await resilientFetch({ url }, fetchImpl);
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(res.body);
  } catch {
    parsed = null;
  }
  return { status: res.status, body: res.body, parsed };
}

export function buildFetchRecord(
  adapterId: string,
  fingerprint: string,
  sourceUrl: string,
  status: number,
  body: string,
  timezone: string,
  periodStart: string | null,
  periodEnd: string | null,
  errorCode: string | null,
  errorMessage: string | null,
): RawFetchRecord {
  return {
    adapterId,
    requestFingerprint: fingerprint,
    sourceUrl,
    httpStatus: status,
    rawBody: body,
    rawChecksum: checksumBody(body),
    fetchedAt: new Date(),
    retrievalTimezone: timezone,
    observationPeriodStart: periodStart,
    observationPeriodEnd: periodEnd,
    errorCode,
    errorMessage,
  };
}
