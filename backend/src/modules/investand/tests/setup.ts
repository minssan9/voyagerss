import { config } from 'dotenv';
import path from 'path';

// Load environment variables for tests
config({ path: path.resolve(__dirname, '../../.env') });

// Set test environment variables if not present
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DART_API_KEY = process.env.DART_API_KEY || 'test-api-key';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};


