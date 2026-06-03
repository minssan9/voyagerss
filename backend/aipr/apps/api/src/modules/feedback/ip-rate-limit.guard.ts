import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';

import { PrismaService } from '../../prisma/prisma.service';

const DAILY_LIMIT = 10;

@Injectable()
export class IpRateLimitGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const ip = req.ip ?? '0.0.0.0';
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const record = await this.prisma.feedbackRate.upsert({
      where: { ip_day: { ip, day: today } },
      update: { count: { increment: 1 } },
      create: { ip, day: today, count: 1 },
    });

    if (record.count > DAILY_LIMIT) {
      throw new HttpException(
        { message: 'Rate limit exceeded. Max 10 feedbacks per day per IP.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
