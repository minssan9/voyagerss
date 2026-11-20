import { Module } from '@nestjs/common';
import { ConsultingSubmissionController } from './nest-controllers/consulting-submission.controller';
import { ConsultingSubmissionService } from './services/consulting-submission.service';

@Module({
  controllers: [ConsultingSubmissionController],
  providers: [ConsultingSubmissionService],
})
export class ConsultingModule {}
