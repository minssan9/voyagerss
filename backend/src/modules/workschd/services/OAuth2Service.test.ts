import { OAuth2Service } from './OAuth2Service';
import { workschdPrisma } from '../../../config/prisma';
import axios from 'axios';

jest.mock('axios');
jest.mock('../../../config/prisma', () => ({
  workschdPrisma: {
    accountOAuth: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    account: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('../../../config/config-service', () => ({
  configService: {
    get: jest.fn((key: string, def: string) => def || 'mock-value'),
  },
}));
jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed') }));
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
}));

const prisma = workschdPrisma as any;
const axiosMock = axios as jest.Mocked<typeof axios>;

const mockGoogleTokenRes = { data: { access_token: 'gtoken' } };
const mockGoogleUserRes = {
  data: { id: 'g123', email: 'google@test.com', name: 'Google User', picture: 'pic.jpg' },
};

describe('OAuth2Service - handleGoogleCallback', () => {
  let service: OAuth2Service;

  beforeEach(() => {
    service = new OAuth2Service();
    jest.clearAllMocks();
    axiosMock.post = jest.fn().mockResolvedValue(mockGoogleTokenRes);
    axiosMock.get = jest.fn().mockResolvedValue(mockGoogleUserRes);
  });

  it('returns existing linked account if provider already registered', async () => {
    const existingAccount = {
      accountId: 1,
      email: 'google@test.com',
      accountRoles: [{ roleType: 'USER' }],
    };
    (prisma.accountOAuth.findUnique as jest.Mock).mockResolvedValue({
      id: 10,
      accountId: 1,
      account: existingAccount,
    });
    (prisma.account.update as jest.Mock).mockResolvedValue(existingAccount);

    const result = await service.handleGoogleCallback('auth-code');

    expect(prisma.accountOAuth.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { provider_providerId: { provider: 'GOOGLE', providerId: 'g123' } } })
    );
    expect(prisma.account.create).not.toHaveBeenCalled();
    expect(result.accessToken).toBe('mock-token');
  });

  it('links OAuth to existing account if email matches', async () => {
    const existingAccount = {
      accountId: 2,
      email: 'google@test.com',
      accountRoles: [{ roleType: 'USER' }],
    };
    (prisma.accountOAuth.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.account.findFirst as jest.Mock).mockResolvedValue(existingAccount);
    (prisma.accountOAuth.create as jest.Mock).mockResolvedValue({ id: 11 });
    (prisma.account.update as jest.Mock).mockResolvedValue(existingAccount);

    const result = await service.handleGoogleCallback('auth-code');

    expect(prisma.account.create).not.toHaveBeenCalled();
    expect(prisma.accountOAuth.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountId: 2, provider: 'GOOGLE', providerId: 'g123' }),
      })
    );
    expect(result.accessToken).toBe('mock-token');
  });

  it('creates new account and AccountOAuth if email is new', async () => {
    const newAccount = {
      accountId: 3,
      email: 'google@test.com',
      accountRoles: [{ roleType: 'USER' }],
    };
    (prisma.accountOAuth.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.account.create as jest.Mock).mockResolvedValue(newAccount);
    (prisma.accountOAuth.create as jest.Mock).mockResolvedValue({ id: 12 });
    (prisma.account.update as jest.Mock).mockResolvedValue(newAccount);

    const result = await service.handleGoogleCallback('auth-code');

    expect(prisma.account.create).toHaveBeenCalled();
    expect(prisma.accountOAuth.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountId: 3, provider: 'GOOGLE', providerId: 'g123' }),
      })
    );
    expect(result.accessToken).toBe('mock-token');
  });
});
