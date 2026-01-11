import axios from 'axios';
import { workschdPrisma as prisma } from '../../../config/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export interface OAuth2Result {
  accessToken: string;
  refreshToken: string;
  user: any;
}

/**
 * OAuth2 인증 서비스
 * Google, Kakao 로그인 지원
 */
export class OAuth2Service {
  /**
   * Google OAuth2 로그인 URL 생성
   */
  getGoogleAuthUrl(): string {
    const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || '',
      response_type: 'code',
      scope: 'openid profile email',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Google OAuth2 콜백 처리
   */
  async handleGoogleCallback(code: string): Promise<OAuth2Result> {
    try {
      // 1. 액세스 토큰 교환
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code'
        }
      );

      const { access_token } = tokenResponse.data;

      // 2. 사용자 정보 가져오기
      const userInfoResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${access_token}` }
        }
      );

      const googleUser = userInfoResponse.data;

      // 3. 계정 찾기 또는 생성
      let account = await prisma.account.findFirst({
        where: {
          socialProvider: 'GOOGLE',
          socialProviderId: googleUser.id
        },
        include: { accountRoles: true }
      });

      if (!account) {
        // 신규 계정 생성
        const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);

        account = await prisma.account.create({
          data: {
            username: googleUser.name || googleUser.email,
            email: googleUser.email,
            password: randomPassword,
            status: 'ACTIVE',
            socialProvider: 'GOOGLE',
            socialProviderId: googleUser.id,
            profileImageUrl: googleUser.picture,
            accountRoles: {
              create: [{ roleType: 'USER' }]
            }
          },
          include: { accountRoles: true }
        });
      }

      // 4. JWT 생성
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';

      const jwtAccessToken = jwt.sign(
        {
          accountId: account.accountId,
          email: account.email,
          roles: account.accountRoles.map(r => r.roleType)
        },
        jwtSecret,
        { expiresIn: '1h' }
      );

      const jwtRefreshToken = jwt.sign(
        { accountId: account.accountId },
        jwtRefreshSecret,
        { expiresIn: '7d' }
      );

      // 5. 토큰 저장
      await prisma.account.update({
        where: { accountId: account.accountId },
        data: {
          accessToken: jwtAccessToken,
          refreshToken: jwtRefreshToken
        }
      });

      return {
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken,
        user: account
      };
    } catch (error: any) {
      console.error('Google OAuth2 error:', error.response?.data || error.message);
      throw new Error('Google 로그인에 실패했습니다');
    }
  }

  /**
   * Kakao OAuth2 로그인 URL 생성
   */
  getKakaoAuthUrl(): string {
    const baseUrl = 'https://kauth.kakao.com/oauth/authorize';
    const params = new URLSearchParams({
      client_id: process.env.KAKAO_REST_API_KEY || '',
      redirect_uri: process.env.KAKAO_REDIRECT_URI || '',
      response_type: 'code',
      scope: 'profile_nickname,profile_image,account_email'
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Kakao OAuth2 콜백 처리
   */
  async handleKakaoCallback(code: string): Promise<OAuth2Result> {
    try {
      // 1. 액세스 토큰 교환
      const tokenResponse = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: process.env.KAKAO_REST_API_KEY || '',
          client_secret: process.env.KAKAO_CLIENT_SECRET || '',
          redirect_uri: process.env.KAKAO_REDIRECT_URI || '',
          code
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      const { access_token } = tokenResponse.data;

      // 2. 사용자 정보 가져오기
      const userInfoResponse = await axios.get(
        'https://kapi.kakao.com/v2/user/me',
        {
          headers: { Authorization: `Bearer ${access_token}` }
        }
      );

      const kakaoUser = userInfoResponse.data;

      // 3. 계정 찾기 또는 생성
      let account = await prisma.account.findFirst({
        where: {
          socialProvider: 'KAKAO',
          socialProviderId: kakaoUser.id.toString()
        },
        include: { accountRoles: true }
      });

      if (!account) {
        // 신규 계정 생성
        const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);

        account = await prisma.account.create({
          data: {
            username: kakaoUser.properties?.nickname || `kakao_${kakaoUser.id}`,
            email: kakaoUser.kakao_account?.email,
            password: randomPassword,
            status: 'ACTIVE',
            socialProvider: 'KAKAO',
            socialProviderId: kakaoUser.id.toString(),
            profileImageUrl: kakaoUser.properties?.profile_image,
            accountRoles: {
              create: [{ roleType: 'USER' }]
            }
          },
          include: { accountRoles: true }
        });
      }

      // 4. JWT 생성
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';

      const jwtAccessToken = jwt.sign(
        {
          accountId: account.accountId,
          email: account.email,
          roles: account.accountRoles.map(r => r.roleType)
        },
        jwtSecret,
        { expiresIn: '1h' }
      );

      const jwtRefreshToken = jwt.sign(
        { accountId: account.accountId },
        jwtRefreshSecret,
        { expiresIn: '7d' }
      );

      // 5. 토큰 저장
      await prisma.account.update({
        where: { accountId: account.accountId },
        data: {
          accessToken: jwtAccessToken,
          refreshToken: jwtRefreshToken
        }
      });

      return {
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken,
        user: account
      };
    } catch (error: any) {
      console.error('Kakao OAuth2 error:', error.response?.data || error.message);
      throw new Error('Kakao 로그인에 실패했습니다');
    }
  }
}
