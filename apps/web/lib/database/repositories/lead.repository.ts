/**
 * Lead Repository
 * Handles all lead-related database operations for Apollo.io integration
 */

import { eq, and, isNull, gte, lte, desc, asc, inArray } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import { leads, companies, campaignTargets, type NewLead, type Lead } from '../schema';

const db = getDrizzleClient();

export class LeadRepository {
    /**
     * Create new lead
     */
    static async create(data: NewLead): Promise<Lead> {
        const [lead] = await db
            .insert(leads)
            .values({
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning();

        return lead;
    }

    /**
     * Get lead by ID
     */
    static async getById(id: string): Promise<Lead | null> {
        const result = await db
            .select()
            .from(leads)
            .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
            .limit(1);

        return result[0] || null;
    }

    /**
     * Get lead by Apollo Contact ID
     */
    static async getByApolloContactId(apolloContactId: string): Promise<Lead | null> {
        const result = await db
            .select()
            .from(leads)
            .where(and(eq(leads.apolloContactId, apolloContactId), isNull(leads.deletedAt)))
            .limit(1);

        return result[0] || null;
    }

    /**
     * Get leads by company
     */
    static async getByCompany(companyId: string, limit: number = 100): Promise<Lead[]> {
        return await db
            .select()
            .from(leads)
            .where(and(eq(leads.companyId, companyId), isNull(leads.deletedAt)))
            .limit(limit)
            .orderBy(desc(leads.createdAt));
    }

    /**
     * Get leads by status
     */
    static async getByStatus(
        status:
            | 'NEW'
            | 'CONTACTED'
            | 'QUALIFIED'
            | 'PROPOSAL_SENT'
            | 'NEGOTIATING'
            | 'CLOSED_WON'
            | 'CLOSED_LOST'
            | 'UNRESPONSIVE',
        limit: number = 100
    ): Promise<Lead[]> {
        return await db
            .select()
            .from(leads)
            .where(and(eq(leads.status, status), isNull(leads.deletedAt)))
            .limit(limit)
            .orderBy(desc(leads.updatedAt));
    }

    /**
     * Get high-score leads
     */
    static async getHighScoreLeads(minScore: number = 75, limit: number = 50): Promise<Lead[]> {
        return await db
            .select()
            .from(leads)
            .where(and(gte(leads.score, minScore), isNull(leads.deletedAt)))
            .limit(limit)
            .orderBy(desc(leads.score));
    }

    /**
     * Get leads requiring follow-up
     */
    static async getLeadsRequiringFollowUp(): Promise<Lead[]> {
        const now = new Date();

        return await db
            .select()
            .from(leads)
            .where(and(lte(leads.nextFollowUpAt, now), isNull(leads.deletedAt)))
            .orderBy(asc(leads.nextFollowUpAt));
    }

    /**
     * Update lead
     */
    static async update(id: string, data: Partial<Lead>): Promise<Lead | null> {
        const [updated] = await db
            .update(leads)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(leads.id, id))
            .returning();

        return updated || null;
    }

    /**
     * Update lead status
     */
    static async updateStatus(
        id: string,
        status: Lead['status'],
        nextFollowUpAt?: Date
    ): Promise<Lead | null> {
        const updateData: any = {
            status,
            updatedAt: new Date(),
        };

        if (nextFollowUpAt) {
            updateData.nextFollowUpAt = nextFollowUpAt;
        }

        // Set lastContactedAt for certain statuses
        if (['CONTACTED', 'PROPOSAL_SENT', 'NEGOTIATING'].includes(status)) {
            updateData.lastContactedAt = new Date();
        }

        const [updated] = await db
            .update(leads)
            .set(updateData)
            .where(eq(leads.id, id))
            .returning();

        return updated || null;
    }

    /**
     * Update lead score
     */
    static async updateScore(id: string, score: number): Promise<Lead | null> {
        const [updated] = await db
            .update(leads)
            .set({
                score: Math.max(0, Math.min(100, score)), // Ensure score is between 0-100
                updatedAt: new Date(),
            })
            .where(eq(leads.id, id))
            .returning();

        return updated || null;
    }

    /**
     * Get lead with company information
     */
    static async getWithCompany(id: string): Promise<(Lead & { company?: any }) | null> {
        const result = await db
            .select({
                lead: leads,
                company: companies,
            })
            .from(leads)
            .leftJoin(companies, eq(leads.companyId, companies.id))
            .where(and(eq(leads.id, id), isNull(leads.deletedAt)))
            .limit(1);

        if (!result[0]) return null;

        return {
            ...result[0].lead,
            company: result[0].company,
        };
    }

    /**
     * Bulk create leads (for Apollo sync)
     */
    static async bulkCreate(leadsData: NewLead[]): Promise<Lead[]> {
        const now = new Date();
        const leadsWithTimestamps = leadsData.map(lead => ({
            ...lead,
            createdAt: now,
            updatedAt: now,
        }));

        return await db.insert(leads).values(leadsWithTimestamps).returning();
    }

    /**
     * Get leads by email domain
     */
    static async getByEmailDomain(domain: string): Promise<Lead[]> {
        return await db
            .select()
            .from(leads)
            .where(
                and(
                    eq(leads.email, `%@${domain}`), // This would need proper SQL LIKE operator
                    isNull(leads.deletedAt)
                )
            );
    }

    /**
     * Get lead conversion funnel stats
     */
    static async getConversionStats(companyId?: string): Promise<{
        NEW: number;
        CONTACTED: number;
        QUALIFIED: number;
        PROPOSAL_SENT: number;
        NEGOTIATING: number;
        CLOSED_WON: number;
        CLOSED_LOST: number;
        UNRESPONSIVE: number;
    }> {
        const whereCondition = companyId
            ? and(eq(leads.companyId, companyId), isNull(leads.deletedAt))
            : isNull(leads.deletedAt);

        const allLeads = await db.select().from(leads).where(whereCondition);

        const stats = {
            NEW: 0,
            CONTACTED: 0,
            QUALIFIED: 0,
            PROPOSAL_SENT: 0,
            NEGOTIATING: 0,
            CLOSED_WON: 0,
            CLOSED_LOST: 0,
            UNRESPONSIVE: 0,
        };

        allLeads.forEach(lead => {
            stats[lead.status]++;
        });

        return stats;
    }

    /**
     * Soft delete lead
     */
    static async softDelete(id: string): Promise<boolean> {
        const [updated] = await db
            .update(leads)
            .set({
                deletedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(leads.id, id))
            .returning();

        return !!updated;
    }

    /**
     * Get leads with pagination and filtering
     */
    static async getWithFilters(filters: {
        companyId?: string;
        status?: Lead['status'][];
        minScore?: number;
        maxScore?: number;
        offset?: number;
        limit?: number;
    }): Promise<{
        leads: Lead[];
        total: number;
    }> {
        const { companyId, status, minScore, maxScore, offset = 0, limit = 50 } = filters;

        const conditions = [isNull(leads.deletedAt)];

        if (companyId) {
            conditions.push(eq(leads.companyId, companyId));
        }

        if (status && status.length > 0) {
            conditions.push(inArray(leads.status, status));
        }

        if (minScore !== undefined) {
            conditions.push(gte(leads.score, minScore));
        }

        if (maxScore !== undefined) {
            conditions.push(lte(leads.score, maxScore));
        }

        const whereCondition = and(...conditions);

        const leadsResult = await db
            .select()
            .from(leads)
            .where(whereCondition)
            .offset(offset)
            .limit(limit)
            .orderBy(desc(leads.updatedAt));

        const totalResult = await db.select().from(leads).where(whereCondition);

        return {
            leads: leadsResult,
            total: totalResult.length,
        };
    }
}
