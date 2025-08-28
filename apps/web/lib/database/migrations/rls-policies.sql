-- Row Level Security Policies for JetVision Database

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE apollo_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE apollo_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE apollo_campaign_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- ========================
-- Users Table Policies
-- ========================

-- Users can only read their own data
CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid()::text = clerk_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE 
USING (auth.uid()::text = clerk_id);

-- ========================
-- Conversations Table Policies
-- ========================

-- Users can only view their own conversations
CREATE POLICY "Users can view own conversations" 
ON conversations FOR SELECT 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can create their own conversations
CREATE POLICY "Users can create conversations" 
ON conversations FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations" 
ON conversations FOR UPDATE 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations" 
ON conversations FOR DELETE 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ========================
-- Messages Table Policies
-- ========================

-- Users can view messages from their conversations
CREATE POLICY "Users can view messages in own conversations" 
ON messages FOR SELECT 
USING (
    conversation_id IN (
        SELECT id FROM conversations 
        WHERE user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
);

-- Users can create messages in their conversations
CREATE POLICY "Users can create messages in own conversations" 
ON messages FOR INSERT 
WITH CHECK (
    conversation_id IN (
        SELECT id FROM conversations 
        WHERE user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
);

-- ========================
-- Apollo Leads Table Policies
-- ========================

-- Users can only view their own leads
CREATE POLICY "Users can view own leads" 
ON apollo_leads FOR SELECT 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can create their own leads
CREATE POLICY "Users can create leads" 
ON apollo_leads FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can update their own leads
CREATE POLICY "Users can update own leads" 
ON apollo_leads FOR UPDATE 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can delete their own leads
CREATE POLICY "Users can delete own leads" 
ON apollo_leads FOR DELETE 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ========================
-- Apollo Campaigns Table Policies
-- ========================

-- Users can only view their own campaigns
CREATE POLICY "Users can view own campaigns" 
ON apollo_campaigns FOR SELECT 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can create their own campaigns
CREATE POLICY "Users can create campaigns" 
ON apollo_campaigns FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can update their own campaigns
CREATE POLICY "Users can update own campaigns" 
ON apollo_campaigns FOR UPDATE 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can delete their own campaigns
CREATE POLICY "Users can delete own campaigns" 
ON apollo_campaigns FOR DELETE 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ========================
-- Apollo Campaign Leads Table Policies
-- ========================

-- Users can view campaign-lead associations for their campaigns
CREATE POLICY "Users can view own campaign leads" 
ON apollo_campaign_leads FOR SELECT 
USING (
    campaign_id IN (
        SELECT id FROM apollo_campaigns 
        WHERE user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
);

-- Users can manage campaign-lead associations for their campaigns
CREATE POLICY "Users can manage own campaign leads" 
ON apollo_campaign_leads FOR ALL 
USING (
    campaign_id IN (
        SELECT id FROM apollo_campaigns 
        WHERE user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
    )
);

-- ========================
-- Bookings Table Policies
-- ========================

-- Users can only view their own bookings
CREATE POLICY "Users can view own bookings" 
ON bookings FOR SELECT 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can create their own bookings
CREATE POLICY "Users can create bookings" 
ON bookings FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can update their own bookings
CREATE POLICY "Users can update own bookings" 
ON bookings FOR UPDATE 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ========================
-- Feedback Table Policies
-- ========================

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" 
ON feedback FOR SELECT 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can create feedback
CREATE POLICY "Users can create feedback" 
ON feedback FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ========================
-- Workflow Executions Table Policies
-- ========================

-- Users can view their own workflow executions
CREATE POLICY "Users can view own workflow executions" 
ON workflow_executions FOR SELECT 
USING (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Users can create workflow executions
CREATE POLICY "Users can create workflow executions" 
ON workflow_executions FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- ========================
-- Analytics Events Table Policies
-- ========================

-- Users can only create their own analytics events
CREATE POLICY "Users can create analytics events" 
ON analytics_events FOR INSERT 
WITH CHECK (user_id IS NULL OR user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text));

-- Admin-only policies (for viewing all data)
-- Note: You'll need to add an 'is_admin' check based on your admin logic

-- Example admin policy for users table:
-- CREATE POLICY "Admins can view all users" 
-- ON users FOR SELECT 
-- USING (
--     EXISTS (
--         SELECT 1 FROM users 
--         WHERE clerk_id = auth.uid()::text 
--         AND role = 'admin'
--     )
-- );