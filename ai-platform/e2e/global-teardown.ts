import { cleanupMocks } from './mocks/mock-servers';

export default async function globalTeardown() {
  cleanupMocks();
  console.log('[E2E] Mocks cleaned up');
}
