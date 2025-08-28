/**
 * Database Service
 * Main entry point for all database operations
 */

import { UserRepository } from './repositories/user.repository';
import { ConversationRepository } from './repositories/conversation.repository';
import { ApolloRepository } from './repositories/apollo.repository';
import { checkDatabaseConnection } from './client';

// Export repositories
export { UserRepository, ConversationRepository, ApolloRepository };

// Export types from schema
export * from './schema';

/**
 * Database service with all repository methods
 */
export const db = {
  // User operations
  users: UserRepository,
  
  // Conversation operations
  conversations: ConversationRepository,
  
  // Apollo operations
  apollo: ApolloRepository,
  
  // Health check
  checkConnection: checkDatabaseConnection,
};

/**
 * Initialize database (run migrations, check connection, etc.)
 */
export async function initializeDatabase(): Promise<boolean> {
  try {
    // Check database connection
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      console.error('Failed to connect to database');
      return false;
    }

    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}

/**
 * Sync user from Clerk to database
 */
export async function syncUserFromClerk(clerkUser: any) {
  try {
    const user = await UserRepository.findOrCreateFromClerk(clerkUser);
    return user;
  } catch (error) {
    console.error('Failed to sync user from Clerk:', error);
    throw error;
  }
}

/**
 * Create a new conversation for a user
 */
export async function createConversation(userId: string, title?: string) {
  return await ConversationRepository.create({
    userId,
    title: title || 'New Conversation',
    metadata: {},
  });
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: any
) {
  return await ConversationRepository.addMessage(conversationId, {
    role,
    content,
    metadata: metadata || {},
  });
}

/**
 * Get or create a conversation for a thread
 */
export async function getOrCreateConversation(
  userId: string,
  threadId?: string
): Promise<string> {
  if (threadId) {
    // Check if conversation exists
    const existing = await ConversationRepository.getById(threadId, userId);
    if (existing) {
      return existing.id;
    }
  }

  // Create new conversation
  const conversation = await createConversation(userId);
  return conversation.id;
}

/**
 * Save Apollo lead from API response
 */
export async function saveApolloLead(userId: string, leadData: any) {
  return await ApolloRepository.upsertLead({
    userId,
    apolloId: leadData.id,
    firstName: leadData.first_name,
    lastName: leadData.last_name,
    email: leadData.email,
    title: leadData.title,
    company: leadData.organization_name,
    industry: leadData.organization?.industry,
    location: leadData.city,
    phone: leadData.phone_numbers?.[0]?.sanitized_number,
    linkedinUrl: leadData.linkedin_url,
    status: 'new',
    score: leadData.account_score,
    metadata: leadData,
  });
}

/**
 * Save Apollo campaign from API response
 */
export async function saveApolloCampaign(userId: string, campaignData: any) {
  return await ApolloRepository.createCampaign({
    userId,
    apolloId: campaignData.id,
    name: campaignData.name,
    description: campaignData.description,
    status: campaignData.status || 'draft',
    templateIds: campaignData.email_templates || [],
    delayDays: campaignData.step_delays || [1, 3, 7],
    metadata: campaignData,
  });
}

// Default export
export default db;