import { Request, Response } from 'express';
import { z } from 'zod';
import { feedbackService } from '../services/FeedbackService';
import { aiprPrisma as prisma } from '../../../config/prisma';
import { aiprConfigService } from '../../../config/aipr-config-service';

function buildS3Url(s3Key: string): string {
  const endpoint = aiprConfigService.get('S3_ENDPOINT', 'http://localhost:9000')!;
  const bucket = aiprConfigService.get('S3_BUCKET', 'voyagerss')!;
  return `${endpoint}/${bucket}/${s3Key}`;
}

const CreateFeedbackSchema = z.object({
  title:         z.string().min(1),
  body:          z.string().min(10),
  reporterEmail: z.string().email().optional().or(z.literal('')),
  sourceUrl:     z.string().url().optional(),
  repoFullName:  z.string().optional(),
  baseBranch:    z.string().default('main'),
  labels:        z.record(z.any()).optional(),
  attachmentS3Keys: z.array(z.object({
    s3Key: z.string(),
    mime:  z.string(),
    size:  z.number(),
  })).optional(),
});

const PresignRequestSchema = z.object({
  filename: z.string(),
  mime:     z.string(),
  size:     z.number(),
});

export class FeedbackController {
  async create(req: Request, res: Response) {
    try {
      const ip = req.ip ?? '0.0.0.0';
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const record = await prisma.feedbackRate.upsert({
        where: { ip_day: { ip, day: today } },
        update: { count: { increment: 1 } },
        create: { ip, day: today, count: 1 },
      });

      if (record.count > 10) {
        res.status(429).json({ message: 'Rate limit exceeded. Max 10 feedbacks per day per IP.' });
        return;
      }

      const parsed = CreateFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: 'Invalid request body', errors: parsed.error.flatten() });
        return;
      }

      const userAgent = req.headers['user-agent'];
      const issue = await feedbackService.create(parsed.data, Array.isArray(userAgent) ? userAgent[0] : userAgent);
      res.status(201).json({ id: issue.id, status: issue.status });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async presign(req: Request, res: Response) {
    try {
      const parsed = PresignRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: 'Invalid request body', errors: parsed.error.flatten() });
        return;
      }
      const { filename, mime } = parsed.data;
      const s3Key = `uploads/${Date.now()}-${filename}`;
      res.json({
        uploadUrl: buildS3Url(s3Key),
        s3Key,
        mime,
        fields: {},
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  async getAttachment(req: Request, res: Response) {
    try {
      const { s3Key } = req.params;
      const s3Url = buildS3Url(s3Key);
      res.redirect(s3Url);
    } catch (err: any) {
      res.status(404).json({ message: 'Attachment not found' });
    }
  }
}

export const feedbackController = new FeedbackController();
