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
  ERROR_CODES 
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