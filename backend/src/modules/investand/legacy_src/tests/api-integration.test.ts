import request from 'supertest';
import app from '@/tests/app-setup'; // Test app setup

describe('API Integration Tests', () => {
  // Test Fear & Greed API endpoints
  describe('/api/fear-greed', () => {
    test('GET /api/fear-greed/latest should return latest index', async () => {
      const response = await request(app)
        .get('/api/fear-greed/latest')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('value');
      expect(response.body.data).toHaveProperty('level');
      expect(response.body.data).toHaveProperty('date');
      expect(response.body.data).toHaveProperty('components');
      
      // Validate Fear & Greed value range
      expect(response.body.data.value).toBeGreaterThanOrEqual(0);
      expect(response.body.data.value).toBeLessThanOrEqual(100);
      
      // Validate level values
      const validLevels = ['Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'];
      expect(validLevels).toContain(response.body.data.level);
    });

    test('GET /api/fear-greed/history should return history data', async () => {
      const response = await request(app)
        .get('/api/fear-greed/history?days=7')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const firstItem = response.body.data[0];
        expect(firstItem).toHaveProperty('date');
        expect(firstItem).toHaveProperty('value');
        expect(firstItem).toHaveProperty('level');
      }
    });
  });

  // Test Market Data API endpoints
  describe('/api/market', () => {
    test('GET /api/market/kospi/latest should return KOSPI data', async () => {
      const response = await request(app)
        .get('/api/market/kospi/latest')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('date');
      expect(response.body.data).toHaveProperty('change');
      expect(response.body.data).toHaveProperty('changePercent');
    });
  });

  // Test System API endpoints
  describe('/api/system', () => {
    test('GET /api/system/status should return system status', async () => {
      const response = await request(app)
        .get('/api/system/status')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('latestData');
      expect(response.body.data).toHaveProperty('recentCollections');
    });

    test('GET /api/system/collection-status should return collection status', async () => {
      const response = await request(app)
        .get('/api/system/collection-status?days=7')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // Test Health Check endpoint
  describe('/health', () => {
    test('GET /health should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  // Test error handling for invalid endpoints
  describe('Error Handling', () => {
    test('GET /api/invalid-endpoint should return 404', async () => {
      const response = await request(app)
        .get('/api/invalid-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('GET /api/fear-greed/date/invalid-date should return 400', async () => {
      const response = await request(app)
        .get('/api/fear-greed/date/invalid-date')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  // Test Admin endpoints (without authentication for basic structure validation)
  describe('/api/admin (Structure)', () => {
    test('POST /api/admin/login should require credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'MISSING_CREDENTIALS');
    });

    test('GET /api/admin/system-health should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/system-health')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });
});

// Additional integration tests for data consistency
describe('Data Consistency Tests', () => {
  test('Fear & Greed components should sum to expected range', async () => {
    const response = await request(app)
      .get('/api/fear-greed/latest')
      .expect(200);

    if (response.body.data && response.body.data.components) {
      const components = response.body.data.components;
      const componentValues = [
        components.priceMomentum,
        components.investorSentiment,
        components.putCallRatio,
        components.volatilityIndex,
        components.safeHavenDemand
      ];

      // Each component should be between 0 and 100
      componentValues.forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    }
  });

  test('Historical data should be chronologically ordered', async () => {
    const response = await request(app)
      .get('/api/fear-greed/history?days=30')
      .expect(200);

    if (response.body.data && response.body.data.length > 1) {
      const dates = response.body.data.map((item: any) => new Date(item.date));
      
      // Check if dates are in descending order (most recent first)
      for (let i = 0; i < dates.length - 1; i++) {
        expect(dates[i]).toBeInstanceOf(Date);
        expect(dates[i] >= dates[i + 1]).toBe(true);
      }
    }
  });
});