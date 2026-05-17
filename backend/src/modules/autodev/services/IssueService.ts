import { autodevPrisma } from '../../../config/prisma';

export class IssueService {
  async list() {
    return autodevPrisma.issue.findMany({
      orderBy: { createdAt: 'desc' },
      include: { todos: true },
    });
  }

  async findByKey(issueKey: string) {
    return autodevPrisma.issue.findUnique({
      where: { issueKey },
      include: { todos: true },
    });
  }

  async getCompletionHistory(issueKey: string) {
    return autodevPrisma.completionHistory.findMany({
      where: { issueKey },
      orderBy: { createdAt: 'desc' },
    });
  }
}
