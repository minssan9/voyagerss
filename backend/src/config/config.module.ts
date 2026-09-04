import { Global, Module } from '@nestjs/common';
import { configService, ConfigService } from './config-service';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: configService,
    },
  ],
  exports: [ConfigService],
})
export class AppConfigModule {}
