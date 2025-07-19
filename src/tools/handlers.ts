import { GorgiasClient } from '../utils/gorgias-client.js';
import { Logger } from '../utils/logger.js';
import { validateInput, sanitizeInput, createValidationError } from '../utils/validation.js';
import { TOOL_SCHEMAS } from './schemas.js';
import { CustomerEmailData } from '../types/gorgias.js';

export class ToolHandlers {
  constructor(
    private gorgiasClient: GorgiasClient,
    private logger: Logger
  ) {}

  async handleListTickets(args: any): Promise<any> {
    try {
      // Sanitize and validate input
      const sanitizedArgs = sanitizeInput(args);
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.gorgias_list_tickets.inputSchema);
      
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      this.logger.info('Listing tickets with parameters:', sanitizedArgs);
      
      const result = await this.gorgiasClient.listTickets(sanitizedArgs);
      
      // Format response for MCP
      const total = result.meta.total_resources || result.meta.total_count || 'unknown';
      const summary = `Found ${result.data.length} tickets (total: ${total})`;
      const ticketsList = result.data.map(ticket => 
        `ID: ${ticket.id}, Subject: ${ticket.subject}, Status: ${ticket.status}, Customer: ${ticket.customer.email}`
      ).join('\n');

      return {
        content: [
          {
            type: "text",
            text: `${summary}\n\nTickets:\n${ticketsList}\n\nPagination: ${result.meta.next_cursor ? 'More results available' : 'End of results'}`
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in handleListTickets:', error);
      throw error;
    }
  }

  async handleGetTicket(args: any): Promise<any> {
    try {
      const sanitizedArgs = sanitizeInput(args);
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.gorgias_get_ticket.inputSchema);
      
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      const { ticket_id } = sanitizedArgs;
      this.logger.info(`Getting ticket details for ID: ${ticket_id}`);
      
      const ticket = await this.gorgiasClient.getTicket(ticket_id);
      
      // Format detailed ticket information
      const ticketInfo = [
        `Ticket ID: ${ticket.id}`,
        `Subject: ${ticket.subject}`,
        `Status: ${ticket.status}`,
        `Channel: ${ticket.channel}`,
        `Priority: ${ticket.priority}`,
        `Created: ${ticket.created_datetime}`,
        `Last Updated: ${ticket.updated_datetime}`,
        `Customer: ${ticket.customer.email} (${ticket.customer.firstname || ''} ${ticket.customer.lastname || ''})`
      ];

      if (ticket.assignee_user) {
        ticketInfo.push(`Assignee: ${ticket.assignee_user.firstname} ${ticket.assignee_user.lastname}`);
      }

      if (ticket.tags.length > 0) {
        ticketInfo.push(`Tags: ${ticket.tags.map(tag => tag.name).join(', ')}`);
      }

      if (ticket.satisfaction_survey) {
        ticketInfo.push(`Satisfaction Score: ${ticket.satisfaction_survey.score}/5`);
      }

      ticketInfo.push(`Total Messages: ${ticket.messages_count}`);

      return {
        content: [
          {
            type: "text",
            text: ticketInfo.join('\n')
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in handleGetTicket:', error);
      throw error;
    }
  }

  async handleListTicketMessages(args: any): Promise<any> {
    try {
      const sanitizedArgs = sanitizeInput(args);
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.gorgias_list_ticket_messages.inputSchema);
      
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      const { ticket_id, limit, cursor } = sanitizedArgs;
      this.logger.info(`Getting messages for ticket ID: ${ticket_id}`);
      
      const result = await this.gorgiasClient.listTicketMessages(ticket_id, { limit, cursor });
      
      const summary = `Found ${result.data.length} messages for ticket ${ticket_id}`;
      const messagesList = result.data.map(message => {
        const sender = message.from_agent ? 'Agent' : 'Customer';
        const timestamp = new Date(message.created_datetime).toLocaleString();
        const preview = message.stripped_text.substring(0, 100) + (message.stripped_text.length > 100 ? '...' : '');
        
        return `[${timestamp}] ${sender} (${message.sender.email}): ${preview}`;
      }).join('\n\n');

      return {
        content: [
          {
            type: "text",
            text: `${summary}\n\nMessages:\n${messagesList}\n\nPagination: ${result.meta.next_cursor ? 'More messages available' : 'End of messages'}`
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in handleListTicketMessages:', error);
      throw error;
    }
  }

  async handleListCustomers(args: any): Promise<any> {
    try {
      const sanitizedArgs = sanitizeInput(args);
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.gorgias_list_customers.inputSchema);
      
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      this.logger.info('Listing customers with parameters:', sanitizedArgs);
      
      const result = await this.gorgiasClient.listCustomers(sanitizedArgs);
      
      const total = result.meta.total_resources || result.meta.total_count || 'unknown';
      const summary = `Found ${result.data.length} customers (total: ${total})`;
      const customersList = result.data.map(customer => {
        const name = customer.firstname || customer.lastname 
          ? `${customer.firstname || ''} ${customer.lastname || ''}`.trim()
          : 'N/A';
        return `ID: ${customer.id}, Email: ${customer.email}, Name: ${name}, Created: ${customer.created_datetime}`;
      }).join('\n');

      return {
        content: [
          {
            type: "text",
            text: `${summary}\n\nCustomers:\n${customersList}\n\nPagination: ${result.meta.next_cursor ? 'More results available' : 'End of results'}`
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in handleListCustomers:', error);
      throw error;
    }
  }

  async handleExtractCustomerEmails(args: any): Promise<any> {
    try {
      const sanitizedArgs = sanitizeInput(args);
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.gorgias_extract_customer_emails.inputSchema);
      
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      this.logger.info('Extracting customer emails with parameters:', sanitizedArgs);
      
      const customerEmails = await this.gorgiasClient.extractCustomerEmails(sanitizedArgs);
      const format = sanitizedArgs.format || 'json';
      
      // Format output based on requested format
      let output: string;
      
      switch (format) {
        case 'csv':
          output = this.formatAsCSV(customerEmails, sanitizedArgs);
          break;
        case 'table':
          output = this.formatAsTable(customerEmails, sanitizedArgs);
          break;
        case 'json':
        default:
          output = JSON.stringify(customerEmails, null, 2);
          break;
      }

      const summary = `Successfully extracted ${customerEmails.length} customer email records`;
      
      return {
        content: [
          {
            type: "text",
            text: `${summary}\n\nCustomer Email Data (${format.toUpperCase()} format):\n\n${output}`
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in handleExtractCustomerEmails:', error);
      throw error;
    }
  }

  private formatAsCSV(data: CustomerEmailData[], args: any): string {
    const headers = ['Customer ID', 'Email', 'First Name', 'Last Name', 'Ticket Count', 'Last Ticket Date', 'Status', 'Total Messages', 'Channels'];
    
    if (args.include_tags) {
      headers.push('Tags');
    }
    
    if (args.include_satisfaction) {
      headers.push('Satisfaction Score');
    }

    const rows = data.map(customer => {
      const row = [
        customer.customer_id,
        customer.email,
        customer.firstname || '',
        customer.lastname || '',
        customer.ticket_count,
        customer.last_ticket_date || '',
        customer.status,
        customer.total_messages,
        customer.channels.join(';')
      ];

      if (args.include_tags) {
        row.push(customer.tags.join(';'));
      }

      if (args.include_satisfaction) {
        row.push(customer.satisfaction_score?.toString() || '');
      }

      return row.map(cell => `"${cell}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  private formatAsTable(data: CustomerEmailData[], args: any): string {
    if (data.length === 0) return 'No customer data found.';

    const headers = ['ID', 'Email', 'Name', 'Tickets', 'Last Ticket', 'Status'];
    const rows = data.map(customer => [
      customer.customer_id.toString(),
      customer.email,
      `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || 'N/A',
      customer.ticket_count.toString(),
      customer.last_ticket_date ? new Date(customer.last_ticket_date).toLocaleDateString() : 'N/A',
      customer.status
    ]);

    // Calculate column widths
    const widths = headers.map((header, i) => 
      Math.max(header.length, ...rows.map(row => row[i].length))
    );

    // Format table
    const separator = widths.map(w => '-'.repeat(w)).join(' | ');
    const headerRow = headers.map((header, i) => header.padEnd(widths[i])).join(' | ');
    const dataRows = rows.map(row => 
      row.map((cell, i) => cell.padEnd(widths[i])).join(' | ')
    );

    return [headerRow, separator, ...dataRows].join('\n');
  }

  // New handlers for enhanced automation tools

  async handleSendReply(args: any): Promise<any> {
    try {
      const sanitizedArgs = sanitizeInput(args);
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.gorgias_send_reply.inputSchema);
      
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      this.logger.info(`Sending ${sanitizedArgs.message_type} reply to ticket ${sanitizedArgs.ticket_id}`);

      const result = await this.gorgiasClient.sendReply(sanitizedArgs);

      return {
        content: [
          {
            type: "text",
            text: `Successfully sent ${sanitizedArgs.message_type} message to ticket ${sanitizedArgs.ticket_id}\n\nMessage ID: ${result.id}\nSender: ${result.sender.email}\nReceiver: ${result.receiver?.email || 'N/A'}\nChannel: ${result.channel}\nSubject: ${result.subject || 'N/A'}\nCreated: ${result.created_datetime}\n\nMessage content:\n${result.body_text}`
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in handleSendReply:', error);
      throw error;
    }
  }

  async handleUpdateTicket(args: any): Promise<any> {
    try {
      const sanitizedArgs = sanitizeInput(args);
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.gorgias_update_ticket.inputSchema);
      
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      this.logger.info(`Updating ticket ${sanitizedArgs.ticket_id} with:`, sanitizedArgs);

      const result = await this.gorgiasClient.updateTicket(sanitizedArgs);

      const updatedFields = Object.keys(sanitizedArgs).filter(key => key !== 'ticket_id');
      const updateSummary = updatedFields.map(field => {
        const value = sanitizedArgs[field];
        if (field === 'tags' && Array.isArray(value)) {
          return `${field}: [${value.map(tag => tag.name).join(', ')}]`;
        }
        return `${field}: ${value}`;
      }).join('\n');

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated ticket ${result.id}\n\nUpdated fields:\n${updateSummary}\n\nTicket details:\nID: ${result.id}\nSubject: ${result.subject}\nStatus: ${result.status}\nPriority: ${result.priority}\nAssignee: ${result.assignee_user?.email || 'Unassigned'}\nCustomer: ${result.customer.email}\nTags: [${result.tags.map(tag => tag.name).join(', ')}]\nUpdated: ${result.updated_datetime}`
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in handleUpdateTicket:', error);
      throw error;
    }
  }

  async handleGetCustomer(args: any): Promise<any> {
    try {
      const sanitizedArgs = sanitizeInput(args);
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.gorgias_get_customer.inputSchema);
      
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      this.logger.info(`Getting customer details for ID ${sanitizedArgs.customer_id}`);

      const result = await this.gorgiasClient.getCustomerDetails(sanitizedArgs.customer_id, {
        include_channels: sanitizedArgs.include_channels,
        include_integrations: sanitizedArgs.include_integrations,
        include_meta: sanitizedArgs.include_meta
      });

      const channelsInfo = result.channels.map(channel => 
        `${channel.type}: ${channel.name || 'N/A'}`
      ).join('\n');

      const integrationsInfo = result.integrations ? 
        result.integrations.map(integration => 
          `${integration.type}: ${integration.name} (${integration.enabled ? 'enabled' : 'disabled'})`
        ).join('\n') : 'No integration data';

      const metaInfo = Object.entries(result.meta).map(([key, value]) => 
        `${key}: ${value}`
      ).join('\n');

      return {
        content: [
          {
            type: "text",
            text: `Customer Details for ID ${result.id}\n\nBasic Information:\nEmail: ${result.email}\nName: ${result.firstname || ''} ${result.lastname || ''}\nExternal ID: ${result.external_id || 'N/A'}\nCreated: ${result.created_datetime}\nUpdated: ${result.updated_datetime}\n\nCommunication Channels:\n${channelsInfo || 'No channels'}\n\nIntegrations:\n${integrationsInfo}\n\nCustom Metadata:\n${metaInfo || 'No metadata'}`
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in handleGetCustomer:', error);
      throw error;
    }
  }

  async handleCreateCustomer(args: any): Promise<any> {
    try {
      const sanitizedArgs = sanitizeInput(args);
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.gorgias_create_customer.inputSchema);
      
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      this.logger.info(`Creating new customer with email ${sanitizedArgs.email}`);

      const result = await this.gorgiasClient.createCustomer(sanitizedArgs);

      const channelsInfo = result.channels.map(channel => 
        `${channel.type}: ${channel.name || 'N/A'}`
      ).join('\n');

      return {
        content: [
          {
            type: "text",
            text: `Successfully created customer\n\nCustomer Details:\nID: ${result.id}\nEmail: ${result.email}\nName: ${result.firstname || ''} ${result.lastname || ''}\nExternal ID: ${result.external_id || 'N/A'}\nCreated: ${result.created_datetime}\n\nChannels:\n${channelsInfo || 'No channels'}\n\nMetadata:\n${JSON.stringify(result.meta, null, 2)}`
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in handleCreateCustomer:', error);
      throw error;
    }
  }

  async handleListEvents(args: any): Promise<any> {
    try {
      const sanitizedArgs = sanitizeInput(args);
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.gorgias_list_events.inputSchema);
      
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      this.logger.info('Listing events with parameters:', sanitizedArgs);

      const result = await this.gorgiasClient.listEvents(sanitizedArgs);

      const eventsList = result.data.map(event => 
        `${event.created_datetime} | ${event.event_type} | ${event.object_type}:${event.object_id} | User: ${event.user?.email || 'System'}`
      ).join('\n');

      const total = result.meta.total_resources || result.meta.total_count || 'unknown';

      return {
        content: [
          {
            type: "text",
            text: `Found ${result.data.length} events (total: ${total})\n\nEvents:\n${eventsList}\n\nPagination: ${result.meta.next_cursor ? 'More results available' : 'End of results'}`
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in handleListEvents:', error);
      throw error;
    }
  }

  async handleSearchTickets(args: any): Promise<any> {
    try {
      const sanitizedArgs = sanitizeInput(args);
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.gorgias_search_tickets.inputSchema);
      
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      this.logger.info(`Searching tickets with query: "${sanitizedArgs.query}"`);

      const result = await this.gorgiasClient.searchTickets(sanitizedArgs);

      const ticketsList = result.data.map(ticket => 
        `ID: ${ticket.id} | ${ticket.subject} | Status: ${ticket.status} | Customer: ${ticket.customer.email} | Channel: ${ticket.channel} | Created: ${ticket.created_datetime}`
      ).join('\n');

      const total = result.meta.total_resources || result.meta.total_count || 'unknown';
      const searchFilters = Object.entries(sanitizedArgs)
        .filter(([key, value]) => key !== 'query' && value !== undefined)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');

      return {
        content: [
          {
            type: "text",
            text: `Search Results for "${sanitizedArgs.query}"\n${searchFilters ? `Filters: ${searchFilters}\n` : ''}\nFound ${result.data.length} tickets (total: ${total})\n\nTickets:\n${ticketsList}\n\nPagination: ${result.meta.next_cursor ? 'More results available' : 'End of results'}`
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in handleSearchTickets:', error);
      throw error;
    }
  }

  async handleGetIntegrations(args: any): Promise<any> {
    try {
      const sanitizedArgs = sanitizeInput(args);
      const validation = validateInput(sanitizedArgs, TOOL_SCHEMAS.gorgias_get_integrations.inputSchema);
      
      if (!validation.isValid) {
        throw createValidationError(`Invalid input: ${validation.errors.join(', ')}`);
      }

      this.logger.info('Listing integrations with parameters:', sanitizedArgs);

      const result = await this.gorgiasClient.getIntegrations(sanitizedArgs);

      const integrationsList = result.data.map(integration => {
        const emailInfo = integration.settings.email ? ` | Email: ${integration.settings.email}` : '';
        const fromNameInfo = integration.settings.from_name ? ` | From: ${integration.settings.from_name}` : '';
        return `ID: ${integration.id} | ${integration.name} | Type: ${integration.type} | Status: ${integration.enabled ? 'Active' : 'Inactive'}${emailInfo}${fromNameInfo}`;
      }).join('\n');

      const total = result.meta.total_resources || result.meta.total_count || 'unknown';
      const activeCount = result.data.filter(integration => integration.enabled).length;

      return {
        content: [
          {
            type: "text",
            text: `Found ${result.data.length} integrations (${activeCount} active, total: ${total})\n\nIntegrations:\n${integrationsList}\n\nPagination: ${result.meta.next_cursor ? 'More results available' : 'End of results'}`
          }
        ]
      };
    } catch (error) {
      this.logger.error('Error in handleGetIntegrations:', error);
      throw error;
    }
  }
}