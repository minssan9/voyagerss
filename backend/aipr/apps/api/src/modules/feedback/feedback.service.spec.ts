import { BadRequestException } from '@nestjs/common';
import { IssueStatus } from '@prisma/client-aipr';

import { FeedbackService } from './feedback.service';

// ── PrismaService mock ────────────────────────────────────────────────────────
const mockIssue = {
  id: 'uuid-1',
  status: IssueStatus.NEW,
  title: 'Test issue',
  body: 'Test body',
  reporterEmail: 'reporter@example.com',
  repoFullName: 'owner/repo',
  baseBranch: 'main',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const prismaMock = {
  issue: {
    create: jest.fn().mockResolvedValue(mockIssue),
    findUnique: jest.fn().mockResolvedValue(mockIssue),
    findUniqueOrThrow: jest.fn().mockResolvedValue(mockIssue),
    update: jest.fn(),
  },
};

const metricsMock = {
  feedbackReceived: { inc: jest.fn() },
};

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    service = new FeedbackService(prismaMock as any, metricsMock as any);
    jest.clearAllMocks();
  });

  // ── create ──────────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('creates an issue with status NEW', async () => {
      const dto = { title: 'Test issue', body: 'Test body', baseBranch: 'main' };
      const result = await service.create(dto, 'Mozilla/5.0');

      expect(prismaMock.issue.create).toHaveBeenCalledTimes(1);
      expect(result.status).toBe(IssueStatus.NEW);
    });

    it('passes attachmentS3Keys to prisma create', async () => {
      const dto = {
        title: 'T',
        body: 'B',
        baseBranch: 'main',
        attachmentS3Keys: [{ s3Key: 'uploads/file.png', mime: 'image/png', size: 1024 }],
      };
      await service.create(dto);
      const call = prismaMock.issue.create.mock.calls[0][0];
      expect(call.data.attachments.create).toHaveLength(1);
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────
  describe('findById()', () => {
    it('returns null when issue not found', async () => {
      prismaMock.issue.findUnique.mockResolvedValueOnce(null);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('returns issue when found', async () => {
      const result = await service.findById('uuid-1');
      expect(result?.id).toBe('uuid-1');
    });
  });

  // ── transitionStatus ─────────────────────────────────────────────────────────
  describe('transitionStatus()', () => {
    it('transitions NEW → TRIAGED', async () => {
      prismaMock.issue.update.mockResolvedValue({ ...mockIssue, status: IssueStatus.TRIAGED });
      const result = await service.transitionStatus('uuid-1', IssueStatus.TRIAGED);
      expect(result.status).toBe(IssueStatus.TRIAGED);
    });

    it('transitions NEW → QUEUED (invalid) throws BadRequestException', async () => {
      await expect(service.transitionStatus('uuid-1', IssueStatus.QUEUED))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('transitions FAILED → QUEUED (retry allowed)', async () => {
      prismaMock.issue.findUniqueOrThrow.mockResolvedValueOnce({
        ...mockIssue,
        status: IssueStatus.FAILED,
      });
      prismaMock.issue.update.mockResolvedValue({ ...mockIssue, status: IssueStatus.QUEUED });
      const result = await service.transitionStatus('uuid-1', IssueStatus.QUEUED);
      expect(result.status).toBe(IssueStatus.QUEUED);
    });
  });
});
