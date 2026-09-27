// Profiles collected from https://www.funeralhallinfo.com/funeral-home/{id}/ on 2026-09-27.
// Phone is omitted: those pages did not publish a telephone number.
// Scraper homes keep the listing URL used by backend/src/modules/workschd/scraper.

export interface IncheonFuneralHomeSeed {
  name: string
  district: string | null
  address: string | null
  roomCount: number | null
  homeUrl: string
  listingUrl: string
  hasScraper: boolean
}

export const incheonFuneralHomes: IncheonFuneralHomeSeed[] = [
  { name: '인천금강장례식장', district: '미추홀구', address: '인천광역시 미추홀구 인주대로 452 (주안동, 금강요양병원)', roomCount: 7, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1161/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1161/', hasScraper: false },
  { name: '성인천병원 장례식장', district: '미추홀구', address: '인천광역시 미추홀구 석정로 6 (숭의동, 인천한방병원)', roomCount: 9, homeUrl: 'https://www.seongincheon.co.kr', listingUrl: 'https://www.seongincheon.co.kr', hasScraper: true },
  { name: '계양세종병원 장례식장', district: '계양구', address: '인천광역시 계양구 계양문화로 20 (작전동, 인천세종병원)', roomCount: 7, homeUrl: 'https://gyeyangse.funeralhow.com', listingUrl: 'https://gyeyangse.funeralhow.com', hasScraper: true },
  { name: '강화병원장례식장', district: '강화군', address: '인천광역시 강화군 강화읍 강화대로312번길 11 (갑곳리, 강화병원)', roomCount: 3, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1100/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1100/', hasScraper: false },
  { name: '강화장례식장', district: '강화군', address: '인천광역시 강화군 강화읍 중앙로74번길 16 (남산리)', roomCount: 4, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/998/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/998/', hasScraper: false },
  { name: '검단탑종합병원 장례식장', district: '서구', address: '인천광역시 서구 청마로19번길 5 (당하동)', roomCount: 4, homeUrl: 'https://www.gdtop.co.kr', listingUrl: 'https://www.gdtop.co.kr', hasScraper: true },
  { name: '국제성모병원 장례식장', district: '서구', address: '인천광역시 서구 심곡로100번길 25 (심곡동, 인천국제성모병원)', roomCount: 15, homeUrl: 'https://www.ish.ac.kr', listingUrl: 'https://www.ish.ac.kr', hasScraper: true },
  { name: '인천병원장례식장', district: '부평구', address: '인천광역시 부평구 무네미로 446 (구산동, 인천중앙병원)', roomCount: 3, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/829/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/829/', hasScraper: false },
  { name: '길병원 장례식장', district: '남동구', address: '인천광역시 남동구 인주대로653번길 56 (구월동, 길병원장례식장)', roomCount: 10, homeUrl: 'https://www.gilhospital.com', listingUrl: 'https://www.gilhospital.com', hasScraper: true },
  { name: '남동스카이장례식장', district: '남동구', address: '인천광역시 남동구 앵고개로697번길 41 (고잔동, 남동스카이장례식장)', roomCount: 10, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1284/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1284/', hasScraper: false },
  { name: '연수장례식장', district: '연수구', address: '인천광역시 연수구 벚꽃로 122 (연수동)', roomCount: 5, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1409/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1409/', hasScraper: false },
  { name: '인천보람장례식장', district: '서구', address: '인천광역시 서구 경명대로 468 (경서동)', roomCount: 5, homeUrl: 'https://www.boramincheon.com', listingUrl: 'https://www.boramincheon.com', hasScraper: true },
  { name: '비에스종합병원장례식장', district: '강화군', address: '인천광역시 강화군 강화읍 충렬사로 31, 비에스종합병원 별관 (남산리)', roomCount: 5, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/909/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/909/', hasScraper: false },
  { name: '새천년장례식장', district: '계양구', address: '인천광역시 계양구 아나지로 541 (서운동)', roomCount: 5, homeUrl: 'http://www.saecheonnyeon.co.kr', listingUrl: 'http://www.saecheonnyeon.co.kr', hasScraper: true },
  { name: '서해장례문화원', district: '강화군', address: '인천광역시 강화군 강화읍 중앙로74번길 10 (남산리)', roomCount: 4, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1082/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1082/', hasScraper: false },
  { name: '성민병원장례식장', district: '서구', address: '인천광역시 서구 칠천왕로33번길 17 (석남동)', roomCount: 2, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/952/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/952/', hasScraper: false },
  { name: '하나장례식장', district: '미추홀구', address: '인천광역시 미추홀구 아암대로253번길 36 (학익동 587-78) 송도하나요양병원 - 송도하나장례문화원', roomCount: 4, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1077/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1077/', hasScraper: false },
  { name: '인천 쉴낙원 장례식장', district: '계양구', address: '인천광역시 계양구 아나지로 552 (서운동)', roomCount: 11, homeUrl: 'https://www.shillakwon.com', listingUrl: 'https://www.shillakwon.com/bbs/board.php?bo_table=find_user', hasScraper: true },
  { name: '세림병원장례식장', district: '부평구', address: '인천광역시 부평구 부평대로 175 (청천동, 부평세림병원)', roomCount: 7, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1318/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1318/', hasScraper: false },
  { name: '예지장례식장', district: '중구', address: '인천광역시 중구 개항로 82.2층예지장례식장 (경동, 예지요양병원)', roomCount: 3, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/578/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/578/', hasScraper: false },
  { name: '온누리장례식장', district: '서구', address: '인천광역시 서구 완정로 199 (왕길동)', roomCount: 2, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1232/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1232/', hasScraper: false },
  { name: '인천가족공원장례식장', district: '남동구', address: '인천광역시 남동구 만월북로 115 (간석동, 인천가족공원장례식장)', roomCount: 3, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1550/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1550/', hasScraper: false },
  { name: '인천광역시의료원 장례식장', district: '동구', address: '인천광역시 동구 방축로 217 (송림동, 인천광역시의료원)', roomCount: 8, homeUrl: 'https://www.icmc.or.kr', listingUrl: 'https://www.icmc.or.kr/guide/guide13.php?tsort=4&msort=50&ssort=57', hasScraper: true },
  { name: '인천기독병원장례식장', district: '중구', address: '인천광역시 중구 답동로30번길 10 (율목동, 인천기독병원)', roomCount: 3, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/534/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/534/', hasScraper: false },
  { name: '인천사랑병원장례식장', district: '미추홀구', address: '인천광역시 미추홀구 미추홀대로 726 (주안동, 인천사랑병원)', roomCount: 4, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1259/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1259/', hasScraper: false },
  { name: '삼성장례문화원', district: '중구', address: '인천광역시 중구 우현로62번길 34-1 (경동)', roomCount: 3, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1194/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1194/', hasScraper: false },
  { name: '인천성모장례식장', district: '부평구', address: '인천광역시 부평구 동수로 56 (부평동, 가톨릭대학교인천성모병원)', roomCount: 11, homeUrl: 'http://icfh.catholicfuneral.co.kr', listingUrl: 'http://icfh.catholicfuneral.co.kr/cmm/main/mainPage.do', hasScraper: true },
  { name: '인천연세병원장례식장', district: '서구', address: '인천광역시 서구 승학로 320지하장례식장 (연희동, 연세병원)', roomCount: 2, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/776/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/776/', hasScraper: false },
  { name: '인천적십자병원 장례식장', district: '연수구', address: '인천광역시 연수구 원인재로 263 (연수동,인천적십자병원장례식장)', roomCount: 9, homeUrl: 'http://www.rchfuneral.co.kr', listingUrl: 'http://www.rchfuneral.co.kr', hasScraper: true },
  { name: '인천힘찬병원장례식장', district: '남동구', address: '인천광역시 남동구 논현로 72,지하1층 (논현동, 힘찬종합병원)', roomCount: 7, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1542/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1542/', hasScraper: false },
  { name: '인하대병원 장례식장', district: '중구', address: '인천광역시 중구 인항로 27 (신흥동3가, 인하대학병원)', roomCount: 8, homeUrl: 'https://www.inha.com/site/funeral/main', listingUrl: 'https://www.inha.com/site/funeral/hall/deceased', hasScraper: true },
  { name: '참사랑장례식장', district: '강화군', address: '인천광역시 강화군 선원면 중앙로 271 (창리, 참사랑장례식장)', roomCount: 3, homeUrl: 'https://www.funeralhallinfo.com/funeral-home/1468/', listingUrl: 'https://www.funeralhallinfo.com/funeral-home/1468/', hasScraper: false },
  { name: '송림청기와 장례식장', district: '동구', address: '인천광역시 동구 방축로177번길 23 (송림동)', roomCount: 11, homeUrl: 'https://www.cheonggiwwa.com', listingUrl: 'https://www.cheonggiwwa.com', hasScraper: true },
  { name: '계양청기와 장례식장', district: '계양구', address: '인천광역시 계양구 아나지로 559 (서운동)', roomCount: 11, homeUrl: 'https://www.gyeyangcheonggiwwa.co.kr', listingUrl: 'https://www.gyeyangcheonggiwwa.co.kr', hasScraper: true },
  { name: '인천시민장례식장', district: '미추홀구', address: '인천광역시 미추홀구 석정로64번길 22 (숭의동, 시민장례식장)', roomCount: 4, homeUrl: 'http://siminfh.com', listingUrl: 'http://siminfh.com', hasScraper: true },
  { name: '한림병원 장례식장', district: '계양구', address: '인천광역시 계양구 장제로 722,한림병원신관B2층 (작전동)', roomCount: 6, homeUrl: 'https://www.hallym.co.kr', listingUrl: 'https://www.hallym.co.kr', hasScraper: true },
  { name: '간석장례식장', district: null, address: null, roomCount: null, homeUrl: 'http://www.gansukfuneral.co.kr', listingUrl: 'http://www.gansukfuneral.co.kr', hasScraper: true },
]
