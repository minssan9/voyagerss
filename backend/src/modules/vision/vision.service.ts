import { Injectable } from '@nestjs/common';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import type { Response } from 'express';
import { VisionConfigStore } from './vision-config.store';
import {
  ApiEnvelope,
  failure,
  isSafeImageFilename,
  messageFromUpstream,
  success,
  UploadedImage,
} from './vision.types';

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
      return Promise.resolve(failure('기록 id가 올바르지 않습니다.'));
    }
    return this.requestJson(this.config.get().judgeBaseUrl, `/api/records/${id}`);
  }

  judgeBool(image: UploadedImage | undefined, question: string): Promise<ApiEnvelope<unknown>> {
    const form = this.buildJudgeForm(image, question);
    if (!form.ok) {
      return Promise.resolve(failure(form.message));
    }
    return this.requestJson(this.config.get().judgeBaseUrl, '/judge/bool', { method: 'POST', body: form.data }, 180000);
  }

  judgeChoice(
    image: UploadedImage | undefined,
    question: string,
    choices: string,
  ): Promise<ApiEnvelope<unknown>> {
    const form = this.buildJudgeForm(image, question);
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
      return { ok: false, message: '이미지 파일명이 올바르지 않습니다.' };
    }
    const url = `${this.config.get().judgeBaseUrl}/images/${encodeURIComponent(filename)}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        return { ok: false, message: `업스트림 응답 오류 (${response.status})` };
      }
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const body = Buffer.from(await response.arrayBuffer());
      return { ok: true, contentType, body };
    } catch (error) {
      return { ok: false, message: `연결에 실패했습니다: ${errorText(error)}` };
    }
  }

  pipeCamStream(res: Response): void {
    this.pipeGet(`${this.config.get().camBaseUrl}/stream.mjpg`, res);
  }

  private buildJudgeForm(
    image: UploadedImage | undefined,
    question: string,
  ): { ok: true; data: FormData } | { ok: false; message: string } {
    if (!image || !image.buffer || image.buffer.length === 0) {
      return { ok: false, message: '이미지가 필요합니다.' };
    }
    const form = new FormData();
    const blob = new Blob([new Uint8Array(image.buffer)], {
      type: image.mimetype || 'application/octet-stream',
    });
    form.append('image', blob, image.originalname || 'image');
    form.append('question', question ?? '');
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
      return failure(`연결에 실패했습니다: ${errorText(error)}`);
    }
  }

  private pipeGet(targetUrl: string, res: Response): void {
    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      res.status(200).json(failure('잘못된 업스트림 주소입니다.'));
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
            res.status(200).json(failure(`업스트림 응답 오류 (${status})`));
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
        res.status(200).json(failure(`연결에 실패했습니다: ${error.message}`));
      } else {
        res.end();
      }
    });
    res.on('close', () => req.destroy());
    req.end();
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
