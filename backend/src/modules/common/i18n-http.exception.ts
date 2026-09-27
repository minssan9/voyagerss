import { HttpException, HttpStatus } from '@nestjs/common';
import { tApi } from './i18n-locale';

export class I18nHttpException extends HttpException {
  readonly code: string;
  readonly params?: Record<string, string | number>;

  constructor(
    code: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    params?: Record<string, string | number>,
  ) {
    super(tApi(code, params), status);
    this.code = code;
    this.params = params;
  }
}
