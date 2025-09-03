/**
 * Direct Avinode Integration Client
 * 
 * Provides backup integration to Avinode API when N8N workflows are unavailable.
 * Handles aircraft search, availability, pricing, and booking requests.
 */

import { CircuitBreaker } from './circuit-breaker';
import { CacheManager } from './cache-manager';

export interface AvinodeConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  enableCaching?: boolean;
  rateLimitDelay?: number;
  environment?: 'sandbox' | 'production';
}

export interface AircraftSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  category?: 'light' | 'midsize' | 'heavy' | 'ultra-long-range';
  manufacturer?: string[];
  model?: string[];
  maxPrice?: number;
  includeEmptyLegs?: boolean;
  sortBy?: 'price' | 'departureTime' | 'flightTime';
}

export interface Aircraft {
  id: string;
  manufacturer: string;
  model: string;
  fullName: string;
  category: 'Light Jet' | 'Midsize Jet' | 'Heavy Jet' | 'Ultra Long Range';
  passengers: number;
  maxPassengers: number;
  range: number;
  speed: number;
  hourlyRate: string;
  totalCost?: string;
  availability: boolean;
  baseLocation: string;
  operatorId: string;
  operatorName: string;
  registrationNumber?: string;
  yearManufactured?: number;
  interiorConfig?: {
    seating: string;
    bedConfiguration?: string;
    wifi: boolean;
    entertainment: boolean;
  };
  performanceSpecs?: {
    maxAltitude: number;
    takeoffDistance: number;
    landingDistance: number;
    baggage: number;
  };
}

export interface FlightQuote {
  quoteId: string;
  aircraft: Aircraft;
  routing: {
    origin: string;
    destination: string;
    departureDateTime: string;
    arrivalDateTime: string;
    flightTime: string;
  };
  pricing: {
    baseCost: string;
    fuelSurcharge: string;
    taxes: string;
    fees: string;
    positioning?: string;
    overnight?: string;
    totalCost: string;
  };
  validUntil: string;
  bookingDeadline: string;
  terms: string[];
}

export interface FleetStatus {
  totalAircraft: number;
  availableNow: number;
  inMaintenance: number;
  onMission: number;
  byCategory: {
    light: number;
    midsize: number;
    heavy: number;
    ultraLongRange: number;
  };
  utilizationRate: number;
}

export interface AircraftSearchResult {
  aircraft: Aircraft[];
  total: number;
  searchParams: AircraftSearchParams;
  emptyLegs: Aircraft[];
  recommendations: string[];
}

export interface BookingRequest {
  quoteId: string;
  passengers: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    nationality?: string;
  }>;
  specialRequests?: string;
  paymentMethod: 'card' | 'wire' | 'net30';
  contactInfo: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
}

export class AvinodeDirectClient {
  private circuitBreaker: CircuitBreaker;
  private cache?: CacheManager;
  private lastRequestTime = 0;

  constructor(
    private config: AvinodeConfig,
    circuitBreaker?: CircuitBreaker,
    cache?: CacheManager
  ) {
    this.circuitBreaker = circuitBreaker || new CircuitBreaker('avinode-direct', {
      failureThreshold: 3,
      recoveryTimeout: 60000,
      requestTimeout: 10000,
      halfOpenMaxCalls: 2,
      successThreshold: 2,
      monitoringWindow: 120000
    });

    if (config.enableCaching && cache) {
      this.cache = cache;
    }
  }

  /**
   * Search for available aircraft
   */
  async searchAircraft(params: AircraftSearchParams): Promise<AircraftSearchResult> {
    const cacheKey = this.cache ?
      CacheManager.generateKey('avinode-search', params) : null;

    // Check cache first (short TTL due to rapidly changing availability)
    if (this.cache && cacheKey) {
      const cached = await this.cache.get<AircraftSearchResult>(cacheKey);
      if (cached) {
        console.log('⚡ Avinode search result from cache');
        return cached;
      }
    }

    return this.circuitBreaker.execute(async () => {
      await this.enforceRateLimit();

      const searchQuery = this.buildSearchQuery(params);
      const response = await this.makeRequest('/aircraft/search', {
        method: 'POST',
        body: JSON.stringify(searchQuery)
      });

      const result = this.parseSearchResponse(response, params);

      // Cache with short TTL due to availability changes
      if (this.cache && cacheKey) {
        this.cache.set(cacheKey, result, 'avinode-direct', {
          ttl: 3 * 60 * 1000, // 3 minutes
          metadata: { searchParams: params }
        });
      }

      return result;
    });
  }

  /**
   * Get detailed quote for specific aircraft
   */
  async getFlightQuote(aircraftId: string, searchParams: AircraftSearchParams): Promise<FlightQuote> {
    const cacheKey = this.cache ?
      CacheManager.generateKey('avinode-quote', { aircraftId, ...searchParams }) : null;

    if (this.cache && cacheKey) {
      const cached = await this.cache.get<FlightQuote>(cacheKey);
      if (cached) {
        console.log('⚡ Avinode quote from cache');
        return cached;
      }
    }

    return this.circuitBreaker.execute(async () => {
      await this.enforceRateLimit();

      const quoteRequest = {
        aircraftId,
        routing: {
          origin: searchParams.origin,
          destination: searchParams.destination,
          departureDate: searchParams.departureDate,
          returnDate: searchParams.returnDate
        },
        passengers: searchParams.passengers,
        includePositioning: true,
        includeOvernight: true
      };

      const response = await this.makeRequest('/quotes/request', {
        method: 'POST',
        body: JSON.stringify(quoteRequest)
      });

      const quote = this.parseQuoteResponse(response);

      if (this.cache && cacheKey) {
        this.cache.set(cacheKey, quote, 'avinode-direct', {
          ttl: 10 * 60 * 1000, // 10 minutes
          metadata: { aircraftId, searchParams }
        });
      }

      return quote;
    });
  }

  /**
   * Get fleet status overview
   */
  async getFleetStatus(operatorId?: string): Promise<FleetStatus> {
    const cacheKey = this.cache ?
      CacheManager.generateKey('avinode-fleet', { operatorId }) : null;

    if (this.cache && cacheKey) {
      const cached = await this.cache.get<FleetStatus>(cacheKey);
      if (cached) {
        console.log('⚡ Avinode fleet status from cache');
        return cached;
      }
    }

    return this.circuitBreaker.execute(async () => {
      await this.enforceRateLimit();

      const endpoint = operatorId ? `/fleet/${operatorId}/status` : '/fleet/status';
      const response = await this.makeRequest(endpoint);

      const fleetStatus = this.parseFleetStatusResponse(response);

      if (this.cache && cacheKey) {
        this.cache.set(cacheKey, fleetStatus, 'avinode-direct', {
          ttl: 5 * 60 * 1000, // 5 minutes
          metadata: { operatorId }
        });
      }

      return fleetStatus;
    });
  }

  /**
   * Search for empty leg opportunities
   */
  async searchEmptyLegs(params: {
    origin?: string;
    destination?: string;
    dateRange: { start: string; end: string };
    maxPrice?: number;
    category?: string;
  }): Promise<Aircraft[]> {
    const cacheKey = this.cache ?
      CacheManager.generateKey('avinode-empty-legs', params) : null;

    if (this.cache && cacheKey) {
      const cached = await this.cache.get<Aircraft[]>(cacheKey);
      if (cached) {
        console.log('⚡ Avinode empty legs from cache');
        return cached;
      }
    }

    return this.circuitBreaker.execute(async () => {
      await this.enforceRateLimit();

      const response = await this.makeRequest('/empty-legs/search', {
        method: 'POST',
        body: JSON.stringify(params)
      });

      const emptyLegs = this.parseEmptyLegsResponse(response);

      if (this.cache && cacheKey) {
        this.cache.set(cacheKey, emptyLegs, 'avinode-direct', {
          ttl: 60 * 60 * 1000, // 1 hour - empty legs change less frequently
          metadata: params
        });
      }

      return emptyLegs;
    });
  }

  /**
   * Submit booking request
   */
  async submitBookingRequest(bookingRequest: BookingRequest): Promise<{
    bookingId: string;
    status: 'pending' | 'confirmed' | 'declined';
    confirmationDeadline?: string;
    message: string;
  }> {
    // No caching for booking requests
    return this.circuitBreaker.execute(async () => {
      await this.enforceRateLimit();

      const response = await this.makeRequest('/bookings/request', {
        method: 'POST',
        body: JSON.stringify(bookingRequest)
      });

      return {
        bookingId: response.bookingId,
        status: response.status,
        confirmationDeadline: response.confirmationDeadline,
        message: response.message || 'Booking request submitted successfully'
      };
    });
  }

  /**
   * Build Avinode search query
   */
  private buildSearchQuery(params: AircraftSearchParams): any {
    const query: any = {
      routing: {
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departureDate
      },
      passengers: params.passengers,
      includeEmptyLegs: params.includeEmptyLegs ?? true
    };

    if (params.returnDate) {
      query.routing.returnDate = params.returnDate;
    }

    if (params.category) {
      query.aircraftCategory = params.category;
    }

    if (params.manufacturer) {
      query.manufacturers = params.manufacturer;
    }

    if (params.model) {
      query.models = params.model;
    }

    if (params.maxPrice) {
      query.maxHourlyRate = params.maxPrice;
    }

    if (params.sortBy) {
      query.sortBy = params.sortBy;
    }

    return query;
  }

  /**
   * Parse search response from Avinode API
   */
  private parseSearchResponse(response: any, params: AircraftSearchParams): AircraftSearchResult {
    const aircraftList = response.aircraft || [];
    const emptyLegsList = response.emptyLegs || [];

    const aircraft: Aircraft[] = aircraftList.map((ac: any) => ({
      id: ac.id,
      manufacturer: ac.manufacturer,
      model: ac.model,
      fullName: `${ac.manufacturer} ${ac.model}`,
      category: this.mapCategory(ac.category),
      passengers: ac.maxPassengers,
      maxPassengers: ac.maxPassengers,
      range: ac.range,
      speed: ac.cruiseSpeed,
      hourlyRate: this.formatCurrency(ac.hourlyRate),
      totalCost: ac.totalCost ? this.formatCurrency(ac.totalCost) : undefined,
      availability: ac.available,
      baseLocation: ac.baseLocation,
      operatorId: ac.operatorId,
      operatorName: ac.operatorName,
      registrationNumber: ac.registration,
      yearManufactured: ac.yearManufactured,
      interiorConfig: {
        seating: ac.seatingConfiguration,
        bedConfiguration: ac.bedConfiguration,
        wifi: ac.amenities?.wifi || false,
        entertainment: ac.amenities?.entertainment || false
      },
      performanceSpecs: {
        maxAltitude: ac.maxAltitude,
        takeoffDistance: ac.takeoffDistance,
        landingDistance: ac.landingDistance,
        baggage: ac.baggageCapacity
      }
    }));

    const emptyLegs: Aircraft[] = emptyLegsList.map((el: any) => ({
      ...this.parseAircraftData(el),
      hourlyRate: this.formatCurrency(el.discountedRate || el.hourlyRate)
    }));

    return {
      aircraft,
      total: response.totalCount || aircraft.length,
      searchParams: params,
      emptyLegs,
      recommendations: this.generateRecommendations(aircraft, params)
    };
  }

  /**
   * Parse quote response
   */
  private parseQuoteResponse(response: any): FlightQuote {
    return {
      quoteId: response.quoteId,
      aircraft: this.parseAircraftData(response.aircraft),
      routing: {
        origin: response.routing.origin,
        destination: response.routing.destination,
        departureDateTime: response.routing.departureDateTime,
        arrivalDateTime: response.routing.arrivalDateTime,
        flightTime: response.routing.flightTime
      },
      pricing: {
        baseCost: this.formatCurrency(response.pricing.baseCost),
        fuelSurcharge: this.formatCurrency(response.pricing.fuelSurcharge),
        taxes: this.formatCurrency(response.pricing.taxes),
        fees: this.formatCurrency(response.pricing.fees),
        positioning: response.pricing.positioning ? this.formatCurrency(response.pricing.positioning) : undefined,
        overnight: response.pricing.overnight ? this.formatCurrency(response.pricing.overnight) : undefined,
        totalCost: this.formatCurrency(response.pricing.totalCost)
      },
      validUntil: response.validUntil,
      bookingDeadline: response.bookingDeadline,
      terms: response.terms || []
    };
  }

  /**
   * Parse fleet status response
   */
  private parseFleetStatusResponse(response: any): FleetStatus {
    return {
      totalAircraft: response.totalAircraft,
      availableNow: response.availableNow,
      inMaintenance: response.inMaintenance,
      onMission: response.onMission,
      byCategory: {
        light: response.byCategory?.light || 0,
        midsize: response.byCategory?.midsize || 0,
        heavy: response.byCategory?.heavy || 0,
        ultraLongRange: response.byCategory?.ultraLongRange || 0
      },
      utilizationRate: response.utilizationRate || 0
    };
  }

  /**
   * Parse empty legs response
   */
  private parseEmptyLegsResponse(response: any): Aircraft[] {
    const emptyLegs = response.emptyLegs || [];
    return emptyLegs.map((el: any) => this.parseAircraftData(el));
  }

  /**
   * Parse aircraft data object
   */
  private parseAircraftData(ac: any): Aircraft {
    return {
      id: ac.id,
      manufacturer: ac.manufacturer,
      model: ac.model,
      fullName: `${ac.manufacturer} ${ac.model}`,
      category: this.mapCategory(ac.category),
      passengers: ac.maxPassengers,
      maxPassengers: ac.maxPassengers,
      range: ac.range,
      speed: ac.cruiseSpeed,
      hourlyRate: this.formatCurrency(ac.hourlyRate),
      totalCost: ac.totalCost ? this.formatCurrency(ac.totalCost) : undefined,
      availability: ac.available,
      baseLocation: ac.baseLocation,
      operatorId: ac.operatorId,
      operatorName: ac.operatorName,
      registrationNumber: ac.registration,
      yearManufactured: ac.yearManufactured,
      interiorConfig: {
        seating: ac.seatingConfiguration || `${ac.maxPassengers} passengers`,
        bedConfiguration: ac.bedConfiguration,
        wifi: ac.amenities?.wifi || false,
        entertainment: ac.amenities?.entertainment || false
      },
      performanceSpecs: {
        maxAltitude: ac.maxAltitude,
        takeoffDistance: ac.takeoffDistance,
        landingDistance: ac.landingDistance,
        baggage: ac.baggageCapacity
      }
    };
  }

  /**
   * Map API category to display category
   */
  private mapCategory(apiCategory: string): Aircraft['category'] {
    const categoryMap: Record<string, Aircraft['category']> = {
      'light': 'Light Jet',
      'midsize': 'Midsize Jet',
      'heavy': 'Heavy Jet',
      'ultra-long-range': 'Ultra Long Range'
    };
    
    return categoryMap[apiCategory] || 'Light Jet';
  }

  /**
   * Format currency values
   */
  private formatCurrency(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  /**
   * Generate recommendations based on search results
   */
  private generateRecommendations(aircraft: Aircraft[], params: AircraftSearchParams): string[] {
    const recommendations: string[] = [];

    if (aircraft.length === 0) {
      recommendations.push('No aircraft found for your criteria. Try expanding your search dates or destinations.');
      return recommendations;
    }

    // Price recommendations
    const prices = aircraft.map(ac => parseFloat(ac.hourlyRate.replace(/[$,]/g, ''))).sort((a, b) => a - b);
    const medianPrice = prices[Math.floor(prices.length / 2)];
    const cheapest = aircraft.find(ac => parseFloat(ac.hourlyRate.replace(/[$,]/g, '')) === prices[0]);
    
    if (cheapest) {
      recommendations.push(`Most economical option: ${cheapest.fullName} at ${cheapest.hourlyRate}/hour`);
    }

    // Category recommendations based on route
    const distance = this.estimateDistance(params.origin, params.destination);
    if (distance > 3000) {
      const heavyJets = aircraft.filter(ac => ac.category === 'Heavy Jet' || ac.category === 'Ultra Long Range');
      if (heavyJets.length > 0) {
        recommendations.push(`For this long-range flight, consider heavy jets for better comfort and fuel efficiency`);
      }
    } else if (distance < 1000) {
      const lightJets = aircraft.filter(ac => ac.category === 'Light Jet');
      if (lightJets.length > 0) {
        recommendations.push(`For this short flight, light jets offer excellent value and convenience`);
      }
    }

    // Empty legs recommendations
    const emptyLegs = aircraft.filter(ac => ac.totalCost && parseFloat(ac.totalCost.replace(/[$,]/g, '')) < medianPrice * 0.7);
    if (emptyLegs.length > 0) {
      recommendations.push(`${emptyLegs.length} empty leg opportunities available with significant savings`);
    }

    return recommendations;
  }

  /**
   * Estimate distance between airports (simplified)
   */
  private estimateDistance(origin: string, destination: string): number {
    // Simplified distance estimation - in production would use proper geo calculation
    const distances: Record<string, Record<string, number>> = {
      'JFK': { 'LAX': 2475, 'LHR': 3459, 'MIA': 1089 },
      'LAX': { 'JFK': 2475, 'LHR': 5440, 'MIA': 2342 },
      'LHR': { 'JFK': 3459, 'LAX': 5440, 'CDG': 214 }
    };
    
    return distances[origin]?.[destination] || 1500; // Default assumption
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = this.config.rateLimitDelay || 200; // 200ms between requests

    if (timeSinceLastRequest < minDelay) {
      const delayNeeded = minDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Make HTTP request to Avinode API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const baseUrl = this.config.baseUrl || 
      (this.config.environment === 'production' 
        ? 'https://api.avinode.com/v1' 
        : 'https://sandbox-api.avinode.com/v1');
    
    const url = `${baseUrl}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'User-Agent': 'JetVision-Agent/1.0'
    };

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    };

    console.log(`🔗 Avinode API request: ${endpoint}`);

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Avinode API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Avinode API response: ${endpoint}`);
    
    return data;
  }

  /**
   * Get client health status
   */
  getHealth() {
    return this.circuitBreaker.getHealth();
  }

  /**
   * Get client metrics
   */
  getMetrics() {
    return this.circuitBreaker.getMetrics();
  }
}

/**
 * Factory function to create Avinode client with proper dependencies
 */
export function createAvinodeDirectClient(config: AvinodeConfig): AvinodeDirectClient {
  const circuitBreaker = new CircuitBreaker('avinode-direct', {
    failureThreshold: 3,
    recoveryTimeout: 60000,
    requestTimeout: config.timeout || 10000,
    halfOpenMaxCalls: 2,
    successThreshold: 2,
    monitoringWindow: 120000
  });

  return new AvinodeDirectClient(config, circuitBreaker);
}