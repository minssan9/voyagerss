import { Injectable } from '@nestjs/common';
import { RbacPrismaService } from '../../prisma/rbac-prisma.service';

@Injectable()
export class RbacAssignmentService {
  constructor(private readonly rbac: RbacPrismaService) {}

  async assignDefaultWorkschdViewer(identityUserId: string): Promise<void> {
    const viewerRole = await this.rbac.role.findUnique({ where: { code: 'VIEWER' } });
    if (!viewerRole) return;

    const existing = await this.rbac.subjectRole.findFirst({
      where: { module: 'workschd', subjectId: identityUserId, roleId: viewerRole.id },
    });
    if (existing) return;

    await this.rbac.subjectRole.create({
      data: { module: 'workschd', subjectId: identityUserId, roleId: viewerRole.id },
    });
  }
}
