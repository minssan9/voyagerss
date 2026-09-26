import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { VisionConfigStore } from './vision-config.store';
import { VisionService } from './vision.service';
import { failure, success, UploadedImage, VisionEndpoints } from './vision.types';

@Controller('vision')
export class VisionController {
  constructor(
    private readonly config: VisionConfigStore,
    private readonly svc: VisionService,
  ) {}

  @Get('config')
  getConfig() {
    return success(this.config.get());
  }

  @Put('config')
  updateConfig(@Body() body: Partial<VisionEndpoints>) {
    try {
      const data = this.config.update(body ?? {});
      return success(data, '저장했습니다.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '설정 저장에 실패했습니다.';
      return failure(message);
    }
  }

  @Get('cam/status')
  camStatus() {
    return this.svc.getCamStatus();
  }

  @Get('cam/stream')
  camStream(@Res() res: Response) {
    this.svc.pipeCamStream(res);
  }

  @Get('judge/health')
  judgeHealth() {
    return this.svc.getJudgeHealth();
  }

  @Post('judge/bool')
  @UseInterceptors(FileInterceptor('image'))
  judgeBool(@UploadedFile() file: UploadedImage | undefined, @Body('question') question: string) {
    return this.svc.judgeBool(file, question);
  }

  @Post('judge/choice')
  @UseInterceptors(FileInterceptor('image'))
  judgeChoice(
    @UploadedFile() file: UploadedImage | undefined,
    @Body('question') question: string,
    @Body('choices') choices: string,
  ) {
    return this.svc.judgeChoice(file, question, choices);
  }

  @Get('judge/records')
  judgeRecords(@Query('limit') limit?: string) {
    const parsed = limit === undefined ? 50 : Number(limit);
    return this.svc.listJudgeRecords(parsed);
  }

  @Get('judge/records/:id')
  judgeRecord(@Param('id') id: string) {
    return this.svc.getJudgeRecord(id);
  }

  @Get('judge/images/:filename')
  async judgeImage(@Param('filename') filename: string, @Res() res: Response) {
    const result = await this.svc.getJudgeImage(filename);
    if (!result.ok) {
      res.status(200).json(failure(result.message));
      return;
    }
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(result.body);
  }
}
