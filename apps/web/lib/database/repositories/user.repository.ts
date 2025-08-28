/**
 * User Repository
 * Handles all user-related database operations
 */

import { eq } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import { users, userPreferences, type NewUser, type User } from '../schema';

const db = getDrizzleClient();

export class UserRepository {
  /**
   * Find or create user from Clerk authentication
   */
  static async findOrCreateFromClerk(clerkUser: {
    id: string;
    emailAddresses: Array<{ emailAddress: string }>;
    firstName?: string | null;
    lastName?: string | null;
  }): Promise<User> {
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      throw new Error('No email address found for user');
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUser.id))
      .limit(1);

    if (existingUser.length > 0) {
      // Update last login
      const [updatedUser] = await db
        .update(users)
        .set({ 
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser[0].id))
        .returning();
      
      return updatedUser;
    }

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        clerkId: clerkUser.id,
        email,
        firstName: clerkUser.firstName || undefined,
        lastName: clerkUser.lastName || undefined,
        role: 'user',
        metadata: {},
        preferences: {},
        lastLoginAt: new Date(),
      })
      .returning();

    // Create default preferences
    await db.insert(userPreferences).values({
      userId: newUser.id,
      defaultChatMode: 'general',
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: false,
        sms: false,
      },
    });

    return newUser;
  }

  /**
   * Get user by Clerk ID
   */
  static async getByClerkId(clerkId: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get user by ID
   */
  static async getById(id: string): Promise<User | null> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Update user
   */
  static async update(id: string, data: Partial<User>): Promise<User | null> {
    const [updated] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Update user role
   */
  static async updateRole(id: string, role: 'user' | 'admin' | 'premium'): Promise<User | null> {
    const [updated] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Get user preferences
   */
  static async getPreferences(userId: string) {
    const result = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(userId: string, preferences: any) {
    const existing = await this.getPreferences(userId);

    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({
          ...preferences,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
      
      return updated;
    } else {
      const [created] = await db
        .insert(userPreferences)
        .values({
          userId,
          ...preferences,
        })
        .returning();
      
      return created;
    }
  }
}