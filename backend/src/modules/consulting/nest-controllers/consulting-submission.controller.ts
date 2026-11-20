import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, Res, UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../workschd/guards/jwt-auth.guard';
import { RolesGuard } from '../../workschd/guards/roles.guard';
import { Roles } from '../../workschd/decorators/roles.decorator';
import {
  ConsultingSubmissionService, CreateSubmissionInput, MAX_FILES, MAX_FILE_BYTES, SubmissionFileInput,
} from '../services/consulting-submission.service';

/**
 * 컨설팅 문서 제출
 *   POST  /api/consulting/submissions            (공개, multipart: files[] + 폼 필드)
 *   GET   /api/consulting/submissions            (ADMIN)
 *   PATCH /api/consulting/submissions/:id        (ADMIN, status)
 *   GET   /api/consulting/submissions/files/:id  (ADMIN, 다운로드)
 */
@Controller('consulting/submissions')
export class ConsultingSubmissionController {
  constructor(private readonly svc: ConsultingSubmissionService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', MAX_FILES + 1, { limits: { fileSize: MAX_FILE_BYTES + 1, files: MAX_FILES + 1 } }))
  create(
    @Body() body: CreateSubmissionInput,
    @UploadedFiles() files: SubmissionFileInput[] | undefined,
    @Req() req: Request,
  ) {
    return this.svc.create(body ?? {}, files ?? [], req.ip ?? '');
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  findAll(@Query('status') status?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.svc.findAll({
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { status: string }) {
    return this.svc.updateStatus(id, body?.status);
  }

  @Get('files/:fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async download(@Param('fileId', ParseIntPipe) fileId: number, @Res() res: Response) {
    const file = await this.svc.getFile(fileId);
    res.setHeader('Content-Type', file.fileMime);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    res.send(file.fileData);
  }
}
