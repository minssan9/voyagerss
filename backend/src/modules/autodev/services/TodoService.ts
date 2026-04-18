import { autodevPrisma } from '../../../config/prisma';

export class TodoService {
  async list(date?: string, resolved?: boolean) {
    const where: any = {};

    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.date = { gte: d, lt: next };
    }

    if (resolved !== undefined) {
      where.resolved = resolved;
    }

    return autodevPrisma.todo.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { issue: true },
    });
  }

  async update(id: number, data: Partial<{ content: string; resolved: boolean; resolvedAt: Date }>) {
    return autodevPrisma.todo.update({
      where: { id },
      data,
    });
  }
}
