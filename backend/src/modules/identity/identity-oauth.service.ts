import { HttpStatus, Injectable } from '@nestjs/common';
import { I18nHttpException } from '../common/i18n-http.exception';
import axios from 'axios';
import { configService } from '../../config/config-service';
import { IdentityService } from './identity.service';

@Injectable()
export class IdentityOAuthService {
  constructor(private readonly identityService: IdentityService) {}

  getGoogleAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: configService.get('GOOGLE_CLIENT_ID', '')!,
      redirect_uri: configService.get('GOOGLE_REDIRECT_URI', '')!,
      response_type: 'code',
      scope: 'openid profile email',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async handleGoogleCallback(code: string) {
    try {
      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: configService.get('GOOGLE_CLIENT_ID'),
        client_secret: configService.get('GOOGLE_CLIENT_SECRET'),
        redirect_uri: configService.get('GOOGLE_REDIRECT_URI'),
        grant_type: 'authorization_code',
      });

      const userRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
      });

      const googleUser = userRes.data;
      return this.identityService.oauthUpsert('GOOGLE', googleUser.id, {
        email: googleUser.email,
        username: googleUser.name || googleUser.email,
        profileImageUrl: googleUser.picture,
      });
    } catch (error: any) {
      console.error('Google OAuth2 error:', error.response?.data || error.message);
      throw new I18nHttpException('auth.googleFailed', HttpStatus.BAD_GATEWAY);
    }
  }

  getKakaoAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: configService.get('KAKAO_REST_API_KEY', '')!,
      redirect_uri: configService.get('KAKAO_REDIRECT_URI', '')!,
      response_type: 'code',
      scope: 'profile_nickname,profile_image,account_email',
    });
    return `https://kauth.kakao.com/oauth/authorize?${params}`;
  }

  async handleKakaoCallback(code: string) {
    try {
      const tokenRes = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: configService.get('KAKAO_REST_API_KEY', '')!,
          client_secret: configService.get('KAKAO_CLIENT_SECRET', '')!,
          redirect_uri: configService.get('KAKAO_REDIRECT_URI', '')!,
          code,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
      });

      const kakaoUser = userRes.data;
      return this.identityService.oauthUpsert('KAKAO', kakaoUser.id.toString(), {
        email: kakaoUser.kakao_account?.email,
        username: kakaoUser.properties?.nickname || `kakao_${kakaoUser.id}`,
        profileImageUrl: kakaoUser.properties?.profile_image,
      });
    } catch (error: any) {
      console.error('Kakao OAuth2 error:', error.response?.data || error.message);
      throw new I18nHttpException('auth.kakaoFailed', HttpStatus.BAD_GATEWAY);
    }
  }
}
