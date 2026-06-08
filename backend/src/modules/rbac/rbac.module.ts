import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacGuard } from './guards/rbac.guard';
import { RbacAdminController } from './controllers/rbac-admin.controller';

@Module({
  controllers: [RbacAdminController],
  providers: [RbacService, RbacGuard],
  exports: [RbacService, RbacGuard],
})
export class RbacModule {}
