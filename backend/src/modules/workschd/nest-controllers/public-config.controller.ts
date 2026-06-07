import { Controller, Get } from '@nestjs/common';
import { SystemConfigService } from '../services/SystemConfigService';

@Controller('workschd/config')
export class PublicConfigNestController {
  constructor(private readonly svc: SystemConfigService) {}

  @Get('public')
  async getPublicConfig() {
    const data = await this.svc.getPublicFrontendConfig();
    return { data };
  }
}
