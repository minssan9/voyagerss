import { Controller, Get, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../workschd/guards/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../../workschd/decorators/user.decorator';
import { RbacService } from '../rbac.service';

@Controller('rbac')
export class RbacMeController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: AuthUser) {
    const userId = user.identityUserId;
    if (!userId) {
      throw new UnauthorizedException('Identity user id required');
    }

    return {
      result: 'SUCCESS' as const,
      data: await this.rbacService.getMeProfile(userId),
    };
  }
}
