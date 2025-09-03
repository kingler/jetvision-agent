/**
 * Database Models Test Suite
 * Tests for all business entities in the JetVision Agent platform
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getDrizzleClient } from '../../lib/database/client';
import { 
  users, companies, leads, campaigns, aircraft, bookings, 
  conversations, messages, integrationLogs, type NewUser, 
  type NewCompany, type NewLead, type NewCampaign, type NewAircraft,
  type NewBooking, type NewConversation, type NewMessage
} from '../../lib/database/schema';
import { eq, and } from 'drizzle-orm';

const db = getDrizzleClient();

// Test data factories using simple data generation
const generateId = () => Math.random().toString(36).substr(2, 9);
const generateEmail = () => `test${generateId()}@example.com`;
const generateName = () => `Test${generateId()}`;

const createTestUser = (): NewUser => ({
  clerkId: generateId(),
  email: generateEmail(),
  firstName: generateName(),
  lastName: generateName(),
  role: 'USER',
  companyId: undefined,
  jobTitle: 'Test Manager',
  phone: '+1234567890',
  timezone: 'America/New_York',
  preferences: {
    emailNotifications: true,
    smsNotifications: false,
    dashboardLayout: 'default'
  },
  metadata: {}
});

const createTestCompany = (): NewCompany => ({
  name: `Test Company ${generateId()}`,
  domain: `test${generateId()}.com`,
  industry: 'Aviation',
  size: 'ENTERPRISE',
  apolloAccountId: generateId(),
  metadata: {
    apolloConnected: true,
    lastSyncAt: new Date().toISOString()
  }
});

const createTestLead = (companyId: string): NewLead => ({
  apolloContactId: generateId(),
  email: generateEmail(),
  firstName: generateName(),
  lastName: generateName(),
  jobTitle: 'Test Executive',
  companyId,
  phone: '+1234567890',
  linkedinUrl: `https://linkedin.com/in/test${generateId()}`,
  status: 'NEW',
  score: 75,
  lastContactedAt: undefined,
  metadata: {
    apolloData: {
      lastEnrichment: new Date().toISOString()
    }
  }
});

describe('Database Models', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await db.delete(messages);
    await db.delete(conversations);
    await db.delete(bookings);
    await db.delete(aircraft);
    await db.delete(campaigns);
    await db.delete(leads);
    await db.delete(users);
    await db.delete(companies);
  });

  describe('User Model', () => {
    it('should create a user with required fields', async () => {
      const userData = createTestUser();
      
      const [user] = await db.insert(users).values(userData).returning();
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.role).toBe('USER');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
      expect(user.preferences).toEqual(userData.preferences);
    });

    it('should enforce unique email constraint', async () => {
      const userData = createTestUser();
      
      // Insert first user
      await db.insert(users).values(userData);
      
      // Try to insert user with same email
      await expect(
        db.insert(users).values({ ...userData, clerkId: generateId() })
      ).rejects.toThrow();
    });

    it('should enforce unique clerkId constraint', async () => {
      const userData = createTestUser();
      
      // Insert first user
      await db.insert(users).values(userData);
      
      // Try to insert user with same clerkId
      await expect(
        db.insert(users).values({ ...userData, email: generateEmail() })
      ).rejects.toThrow();
    });
  });

  describe('Company Model', () => {
    it('should create a company with required fields', async () => {
      const companyData = createTestCompany();
      
      const [company] = await db.insert(companies).values(companyData).returning();
      
      expect(company).toBeDefined();
      expect(company.id).toBeDefined();
      expect(company.name).toBe(companyData.name);
      expect(company.domain).toBe(companyData.domain);
      expect(company.industry).toBe(companyData.industry);
      expect(company.size).toBe(companyData.size);
      expect(company.apolloAccountId).toBe(companyData.apolloAccountId);
      expect(company.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique domain constraint', async () => {
      const companyData = createTestCompany();
      
      // Insert first company
      await db.insert(companies).values(companyData);
      
      // Try to insert company with same domain
      await expect(
        db.insert(companies).values({ 
          ...companyData, 
          name: `Different Company ${generateId()}`,
          apolloAccountId: generateId()
        })
      ).rejects.toThrow();
    });
  });

  describe('Lead Model', () => {
    it('should create a lead linked to a company', async () => {
      // Create company first
      const companyData = createTestCompany();
      const [company] = await db.insert(companies).values(companyData).returning();
      
      const leadData = createTestLead(company.id);
      const [lead] = await db.insert(leads).values(leadData).returning();
      
      expect(lead).toBeDefined();
      expect(lead.id).toBeDefined();
      expect(lead.companyId).toBe(company.id);
      expect(lead.email).toBe(leadData.email);
      expect(lead.status).toBe('NEW');
      expect(lead.score).toBe(leadData.score);
      expect(lead.apolloContactId).toBe(leadData.apolloContactId);
    });

    it('should enforce foreign key constraint with company', async () => {
      const leadData = createTestLead(generateId()); // Non-existent company ID
      
      await expect(
        db.insert(leads).values(leadData)
      ).rejects.toThrow();
    });

    it('should enforce unique apolloContactId constraint', async () => {
      const companyData = createTestCompany();
      const [company] = await db.insert(companies).values(companyData).returning();
      
      const leadData = createTestLead(company.id);
      
      // Insert first lead
      await db.insert(leads).values(leadData);
      
      // Try to insert lead with same apolloContactId
      await expect(
        db.insert(leads).values({ 
          ...leadData, 
          email: generateEmail() 
        })
      ).rejects.toThrow();
    });
  });

  describe('Aircraft Model', () => {
    it('should create aircraft with complete specifications', async () => {
      const aircraftData = {
        avinodeId: generateId(),
        registration: `N${generateId().toUpperCase()}`,
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
        operatorName: 'Elite Aviation',
        operatorContact: generateEmail(),
        specifications: {
          interior: 'Luxury leather seating',
          amenities: ['WiFi', 'Entertainment System', 'Full Bar'],
          certifications: ['Part 135', 'IS-BAO']
        },
        metadata: {}
      };
      
      const [aircraftResult] = await db.insert(aircraft).values(aircraftData).returning();
      
      expect(aircraftResult).toBeDefined();
      expect(aircraftResult.id).toBeDefined();
      expect(aircraftResult.registration).toBe(aircraftData.registration);
      expect(aircraftResult.manufacturer).toBe(aircraftData.manufacturer);
      expect(aircraftResult.model).toBe(aircraftData.model);
      expect(aircraftResult.category).toBe('HEAVY');
      expect(aircraftResult.hourlyRate).toBe(8500);
      expect(aircraftResult.specifications).toEqual(aircraftData.specifications);
    });

    it('should enforce unique registration constraint', async () => {
      const aircraftData = {
        avinodeId: generateId(),
        registration: 'N12345',
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
        operatorName: 'Elite Aviation',
        operatorContact: generateEmail(),
        specifications: {},
        metadata: {}
      };
      
      // Insert first aircraft
      await db.insert(aircraft).values(aircraftData);
      
      // Try to insert aircraft with same registration
      await expect(
        db.insert(aircraft).values({ 
          ...aircraftData, 
          avinodeId: generateId() 
        })
      ).rejects.toThrow();
    });
  });

  describe('Booking Model', () => {
    it('should create booking with aircraft reference', async () => {
      // Create aircraft first
      const aircraftData = {
        avinodeId: generateId(),
        registration: `N${generateId().toUpperCase()}`,
        manufacturer: 'Cessna',
        model: 'Citation X',
        year: 2018,
        category: 'MIDSIZE' as const,
        maxPassengers: 8,
        range: 3500,
        speed: 460,
        hourlyRate: 4500,
        location: 'KJFK',
        availability: 'AVAILABLE' as const,
        operatorName: 'Business Jets Inc',
        operatorContact: generateEmail(),
        specifications: {},
        metadata: {}
      };
      
      const [aircraftRecord] = await db.insert(aircraft).values(aircraftData).returning();
      
      const bookingData = {
        avinodeBookingId: generateId(),
        aircraftId: aircraftRecord.id,
        userId: undefined,
        departure: 'KJFK',
        destination: 'KLAX',
        departureTime: new Date('2024-06-01T10:00:00Z'),
        returnTime: new Date('2024-06-01T18:00:00Z'),
        passengers: 6,
        status: 'REQUESTED' as const,
        totalCost: 45000,
        flightHours: 10,
        requestedBy: generateEmail(),
        specialRequests: 'Ground transportation required',
        metadata: {
          priority: 'high',
          clientType: 'corporate'
        }
      };
      
      const [booking] = await db.insert(bookings).values(bookingData).returning();
      
      expect(booking).toBeDefined();
      expect(booking.id).toBeDefined();
      expect(booking.aircraftId).toBe(aircraftRecord.id);
      expect(booking.departure).toBe('KJFK');
      expect(booking.destination).toBe('KLAX');
      expect(booking.status).toBe('REQUESTED');
      expect(booking.totalCost).toBe(45000);
      expect(booking.passengers).toBe(6);
    });
  });

  describe('Conversation Model', () => {
    it('should create conversation with user reference', async () => {
      // Create user first
      const userData = createTestUser();
      const [user] = await db.insert(users).values(userData).returning();
      
      const conversationData = {
        userId: user.id,
        title: 'Flight Booking Inquiry',
        status: 'ACTIVE' as const,
        metadata: {
          source: 'web_chat',
          priority: 'normal'
        }
      };
      
      const [conversation] = await db.insert(conversations).values(conversationData).returning();
      
      expect(conversation).toBeDefined();
      expect(conversation.id).toBeDefined();
      expect(conversation.userId).toBe(user.id);
      expect(conversation.title).toBe('Flight Booking Inquiry');
      expect(conversation.status).toBe('ACTIVE');
    });
  });

  describe('Message Model', () => {
    it('should create message within conversation', async () => {
      // Create user and conversation first
      const userData = createTestUser();
      const [user] = await db.insert(users).values(userData).returning();
      
      const conversationData = {
        userId: user.id,
        title: 'Test Conversation',
        status: 'ACTIVE' as const,
        metadata: {}
      };
      
      const [conversation] = await db.insert(conversations).values(conversationData).returning();
      
      const messageData = {
        conversationId: conversation.id,
        content: 'Hello, I need help booking a flight from NYC to LAX',
        role: 'USER' as const,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'web_interface'
        }
      };
      
      const [message] = await db.insert(messages).values(messageData).returning();
      
      expect(message).toBeDefined();
      expect(message.id).toBeDefined();
      expect(message.conversationId).toBe(conversation.id);
      expect(message.content).toBe(messageData.content);
      expect(message.role).toBe('USER');
    });
  });

  describe('Relationships', () => {
    it('should properly link user to company', async () => {
      // Create company
      const companyData = createTestCompany();
      const [company] = await db.insert(companies).values(companyData).returning();
      
      // Create user linked to company
      const userData = { ...createTestUser(), companyId: company.id };
      const [user] = await db.insert(users).values(userData).returning();
      
      expect(user.companyId).toBe(company.id);
      
      // Verify relationship by querying
      const userWithCompany = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id));
      
      expect(userWithCompany[0].companyId).toBe(company.id);
    });

    it('should cascade delete messages when conversation is deleted', async () => {
      // Create test data
      const userData = createTestUser();
      const [user] = await db.insert(users).values(userData).returning();
      
      const conversationData = {
        userId: user.id,
        title: 'Test Conversation',
        status: 'ACTIVE' as const,
        metadata: {}
      };
      
      const [conversation] = await db.insert(conversations).values(conversationData).returning();
      
      const messageData = {
        conversationId: conversation.id,
        content: 'Test message',
        role: 'USER' as const,
        metadata: {}
      };
      
      await db.insert(messages).values(messageData);
      
      // Delete conversation
      await db.delete(conversations).where(eq(conversations.id, conversation.id));
      
      // Verify messages are deleted
      const remainingMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id));
      
      expect(remainingMessages).toHaveLength(0);
    });
  });
});