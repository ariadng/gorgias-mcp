import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { ServerConfig } from './types/config.js';
import { Logger, LogLevel } from './utils/logger.js';
import { GorgiasClient } from './utils/gorgias-client.js';
import { ToolHandlers } from './tools/handlers.js';
import { TOOL_SCHEMAS } from './tools/schemas.js';

export class GorgiasMCPServer {
  private server: Server;
  private config: ServerConfig;
  private logger: Logger;
  public gorgiasClient!: GorgiasClient;
  public toolHandlers!: ToolHandlers;

  constructor(config: ServerConfig) {
    this.config = config;
    this.logger = new Logger(
      config.debug ? LogLevel.DEBUG : LogLevel.INFO,
      { timestamp: true, colorize: !process.argv.includes('start') || config.debug }
    );

    this.server = new Server({
      name: 'gorgias-mcp-server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {}
      }
    });

    this.setupServer();
  }

  private setupServer(): void {
    this.validateConfig();
    this.setupClients();
    this.setupHandlers();
  }

  public async initializeForTesting(): Promise<void> {
    this.validateConfig();
    this.setupClients();
    
    // Test API connection
    const connected = await this.gorgiasClient.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Gorgias API');
    }
  }

  private validateConfig(): void {
    const required = ['domain', 'username', 'apiKey'];
    for (const field of required) {
      if (!this.config[field as keyof ServerConfig]) {
        throw new Error(`Missing required configuration: ${field}`);
      }
    }

    // Validate API key format (basic check)
    if (this.config.apiKey.length < 32) {
      throw new Error('Invalid API key format - key appears too short');
    }

    this.logger.info('Configuration validated successfully');
  }

  private setupClients(): void {
    this.gorgiasClient = new GorgiasClient(this.config, this.logger);
    this.toolHandlers = new ToolHandlers(this.gorgiasClient, this.logger);
    this.logger.info('Gorgias client initialized');
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug('Received ListTools request');
      return {
        tools: Object.values(TOOL_SCHEMAS),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;
      this.logger.info(`Received tool call: ${name}`);

      try {
        switch (name) {
          case 'gorgias_list_tickets':
            return await this.toolHandlers.handleListTickets(args);
          
          case 'gorgias_get_ticket':
            return await this.toolHandlers.handleGetTicket(args);
          
          case 'gorgias_list_ticket_messages':
            return await this.toolHandlers.handleListTicketMessages(args);
          
          case 'gorgias_list_customers':
            return await this.toolHandlers.handleListCustomers(args);
          
          case 'gorgias_extract_customer_emails':
            return await this.toolHandlers.handleExtractCustomerEmails(args);
          
          // New automation tools
          case 'gorgias_send_reply':
            return await this.toolHandlers.handleSendReply(args);
          
          case 'gorgias_update_ticket':
            return await this.toolHandlers.handleUpdateTicket(args);
          
          case 'gorgias_get_customer':
            return await this.toolHandlers.handleGetCustomer(args);
          
          case 'gorgias_create_customer':
            return await this.toolHandlers.handleCreateCustomer(args);
          
          case 'gorgias_list_events':
            return await this.toolHandlers.handleListEvents(args);
          
          case 'gorgias_search_tickets':
            return await this.toolHandlers.handleSearchTickets(args);
          
          case 'gorgias_get_integrations':
            return await this.toolHandlers.handleGetIntegrations(args);
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error(`Error executing tool ${name}:`, error);
        throw this.transformError(error);
      }
    });

    // Error handling
    this.server.onerror = (error) => {
      this.logger.error('Server error:', error);
    };

    // Graceful shutdown
    process.on('SIGINT', async () => {
      this.logger.info('Received SIGINT, shutting down gracefully...');
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      this.logger.info('Received SIGTERM, shutting down gracefully...');
      await this.cleanup();
      process.exit(0);
    });

    this.logger.info('MCP server handlers configured');
  }

  private transformError(error: any): McpError {
    if (error instanceof McpError) {
      return error;
    }

    const message = error.message || 'Unknown error';
    
    // Map specific error types to MCP error codes
    if (message.includes('INVALID_API_KEY') || message.includes('UNAUTHORIZED')) {
      return new McpError(ErrorCode.InvalidRequest, 'Invalid API credentials');
    }
    
    if (message.includes('RATE_LIMIT_EXCEEDED')) {
      return new McpError(ErrorCode.InvalidRequest, 'Rate limit exceeded. Please try again later.');
    }
    
    if (message.includes('RESOURCE_NOT_FOUND')) {
      return new McpError(ErrorCode.InvalidRequest, 'Requested resource not found');
    }
    
    if (message.includes('VALIDATION_ERROR') || error.name === 'ValidationError') {
      return new McpError(ErrorCode.InvalidParams, message);
    }
    
    if (message.includes('NETWORK_ERROR')) {
      return new McpError(ErrorCode.InternalError, 'Network error occurred');
    }
    
    // Default to internal error
    return new McpError(ErrorCode.InternalError, `Internal server error: ${message}`);
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    
    // Test API connection before starting
    try {
      this.logger.info('Testing Gorgias API connection...');
      const connected = await this.gorgiasClient.testConnection();
      if (!connected) {
        throw new Error('Failed to connect to Gorgias API');
      }
      this.logger.info('Gorgias API connection test successful');
    } catch (error) {
      this.logger.error('Failed to connect to Gorgias API:', error);
      throw error;
    }

    // Start the MCP server
    try {
      await this.server.connect(transport);
      this.logger.info('Gorgias MCP Server started successfully');
      this.logger.info(`Available tools: ${Object.keys(TOOL_SCHEMAS).join(', ')}`);
      
      // Log rate limit status
      const rateLimitStatus = this.gorgiasClient.getRateLimitStatus();
      this.logger.info(`Rate limit status: ${rateLimitStatus.remaining} requests remaining`);
      
    } catch (error) {
      this.logger.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      this.logger.info('Cleaning up resources...');
      
      // Close server connection
      if (this.server) {
        await this.server.close();
      }
      
      this.logger.info('Cleanup completed');
    } catch (error) {
      this.logger.error('Error during cleanup:', error);
    }
  }

  getServerInfo(): {
    name: string;
    version: string;
    toolsCount: number;
    rateLimitStatus: { remaining: number; resetTime: number };
  } {
    return {
      name: 'gorgias-mcp-server',
      version: '1.0.0',
      toolsCount: Object.keys(TOOL_SCHEMAS).length,
      rateLimitStatus: this.gorgiasClient.getRateLimitStatus()
    };
  }
}