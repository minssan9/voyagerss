import { Controller, Get, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * GET /api/metrics
   * Prometheus scrape endpoint — restrict to internal network in production.
   */
  @Get()
  async metrics(@Res() reply: FastifyReply): Promise<void> {
    reply
      .header('Content-Type', this.metricsService.contentType())
      .send(await this.metricsService.getMetrics());
  }
}
