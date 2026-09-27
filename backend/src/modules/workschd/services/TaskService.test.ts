import { BadRequestException } from '@nestjs/common';
import { TaskService } from './TaskService';

jest.mock('../../../config/prisma', () => ({
  workschdPrisma: {
    $transaction: jest.fn(),
    task: { findUnique: jest.fn(), update: jest.fn() },
    taskEmployee: { findUnique: jest.fn(), count: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('./NotificationService', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    sendJoinApprovedNotification: jest.fn(),
    sendTaskClosedNotification: jest.fn(),
  })),
}));

describe('TaskService', () => {
  const service = new TaskService();
  const prisma = jest.requireMock('../../../config/prisma').workschdPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('approveJoinRequest rejects when approved count already equals workerCount', async () => {
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        taskEmployee: {
          findUnique: jest.fn().mockResolvedValue({ id: 9, taskId: 1, status: 'PENDING' }),
          count: jest.fn().mockResolvedValue(1),
          update: jest.fn(),
        },
        task: {
          findUnique: jest.fn().mockResolvedValue({ id: 1, workerCount: 1 }),
          update: jest.fn(),
        },
      };
      return cb(tx);
    });

    await expect(service.approveJoinRequest(9)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approveJoinRequest succeeds when capacity remains', async () => {
    prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        taskEmployee: {
          findUnique: jest.fn().mockResolvedValue({ id: 9, taskId: 1, accountId: 2, status: 'PENDING' }),
          count: jest.fn().mockResolvedValue(0),
          update: jest.fn().mockResolvedValue({ id: 9, taskId: 1, accountId: 2, status: 'APPROVED' }),
        },
        task: {
          findUnique: jest.fn().mockResolvedValue({ id: 1, workerCount: 2 }),
          update: jest.fn().mockResolvedValue({ id: 1, workerCount: 2, currentWorkerCount: 1 }),
        },
      };
      return cb(tx);
    });

    const result = await service.approveJoinRequest(9);
    expect(result.status).toBe('APPROVED');
  });
});
