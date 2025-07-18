# Gorgias MCP Server Development

You are an expert AI coding agent tasked with building a **Gorgias MCP (Model Context Protocol) Server** using Node.js with TypeScript. This server will integrate with Gorgias customer support platform to extract customer email data for automation projects.

## Project Requirements

### Core Specifications
- **Language**: Node.js with TypeScript
- **Protocol**: MCP (Model Context Protocol) 
- **Transports**: Support both STDIO and SSE (Server-Sent Events)
- **Authentication**: Private app using API Key authentication (HTTP Basic Auth)
- **Target Use Case**: Customer email data extraction for spreadsheet automation

### Technical Architecture
- Use `@modelcontextprotocol/sdk` for MCP implementation
- Implement proper TypeScript types for all Gorgias API responses
- Support both synchronous and asynchronous operations
- Include comprehensive error handling and rate limiting
- Follow MCP server best practices for tool definitions

## Gorgias API Integration Details

### Authentication Method
- **Type**: HTTP Basic Auth
- **Format**: `Authorization: Basic base64encode(USERNAME:API_KEY)`
- **Rate Limits**: 40 requests per 20-second window for API keys
- **Base URL**: `https://{domain}.gorgias.com/api/`

### Required API Endpoints
1. **GET /api/tickets** - List tickets with filtering
2. **GET /api/tickets/{id}** - Get specific ticket details
3. **GET /api/tickets/{id}/messages** - Get ticket messages
4. **GET /api/customers** - List customers
5. **GET /api/customers/{id}** - Get customer details

### Key Data Structures
```typescript
interface Ticket {
  id: number;
  external_id?: string;
  status: string;
  channel: string;
  subject: string;
  customer: Customer;
  assignee_user?: User;
  tags: Tag[];
  created_datetime: string;
  updated_datetime: string;
  last_message_datetime: string;
}

interface Message {
  id: number;
  ticket_id: number;
  public: boolean;
  channel: string;
  from_agent: boolean;
  sender: Contact;
  receiver: Contact;
  subject: string;
  body_text: string;
  body_html: string;
  stripped_text: string;
  created_datetime: string;
}

interface Customer {
  id: number;
  external_id?: string;
  email: string;
  firstname?: string;
  lastname?: string;
  channels: Channel[];
  meta: Record<string, any>;
}
```

## MCP Tools to Implement

### 1. `gorgias_list_tickets`
**Purpose**: List tickets with filtering for customer email extraction
**Parameters**:
- `customer_id` (optional): Filter by specific customer
- `status` (optional): Filter by ticket status (open, closed, etc.)
- `channel` (optional): Filter by communication channel
- `tags` (optional): Filter by tags
- `limit` (optional): Number of results (default: 50, max: 100)
- `cursor` (optional): Pagination cursor
- `order_by` (optional): Sort order

### 2. `gorgias_get_ticket`
**Purpose**: Get detailed ticket information including customer data
**Parameters**:
- `ticket_id` (required): Ticket ID to retrieve

### 3. `gorgias_list_ticket_messages`
**Purpose**: Get all messages for a specific ticket
**Parameters**:
- `ticket_id` (required): Ticket ID
- `limit` (optional): Number of messages to retrieve

### 4. `gorgias_list_customers`
**Purpose**: List customers for contact management
**Parameters**:
- `email` (optional): Filter by email address
- `external_id` (optional): Filter by external ID
- `limit` (optional): Number of results
- `cursor` (optional): Pagination cursor

### 5. `gorgias_extract_customer_emails`
**Purpose**: Extract customer email data in spreadsheet format
**Parameters**:
- `date_from` (optional): Start date filter
- `date_to` (optional): End date filter
- `status_filter` (optional): Ticket status filter
- `include_tags` (optional): Include tag information

## Implementation Requirements

### Project Structure
```
gorgias-mcp-server/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── server.ts             # MCP server implementation
│   ├── gorgias-client.ts     # Gorgias API client
│   ├── tools/                # MCP tool implementations
│   │   ├── tickets.ts
│   │   ├── customers.ts
│   │   └── extract.ts
│   ├── types/                # TypeScript type definitions
│   │   ├── gorgias.ts
│   │   └── mcp.ts
│   └── utils/                # Utility functions
│       ├── auth.ts
│       ├── pagination.ts
│       └── rate-limit.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Configuration
- Use environment variables for sensitive data:
  - `GORGIAS_DOMAIN` - Gorgias account domain
  - `GORGIAS_USERNAME` - API username
  - `GORGIAS_API_KEY` - API key
- Support both STDIO and SSE transport configuration
- Include comprehensive logging configuration

### Error Handling
- Implement proper HTTP error code handling (401, 403, 429, 500)
- Rate limit exceeded handling with exponential backoff
- Network timeout handling
- Invalid credential detection
- Pagination error recovery

### Rate Limiting
- Implement request queuing for 40 requests per 20-second window
- Add configurable delay between requests
- Monitor rate limit headers: `Retry-after`, `X-Gorgias-Account-Api-Call-Limit`
- Graceful degradation when limits are reached

## Code Quality Requirements

### TypeScript Best Practices
- Strict TypeScript configuration
- Comprehensive type definitions for all API responses
- Proper error type definitions
- Use discriminated unions for different response types

### Testing
- Unit tests for API client methods
- Integration tests for MCP tools
- Mock Gorgias API responses for testing
- Test rate limiting behavior

### Documentation
- Comprehensive README with setup instructions
- API client documentation
- MCP tool documentation with examples
- Configuration guide

## Sample Implementation Patterns

### API Client Base
```typescript
class GorgiasClient {
  private baseURL: string;
  private auth: string;
  private rateLimiter: RateLimiter;

  constructor(domain: string, username: string, apiKey: string) {
    this.baseURL = `https://${domain}.gorgias.com/api`;
    this.auth = Buffer.from(`${username}:${apiKey}`).toString('base64');
    this.rateLimiter = new RateLimiter(40, 20000); // 40 requests per 20s
  }

  async request<T>(endpoint: string, params?: object): Promise<T> {
    await this.rateLimiter.acquire();
    // Implementation with proper error handling
  }
}
```

### MCP Tool Implementation
```typescript
const listTicketsTool = {
  name: "gorgias_list_tickets",
  description: "List Gorgias tickets with filtering options",
  inputSchema: {
    type: "object",
    properties: {
      customer_id: { type: "number", description: "Filter by customer ID" },
      status: { type: "string", description: "Filter by ticket status" },
      // ... other parameters
    }
  }
};
```

## Success Criteria
1. **Functional MCP server** that supports both STDIO and SSE transports
2. **Complete API integration** with all required Gorgias endpoints
3. **Proper rate limiting** to prevent API quota exhaustion
4. **Comprehensive error handling** for production use
5. **TypeScript type safety** throughout the codebase
6. **Ready for customer email extraction** automation
7. **Well-documented** for easy deployment and usage

## Getting Started
1. Initialize Node.js project with TypeScript
2. Install MCP SDK and required dependencies
3. Implement Gorgias API client with authentication
4. Create MCP server with tool definitions
5. Add rate limiting and error handling
6. Test with sample Gorgias account
7. Document setup and usage

This MCP server will serve as the foundation for the Gorgias → Spreadsheet automation project, enabling efficient customer email data extraction through a standardized protocol interface.
