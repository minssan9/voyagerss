import crypto from 'node:crypto';
import { configService } from '../../../config/config-service';
import { DartCorpMasterAdapter } from '../adapters/dart-corp-master.adapter';
import { DartDisclosureIndexAdapter } from '../adapters/dart-disclosure-index.adapter';
import { FredCreditSpreadsAdapter } from '../adapters/fred-credit-spreads.adapter';
import { KoreaCustomsTradeAdapter } from '../adapters/korea-customs-trade.adapter';
import { TwseMonthlyRevenueAdapter } from '../adapters/twse-monthly-revenue.adapter';
import { TwseSecurityMasterAdapter } from '../adapters/twse-security-master.adapter';
import {
  companyTradeFlowAdapter,
  japanMonthlyRevenueAdapter,
  supplyChainEdgesAdapter,
} from '../adapters/unavailable-adapters';
import {
  finishIngestionRun,
  releaseLock,
  startIngestionRun,
  tryAcquireLock,
} from '../repository/primary-data-repository';
import type { AdapterRunContext, AdapterRunResult, SourceAdapter } from '../types';

export interface IngestionRunReport {
  runId: string;
  mode: 'daily' | 'backfill' | 'dry-run';
  adapterResults: AdapterRunResult[];
  startedAt: string;
  finishedAt: string;
  status: 'success' | 'partial' | 'error';
}

const LOCK_NAME = 'pd_daily_ingestion';
const LOCK_TTL_SEC = 3600;

function defaultAdapters(): SourceAdapter[] {
  return [
    new TwseMonthlyRevenueAdapter(),
    new TwseSecurityMasterAdapter(),
    new FredCreditSpreadsAdapter(),
    new KoreaCustomsTradeAdapter(),
    new DartCorpMasterAdapter(),
    new DartDisclosureIndexAdapter(),
    supplyChainEdgesAdapter,
    japanMonthlyRevenueAdapter,
    companyTradeFlowAdapter,
  ];
}

function parseAdapterFilter(): Set<string> | null {
  const raw = configService.get('PD_ADAPTERS', '') || process.env.PD_ADAPTERS || '';
  if (!raw.trim()) return null;
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export async function runPrimaryDataIngestion(options: {
  mode: 'daily' | 'backfill' | 'dry-run';
  dryRun?: boolean;
  adapters?: SourceAdapter[];
  skipLock?: boolean;
}): Promise<IngestionRunReport> {
  const runId = crypto.randomUUID();
  const startedAt = new Date();
  const dryRun = options.dryRun ?? options.mode === 'dry-run';
  const holder = `run:${runId}`;

  if (!dryRun && !options.skipLock) {
    const locked = await tryAcquireLock(LOCK_NAME, holder, LOCK_TTL_SEC);
    if (!locked) {
      throw new Error('Another primary-data ingestion run is in progress');
    }
  }

  if (!dryRun) {
    await startIngestionRun(runId, options.mode);
  }

  const filter = parseAdapterFilter();
  const adapters = (options.adapters ?? defaultAdapters()).filter(
    (a) => !filter || filter.has(a.id),
  );
  const ctx: AdapterRunContext = { dryRun, runId, now: startedAt };
  const adapterResults: AdapterRunResult[] = [];

  for (const adapter of adapters) {
    try {
      const result = await adapter.run(ctx);
      adapterResults.push(result);
    } catch (e) {
      adapterResults.push({
        adapterId: adapter.id,
        status: 'error',
        fetches: 0,
        observationsWritten: 0,
        errors: [e instanceof Error ? e.message : String(e)],
      });
    }
  }

  const finishedAt = new Date();
  const status = summarizeStatus(adapterResults);
  const report: IngestionRunReport = {
    runId,
    mode: dryRun ? 'dry-run' : options.mode,
    adapterResults,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    status,
  };

  if (!dryRun) {
    await finishIngestionRun(runId, status, report as unknown as Record<string, unknown>);
    if (!options.skipLock) {
      await releaseLock(LOCK_NAME, holder);
    }
  }

  return report;
}

function summarizeStatus(results: AdapterRunResult[]): 'success' | 'partial' | 'error' {
  const actionable = results.filter((r) => r.status !== 'skipped');
  if (actionable.length === 0) return 'partial';
  const errors = actionable.filter((r) => r.status === 'error').length;
  const partial = actionable.filter((r) => r.status === 'partial').length;
  if (errors === actionable.length) return 'error';
  if (errors > 0 || partial > 0) return 'partial';
  return 'success';
}
