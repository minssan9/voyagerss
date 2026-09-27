import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './modules/common/common.module';
import { WorkschdModule } from './modules/workschd/workschd.module';
import { AviationModule } from './modules/aviation/aviation.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { VisionModule } from './modules/vision/vision.module';
import { IdentityModule } from './modules/identity/identity.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    RbacModule,
    CommonModule,
    IdentityModule,
    WorkschdModule,
    AviationModule,
    VisionModule,
  ],
})
export class AppModule {}
