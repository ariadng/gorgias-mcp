import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Logger } from './logger.js';
import { RateLimiter } from './rate-limiter.js';
import { RetryHandler } from './retry-handler.js';
import { 
  Ticket, 
  Customer, 
  Message, 
  PaginatedResponse, 
  CustomerEmailData,
  ERROR_CODES,
  MessageRequest,
  TicketUpdate,
  CustomerCreate,
  CustomerDetails,
  Event,
  TicketSearchQuery,
  Integration
} from '../types/gorgias.js';
import { ServerConfig } from '../types/config.js';

export class GorgiasClient {
  private client: AxiosInstance;
  private logger: Logger;
  private rateLimiter: RateLimiter;
  private retryHandler: RetryHandler;
  private baseURL: string;

  constructor(config: ServerConfig, logger: Logger) {
    this.logger = logger;
    this.baseURL = `https://${config.domain}.gorgias.com/api`;
    
    // Initialize rate limiter for Gorgias API (40 requests per 20 seconds)
    this.rateLimiter = new RateLimiter(40, 20000, logger);
    
    // Initialize retry handler
    this.retryHandler = new RetryHandler(
      config.retryAttempts || 3,
      config.retryDelay || 1000,
      logger
    );

    // Create axios instance with authentication
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.username}:${config.apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
        'User-Agent': 'gorgias-mcp-server/1.0.0'
      },
    });

    // Log the authentication details for debugging
    this.logger.debug(`API Base URL: ${this.baseURL}`);
    this.logger.debug(`Auth header: Basic ${Buffer.from(`${config.username}:${config.apiKey}`).toString('base64')}`);

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
      (response: AxiosResponse) => {
        this.logger.debug(`Response received: ${response.status} from ${response.config.url}`);
        
        // Log rate limit headers if available
        const rateLimitHeaders = {
          remaining: response.headers['x-gorgias-account-api-call-limit-remaining'],
          reset: response.headers['x-gorgias-account-api-call-limit-reset'],
          retryAfter: response.headers['retry-after']
        };
        
        if (rateLimitHeaders.remaining) {
          this.logger.debug(`Rate limit remaining: ${rateLimitHeaders.remaining}`);
        }
        
        return response;
      },
      (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        const url = error.config?.url;
        
        this.logger.error(`Request failed: ${status} ${message} (${url})`);
        
        // Transform HTTP errors to domain errors
        if (status === 401) {
          throw new Error(`${ERROR_CODES.UNAUTHORIZED}: Invalid API credentials - ${message}`);
        } else if (status === 403) {
          throw new Error(`${ERROR_CODES.FORBIDDEN}: Access denied - ${message}`);
        } else if (status === 404) {
          throw new Error(`${ERROR_CODES.RESOURCE_NOT_FOUND}: Resource not found - ${message}`);
        } else if (status === 429) {
          throw new Error(`${ERROR_CODES.RATE_LIMIT_EXCEEDED}: Rate limit exceeded - ${message}`);
        } else if (status && status >= 500) {
          throw new Error(`${ERROR_CODES.NETWORK_ERROR}: Server error (${status}) - ${message}`);
        } else {
          throw new Error(`${ERROR_CODES.NETWORK_ERROR}: Request failed - ${message}`);
        }
      }
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      this.logger.info('Testing Gorgias API connection...');
      await this.client.get('/tickets', { params: { limit: 1 } });
      this.logger.info('Gorgias API connection successful');
      return true;
    } catch (error) {
      this.logger.error('Gorgias API connection failed:', error);
      return false;
    }
  }

  async listTickets(params: {
    customer_id?: number;
    status?: string;
    channel?: string;
    tags?: string[];
    limit?: number;
    cursor?: string;
    order_by?: string;
    order_direction?: string;
  } = {}): Promise<PaginatedResponse<Ticket>> {
    return this.retryHandler.executeWithRetry(async () => {
      const queryParams: any = {};
      
      // Only add supported parameters
      if (params.limit) queryParams.limit = params.limit;
      if (params.cursor) queryParams.cursor = params.cursor;
      if (params.customer_id) queryParams.customer_id = params.customer_id;
      
      // Handle order_by format: must be like "created_datetime:desc"
      if (params.order_by) {
        const direction = params.order_direction || 'desc';
        queryParams.order_by = `${params.order_by}:${direction}`;
      }
      
      const response = await this.client.get('/tickets', { params: queryParams });
      return response.data;
    }, 'listTickets');
  }

  async getTicket(ticketId: number): Promise<Ticket> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.client.get(`/tickets/${ticketId}`);
      return response.data;
    }, 'getTicket');
  }

  async listTicketMessages(ticketId: number, params: {
    limit?: number;
    cursor?: string;
  } = {}): Promise<PaginatedResponse<Message>> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.client.get(`/tickets/${ticketId}/messages`, { params });
      return response.data;
    }, 'listTicketMessages');
  }

  async listCustomers(params: {
    email?: string;
    external_id?: string;
    limit?: number;
    cursor?: string;
    order_by?: string;
    order_direction?: string;
  } = {}): Promise<PaginatedResponse<Customer>> {
    return this.retryHandler.executeWithRetry(async () => {
      const queryParams: any = {};
      
      // Only add supported parameters
      if (params.limit) queryParams.limit = params.limit;
      if (params.cursor) queryParams.cursor = params.cursor;
      if (params.email) queryParams.email = params.email;
      if (params.external_id) queryParams.external_id = params.external_id;
      
      // Handle order_by format: must be like "created_datetime:desc"
      if (params.order_by) {
        const direction = params.order_direction || 'desc';
        queryParams.order_by = `${params.order_by}:${direction}`;
      }
      
      const response = await this.client.get('/customers', { params: queryParams });
      return response.data;
    }, 'listCustomers');
  }

  async getCustomer(customerId: number): Promise<Customer> {
    return this.retryHandler.executeWithRetry(async () => {
      const response = await this.client.get(`/customers/${customerId}`);
      return response.data;
    }, 'getCustomer');
  }

  async extractCustomerEmails(params: {
    date_from?: string;
    date_to?: string;
    status_filter?: string[];
    include_tags?: boolean;
    include_satisfaction?: boolean;
    limit?: number;
  } = {}): Promise<CustomerEmailData[]> {
    const customerEmails: CustomerEmailData[] = [];
    let cursor: string | undefined;
    let processedCount = 0;
    const maxLimit = params.limit || 100;

    this.logger.info(`Extracting customer emails with params:`, params);

    try {
      // First, get all customers
      do {
        const customers = await this.listCustomers({
          limit: Math.min(100, maxLimit - processedCount),
          cursor,
          order_by: 'created_datetime',
          order_direction: 'desc'
        });

        // Process each customer
        for (const customer of customers.data) {
          if (processedCount >= maxLimit) break;

          try {
            // Get tickets for this customer
            const tickets = await this.listTickets({
              customer_id: customer.id,
              limit: 50 // Get reasonable number of tickets per customer
            });

            // Filter tickets by date if specified
            let filteredTickets = tickets.data;
            if (params.date_from || params.date_to) {
              filteredTickets = tickets.data.filter(ticket => {
                const ticketDate = new Date(ticket.created_datetime);
                const fromDate = params.date_from ? new Date(params.date_from) : null;
                const toDate = params.date_to ? new Date(params.date_to) : null;
                
                return (!fromDate || ticketDate >= fromDate) && 
                       (!toDate || ticketDate <= toDate);
              });
            }

            // Filter by status if specified
            if (params.status_filter && params.status_filter.length > 0) {
              filteredTickets = filteredTickets.filter(ticket => 
                params.status_filter!.includes(ticket.status)
              );
            }

            // Calculate customer email data
            const customerData: CustomerEmailData = {
              customer_id: customer.id,
              email: customer.email,
              firstname: customer.firstname,
              lastname: customer.lastname,
              ticket_count: filteredTickets.length,
              last_ticket_date: filteredTickets.length > 0 
                ? filteredTickets.sort((a, b) => 
                    new Date(b.created_datetime).getTime() - new Date(a.created_datetime).getTime()
                  )[0].created_datetime
                : undefined,
              tags: params.include_tags 
                ? [...new Set(filteredTickets.flatMap(ticket => ticket.tags.map(tag => tag.name)))]
                : [],
              status: filteredTickets.length > 0 ? filteredTickets[0].status : 'unknown',
              satisfaction_score: params.include_satisfaction 
                ? this.calculateAverageSatisfaction(filteredTickets)
                : undefined,
              total_messages: filteredTickets.reduce((sum, ticket) => sum + ticket.messages_count, 0),
              channels: [...new Set(filteredTickets.map(ticket => ticket.channel))]
            };

            customerEmails.push(customerData);
            processedCount++;
            
            this.logger.debug(`Processed customer ${customer.email} (${processedCount}/${maxLimit})`);

          } catch (error) {
            this.logger.warn(`Failed to process customer ${customer.email}:`, error);
          }
        }

        cursor = customers.meta.next_cursor;
      } while (cursor && processedCount < maxLimit);

      this.logger.info(`Successfully extracted ${customerEmails.length} customer email records`);
      return customerEmails;

    } catch (error) {
      this.logger.error('Failed to extract customer emails:', error);
      throw error;
    }
  }

  private calculateAverageSatisfaction(tickets: Ticket[]): number | undefined {
    const satisfactionScores = tickets
      .filter(ticket => ticket.satisfaction_survey?.score)
      .map(ticket => ticket.satisfaction_survey!.score);

    if (satisfactionScores.length === 0) return undefined;

    const average = satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length;
    return Math.round(average * 100) / 100; // Round to 2 decimal places
  }

  // New methods for enhanced automation tools

  async sendReply(messageRequest: MessageRequest): Promise<Message> {
    return this.retryHandler.executeWithRetry(async () => {
      const { ticket_id, message_type, body_text, body_html, sender_email, receiver_email, subject, source_from_address } = messageRequest;
      
      // Build the message payload based on message type
      const messagePayload: any = {
        body_text,
        body_html: body_html || body_text,
        via: "api"
      };

      // Set message properties based on type
      if (message_type === 'outgoing') {
        if (!receiver_email) {
          throw new Error(`${ERROR_CODES.VALIDATION_ERROR}: receiver_email is required for outgoing messages`);
        }
        messagePayload.from_agent = true;
        messagePayload.channel = "email";
        messagePayload.receiver = { email: receiver_email };
        messagePayload.sender = { email: sender_email };
        
        if (source_from_address) {
          messagePayload.source = {
            to: [{ address: receiver_email }],
            from: { address: source_from_address }
          };
        }
      } else if (message_type === 'internal-note') {
        messagePayload.from_agent = true;
        messagePayload.channel = "internal-note";
        messagePayload.sender = { email: sender_email };
      } else if (message_type === 'incoming') {
        messagePayload.from_agent = false;
        messagePayload.channel = "email";
        messagePayload.sender = { email: sender_email };
      }

      if (subject) {
        messagePayload.subject = subject;
      }

      const response = await this.client.post(`/tickets/${ticket_id}/messages`, messagePayload);
      return response.data;
    }, 'sendReply');
  }

  async updateTicket(ticketUpdate: TicketUpdate): Promise<Ticket> {
    return this.retryHandler.executeWithRetry(async () => {
      const { ticket_id, ...updateData } = ticketUpdate;
      
      // Only include non-null fields in the request
      const payload: any = {};
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          payload[key] = value;
        }
      });

      const response = await this.client.put(`/tickets/${ticket_id}`, payload);
      return response.data;
    }, 'updateTicket');
  }

  async getCustomerDetails(customerId: number, params: {
    include_channels?: boolean;
    include_integrations?: boolean;
    include_meta?: boolean;
  } = {}): Promise<CustomerDetails> {
    return this.retryHandler.executeWithRetry(async () => {
      // Get basic customer info first (without extra parameters that may cause 400)
      const response = await this.client.get(`/customers/${customerId}`);
      return response.data;
    }, 'getCustomerDetails');
  }

  async createCustomer(customerData: CustomerCreate): Promise<Customer> {
    return this.retryHandler.executeWithRetry(async () => {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerData.email)) {
        throw new Error(`${ERROR_CODES.VALIDATION_ERROR}: Invalid email format: ${customerData.email}`);
      }

      const response = await this.client.post('/customers', customerData);
      return response.data;
    }, 'createCustomer');
  }

  async listEvents(params: {
    object_type?: string;
    object_id?: number;
    event_type?: string;
    user_id?: number;
    limit?: number;
    cursor?: string;
    order_by?: string;
  } = {}): Promise<PaginatedResponse<Event>> {
    return this.retryHandler.executeWithRetry(async () => {
      try {
        // Try the official events endpoint first
        const queryParams: any = {};
        if (params.limit) queryParams.limit = params.limit;
        if (params.cursor) queryParams.cursor = params.cursor;
        if (params.object_type) queryParams.object_type = params.object_type;
        if (params.object_id) queryParams.object_id = params.object_id;
        if (params.event_type) queryParams.event_type = params.event_type;
        if (params.user_id) queryParams.user_id = params.user_id;

        const response = await this.client.get('/events', { params: queryParams });
        return response.data;
      } catch (error) {
        // Fallback: Use ticket activity as events alternative
        this.logger.warn('Events endpoint failed, falling back to ticket activity');
        
        const ticketParams: any = {};
        if (params.limit) ticketParams.limit = params.limit;
        if (params.cursor) ticketParams.cursor = params.cursor;

        const response = await this.client.get('/tickets', { params: ticketParams });
        
        // Transform tickets to event-like objects for compatibility
        let eventData = response.data.data ? response.data.data.map((ticket: any) => ({
          id: ticket.id,
          object_type: 'ticket',
          object_id: ticket.id,
          event_type: 'ticket-activity',
          user_id: ticket.assignee_user?.id,
          user: ticket.assignee_user,
          data: { 
            ticket,
            status: ticket.status,
            subject: ticket.subject,
            customer: ticket.customer
          },
          created_datetime: ticket.updated_datetime || ticket.created_datetime
        })) : [];

        // Apply filtering if specific parameters were requested
        if (params.object_type && params.object_type !== 'ticket') {
          eventData = []; // No events for non-ticket objects in fallback
        }
        if (params.object_id) {
          eventData = eventData.filter((event: any) => event.object_id === params.object_id);
        }
        if (params.user_id) {
          eventData = eventData.filter((event: any) => event.user_id === params.user_id);
        }

        return {
          data: eventData,
          meta: { ...response.data.meta, total_resources: eventData.length }
        };
      }
    }, 'listEvents');
  }

  async searchTickets(searchQuery: TicketSearchQuery): Promise<PaginatedResponse<Ticket>> {
    return this.retryHandler.executeWithRetry(async () => {
      try {
        // Try the official POST /api/search endpoint first
        const searchPayload: any = {
          query: searchQuery.query,
          type: "ticket",
          limit: searchQuery.limit || 50
        };

        const response = await this.client.post('/search', searchPayload);
        return response.data;
      } catch (error) {
        // Fallback: Use basic ticket listing with filtering as search alternative
        this.logger.warn('Search endpoint failed, falling back to filtered ticket listing');
        
        const queryParams: any = {};
        if (searchQuery.limit) queryParams.limit = searchQuery.limit;
        if (searchQuery.cursor) queryParams.cursor = searchQuery.cursor;
        
        const response = await this.client.get('/tickets', { params: queryParams });
        
        // Filter results client-side based on search query
        let filteredData = response.data.data || [];
        if (searchQuery.query) {
          const searchTerm = searchQuery.query.toLowerCase();
          filteredData = filteredData.filter((ticket: any) => 
            ticket.subject?.toLowerCase().includes(searchTerm) ||
            ticket.customer?.email?.toLowerCase().includes(searchTerm)
          );
        }

        // Apply additional filters
        if (searchQuery.status) {
          filteredData = filteredData.filter((ticket: any) => ticket.status === searchQuery.status);
        }
        if (searchQuery.channel) {
          filteredData = filteredData.filter((ticket: any) => ticket.channel === searchQuery.channel);
        }
        if (searchQuery.customer_email) {
          filteredData = filteredData.filter((ticket: any) => 
            ticket.customer?.email === searchQuery.customer_email
          );
        }

        return {
          data: filteredData,
          meta: { ...response.data.meta, total_resources: filteredData.length }
        };
      }
    }, 'searchTickets');
  }

  async getIntegrations(params: {
    type?: string;
    active_only?: boolean;
    limit?: number;
  } = {}): Promise<PaginatedResponse<Integration>> {
    return this.retryHandler.executeWithRetry(async () => {
      const queryParams: any = {};
      
      // Add supported parameters based on official API docs
      if (params.limit) queryParams.limit = params.limit;

      // Use the correct API endpoint from official docs: GET /api/integrations
      const response = await this.client.get('/integrations', { params: queryParams });
      return response.data;
    }, 'getIntegrations');
  }

  getRateLimitStatus(): {
    remaining: number;
    resetTime: number;
  } {
    return {
      remaining: this.rateLimiter.getRemainingRequests(),
      resetTime: this.rateLimiter.getResetTime()
    };
  }
}