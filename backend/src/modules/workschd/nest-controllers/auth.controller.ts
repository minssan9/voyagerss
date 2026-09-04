import { Controller, Post, Get, Body, Query, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from '../services/AuthService';
import { AccountService } from '../services/AccountService';
import { OAuth2Service } from '../services/OAuth2Service';
import { ConfigService } from '../../../config/config-service';

@Controller('workschd/auth')
export class AuthNestController {
  constructor(
    private readonly authService: AuthService,
    private readonly accountService: AccountService,
    private readonly oauth2Service: OAuth2Service,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() body: { email: string; password: string; username: string }, @Res() res: Response) {
    try {
      const account = await this.authService.signup(body.email, body.password, body.username);
      return res.status(201).json({ accountId: account.accountId, email: account.email });
    } catch (err: any) {
      if (err.status === 409) return res.status(409).json({ message: err.message });
      return res.status(500).json({ message: '회원가입에 실패했습니다' });
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { email: string; password: string }, @Res() res: Response) {
    const result = await this.authService.login(body.email, body.password);
    if (!result) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.setHeader('Authorization', `Bearer ${result.accessToken}`);
    res.setHeader('RefreshToken', result.refreshToken);
    return res.json(result.accessToken);
  }

  @Get('google')
  googleAuth(@Res() res: Response) {
    const authUrl = this.oauth2Service.getGoogleAuthUrl();
    return res.redirect(authUrl);
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:8080')!;
    if (!code) return res.redirect(`${frontendUrl}/login?error=missing_code`);
    try {
      const result = await this.oauth2Service.handleGoogleCallback(code);
      return res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
      );
    } catch {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }

  @Get('kakao')
  kakaoAuth(@Res() res: Response) {
    const authUrl = this.oauth2Service.getKakaoAuthUrl();
    return res.redirect(authUrl);
  }

  @Get('kakao/callback')
  async kakaoCallback(@Query('code') code: string, @Res() res: Response) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:8080')!;
    if (!code) return res.redirect(`${frontendUrl}/login?error=missing_code`);
    try {
      const result = await this.oauth2Service.handleKakaoCallback(code);
      return res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
      );
    } catch {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }
}
