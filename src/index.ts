#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { GorgiasMCPServer } from './server.js';
import { ServerConfig } from './types/config.js';

// Load environment variables
// Detect MCP mode to silence dotenv output
const isMCPMode = process.argv.includes('start') && !process.argv.includes('--debug');

if (!isMCPMode) {
  dotenv.config();
} else {
  // In MCP mode, load env vars silently without dotenv output
  try {
    const envFile = readFileSync('.env', 'utf8');
    envFile.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    });
  } catch {
    // .env file doesn't exist or can't be read, continue
  }
}

const program = new Command();

program
  .name('gorgias-mcp')
  .description('Gorgias MCP Server for customer support data extraction')
  .version('1.0.2');

// Start command (default server behavior)
program
  .command('start')
  .description('Start the Gorgias MCP Server')
  .option('-d, --domain <domain>', 'Gorgias domain (without .gorgias.com)', process.env.GORGIAS_DOMAIN)
  .option('-u, --username <username>', 'Gorgias username/email', process.env.GORGIAS_USERNAME)
  .option('-k, --api-key <key>', 'Gorgias API key', process.env.GORGIAS_API_KEY)
  .option('-t, --transport <type>', 'Transport protocol (stdio, sse)', 'stdio')
  .option('--timeout <ms>', 'Request timeout in milliseconds', (val) => parseInt(val), 30000)
  .option('-r, --rate-limit <limit>', 'Rate limit (requests per 20 seconds)', (val) => parseInt(val), 40)
  .option('--debug', 'Enable debug logging', false)
  .option('--retry-attempts <attempts>', 'Number of retry attempts', (val) => parseInt(val), 3)
  .option('--retry-delay <delay>', 'Base retry delay in milliseconds', (val) => parseInt(val), 1000)
  .option('-c, --config <path>', 'Configuration file path')
  .option('--port <port>', 'Port for SSE transport', (val) => parseInt(val), 3000)
  .option('--host <host>', 'Host for SSE transport', 'localhost')
  .action(async (options) => {
    try {
      // Load config file if provided
      let config: ServerConfig = {
        domain: options.domain,
        username: options.username,
        apiKey: options.apiKey,
        timeout: options.timeout,
        rateLimit: options.rateLimit,
        transport: options.transport,
        debug: options.debug,
        retryAttempts: options.retryAttempts,
        retryDelay: options.retryDelay,
        port: options.port,
        host: options.host
      };
      
      if (options.config) {
        try {
          const fileConfig = JSON.parse(readFileSync(options.config, 'utf8'));
          config = { ...fileConfig, ...config };
        } catch (error) {
          console.error(`Error reading config file: ${error}`);
          process.exit(1);
        }
      }

      // Validate required options
      const requiredFields = ['domain', 'username', 'apiKey'];
      const missingFields = requiredFields.filter(field => !config[field as keyof ServerConfig]);
      
      if (missingFields.length > 0) {
        console.error(`Error: Missing required configuration: ${missingFields.join(', ')}`);
        console.error('\nYou can provide these via:');
        console.error('  - Command line arguments: --domain, --username, --api-key');
        console.error('  - Environment variables: GORGIAS_DOMAIN, GORGIAS_USERNAME, GORGIAS_API_KEY');
        console.error('  - Configuration file: --config path/to/config.json');
        process.exit(1);
      }

      // Validate transport
      if (config.transport && !['stdio', 'sse'].includes(config.transport)) {
        console.error('Error: Transport must be either "stdio" or "sse"');
        process.exit(1);
      }

      // Create and start server
      const server = new GorgiasMCPServer(config);
      await server.start();

      // Keep the process alive
      process.on('SIGINT', () => {
        console.log('Received SIGINT, shutting down gracefully...');
        process.exit(0);
      });

    } catch (error) {
      console.error('Error starting server:', error);
      process.exit(1);
    }
  });

// Add a test command for debugging
program
  .command('test')
  .description('Test connection to Gorgias API')
  .option('-d, --domain <domain>', 'Gorgias domain (without .gorgias.com)', process.env.GORGIAS_DOMAIN)
  .option('-u, --username <username>', 'Gorgias username/email', process.env.GORGIAS_USERNAME)
  .option('-k, --api-key <key>', 'Gorgias API key', process.env.GORGIAS_API_KEY)
  .option('--debug', 'Enable debug logging', false)
  .action(async (options) => {
    try {
      const config = {
        domain: options.domain,
        username: options.username,
        apiKey: options.apiKey,
        debug: options.debug
      };
      
      const requiredFields = ['domain', 'username', 'apiKey'];
      const missingFields = requiredFields.filter(field => !config[field as keyof typeof config]);
      
      if (missingFields.length > 0) {
        console.error(`Error: Missing required configuration: ${missingFields.join(', ')}`);
        process.exit(1);
      }

      const { GorgiasClient } = await import('./utils/gorgias-client.js');
      const { Logger, LogLevel } = await import('./utils/logger.js');
      
      const logger = new Logger(config.debug ? LogLevel.DEBUG : LogLevel.INFO);
      const client = new GorgiasClient({
        domain: config.domain,
        username: config.username,
        apiKey: config.apiKey,
        timeout: 30000,
        rateLimit: 40,
        transport: 'stdio'
      }, logger);

      console.log('Testing Gorgias API connection...');
      const connected = await client.testConnection();
      
      if (connected) {
        console.log('✅ Connection successful!');
        
        // Test a simple API call
        console.log('Testing API call...');
        const tickets = await client.listTickets({ limit: 1 });
        console.log(`✅ API call successful! Found ${tickets.meta.total_count} total tickets.`);
        
        // Show rate limit status
        const rateLimitStatus = client.getRateLimitStatus();
        console.log(`Rate limit: ${rateLimitStatus.remaining} requests remaining`);
      } else {
        console.log('❌ Connection failed!');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    }
  });

// Add a tools command to list available tools
program
  .command('tools')
  .description('List available MCP tools')
  .action(async () => {
    const { TOOL_SCHEMAS } = await import('./tools/schemas.js');
    
    console.log('Available Gorgias MCP Tools:\n');
    
    Object.values(TOOL_SCHEMAS).forEach(tool => {
      console.log(`📋 ${tool.name}`);
      console.log(`   ${tool.description}\n`);
    });
    
    console.log(`Total: ${Object.keys(TOOL_SCHEMAS).length} tools available`);
  });

// Handle unknown commands
program.on('command:*', (operands) => {
  console.error(`Unknown command: ${operands[0]}`);
  console.error('Use --help for available commands');
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}