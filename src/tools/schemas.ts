export const TOOL_SCHEMAS = {
  gorgias_list_tickets: {
    name: "gorgias_list_tickets",
    description: "List Gorgias tickets with filtering options for customer email extraction. Supports pagination and various filters to find specific tickets.",
    inputSchema: {
      type: "object",
      properties: {
        customer_id: {
          type: "number",
          description: "Filter by specific customer ID"
        },
        status: {
          type: "string",
          description: "Filter by ticket status",
          enum: ["open", "closed", "resolved", "pending", "spam"]
        },
        channel: {
          type: "string",
          description: "Filter by communication channel (email, chat, etc.)"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags (array of tag names)"
        },
        limit: {
          type: "number",
          description: "Number of results to return",
          minimum: 1,
          maximum: 100,
          default: 50
        },
        cursor: {
          type: "string",
          description: "Pagination cursor for next page"
        },
        order_by: {
          type: "string",
          description: "Sort order",
          enum: ["created_datetime", "updated_datetime", "last_message_datetime"]
        },
        order_direction: {
          type: "string",
          description: "Sort direction",
          enum: ["asc", "desc"],
          default: "desc"
        }
      },
      required: []
    }
  },

  gorgias_get_ticket: {
    name: "gorgias_get_ticket",
    description: "Get detailed information about a specific ticket including customer data, messages, and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        ticket_id: {
          type: "number",
          description: "The ID of the ticket to retrieve"
        }
      },
      required: ["ticket_id"]
    }
  },

  gorgias_list_ticket_messages: {
    name: "gorgias_list_ticket_messages",
    description: "Get all messages for a specific ticket, including customer and agent communications.",
    inputSchema: {
      type: "object",
      properties: {
        ticket_id: {
          type: "number",
          description: "The ID of the ticket to get messages for"
        },
        limit: {
          type: "number",
          description: "Number of messages to retrieve",
          minimum: 1,
          maximum: 100,
          default: 50
        },
        cursor: {
          type: "string",
          description: "Pagination cursor for next page"
        }
      },
      required: ["ticket_id"]
    }
  },

  gorgias_list_customers: {
    name: "gorgias_list_customers",
    description: "List customers for contact management and email extraction. Supports filtering by email and external ID.",
    inputSchema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "Filter by specific email address"
        },
        external_id: {
          type: "string",
          description: "Filter by external ID"
        },
        limit: {
          type: "number",
          description: "Number of results to return",
          minimum: 1,
          maximum: 100,
          default: 50
        },
        cursor: {
          type: "string",
          description: "Pagination cursor for next page"
        },
        order_by: {
          type: "string",
          description: "Sort order",
          enum: ["created_datetime", "updated_datetime", "email"],
          default: "created_datetime"
        },
        order_direction: {
          type: "string",
          description: "Sort direction",
          enum: ["asc", "desc"],
          default: "desc"
        }
      },
      required: []
    }
  },

  gorgias_extract_customer_emails: {
    name: "gorgias_extract_customer_emails",
    description: "Extract customer email data in a structured format suitable for spreadsheet automation. Aggregates customer information with ticket statistics.",
    inputSchema: {
      type: "object",
      properties: {
        date_from: {
          type: "string",
          description: "Start date filter (ISO 8601 format: YYYY-MM-DD)",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$"
        },
        date_to: {
          type: "string",
          description: "End date filter (ISO 8601 format: YYYY-MM-DD)",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$"
        },
        status_filter: {
          type: "array",
          items: {
            type: "string",
            enum: ["open", "closed", "resolved", "pending", "spam"]
          },
          description: "Filter by ticket status (array of statuses)"
        },
        include_tags: {
          type: "boolean",
          description: "Include tag information in the output",
          default: false
        },
        include_satisfaction: {
          type: "boolean",
          description: "Include customer satisfaction scores",
          default: false
        },
        format: {
          type: "string",
          description: "Output format for the data",
          enum: ["json", "csv", "table"],
          default: "json"
        },
        limit: {
          type: "number",
          description: "Maximum number of customers to extract",
          minimum: 1,
          maximum: 1000,
          default: 100
        }
      },
      required: []
    }
  }
};