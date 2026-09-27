import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export interface AuthUser {
  accountId?: number;
  email: string;
  roles: string[];
  identityUserId?: string;
}

export interface WorkschdAuthUser extends AuthUser {
  accountId: number;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const CurrentWorkschdUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkschdAuthUser => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (user?.accountId == null) {
      throw new UnauthorizedException('Workschd account required');
    }
    return user as WorkschdAuthUser;
  },
);
