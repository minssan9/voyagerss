import { IdentityService } from './identity.service';
import { IdentityPrismaService } from './identity-prisma.service';
import { RbacAssignmentService } from '../rbac/rbac-assignment.service';
import { workschdPrisma } from '../../config/prisma';
import bcrypt from 'bcrypt';

jest.mock('../../config/prisma', () => ({
  workschdPrisma: {
    account: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
  aiprPrisma: {
    admin: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../config/config-service', () => ({
  configService: { get: jest.fn().mockReturnValue('test-secret') },
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
}));

const identityPrisma = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  oauthAccount: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  moduleLink: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
} as unknown as IdentityPrismaService;

const rbacAssignment = {
  assignDefaultWorkschdViewer: jest.fn(),
} as unknown as RbacAssignmentService;

const workschd = workschdPrisma as jest.Mocked<typeof workschdPrisma>;

describe('IdentityService', () => {
  let service: IdentityService;

  beforeEach(() => {
    service = new IdentityService(identityPrisma, rbacAssignment);
    jest.clearAllMocks();
  });

  describe('passwordLogin', () => {
    it('returns tokens when identity user password matches', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      (identityPrisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: hashed,
        status: 'ACTIVE',
      });

      const result = await service.passwordLogin('test@example.com', 'password123');

      expect(result).toEqual({ accessToken: 'mock-token', refreshToken: 'mock-token' });
      expect(workschd.account.findFirst).not.toHaveBeenCalled();
    });

    it('migrates legacy workschd account on first password login', async () => {
      (identityPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      const hashed = await bcrypt.hash('password123', 10);
      (workschd.account.findFirst as jest.Mock).mockResolvedValue({
        accountId: 42,
        email: 'legacy@example.com',
        username: 'legacy',
        password: hashed,
        status: 'ACTIVE',
      });
      (identityPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-legacy',
        email: 'legacy@example.com',
      });

      const result = await service.passwordLogin('legacy@example.com', 'password123');

      expect(identityPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'legacy@example.com',
            passwordHash: hashed,
            moduleLinks: {
              create: { module: 'workschd', subjectId: '42' },
            },
          }),
        }),
      );
      expect(result).toEqual({ accessToken: 'mock-token', refreshToken: 'mock-token' });
    });

    it('returns null for invalid credentials', async () => {
      (identityPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (workschd.account.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.passwordLogin('missing@example.com', 'wrong');

      expect(result).toBeNull();
    });
  });

  describe('oauthUpsert', () => {
    it('returns existing user when provider already registered', async () => {
      const existingUser = { id: 'user-oauth', email: 'google@test.com' };
      (identityPrisma.oauthAccount.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 'user-oauth',
        user: existingUser,
      });
      (identityPrisma.moduleLink.findUnique as jest.Mock).mockResolvedValue({
        subjectId: '10',
      });
      (identityPrisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(existingUser);

      const result = await service.oauthUpsert('GOOGLE', 'g123', {
        email: 'google@test.com',
        username: 'Google User',
      });

      expect(identityPrisma.user.create).not.toHaveBeenCalled();
      expect(result.tokens.accessToken).toBe('mock-token');
      expect(result.user).toEqual(existingUser);
    });

    it('creates user and oauth account for new provider identity', async () => {
      const newUser = { id: 'user-new', email: 'google@test.com' };
      (identityPrisma.oauthAccount.findUnique as jest.Mock).mockResolvedValue(null);
      (identityPrisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (identityPrisma.user.create as jest.Mock).mockResolvedValue(newUser);
      (identityPrisma.moduleLink.findUnique as jest.Mock).mockResolvedValue(null);
      (workschd.account.findFirst as jest.Mock).mockResolvedValue(null);
      (workschd.account.create as jest.Mock).mockResolvedValue({ accountId: 99 });
      (identityPrisma.moduleLink.create as jest.Mock).mockResolvedValue({ id: 1 });
      (identityPrisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(newUser);

      const result = await service.oauthUpsert('GOOGLE', 'g123', {
        email: 'google@test.com',
        username: 'Google User',
      });

      expect(identityPrisma.oauthAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-new', provider: 'GOOGLE', providerId: 'g123' }),
        }),
      );
      expect(result.tokens.accessToken).toBe('mock-token');
    });
  });
});
