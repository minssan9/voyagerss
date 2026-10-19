import { Module } from '@nestjs/common';
import { AirspaceCamera } from './airspace-camera';
import { AirspaceController } from './airspace.controller';
import {
  AIRSPACE_HISTORY_REPO,
  AirspaceHistoryRepo,
  AirspaceHistoryService,
  PrismaAirspaceHistoryRepo,
} from './airspace-history.service';
import { AirspaceStore } from './airspace.store';

function historyRepo(): AirspaceHistoryRepo | null {
  if (!process.env.DATABASE_URL) return null;
  // DB 가 설정된 경우에만 Prisma 클라이언트를 불러온다 (connect 는 첫 쿼리 때).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client-airspace');
  return new PrismaAirspaceHistoryRepo(new PrismaClient());
}

@Module({
  controllers: [AirspaceController],
  providers: [
    AirspaceStore,
    AirspaceCamera,
    AirspaceHistoryService,
    { provide: AIRSPACE_HISTORY_REPO, useFactory: historyRepo },
  ],
})
export class AirspaceModule {}
