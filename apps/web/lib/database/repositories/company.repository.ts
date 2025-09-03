/**
 * Company Repository
 * Handles all company-related database operations
 */

import { eq, and, isNull, like, ilike } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import { companies, users, leads, type NewCompany, type Company } from '../schema';

const db = getDrizzleClient();

export class CompanyRepository {
  /**
   * Create new company
   */
  static async create(data: NewCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return company;
  }

  /**
   * Get company by ID
   */
  static async getById(id: string): Promise<Company | null> {
    const result = await db
      .select()
      .from(companies)
      .where(and(
        eq(companies.id, id),
        isNull(companies.deletedAt)
      ))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get company by domain
   */
  static async getByDomain(domain: string): Promise<Company | null> {
    const result = await db
      .select()
      .from(companies)
      .where(and(
        eq(companies.domain, domain),
        isNull(companies.deletedAt)
      ))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get company by Apollo Account ID
   */
  static async getByApolloAccountId(apolloAccountId: string): Promise<Company | null> {
    const result = await db
      .select()
      .from(companies)
      .where(and(
        eq(companies.apolloAccountId, apolloAccountId),
        isNull(companies.deletedAt)
      ))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Update company
   */
  static async update(id: string, data: Partial<Company>): Promise<Company | null> {
    const [updated] = await db
      .update(companies)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Update Apollo sync timestamp
   */
  static async updateApolloSync(id: string): Promise<Company | null> {
    const [updated] = await db
      .update(companies)
      .set({
        apolloSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Search companies by name
   */
  static async searchByName(searchTerm: string, limit: number = 20): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(and(
        ilike(companies.name, `%${searchTerm}%`),
        isNull(companies.deletedAt)
      ))
      .limit(limit);
  }

  /**
   * Get companies by industry
   */
  static async getByIndustry(industry: string): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(and(
        eq(companies.industry, industry),
        isNull(companies.deletedAt)
      ));
  }

  /**
   * Get companies by size
   */
  static async getBySize(size: 'STARTUP' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(and(
        eq(companies.size, size),
        isNull(companies.deletedAt)
      ));
  }

  /**
   * Get company with users and leads count
   */
  static async getWithStats(id: string): Promise<(Company & { 
    userCount: number; 
    leadCount: number; 
  }) | null> {
    const company = await this.getById(id);
    if (!company) return null;

    // Get user count
    const userCountResult = await db
      .select()
      .from(users)
      .where(and(
        eq(users.companyId, id),
        isNull(users.deletedAt)
      ));

    // Get lead count
    const leadCountResult = await db
      .select()
      .from(leads)
      .where(and(
        eq(leads.companyId, id),
        isNull(leads.deletedAt)
      ));

    return {
      ...company,
      userCount: userCountResult.length,
      leadCount: leadCountResult.length,
    };
  }

  /**
   * Soft delete company
   */
  static async softDelete(id: string): Promise<boolean> {
    const [updated] = await db
      .update(companies)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();

    return !!updated;
  }

  /**
   * Get companies requiring Apollo sync
   */
  static async getCompaniesNeedingApolloSync(maxAge: Date): Promise<Company[]> {
    return await db
      .select()
      .from(companies)
      .where(and(
        isNull(companies.deletedAt),
        eq(companies.apolloAccountId, companies.apolloAccountId), // Has Apollo account
        // Add condition for companies that haven't been synced recently
        // This is a placeholder - actual implementation would check apolloSyncedAt
      ));
  }

  /**
   * Get all companies with pagination
   */
  static async getAll(offset: number = 0, limit: number = 50): Promise<{
    companies: Company[];
    total: number;
  }> {
    const companiesResult = await db
      .select()
      .from(companies)
      .where(isNull(companies.deletedAt))
      .offset(offset)
      .limit(limit);

    const totalResult = await db
      .select()
      .from(companies)
      .where(isNull(companies.deletedAt));

    return {
      companies: companiesResult,
      total: totalResult.length,
    };
  }
}