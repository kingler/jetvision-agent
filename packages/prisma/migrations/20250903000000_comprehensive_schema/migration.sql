-- JetVision Agent - Comprehensive Database Migration
-- Private Aviation AI Platform with Apollo.io & Avinode Integration

-- Create enums
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'PREMIUM', 'EXECUTIVE_ASSISTANT');
CREATE TYPE "CompanySize" AS ENUM ('STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CLOSED_WON', 'CLOSED_LOST', 'UNRESPONSIVE');
CREATE TYPE "CampaignType" AS ENUM ('EMAIL_SEQUENCE', 'LINKEDIN_OUTREACH', 'PHONE_CAMPAIGN', 'MIXED_TOUCH');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TargetStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED', 'BOUNCED', 'UNSUBSCRIBED', 'OPTED_OUT');
CREATE TYPE "AircraftCategory" AS ENUM ('LIGHT', 'MIDSIZE', 'SUPER_MIDSIZE', 'HEAVY', 'ULTRA_LONG_RANGE', 'TURBOPROP', 'HELICOPTER');
CREATE TYPE "AircraftAvailability" AS ENUM ('AVAILABLE', 'BOOKED', 'MAINTENANCE', 'UNAVAILABLE');
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM', 'FUNCTION');
CREATE TYPE "IntegrationService" AS ENUM ('APOLLO_IO', 'AVINODE', 'N8N_WORKFLOW', 'OPENAI', 'ANTHROPIC', 'SUPABASE');
CREATE TYPE "LogStatus" AS ENUM ('PENDING', 'SUCCESS', 'ERROR', 'RETRY', 'FAILED');

-- ===========================
-- USER MANAGEMENT TABLES
-- ===========================

-- Create companies table first (referenced by users)
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "industry" TEXT,
    "size" "CompanySize",
    "description" TEXT,
    "website" TEXT,
    "apolloAccountId" TEXT,
    "apolloSyncedAt" TIMESTAMP(3),
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "postalCode" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes for companies
CREATE UNIQUE INDEX "companies_domain_key" ON "companies"("domain");
CREATE UNIQUE INDEX "companies_apolloAccountId_key" ON "companies"("apolloAccountId");
CREATE INDEX "companies_domain_idx" ON "companies"("domain");
CREATE INDEX "companies_apollo_account_id_idx" ON "companies"("apolloAccountId");

-- Update users table to match new schema
DROP TABLE IF EXISTS "User";
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "companyId" TEXT,
    "jobTitle" TEXT,
    "phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes and foreign keys for users
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_clerk_id_idx" ON "users"("clerkId");
CREATE INDEX "users_company_id_idx" ON "users"("companyId");

-- Add foreign key constraint
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create executive assistants table
CREATE TABLE "executive_assistants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "executiveName" TEXT NOT NULL,
    "executiveEmail" TEXT NOT NULL,
    "executiveTitle" TEXT,
    "executiveCompany" TEXT,
    "communicationPrefs" JSONB NOT NULL DEFAULT '{}',
    "delegatedActions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "executive_assistants_pkey" PRIMARY KEY ("id")
);

-- Create indexes and constraints for executive assistants
CREATE UNIQUE INDEX "executive_assistants_userId_executiveEmail_key" ON "executive_assistants"("userId", "executiveEmail");
CREATE INDEX "executive_assistants_user_id_idx" ON "executive_assistants"("userId");

-- Add foreign key constraint
ALTER TABLE "executive_assistants" ADD CONSTRAINT "executive_assistants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================
-- APOLLO.IO LEAD MANAGEMENT
-- ===========================

-- Create leads table
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "apolloContactId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "jobTitle" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "companyId" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "score" INTEGER DEFAULT 0,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "apolloData" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- Create indexes and constraints for leads
CREATE UNIQUE INDEX "leads_apolloContactId_key" ON "leads"("apolloContactId");
CREATE INDEX "leads_apollo_contact_id_idx" ON "leads"("apolloContactId");
CREATE INDEX "leads_company_id_idx" ON "leads"("companyId");
CREATE INDEX "leads_status_idx" ON "leads"("status");
CREATE INDEX "leads_email_idx" ON "leads"("email");

-- Add foreign key constraint
ALTER TABLE "leads" ADD CONSTRAINT "leads_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create campaigns table
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "targetAudience" JSONB NOT NULL DEFAULT '{}',
    "emailSubject" TEXT,
    "emailTemplate" TEXT,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalOpened" INTEGER NOT NULL DEFAULT 0,
    "totalClicked" INTEGER NOT NULL DEFAULT 0,
    "totalReplied" INTEGER NOT NULL DEFAULT 0,
    "totalConverted" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- Create indexes for campaigns
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");
CREATE INDEX "campaigns_type_idx" ON "campaigns"("type");

-- Create campaign targets table
CREATE TABLE "campaign_targets" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "leadId" TEXT,
    "userId" TEXT,
    "emailAddress" TEXT NOT NULL,
    "status" "TargetStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "lastResponse" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_targets_pkey" PRIMARY KEY ("id")
);

-- Create indexes and constraints for campaign targets
CREATE UNIQUE INDEX "campaign_targets_campaignId_emailAddress_key" ON "campaign_targets"("campaignId", "emailAddress");
CREATE INDEX "campaign_targets_campaign_id_idx" ON "campaign_targets"("campaignId");
CREATE INDEX "campaign_targets_lead_id_idx" ON "campaign_targets"("leadId");
CREATE INDEX "campaign_targets_status_idx" ON "campaign_targets"("status");

-- Add foreign key constraints
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "campaign_targets" ADD CONSTRAINT "campaign_targets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===========================
-- AVINODE AIRCRAFT & BOOKING
-- ===========================

-- Create aircraft table
CREATE TABLE "aircraft" (
    "id" TEXT NOT NULL,
    "avinodeId" TEXT NOT NULL,
    "registration" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "category" "AircraftCategory" NOT NULL,
    "maxPassengers" INTEGER,
    "range" INTEGER,
    "speed" INTEGER,
    "hourlyRate" INTEGER,
    "location" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "availability" "AircraftAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "operatorName" TEXT,
    "operatorContact" TEXT,
    "specifications" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "avinodeSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "aircraft_pkey" PRIMARY KEY ("id")
);

-- Create indexes for aircraft
CREATE UNIQUE INDEX "aircraft_avinodeId_key" ON "aircraft"("avinodeId");
CREATE UNIQUE INDEX "aircraft_registration_key" ON "aircraft"("registration");
CREATE INDEX "aircraft_avinode_id_idx" ON "aircraft"("avinodeId");
CREATE INDEX "aircraft_registration_idx" ON "aircraft"("registration");
CREATE INDEX "aircraft_category_idx" ON "aircraft"("category");
CREATE INDEX "aircraft_availability_idx" ON "aircraft"("availability");

-- Create bookings table
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "avinodeBookingId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "userId" TEXT,
    "departure" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "returnTime" TIMESTAMP(3),
    "passengers" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "totalCost" INTEGER,
    "flightHours" DOUBLE PRECISION,
    "requestedBy" TEXT NOT NULL,
    "contactPhone" TEXT,
    "specialRequests" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- Create indexes and constraints for bookings
CREATE UNIQUE INDEX "bookings_avinodeBookingId_key" ON "bookings"("avinodeBookingId");
CREATE INDEX "bookings_avinode_booking_id_idx" ON "bookings"("avinodeBookingId");
CREATE INDEX "bookings_aircraft_id_idx" ON "bookings"("aircraftId");
CREATE INDEX "bookings_user_id_idx" ON "bookings"("userId");
CREATE INDEX "bookings_status_idx" ON "bookings"("status");
CREATE INDEX "bookings_departure_time_idx" ON "bookings"("departureTime");

-- Add foreign key constraints
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_aircraftId_fkey" FOREIGN KEY ("aircraftId") REFERENCES "aircraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===========================
-- CONVERSATION & AI SYSTEM
-- ===========================

-- Create conversations table
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "agentType" TEXT,
    "workflowId" TEXT,
    "context" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- Create indexes for conversations
CREATE INDEX "conversations_user_id_idx" ON "conversations"("userId");
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- Add foreign key constraint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create messages table
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "model" TEXT,
    "tokens" INTEGER,
    "responseTime" INTEGER,
    "workflowRunId" TEXT,
    "nodeId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- Create indexes for messages
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversationId");
CREATE INDEX "messages_role_idx" ON "messages"("role");
CREATE INDEX "messages_created_at_idx" ON "messages"("createdAt");

-- Add foreign key constraint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create integration logs table
CREATE TABLE "integration_logs" (
    "id" TEXT NOT NULL,
    "service" "IntegrationService" NOT NULL,
    "operation" TEXT NOT NULL,
    "endpoint" TEXT,
    "method" TEXT,
    "requestData" JSONB,
    "responseData" JSONB,
    "status" "LogStatus" NOT NULL DEFAULT 'PENDING',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "duration" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for integration logs
CREATE INDEX "integration_logs_service_idx" ON "integration_logs"("service");
CREATE INDEX "integration_logs_status_idx" ON "integration_logs"("status");
CREATE INDEX "integration_logs_created_at_idx" ON "integration_logs"("createdAt");

-- Update existing feedback table to match new schema
ALTER TABLE "Feedback" RENAME TO "feedback";
ALTER TABLE "feedback" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- ===========================
-- ROW LEVEL SECURITY (RLS)
-- ===========================

-- Enable RLS on all tables for Supabase
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "executive_assistants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_targets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "aircraft" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integration_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (can be customized based on business requirements)
-- Users can access their own data
CREATE POLICY "Users can access own data" ON "users" FOR ALL USING (auth.jwt() ->> 'sub' = "clerkId");

-- Users can access company data if they belong to the company
CREATE POLICY "Users can access company data" ON "companies" FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users."companyId" = companies.id 
    AND users."clerkId" = auth.jwt() ->> 'sub'
  )
);

-- Users can access conversations they created
CREATE POLICY "Users can access own conversations" ON "conversations" FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = conversations."userId" 
    AND users."clerkId" = auth.jwt() ->> 'sub'
  )
);

-- Users can access messages in their conversations
CREATE POLICY "Users can access conversation messages" ON "messages" FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversations 
    JOIN users ON users.id = conversations."userId"
    WHERE conversations.id = messages."conversationId"
    AND users."clerkId" = auth.jwt() ->> 'sub'
  )
);

-- Users can access their bookings
CREATE POLICY "Users can access own bookings" ON "bookings" FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = bookings."userId" 
    AND users."clerkId" = auth.jwt() ->> 'sub'
  )
);

-- All users can read aircraft data (public marketplace)
CREATE POLICY "Users can read aircraft data" ON "aircraft" FOR SELECT USING (true);

-- Only authenticated users can create bookings
CREATE POLICY "Authenticated users can create bookings" ON "bookings" FOR INSERT 
WITH CHECK (auth.jwt() IS NOT NULL);

-- Users can access leads from their company
CREATE POLICY "Users can access company leads" ON "leads" FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users."companyId" = leads."companyId" 
    AND users."clerkId" = auth.jwt() ->> 'sub'
  )
);

-- Integration logs are admin-only (can be adjusted)
CREATE POLICY "Admin access for integration logs" ON "integration_logs" FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users."clerkId" = auth.jwt() ->> 'sub'
    AND users.role = 'ADMIN'
  )
);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to all tables with updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON "companies" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_executive_assistants_updated_at BEFORE UPDATE ON "executive_assistants" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON "leads" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON "campaigns" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_targets_updated_at BEFORE UPDATE ON "campaign_targets" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aircraft_updated_at BEFORE UPDATE ON "aircraft" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON "bookings" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON "conversations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON "messages" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integration_logs_updated_at BEFORE UPDATE ON "integration_logs" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();