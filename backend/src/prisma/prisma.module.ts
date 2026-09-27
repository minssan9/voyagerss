import { Global, Module } from '@nestjs/common';
import { WorkschdPrismaService } from './workschd-prisma.service';
import { AviationPrismaService } from './aviation-prisma.service';
import { AiprPrismaService } from './aipr-prisma.service';
import { RbacPrismaService } from './rbac-prisma.service';

@Global()
@Module({
  providers: [WorkschdPrismaService, AviationPrismaService, AiprPrismaService, RbacPrismaService],
  exports: [WorkschdPrismaService, AviationPrismaService, AiprPrismaService, RbacPrismaService],
})
export class PrismaModule {}
