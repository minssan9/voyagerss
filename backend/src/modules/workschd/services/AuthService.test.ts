import { AuthService } from './AuthService';
import { workschdPrisma } from '../../../config/prisma';
import bcrypt from 'bcrypt';

jest.mock('../../../config/prisma', () => ({
  workschdPrisma: {
    account: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../../config/config-service', () => ({
  configService: { get: jest.fn().mockReturnValue('test-secret') },
}));

const prisma = workschdPrisma as jest.Mocked<typeof workschdPrisma>;

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('creates account with hashed password', async () => {
      (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.account.create as jest.Mock).mockResolvedValue({
        accountId: 1,
        email: 'test@example.com',
        username: 'testuser',
        accountRoles: [{ roleType: 'USER' }],
      });

      const result = await service.signup('test@example.com', 'password123', 'testuser');

      expect(prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            username: 'testuser',
            status: 'ACTIVE',
          }),
        })
      );

      const createCall = (prisma.account.create as jest.Mock).mock.calls[0][0];
      const isHashed = await bcrypt.compare('password123', createCall.data.password);
      expect(isHashed).toBe(true);

      expect(result).toMatchObject({ accountId: 1, email: 'test@example.com' });
    });

    it('throws 409 on duplicate email', async () => {
      (prisma.account.findFirst as jest.Mock).mockResolvedValue({
        accountId: 99,
        email: 'dupe@example.com',
      });

      await expect(
        service.signup('dupe@example.com', 'password123', 'user')
      ).rejects.toMatchObject({ status: 409 });
    });
  });
});
