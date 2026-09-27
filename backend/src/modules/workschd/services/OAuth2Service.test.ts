import { OAuth2Service } from './OAuth2Service';
import { IdentityOAuthService } from '../../identity/identity-oauth.service';

jest.mock('../../identity/identity-oauth.service');

describe('OAuth2Service', () => {
  let service: OAuth2Service;
  let identityOAuthService: jest.Mocked<IdentityOAuthService>;

  beforeEach(() => {
    identityOAuthService = {
      getGoogleAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?mock=1'),
      handleGoogleCallback: jest.fn(),
      getKakaoAuthUrl: jest.fn().mockReturnValue('https://kauth.kakao.com/oauth/authorize?mock=1'),
      handleKakaoCallback: jest.fn(),
    } as unknown as jest.Mocked<IdentityOAuthService>;
    service = new OAuth2Service(identityOAuthService);
    jest.clearAllMocks();
  });

  it('delegates google callback to identity oauth service', async () => {
    identityOAuthService.handleGoogleCallback.mockResolvedValue({
      tokens: { accessToken: 'mock-token', refreshToken: 'mock-refresh' },
      user: { id: 'user-1' } as any,
    });

    const result = await service.handleGoogleCallback('auth-code');

    expect(identityOAuthService.handleGoogleCallback).toHaveBeenCalledWith('auth-code');
    expect(result).toEqual({
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      user: { id: 'user-1' },
    });
  });

  it('returns google auth url from identity oauth service', () => {
    expect(service.getGoogleAuthUrl()).toContain('accounts.google.com');
    expect(identityOAuthService.getGoogleAuthUrl).toHaveBeenCalled();
  });
});
