export type AdapterAvailability =
  | 'active'
  | 'needs_credentials'
  | 'not_publicly_available'
  | 'partial_coverage';

export type PeriodType = 'day' | 'month' | 'quarter' | 'snapshot';

export interface DatasetCapability {
  adapterId: string;
  category: string;
  granularity: string;
  nativeFrequency: PeriodType | 'mixed';
  historyLimit: string;
  auth: string;
  licenseNotes: string;
  officialDocsUrl: string;
  availability: AdapterAvailability;
  liveVerified: boolean;
}

export interface RawFetchRecord {
  adapterId: string;
  requestFingerprint: string;
  sourceUrl: string;
  httpStatus: number | null;
  rawBody: string | null;
  rawChecksum: string;
  fetchedAt: Date;
  retrievalTimezone: string;
  observationPeriodStart: string | null;
  observationPeriodEnd: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface ObservationUpsert {
  adapterId: string;
  seriesKey: string;
  entityId: string | null;
  entityName: string | null;
  metric: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
  valueNumeric: number | null;
  valueJson: Record<string, unknown> | null;
  unit: string | null;
  sourceIdentifier: string | null;
  revisionTag: string | null;
}

export interface AdapterRunContext {
  dryRun: boolean;
  runId: string;
  now: Date;
}

export interface AdapterRunResult {
  adapterId: string;
  status: 'success' | 'partial' | 'skipped' | 'error';
  fetches: number;
  observationsWritten: number;
  errors: string[];
  unavailableReason?: string;
}

export interface SourceAdapter {
  readonly id: string;
  isConfigured(): boolean;
  run(ctx: AdapterRunContext): Promise<AdapterRunResult>;
}

export interface ObservationQueryResult {
  found: boolean;
  valueNumeric: number | null;
  valueJson: Record<string, unknown> | null;
  unit: string | null;
  observationPeriodStart: string;
  observationPeriodEnd: string;
  asOf: string;
  retrievedAt: string | null;
  sourceUrl: string | null;
  sourceIdentifier: string | null;
  stalenessSeconds: number | null;
  fallbackReason: string | null;
  adapterId: string;
  seriesKey: string;
  metric: string;
}
