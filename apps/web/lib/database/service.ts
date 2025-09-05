/**
 * Database Service
 * Central service for all database operations in JetVision Agent
 * Provides unified access to all repositories and database clients
 */

// Import all repository classes
import { UserRepository } from './repositories/user.repository';
import { CompanyRepository } from './repositories/company.repository';
import { LeadRepository } from './repositories/lead.repository';
import { AircraftRepository } from './repositories/aircraft.repository';

// Export all repository classes
export { UserRepository, CompanyRepository, LeadRepository, AircraftRepository };

// Import database client functions for internal use
import { 
  getDrizzleClient, 
  getSupabaseServiceClient, 
  getSupabaseAnonClient,
  createSupabaseBrowserClient,
  checkDatabaseConnection 
} from './client';

// Export database clients
export { 
  getDrizzleClient, 
  getSupabaseServiceClient, 
  getSupabaseAnonClient,
  createSupabaseBrowserClient,
  checkDatabaseConnection 
} from './client';

// Export all schema types and tables
export * from './schema';

/**
 * Unified Database Service Class
 * Provides access to all repositories through a single interface
 */
export class DatabaseService {
  // Repository instances
  static readonly users = UserRepository;
  static readonly companies = CompanyRepository;
  static readonly leads = LeadRepository;
  static readonly aircraft = AircraftRepository;

  // Database client getters (lazy initialization)
  static get drizzle() {
    return getDrizzleClient();
  }
  
  static get supabaseService() {
    return getSupabaseServiceClient();
  }
  
  static get supabaseAnon() {
    return getSupabaseAnonClient();
  }

  /**
   * Health check for database connectivity
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    checks: {
      supabase: boolean;
      drizzle: boolean;
    };
  }> {
    const checks = {
      supabase: false,
      drizzle: false,
    };

    try {
      // Test Supabase connection
      checks.supabase = await checkDatabaseConnection();
      
      // Test Drizzle connection by running a simple query
      await this.drizzle.execute('SELECT 1 as test');
      checks.drizzle = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    return {
      status: checks.supabase && checks.drizzle ? 'healthy' : 'unhealthy',
      checks,
    };
  }

  /**
   * Initialize database with seed data (for development/testing)
   */
  static async seedDatabase(): Promise<void> {
    // This would contain seed data logic
    console.log('Database seeding not implemented yet');
  }

  /**
   * Get database statistics
   */
  static async getStats(): Promise<{
    totalUsers: number;
    totalCompanies: number;
    totalLeads: number;
    totalAircraft: number;
    totalBookings: number;
    totalConversations: number;
  }> {
    try {
      // These would be actual count queries
      // For now returning placeholder values
      return {
        totalUsers: 0,
        totalCompanies: 0,
        totalLeads: 0,
        totalAircraft: 0,
        totalBookings: 0,
        totalConversations: 0,
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Cleanup soft-deleted records older than specified days
   */
  static async cleanupSoftDeleted(daysOld: number = 30): Promise<{
    users: number;
    companies: number;
    leads: number;
    aircraft: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // This would implement actual cleanup logic
    // For now returning placeholder values
    return {
      users: 0,
      companies: 0,
      leads: 0,
      aircraft: 0,
    };
  }
}

// Export the service as default
export default DatabaseService;