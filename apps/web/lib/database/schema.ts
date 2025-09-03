/**
 * JetVision Agent - Drizzle Database Schema
 * Private Aviation AI Platform with Apollo.io & Avinode Integration
 * 
 * This schema mirrors the Prisma schema for use with Drizzle ORM
 * and provides TypeScript types for database operations.
 */

import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  real,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ===========================
// ENUMS
// ===========================

export const userRoleEnum = pgEnum('user_role', [
  'USER',
  'ADMIN', 
  'PREMIUM',
  'EXECUTIVE_ASSISTANT'
]);

export const companySizeEnum = pgEnum('company_size', [
  'STARTUP',
  'SMALL',
  'MEDIUM',
  'LARGE',
  'ENTERPRISE'
]);

export const leadStatusEnum = pgEnum('lead_status', [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATING',
  'CLOSED_WON',
  'CLOSED_LOST',
  'UNRESPONSIVE'
]);

export const campaignTypeEnum = pgEnum('campaign_type', [
  'EMAIL_SEQUENCE',
  'LINKEDIN_OUTREACH',
  'PHONE_CAMPAIGN',
  'MIXED_TOUCH'
]);

export const campaignStatusEnum = pgEnum('campaign_status', [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED'
]);

export const targetStatusEnum = pgEnum('target_status', [
  'PENDING',
  'SENT',
  'DELIVERED',
  'OPENED',
  'CLICKED',
  'REPLIED',
  'BOUNCED',
  'UNSUBSCRIBED',
  'OPTED_OUT'
]);

export const aircraftCategoryEnum = pgEnum('aircraft_category', [
  'LIGHT',
  'MIDSIZE',
  'SUPER_MIDSIZE',
  'HEAVY',
  'ULTRA_LONG_RANGE',
  'TURBOPROP',
  'HELICOPTER'
]);

export const aircraftAvailabilityEnum = pgEnum('aircraft_availability', [
  'AVAILABLE',
  'BOOKED',
  'MAINTENANCE',
  'UNAVAILABLE'
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'REQUESTED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULED'
]);

export const conversationStatusEnum = pgEnum('conversation_status', [
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED'
]);

export const messageRoleEnum = pgEnum('message_role', [
  'USER',
  'ASSISTANT',
  'SYSTEM',
  'FUNCTION'
]);

export const integrationServiceEnum = pgEnum('integration_service', [
  'APOLLO_IO',
  'AVINODE',
  'N8N_WORKFLOW',
  'OPENAI',
  'ANTHROPIC',
  'SUPABASE'
]);

export const logStatusEnum = pgEnum('log_status', [
  'PENDING',
  'SUCCESS',
  'ERROR',
  'RETRY',
  'FAILED'
]);

// ===========================
// USER MANAGEMENT TABLES
// ===========================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: varchar('clerk_id', { length: 256 }).notNull().unique(),
  email: varchar('email', { length: 256 }).notNull().unique(),
  firstName: varchar('first_name', { length: 256 }),
  lastName: varchar('last_name', { length: 256 }),
  role: userRoleEnum('role').default('USER').notNull(),
  
  // Company relationship
  companyId: uuid('company_id'),
  
  // Professional details
  jobTitle: varchar('job_title', { length: 256 }),
  phone: varchar('phone', { length: 50 }),
  timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  
  // Preferences and settings
  preferences: json('preferences').default({}),
  metadata: json('metadata').default({}),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  clerkIdIdx: index('users_clerk_id_idx').on(table.clerkId),
  companyIdIdx: index('users_company_id_idx').on(table.companyId)
}));

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  domain: varchar('domain', { length: 256 }).notNull().unique(),
  
  // Business details
  industry: varchar('industry', { length: 256 }),
  size: companySizeEnum('size'),
  description: text('description'),
  website: varchar('website', { length: 512 }),
  
  // Apollo.io integration
  apolloAccountId: varchar('apollo_account_id', { length: 256 }).unique(),
  apolloSyncedAt: timestamp('apollo_synced_at', { withTimezone: true }),
  
  // Contact information
  address: text('address'),
  city: varchar('city', { length: 256 }),
  state: varchar('state', { length: 256 }),
  country: varchar('country', { length: 256 }).default('US').notNull(),
  postalCode: varchar('postal_code', { length: 20 }),
  
  // Metadata
  metadata: json('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}, (table) => ({
  domainIdx: index('companies_domain_idx').on(table.domain),
  apolloAccountIdIdx: index('companies_apollo_account_id_idx').on(table.apolloAccountId)
}));

export const executiveAssistants = pgTable('executive_assistants', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  
  // Executive details
  executiveName: varchar('executive_name', { length: 256 }).notNull(),
  executiveEmail: varchar('executive_email', { length: 256 }).notNull(),
  executiveTitle: varchar('executive_title', { length: 256 }),
  executiveCompany: varchar('executive_company', { length: 256 }),
  
  // Assistant preferences
  communicationPrefs: json('communication_prefs').default({}),
  delegatedActions: text('delegated_actions').array(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  userExecutiveUnique: unique('user_executive_unique').on(table.userId, table.executiveEmail),
  userIdIdx: index('executive_assistants_user_id_idx').on(table.userId)
}));

// ===========================
// APOLLO.IO LEAD MANAGEMENT
// ===========================

export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  apolloContactId: varchar('apollo_contact_id', { length: 256 }).notNull().unique(),
  
  // Contact information
  email: varchar('email', { length: 256 }).notNull(),
  firstName: varchar('first_name', { length: 256 }),
  lastName: varchar('last_name', { length: 256 }),
  jobTitle: varchar('job_title', { length: 256 }),
  phone: varchar('phone', { length: 50 }),
  linkedinUrl: varchar('linkedin_url', { length: 512 }),
  
  // Company relationship
  companyId: uuid('company_id').notNull(),
  
  // Lead status and scoring
  status: leadStatusEnum('status').default('NEW').notNull(),
  score: integer('score').default(0),
  lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
  nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
  
  // Apollo.io specific data
  apolloData: json('apollo_data').default({}),
  metadata: json('metadata').default({}),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}, (table) => ({
  apolloContactIdIdx: index('leads_apollo_contact_id_idx').on(table.apolloContactId),
  companyIdIdx: index('leads_company_id_idx').on(table.companyId),
  statusIdx: index('leads_status_idx').on(table.status),
  emailIdx: index('leads_email_idx').on(table.email)
}));

export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  type: campaignTypeEnum('type').notNull(),
  status: campaignStatusEnum('status').default('DRAFT').notNull(),
  
  // Campaign details
  description: text('description'),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  targetAudience: json('target_audience').default({}),
  
  // Email campaign specifics
  emailSubject: varchar('email_subject', { length: 512 }),
  emailTemplate: text('email_template'),
  
  // Performance metrics
  totalSent: integer('total_sent').default(0).notNull(),
  totalOpened: integer('total_opened').default(0).notNull(),
  totalClicked: integer('total_clicked').default(0).notNull(),
  totalReplied: integer('total_replied').default(0).notNull(),
  totalConverted: integer('total_converted').default(0).notNull(),
  
  // Metadata
  metadata: json('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}, (table) => ({
  statusIdx: index('campaigns_status_idx').on(table.status),
  typeIdx: index('campaigns_type_idx').on(table.type)
}));

export const campaignTargets = pgTable('campaign_targets', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').notNull(),
  
  leadId: uuid('lead_id'),
  userId: uuid('user_id'),
  
  // Email specific data
  emailAddress: varchar('email_address', { length: 256 }).notNull(),
  status: targetStatusEnum('status').default('PENDING').notNull(),
  
  // Tracking
  sentAt: timestamp('sent_at', { withTimezone: true }),
  openedAt: timestamp('opened_at', { withTimezone: true }),
  clickedAt: timestamp('clicked_at', { withTimezone: true }),
  repliedAt: timestamp('replied_at', { withTimezone: true }),
  bouncedAt: timestamp('bounced_at', { withTimezone: true }),
  
  // Response tracking
  responseCount: integer('response_count').default(0).notNull(),
  lastResponse: text('last_response'),
  
  // Metadata
  metadata: json('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  campaignEmailUnique: unique('campaign_email_unique').on(table.campaignId, table.emailAddress),
  campaignIdIdx: index('campaign_targets_campaign_id_idx').on(table.campaignId),
  leadIdIdx: index('campaign_targets_lead_id_idx').on(table.leadId),
  statusIdx: index('campaign_targets_status_idx').on(table.status)
}));

// ===========================
// AVINODE AIRCRAFT & BOOKING
// ===========================

export const aircraft = pgTable('aircraft', {
  id: uuid('id').defaultRandom().primaryKey(),
  avinodeId: varchar('avinode_id', { length: 256 }).notNull().unique(),
  
  // Basic aircraft information
  registration: varchar('registration', { length: 50 }).notNull().unique(),
  manufacturer: varchar('manufacturer', { length: 256 }).notNull(),
  model: varchar('model', { length: 256 }).notNull(),
  year: integer('year'),
  category: aircraftCategoryEnum('category').notNull(),
  
  // Performance specifications
  maxPassengers: integer('max_passengers'),
  range: integer('range'), // Nautical miles
  speed: integer('speed'), // Knots
  hourlyRate: integer('hourly_rate'), // USD per hour
  
  // Location and availability
  location: varchar('location', { length: 10 }).default('UNKNOWN').notNull(),
  availability: aircraftAvailabilityEnum('availability').default('AVAILABLE').notNull(),
  
  // Operator information
  operatorName: varchar('operator_name', { length: 256 }),
  operatorContact: varchar('operator_contact', { length: 256 }),
  
  // Detailed specifications
  specifications: json('specifications').default({}),
  
  // Metadata and sync
  metadata: json('metadata').default({}),
  avinodeSyncAt: timestamp('avinode_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}, (table) => ({
  avinodeIdIdx: index('aircraft_avinode_id_idx').on(table.avinodeId),
  registrationIdx: index('aircraft_registration_idx').on(table.registration),
  categoryIdx: index('aircraft_category_idx').on(table.category),
  availabilityIdx: index('aircraft_availability_idx').on(table.availability)
}));

export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  avinodeBookingId: varchar('avinode_booking_id', { length: 256 }).notNull().unique(),
  
  // Aircraft relationship
  aircraftId: uuid('aircraft_id').notNull(),
  
  // User relationship (optional)
  userId: uuid('user_id'),
  
  // Flight details
  departure: varchar('departure', { length: 10 }).notNull(),
  destination: varchar('destination', { length: 10 }).notNull(),
  departureTime: timestamp('departure_time', { withTimezone: true }).notNull(),
  returnTime: timestamp('return_time', { withTimezone: true }),
  passengers: integer('passengers').notNull(),
  
  // Booking status and pricing
  status: bookingStatusEnum('status').notNull(),
  totalCost: integer('total_cost'), // USD cents
  flightHours: real('flight_hours'),
  
  // Contact information
  requestedBy: varchar('requested_by', { length: 256 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 50 }),
  specialRequests: text('special_requests'),
  
  // Metadata and tracking
  metadata: json('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}, (table) => ({
  avinodeBookingIdIdx: index('bookings_avinode_booking_id_idx').on(table.avinodeBookingId),
  aircraftIdIdx: index('bookings_aircraft_id_idx').on(table.aircraftId),
  userIdIdx: index('bookings_user_id_idx').on(table.userId),
  statusIdx: index('bookings_status_idx').on(table.status),
  departureTimeIdx: index('bookings_departure_time_idx').on(table.departureTime)
}));

// ===========================
// CONVERSATION & AI SYSTEM
// ===========================

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id'),
  
  // Conversation details
  title: varchar('title', { length: 512 }),
  status: conversationStatusEnum('status').default('ACTIVE').notNull(),
  
  // AI and workflow context
  agentType: varchar('agent_type', { length: 256 }),
  workflowId: varchar('workflow_id', { length: 256 }),
  context: json('context').default({}),
  
  // Metadata
  metadata: json('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}, (table) => ({
  userIdIdx: index('conversations_user_id_idx').on(table.userId),
  statusIdx: index('conversations_status_idx').on(table.status)
}));

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull(),
  
  // Message content
  content: text('content').notNull(),
  role: messageRoleEnum('role').notNull(),
  
  // AI specific data
  model: varchar('model', { length: 256 }),
  tokens: integer('tokens'),
  responseTime: integer('response_time'), // Milliseconds
  
  // N8N workflow data
  workflowRunId: varchar('workflow_run_id', { length: 256 }),
  nodeId: varchar('node_id', { length: 256 }),
  
  // Message metadata
  metadata: json('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  conversationIdIdx: index('messages_conversation_id_idx').on(table.conversationId),
  roleIdx: index('messages_role_idx').on(table.role),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt)
}));

export const integrationLogs = pgTable('integration_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  service: integrationServiceEnum('service').notNull(),
  
  // Operation details
  operation: varchar('operation', { length: 256 }).notNull(),
  endpoint: varchar('endpoint', { length: 512 }),
  method: varchar('method', { length: 10 }),
  
  // Request/Response data
  requestData: json('request_data'),
  responseData: json('response_data'),
  
  // Status tracking
  status: logStatusEnum('status').default('PENDING').notNull(),
  errorCode: varchar('error_code', { length: 256 }),
  errorMessage: text('error_message'),
  
  // Performance metrics
  duration: integer('duration'), // Milliseconds
  retryCount: integer('retry_count').default(0).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  
  // Metadata
  metadata: json('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => ({
  serviceIdx: index('integration_logs_service_idx').on(table.service),
  statusIdx: index('integration_logs_status_idx').on(table.status),
  createdAtIdx: index('integration_logs_created_at_idx').on(table.createdAt)
}));

// Keep legacy feedback table for backward compatibility
export const feedback = pgTable('feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  feedback: text('feedback').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ===========================
// RELATIONS
// ===========================

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id]
  }),
  conversations: many(conversations),
  bookings: many(bookings),
  campaignTargets: many(campaignTargets),
  assistantRoles: many(executiveAssistants)
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  leads: many(leads)
}));

export const executiveAssistantsRelations = relations(executiveAssistants, ({ one }) => ({
  user: one(users, {
    fields: [executiveAssistants.userId],
    references: [users.id]
  })
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  company: one(companies, {
    fields: [leads.companyId],
    references: [companies.id]
  }),
  campaignTargets: many(campaignTargets)
}));

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  targets: many(campaignTargets)
}));

export const campaignTargetsRelations = relations(campaignTargets, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignTargets.campaignId],
    references: [campaigns.id]
  }),
  lead: one(leads, {
    fields: [campaignTargets.leadId],
    references: [leads.id]
  }),
  user: one(users, {
    fields: [campaignTargets.userId],
    references: [users.id]
  })
}));

export const aircraftRelations = relations(aircraft, ({ many }) => ({
  bookings: many(bookings)
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  aircraft: one(aircraft, {
    fields: [bookings.aircraftId],
    references: [aircraft.id]
  }),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id]
  })
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id]
  }),
  messages: many(messages)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id]
  })
}));

// ===========================
// TYPESCRIPT TYPES
// ===========================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export type ExecutiveAssistant = typeof executiveAssistants.$inferSelect;
export type NewExecutiveAssistant = typeof executiveAssistants.$inferInsert;

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

export type CampaignTarget = typeof campaignTargets.$inferSelect;
export type NewCampaignTarget = typeof campaignTargets.$inferInsert;

export type Aircraft = typeof aircraft.$inferSelect;
export type NewAircraft = typeof aircraft.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type NewIntegrationLog = typeof integrationLogs.$inferInsert;

export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;