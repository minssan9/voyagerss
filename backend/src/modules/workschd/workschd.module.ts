import { Module } from '@nestjs/common';
import { WorkschdAuthModule } from './workschd-auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { TaskOwnerGuard } from './guards/task-owner.guard';
import { TeamOwnerGuard } from './guards/team-owner.guard';

import { AccountService } from './services/AccountService';
import { TaskService } from './services/TaskService';
import { TeamService } from './services/TeamService';
import { NotificationService } from './services/NotificationService';
import { ShopService } from './services/ShopService';
import { AccountScheduleService } from './services/AccountScheduleService';
import { StatisticsService } from './services/StatisticsService';
import { SystemConfigService } from './services/SystemConfigService';
import { FeedbackService } from './services/FeedbackService';

import { AuthNestController } from './nest-controllers/auth.controller';
import { AccountNestController } from './nest-controllers/account.controller';
import { TeamNestController } from './nest-controllers/team.controller';
import { TaskNestController } from './nest-controllers/task.controller';
import { NotificationNestController } from './nest-controllers/notification.controller';
import { ShopNestController } from './nest-controllers/shop.controller';
import { StatisticsNestController } from './nest-controllers/statistics.controller';
import { ScraperNestController } from './nest-controllers/scraper.controller';
import { SystemConfigNestController } from './nest-controllers/system-config.controller';
import { PublicConfigNestController } from './nest-controllers/public-config.controller';
import { FeedbackNestController } from './nest-controllers/feedback.controller';

@Module({
  imports: [WorkschdAuthModule, RbacModule],
  controllers: [
    AuthNestController,
    AccountNestController,
    TeamNestController,
    TaskNestController,
    NotificationNestController,
    ShopNestController,
    StatisticsNestController,
    ScraperNestController,
    SystemConfigNestController,
    PublicConfigNestController,
    FeedbackNestController,
  ],
  providers: [
    AccountService,
    TaskService,
    TeamService,
    NotificationService,
    ShopService,
    AccountScheduleService,
    StatisticsService,
    SystemConfigService,
    FeedbackService,
    TaskOwnerGuard,
    TeamOwnerGuard,
  ],
})
export class WorkschdModule {}
