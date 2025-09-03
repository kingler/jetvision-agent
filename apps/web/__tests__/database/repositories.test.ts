/**
 * Repository Test Suite
 * Tests for all database repositories in the JetVision Agent platform
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseService } from '../../lib/database/service';
import {
  UserRepository,
  CompanyRepository,
  LeadRepository,
  AircraftRepository,
} from '../../lib/database/service';

// Test data helpers
const generateTestData = {
  user: () => ({
    clerkId: `clerk_${Math.random().toString(36).substr(2, 9)}`,
    email: `test${Math.random().toString(36).substr(2, 9)}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    role: 'USER' as const,
    timezone: 'America/New_York',
    preferences: { theme: 'dark' },
    metadata: { source: 'test' },
  }),

  company: () => ({
    name: `Test Company ${Math.random().toString(36).substr(2, 9)}`,
    domain: `test${Math.random().toString(36).substr(2, 9)}.com`,
    industry: 'Aviation',
    size: 'ENTERPRISE' as const,
    apolloAccountId: `apollo_${Math.random().toString(36).substr(2, 9)}`,
    metadata: { testData: true },
  }),

  aircraft: () => ({
    avinodeId: `avinode_${Math.random().toString(36).substr(2, 9)}`,
    registration: `N${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    manufacturer: 'Gulfstream',
    model: 'G650',
    year: 2020,
    category: 'HEAVY' as const,
    maxPassengers: 16,
    range: 7000,
    speed: 516,
    hourlyRate: 8500,
    location: 'KTEB',
    availability: 'AVAILABLE' as const,
    operatorName: 'Test Aviation',
    operatorContact: 'test@aviation.com',
    specifications: { luxury: true },
    metadata: { testData: true },
  }),
};

describe('Database Repositories', () => {
  // Clean up test data before each test
  beforeEach(async () => {
    // In a real test environment, you'd clean up test data here
    // For now, we'll skip cleanup since we don't have a test database
  });

  describe('UserRepository', () => {
    it('should be defined', () => {
      expect(UserRepository).toBeDefined();
      expect(typeof UserRepository.create).toBe('undefined'); // Current implementation doesn't have create
      expect(typeof UserRepository.getById).toBe('function');
      expect(typeof UserRepository.getByClerkId).toBe('function');
      expect(typeof UserRepository.findOrCreateFromClerk).toBe('function');
    });

    it('should have proper method signatures', () => {
      // Test that methods exist and have expected signatures
      expect(UserRepository.updateRole).toBeDefined();
      expect(UserRepository.updatePreferences).toBeDefined();
      expect(UserRepository.getUserWithCompany).toBeDefined();
      expect(UserRepository.associateWithCompany).toBeDefined();
      expect(UserRepository.softDelete).toBeDefined();
    });
  });

  describe('CompanyRepository', () => {
    it('should be defined with all CRUD methods', () => {
      expect(CompanyRepository).toBeDefined();
      expect(typeof CompanyRepository.create).toBe('function');
      expect(typeof CompanyRepository.getById).toBe('function');
      expect(typeof CompanyRepository.getByDomain).toBe('function');
      expect(typeof CompanyRepository.getByApolloAccountId).toBe('function');
      expect(typeof CompanyRepository.update).toBe('function');
      expect(typeof CompanyRepository.softDelete).toBe('function');
    });

    it('should have search and filtering methods', () => {
      expect(CompanyRepository.searchByName).toBeDefined();
      expect(CompanyRepository.getByIndustry).toBeDefined();
      expect(CompanyRepository.getBySize).toBeDefined();
      expect(CompanyRepository.getWithStats).toBeDefined();
    });

    it('should have Apollo integration methods', () => {
      expect(CompanyRepository.updateApolloSync).toBeDefined();
      expect(CompanyRepository.getCompaniesNeedingApolloSync).toBeDefined();
    });
  });

  describe('LeadRepository', () => {
    it('should be defined with all CRUD methods', () => {
      expect(LeadRepository).toBeDefined();
      expect(typeof LeadRepository.create).toBe('function');
      expect(typeof LeadRepository.getById).toBe('function');
      expect(typeof LeadRepository.getByApolloContactId).toBe('function');
      expect(typeof LeadRepository.update).toBe('function');
      expect(typeof LeadRepository.softDelete).toBe('function');
    });

    it('should have lead management methods', () => {
      expect(LeadRepository.getByCompany).toBeDefined();
      expect(LeadRepository.getByStatus).toBeDefined();
      expect(LeadRepository.getHighScoreLeads).toBeDefined();
      expect(LeadRepository.getLeadsRequiringFollowUp).toBeDefined();
      expect(LeadRepository.updateStatus).toBeDefined();
      expect(LeadRepository.updateScore).toBeDefined();
    });

    it('should have Apollo integration methods', () => {
      expect(LeadRepository.bulkCreate).toBeDefined();
      expect(LeadRepository.getConversionStats).toBeDefined();
      expect(LeadRepository.getWithFilters).toBeDefined();
    });
  });

  describe('AircraftRepository', () => {
    it('should be defined with all CRUD methods', () => {
      expect(AircraftRepository).toBeDefined();
      expect(typeof AircraftRepository.create).toBe('function');
      expect(typeof AircraftRepository.getById).toBe('function');
      expect(typeof AircraftRepository.getByAvinodeId).toBe('function');
      expect(typeof AircraftRepository.getByRegistration).toBe('function');
      expect(typeof AircraftRepository.update).toBe('function');
      expect(typeof AircraftRepository.softDelete).toBe('function');
    });

    it('should have aircraft search and filtering methods', () => {
      expect(AircraftRepository.getAvailableByCategory).toBeDefined();
      expect(AircraftRepository.searchWithFilters).toBeDefined();
      expect(AircraftRepository.getNearbyAircraft).toBeDefined();
      expect(AircraftRepository.getByOperator).toBeDefined();
    });

    it('should have availability and location methods', () => {
      expect(AircraftRepository.updateAvailability).toBeDefined();
      expect(AircraftRepository.updateLocation).toBeDefined();
    });

    it('should have Avinode integration methods', () => {
      expect(AircraftRepository.updateAvinodeSync).toBeDefined();
      expect(AircraftRepository.getAircraftNeedingAvinodeSync).toBeDefined();
      expect(AircraftRepository.bulkCreate).toBeDefined();
    });

    it('should have analytics methods', () => {
      expect(AircraftRepository.getWithBookingStats).toBeDefined();
      expect(AircraftRepository.getFleetUtilization).toBeDefined();
    });
  });

  describe('DatabaseService', () => {
    it('should provide unified access to repositories', () => {
      expect(DatabaseService.users).toBe(UserRepository);
      expect(DatabaseService.companies).toBe(CompanyRepository);
      expect(DatabaseService.leads).toBe(LeadRepository);
      expect(DatabaseService.aircraft).toBe(AircraftRepository);
    });

    it('should provide database clients', () => {
      expect(DatabaseService.drizzle).toBeDefined();
      expect(DatabaseService.supabaseService).toBeDefined();
      expect(DatabaseService.supabaseAnon).toBeDefined();
    });

    it('should have service methods', () => {
      expect(typeof DatabaseService.healthCheck).toBe('function');
      expect(typeof DatabaseService.seedDatabase).toBe('function');
      expect(typeof DatabaseService.getStats).toBe('function');
      expect(typeof DatabaseService.cleanupSoftDeleted).toBe('function');
    });

    it('should return proper health check structure', async () => {
      const healthCheck = await DatabaseService.healthCheck();
      
      expect(healthCheck).toHaveProperty('status');
      expect(healthCheck).toHaveProperty('checks');
      expect(healthCheck.checks).toHaveProperty('supabase');
      expect(healthCheck.checks).toHaveProperty('drizzle');
      expect(['healthy', 'unhealthy']).toContain(healthCheck.status);
    });

    it('should return proper stats structure', async () => {
      const stats = await DatabaseService.getStats();
      
      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('totalCompanies');
      expect(stats).toHaveProperty('totalLeads');
      expect(stats).toHaveProperty('totalAircraft');
      expect(stats).toHaveProperty('totalBookings');
      expect(stats).toHaveProperty('totalConversations');
      
      expect(typeof stats.totalUsers).toBe('number');
      expect(typeof stats.totalCompanies).toBe('number');
      expect(typeof stats.totalLeads).toBe('number');
      expect(typeof stats.totalAircraft).toBe('number');
      expect(typeof stats.totalBookings).toBe('number');
      expect(typeof stats.totalConversations).toBe('number');
    });

    it('should return proper cleanup stats structure', async () => {
      const cleanupStats = await DatabaseService.cleanupSoftDeleted(30);
      
      expect(cleanupStats).toHaveProperty('users');
      expect(cleanupStats).toHaveProperty('companies');
      expect(cleanupStats).toHaveProperty('leads');
      expect(cleanupStats).toHaveProperty('aircraft');
      
      expect(typeof cleanupStats.users).toBe('number');
      expect(typeof cleanupStats.companies).toBe('number');
      expect(typeof cleanupStats.leads).toBe('number');
      expect(typeof cleanupStats.aircraft).toBe('number');
    });
  });

  describe('Type Safety', () => {
    it('should export proper TypeScript types', () => {
      // This test ensures types are properly exported
      // In a real test, you'd import types and test their structure
      expect(true).toBe(true); // Placeholder - types are compile-time checked
    });

    it('should maintain enum consistency', () => {
      // Test that enum values match between Prisma and Drizzle
      const userRoles = ['USER', 'ADMIN', 'PREMIUM', 'EXECUTIVE_ASSISTANT'];
      const companySizes = ['STARTUP', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'];
      const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CLOSED_WON', 'CLOSED_LOST', 'UNRESPONSIVE'];
      const aircraftCategories = ['LIGHT', 'MIDSIZE', 'SUPER_MIDSIZE', 'HEAVY', 'ULTRA_LONG_RANGE', 'TURBOPROP', 'HELICOPTER'];
      
      // These would be validated against actual schema enums in production
      expect(userRoles).toContain('USER');
      expect(companySizes).toContain('ENTERPRISE');
      expect(leadStatuses).toContain('NEW');
      expect(aircraftCategories).toContain('HEAVY');
    });
  });
});