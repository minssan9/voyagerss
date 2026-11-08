import crypto from 'node:crypto';

export interface HttpRequestOptions {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryableStatuses?: number[];
}

export interface HttpResponsePayload {
  status: number;
  body: string;
  headers: Record<string, string>;
}

const DEFAULT_RETRYABLE = [408, 429, 500, 502, 503, 504];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function checksumBody(body: string): string {
  return crypto.createHash('sha256').update(body, 'utf8').digest('hex');
}

export async function resilientFetch(
  options: HttpRequestOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<HttpResponsePayload> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const maxRetries = options.maxRetries ?? 3;
  const retryable = new Set(options.retryableStatuses ?? DEFAULT_RETRYABLE);
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(options.url, {
        method: options.method ?? 'GET',
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const body = await response.text();
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      if (!response.ok && retryable.has(response.status) && attempt < maxRetries) {
        const backoff = Math.min(30_000, 1000 * 2 ** attempt);
        await sleep(backoff);
        continue;
      }

      return { status: response.status, body, headers };
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries) {
        const backoff = Math.min(30_000, 1000 * 2 ** attempt);
        await sleep(backoff);
        continue;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
