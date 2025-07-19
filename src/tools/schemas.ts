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
  },

  // New tools for complete customer service automation

  gorgias_send_reply: {
    name: "gorgias_send_reply",
    description: "Send replies to tickets (outgoing messages, internal notes, or simulated incoming messages). Enables automated customer responses and internal communication.",
    inputSchema: {
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
  },

  gorgias_update_ticket: {
    name: "gorgias_update_ticket",
    description: "Update ticket properties including status, assignee, tags, and priority. Essential for automated ticket management workflows.",
    inputSchema: {
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
  },

  gorgias_get_customer: {
    name: "gorgias_get_customer",
    description: "Get detailed customer information including channels and integrations. Provides comprehensive customer data for automation workflows.",
    inputSchema: {
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
  },

  gorgias_create_customer: {
    name: "gorgias_create_customer",
    description: "Create new customers for automation workflows. Enables programmatic customer creation with channels and metadata.",
    inputSchema: {
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
  },

  gorgias_list_events: {
    name: "gorgias_list_events",
    description: "Get activity/event history for tickets, customers, and users. Provides audit trail and activity tracking for automation workflows.",
    inputSchema: {
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
  },

  gorgias_search_tickets: {
    name: "gorgias_search_tickets",
    description: "Advanced ticket search with text queries and complex filtering. Enables sophisticated ticket discovery for automation workflows.",
    inputSchema: {
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
  },

  gorgias_get_integrations: {
    name: "gorgias_get_integrations",
    description: "List available email integrations for reply validation and management. Essential for validating source addresses before sending automated replies.",
    inputSchema: {
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
  }
};