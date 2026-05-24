import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import type { FastifyRequest } from 'fastify';

@Injectable()
export class GithubHmacGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();

    const sig256 = req.headers['x-hub-signature-256'] as string | undefined;
    if (!sig256) throw new UnauthorizedException('Missing x-hub-signature-256');

    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) throw new UnauthorizedException('Webhook secret not configured');

    // rawBody is attached by Fastify addContentTypeParser in main.ts
    const rawBody: Buffer = (req as any).rawBody;
    if (!rawBody) throw new UnauthorizedException('Raw body unavailable');

    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

    const sigBuf = Buffer.from(sig256);
    const expBuf = Buffer.from(expected);

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
