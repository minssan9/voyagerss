import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RbacSyncService } from './rbac-sync.service';
import { RbacAssignmentService } from './rbac-assignment.service';
import { RbacGuard } from './guards/rbac.guard';
import { RbacAdminController } from './controllers/rbac-admin.controller';
import { RbacMeController } from './controllers/rbac-me.controller';

@Module({
  controllers: [RbacAdminController, RbacMeController],
  providers: [RbacService, RbacSyncService, RbacAssignmentService, RbacGuard],
  exports: [RbacService, RbacSyncService, RbacAssignmentService, RbacGuard],
})
export class RbacModule {}
