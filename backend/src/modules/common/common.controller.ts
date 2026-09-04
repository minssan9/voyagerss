import { Controller, Get, Param, Query } from '@nestjs/common';
import { CommonService } from './common.service';

@Controller('common')
export class CommonController {
  constructor(private readonly commonService: CommonService) {}

  @Get('sys-i18n')
  getSysI18n(@Query('language') language = 'ko') {
    return this.commonService.getSysI18n(language);
  }

  @Get('sys/conf/:code')
  getSysConf(@Param('code') code: string) {
    return this.commonService.getSysConf(code);
  }
}
