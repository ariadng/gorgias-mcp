export interface Contact {
  id: number;
  name: string;
  email?: string;
  firstname?: string;
  lastname?: string;
}

export interface User {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  active: boolean;
  role: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface Channel {
  id: number;
  type: string;
  name: string;
  settings?: Record<string, any>;
}

export interface Customer {
  id: number;
  external_id?: string;
  email: string;
  firstname?: string;
  lastname?: string;
  name?: string;
  channels: Channel[];
  meta: Record<string, any>;
  language?: string;
  timezone?: string;
  created_datetime: string;
  updated_datetime: string;
}

export interface Ticket {
  id: number;
  external_id?: string;
  status: string;
  channel: string;
  subject: string;
  customer: Customer;
  assignee_user?: User;
  tags: Tag[];
  priority: string;
  created_datetime: string;
  updated_datetime: string;
  last_message_datetime: string;
  messages_count: number;
  satisfaction_survey?: {
    score: number;
    comment?: string;
  };
  custom_fields?: Record<string, any>;
}

export interface Message {
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
  stripped_html: string;
  attachments: Attachment[];
  created_datetime: string;
  updated_datetime: string;
  message_id?: string;
  in_reply_to?: string;
  references?: string;
}

export interface Attachment {
  id: number;
  name: string;
  size: number;
  content_type: string;
  url: string;
  public: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total_resources?: number;
    total_count?: number;
    prev_cursor?: string;
    next_cursor?: string;
  };
}

export interface CustomerEmailData {
  customer_id: number;
  email: string;
  firstname?: string;
  lastname?: string;
  ticket_count: number;
  last_ticket_date?: string;
  tags: string[];
  status: string;
  satisfaction_score?: number;
  total_messages: number;
  channels: string[];
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export const ERROR_CODES = {
  INVALID_API_KEY: 'INVALID_API_KEY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// New interfaces for additional tools

export interface MessageRequest {
  ticket_id: number;
  message_type: 'outgoing' | 'internal-note' | 'incoming';
  body_text: string;
  body_html?: string;
  sender_email: string;
  receiver_email?: string;
  subject?: string;
  source_from_address?: string;
}

export interface TicketUpdate {
  ticket_id: number;
  status?: 'open' | 'closed' | 'spam';
  assignee_user_id?: number | null;
  tags?: Array<{name: string}>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  subject?: string;
  meta?: Record<string, any>;
}

export interface CustomerCreate {
  email: string;
  firstname?: string;
  lastname?: string;
  external_id?: string;
  channels?: Array<{type: string; address: string}>;
  meta?: Record<string, any>;
}

export interface CustomerDetails extends Customer {
  integrations?: Integration[];
}

export interface Event {
  id: number;
  object_type: string;
  object_id: number;
  event_type: string;
  user_id?: number;
  user?: User;
  data?: Record<string, any>;
  created_datetime: string;
}

export interface TicketSearchQuery {
  query: string;
  channel?: 'email' | 'chat' | 'phone' | 'sms' | 'api';
  status?: 'open' | 'closed' | 'spam';
  assignee_user_id?: number;
  customer_email?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  limit?: number;
  cursor?: string;
}

export interface Integration {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
  settings: {
    email?: string;
    from_name?: string;
    reply_to?: string;
    [key: string]: any;
  };
  created_datetime: string;
  updated_datetime?: string;
}