import { localeStoreRun, resolveLocale, tApi } from './i18n-locale';

describe('api i18n', () => {
  it('defaults unknown languages to Korean', () => {
    expect(resolveLocale(undefined)).toBe('ko');
    expect(resolveLocale('fr-FR,en;q=0.8')).toBe('ko');
    expect(resolveLocale('en-US,en;q=0.9')).toBe('en');
  });

  it('translates a code for the active locale', () => {
    localeStoreRun('en', () => {
      expect(tApi('workschd.task.alreadyApplied')).toBe('You have already requested to join');
    });
    localeStoreRun('ko', () => {
      expect(tApi('vision.connectFailed', { detail: 'timeout' })).toBe('연결에 실패했습니다: timeout');
    });
  });

  it('falls back to Korean outside a request', () => {
    expect(tApi('auth.signupFailed')).toBe('회원가입에 실패했습니다');
  });
});
