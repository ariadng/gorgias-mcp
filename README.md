# Gorgias MCP Server

A Model Context Protocol (MCP) server that integrates with the Gorgias customer support platform to extract customer email data for automation projects.

## Quick Start

**Jump to AI Assistant Setup:**
- [Claude Desktop](#claude-desktop) | [Windsurf](#windsurf) | [Cursor](#cursor)

## Features

- **Complete API Integration**: Full integration with Gorgias API including tickets, customers, and messages
- **Rate Limiting**: Built-in rate limiting to respect Gorgias API limits (40 requests per 20 seconds)
- **Error Handling**: Comprehensive error handling with retry logic and exponential backoff
- **Multiple Output Formats**: Support for JSON, CSV, and table formats for data export
- **CLI Interface**: Easy-to-use command-line interface with multiple commands
- **TypeScript**: Fully typed with comprehensive interfaces for all API responses
- **MCP Compatible**: Works with Claude Desktop, Windsurf, Cursor, and other MCP-compatible AI assistants

## Installation

### Prerequisites

- Node.js 18+ 
- A Gorgias account with API access

### Using npx (Recommended)

No installation required! Use directly with npx:

```bash
npx gorgias-mcp test --domain your-domain --username your-email --api-key your-api-key
```

### Global Installation

```bash
npm install -g gorgias-mcp
```

### Install from source

```bash
git clone https://github.com/ariadng/gorgias-mcp.git
cd gorgias-mcp
npm install
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
GORGIAS_DOMAIN=your-domain-here
GORGIAS_USERNAME=your-username-here
GORGIAS_API_KEY=your-api-key-here
```

### Configuration File

Alternatively, create a `config.json` file:

```json
{
  "domain": "your-domain-here",
  "username": "your-username-here",
  "apiKey": "your-api-key-here",
  "timeout": 30000,
  "rateLimit": 40,
  "debug": false
}
```

### Getting Gorgias API Credentials

1. Log into your Gorgias account
2. Go to Settings > API
3. Create a new API key
4. Note your domain (the part before `.gorgias.com`)
5. Use your email as the username

## Usage

### Command Line Interface

#### Test Connection
```bash
npx gorgias-mcp test --domain your-domain --username your-email --api-key your-api-key
```

#### Start MCP Server
```bash
npx gorgias-mcp start --domain your-domain --username your-email --api-key your-api-key
```

#### List Available Tools
```bash
npx gorgias-mcp tools
```

#### Using Configuration File
```bash
npx gorgias-mcp start --config config.json
```

### MCP Tools

The server provides 5 MCP tools for AI assistants:

#### 1. `gorgias_list_tickets`
List tickets with filtering options.

**Parameters:**
- `customer_id` (optional): Filter by customer ID
- `status` (optional): Filter by ticket status (open, closed, etc.)
- `channel` (optional): Filter by communication channel
- `tags` (optional): Filter by tags array
- `limit` (optional): Number of results (default: 50, max: 100)
- `cursor` (optional): Pagination cursor
- `order_by` (optional): Sort order field
- `order_direction` (optional): Sort direction (asc/desc)

#### 2. `gorgias_get_ticket`
Get detailed information about a specific ticket.

**Parameters:**
- `ticket_id` (required): The ticket ID to retrieve

#### 3. `gorgias_list_ticket_messages`
Get all messages for a specific ticket.

**Parameters:**
- `ticket_id` (required): The ticket ID
- `limit` (optional): Number of messages to retrieve
- `cursor` (optional): Pagination cursor

#### 4. `gorgias_list_customers`
List customers with filtering options.

**Parameters:**
- `email` (optional): Filter by email address
- `external_id` (optional): Filter by external ID
- `limit` (optional): Number of results
- `cursor` (optional): Pagination cursor
- `order_by` (optional): Sort order field
- `order_direction` (optional): Sort direction

#### 5. `gorgias_extract_customer_emails`
Extract customer email data in spreadsheet format.

**Parameters:**
- `date_from` (optional): Start date filter (YYYY-MM-DD)
- `date_to` (optional): End date filter (YYYY-MM-DD)
- `status_filter` (optional): Ticket status filter array
- `include_tags` (optional): Include tag information
- `include_satisfaction` (optional): Include satisfaction scores
- `format` (optional): Output format (json, csv, table)
- `limit` (optional): Maximum customers to extract

## AI Assistant Integration

### Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gorgias": {
      "command": "npx",
      "args": ["gorgias-mcp", "start", "--domain", "your-domain", "--username", "your-email", "--api-key", "your-api-key"]
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP configuration:

```json
{
  "mcpServers": {
    "gorgias": {
      "command": "npx",
      "args": ["gorgias-mcp", "start"],
      "env": {
        "GORGIAS_DOMAIN": "your-domain",
        "GORGIAS_USERNAME": "your-email",
        "GORGIAS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor

Similar to Windsurf, add the server configuration to your Cursor MCP settings using `npx`.

## Development

### Project Structure

```
gorgias-mcp/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions (client, logger, etc.)
│   ├── tools/           # MCP tool handlers and schemas
│   ├── server.ts        # Main MCP server class
│   └── index.ts         # CLI entry point
├── dist/                # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Testing

```bash
npm test
```

## API Rate Limiting

The server implements rate limiting to respect Gorgias API limits:

- **Limit**: 40 requests per 20-second window
- **Behavior**: Automatic queuing and waiting when limit is reached
- **Retry Logic**: Exponential backoff for failed requests
- **Monitoring**: Rate limit status logging

## Error Handling

The server includes comprehensive error handling:

- **Authentication Errors**: Clear messages for invalid credentials
- **Rate Limit Errors**: Automatic retry with backoff
- **Network Errors**: Retry logic for transient failures
- **Validation Errors**: Input validation with detailed error messages
- **API Errors**: Proper error transformation and logging

## Security

- **Credentials**: Never logged or exposed in error messages
- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: Prevents API abuse
- **HTTPS**: All API communication uses HTTPS

## Troubleshooting

### Common Issues

1. **"Invalid API credentials"**
   - Check your domain, username, and API key
   - Ensure the API key is active in your Gorgias account

2. **"Rate limit exceeded"**
   - The server automatically handles rate limiting
   - Wait for the limit to reset or reduce request frequency

3. **"Connection failed"**
   - Check your internet connection
   - Verify the Gorgias domain is correct
   - Ensure Gorgias API is accessible from your network

### Debug Mode

Enable debug logging to see detailed information:

```bash
npx gorgias-mcp start --debug
```

### Testing Connection

Test your connection without starting the full server:

```bash
npx gorgias-mcp test --domain your-domain --username your-email --api-key your-api-key --debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

ISC License - see LICENSE file for details.

## Support

For issues and questions:

1. Check the troubleshooting section
2. Enable debug mode to get detailed logs
3. Open an issue on GitHub with logs and configuration details

## Changelog

### v1.0.2
- Fixed Claude Desktop JSON parsing errors caused by console output
- Disabled logging and dotenv output in MCP mode to prevent protocol interference
- Improved MCP protocol compatibility

### v1.0.1
- Fixed colored logging output interfering with MCP JSON protocol
- Added MCP mode detection to disable console output when needed

### v1.0.0
- Initial release
- Full Gorgias API integration
- 5 MCP tools for customer data extraction
- Rate limiting and error handling
- CLI interface with multiple commands
- Support for multiple output formats