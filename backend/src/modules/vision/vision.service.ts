import { Injectable } from '@nestjs/common';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import type { Response } from 'express';
import { VisionConfigStore } from './vision-config.store';
import {
  ApiEnvelope,
  CamJudgeInput,
  extractJpegFrame,
  failure,
  isSafeImageFilename,
  messageFromUpstream,
  saveFlag,
  success,
  UploadedImage,
} from './vision.types';
import { tApi } from '../common/i18n-locale';

@Injectable()
export class VisionService {
  constructor(private readonly config: VisionConfigStore) {}

  getCamStatus(): Promise<ApiEnvelope<unknown>> {
    return this.requestJson(this.config.get().camBaseUrl, '/status', {}, 5000);
  }

  getJudgeHealth(): Promise<ApiEnvelope<unknown>> {
    return this.requestJson(this.config.get().judgeBaseUrl, '/health', {}, 5000);
  }

  listJudgeRecords(limit = 50): Promise<ApiEnvelope<unknown>> {
    const safeLimit = Number.isFinite(limit) ? Math.min(200, Math.max(1, Math.trunc(limit))) : 50;
    return this.requestJson(this.config.get().judgeBaseUrl, `/api/records?limit=${safeLimit}`);
  }

  getJudgeRecord(id: string): Promise<ApiEnvelope<unknown>> {
    if (!/^\d+$/.test(id)) {
      return Promise.resolve(failure(tApi('vision.invalidRecordId')));
    }
    return this.requestJson(this.config.get().judgeBaseUrl, `/api/records/${id}`);
  }

  judgeBool(image: UploadedImage | undefined, question: string, save?: unknown): Promise<ApiEnvelope<unknown>> {
    const form = this.buildJudgeForm(image, question, save);
    if (!form.ok) {
      return Promise.resolve(failure(form.message));
    }
    return this.requestJson(this.config.get().judgeBaseUrl, '/judge/bool', { method: 'POST', body: form.data }, 180000);
  }

  judgeChoice(
    image: UploadedImage | undefined,
    question: string,
    choices: string,
    save?: unknown,
  ): Promise<ApiEnvelope<unknown>> {
    const form = this.buildJudgeForm(image, question, save);
    if (!form.ok) {
      return Promise.resolve(failure(form.message));
    }
    form.data.append('choices', choices ?? '');
    return this.requestJson(
      this.config.get().judgeBaseUrl,
      '/judge/choice',
      { method: 'POST', body: form.data },
      180000,
    );
  }

  async getJudgeImage(filename: string): Promise<
    | { ok: true; contentType: string; body: Buffer }
    | { ok: false; message: string }
  > {
    if (!isSafeImageFilename(filename)) {
      return { ok: false, message: tApi('vision.invalidImageName') };
    }
    const url = `${this.config.get().judgeBaseUrl}/images/${encodeURIComponent(filename)}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        return { ok: false, message: tApi('vision.upstream', { status: response.status }) };
      }
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const body = Buffer.from(await response.arrayBuffer());
      return { ok: true, contentType, body };
    } catch (error) {
      return { ok: false, message: tApi('vision.connectFailed', { detail: errorText(error) }) };
    }
  }

  pipeCamStream(res: Response): void {
    this.pipeGet(`${this.config.get().camBaseUrl}/stream.mjpg`, res);
  }

  /** Grabs a single JPEG frame from the vision_cam MJPEG stream. */
  grabCamFrame(timeoutMs = 5000): Promise<
    | { ok: true; contentType: string; body: Buffer }
    | { ok: false; message: string }
  > {
    const targetUrl = `${this.config.get().camBaseUrl}/stream.mjpg`;
    return new Promise((resolve) => {
      let parsed: URL;
      try {
        parsed = new URL(targetUrl);
      } catch {
        resolve({ ok: false, message: tApi('vision.badUpstream') });
        return;
      }
      let settled = false;
      const finish = (
        result: { ok: true; contentType: string; body: Buffer } | { ok: false; message: string },
      ) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        req.destroy();
        resolve(result);
      };
      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.request(
        {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port,
          path: `${parsed.pathname}${parsed.search}`,
          method: 'GET',
        },
        (upstream) => {
          const status = upstream.statusCode ?? 500;
          if (status >= 400) {
            upstream.resume();
            finish({ ok: false, message: tApi('vision.upstream', { status }) });
            return;
          }
          let buffered = Buffer.alloc(0);
          upstream.on('data', (chunk: Buffer) => {
            buffered = Buffer.concat([buffered, chunk]);
            const frame = extractJpegFrame(buffered);
            if (frame) {
              finish({ ok: true, contentType: 'image/jpeg', body: Buffer.from(frame) });
            } else if (buffered.length > MAX_FRAME_BYTES) {
              finish({ ok: false, message: tApi('vision.frameNotFound') });
            }
          });
          upstream.on('end', () => finish({ ok: false, message: tApi('vision.frameNotFound') }));
          upstream.on('error', (error) => finish({ ok: false, message: tApi('vision.connectFailed', { detail: error.message }) }));
        },
      );
      const timer = setTimeout(() => finish({ ok: false, message: tApi('vision.frameTimeout') }), timeoutMs);
      req.on('error', (error) => finish({ ok: false, message: tApi('vision.connectFailed', { detail: error.message }) }));
      req.end();
    });
  }

  /** Server-side realtime path: grab the latest cam frame and judge it in one call. */
  async judgeCamFrame(input: CamJudgeInput): Promise<ApiEnvelope<unknown>> {
    const mode = input.mode === 'choice' ? 'choice' : 'bool';
    const frame = await this.grabCamFrame();
    if (!frame.ok) {
      return failure(frame.message);
    }
    const image: UploadedImage = { buffer: frame.body, mimetype: frame.contentType, originalname: 'cam-frame.jpg' };
    const question = input.question ?? '';
    // Live cam frames are not persisted unless the caller opts in.
    const save = input.save ?? false;
    return mode === 'choice'
      ? this.judgeChoice(image, question, input.choices ?? '', save)
      : this.judgeBool(image, question, save);
  }

  private buildJudgeForm(
    image: UploadedImage | undefined,
    question: string,
    save?: unknown,
  ): { ok: true; data: FormData } | { ok: false; message: string } {
    if (!image || !image.buffer || image.buffer.length === 0) {
      return { ok: false, message: tApi('vision.imageRequired') };
    }
    const form = new FormData();
    const blob = new Blob([new Uint8Array(image.buffer)], {
      type: image.mimetype || 'application/octet-stream',
    });
    form.append('image', blob, image.originalname || 'image');
    form.append('question', question ?? '');
    form.append('save', saveFlag(save));
    return { ok: true, data: form };
  }

  private async requestJson(
    baseUrl: string,
    path: string,
    init: RequestInit = {},
    timeoutMs = 10000,
  ): Promise<ApiEnvelope<unknown>> {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await response.text();
      let body: unknown = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
      if (!response.ok) {
        return failure(messageFromUpstream(response.status, body));
      }
      return success(body);
    } catch (error) {
      return failure(tApi('vision.connectFailed', { detail: errorText(error) }));
    }
  }

  private pipeGet(targetUrl: string, res: Response): void {
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      res.status(200).json(failure(tApi('vision.badUpstream')));
      return;
    }
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
      },
      (upstream) => {
        const status = upstream.statusCode ?? 500;
        if (status >= 400) {
          upstream.resume();
          if (!res.headersSent) {
            res.status(200).json(failure(tApi('vision.upstream', { status })));
          }
          return;
        }
        const contentType = upstream.headers['content-type'];
        if (contentType) {
          res.setHeader('Content-Type', Array.isArray(contentType) ? contentType[0] : contentType);
        }
        res.setHeader('Cache-Control', 'no-cache, no-store');
        upstream.pipe(res);
      },
    );
    req.on('error', (error) => {
      if (!res.headersSent) {
        res.status(200).json(failure(tApi('vision.connectFailed', { detail: error.message })));
      } else {
        res.end();
      }
    });
    res.on('close', () => req.destroy());
    req.end();
  }
}

const MAX_FRAME_BYTES = 8 * 1024 * 1024;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
