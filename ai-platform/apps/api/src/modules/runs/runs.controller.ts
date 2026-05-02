import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RunsService } from './runs.service';

@Controller('admin/issues/:issueId')
@UseGuards(JwtAuthGuard)
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  /**
   * GET /api/admin/issues/:issueId/logs?runId=xxx
   * SSE stream of run log lines
   */
  @Get('logs')
  streamLogs(
    @Param('issueId') _issueId: string,
    @Query('runId') runId: string,
    @Res() reply: FastifyReply,
  ) {
    return this.runsService.streamLogs(runId, reply);
  }
}
