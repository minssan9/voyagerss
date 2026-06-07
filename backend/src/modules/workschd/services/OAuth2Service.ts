import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { workschdPrisma as prisma } from '../../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { configService } from '../../../config/config-service';

export interface OAuth2Result {
  accessToken: string;
  refreshToken: string;
  user: any;
}

@Injectable()
export class OAuth2Service {
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

  async handleGoogleCallback(code: string): Promise<OAuth2Result> {
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
      return this.resolveOAuthAccount('GOOGLE', googleUser.id, {
        email: googleUser.email,
        username: googleUser.name || googleUser.email,
        profileImageUrl: googleUser.picture,
      });
    } catch (error: any) {
      console.error('Google OAuth2 error:', error.response?.data || error.message);
      throw new Error('Google 로그인에 실패했습니다');
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

  async handleKakaoCallback(code: string): Promise<OAuth2Result> {
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
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const userRes = await axios.get('https://kapi.kakao.com/v2/user/me', {
        headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
      });

      const kakaoUser = userRes.data;
      return this.resolveOAuthAccount('KAKAO', kakaoUser.id.toString(), {
        email: kakaoUser.kakao_account?.email,
        username: kakaoUser.properties?.nickname || `kakao_${kakaoUser.id}`,
        profileImageUrl: kakaoUser.properties?.profile_image,
      });
    } catch (error: any) {
      console.error('Kakao OAuth2 error:', error.response?.data || error.message);
      throw new Error('Kakao 로그인에 실패했습니다');
    }
  }

  private async resolveOAuthAccount(
    provider: string,
    providerId: string,
    profile: { email?: string; username: string; profileImageUrl?: string }
  ): Promise<OAuth2Result> {
    // 1. Check if this OAuth identity is already linked
    const existingOAuth = await prisma.accountOAuth.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { account: { include: { accountRoles: true } } },
    });

    let account: any;

    if (existingOAuth) {
      account = existingOAuth.account;
    } else {
      // 2. Check if email account exists → link
      if (profile.email) {
        account = await prisma.account.findFirst({
          where: { email: profile.email },
          include: { accountRoles: true },
        });
      }

      // 3. Create new account if no email match
      if (!account) {
        const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
        account = await prisma.account.create({
          data: {
            username: profile.username,
            email: profile.email,
            password: randomPassword,
            status: 'ACTIVE',
            profileImageUrl: profile.profileImageUrl,
            accountRoles: { create: [{ roleType: 'USER' }] },
          },
          include: { accountRoles: true },
        });
      }

      // 4. Create the OAuth link
      await prisma.accountOAuth.create({
        data: { accountId: account.accountId, provider, providerId },
      });
    }

    const jwtSecret = configService.get('JWT_SECRET', 'your-secret-key')!;
    const jwtRefreshSecret = configService.get('JWT_REFRESH_SECRET', 'your-refresh-secret')!;

    const accessToken = jwt.sign(
      { accountId: account.accountId, email: account.email, roles: account.accountRoles.map((r: any) => r.roleType) },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign({ accountId: account.accountId }, jwtRefreshSecret, { expiresIn: '7d' });

    await prisma.account.update({
      where: { accountId: account.accountId },
      data: { accessToken, refreshToken },
    });

    return { accessToken, refreshToken, user: account };
  }
}
