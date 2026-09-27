import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { IdentityPrismaService } from './identity-prisma.service';
import { IdentityService } from './identity.service';
import { IdentityOAuthService } from './identity-oauth.service';
import { IdentityAuthController } from './identity-auth.controller';
import { WorkschdAuthModule } from '../workschd/workschd-auth.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    forwardRef(() => WorkschdAuthModule),
    RbacModule,
  ],
  controllers: [IdentityAuthController],
  providers: [IdentityPrismaService, IdentityService, IdentityOAuthService],
  exports: [IdentityPrismaService, IdentityService, IdentityOAuthService],
})
export class IdentityModule {}
