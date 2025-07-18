// Jest test setup file
// This file is executed before each test file

// Global test configuration
jest.setTimeout(30000); // 30 second timeout for API calls

// Mock console methods for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Reset console mocks before each test
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
export const testUtils = {
  // Mock server config for testing
  getMockConfig: () => ({
    domain: 'test-domain',
    username: 'test@example.com',
    apiKey: 'test-api-key',
    timeout: 5000,
    rateLimit: 10,
    transport: 'stdio' as const,
    debug: false
  }),
  
  // Wait utility for async tests
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};