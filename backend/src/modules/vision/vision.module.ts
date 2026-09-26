import { Module } from '@nestjs/common';
import { VisionConfigStore } from './vision-config.store';
import { VisionController } from './vision.controller';
import { VisionService } from './vision.service';

@Module({
  controllers: [VisionController],
  providers: [VisionConfigStore, VisionService],
})
export class VisionModule {}
