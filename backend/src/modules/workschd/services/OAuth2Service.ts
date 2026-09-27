import { Injectable } from '@nestjs/common';
import { IdentityOAuthService } from '../../identity/identity-oauth.service';

export interface OAuth2Result {
  accessToken: string;
  refreshToken: string;
  user: any;
}

@Injectable()
export class OAuth2Service {
  constructor(private readonly identityOAuthService: IdentityOAuthService) {}

  getGoogleAuthUrl(): string {
    return this.identityOAuthService.getGoogleAuthUrl();
  }

  async handleGoogleCallback(code: string): Promise<OAuth2Result> {
    const result = await this.identityOAuthService.handleGoogleCallback(code);
    return {
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: result.user,
    };
  }

  getKakaoAuthUrl(): string {
    return this.identityOAuthService.getKakaoAuthUrl();
  }

  async handleKakaoCallback(code: string): Promise<OAuth2Result> {
    const result = await this.identityOAuthService.handleKakaoCallback(code);
    return {
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      user: result.user,
    };
  }
}
