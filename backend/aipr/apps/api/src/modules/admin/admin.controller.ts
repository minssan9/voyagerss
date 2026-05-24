import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IssueListQuerySchema, PatchIssueSchema } from './admin.dto';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /api/admin/issues?status=NEW&page=1&limit=20 */
  @Get('issues')
  async listIssues(@Query() query: unknown) {
    const result = IssueListQuerySchema.safeParse(query);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.adminService.listIssues(result.data);
  }

  /** GET /api/admin/issues/:id */
  @Get('issues/:id')
  getIssue(@Param('id') id: string) {
    return this.adminService.getIssue(id);
  }

  /** PATCH /api/admin/issues/:id */
  @Patch('issues/:id')
  async patchIssue(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: FastifyRequest & { user: { id: string } },
  ) {
    const result = PatchIssueSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.adminService.patchIssue(id, result.data, req.user.id);
  }
}
