import { configService } from '../../../config/config-service';
import { loadCheckpoint, saveCheckpoint } from '../repository/primary-data-repository';
import type { AdapterRunContext, AdapterRunResult, ObservationUpsert, SourceAdapter } from '../types';
import { buildFetchRecord, persistFetchAndObservations } from './adapter-utils';
import { checksumBody, resilientFetch as rf } from '../http/resilient-http';

const BASE =
  'https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList';

interface TradeUniverseItem {
  hsSgn: string;
  cntyCd: string;
}

function parseUniverse(): TradeUniverseItem[] {
  const raw = configService.get('PD_KOREA_TRADE_UNIVERSE_JSON', '') || '';
  if (!raw.trim()) {
    return [
      { hsSgn: '8542', cntyCd: 'US' },
      { hsSgn: '8471', cntyCd: 'CN' },
    ];
  }
  try {
    const parsed = JSON.parse(raw) as TradeUniverseItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

function monthRangeBack(count: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - (count - 1));
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end) };
}

export class KoreaCustomsTradeAdapter implements SourceAdapter {
  readonly id = 'korea_customs_hs_trade';

  isConfigured(): boolean {
    const key =
      configService.get('DATA_GO_KR_SERVICE_KEY', '') ||
      process.env.DATA_GO_KR_SERVICE_KEY ||
      '';
    return key.length > 0;
  }

  async run(ctx: AdapterRunContext): Promise<AdapterRunResult> {
    const serviceKey =
      configService.get('DATA_GO_KR_SERVICE_KEY', '') ||
      process.env.DATA_GO_KR_SERVICE_KEY ||
      '';
    if (!serviceKey) {
      return {
        adapterId: this.id,
        status: 'skipped',
        fetches: 0,
        observationsWritten: 0,
        errors: [],
        unavailableReason: 'DATA_GO_KR_SERVICE_KEY not configured',
      };
    }

    const universe = parseUniverse();
    if (universe.length === 0) {
      return {
        adapterId: this.id,
        status: 'skipped',
        fetches: 0,
        observationsWritten: 0,
        errors: ['Empty PD_KOREA_TRADE_UNIVERSE_JSON'],
      };
    }

    const monthsBack = Number(configService.get('PD_KOREA_TRADE_MONTHS_BACK', '3')) || 3;
    const { start, end } = monthRangeBack(monthsBack);
    const checkpoint = (await loadCheckpoint(this.id, 'default')) ?? {};
    const errors: string[] = [];
    let fetches = 0;
    let observationsWritten = 0;

    for (const item of universe) {
      const url =
        `${BASE}?serviceKey=${encodeURIComponent(serviceKey)}` +
        `&strtYymm=${start}&endYymm=${end}&hsSgn=${encodeURIComponent(item.hsSgn)}` +
        `&cntyCd=${encodeURIComponent(item.cntyCd)}&numOfRows=100&pageNo=1&type=json`;
      const fingerprint = `customs:${item.hsSgn}:${item.cntyCd}:${start}-${end}`;
      try {
        const res = await rf({ url, timeoutMs: 45_000 });
        fetches += 1;
        const body = res.body;
        const observations = mapCustomsJson(body, item, start, end);
        const fetch = buildFetchRecord(
          this.id,
          fingerprint,
          BASE,
          res.status,
          body,
          'Asia/Seoul',
          start,
          end,
          res.status !== 200 ? 'http_error' : null,
          res.status !== 200 ? `status=${res.status}` : null,
        );
        const { written } = await persistFetchAndObservations(ctx, fetch, observations);
        observationsWritten += written;
      } catch (e) {
        errors.push(`${item.hsSgn}/${item.cntyCd}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (!ctx.dryRun) {
      await saveCheckpoint(this.id, 'default', {
        ...checkpoint,
        lastRunAt: new Date().toISOString(),
        window: { start, end },
        universeSize: universe.length,
      });
    }

    return {
      adapterId: this.id,
      status: errors.length === 0 ? 'success' : errors.length < universe.length ? 'partial' : 'error',
      fetches,
      observationsWritten,
      errors,
    };
  }
}

function mapCustomsJson(
  body: string,
  item: TradeUniverseItem,
  start: string,
  end: string,
): ObservationUpsert[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }
  const root = parsed as {
    response?: { body?: { items?: { item?: unknown } } };
  };
  const rawItems = root.response?.body?.items?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  const rows: ObservationUpsert[] = [];
  for (const it of items as Array<Record<string, string>>) {
    const ym = String(it.year ?? it.statYm ?? it.yyyymm ?? '');
    const period = ym.length === 6 ? `${ym.slice(0, 4)}-${ym.slice(4, 6)}` : ym;
    const exp = Number(it.expDlr ?? it.expUsd ?? 0);
    const imp = Number(it.impDlr ?? it.impUsd ?? 0);
    if (period) {
      if (!Number.isNaN(exp)) {
        rows.push(observation(item, period, 'export_usd', exp, it));
      }
      if (!Number.isNaN(imp)) {
        rows.push(observation(item, period, 'import_usd', imp, it));
      }
    }
  }
  if (rows.length === 0 && body.length > 0) {
    rows.push({
      adapterId: 'korea_customs_hs_trade',
      seriesKey: `customs:hs:${item.hsSgn}:cnty:${item.cntyCd}`,
      entityId: item.cntyCd,
      entityName: null,
      metric: 'raw_response_unparsed',
      periodType: 'month',
      periodStart: `${start.slice(0, 4)}-${start.slice(4, 6)}`,
      periodEnd: `${end.slice(0, 4)}-${end.slice(4, 6)}`,
      valueNumeric: null,
      valueJson: { note: 'Response shape did not match expected item list', checksum: checksumBody(body) },
      unit: null,
      sourceIdentifier: `data.go.kr:1220000:${item.hsSgn}:${item.cntyCd}`,
      revisionTag: null,
    });
  }
  return rows;
}

function observation(
  item: TradeUniverseItem,
  period: string,
  metric: string,
  value: number,
  it: Record<string, string>,
): ObservationUpsert {
  return {
    adapterId: 'korea_customs_hs_trade',
    seriesKey: `customs:hs:${item.hsSgn}:cnty:${item.cntyCd}`,
    entityId: item.cntyCd,
    entityName: it.statKor ?? it.statCdCntnKor1 ?? null,
    metric,
    periodType: 'month',
    periodStart: period,
    periodEnd: period,
    valueNumeric: value,
    valueJson: it,
    unit: 'USD',
    sourceIdentifier: `data.go.kr:1220000:${item.hsSgn}:${item.cntyCd}:${period}:${metric}`,
    revisionTag: null,
  };
}
