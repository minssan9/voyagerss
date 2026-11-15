import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';

const providers = new Set(['google', 'kakao']);

@Controller('oauth2/authorization')
export class LegacyOAuthController {
  @Get(':provider')
  redirect(@Param('provider') provider: string, @Res() res: Response) {
    if (!providers.has(provider)) {
      return res.status(404).json({ message: 'Not Found', error: 'Not Found', statusCode: 404 });
    }
    return res.redirect(`/api/identity/auth/${provider}`);
  }
}
