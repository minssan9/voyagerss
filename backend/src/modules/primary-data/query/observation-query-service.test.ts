import type { StoredObservationRow } from '../repository/primary-data-repository';
import { selectObservationForAsOf } from './observation-query-service';

function row(period: string, fetchedAt: string, value: number): StoredObservationRow {
  return {
    period_start: period,
    period_end: period,
    fetched_at: new Date(fetchedAt),
    value_numeric: value,
    value_json: null,
    unit: 'TWD_thousands',
    source_identifier: `id:${period}`,
    source_url: 'https://example.com',
    adapter_id: 'twse_monthly_revenue',
    series_key: 'twse:revenue:2330',
    metric: 'revenue_current_month_ntk',
  };
}

describe('selectObservationForAsOf', () => {
  it('picks exact period when present', () => {
    const candidates = [row('2026-04', '2026-05-01', 100), row('2026-05', '2026-06-01', 110)];
    const best = selectObservationForAsOf(candidates, '2026-05');
    expect(best?.period_start).toBe('2026-05');
  });

  it('falls back to earlier period without lookahead', () => {
    const candidates = [row('2026-03', '2026-04-01', 90), row('2026-05', '2026-06-01', 110)];
    const best = selectObservationForAsOf(candidates, '2026-04');
    expect(best?.period_start).toBe('2026-03');
    const future = selectObservationForAsOf(candidates, '2026-02');
    expect(future).toBeNull();
  });
});
