import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacSyncService } from './rbac-sync.service';
import { RbacGuard } from './guards/rbac.guard';
import { RbacAdminController } from './controllers/rbac-admin.controller';

@Module({
  controllers: [RbacAdminController],
  providers: [RbacService, RbacSyncService, RbacGuard],
  exports: [RbacService, RbacSyncService, RbacGuard],
})
export class RbacModule {}
