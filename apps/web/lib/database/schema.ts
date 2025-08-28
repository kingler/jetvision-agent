/**
 * JetVision Agent Database Schema
 * Complete Drizzle ORM schema for Supabase PostgreSQL
 */

import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, decimal, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ========================
// ENUMS
// ========================

export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'premium']);
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed', 'cancelled']);
export const bookingStatusEnum = pgEnum('booking_status', ['inquiry', 'quoted', 'confirmed', 'completed', 'cancelled']);
export const executionStatusEnum = pgEnum('execution_status', ['pending', 'running', 'success', 'error', 'cancelled']);

// ========================
// CORE TABLES
// ========================

// Users table (extends Clerk authentication)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').unique().notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: userRoleEnum('role').default('user').notNull(),
  metadata: jsonb('metadata').default({}),
  preferences: jsonb('preferences').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => ({
  clerkIdIdx: uniqueIndex('users_clerk_id_idx').on(table.clerkId),
  emailIdx: index('users_email_idx').on(table.email),
}));

// ========================
// APOLLO.IO TABLES
// ========================

// Apollo leads
export const apolloLeads = pgTable('apollo_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  apolloId: text('apollo_id').unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email'),
  title: text('title'),
  company: text('company'),
  industry: text('industry'),
  location: text('location'),
  phone: text('phone'),
  linkedinUrl: text('linkedin_url'),
  status: leadStatusEnum('status').default('new').notNull(),
  score: integer('score'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('apollo_leads_user_id_idx').on(table.userId),
  statusIdx: index('apollo_leads_status_idx').on(table.status),
  apolloIdIdx: uniqueIndex('apollo_leads_apollo_id_idx').on(table.apolloId),
}));

// Apollo campaigns
export const apolloCampaigns = pgTable('apollo_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  apolloId: text('apollo_id').unique(),
  name: text('name').notNull(),
  description: text('description'),
  status: campaignStatusEnum('status').default('draft').notNull(),
  templateIds: jsonb('template_ids').default([]),
  delayDays: jsonb('delay_days').default([1, 3, 7]),
  totalContacts: integer('total_contacts').default(0),
  sentEmails: integer('sent_emails').default(0),
  openRate: decimal('open_rate', { precision: 5, scale: 2 }),
  replyRate: decimal('reply_rate', { precision: 5, scale: 2 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('apollo_campaigns_user_id_idx').on(table.userId),
  statusIdx: index('apollo_campaigns_status_idx').on(table.status),
}));

// Apollo campaign leads (many-to-many)
export const apolloCampaignLeads = pgTable('apollo_campaign_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => apolloCampaigns.id).notNull(),
  leadId: uuid('lead_id').references(() => apolloLeads.id).notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
  status: text('status').default('active'),
}, (table) => ({
  campaignLeadIdx: uniqueIndex('apollo_campaign_leads_unique').on(table.campaignId, table.leadId),
}));

// ========================
// AVINODE TABLES
// ========================

// Aircraft
export const aircraft = pgTable('aircraft', {
  id: uuid('id').primaryKey().defaultRandom(),
  avainodeId: text('avainode_id').unique(),
  tailNumber: text('tail_number'),
  manufacturer: text('manufacturer'),
  model: text('model'),
  category: text('category'),
  maxPassengers: integer('max_passengers'),
  range: integer('range'), // in nautical miles
  speed: integer('speed'), // in knots
  homeBase: text('home_base'),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  availability: jsonb('availability').default({}),
  specifications: jsonb('specifications').default({}),
  images: jsonb('images').default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  avainodeIdIdx: uniqueIndex('aircraft_avainode_id_idx').on(table.avainodeId),
  categoryIdx: index('aircraft_category_idx').on(table.category),
  manufacturerIdx: index('aircraft_manufacturer_idx').on(table.manufacturer),
}));

// Bookings
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  aircraftId: uuid('aircraft_id').references(() => aircraft.id),
  avainodeBookingId: text('avainode_booking_id').unique(),
  status: bookingStatusEnum('status').default('inquiry').notNull(),
  departureAirport: text('departure_airport').notNull(),
  arrivalAirport: text('arrival_airport').notNull(),
  departureDate: timestamp('departure_date').notNull(),
  returnDate: timestamp('return_date'),
  passengers: integer('passengers').notNull(),
  totalPrice: decimal('total_price', { precision: 12, scale: 2 }),
  currency: text('currency').default('USD'),
  flightDetails: jsonb('flight_details').default({}),
  passengerDetails: jsonb('passenger_details').default({}),
  specialRequests: text('special_requests'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('bookings_user_id_idx').on(table.userId),
  statusIdx: index('bookings_status_idx').on(table.status),
  departureDateIdx: index('bookings_departure_date_idx').on(table.departureDate),
}));

// ========================
// CHAT & CONVERSATIONS
// ========================

// Conversations
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title'),
  summary: text('summary'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('conversations_user_id_idx').on(table.userId),
  createdAtIdx: index('conversations_created_at_idx').on(table.createdAt),
}));

// Messages
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  role: text('role').notNull(), // 'user', 'assistant', 'system'
  content: text('content').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index('messages_conversation_id_idx').on(table.conversationId),
  createdAtIdx: index('messages_created_at_idx').on(table.createdAt),
}));

// ========================
// N8N WORKFLOW EXECUTIONS
// ========================

export const workflowExecutions = pgTable('workflow_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  n8nExecutionId: text('n8n_execution_id').unique(),
  workflowId: text('workflow_id'),
  workflowName: text('workflow_name'),
  status: executionStatusEnum('status').default('pending').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  finishedAt: timestamp('finished_at'),
  executionTime: integer('execution_time'), // in milliseconds
  inputData: jsonb('input_data').default({}),
  outputData: jsonb('output_data').default({}),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').default({}),
}, (table) => ({
  userIdIdx: index('workflow_executions_user_id_idx').on(table.userId),
  statusIdx: index('workflow_executions_status_idx').on(table.status),
  n8nExecutionIdIdx: uniqueIndex('workflow_executions_n8n_id_idx').on(table.n8nExecutionId),
}));

// ========================
// ANALYTICS & FEEDBACK
// ========================

// Feedback (keeping existing structure)
export const feedback = pgTable('feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  feedback: text('feedback').notNull(),
  rating: integer('rating'), // 1-5 scale
  category: text('category'), // 'bug', 'feature', 'general'
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('feedback_user_id_idx').on(table.userId),
  categoryIdx: index('feedback_category_idx').on(table.category),
}));

// Analytics events
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  sessionId: text('session_id'),
  eventName: text('event_name').notNull(),
  eventData: jsonb('event_data').default({}),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('analytics_events_user_id_idx').on(table.userId),
  eventNameIdx: index('analytics_events_event_name_idx').on(table.eventName),
  createdAtIdx: index('analytics_events_created_at_idx').on(table.createdAt),
}));

// ========================
// VECTOR EMBEDDINGS (for AI features)
// ========================

// Vector embeddings for semantic search and AI features
export const embeddings = pgTable('embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  contentHash: text('content_hash').unique(),
  embedding: text('embedding').notNull(), // JSON string of vector array
  sourceType: text('source_type').notNull(), // 'conversation', 'lead', 'booking', 'document'
  sourceId: uuid('source_id'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sourceTypeIdx: index('embeddings_source_type_idx').on(table.sourceType),
  sourceIdIdx: index('embeddings_source_id_idx').on(table.sourceId),
  contentHashIdx: uniqueIndex('embeddings_content_hash_idx').on(table.contentHash),
}));

// ========================
// RELATIONS
// ========================

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  apolloLeads: many(apolloLeads),
  apolloCampaigns: many(apolloCampaigns),
  bookings: many(bookings),
  conversations: many(conversations),
  workflowExecutions: many(workflowExecutions),
  feedback: many(feedback),
  analyticsEvents: many(analyticsEvents),
}));

// Apollo relations
export const apolloLeadsRelations = relations(apolloLeads, ({ one, many }) => ({
  user: one(users, {
    fields: [apolloLeads.userId],
    references: [users.id],
  }),
  campaignLeads: many(apolloCampaignLeads),
}));

export const apolloCampaignsRelations = relations(apolloCampaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [apolloCampaigns.userId],
    references: [users.id],
  }),
  campaignLeads: many(apolloCampaignLeads),
}));

export const apolloCampaignLeadsRelations = relations(apolloCampaignLeads, ({ one }) => ({
  campaign: one(apolloCampaigns, {
    fields: [apolloCampaignLeads.campaignId],
    references: [apolloCampaigns.id],
  }),
  lead: one(apolloLeads, {
    fields: [apolloCampaignLeads.leadId],
    references: [apolloLeads.id],
  }),
}));

// Avinode relations
export const aircraftRelations = relations(aircraft, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  aircraft: one(aircraft, {
    fields: [bookings.aircraftId],
    references: [aircraft.id],
  }),
}));

// Chat relations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// Workflow relations
export const workflowExecutionsRelations = relations(workflowExecutions, ({ one }) => ({
  user: one(users, {
    fields: [workflowExecutions.userId],
    references: [users.id],
  }),
}));

// Feedback relations
export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
}));

// Analytics relations
export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, {
    fields: [analyticsEvents.userId],
    references: [users.id],
  }),
}));
