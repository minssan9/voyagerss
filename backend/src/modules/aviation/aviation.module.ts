import { Module } from '@nestjs/common';
import { AviationService } from './aviation.service';
import { AviationNestController } from './aviation.controller';

@Module({
  controllers: [AviationNestController],
  providers: [AviationService],
})
export class AviationModule {}
