import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { INVESTAND_PERMISSION_KEY, INVESTAND_ADMIN_ROLE_KEY } from '../guards/investand-permission.guard';

export const RequirePermission = (permission: string) => SetMetadata(INVESTAND_PERMISSION_KEY, permission);
export const RequireAdminRole = () => SetMetadata(INVESTAND_ADMIN_ROLE_KEY, true);

export const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().admin;
});
