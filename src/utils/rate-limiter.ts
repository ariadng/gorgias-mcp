import { Logger } from './logger.js';

export class RateLimiter {
  private requests: number[] = [];
  private requestsPerWindow: number;
  private windowMs: number;
  private logger: Logger;

  constructor(requestsPerWindow: number = 40, windowMs: number = 20000, logger?: Logger) {
    this.requestsPerWindow = requestsPerWindow;
    this.windowMs = windowMs;
    this.logger = logger || new Logger();
  }

  async checkLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => time > windowStart);
    
    if (this.requests.length >= this.requestsPerWindow) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.windowMs - now;
      
      if (waitTime > 0) {
        this.logger.warn(`Rate limit reached. Waiting ${waitTime}ms before next request.`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.checkLimit();
      }
    }
    
    this.requests.push(now);
    this.logger.debug(`Rate limiter: ${this.requests.length}/${this.requestsPerWindow} requests in current window`);
  }

  getRemainingRequests(): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const currentRequests = this.requests.filter(time => time > windowStart);
    return Math.max(0, this.requestsPerWindow - currentRequests.length);
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    const oldestRequest = this.requests[0];
    return oldestRequest + this.windowMs;
  }
}