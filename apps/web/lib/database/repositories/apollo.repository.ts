/**
 * Apollo Repository
 * Handles Apollo.io leads and campaigns database operations
 */

import { eq, desc, and, or, sql, inArray } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import {
  apolloLeads,
  apolloCampaigns,
  apolloCampaignLeads,
  type ApolloLead,
  type NewApolloLead,
  type ApolloCampaign,
  type NewApolloCampaign,
} from '../schema';

const db = getDrizzleClient();

export class ApolloRepository {
  // ========================
  // Lead Operations
  // ========================

  /**
   * Create or update Apollo lead
   */
  static async upsertLead(data: NewApolloLead): Promise<ApolloLead> {
    if (data.apolloId) {
      // Check if lead exists
      const existing = await db
        .select()
        .from(apolloLeads)
        .where(eq(apolloLeads.apolloId, data.apolloId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing lead
        const [updated] = await db
          .update(apolloLeads)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(apolloLeads.id, existing[0].id))
          .returning();
        
        return updated;
      }
    }

    // Create new lead
    const [newLead] = await db
      .insert(apolloLeads)
      .values(data)
      .returning();

    return newLead;
  }

  /**
   * Get lead by ID
   */
  static async getLeadById(id: string): Promise<ApolloLead | null> {
    const result = await db
      .select()
      .from(apolloLeads)
      .where(eq(apolloLeads.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get all leads for a user
   */
  static async getLeadsByUserId(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ leads: ApolloLead[]; total: number }> {
    const leads = await db
      .select()
      .from(apolloLeads)
      .where(eq(apolloLeads.userId, userId))
      .orderBy(desc(apolloLeads.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(apolloLeads)
      .where(eq(apolloLeads.userId, userId));

    return {
      leads,
      total: totalResult[0]?.count || 0,
    };
  }

  /**
   * Search leads
   */
  static async searchLeads(userId: string, query: string): Promise<ApolloLead[]> {
    return await db
      .select()
      .from(apolloLeads)
      .where(
        and(
          eq(apolloLeads.userId, userId),
          or(
            sql`${apolloLeads.firstName} ILIKE ${`%${query}%`}`,
            sql`${apolloLeads.lastName} ILIKE ${`%${query}%`}`,
            sql`${apolloLeads.email} ILIKE ${`%${query}%`}`,
            sql`${apolloLeads.company} ILIKE ${`%${query}%`}`
          )
        )
      )
      .limit(50);
  }

  /**
   * Update lead status
   */
  static async updateLeadStatus(
    id: string,
    status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
  ): Promise<ApolloLead | null> {
    const [updated] = await db
      .update(apolloLeads)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(apolloLeads.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Bulk create leads
   */
  static async bulkCreateLeads(leads: NewApolloLead[]): Promise<ApolloLead[]> {
    const created = await db
      .insert(apolloLeads)
      .values(leads)
      .returning();

    return created;
  }

  // ========================
  // Campaign Operations
  // ========================

  /**
   * Create Apollo campaign
   */
  static async createCampaign(data: NewApolloCampaign): Promise<ApolloCampaign> {
    const [campaign] = await db
      .insert(apolloCampaigns)
      .values(data)
      .returning();

    return campaign;
  }

  /**
   * Get campaign by ID
   */
  static async getCampaignById(id: string): Promise<ApolloCampaign | null> {
    const result = await db
      .select()
      .from(apolloCampaigns)
      .where(eq(apolloCampaigns.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get campaigns for a user
   */
  static async getCampaignsByUserId(userId: string): Promise<ApolloCampaign[]> {
    return await db
      .select()
      .from(apolloCampaigns)
      .where(eq(apolloCampaigns.userId, userId))
      .orderBy(desc(apolloCampaigns.createdAt));
  }

  /**
   * Update campaign
   */
  static async updateCampaign(
    id: string,
    data: Partial<ApolloCampaign>
  ): Promise<ApolloCampaign | null> {
    const [updated] = await db
      .update(apolloCampaigns)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(apolloCampaigns.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Add leads to campaign
   */
  static async addLeadsToCampaign(campaignId: string, leadIds: string[]): Promise<void> {
    const values = leadIds.map((leadId) => ({
      campaignId,
      leadId,
    }));

    await db
      .insert(apolloCampaignLeads)
      .values(values)
      .onConflictDoNothing();

    // Update campaign contact count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(apolloCampaignLeads)
      .where(eq(apolloCampaignLeads.campaignId, campaignId));

    await db
      .update(apolloCampaigns)
      .set({
        totalContacts: countResult[0]?.count || 0,
        updatedAt: new Date(),
      })
      .where(eq(apolloCampaigns.id, campaignId));
  }

  /**
   * Remove lead from campaign
   */
  static async removeLeadFromCampaign(campaignId: string, leadId: string): Promise<void> {
    await db
      .delete(apolloCampaignLeads)
      .where(
        and(
          eq(apolloCampaignLeads.campaignId, campaignId),
          eq(apolloCampaignLeads.leadId, leadId)
        )
      );
  }

  /**
   * Get leads in a campaign
   */
  static async getCampaignLeads(campaignId: string): Promise<ApolloLead[]> {
    const campaignLeadRecords = await db
      .select({ leadId: apolloCampaignLeads.leadId })
      .from(apolloCampaignLeads)
      .where(eq(apolloCampaignLeads.campaignId, campaignId));

    if (campaignLeadRecords.length === 0) {
      return [];
    }

    const leadIds = campaignLeadRecords.map((cl) => cl.leadId);

    return await db
      .select()
      .from(apolloLeads)
      .where(inArray(apolloLeads.id, leadIds));
  }

  /**
   * Update campaign metrics
   */
  static async updateCampaignMetrics(
    campaignId: string,
    metrics: {
      sentEmails?: number;
      openRate?: number;
      replyRate?: number;
    }
  ): Promise<ApolloCampaign | null> {
    const [updated] = await db
      .update(apolloCampaigns)
      .set({
        ...metrics,
        updatedAt: new Date(),
      })
      .where(eq(apolloCampaigns.id, campaignId))
      .returning();

    return updated || null;
  }

  /**
   * Get campaign statistics
   */
  static async getCampaignStats(userId: string) {
    const totalCampaigns = await db
      .select({ count: sql<number>`count(*)` })
      .from(apolloCampaigns)
      .where(eq(apolloCampaigns.userId, userId));

    const activeCampaigns = await db
      .select({ count: sql<number>`count(*)` })
      .from(apolloCampaigns)
      .where(
        and(
          eq(apolloCampaigns.userId, userId),
          eq(apolloCampaigns.status, 'active')
        )
      );

    const totalLeads = await db
      .select({ count: sql<number>`count(*)` })
      .from(apolloLeads)
      .where(eq(apolloLeads.userId, userId));

    return {
      totalCampaigns: totalCampaigns[0]?.count || 0,
      activeCampaigns: activeCampaigns[0]?.count || 0,
      totalLeads: totalLeads[0]?.count || 0,
    };
  }
}