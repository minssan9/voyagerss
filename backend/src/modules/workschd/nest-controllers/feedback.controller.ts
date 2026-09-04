import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { FeedbackService } from '../services/FeedbackService';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../decorators/user.decorator';

@Controller('v2/feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackNestController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() body: { title: string; content: string; pageUrl?: string; fileName?: string; fileMime?: string; fileBase64?: string },
  ) {
    const feedback = await this.feedbackService.create(user.accountId, body);
    return { id: feedback.id, status: feedback.status };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async findAll(@Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.feedbackService.findAll({
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { status: string }) {
    const feedback = await this.feedbackService.updateStatus(id, body.status);
    return { id: feedback.id, status: feedback.status };
  }

  @Get(':id/file')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getFile(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const file = await this.feedbackService.getFile(id);
    res.setHeader('Content-Type', file.fileMime);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
    res.send(file.fileData);
  }
}
