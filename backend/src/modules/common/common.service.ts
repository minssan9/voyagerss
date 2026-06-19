import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config-service';
import ko from './i18n/ko.json';
import en from './i18n/en.json';

const I18N_BY_LANGUAGE: Record<string, Record<string, unknown>> = {
  ko,
  en,
};

@Injectable()
export class CommonService {
  constructor(private readonly configService: ConfigService) {}

  getSysI18n(language: string): Record<string, unknown> {
    const lang = (language || 'ko').toLowerCase().split('-')[0];
    return I18N_BY_LANGUAGE[lang] ?? {};
  }

  getSysConf(code: string): Record<string, unknown> {
    const value = this.configService.get(code);
    if (value == null || value === '') {
      return {};
    }
    return { code, value };
  }
}
