export interface ServerConfig {
  domain: string;
  username: string;
  apiKey: string;
  timeout: number;
  rateLimit: number;
  transport: 'stdio' | 'sse';
  port?: number;
  host?: string;
  debug?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheExpiry?: number;
}

export interface GorgiasRateLimitConfig {
  requestsPerWindow: number;
  windowMs: number;
}

export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  timestamp: boolean;
  colorize: boolean;
}