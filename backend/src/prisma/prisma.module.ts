import { Global, Module } from '@nestjs/common';
import { WorkschdPrismaService } from './workschd-prisma.service';
import { InvestandPrismaService } from './investand-prisma.service';
import { AviationPrismaService } from './aviation-prisma.service';
import { AiprPrismaService } from './aipr-prisma.service';

@Global()
@Module({
  providers: [WorkschdPrismaService, InvestandPrismaService, AviationPrismaService, AiprPrismaService],
  exports: [WorkschdPrismaService, InvestandPrismaService, AviationPrismaService, AiprPrismaService],
})
export class PrismaModule {}
