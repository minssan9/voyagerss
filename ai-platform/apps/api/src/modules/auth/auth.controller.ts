import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({ refreshToken: z.string() });

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/auth/login */
  @Post('login')
  async login(@Body() body: unknown) {
    const result = LoginSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.authService.login(result.data.email, result.data.password);
  }

  /** POST /api/auth/refresh */
  @Post('refresh')
  async refresh(@Body() body: unknown) {
    const result = RefreshSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.flatten());
    return this.authService.refresh(result.data.refreshToken);
  }
}
