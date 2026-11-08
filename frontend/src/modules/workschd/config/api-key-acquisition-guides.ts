/**
 * Official API key acquisition references only (no secret values).
 * URLs verified against provider public documentation as of 2026-11.
 */

export interface GuideLink {
  label: string;
  href: string;
}

export interface ApiKeyAcquisitionGuide {
  configKey: string;
  title: string;
  steps: string[];
  links: GuideLink[];
  notes?: string[];
}

export const API_KEY_ACQUISITION_GUIDES: Record<string, ApiKeyAcquisitionGuide> = {
  DART_API_KEY: {
    configKey: 'DART_API_KEY',
    title: 'OpenDART 인증키 (40자리)',
    steps: [
      '금융감독원 OpenDART(https://opendart.fss.or.kr)에서 회원 가입 후 로그인합니다.',
      '상단 메뉴 「인증키 신청/관리」→「인증키 신청」에서 오픈API 이용약관에 동의하고 신청서(사용 환경·용도 등)를 제출합니다.',
      '개인 회원은 신청 완료 후 즉시, 기업 회원은 담당자 승인(안내상 1~2영업일) 후 인증키가 발급됩니다(공식 신청 화면 참고).',
      '발급된 40자리 인증키를 아래 입력란에 저장합니다. 기존 키는 「인증키 신청/관리」→「인증키 관리」에서 확인합니다(로그인 필요).',
    ],
    links: [
      { label: 'https://opendart.fss.or.kr/', href: 'https://opendart.fss.or.kr/' },
      {
        label: 'https://opendart.fss.or.kr/uss/umt/EgovMberInsertView.do',
        href: 'https://opendart.fss.or.kr/uss/umt/EgovMberInsertView.do',
      },
      {
        label: 'https://opendart.fss.or.kr/guide/main.do?apiGrpCd=DS001',
        href: 'https://opendart.fss.or.kr/guide/main.do?apiGrpCd=DS001',
      },
    ],
    notes: [
      'OpenDART 이용약관에 따라 인증키는 타인에게 양도·대여할 수 없습니다.',
      '오픈API는 이용횟수 허용량 제한이 있으며, 상세는 OpenDART 홈페이지 공지를 따릅니다.',
    ],
  },
  FRED_API_KEY: {
    configKey: 'FRED_API_KEY',
    title: 'FRED API Key (32자 영숫자)',
    steps: [
      'FRED API는 모든 요청에 api_key 파라미터가 필요합니다(FRED 공식 API 문서).',
      'fredaccount.stlouisfed.org 계정으로 로그인한 뒤 API 키를 발급·조회합니다(키 조회도 로그인 필요).',
      '애플리케이션마다 별도 키 발급을 권장합니다(공식 문서).',
      '발급받은 키를 아래 입력란에 저장합니다.',
    ],
    links: [
      {
        label: 'https://fred.stlouisfed.org/docs/api/api_key.html',
        href: 'https://fred.stlouisfed.org/docs/api/api_key.html',
      },
      {
        label: 'https://fred.stlouisfed.org/docs/api/fred/',
        href: 'https://fred.stlouisfed.org/docs/api/fred/',
      },
      {
        label: 'https://fredaccount.stlouisfed.org/',
        href: 'https://fredaccount.stlouisfed.org/',
      },
    ],
  },
  DATA_GO_KR_SERVICE_KEY: {
    configKey: 'DATA_GO_KR_SERVICE_KEY',
    title: '공공데이터포털 서비스키 (관세청 품목·국가별 수출입)',
    steps: [
      '공공데이터포털(https://www.data.go.kr) 회원 가입·로그인 후, Voyagerss가 호출하는 API「관세청_품목별 국가별 수출입실적(GW)」상세 페이지에서 「활용신청」을 합니다.',
      '활용승인: 개발단계는 자동승인, 운영단계는 심의승인(해당 데이터셋 상세 페이지 표기).',
      '마이페이지에서 발급된 일반 인증키(Encoding/Decoding)를 확인합니다. Voyagerss 백엔드는 요청 시 encodeURIComponent로 serviceKey를 넣으므로 보통 Decoding(일반) 키 문자열을 그대로 저장하면 됩니다(포털 Swagger 안내도 Decoding 키 입력).',
      '아래 입력란에 키를 저장한 뒤, PD_KOREA_TRADE_UNIVERSE_JSON으로 HS·국가 조합을 제한하세요.',
    ],
    links: [
      { label: 'https://www.data.go.kr/index.do', href: 'https://www.data.go.kr/index.do' },
      {
        label: 'https://www.data.go.kr/data/15100475/openapi.do',
        href: 'https://www.data.go.kr/data/15100475/openapi.do',
      },
      {
        label: 'https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList',
        href: 'https://apis.data.go.kr/1220000/nitemtrade/getNitemtradeList',
      },
      {
        label: 'https://www.data.go.kr/ugs/selectPublicDataUseGuideView.do',
        href: 'https://www.data.go.kr/ugs/selectPublicDataUseGuideView.do',
      },
    ],
    notes: [
      '해당 API 상세: 개발계정 일 10,000건 트래픽(표기), 조회 기간 strtYymm~endYymm 1년 이내(필수 파라미터).',
      '응답 포맷은 XML이며, Voyagerss는 type=json 쿼리도 요청합니다(제공 문서·구현 확인).',
      '회사·개인 단위 무역이 아닌 국가×HS 품목 집계 통계입니다.',
    ],
  },
};

export function guideForConfigKey(key: string): ApiKeyAcquisitionGuide | undefined {
  return API_KEY_ACQUISITION_GUIDES[key];
}
