import http from 'node:http';
import { AddressInfo } from 'node:net';
import { Writable } from 'node:stream';
import type { Response } from 'express';
import { VisionConfigStore } from './vision-config.store';
import { VisionService } from './vision.service';
import { normalizeBaseUrl } from './vision.types';

describe('normalizeBaseUrl', () => {
  it('strips a trailing slash and keeps http urls', () => {
    expect(normalizeBaseUrl('http://127.0.0.1:8080/')).toBe('http://127.0.0.1:8080');
  });

  it('rejects non-http schemes', () => {
    expect(() => normalizeBaseUrl('ftp://example.com')).toThrow('http 또는 https');
  });
});

describe('VisionConfigStore', () => {
  it('updates one endpoint and keeps the other', () => {
    const store = new VisionConfigStore();
    const before = store.get();
    const next = store.update({ judgeBaseUrl: 'http://10.0.0.8:8000' });
    expect(next.judgeBaseUrl).toBe('http://10.0.0.8:8000');
    expect(next.camBaseUrl).toBe(before.camBaseUrl);
  });
});

describe('VisionService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function serviceWith(cam = 'http://cam.test', judge = 'http://judge.test') {
    const store = new VisionConfigStore();
    store.update({ camBaseUrl: cam, judgeBaseUrl: judge });
    return new VisionService(store);
  }

  it('returns cam status from the upstream body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ fps: 12.5, results: [] }),
    }) as unknown as typeof fetch;

    const result = await serviceWith().getCamStatus();
    expect(result.result).toBe('SUCCESS');
    expect(result.data).toEqual({ fps: 12.5, results: [] });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://cam.test/status',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns a connection error when the upstream is down', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED')) as unknown as typeof fetch;
    const result = await serviceWith().getJudgeHealth();
    expect(result).toEqual({
      result: 'ERROR',
      message: '연결에 실패했습니다: connect ECONNREFUSED',
      data: null,
    });
  });

  it('surfaces upstream validation detail', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ detail: 'choices must contain at least 2 items, comma-separated' }),
    }) as unknown as typeof fetch;

    const image = { buffer: Buffer.from('img'), mimetype: 'image/png', originalname: 'a.png' };
    const result = await serviceWith().judgeChoice(image, 'what?', 'only-one');
    expect(result.result).toBe('ERROR');
    expect(result.message).toBe('choices must contain at least 2 items, comma-separated');
  });

  it('rejects a judge call without an image', async () => {
    const result = await serviceWith().judgeBool(undefined, 'is it a cat?');
    expect(result.message).toBe('이미지가 필요합니다.');
  });

  it('rejects unsafe image filenames before calling upstream', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const result = await serviceWith().getJudgeImage('../secret.png');
    expect(result.ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('pipes mjpeg bytes from the camera upstream', async () => {
    const server = http.createServer((req, incomingRes) => {
      if (req.url === '/stream.mjpg') {
        incomingRes.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=frame' });
        incomingRes.end('frame-bytes');
        return;
      }
      incomingRes.writeHead(404);
      incomingRes.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;

    const chunks: Buffer[] = [];
    const headers: Record<string, string> = {};
    let jsonBody: unknown;
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    const res = Object.assign(sink, {
      headersSent: false,
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      status(_code: number) {
        return res;
      },
      json(payload: unknown) {
        jsonBody = payload;
        return res;
      },
    }) as unknown as Response;

    serviceWith(`http://127.0.0.1:${port}`).pipeCamStream(res);
    await new Promise<void>((resolve, reject) => {
      sink.on('finish', () => resolve());
      sink.on('error', reject);
    });
    server.close();

    expect(jsonBody).toBeUndefined();
    expect(headers['content-type']).toContain('multipart/x-mixed-replace');
    expect(Buffer.concat(chunks).toString()).toBe('frame-bytes');
  });
});
