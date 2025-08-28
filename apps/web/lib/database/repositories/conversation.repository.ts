/**
 * Conversation Repository
 * Handles all chat conversation and message operations
 */

import { eq, desc, and, sql } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import { 
  conversations, 
  messages,
  type Conversation,
  type NewConversation,
  type Message,
  type NewMessage 
} from '../schema';

const db = getDrizzleClient();

export class ConversationRepository {
  /**
   * Create a new conversation
   */
  static async create(data: NewConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(data)
      .returning();

    return conversation;
  }

  /**
   * Get conversation by ID
   */
  static async getById(id: string, userId: string): Promise<Conversation | null> {
    const result = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, userId)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get all conversations for a user
   */
  static async getAllByUserId(userId: string, limit: number = 50): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit);
  }

  /**
   * Update conversation
   */
  static async update(id: string, data: Partial<Conversation>): Promise<Conversation | null> {
    const [updated] = await db
      .update(conversations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Delete conversation
   */
  static async delete(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, id),
          eq(conversations.userId, userId)
        )
      );

    return true;
  }

  /**
   * Add message to conversation
   */
  static async addMessage(conversationId: string, data: Omit<NewMessage, 'conversationId'>): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...data,
        conversationId,
      })
      .returning();

    // Update conversation's updatedAt
    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return message;
  }

  /**
   * Get messages for a conversation
   */
  static async getMessages(conversationId: string, limit: number = 100): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .limit(limit);
  }

  /**
   * Get recent messages across all conversations for a user
   */
  static async getRecentMessages(userId: string, limit: number = 10): Promise<{
    conversation: Conversation;
    messages: Message[];
  }[]> {
    // Get recent conversations
    const recentConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(5);

    // Get messages for each conversation
    const results = await Promise.all(
      recentConversations.map(async (conv) => {
        const msgs = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(limit);

        return {
          conversation: conv,
          messages: msgs.reverse(), // Reverse to get chronological order
        };
      })
    );

    return results;
  }

  /**
   * Search conversations by content
   */
  static async search(userId: string, query: string): Promise<Conversation[]> {
    // Search in conversation titles and summaries
    const titleResults = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.userId, userId),
          sql`${conversations.title} ILIKE ${`%${query}%`} OR ${conversations.summary} ILIKE ${`%${query}%`}`
        )
      )
      .limit(20);

    return titleResults;
  }

  /**
   * Generate conversation title from first message
   */
  static async generateTitle(conversationId: string): Promise<string> {
    const firstMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.role, 'user')
        )
      )
      .orderBy(messages.createdAt)
      .limit(1);

    if (firstMessages.length > 0) {
      const content = firstMessages[0].content;
      // Take first 50 characters as title
      const title = content.length > 50 
        ? content.substring(0, 47) + '...'
        : content;
      
      await db
        .update(conversations)
        .set({ title })
        .where(eq(conversations.id, conversationId));
      
      return title;
    }

    return 'New Conversation';
  }

  /**
   * Get conversation statistics for a user
   */
  static async getStats(userId: string) {
    const totalConversations = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    const totalMessages = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.userId, userId));

    const lastConversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(1);

    return {
      totalConversations: totalConversations[0]?.count || 0,
      totalMessages: totalMessages[0]?.count || 0,
      lastConversationDate: lastConversation[0]?.updatedAt || null,
    };
  }
}