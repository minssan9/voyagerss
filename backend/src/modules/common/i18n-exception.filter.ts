import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { I18nHttpException } from './i18n-http.exception';
import { tApi } from './i18n-locale';

@Catch(I18nHttpException)
export class I18nExceptionFilter implements ExceptionFilter {
  catch(exception: I18nHttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(exception.getStatus()).json({
      result: 'ERROR',
      message: tApi(exception.code, exception.params),
      data: null,
    });
  }
}
