import { Module } from '@nestjs/common';
import { InvestandAdminGuard } from './guards/investand-admin.guard';
import { InvestandPermissionGuard } from './guards/investand-permission.guard';
import { MarketDataNestController } from './nest-controllers/market-data.controller';
import { SectorNestController } from './nest-controllers/sector.controller';
import { GlobalAssetNestController } from './nest-controllers/global-asset.controller';
import { FindashNestController } from './nest-controllers/findash.controller';
import { FearGreedNestController } from './nest-controllers/fear-greed.controller';
import { AdminNestController } from './nest-controllers/admin.controller';
import { DartNestController } from './nest-controllers/dart.controller';

@Module({
  controllers: [
    MarketDataNestController,
    SectorNestController,
    GlobalAssetNestController,
    FindashNestController,
    FearGreedNestController,
    AdminNestController,
    DartNestController,
  ],
  providers: [InvestandAdminGuard, InvestandPermissionGuard],
})
export class InvestandModule {}
