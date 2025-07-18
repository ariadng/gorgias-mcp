export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private level: LogLevel;
  private timestamp: boolean;
  private colorize: boolean;
  private enabled: boolean;

  constructor(level: LogLevel = LogLevel.INFO, options: { timestamp?: boolean; colorize?: boolean } = {}) {
    this.level = level;
    this.timestamp = options.timestamp ?? true;
    
    // Detect MCP mode (start command without --debug)
    const isMCPMode = process.argv.includes('start') && !process.argv.includes('--debug');
    
    // Disable all logging in MCP mode to prevent JSON protocol interference
    this.enabled = !isMCPMode;
    this.colorize = isMCPMode ? false : (options.colorize ?? true);
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = this.timestamp ? new Date().toISOString() : '';
    const prefix = this.timestamp ? `[${timestamp}] [${level}]` : `[${level}]`;
    
    if (this.colorize) {
      const colors = {
        DEBUG: '\x1b[36m', // cyan
        INFO: '\x1b[32m',  // green
        WARN: '\x1b[33m',  // yellow
        ERROR: '\x1b[31m', // red
        RESET: '\x1b[0m'   // reset
      };
      
      const color = colors[level as keyof typeof colors] || '';
      return `${color}${prefix}\x1b[0m ${message}${args.length > 0 ? ' ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') : ''}`;
    }
    
    return `${prefix} ${message}${args.length > 0 ? ' ' + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ') : ''}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.enabled && this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage('DEBUG', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.enabled && this.level <= LogLevel.INFO) {
      console.info(this.formatMessage('INFO', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.enabled && this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage('WARN', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.enabled && this.level <= LogLevel.ERROR) {
      console.error(this.formatMessage('ERROR', message, ...args));
    }
  }
}