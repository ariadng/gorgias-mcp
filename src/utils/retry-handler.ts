import { Logger } from './logger.js';
import { ERROR_CODES } from '../types/gorgias.js';

export class RetryHandler {
  private maxAttempts: number;
  private baseDelay: number;
  private logger: Logger;

  constructor(maxAttempts: number = 3, baseDelay: number = 1000, logger?: Logger) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
    this.logger = logger || new Logger();
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxAttempts) {
          break;
        }
        
        if (this.shouldRetry(error)) {
          const delay = this.calculateDelay(attempt);
          this.logger.warn(`${operationName} failed (attempt ${attempt}/${this.maxAttempts}): ${lastError.message}. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          this.logger.error(`${operationName} failed with non-retryable error: ${lastError.message}`);
          break;
        }
      }
    }
    
    throw lastError!;
  }

  private shouldRetry(error: any): boolean {
    const message = error.message || '';
    const statusCode = error.response?.status;
    
    // Retry on rate limit, network errors, and 5xx server errors
    return (
      message.includes(ERROR_CODES.RATE_LIMIT_EXCEEDED) ||
      message.includes(ERROR_CODES.NETWORK_ERROR) ||
      (statusCode && statusCode >= 500) ||
      (statusCode === 408) || // Request timeout
      (statusCode === 429)    // Too many requests
    );
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }
}