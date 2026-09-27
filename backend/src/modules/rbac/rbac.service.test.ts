import { RbacService } from './rbac.service';
import { RbacPrismaService } from '../../prisma/rbac-prisma.service';

const rbac = {
  subjectRole: {
    findMany: jest.fn(),
  },
  permission: {
    findUnique: jest.fn(),
  },
  rolePermission: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
} as unknown as RbacPrismaService;

describe('RbacService', () => {
  let service: RbacService;

  beforeEach(() => {
    service = new RbacService(rbac);
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('checks permissions using identity subject id', async () => {
      (rbac.subjectRole.findMany as jest.Mock).mockResolvedValue([
        { roleId: 2, role: { code: 'VIEWER' } },
      ]);
      (rbac.permission.findUnique as jest.Mock).mockResolvedValue({ id: 10 });
      (rbac.rolePermission.findFirst as jest.Mock).mockResolvedValue({ id: 1 });

      const allowed = await service.hasPermission('workschd', 'identity-user-abc', 'workschd:api:team:read');

      expect(rbac.subjectRole.findMany).toHaveBeenCalledWith({
        where: { module: 'workschd', subjectId: 'identity-user-abc' },
        include: { role: true },
      });
      expect(allowed).toBe(true);
    });

    it('grants all permissions to SUPER_ADMIN subject roles', async () => {
      (rbac.subjectRole.findMany as jest.Mock).mockResolvedValue([
        { roleId: 1, role: { code: 'SUPER_ADMIN' } },
      ]);

      const allowed = await service.hasPermission('vision', 'identity-user-xyz', 'vision:api:judge:write');

      expect(rbac.permission.findUnique).not.toHaveBeenCalled();
      expect(allowed).toBe(true);
    });
  });

  describe('getMeProfile', () => {
    it('shapes roles, pages, modules, and isAdmin for identity user id', async () => {
      (rbac.subjectRole.findMany as jest.Mock).mockResolvedValue([
        { module: 'workschd', roleId: 2, role: { code: 'ADMIN' } },
        { module: 'vision', roleId: 3, role: { code: 'VIEWER' } },
      ]);
      (rbac.rolePermission.findMany as jest.Mock).mockResolvedValue([
        {
          roleId: 2,
          permission: {
            code: 'workschd:page:admin-dashboard',
            type: 'PAGE',
            module: 'workschd',
            resource: '/workschd/admin/dashboard',
          },
        },
        {
          roleId: 3,
          permission: {
            code: 'vision:page:home',
            type: 'PAGE',
            module: 'vision',
            resource: '/vision',
          },
        },
        {
          roleId: 2,
          permission: {
            code: 'workschd:api:rbac:read',
            type: 'API',
            module: 'workschd',
            resource: 'GET:/api/rbac/*',
          },
        },
      ]);

      const profile = await service.getMeProfile('identity-user-abc');

      expect(profile).toEqual({
        userId: 'identity-user-abc',
        roles: [
          { code: 'ADMIN', module: 'workschd' },
          { code: 'VIEWER', module: 'vision' },
        ],
        pages: [
          {
            code: 'workschd:page:admin-dashboard',
            module: 'workschd',
            resource: '/workschd/admin/dashboard',
          },
          { code: 'vision:page:home', module: 'vision', resource: '/vision' },
        ],
        modules: ['workschd', 'vision'],
        isAdmin: true,
      });
    });
  });

  describe('isAdmin', () => {
    it('returns true when subject has ADMIN or SUPER_ADMIN role in any module', async () => {
      (rbac.subjectRole.findMany as jest.Mock).mockResolvedValue([
        { role: { code: 'SUPER_ADMIN' } },
      ]);

      await expect(service.isAdmin('identity-user-abc')).resolves.toBe(true);
    });
  });
});
