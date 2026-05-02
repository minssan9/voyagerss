import { z } from 'zod';

export const CreateFeedbackSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
  reporterEmail: z.string().email().optional(),
  sourceUrl: z.string().url().optional(),
  repoFullName: z.string().regex(/^[\w.-]+\/[\w.-]+$/).optional(),
  baseBranch: z.string().default('main'),
  labels: z.array(z.string().max(50)).max(10).optional(),
  // s3Keys for pre-uploaded attachments
  attachmentS3Keys: z
    .array(z.object({ s3Key: z.string(), mime: z.string(), size: z.number().positive() }))
    .max(5)
    .optional(),
});

export type CreateFeedbackDto = z.infer<typeof CreateFeedbackSchema>;

export const PresignRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mime: z.string().min(1).max(100),
  size: z.number().positive().max(10 * 1024 * 1024), // 10MB
});

export type PresignRequestDto = z.infer<typeof PresignRequestSchema>;
