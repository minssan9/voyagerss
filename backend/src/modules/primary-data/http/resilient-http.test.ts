import { resilientFetch } from './resilient-http';

describe('resilientFetch', () => {
  it('retries retryable status then succeeds', async () => {
    let calls = 0;
    const fetchMock = jest.fn(async () => {
      calls += 1;
      if (calls < 2) {
        return new Response('err', { status: 503 });
      }
      return new Response('ok', { status: 200 });
    });
    const res = await resilientFetch({ url: 'http://test.local', maxRetries: 2 }, fetchMock as typeof fetch);
    expect(res.status).toBe(200);
    expect(calls).toBe(2);
  });

  it('does not retry 401', async () => {
    const fetchMock = jest.fn(async () => new Response('unauth', { status: 401 }));
    const res = await resilientFetch({ url: 'http://test.local', maxRetries: 3 }, fetchMock as typeof fetch);
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
