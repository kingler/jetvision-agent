CREATE TYPE "public"."booking_status" AS ENUM('inquiry', 'quoted', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('pending', 'running', 'success', 'error', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'premium');--> statement-breakpoint
CREATE TABLE "aircraft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"avainode_id" text,
	"tail_number" text,
	"manufacturer" text,
	"model" text,
	"category" text,
	"max_passengers" integer,
	"range" integer,
	"speed" integer,
	"home_base" text,
	"hourly_rate" numeric(10, 2),
	"availability" jsonb DEFAULT '{}'::jsonb,
	"specifications" jsonb DEFAULT '{}'::jsonb,
	"images" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "aircraft_avainode_id_unique" UNIQUE("avainode_id")
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" text,
	"event_name" text NOT NULL,
	"event_data" jsonb DEFAULT '{}'::jsonb,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apollo_campaign_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"lead_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "apollo_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"apollo_id" text,
	"name" text NOT NULL,
	"description" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"template_ids" jsonb DEFAULT '[]'::jsonb,
	"delay_days" jsonb DEFAULT '[1,3,7]'::jsonb,
	"total_contacts" integer DEFAULT 0,
	"sent_emails" integer DEFAULT 0,
	"open_rate" numeric(5, 2),
	"reply_rate" numeric(5, 2),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "apollo_campaigns_apollo_id_unique" UNIQUE("apollo_id")
);
--> statement-breakpoint
CREATE TABLE "apollo_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"apollo_id" text,
	"first_name" text,
	"last_name" text,
	"email" text,
	"title" text,
	"company" text,
	"industry" text,
	"location" text,
	"phone" text,
	"linkedin_url" text,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"score" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "apollo_leads_apollo_id_unique" UNIQUE("apollo_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"aircraft_id" uuid,
	"avainode_booking_id" text,
	"status" "booking_status" DEFAULT 'inquiry' NOT NULL,
	"departure_airport" text NOT NULL,
	"arrival_airport" text NOT NULL,
	"departure_date" timestamp NOT NULL,
	"return_date" timestamp,
	"passengers" integer NOT NULL,
	"total_price" numeric(12, 2),
	"currency" text DEFAULT 'USD',
	"flight_details" jsonb DEFAULT '{}'::jsonb,
	"passenger_details" jsonb DEFAULT '{}'::jsonb,
	"special_requests" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_avainode_booking_id_unique" UNIQUE("avainode_booking_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"summary" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"content_hash" text,
	"embedding" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "embeddings_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"feedback" text NOT NULL,
	"rating" integer,
	"category" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"preferences" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"n8n_execution_id" text,
	"workflow_id" text,
	"workflow_name" text,
	"status" "execution_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"execution_time" integer,
	"input_data" jsonb DEFAULT '{}'::jsonb,
	"output_data" jsonb DEFAULT '{}'::jsonb,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	CONSTRAINT "workflow_executions_n8n_execution_id_unique" UNIQUE("n8n_execution_id")
);
--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apollo_campaign_leads" ADD CONSTRAINT "apollo_campaign_leads_campaign_id_apollo_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."apollo_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apollo_campaign_leads" ADD CONSTRAINT "apollo_campaign_leads_lead_id_apollo_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."apollo_leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apollo_campaigns" ADD CONSTRAINT "apollo_campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apollo_leads" ADD CONSTRAINT "apollo_leads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_aircraft_id_aircraft_id_fk" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "aircraft_avainode_id_idx" ON "aircraft" USING btree ("avainode_id");--> statement-breakpoint
CREATE INDEX "aircraft_category_idx" ON "aircraft" USING btree ("category");--> statement-breakpoint
CREATE INDEX "aircraft_manufacturer_idx" ON "aircraft" USING btree ("manufacturer");--> statement-breakpoint
CREATE INDEX "analytics_events_user_id_idx" ON "analytics_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_events_event_name_idx" ON "analytics_events" USING btree ("event_name");--> statement-breakpoint
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "apollo_campaign_leads_unique" ON "apollo_campaign_leads" USING btree ("campaign_id","lead_id");--> statement-breakpoint
CREATE INDEX "apollo_campaigns_user_id_idx" ON "apollo_campaigns" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "apollo_campaigns_status_idx" ON "apollo_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "apollo_leads_user_id_idx" ON "apollo_leads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "apollo_leads_status_idx" ON "apollo_leads" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "apollo_leads_apollo_id_idx" ON "apollo_leads" USING btree ("apollo_id");--> statement-breakpoint
CREATE INDEX "bookings_user_id_idx" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_departure_date_idx" ON "bookings" USING btree ("departure_date");--> statement-breakpoint
CREATE INDEX "conversations_user_id_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_created_at_idx" ON "conversations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "embeddings_source_type_idx" ON "embeddings" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "embeddings_source_id_idx" ON "embeddings" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "embeddings_content_hash_idx" ON "embeddings" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_category_idx" ON "feedback" USING btree ("category");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "workflow_executions_user_id_idx" ON "workflow_executions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_executions_n8n_id_idx" ON "workflow_executions" USING btree ("n8n_execution_id");