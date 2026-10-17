import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { AirspaceMessage, AirspaceStore } from './airspace.store';
import { parseSnapshot, success } from './airspace.types';
import { tApi } from '../common/i18n-locale';

const HEARTBEAT_MS = 15000;

export function ingestAllowed(token: string | undefined, expected: string | undefined, production: boolean): boolean {
  if (!expected) {
    return !production;
  }
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * 공역 감시(관측·경보) 데이터 중계. vision_cam.airspace 가 ingest 로 스냅샷을 밀어 넣고,
 * 화면은 stream(SSE)으로 받는다.
 */
@Controller('airspace')
export class AirspaceController {
  constructor(private readonly store: AirspaceStore) {}

  @Post('ingest')
  @HttpCode(200)
  ingest(@Headers('x-airspace-token') token: string | undefined, @Body() body: unknown) {
    if (!ingestAllowed(token, process.env.AIRSPACE_INGEST_TOKEN, process.env.NODE_ENV === 'production')) {
      throw new UnauthorizedException(tApi('airspace.unauthorized'));
    }
    const snapshot = parseSnapshot(body);
    if (!snapshot) {
      throw new BadRequestException(tApi('airspace.invalidPayload'));
    }
    const events = this.store.ingest(snapshot);
    return success({ events: events.length });
  }

  @Get('status')
  status() {
    return success(this.store.status());
  }

  @Get('events')
  events(@Query('limit') limit?: string) {
    return success(this.store.recentEvents(limit === undefined ? 100 : Number(limit)));
  }

  @Get('stream')
  stream(@Req() req: Request, @Res() res: Response) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (msg: AirspaceMessage) => {
      res.write(`event: ${msg.kind}\ndata: ${JSON.stringify(msg.data)}\n\n`);
    };
    const { snapshot } = this.store.status();
    if (snapshot) send({ kind: 'snapshot', data: snapshot });

    const unsubscribe = this.store.subscribe(send);
    const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  }
}
