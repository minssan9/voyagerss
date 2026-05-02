import { z } from 'zod';
import { IssueStatus } from '@repo/db';

export const IssueListQuerySchema = z.object({
  status: z.nativeEnum(IssueStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type IssueListQueryDto = z.infer<typeof IssueListQuerySchema>;

export const PatchIssueSchema = z.object({
  status: z.nativeEnum(IssueStatus).optional(),
  repoFullName: z.string().optional(),
  baseBranch: z.string().optional(),
});

export type PatchIssueDto = z.infer<typeof PatchIssueSchema>;
