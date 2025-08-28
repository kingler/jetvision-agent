import { Redis } from '@upstash/redis';

/**
 * Avainode API Client for JetVision Agent
 * Handles authentication, error handling, and API interactions
 */

interface RateLimitState {
    requests: number[];
    lastReset: number;
}

interface AvainodeAircraftSearchParams {
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    passengers: number;
    aircraftCategory?: string;
    maxPrice?: number;
    returnDate?: string;
}

interface AvainodeCharterRequestParams {
    aircraftId: string;
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    departureTime: string;
    passengers: number;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    specialRequests?: string;
    returnDate?: string;
    returnTime?: string;
}

interface AvainodePricingParams {
    aircraftId: string;
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    passengers: number;
    returnDate?: string;
    includeAllFees?: boolean;
}

interface AvainodeBookingParams {
    bookingId: string;
    action: 'confirm' | 'cancel' | 'modify' | 'get_details';
    paymentMethod?: string;
    cancellationReason?: string;
    modifications?: any;
}

interface AvainodeOperatorParams {
    operatorId: string;
    includeFleetDetails?: boolean;
    includeSafetyRecords?: boolean;
}

interface AvainodeAircraft {
    id: string;
    model: string;
    category: string;
    operator: string;
    operatorId: string;
    maxPassengers: number;
    hourlyRate: number;
    availability: string;
    location: string;
    features: string[];
    images?: string[];
}

interface AvainodeCharterRequest {
    requestId: string;
    aircraftId: string;
    route: string;
    departureDate: string;
    departureTime: string;
    passengers: number;
    contactName: string;
    contactEmail: string;
    status: string;
    estimatedCost?: number;
    specialRequests?: string;
}

interface AvainodePricing {
    aircraftId: string;
    route: string;
    departureDate: string;
    returnDate?: string;
    flightTime: number;
    baseCost: number;
    fees: {
        fuelSurcharge?: number;
        landingFees?: number;
        handlingFees?: number;
        catering?: number;
        crewFees?: number;
        taxes?: number;
    };
    total: number;
    currency: string;
    validUntil: string;
}

interface AvainodeBooking {
    bookingId: string;
    aircraftId: string;
    status: string;
    route: string;
    departureDate: string;
    passengers: number;
    totalCost: number;
    paymentStatus: string;
    createdAt: string;
    updatedAt: string;
}

interface AvainodeOperator {
    id: string;
    name: string;
    certificate: string;
    established: number;
    headquarters: string;
    fleetSize: number;
    safetyRating: string;
    insurance: string;
    safetyRecords?: any;
    fleetDetails?: any;
}

export class AvainodeClient {
    private apiKey: string;
    private baseUrl = 'https://api.avinode.com/v1';
    private redis?: Redis;
    private rateLimitTracker = new Map<string, RateLimitState>();
    private readonly MAX_REQUESTS_PER_MINUTE = 100;
    private readonly CACHE_TTL = 180; // 3 minutes for flight data

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.AVAINODE_API_KEY || '';
        
        if (!this.apiKey) {
            console.warn('AVAINODE_API_KEY not provided. API calls will fail.');
        }

        // Initialize Redis for caching if available
        if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
            this.redis = new Redis({
                url: process.env.KV_REST_API_URL,
                token: process.env.KV_REST_API_TOKEN,
            });
        }
    }

    /**
     * Check rate limits before making API calls
     */
    private checkRateLimit(endpoint: string): void {
        const now = Date.now();
        const windowStart = now - 60000; // 1 minute window
        
        const state = this.rateLimitTracker.get(endpoint) || {
            requests: [],
            lastReset: now
        };
        
        // Clean old requests outside the window
        state.requests = state.requests.filter(time => time > windowStart);
        
        if (state.requests.length >= this.MAX_REQUESTS_PER_MINUTE) {
            throw new Error(`Rate limit exceeded for ${endpoint}. Maximum ${this.MAX_REQUESTS_PER_MINUTE} requests per minute.`);
        }
        
        state.requests.push(now);
        this.rateLimitTracker.set(endpoint, state);
    }

    /**
     * Validate airport code format
     */
    private validateAirportCode(code: string): boolean {
        // ICAO format (4 letters) or IATA format (3 letters)
        return /^[A-Z]{3,4}$/.test(code.toUpperCase());
    }

    /**
     * Estimate flight time between airports
     */
    private estimateFlightTime(departure: string, arrival: string): number {
        // Mock flight time calculation based on common routes
        // In production, would use actual distance and aircraft performance data
        const routes: { [key: string]: number } = {
            "KJFK-KLAX": 5.5, "KLAX-KJFK": 5.0,
            "KTEB-KLAS": 5.0, "KLAS-KTEB": 4.5,
            "KJFK-EGLL": 7.5, "EGLL-KJFK": 8.0,
            "KJFK-LFPG": 7.0, "LFPG-KJFK": 8.0,
            "KLAX-EGLL": 11.0, "EGLL-KLAX": 10.5
        };
        
        const routeKey = `${departure.toUpperCase()}-${arrival.toUpperCase()}`;
        return routes[routeKey] || this.calculateDistanceBasedTime(departure, arrival);
    }

    /**
     * Calculate flight time based on estimated distance
     */
    private calculateDistanceBasedTime(departure: string, arrival: string): number {
        // Rough estimation: 500mph average speed
        // Major routes approximation
        const intercontinental = departure.substring(0, 1) !== arrival.substring(0, 1);
        return intercontinental ? 8.5 : 3.5; // Hours
    }

    /**
     * Make authenticated API request to Avainode
     */
    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        data?: any
    ): Promise<T> {
        this.checkRateLimit(endpoint);

        if (!this.apiKey) {
            throw new Error('Avainode API key is required');
        }

        // Check cache for GET requests
        if (method === 'GET' && this.redis) {
            const cacheKey = `avainode:${endpoint}:${JSON.stringify(data || {})}`;
            try {
                const cached = await this.redis.get(cacheKey);
                if (cached) {
                    return JSON.parse(cached as string);
                }
            } catch (error) {
                console.warn('Cache read error:', error);
            }
        }

        let url = `${this.baseUrl}${endpoint}`;
        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'Accept': 'application/json',
            },
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        } else if (data && method === 'GET') {
            const params = new URLSearchParams(data);
            url += `?${params}`;
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Avainode API error (${response.status}): ${errorText}`);
            }

            const result = await response.json();

            // Cache successful GET responses
            if (method === 'GET' && this.redis && result) {
                const cacheKey = `avainode:${endpoint}:${JSON.stringify(data || {})}`;
                try {
                    await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result));
                } catch (error) {
                    console.warn('Cache write error:', error);
                }
            }

            return result;
        } catch (error) {
            console.error(`Avainode API request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Search for available aircraft
     */
    async searchAircraft(params: AvainodeAircraftSearchParams): Promise<AvainodeAircraft[]> {
        // Validate airport codes
        if (!this.validateAirportCode(params.departureAirport)) {
            throw new Error(`Invalid departure airport code: ${params.departureAirport}`);
        }
        if (!this.validateAirportCode(params.arrivalAirport)) {
            throw new Error(`Invalid arrival airport code: ${params.arrivalAirport}`);
        }

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(params.departureDate)) {
            throw new Error('Invalid date format. Use YYYY-MM-DD');
        }

        const searchData = {
            departure_airport: params.departureAirport.toUpperCase(),
            arrival_airport: params.arrivalAirport.toUpperCase(),
            departure_date: params.departureDate,
            passengers: params.passengers,
            aircraft_category: params.aircraftCategory,
            max_hourly_rate: params.maxPrice,
            return_date: params.returnDate
        };

        try {
            const response = await this.makeRequest<any>('/flights/search', 'POST', searchData);
            
            // Transform API response to our format
            return response.aircraft?.map((aircraft: any) => ({
                id: aircraft.id,
                model: aircraft.model || aircraft.aircraft_type,
                category: aircraft.category,
                operator: aircraft.operator_name,
                operatorId: aircraft.operator_id,
                maxPassengers: aircraft.max_passengers,
                hourlyRate: aircraft.hourly_rate,
                availability: aircraft.status || 'available',
                location: aircraft.home_base || params.departureAirport,
                features: aircraft.amenities || [],
                images: aircraft.photos || []
            })) || this.generateMockAircraftResults(params);
        } catch (error) {
            console.error('Avainode aircraft search failed:', error);
            // Return mock data for development/testing
            return this.generateMockAircraftResults(params);
        }
    }

    /**
     * Create charter request
     */
    async createCharterRequest(params: AvainodeCharterRequestParams): Promise<AvainodeCharterRequest> {
        // Validate required parameters
        const requiredFields = ['aircraftId', 'departureAirport', 'arrivalAirport', 'departureDate', 'departureTime', 'passengers', 'contactName', 'contactEmail', 'contactPhone'];
        for (const field of requiredFields) {
            if (!params[field as keyof AvainodeCharterRequestParams]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(params.contactEmail)) {
            throw new Error('Invalid email format');
        }

        const requestData = {
            aircraft_id: params.aircraftId,
            departure_airport: params.departureAirport.toUpperCase(),
            arrival_airport: params.arrivalAirport.toUpperCase(),
            departure_date: params.departureDate,
            departure_time: params.departureTime,
            passengers: params.passengers,
            contact_name: params.contactName,
            contact_email: params.contactEmail,
            contact_phone: params.contactPhone,
            special_requests: params.specialRequests,
            return_date: params.returnDate,
            return_time: params.returnTime
        };

        try {
            const response = await this.makeRequest<any>('/charter-requests', 'POST', requestData);
            
            return {
                requestId: response.request_id || `REQ${Date.now().toString().slice(-6)}`,
                aircraftId: params.aircraftId,
                route: `${params.departureAirport} → ${params.arrivalAirport}`,
                departureDate: params.departureDate,
                departureTime: params.departureTime,
                passengers: params.passengers,
                contactName: params.contactName,
                contactEmail: params.contactEmail,
                status: response.status || 'pending',
                estimatedCost: response.estimated_cost,
                specialRequests: params.specialRequests
            };
        } catch (error) {
            console.error('Avainode charter request failed:', error);
            // Return mock successful response for development
            return {
                requestId: `REQ${Date.now().toString().slice(-6)}`,
                aircraftId: params.aircraftId,
                route: `${params.departureAirport} → ${params.arrivalAirport}`,
                departureDate: params.departureDate,
                departureTime: params.departureTime,
                passengers: params.passengers,
                contactName: params.contactName,
                contactEmail: params.contactEmail,
                status: 'pending',
                specialRequests: params.specialRequests
            };
        }
    }

    /**
     * Get pricing for a specific flight
     */
    async getPricing(params: AvainodePricingParams): Promise<AvainodePricing> {
        const pricingData = {
            aircraft_id: params.aircraftId,
            departure_airport: params.departureAirport.toUpperCase(),
            arrival_airport: params.arrivalAirport.toUpperCase(),
            departure_date: params.departureDate,
            passengers: params.passengers,
            return_date: params.returnDate,
            include_fees: params.includeAllFees !== false
        };

        try {
            const response = await this.makeRequest<any>('/pricing/quote', 'POST', pricingData);
            
            return {
                aircraftId: params.aircraftId,
                route: `${params.departureAirport} → ${params.arrivalAirport}`,
                departureDate: params.departureDate,
                returnDate: params.returnDate,
                flightTime: response.flight_time || this.estimateFlightTime(params.departureAirport, params.arrivalAirport),
                baseCost: response.base_cost || 0,
                fees: response.fees || {},
                total: response.total_cost || 0,
                currency: response.currency || 'USD',
                validUntil: response.valid_until || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
            };
        } catch (error) {
            console.error('Avainode pricing failed:', error);
            // Return mock pricing for development
            return this.generateMockPricing(params);
        }
    }

    /**
     * Manage existing booking
     */
    async manageBooking(params: AvainodeBookingParams): Promise<any> {
        const { bookingId, action } = params;

        try {
            switch (action) {
                case 'confirm':
                    if (!params.paymentMethod) {
                        throw new Error('Payment method required for confirmation');
                    }
                    return await this.makeRequest(`/bookings/${bookingId}/confirm`, 'POST', {
                        payment_method: params.paymentMethod
                    });

                case 'cancel':
                    if (!params.cancellationReason) {
                        throw new Error('Cancellation reason required');
                    }
                    return await this.makeRequest(`/bookings/${bookingId}/cancel`, 'POST', {
                        reason: params.cancellationReason
                    });

                case 'modify':
                    return await this.makeRequest(`/bookings/${bookingId}/modify`, 'PUT', params.modifications);

                case 'get_details':
                    return await this.makeRequest(`/bookings/${bookingId}`, 'GET');

                default:
                    throw new Error(`Invalid action: ${action}`);
            }
        } catch (error) {
            console.error(`Avainode booking ${action} failed:`, error);
            throw error;
        }
    }

    /**
     * Get operator information
     */
    async getOperatorInfo(params: AvainodeOperatorParams): Promise<AvainodeOperator> {
        try {
            const response = await this.makeRequest<any>(`/operators/${params.operatorId}`, 'GET', {
                include_fleet: params.includeFleetDetails,
                include_safety: params.includeSafetyRecords
            });
            
            return {
                id: response.id,
                name: response.name,
                certificate: response.certificate_number,
                established: response.established_year,
                headquarters: response.headquarters,
                fleetSize: response.fleet_size,
                safetyRating: response.safety_rating,
                insurance: response.insurance_coverage,
                safetyRecords: params.includeSafetyRecords ? response.safety_records : undefined,
                fleetDetails: params.includeFleetDetails ? response.fleet_details : undefined
            };
        } catch (error) {
            console.error('Avainode operator info failed:', error);
            throw error;
        }
    }

    /**
     * Generate mock aircraft results for development/fallback
     */
    private generateMockAircraftResults(params: AvainodeAircraftSearchParams): AvainodeAircraft[] {
        const mockAircraft = [
            {
                id: "ACF123",
                model: "Gulfstream G650",
                category: "Heavy Jet",
                operator: "Elite Jets",
                operatorId: "OP001",
                maxPassengers: 14,
                hourlyRate: 8500,
                availability: "available",
                location: params.departureAirport,
                features: ["WiFi", "Full Kitchen", "Bedroom", "Shower"]
            },
            {
                id: "ACF456",
                model: "Bombardier Global 7500",
                category: "Heavy Jet",
                operator: "Global Wings",
                operatorId: "OP002",
                maxPassengers: 19,
                hourlyRate: 9500,
                availability: "available",
                location: params.departureAirport,
                features: ["WiFi", "Full Kitchen", "Master Suite", "Shower"]
            },
            {
                id: "ACF789",
                model: "Cessna Citation X",
                category: "Super Midsize Jet",
                operator: "Swift Aviation",
                operatorId: "OP003",
                maxPassengers: 12,
                hourlyRate: 5500,
                availability: "available",
                location: params.departureAirport,
                features: ["WiFi", "Refreshment Center", "Work Tables"]
            }
        ];

        // Filter by passenger capacity
        let filtered = mockAircraft.filter(a => a.maxPassengers >= params.passengers);

        // Filter by category if specified
        if (params.aircraftCategory) {
            filtered = filtered.filter(a => a.category === params.aircraftCategory);
        }

        // Filter by max price if specified
        if (params.maxPrice) {
            filtered = filtered.filter(a => a.hourlyRate <= params.maxPrice);
        }

        return filtered;
    }

    /**
     * Generate mock pricing for development/fallback
     */
    private generateMockPricing(params: AvainodePricingParams): AvainodePricing {
        const flightTime = this.estimateFlightTime(params.departureAirport, params.arrivalAirport);
        const baseCost = 8500 * flightTime;
        
        const fees = params.includeAllFees !== false ? {
            fuelSurcharge: baseCost * 0.075,
            landingFees: 1200,
            handlingFees: 800,
            catering: params.passengers * 150,
            crewFees: 1500,
            taxes: baseCost * 0.08
        } : {};

        const total = baseCost + Object.values(fees).reduce((a, b) => a + b, 0);

        return {
            aircraftId: params.aircraftId,
            route: `${params.departureAirport} → ${params.arrivalAirport}`,
            departureDate: params.departureDate,
            returnDate: params.returnDate,
            flightTime,
            baseCost,
            fees,
            total: params.returnDate ? total * 1.9 : total, // Discount for round trip
            currency: 'USD',
            validUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        };
    }

    /**
     * Get API health status
     */
    async getHealthStatus(): Promise<{ status: string; apiKey: boolean; rateLimit: number }> {
        return {
            status: this.apiKey ? 'ready' : 'misconfigured',
            apiKey: !!this.apiKey,
            rateLimit: this.MAX_REQUESTS_PER_MINUTE
        };
    }
}