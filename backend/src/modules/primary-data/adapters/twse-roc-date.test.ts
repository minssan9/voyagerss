import { rocYmToIsoYm } from './twse-roc-date';

describe('rocYmToIsoYm', () => {
  it('converts ROC year-month to ISO', () => {
    expect(rocYmToIsoYm('11506')).toBe('2026-06');
    expect(rocYmToIsoYm('11401')).toBe('2025-01');
  });
});
