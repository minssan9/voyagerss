import { autodevPrisma } from '../../../config/prisma';

export class JobService {
  async list(status?: string) {
    return autodevPrisma.job.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { logs: { orderBy: { createdAt: 'asc' }, take: 50 } },
    });
  }

  async findById(id: number) {
    return autodevPrisma.job.findUnique({
      where: { id },
      include: { logs: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async create(issueKey: string) {
    return autodevPrisma.job.create({
      data: { issueKey, status: 'PENDING' },
    });
  }

  async update(id: number, data: Partial<{ status: string; branch: string; prUrl: string; logPath: string; startedAt: Date; finishedAt: Date }>) {
    return autodevPrisma.job.update({
      where: { id },
      data,
    });
  }
}
