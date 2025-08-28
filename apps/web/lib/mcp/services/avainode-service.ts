import { MCPClient } from '../client';
import {
  Aircraft,
  AircraftSearchParams,
  CharterRequestParams,
  PricingParams,
  BookingManagementParams,
  OperatorInfoParams,
  ServiceResponse
} from '../types';

/**
 * Service layer for Avainode MCP server integration
 */
export class AvainodeService {
  private readonly SERVER_NAME = 'avainode';

  constructor(private mcpClient: MCPClient) {}

  /**
   * Search for available aircraft
   */
  async searchAircraft(params: AircraftSearchParams): Promise<ServiceResponse<Aircraft[]>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'search-aircraft',
        params
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to search aircraft');
      }

      // Parse aircraft from response text
      const aircraft = this.parseAircraftFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: aircraft,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AVAINODE_SEARCH_FAILED',
          message: 'Failed to search aircraft',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Create charter request
   */
  async createCharterRequest(params: CharterRequestParams): Promise<ServiceResponse<{requestId: string}>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'create-charter-request',
        params
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to create charter request');
      }

      // Extract request ID from response
      const requestId = this.parseRequestIdFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: { requestId },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AVAINODE_CHARTER_FAILED',
          message: 'Failed to create charter request',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get pricing quote
   */
  async getPricing(params: PricingParams): Promise<ServiceResponse<{
    baseCost: number;
    fees: Record<string, number>;
    subtotal: number;
    taxes: number;
    total: number;
    quoteValidUntil: string;
  }>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'get-pricing',
        params
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to get pricing');
      }

      // Parse pricing data from response
      const pricingData = this.parsePricingFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: pricingData,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AVAINODE_PRICING_FAILED',
          message: 'Failed to get pricing',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Manage booking (confirm, cancel, get details, modify)
   */
  async manageBooking(params: BookingManagementParams): Promise<ServiceResponse<{
    bookingId: string;
    action: string;
    status: string;
    details?: Record<string, any>;
  }>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'manage-booking',
        params
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to manage booking');
      }

      // Parse booking response
      const bookingData = this.parseBookingResponseFromResponse(
        result.data.content[0].text, 
        params.action
      );

      return {
        success: true,
        data: {
          bookingId: params.bookingId,
          action: params.action,
          status: bookingData.status,
          details: bookingData.details
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AVAINODE_BOOKING_FAILED',
          message: 'Failed to manage booking',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get operator information
   */
  async getOperatorInfo(params: OperatorInfoParams): Promise<ServiceResponse<{
    id: string;
    name: string;
    certificate: string;
    established: number;
    headquarters: string;
    fleetSize: number;
    safetyRating: string;
    insurance: string;
    fleetDetails?: Record<string, any>;
    safetyRecords?: Record<string, any>;
  }>> {
    try {
      const result = await this.mcpClient.executeTool<{content: {type: string, text: string}[]}>(
        this.SERVER_NAME,
        'get-operator-info',
        params
      );

      if (!result.success || !result.data?.content) {
        throw new Error('Failed to get operator info');
      }

      // Parse operator information
      const operatorData = this.parseOperatorInfoFromResponse(result.data.content[0].text);

      return {
        success: true,
        data: operatorData,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AVAINODE_OPERATOR_FAILED',
          message: 'Failed to get operator info',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if Avainode service is available
   */
  async checkConnection(): Promise<ServiceResponse<{isConnected: boolean}>> {
    try {
      // Try to list tools as a connection test
      const session = this.mcpClient.getAllTools()[this.SERVER_NAME];
      const isConnected = Array.isArray(session) && session.length > 0;

      return {
        success: true,
        data: { isConnected },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'AVAINODE_CONNECTION_CHECK_FAILED',
          message: 'Failed to check Avainode connection',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get flight time estimate between airports
   */
  getFlightTimeEstimate(departureAirport: string, arrivalAirport: string): number {
    // Mock flight time calculation - would use actual distance calculation in production
    const routes: Record<string, number> = {
      "KJFK-KLAX": 5.5,
      "KLAX-KJFK": 5.0,
      "KTEB-KLAS": 5.0,
      "KLAS-KTEB": 4.5,
      "KJFK-EGLL": 7.5,
      "EGLL-KJFK": 8.0
    };
    
    const routeKey = `${departureAirport}-${arrivalAirport}`;
    return routes[routeKey] || 3.5; // Default flight time
  }

  // Private parsing methods
  private parseAircraftFromResponse(responseText: string): Aircraft[] {
    const aircraft: Aircraft[] = [];
    
    try {
      // Parse aircraft from formatted response
      const aircraftBlocks = responseText.split('\n\n').filter(block => 
        block.includes('Category:') && block.includes('Operator:')
      );

      aircraftBlocks.forEach(block => {
        const lines = block.split('\n');
        const titleLine = lines[0]?.match(/• (.+?) \((.+?)\)/);
        
        if (titleLine) {
          const model = titleLine[1].trim();
          const id = titleLine[2].trim();
          
          const categoryMatch = block.match(/Category: (.+)/);
          const operatorMatch = block.match(/Operator: (.+)/);
          const passengersMatch = block.match(/Max passengers: (\d+)/);
          const rateMatch = block.match(/Hourly rate: \$([0-9,]+)/);
          const statusMatch = block.match(/Status: (.+)/);

          aircraft.push({
            id,
            model,
            category: categoryMatch?.[1].trim() || 'Unknown',
            operator: operatorMatch?.[1].trim() || 'Unknown',
            maxPassengers: parseInt(passengersMatch?.[1] || '0'),
            hourlyRate: parseInt(rateMatch?.[1]?.replace(',', '') || '0'),
            availability: statusMatch?.[1].trim() || 'Unknown'
          });
        }
      });
    } catch (error) {
      console.error('Error parsing aircraft from response:', error);
    }

    return aircraft;
  }

  private parseRequestIdFromResponse(responseText: string): string {
    const match = responseText.match(/Request ID: (REQ\d+)/);
    return match ? match[1] : `REQ${Date.now().toString().slice(-6)}`;
  }

  private parsePricingFromResponse(responseText: string): any {
    const pricing = {
      baseCost: 0,
      fees: {} as Record<string, number>,
      subtotal: 0,
      taxes: 0,
      total: 0,
      quoteValidUntil: '5 days'
    };

    try {
      // Parse base cost
      const baseCostMatch = responseText.match(/Base cost: \$([0-9,]+)/);
      if (baseCostMatch) {
        pricing.baseCost = parseInt(baseCostMatch[1].replace(',', ''));
      }

      // Parse fees
      const fuelMatch = responseText.match(/Fuel surcharge: \$([0-9,]+)/);
      if (fuelMatch) pricing.fees.fuelSurcharge = parseInt(fuelMatch[1].replace(',', ''));

      const landingMatch = responseText.match(/Landing fees: \$([0-9,]+)/);
      if (landingMatch) pricing.fees.landingFees = parseInt(landingMatch[1].replace(',', ''));

      const handlingMatch = responseText.match(/Handling fees: \$([0-9,]+)/);
      if (handlingMatch) pricing.fees.handlingFees = parseInt(handlingMatch[1].replace(',', ''));

      const cateringMatch = responseText.match(/Catering: \$([0-9,]+)/);
      if (cateringMatch) pricing.fees.catering = parseInt(cateringMatch[1].replace(',', ''));

      const crewMatch = responseText.match(/Crew fees: \$([0-9,]+)/);
      if (crewMatch) pricing.fees.crewFees = parseInt(crewMatch[1].replace(',', ''));

      // Parse totals
      const subtotalMatch = responseText.match(/Subtotal: \$([0-9,]+)/);
      if (subtotalMatch) pricing.subtotal = parseInt(subtotalMatch[1].replace(',', ''));

      const taxesMatch = responseText.match(/Taxes \([^)]+\): \$([0-9,]+)/);
      if (taxesMatch) pricing.taxes = parseInt(taxesMatch[1].replace(',', ''));

      const totalMatch = responseText.match(/Total cost: \$([0-9,]+)/);
      if (totalMatch) pricing.total = parseInt(totalMatch[1].replace(',', ''));

      // Parse validity
      const validityMatch = responseText.match(/valid for (\d+ days)/);
      if (validityMatch) pricing.quoteValidUntil = validityMatch[1];

    } catch (error) {
      console.error('Error parsing pricing from response:', error);
    }

    return pricing;
  }

  private parseBookingResponseFromResponse(responseText: string, action: string): any {
    const result = {
      status: 'unknown',
      details: {} as Record<string, any>
    };

    try {
      switch (action) {
        case 'confirm':
          result.status = responseText.includes('confirmed') ? 'confirmed' : 'failed';
          const paymentMatch = responseText.match(/Payment method: (.+)/);
          if (paymentMatch) result.details.paymentMethod = paymentMatch[1].trim();
          break;

        case 'cancel':
          result.status = responseText.includes('cancelled') ? 'cancelled' : 'failed';
          const reasonMatch = responseText.match(/Reason: (.+)/);
          if (reasonMatch) result.details.cancellationReason = reasonMatch[1].trim();
          break;

        case 'get_details':
          result.status = 'retrieved';
          const statusMatch = responseText.match(/Status: (.+)/);
          if (statusMatch) result.details.currentStatus = statusMatch[1].trim();
          
          const aircraftMatch = responseText.match(/Aircraft: (.+)/);
          if (aircraftMatch) result.details.aircraft = aircraftMatch[1].trim();

          const routeMatch = responseText.match(/Route: (.+)/);
          if (routeMatch) result.details.route = routeMatch[1].trim();
          break;

        case 'modify':
          result.status = responseText.includes('submitted') ? 'pending' : 'failed';
          break;

        default:
          result.status = 'unknown';
      }
    } catch (error) {
      console.error('Error parsing booking response:', error);
    }

    return result;
  }

  private parseOperatorInfoFromResponse(responseText: string): any {
    const operatorInfo = {
      id: 'unknown',
      name: 'Unknown Operator',
      certificate: 'Unknown',
      established: 0,
      headquarters: 'Unknown',
      fleetSize: 0,
      safetyRating: 'Unknown',
      insurance: 'Unknown'
    };

    try {
      const nameMatch = responseText.match(/Operator information for (.+?):/);
      if (nameMatch) operatorInfo.name = nameMatch[1].trim();

      const idMatch = responseText.match(/ID: (.+)/);
      if (idMatch) operatorInfo.id = idMatch[1].trim();

      const certificateMatch = responseText.match(/Certificate: (.+)/);
      if (certificateMatch) operatorInfo.certificate = certificateMatch[1].trim();

      const establishedMatch = responseText.match(/Established: (\d+)/);
      if (establishedMatch) operatorInfo.established = parseInt(establishedMatch[1]);

      const headquartersMatch = responseText.match(/Headquarters: (.+)/);
      if (headquartersMatch) operatorInfo.headquarters = headquartersMatch[1].trim();

      const fleetSizeMatch = responseText.match(/Fleet size: (\d+)/);
      if (fleetSizeMatch) operatorInfo.fleetSize = parseInt(fleetSizeMatch[1]);

      const safetyRatingMatch = responseText.match(/Safety rating: (.+)/);
      if (safetyRatingMatch) operatorInfo.safetyRating = safetyRatingMatch[1].trim();

      const insuranceMatch = responseText.match(/Insurance: (.+)/);
      if (insuranceMatch) operatorInfo.insurance = insuranceMatch[1].trim();

    } catch (error) {
      console.error('Error parsing operator info from response:', error);
    }

    return operatorInfo;
  }
}