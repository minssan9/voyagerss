import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '../../config/config-service';
import { IdentityService } from './identity.service';
import { IdentityOAuthService } from './identity-oauth.service';
import { JwtAuthGuard } from '../workschd/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../workschd/decorators/user.decorator';

@Controller('identity/auth')
export class IdentityAuthController {
  constructor(
    private readonly identityService: IdentityService,
    private readonly oauthService: IdentityOAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }, @Res() res: Response) {
    const result = await this.identityService.passwordLogin(body.email, body.password);
    if (!result) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    res.setHeader('Authorization', `Bearer ${result.accessToken}`);
    res.setHeader('RefreshToken', result.refreshToken);
    return res.json({ accessToken: result.accessToken, refreshToken: result.refreshToken });
  }

  @Get('google')
  googleAuth(@Res() res: Response) {
    return res.redirect(this.oauthService.getGoogleAuthUrl());
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:8080')!;
    if (!code) return res.redirect(`${frontendUrl}/login?error=missing_code`);
    try {
      const result = await this.oauthService.handleGoogleCallback(code);
      return res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${result.tokens.accessToken}&refreshToken=${result.tokens.refreshToken}`,
      );
    } catch {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }

  @Get('kakao')
  kakaoAuth(@Res() res: Response) {
    return res.redirect(this.oauthService.getKakaoAuthUrl());
  }

  @Get('kakao/callback')
  async kakaoCallback(@Query('code') code: string, @Res() res: Response) {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:8080')!;
    if (!code) return res.redirect(`${frontendUrl}/login?error=missing_code`);
    try {
      const result = await this.oauthService.handleKakaoCallback(code);
      return res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${result.tokens.accessToken}&refreshToken=${result.tokens.refreshToken}`,
      );
    } catch {
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    if (!user.identityUserId) {
      throw new UnauthorizedException('Identity profile unavailable for legacy token');
    }

    const profile = await this.identityService.getMe(user.identityUserId);
    if (!profile) throw new UnauthorizedException('User not found');
    return profile;
  }
}
