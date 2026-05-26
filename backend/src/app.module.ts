import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { WorkschdModule } from './modules/workschd/workschd.module';
import { InvestandModule } from './modules/investand/investand.module';
import { AviationModule } from './modules/aviation/aviation.module';

@Module({
  imports: [AppConfigModule, PrismaModule, WorkschdModule, InvestandModule, AviationModule],
})
export class AppModule {}
