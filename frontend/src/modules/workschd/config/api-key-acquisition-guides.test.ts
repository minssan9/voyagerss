import { describe, expect, it } from 'vitest';
import { API_KEY_ACQUISITION_GUIDES } from './api-key-acquisition-guides';

const SECRET_LIKE = /(api_key=|crtfc_key=|serviceKey=)[a-zA-Z0-9]{8,}/i;

describe('API_KEY_ACQUISITION_GUIDES', () => {
  it('defines guides for all primary-data API keys without embedding secrets', () => {
    for (const key of ['DART_API_KEY', 'FRED_API_KEY', 'DATA_GO_KR_SERVICE_KEY'] as const) {
      const guide = API_KEY_ACQUISITION_GUIDES[key];
      expect(guide).toBeDefined();
      expect(guide.steps.length).toBeGreaterThan(0);
      expect(guide.links.length).toBeGreaterThan(0);
      const blob = JSON.stringify(guide);
      expect(blob).not.toMatch(SECRET_LIKE);
    }
  });

  it('uses full visible https URLs as link labels', () => {
    for (const guide of Object.values(API_KEY_ACQUISITION_GUIDES)) {
      for (const link of guide.links) {
        expect(link.href).toMatch(/^https:\/\//);
        expect(link.label).toBe(link.href);
      }
    }
  });
});
