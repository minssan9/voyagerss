import { Module } from '@nestjs/common';
import { AirspaceController } from './airspace.controller';
import { AirspaceStore } from './airspace.store';

@Module({
  controllers: [AirspaceController],
  providers: [AirspaceStore],
})
export class AirspaceModule {}
