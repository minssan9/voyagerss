import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeedbackService } from '../feedback/feedback.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SettingsController } from './settings.controller';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: 'plan' }, { name: 'build' }),
  ],
  controllers: [AdminController, SettingsController],
  providers: [AdminService, FeedbackService],
})
export class AdminModule {}
