import { mapFredObservationsForTest } from './fred-credit-spreads.adapter';

describe('mapFredObservations', () => {
  it('skips missing and dot values', () => {
    const payload = {
      observations: [
        { date: '2026-01-01', value: '1.23' },
        { date: '2026-01-02', value: '.' },
        { date: '2026-01-03', value: '2.5' },
      ],
    };
    const rows = mapFredObservationsForTest(payload, 'BAA10Y');
    expect(rows).toHaveLength(2);
    expect(rows[0].periodStart).toBe('2026-01-01');
    expect(rows[0].valueNumeric).toBe(1.23);
    expect(rows[0].seriesKey).toBe('fred:BAA10Y');
  });
});
