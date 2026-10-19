import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';

export const MAX_FRAME_BYTES = 2 * 1024 * 1024;
const STALE_MS = 3000;

/** edge 가 올린 최신 오버레이 JPEG 을 들고 있다가 MJPEG 으로 여러 브라우저에 나눠 보낸다. */
@Injectable()
export class AirspaceCamera {
  private jpeg: Buffer | null = null;
  private receivedAt = 0;
  private viewers = new Set<Response>();
  now: () => number = Date.now;

  push(jpeg: Buffer): void {
    this.jpeg = jpeg;
    this.receivedAt = this.now();
    const part = Buffer.concat([
      Buffer.from(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${jpeg.length}\r\n\r\n`),
      jpeg,
      Buffer.from('\r\n'),
    ]);
    for (const res of this.viewers) {
      // 느린 브라우저는 이번 프레임을 건너뛴다 (버퍼가 쌓이지 않게).
      if (!res.writableNeedDrain) res.write(part);
    }
  }

  latest(): Buffer | null {
    return this.live() ? this.jpeg : null;
  }

  live(): boolean {
    return this.jpeg !== null && this.now() - this.receivedAt <= STALE_MS;
  }

  stream(req: Request, res: Response): void {
    res.status(200);
    res.setHeader('Content-Type', 'multipart/x-mixed-replace; boundary=frame');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    this.viewers.add(res);
    const current = this.latest();
    if (current) {
      res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${current.length}\r\n\r\n`);
      res.write(current);
      res.write('\r\n');
    }
    req.on('close', () => this.viewers.delete(res));
  }

  viewerCount(): number {
    return this.viewers.size;
  }
}

/** express 의 json 파서가 건드리지 않는 image/jpeg 본문을 상한까지 읽는다. */
export function readRawBody(req: Request, limit = MAX_FRAME_BYTES): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        resolve(null);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
