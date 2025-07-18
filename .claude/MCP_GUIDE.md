# Complete MCP Server Development Guide

A comprehensive guide for building Model Context Protocol (MCP) servers based on analysis of the ClickUp MCP Server project.

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Core Dependencies](#core-dependencies)
4. [Essential Components](#essential-components)
5. [Implementation Patterns](#implementation-patterns)
6. [Configuration Management](#configuration-management)
7. [Error Handling Strategy](#error-handling-strategy)
8. [Testing Setup](#testing-setup)
9. [Build and Deployment](#build-and-deployment)
10. [AI Assistant Integration](#ai-assistant-integration)
11. [Best Practices](#best-practices)
12. [Step-by-Step Implementation](#step-by-step-implementation)

## Overview

MCP (Model Context Protocol) servers provide AI assistants with structured access to external services and APIs. This guide covers all aspects of building a production-ready MCP server.

### Key Benefits
- Standardized communication protocol between AI assistants and external services
- Type-safe tool definitions with JSON schemas
- Built-in error handling and validation
- Support for multiple transport protocols (STDIO, SSE)
- Seamless integration with Claude Desktop, Windsurf, Cursor, and other AI assistants

## Project Structure

```
your-mcp-server/
├── src/
│   ├── __tests__/              # Test files
│   │   ├── setup.ts           # Test configuration
│   │   └── *.test.ts          # Unit tests
│   ├── index.ts               # CLI entry point
│   ├── server.ts              # Main MCP server class
│   ├── tools/                 # Tool definitions and handlers
│   │   ├── handlers.ts        # Tool implementation logic
│   │   └── schemas.ts         # JSON schemas for tools
│   ├── types/                 # TypeScript type definitions
│   │   └── index.ts          # Shared interfaces and types
│   ├── utils/                 # Utility modules
│   │   ├── client.ts         # API client implementation
│   │   ├── logger.ts         # Logging utilities
│   │   ├── rate-limiter.ts   # Rate limiting logic
│   │   ├── retry-handler.ts  # Retry mechanism
│   │   └── validation.ts     # Input validation
│   └── transports/           # Transport implementations (optional)
├── dist/                     # Compiled JavaScript output
├── package.json             # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── jest.config.js          # Test configuration
├── README.md              # Project documentation
└── LICENSE               # License file
```

## Core Dependencies

### Required Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^0.4.0",  // Core MCP SDK
  "axios": "^1.6.0",                      // HTTP client
  "commander": "^11.0.0",                 // CLI framework
  "dotenv": "^16.0.0"                     // Environment variables
}
```

### Development Dependencies
```json
{
  "@types/node": "^20.0.0",               // Node.js type definitions
  "typescript": "^5.0.0",                 // TypeScript compiler
  "tsx": "^4.0.0",                        // TypeScript execution
  "jest": "^29.0.0",                      // Testing framework
  "@types/jest": "^29.0.0",               // Jest type definitions
  "ts-jest": "^29.0.0"                    // Jest TypeScript support
}
```

## Essential Components

### 1. Server Configuration Interface

```typescript
export interface ServerConfig {
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
```

### 2. Error Handling Types

```typescript
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export const ERROR_CODES = {
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;
```

### 3. Tool Schema Structure

```typescript
export const TOOL_SCHEMAS = {
  your_tool_name: {
    name: "your_tool_name",
    description: "Clear description of what this tool does and when to use it",
    inputSchema: {
      type: "object",
      properties: {
        required_param: {
          type: "string",
          description: "Description of this parameter"
        },
        optional_param: {
          type: "integer",
          description: "Optional parameter description"
        }
      },
      required: ["required_param"]
    }
  }
};
```

## Implementation Patterns

### 1. Main Server Class

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

export class YourMCPServer {
  private server: Server;
  private config: ServerConfig;
  private logger: Logger;
  private apiClient!: YourAPIClient;
  private toolHandlers!: ToolHandlers;

  constructor(config: ServerConfig) {
    this.config = config;
    this.logger = new Logger(config.debug ? LogLevel.DEBUG : LogLevel.INFO);
    this.server = new Server({
      name: 'your-mcp-server',
      version: '1.0.0',
    });

    this.setupServer();
  }

  private setupServer(): void {
    this.validateConfig();
    this.setupClients();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Object.values(TOOL_SCHEMAS),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'your_tool_name':
            return await this.toolHandlers.handleYourTool(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error(`Error executing tool ${name}:`, error);
        // Handle and transform errors appropriately
        throw this.transformError(error);
      }
    });

    // Error handling
    this.server.onerror = (error) => {
      this.logger.error('Server error:', error);
    };

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    
    // Test API connection
    try {
      await this.apiClient.testConnection();
      this.logger.info('API connection successful');
    } catch (error) {
      this.logger.error('API connection failed:', error);
      throw error;
    }

    await this.server.connect(transport);
    this.logger.info('MCP Server started successfully');
  }
}
```

### 2. Tool Handlers Pattern

```typescript
export class ToolHandlers {
  constructor(
    private apiClient: YourAPIClient,
    private logger: Logger
  ) {}

  async handleYourTool(args: any): Promise<any> {
    try {
      // 1. Sanitize input
      const sanitizedArgs = sanitizeInput(args);
      
      // 2. Validate against schema
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.your_tool_name.inputSchema);
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      // 3. Extract parameters
      const { required_param, optional_param } = sanitizedArgs;

      // 4. Call API
      this.logger.info(`Executing tool with params: ${required_param}`);
      const result = await this.apiClient.yourApiMethod(required_param, optional_param);
      
      // 5. Format response
      return {
        content: [
          {
            type: "text",
            text: `Operation completed successfully: ${result.summary}`
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in tool handler', error);
      throw error;
    }
  }
}
```

### 3. API Client Pattern

```typescript
export class YourAPIClient {
  private client: AxiosInstance;
  private logger: Logger;
  private rateLimiter: RateLimiter;
  private retryHandler: RetryHandler;

  constructor(config: ServerConfig, logger: Logger) {
    this.logger = logger;
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.retryHandler = new RetryHandler(
      config.retryAttempts || 3,
      config.retryDelay || 1000,
      logger
    );

    this.client = axios.create({
      baseURL: 'https://api.yourservice.com',
      timeout: config.timeout,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor with rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.rateLimiter.checkLimit();
      this.logger.debug(`Making request to ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Response interceptor with error handling
    this.client.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response received: ${response.status}`);
        return response;
      },
      (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        
        // Transform HTTP errors to domain errors
        if (status === 401) {
          throw new Error(`${ERROR_CODES.INVALID_API_KEY}: ${message}`);
        } else if (status === 404) {
          throw new Error(`${ERROR_CODES.RESOURCE_NOT_FOUND}: ${message}`);
        } else if (status === 429) {
          throw new Error(`${ERROR_CODES.RATE_LIMIT_EXCEEDED}: ${message}`);
        } else {
          throw new Error(`${ERROR_CODES.NETWORK_ERROR}: ${message}`);
        }
      }
    );
  }

  async yourApiMethod(param1: string, param2?: string): Promise<any> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.client.get('/your-endpoint', {
        params: { param1, param2 }
      });
      return response.data;
    }, 'yourApiMethod');
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch (error) {
      this.logger.error('Connection test failed', error);
      return false;
    }
  }
}
```

## Configuration Management

### 1. CLI Implementation

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { YourMCPServer } from './server.js';
import { ServerConfig } from './types/index.js';

dotenv.config();

const program = new Command();

program
  .name('your-mcp-server')
  .description('Your MCP Server for AI assistants')
  .version('1.0.0');

program
  .option('-k, --api-key <key>', 'API token', process.env.YOUR_API_KEY)
  .option('-t, --transport <type>', 'Transport protocol (stdio, sse)', 'stdio')
  .option('--timeout <ms>', 'Request timeout', (val) => parseInt(val), 30000)
  .option('-r, --rate-limit <limit>', 'Rate limit (requests/minute)', (val) => parseInt(val), 100)
  .option('-d, --debug', 'Enable debug logging', false)
  .option('-c, --config <path>', 'Configuration file path')
  .action(async (options) => {
    try {
      // Load config file if provided
      let config: ServerConfig = options;
      if (options.config) {
        const fileConfig = JSON.parse(readFileSync(options.config, 'utf8'));
        config = { ...fileConfig, ...options };
      }

      // Validate required options
      if (!config.apiKey) {
        console.error('Error: API key is required');
        process.exit(1);
      }

      // Create and start server
      const server = new YourMCPServer(config);
      await server.start();
    } catch (error) {
      console.error('Error starting server:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
```

### 2. Configuration File Support

```json
{
  "apiKey": "your_api_key_here",
  "timeout": 30000,
  "rateLimit": 100,
  "retryAttempts": 3,
  "retryDelay": 1000,
  "enableCache": true,
  "cacheExpiry": 300000
}
```

## Error Handling Strategy

### 1. Validation Utilities

```typescript
export function validateInput(input: any, schema: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!input || typeof input !== 'object') {
    errors.push('Input must be an object');
    return { isValid: false, errors };
  }

  // Check required properties
  if (schema.required) {
    for (const required of schema.required) {
      if (!(required in input)) {
        errors.push(`Missing required property: ${required}`);
      }
    }
  }

  // Check property types and constraints
  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      if (key in input) {
        const value = input[key];
        const propSchema = prop as any;
        
        // Type validation
        if (propSchema.type === 'string' && typeof value !== 'string') {
          errors.push(`Property ${key} must be a string`);
        }
        // ... other type checks
        
        // Enum validation
        if (propSchema.enum && !propSchema.enum.includes(value)) {
          errors.push(`Property ${key} must be one of: ${propSchema.enum.join(', ')}`);
        }
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.replace(/[<>]/g, '').trim();
  } else if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  } else if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
}
```

### 2. Rate Limiting Implementation

```typescript
export class RateLimiter {
  private requests: number[] = [];
  private limit: number;

  constructor(requestsPerMinute: number) {
    this.limit = requestsPerMinute;
  }

  async checkLimit(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    if (this.requests.length >= this.limit) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + 60000 - now;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.checkLimit();
    }
    
    this.requests.push(now);
  }
}
```

### 3. Retry Handler

```typescript
export class RetryHandler {
  constructor(
    private maxAttempts: number,
    private baseDelay: number,
    private logger: Logger
  ) {}

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
          const delay = this.baseDelay * Math.pow(2, attempt - 1);
          this.logger.warn(`${operationName} failed (attempt ${attempt}), retrying in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }
    
    throw lastError!;
  }

  private shouldRetry(error: any): boolean {
    const message = error.message || '';
    return message.includes('RATE_LIMIT_EXCEEDED') || 
           message.includes('NETWORK_ERROR') ||
           (error.response?.status >= 500);
  }
}
```

## Testing Setup

### 1. Jest Configuration

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
```

### 2. Test Example

```typescript
import { YourMCPServer } from '../server';
import { ServerConfig } from '../types';

describe('YourMCPServer', () => {
  let server: YourMCPServer;
  let config: ServerConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test_key',
      timeout: 5000,
      rateLimit: 10,
      transport: 'stdio',
      debug: false
    };
  });

  test('should validate API key format', () => {
    config.apiKey = 'invalid_key';
    expect(() => new YourMCPServer(config)).toThrow('Invalid API key format');
  });

  test('should handle tool requests', async () => {
    server = new YourMCPServer(config);
    const result = await server.handleToolRequest('your_tool_name', {
      required_param: 'test_value'
    });
    expect(result).toBeDefined();
  });
});
```

## Build and Deployment

### 1. Package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "jest",
    "prepare": "npm run build",
    "prepublishOnly": "npm run build",
    "prepack": "npm run build"
  }
}
```

### 2. TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 3. Binary Configuration

```json
{
  "bin": {
    "your-mcp-server": "./dist/index.js"
  },
  "files": [
    "dist/**/*",
    "LICENSE",
    "README.md"
  ]
}
```

## AI Assistant Integration

### 1. Claude Desktop Integration

```json
{
  "mcpServers": {
    "your-server": {
      "command": "npx",
      "args": ["your-mcp-server", "--api-key", "your_api_key_here"]
    }
  }
}
```

### 2. Windsurf Integration

```json
{
  "mcpServers": {
    "your-server": {
      "command": "npx",
      "args": ["your-mcp-server", "--api-key", "your_api_key_here"],
      "description": "Your service integration"
    }
  }
}
```

### 3. Environment Variable Support

```json
{
  "mcpServers": {
    "your-server": {
      "command": "npx",
      "args": ["your-mcp-server"],
      "env": {
        "YOUR_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Best Practices

### 1. Security
- ✅ Validate and sanitize all inputs
- ✅ Use environment variables for sensitive data
- ✅ Implement proper error handling without exposing internal details
- ✅ Add rate limiting to prevent abuse
- ✅ Use HTTPS for all API communications

### 2. Performance
- ✅ Implement connection pooling for HTTP clients
- ✅ Add caching for frequently accessed data
- ✅ Use appropriate timeouts
- ✅ Implement retry logic with exponential backoff
- ✅ Log performance metrics

### 3. Reliability
- ✅ Comprehensive error handling
- ✅ Graceful shutdown handling
- ✅ Connection health checks
- ✅ Detailed logging for debugging
- ✅ Unit and integration tests

### 4. User Experience
- ✅ Clear tool descriptions and parameter documentation
- ✅ Helpful error messages
- ✅ Consistent response formats
- ✅ Progress indication for long-running operations
- ✅ Comprehensive README with examples

## Step-by-Step Implementation

### Phase 1: Project Setup
1. Initialize npm project with TypeScript
2. Install core dependencies (@modelcontextprotocol/sdk, axios, commander)
3. Configure TypeScript and Jest
4. Set up project structure

### Phase 2: Core Infrastructure
1. Implement basic server class
2. Add configuration management
3. Create logging utilities
4. Set up error handling framework

### Phase 3: API Integration
1. Implement API client with authentication
2. Add rate limiting and retry logic
3. Create connection testing
4. Handle API-specific error codes

### Phase 4: Tool Implementation
1. Define tool schemas
2. Implement tool handlers
3. Add input validation and sanitization
4. Format response data

### Phase 5: CLI and Transport
1. Create CLI interface with commander
2. Implement STDIO transport
3. Add configuration file support
4. Handle environment variables

### Phase 6: Testing and Documentation
1. Write unit tests for all components
2. Add integration tests
3. Create comprehensive README
4. Document AI assistant integration

### Phase 7: Deployment
1. Set up build pipeline
2. Configure package.json for npm publication
3. Test with actual AI assistants
4. Create usage examples

## Common Pitfalls to Avoid

1. **Missing Input Validation**: Always validate and sanitize inputs
2. **Poor Error Handling**: Don't expose internal errors to users
3. **No Rate Limiting**: Implement rate limiting to prevent API abuse
4. **Blocking Operations**: Use async/await properly
5. **Missing Tests**: Write comprehensive tests from the start
6. **Poor Documentation**: Document all tools and parameters clearly
7. **Security Issues**: Never log or expose sensitive data
8. **Version Conflicts**: Pin dependency versions in package.json

This guide provides a complete foundation for building production-ready MCP servers. Follow these patterns and best practices to create reliable, secure, and maintainable integrations with external services.