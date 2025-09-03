/**
 * Aircraft Repository
 * Handles all aircraft-related database operations for Avinode integration
 */

import { eq, and, isNull, gte, lte, desc, asc, inArray, between } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import { aircraft, bookings, type NewAircraft, type Aircraft } from '../schema';

const db = getDrizzleClient();

export class AircraftRepository {
  /**
   * Create new aircraft
   */
  static async create(data: NewAircraft): Promise<Aircraft> {
    const [aircraftRecord] = await db
      .insert(aircraft)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return aircraftRecord;
  }

  /**
   * Get aircraft by ID
   */
  static async getById(id: string): Promise<Aircraft | null> {
    const result = await db
      .select()
      .from(aircraft)
      .where(and(
        eq(aircraft.id, id),
        isNull(aircraft.deletedAt)
      ))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get aircraft by Avinode ID
   */
  static async getByAvinodeId(avinodeId: string): Promise<Aircraft | null> {
    const result = await db
      .select()
      .from(aircraft)
      .where(and(
        eq(aircraft.avinodeId, avinodeId),
        isNull(aircraft.deletedAt)
      ))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get aircraft by registration
   */
  static async getByRegistration(registration: string): Promise<Aircraft | null> {
    const result = await db
      .select()
      .from(aircraft)
      .where(and(
        eq(aircraft.registration, registration),
        isNull(aircraft.deletedAt)
      ))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get available aircraft by category
   */
  static async getAvailableByCategory(
    category: 'LIGHT' | 'MIDSIZE' | 'SUPER_MIDSIZE' | 'HEAVY' | 'ULTRA_LONG_RANGE' | 'TURBOPROP' | 'HELICOPTER',
    limit: number = 50
  ): Promise<Aircraft[]> {
    return await db
      .select()
      .from(aircraft)
      .where(and(
        eq(aircraft.category, category),
        eq(aircraft.availability, 'AVAILABLE'),
        isNull(aircraft.deletedAt)
      ))
      .limit(limit)
      .orderBy(asc(aircraft.hourlyRate));
  }

  /**
   * Search aircraft with filters
   */
  static async searchWithFilters(filters: {
    category?: Aircraft['category'][];
    minPassengers?: number;
    maxPassengers?: number;
    minRange?: number;
    maxRange?: number;
    minHourlyRate?: number;
    maxHourlyRate?: number;
    location?: string;
    availability?: Aircraft['availability'];
    offset?: number;
    limit?: number;
  }): Promise<{
    aircraft: Aircraft[];
    total: number;
  }> {
    const {
      category,
      minPassengers,
      maxPassengers,
      minRange,
      maxRange,
      minHourlyRate,
      maxHourlyRate,
      location,
      availability = 'AVAILABLE',
      offset = 0,
      limit = 50,
    } = filters;

    const conditions = [
      eq(aircraft.availability, availability),
      isNull(aircraft.deletedAt)
    ];

    if (category && category.length > 0) {
      conditions.push(inArray(aircraft.category, category));
    }

    if (minPassengers !== undefined) {
      conditions.push(gte(aircraft.maxPassengers, minPassengers));
    }

    if (maxPassengers !== undefined) {
      conditions.push(lte(aircraft.maxPassengers, maxPassengers));
    }

    if (minRange !== undefined) {
      conditions.push(gte(aircraft.range, minRange));
    }

    if (maxRange !== undefined) {
      conditions.push(lte(aircraft.range, maxRange));
    }

    if (minHourlyRate !== undefined) {
      conditions.push(gte(aircraft.hourlyRate, minHourlyRate));
    }

    if (maxHourlyRate !== undefined) {
      conditions.push(lte(aircraft.hourlyRate, maxHourlyRate));
    }

    if (location) {
      conditions.push(eq(aircraft.location, location));
    }

    const whereCondition = and(...conditions);

    const aircraftResult = await db
      .select()
      .from(aircraft)
      .where(whereCondition)
      .offset(offset)
      .limit(limit)
      .orderBy(asc(aircraft.hourlyRate));

    const totalResult = await db
      .select()
      .from(aircraft)
      .where(whereCondition);

    return {
      aircraft: aircraftResult,
      total: totalResult.length,
    };
  }

  /**
   * Update aircraft
   */
  static async update(id: string, data: Partial<Aircraft>): Promise<Aircraft | null> {
    const [updated] = await db
      .update(aircraft)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(aircraft.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Update aircraft availability
   */
  static async updateAvailability(
    id: string, 
    availability: Aircraft['availability']
  ): Promise<Aircraft | null> {
    const [updated] = await db
      .update(aircraft)
      .set({
        availability,
        updatedAt: new Date(),
      })
      .where(eq(aircraft.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Update aircraft location
   */
  static async updateLocation(id: string, location: string): Promise<Aircraft | null> {
    const [updated] = await db
      .update(aircraft)
      .set({
        location,
        updatedAt: new Date(),
      })
      .where(eq(aircraft.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Update Avinode sync timestamp
   */
  static async updateAvinodeSync(id: string): Promise<Aircraft | null> {
    const [updated] = await db
      .update(aircraft)
      .set({
        avinodeSyncAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aircraft.id, id))
      .returning();

    return updated || null;
  }

  /**
   * Get aircraft by operator
   */
  static async getByOperator(operatorName: string): Promise<Aircraft[]> {
    return await db
      .select()
      .from(aircraft)
      .where(and(
        eq(aircraft.operatorName, operatorName),
        isNull(aircraft.deletedAt)
      ))
      .orderBy(desc(aircraft.createdAt));
  }

  /**
   * Get aircraft requiring Avinode sync
   */
  static async getAircraftNeedingAvinodeSync(maxAge: Date): Promise<Aircraft[]> {
    return await db
      .select()
      .from(aircraft)
      .where(and(
        isNull(aircraft.deletedAt),
        // Add condition for aircraft that haven't been synced recently
        // This is a placeholder - actual implementation would check avinodeSyncAt
      ));
  }

  /**
   * Bulk create aircraft (for Avinode sync)
   */
  static async bulkCreate(aircraftData: NewAircraft[]): Promise<Aircraft[]> {
    const now = new Date();
    const aircraftWithTimestamps = aircraftData.map(data => ({
      ...data,
      createdAt: now,
      updatedAt: now,
    }));

    return await db
      .insert(aircraft)
      .values(aircraftWithTimestamps)
      .returning();
  }

  /**
   * Get aircraft with booking statistics
   */
  static async getWithBookingStats(id: string): Promise<(Aircraft & {
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    totalRevenue: number;
  }) | null> {
    const aircraftRecord = await this.getById(id);
    if (!aircraftRecord) return null;

    // Get booking statistics
    const allBookings = await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.aircraftId, id),
        isNull(bookings.deletedAt)
      ));

    const activeBookings = allBookings.filter(b => 
      ['REQUESTED', 'CONFIRMED', 'IN_PROGRESS'].includes(b.status)
    );

    const completedBookings = allBookings.filter(b => b.status === 'COMPLETED');

    const totalRevenue = completedBookings.reduce((sum, booking) => 
      sum + (booking.totalCost || 0), 0
    );

    return {
      ...aircraftRecord,
      totalBookings: allBookings.length,
      activeBookings: activeBookings.length,
      completedBookings: completedBookings.length,
      totalRevenue,
    };
  }

  /**
   * Get fleet utilization report
   */
  static async getFleetUtilization(
    startDate: Date,
    endDate: Date,
    operatorName?: string
  ): Promise<{
    aircraft: Aircraft;
    utilizationHours: number;
    revenue: number;
    bookingCount: number;
  }[]> {
    const whereConditions = [isNull(aircraft.deletedAt)];
    
    if (operatorName) {
      whereConditions.push(eq(aircraft.operatorName, operatorName));
    }

    const allAircraft = await db
      .select()
      .from(aircraft)
      .where(and(...whereConditions));

    const utilizationData = [];

    for (const aircraftRecord of allAircraft) {
      const aircraftBookings = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.aircraftId, aircraftRecord.id),
          between(bookings.departureTime, startDate, endDate),
          eq(bookings.status, 'COMPLETED'),
          isNull(bookings.deletedAt)
        ));

      const utilizationHours = aircraftBookings.reduce((sum, booking) => 
        sum + (booking.flightHours || 0), 0
      );

      const revenue = aircraftBookings.reduce((sum, booking) => 
        sum + (booking.totalCost || 0), 0
      );

      utilizationData.push({
        aircraft: aircraftRecord,
        utilizationHours,
        revenue,
        bookingCount: aircraftBookings.length,
      });
    }

    return utilizationData.sort((a, b) => b.utilizationHours - a.utilizationHours);
  }

  /**
   * Soft delete aircraft
   */
  static async softDelete(id: string): Promise<boolean> {
    const [updated] = await db
      .update(aircraft)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
        availability: 'UNAVAILABLE',
      })
      .where(eq(aircraft.id, id))
      .returning();

    return !!updated;
  }

  /**
   * Get aircraft by location with distance optimization
   */
  static async getNearbyAircraft(
    location: string,
    radius: number = 200, // nautical miles
    category?: Aircraft['category'],
    limit: number = 20
  ): Promise<Aircraft[]> {
    // This is a simplified version - in production you'd use PostGIS for proper geo queries
    const conditions = [
      eq(aircraft.availability, 'AVAILABLE'),
      isNull(aircraft.deletedAt)
    ];

    if (category) {
      conditions.push(eq(aircraft.category, category));
    }

    // For now, just get aircraft at the same location
    // In production, implement proper distance calculation
    conditions.push(eq(aircraft.location, location));

    return await db
      .select()
      .from(aircraft)
      .where(and(...conditions))
      .limit(limit)
      .orderBy(asc(aircraft.hourlyRate));
  }
}