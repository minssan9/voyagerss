import { IdentityOAuthService } from './identity-oauth.service';
import { IdentityService } from './identity.service';
import axios from 'axios';

jest.mock('axios');
jest.mock('../../config/config-service', () => ({
  configService: {
    get: jest.fn((key: string, def: string) => def || 'mock-value'),
  },
}));

const axiosMock = axios as jest.Mocked<typeof axios>;

const mockGoogleTokenRes = { data: { access_token: 'gtoken' } };
const mockGoogleUserRes = {
  data: { id: 'g123', email: 'google@test.com', name: 'Google User', picture: 'pic.jpg' },
};

describe('IdentityOAuthService - handleGoogleCallback', () => {
  let service: IdentityOAuthService;
  let identityService: jest.Mocked<IdentityService>;

  beforeEach(() => {
    identityService = {
      oauthUpsert: jest.fn(),
    } as unknown as jest.Mocked<IdentityService>;
    service = new IdentityOAuthService(identityService);
    jest.clearAllMocks();
    axiosMock.post = jest.fn().mockResolvedValue(mockGoogleTokenRes);
    axiosMock.get = jest.fn().mockResolvedValue(mockGoogleUserRes);
  });

  it('delegates to identity oauth upsert for existing linked account', async () => {
    identityService.oauthUpsert.mockResolvedValue({
      tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
      user: { id: 'user-1', email: 'google@test.com' } as any,
    });

    const result = await service.handleGoogleCallback('auth-code');

    expect(identityService.oauthUpsert).toHaveBeenCalledWith('GOOGLE', 'g123', {
      email: 'google@test.com',
      username: 'Google User',
      profileImageUrl: 'pic.jpg',
    });
    expect(result.tokens.accessToken).toBe('mock-token');
  });

  it('throws when google token exchange fails', async () => {
    axiosMock.post = jest.fn().mockRejectedValue(new Error('token failed'));

    await expect(service.handleGoogleCallback('bad-code')).rejects.toThrow('Google 로그인에 실패했습니다');
  });
});
