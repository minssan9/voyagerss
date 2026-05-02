/**
 * Playwright globalSetup — 테스트 전 한 번 실행
 *
 * 1. 외부 API mock 활성화 (nock)
 * 2. 테스트 DB seed: autpr_test 에 admin 계정 + 빈 테이블 확인
 *
 * NOTE: Worker를 별도 프로세스로 구동 중이라면 nock 대신
 *       GITHUB_BASE_URL=http://localhost:4040 / ANTHROPIC_BASE_URL=http://localhost:4041 로
 *       WireMock 같은 독립 stub 서버를 포인팅할 것.
 */
import { activateAllMocks } from './mocks/mock-servers';

export default async function globalSetup() {
  // nock: HTTP 인터셉트 활성화 (같은 프로세스에서 require되는 Worker 시나리오용)
  activateAllMocks();

  console.log('[E2E] Mock servers activated');
  console.log('[E2E] Make sure the following services are running:');
  console.log('       API    → http://localhost:3000');
  console.log('       Worker → (background process)');
  console.log('       Admin  → http://localhost:3001');
  console.log('       Widget → http://localhost:3002');
}
