import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { AirspaceCamera, readRawBody } from './airspace-camera';
import { AirspaceHistoryService, HistoryQuery } from './airspace-history.service';
import { AirspaceMessage, AirspaceStore } from './airspace.store';
import { isThreatLevel, parseCommand, parseSnapshot, success } from './airspace.types';
import { JwtAuthGuard } from '../workschd/guards/jwt-auth.guard';
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

function parseDate(v: string | undefined): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(tApi('airspace.invalidQuery'));
  return d;
}

function historyQuery(q: Record<string, string | undefined>): HistoryQuery {
  if (q.threat !== undefined && !isThreatLevel(q.threat)) throw new BadRequestException(tApi('airspace.invalidQuery'));
  return {
    from: parseDate(q.from),
    to: parseDate(q.to),
    threat: q.threat as HistoryQuery['threat'],
    limit: q.limit === undefined ? 100 : Number(q.limit),
    offset: q.offset === undefined ? 0 : Number(q.offset),
  };
}

/**
 * 공역 감시(관측·경보) 데이터 중계. airspace_edge 가 ingest·frame 으로 밀어 넣고,
 * 화면은 stream(SSE)·camera/stream(MJPEG)으로 받는다. 짐벌 명령은 로그인한 사용자만 낸다.
 */
@Controller('airspace')
export class AirspaceController {
  constructor(
    private readonly store: AirspaceStore,
    private readonly camera: AirspaceCamera,
    private readonly history: AirspaceHistoryService,
  ) {}

  private checkEdgeToken(token: string | undefined) {
    if (!ingestAllowed(token, process.env.AIRSPACE_INGEST_TOKEN, process.env.NODE_ENV === 'production')) {
      throw new UnauthorizedException(tApi('airspace.unauthorized'));
    }
  }

  @Post('ingest')
  @HttpCode(200)
  ingest(@Headers('x-airspace-token') token: string | undefined, @Body() body: unknown) {
    this.checkEdgeToken(token);
    const snapshot = parseSnapshot(body);
    if (!snapshot) {
      throw new BadRequestException(tApi('airspace.invalidPayload'));
    }
    const { events, command } = this.store.ingest(snapshot);
    void this.history.record(snapshot, events);
    return success({ events: events.length, command });
  }

  @Post('frame')
  @HttpCode(204)
  async frame(@Headers('x-airspace-token') token: string | undefined, @Req() req: Request) {
    this.checkEdgeToken(token);
    if (!String(req.headers['content-type'] ?? '').startsWith('image/jpeg')) {
      throw new BadRequestException(tApi('airspace.invalidPayload'));
    }
    const jpeg = await readRawBody(req);
    if (!jpeg) throw new PayloadTooLargeException(tApi('airspace.frameTooLarge'));
    if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8) {
      throw new BadRequestException(tApi('airspace.invalidPayload'));
    }
    this.camera.push(jpeg);
  }

  @Post('gimbal')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  gimbal(@Body() body: unknown) {
    const command = parseCommand(body);
    if (!command) {
      throw new BadRequestException(tApi('airspace.invalidCommand'));
    }
    return success(this.store.queueCommand(command), tApi('airspace.commandQueued'));
  }

  @Get('status')
  status() {
    return success({ ...this.store.status(), cameraLive: this.camera.live(), history: this.history.enabled });
  }

  @Get('events')
  events(@Query('limit') limit?: string) {
    return success(this.store.recentEvents(limit === undefined ? 100 : Number(limit)));
  }

  @Get('history/events')
  async historyEvents(@Query() q: Record<string, string | undefined>) {
    return success(await this.history.events(historyQuery(q)));
  }

  @Get('history/tracks')
  async historyTracks(@Query() q: Record<string, string | undefined>) {
    return success(await this.history.tracks(historyQuery(q)));
  }

  @Get('camera/latest.jpg')
  latestFrame(@Res() res: Response) {
    const jpeg = this.camera.latest();
    if (!jpeg) throw new NotFoundException(tApi('airspace.noFrame'));
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.end(jpeg);
  }

  @Get('camera/stream')
  cameraStream(@Req() req: Request, @Res() res: Response) {
    this.camera.stream(req, res);
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
