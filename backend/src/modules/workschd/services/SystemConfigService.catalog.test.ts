import { SystemConfigService } from './SystemConfigService';

describe('SystemConfigService catalog', () => {
  const svc = new SystemConfigService();

  it('returns finance and primary_data keys for ingestion admin', () => {
    const items = svc.getCatalog(['finance', 'primary_data']);
    const keys = new Set(items.map((i) => i.key));
    expect(keys.has('DART_API_KEY')).toBe(true);
    expect(keys.has('FRED_API_KEY')).toBe(true);
    expect(keys.has('DATA_GO_KR_SERVICE_KEY')).toBe(true);
    expect(keys.has('PD_INGESTION_ENABLED')).toBe(true);
    expect(items.find((i) => i.key === 'DART_API_KEY')?.isSecret).toBe(true);
  });
});
