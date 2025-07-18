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
}