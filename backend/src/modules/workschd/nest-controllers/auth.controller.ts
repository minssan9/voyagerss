import { Controller, Post, Get, Body, Query, Res, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from '../services/AuthService';
import { OAuth2Service } from '../services/OAuth2Service';
import { ConfigService } from '../../../config/config-service';
import { tApi } from '../../common/i18n-locale';

@Controller('workschd/auth')
export class AuthNestController {
  constructor(
    private readonly authService: AuthService,
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
      return res.status(500).json({ message: tApi('auth.signupFailed') });
    }
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { email: string; password: string }, @Res() res: Response) {
    const result = await this.authService.login(body.email, body.password);
    if (!result) {
      return res.status(401).json({ message: tApi('auth.invalidCredentials') });
    }
    res.setHeader('Authorization', `Bearer ${result.accessToken}`);
    res.setHeader('RefreshToken', result.refreshToken);
    return res.json(result.accessToken);
  }

  @Get('google')
  googleAuth(@Req() req: Request, @Res() res: Response) {
    const prefix = req.protocol + '://' + req.get('host');
    return res.redirect(`${prefix}/api/identity/auth/google`);
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
  kakaoAuth(@Req() req: Request, @Res() res: Response) {
    const prefix = req.protocol + '://' + req.get('host');
    return res.redirect(`${prefix}/api/identity/auth/kakao`);
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
