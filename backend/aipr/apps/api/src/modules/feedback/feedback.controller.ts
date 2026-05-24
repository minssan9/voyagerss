import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';

import { IpRateLimitGuard } from './ip-rate-limit.guard';
import { CreateFeedbackSchema, PresignRequestSchema } from './feedback.dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * POST /api/feedback
   * Public endpoint — rate-limited 10/day per IP
   */
  @Post()
  @UseGuards(IpRateLimitGuard)
  async create(@Body() body: unknown, @Req() req: FastifyRequest) {
    const result = CreateFeedbackSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    const issue = await this.feedbackService.create(
      result.data,
      req.headers['user-agent'],
    );
    return { id: issue.id, status: issue.status };
  }

  /**
   * POST /api/feedback/presign
   * Returns a presigned S3 URL for direct browser upload
   */
  @Post('presign')
  presign(@Body() body: unknown) {
    const result = PresignRequestSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    // TODO Phase 2: generate real presigned URL via @aws-sdk/s3-presigned-post
    const { filename, mime } = result.data;
    const s3Key = `uploads/${Date.now()}-${filename}`;
    return {
      uploadUrl: `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${s3Key}`,
      s3Key,
      mime,
      fields: {},
    };
  }
}
