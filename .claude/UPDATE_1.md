# Gorgias MCP Server Enhancement Prompt - Additional Tools

You are an expert AI coding agent tasked with **enhancing an existing Gorgias MCP Server** by adding 7 additional tools to transform it from a data extraction system into a complete customer service automation platform.

## Current State
The existing MCP server successfully implements these 5 tools:
1. `gorgias_list_tickets` - List tickets with filtering
2. `gorgias_get_ticket` - Get detailed ticket information  
3. `gorgias_list_ticket_messages` - Get ticket messages
4. `gorgias_list_customers` - List customers
5. `gorgias_extract_customer_emails` - Extract email data for spreadsheets

## Enhancement Objective
Add 7 new tools to enable **complete customer service automation** including:
- Sending automated replies to customers
- Updating ticket status and properties
- Creating new customers programmatically
- Advanced search and event tracking
- Integration management

## New Tools to Implement

### Tool 6: `gorgias_send_reply`
**Purpose**: Send replies to tickets (outgoing messages, internal notes, or simulated incoming messages)

**API Endpoint**: `POST /api/tickets/{ticket_id}/messages`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    ticket_id: {
      type: "number",
      description: "Target ticket ID to reply to"
    },
    message_type: {
      type: "string",
      enum: ["outgoing", "internal-note", "incoming"],
      description: "Type of message: outgoing (agent to customer), internal-note (agent to agent), incoming (simulate customer message)"
    },
    body_text: {
      type: "string",
      description: "Plain text message content (required)"
    },
    body_html: {
      type: "string",
      description: "HTML formatted message content (optional, defaults to body_text)"
    },
    sender_email: {
      type: "string",
      description: "Email of the sender (must be existing Gorgias user for outgoing/internal)"
    },
    receiver_email: {
      type: "string",
      description: "Customer email for outgoing messages (required for outgoing type)"
    },
    subject: {
      type: "string",
      description: "Message subject (optional)"
    },
    source_from_address: {
      type: "string",
      description: "Source email address (must be existing email integration)"
    }
  },
  required: ["ticket_id", "message_type", "body_text", "sender_email"]
}
```

**Implementation Notes**:
- For outgoing messages: `from_agent: true`, require `receiver_email`
- For internal notes: `from_agent: true`, `channel: "internal-note"`, no receiver
- For incoming messages: `from_agent: false`, sender is customer
- Validate `source_from_address` against available email integrations
- Set `via: "api"` for all messages

**Example Request Body**:
```json
{
  "receiver": {
    "email": "customer@example.com"
  },
  "sender": {
    "email": "agent@company.com"
  },
  "source": {
    "to": [{"address": "customer@example.com"}],
    "from": {"address": "support@company.com"}
  },
  "body_html": "Thank you for contacting us...",
  "body_text": "Thank you for contacting us...",
  "channel": "email",
  "from_agent": true,
  "via": "api",
  "subject": "Re: Your inquiry"
}
```

### Tool 7: `gorgias_update_ticket`
**Purpose**: Update ticket properties including status, assignee, tags, and priority

**API Endpoint**: `PUT /api/tickets/{ticket_id}`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    ticket_id: {
      type: "number",
      description: "Ticket ID to update"
    },
    status: {
      type: "string",
      enum: ["open", "closed", "spam"],
      description: "New ticket status"
    },
    assignee_user_id: {
      type: "number",
      description: "ID of user to assign ticket to (null to unassign)"
    },
    tags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" }
        }
      },
      description: "Array of tags to set on ticket"
    },
    priority: {
      type: "string",
      enum: ["low", "normal", "high", "urgent"],
      description: "Ticket priority level"
    },
    subject: {
      type: "string",
      description: "Update ticket subject"
    },
    meta: {
      type: "object",
      description: "Custom metadata object"
    }
  },
  required: ["ticket_id"]
}
```

**Implementation Notes**:
- Only include non-null fields in the request body
- Tags array replaces existing tags completely
- Use proper error handling for invalid user IDs or statuses
- Return updated ticket object

### Tool 8: `gorgias_get_customer`
**Purpose**: Get detailed customer information including channels and integrations

**API Endpoint**: `GET /api/customers/{customer_id}`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    customer_id: {
      type: "number",
      description: "Customer ID to retrieve"
    },
    include_channels: {
      type: "boolean",
      default: true,
      description: "Include communication channels in response"
    },
    include_integrations: {
      type: "boolean", 
      default: true,
      description: "Include e-commerce integration data"
    },
    include_meta: {
      type: "boolean",
      default: true,
      description: "Include custom metadata fields"
    }
  },
  required: ["customer_id"]
}
```

**Response Structure**:
```typescript
interface CustomerDetails {
  id: number;
  external_id?: string;
  email: string;
  firstname?: string;
  lastname?: string;
  channels: Channel[];
  integrations: Integration[];
  meta: Record<string, any>;
  created_datetime: string;
  updated_datetime: string;
}
```

### Tool 9: `gorgias_create_customer`
**Purpose**: Create new customers for automation workflows

**API Endpoint**: `POST /api/customers`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    email: {
      type: "string",
      format: "email",
      description: "Customer email address (required, must be unique)"
    },
    firstname: {
      type: "string",
      description: "Customer first name"
    },
    lastname: {
      type: "string", 
      description: "Customer last name"
    },
    external_id: {
      type: "string",
      description: "External system ID for customer"
    },
    channels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["email", "phone", "sms"]
          },
          address: {
            type: "string"
          }
        }
      },
      description: "Communication channels for customer"
    },
    meta: {
      type: "object",
      description: "Custom metadata for customer"
    }
  },
  required: ["email"]
}
```

**Implementation Notes**:
- Handle duplicate email errors gracefully
- Return created customer object with generated ID
- Validate email format before sending request
- Support batch customer creation if needed

### Tool 10: `gorgias_list_events`
**Purpose**: Get activity/event history for tickets, customers, and users

**API Endpoint**: `GET /api/events`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    object_type: {
      type: "string",
      enum: ["ticket", "customer", "user", "message"],
      description: "Filter events by object type"
    },
    object_id: {
      type: "number",
      description: "Filter events for specific object ID"
    },
    event_type: {
      type: "string",
      description: "Filter by specific event type (e.g., 'ticket-created', 'ticket-updated')"
    },
    user_id: {
      type: "number",
      description: "Filter events by user who performed the action"
    },
    limit: {
      type: "number",
      default: 50,
      maximum: 100,
      description: "Maximum number of events to return"
    },
    cursor: {
      type: "string",
      description: "Pagination cursor for next page"
    },
    order_by: {
      type: "string",
      default: "created_datetime:desc",
      description: "Sort order for events"
    }
  }
}
```

**Common Event Types**:
- `ticket-created`, `ticket-updated`, `ticket-closed`
- `ticket-message-created`, `ticket-message-updated`
- `customer-created`, `customer-updated`
- `user-created`, `user-updated`

### Tool 11: `gorgias_search_tickets`
**Purpose**: Advanced ticket search with text queries and complex filtering

**API Endpoint**: `GET /api/tickets` with search parameters

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "Search text to find in ticket subject, messages, or customer data"
    },
    channel: {
      type: "string",
      enum: ["email", "chat", "phone", "sms", "api"],
      description: "Filter by communication channel"
    },
    status: {
      type: "string",
      enum: ["open", "closed", "spam"],
      description: "Filter by ticket status"
    },
    assignee_user_id: {
      type: "number",
      description: "Filter by assigned user ID"
    },
    customer_email: {
      type: "string",
      description: "Filter by customer email address"
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "Filter by tag names (AND logic)"
    },
    date_from: {
      type: "string",
      format: "date-time",
      description: "Filter tickets created after this date"
    },
    date_to: {
      type: "string",
      format: "date-time", 
      description: "Filter tickets created before this date"
    },
    limit: {
      type: "number",
      default: 50,
      maximum: 100,
      description: "Maximum results to return"
    },
    cursor: {
      type: "string",
      description: "Pagination cursor"
    }
  },
  required: ["query"]
}
```

**Implementation Notes**:
- Combine search query with filters using URL parameters
- Use cursor-based pagination for large result sets
- Support fuzzy text matching in ticket content
- Include relevance scoring in results

### Tool 12: `gorgias_get_integrations`
**Purpose**: List available email integrations for reply validation and management

**API Endpoint**: `GET /api/integrations`

**Input Schema**:
```typescript
{
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["email", "chat", "social", "ecommerce"],
      description: "Filter integrations by type"
    },
    active_only: {
      type: "boolean",
      default: true,
      description: "Only return active/enabled integrations"
    },
    limit: {
      type: "number",
      default: 50,
      description: "Maximum integrations to return"
    }
  }
}
```

**Response Structure**:
```typescript
interface Integration {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
  settings: {
    email?: string;
    from_name?: string;
    reply_to?: string;
  };
  created_datetime: string;
}
```

**Use Cases**:
- Validate `source_from_address` before sending replies
- List available email addresses for automated responses
- Check integration health and status

## Implementation Guidelines

### Enhanced Error Handling
Add specific error handling for these new operations:
- **Authentication errors** for send operations
- **Validation errors** for invalid email addresses or user IDs
- **Conflict errors** for duplicate customer creation
- **Permission errors** for unauthorized operations

### Rate Limiting Considerations
- **Write operations** (send_reply, update_ticket, create_customer) consume more quota
- Implement **request queuing** for bulk operations
- Add **retry logic** with exponential backoff
- Monitor **rate limit headers** more carefully for write operations

### Type Safety Enhancements
Create comprehensive TypeScript interfaces for:
```typescript
interface MessageRequest {
  ticket_id: number;
  message_type: 'outgoing' | 'internal-note' | 'incoming';
  body_text: string;
  body_html?: string;
  sender_email: string;
  receiver_email?: string;
  subject?: string;
  source_from_address?: string;
}

interface TicketUpdate {
  ticket_id: number;
  status?: 'open' | 'closed' | 'spam';
  assignee_user_id?: number | null;
  tags?: Array<{name: string}>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  subject?: string;
  meta?: Record<string, any>;
}

interface CustomerCreate {
  email: string;
  firstname?: string;
  lastname?: string;
  external_id?: string;
  channels?: Array<{type: string; address: string}>;
  meta?: Record<string, any>;
}
```

### Testing Requirements
Add comprehensive tests for:
- **Reply sending** with different message types
- **Ticket updates** with various field combinations
- **Customer creation** with duplicate email handling
- **Search functionality** with complex queries
- **Integration listing** and validation

### Documentation Updates
Update the README with:
- **Complete tool documentation** with examples
- **Authentication requirements** for write operations
- **Rate limiting strategies** for automation workflows
- **Error handling patterns** for production use
- **Integration validation** procedures

## Success Criteria
1. **All 7 new tools** implemented and tested
2. **Complete CRUD operations** for tickets and customers
3. **Automated reply capabilities** for customer service workflows
4. **Advanced search and filtering** for complex queries
5. **Integration management** for email validation
6. **Production-ready error handling** and rate limiting
7. **Comprehensive documentation** and examples

## Usage Examples

### Automated Customer Response
```typescript
// Search for urgent tickets
const urgentTickets = await gorgias_search_tickets({
  query: "refund",
  status: "open", 
  tags: ["urgent"]
});

// Send automated reply
await gorgias_send_reply({
  ticket_id: urgentTickets[0].id,
  message_type: "outgoing",
  body_text: "We've received your refund request and will process it within 24 hours.",
  sender_email: "support@company.com",
  receiver_email: urgentTickets[0].customer.email
});

// Update ticket status
await gorgias_update_ticket({
  ticket_id: urgentTickets[0].id,
  status: "closed",
  tags: [{name: "refund"}, {name: "resolved"}]
});
```

This enhancement transforms the MCP server into a complete customer service automation platform, enabling sophisticated workflows beyond simple data extraction.
