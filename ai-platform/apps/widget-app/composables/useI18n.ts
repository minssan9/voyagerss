type Locale = 'en' | 'ko' | 'ja';

const messages: Record<Locale, Record<string, string>> = {
  en: {
    title:       'Send Feedback',
    labelTitle:  'Title',
    labelBody:   'Description',
    labelEmail:  'Email (optional)',
    labelFile:   'Screenshot (optional)',
    submit:      'Send',
    submitting:  'Sending…',
    success:     'Thanks! Your feedback has been submitted.',
    errorTitle:  'Title is required',
    errorBody:   'Description is required (min 10 chars)',
    errorEmail:  'Enter a valid email address',
    errorFile:   'File must be an image under 10MB',
    close:       'Close',
  },
  ko: {
    title:       '피드백 보내기',
    labelTitle:  '제목',
    labelBody:   '내용',
    labelEmail:  '이메일 (선택)',
    labelFile:   '스크린샷 (선택)',
    submit:      '보내기',
    submitting:  '전송 중…',
    success:     '감사합니다! 피드백이 접수되었습니다.',
    errorTitle:  '제목을 입력해주세요',
    errorBody:   '내용을 입력해주세요 (최소 10자)',
    errorEmail:  '올바른 이메일 주소를 입력해주세요',
    errorFile:   '이미지 파일 (10MB 이하)만 가능합니다',
    close:       '닫기',
  },
  ja: {
    title:       'フィードバックを送る',
    labelTitle:  'タイトル',
    labelBody:   '内容',
    labelEmail:  'メール（任意）',
    labelFile:   'スクリーンショット（任意）',
    submit:      '送信',
    submitting:  '送信中…',
    success:     'ありがとうございます！フィードバックを受け付けました。',
    errorTitle:  'タイトルを入力してください',
    errorBody:   '内容を入力してください（最低10文字）',
    errorEmail:  '有効なメールアドレスを入力してください',
    errorFile:   '画像ファイル（10MB以下）のみ対応しています',
    close:       '閉じる',
  },
};

export function useI18n(overrides?: Record<string, string>) {
  const locale = ref<Locale>('ko');

  if (typeof window !== 'undefined') {
    const urlLocale = new URLSearchParams(window.location.search).get('locale');
    const navLang = navigator.language?.slice(0, 2) as Locale;
    locale.value = (urlLocale as Locale) || (['en','ko','ja'].includes(navLang) ? navLang : 'ko');
  }

  const t = (key: string): string =>
    overrides?.[key] ?? messages[locale.value]?.[key] ?? messages.en[key] ?? key;

  return { t, locale };
}
