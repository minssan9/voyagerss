import { Request, Response, NextFunction } from 'express';
import { rbacPrisma } from '../../../config/prisma';

export interface AiprRbacRequest extends Request {
  user?: { id: string; email: string; role: string };
}

async function checkRbacPermission(subjectId: string, permCode: string): Promise<boolean> {
  const subjectRoles = await rbacPrisma.subjectRole.findMany({
    where: { module: 'aipr', subjectId },
    select: { roleId: true },
  });
  if (subjectRoles.length === 0) return false;

  const roleIds = subjectRoles.map((r) => r.roleId);
  const targetPerm = await rbacPrisma.permission.findUnique({
    where: { code: permCode },
    select: { id: true },
  });
  if (!targetPerm) return false;

  const link = await rbacPrisma.rolePermission.findFirst({
    where: { roleId: { in: roleIds }, permissionId: targetPerm.id },
  });
  return link !== null;
}

export function aiprRbacMiddleware(permCode: string) {
  return async (req: AiprRbacRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      const allowed = await checkRbacPermission(user.id, permCode);
      if (!allowed) {
        res.status(403).json({ message: `Permission denied: ${permCode}` });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
