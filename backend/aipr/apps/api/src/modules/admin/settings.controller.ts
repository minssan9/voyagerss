import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const RepoSchema = z.object({
  repoFullName: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  baseBranch:   z.string().default('main'),
});

const OriginSchema = z.object({
  origin: z.string().url(),
});

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /api/admin/origins */
  @Get('origins')
  listOrigins() {
    return this.prisma.allowedOrigin.findMany({ orderBy: { createdAt: 'asc' } });
  }

  /** POST /api/admin/origins */
  @Post('origins')
  async addOrigin(@Body() body: unknown) {
    const r = OriginSchema.safeParse(body);
    if (!r.success) throw new BadRequestException(r.error.flatten());
    return this.prisma.allowedOrigin.upsert({
      where:  { origin: r.data.origin },
      update: {},
      create: { origin: r.data.origin, appId: 'default' },
    });
  }
}
