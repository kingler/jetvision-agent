/**
 * User Repository
 * Handles all user-related database operations
 * Updated for comprehensive JetVision Agent schema
 */

import { eq, and, isNull } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import { users, companies, type NewUser, type User } from '../schema';

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
        role: 'USER',
        metadata: {},
        preferences: {},
        lastLoginAt: new Date(),
      })
      .returning();

    // Preferences are stored in the users table metadata field

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
  static async updateRole(id: string, role: 'USER' | 'ADMIN' | 'PREMIUM' | 'EXECUTIVE_ASSISTANT'): Promise<User | null> {
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
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return result[0]?.preferences || null;
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(userId: string, preferences: any) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    const mergedPreferences = {
      ...(user.preferences as any || {}),
      ...preferences,
    };

    const [updated] = await db
      .update(users)
      .set({
        preferences: mergedPreferences,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updated.preferences;
  }

  /**
   * Get user with company information
   */
  static async getUserWithCompany(id: string): Promise<(User & { company?: any }) | null> {
    const result = await db
      .select({
        user: users,
        company: companies,
      })
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.id, id))
      .limit(1);

    if (!result[0]) return null;

    return {
      ...result[0].user,
      company: result[0].company,
    };
  }

  /**
   * Associate user with company
   */
  static async associateWithCompany(userId: string, companyId: string): Promise<User | null> {
    const [updated] = await db
      .update(users)
      .set({
        companyId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updated || null;
  }

  /**
   * Get users by company
   */
  static async getUsersByCompany(companyId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(
        eq(users.companyId, companyId),
        isNull(users.deletedAt)
      ));
  }

  /**
   * Soft delete user
   */
  static async softDelete(id: string): Promise<boolean> {
    const [updated] = await db
      .update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return !!updated;
  }

  /**
   * Update user timezone
   */
  static async updateTimezone(id: string, timezone: string): Promise<User | null> {
    const [updated] = await db
      .update(users)
      .set({
        timezone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Get user statistics
   */
  static async getUserStats(userId: string): Promise<{
    totalConversations: number;
    totalBookings: number;
    totalCampaignTargets: number;
  }> {
    // This would be implemented with appropriate joins and counts
    // For now returning basic structure
    return {
      totalConversations: 0,
      totalBookings: 0,
      totalCampaignTargets: 0,
    };
  }
}