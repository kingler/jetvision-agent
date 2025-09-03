import { test, expect } from '@playwright/test';
import { AuthHelper, quickLogin } from '../utils/auth-helpers';
import { N8NHelper, waitForN8NResponse, verifyChatResponse } from '../utils/n8n-helpers';
import { AviationAssertions } from '../utils/assertions';
import { avinodeQueries } from '../fixtures/aviation-queries';

test.describe('Avinode Integration Tests', () => {
  let authHelper: AuthHelper;
  let n8nHelper: N8NHelper;
  let aviationAssertions: AviationAssertions;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    n8nHelper = new N8NHelper(page);
    aviationAssertions = new AviationAssertions(page);

    // Setup N8N mocks with Avinode responses
    await n8nHelper.setupMocks();
    
    // Login as charter ops user (has Avinode permissions)
    await quickLogin(page, 'user');
    
    // Navigate to chat interface
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Aircraft Search and Availability', () => {
    test('should search for Gulfstream G650 availability NYC to London', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const query = avinodeQueries.find(q => q.id === 'avinode-g650-nyc-london');
      
      if (!query) throw new Error('Query not found');

      const startTime = Date.now();
      
      // Send aircraft search query
      await chatInput.fill(query.query);
      await chatInput.press('Enter');

      // Wait for Avinode workflow to complete
      await waitForN8NResponse(page, query.timeout);

      // Verify response contains aircraft data
      await verifyChatResponse(page, query.expectedResponsePattern!);

      // Check response time
      await aviationAssertions.assertResponseTime(startTime, query.timeout!, 'Avinode aircraft search');

      // Verify aircraft results structure
      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const aircraftElements = responseMessage.locator('[data-testid="aircraft-result"], .aircraft-item, [class*="aircraft"]');
      
      if (await aircraftElements.count() > 0) {
        await aviationAssertions.assertValidAircraftResults(aircraftElements.first());
      }
    });

    test('should find Citation X aircraft within radius of Dallas', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Find available Citation X aircraft within 500nm of Dallas');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 20000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify aircraft-specific results
      expect(responseText?.toLowerCase()).toMatch(/(citation|x|cessna)/);
      expect(responseText?.toLowerCase()).toMatch(/(dallas|dfw|texas)/);
      expect(responseText?.toLowerCase()).toMatch(/(500nm|500 nm|nautical miles)/);

      // Check for proper aviation formatting
      await aviationAssertions.assertAviationDataFormat(responseMessage);
    });

    test('should search by multiple aircraft types', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Find Gulfstream G650, G550, or Challenger 650 for next Tuesday departure from Miami');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 25000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify multi-aircraft search
      const aircraftTypes = /(gulfstream|g650|g550|challenger)/i;
      expect(responseText).toMatch(aircraftTypes);
      expect(responseText?.toLowerCase()).toMatch(/(miami|tuesday|departure)/);
      
      // Should show multiple options if available
      const aircraftResults = responseMessage.locator('[data-testid="aircraft-result"], .aircraft-item');
      if (await aircraftResults.count() > 1) {
        console.log(`✅ Found ${await aircraftResults.count()} aircraft options`);
      }
    });

    test('should filter by passenger capacity and range', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Find aircraft for 12 passengers with 4000+ nautical mile range');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 18000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify capacity and range filtering
      expect(responseText).toMatch(/12.*passenger/i);
      expect(responseText).toMatch(/4000.*nautical.*mile|4000.*nm|range/i);
      
      // Check for aircraft specifications
      const specsSection = responseMessage.locator('[data-testid="aircraft-specs"], .specifications');
      if (await specsSection.isVisible()) {
        const specsText = await specsSection.textContent();
        expect(specsText).toMatch(/\d+.*passengers/i);
        expect(specsText).toMatch(/\d+.*nm|nautical miles|range/i);
      }
    });

    test('should show real-time availability status', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Show real-time availability for all Falcon 7X aircraft in Europe');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 22000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify availability information
      expect(responseText?.toLowerCase()).toMatch(/(falcon|7x)/);
      expect(responseText?.toLowerCase()).toMatch(/(europe|european)/);
      expect(responseText?.toLowerCase()).toMatch(/(available|availability|status)/);
      
      // Look for availability indicators
      const availabilityElements = responseMessage.locator('[data-testid="availability-status"], .availability');
      if (await availabilityElements.count() > 0) {
        const statusText = await availabilityElements.first().textContent();
        expect(statusText?.toLowerCase()).toMatch(/(available|unavailable|maintenance|booked)/);
      }
    });
  });

  test.describe('Fleet Management and Utilization', () => {
    test('should show fleet utilization metrics', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const query = avinodeQueries.find(q => q.id === 'avinode-fleet-utilization');
      
      if (!query) throw new Error('Query not found');

      await chatInput.fill(query.query);
      await chatInput.press('Enter');

      await waitForN8NResponse(page, query.timeout);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify utilization metrics
      expect(responseText?.toLowerCase()).toMatch(/(utilization|fleet|metrics|hours)/);
      
      // Look for specific metrics
      const metricsPattern = /\d+(\.\d+)?%|\d+\s*hours|\d+\s*flights/i;
      expect(responseText).toMatch(metricsPattern);
      
      // Check for fleet statistics
      const statsSection = responseMessage.locator('[data-testid="fleet-stats"], .utilization-metrics');
      if (await statsSection.isVisible()) {
        const statsText = await statsSection.textContent();
        expect(statsText).toMatch(/\d+/); // Should contain numerical data
      }
    });

    test('should analyze fleet performance by aircraft type', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Analyze fleet performance breakdown by aircraft model for Q3 2024');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 28000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify performance analysis
      expect(responseText?.toLowerCase()).toMatch(/(performance|breakdown|aircraft model)/);
      expect(responseText?.toLowerCase()).toMatch(/(q3|2024|quarter)/);
      
      // Should show different aircraft types
      const aircraftModels = /(gulfstream|citation|challenger|falcon|bombardier|boeing)/i;
      expect(responseText).toMatch(aircraftModels);
      
      // Look for performance metrics
      const performanceElements = responseMessage.locator('[data-testid="performance-metric"], .performance-data');
      if (await performanceElements.count() > 0) {
        console.log(`✅ Found ${await performanceElements.count()} performance metrics`);
      }
    });

    test('should track maintenance schedules and status', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Show upcoming maintenance schedules and current aircraft status');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 20000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify maintenance information
      expect(responseText?.toLowerCase()).toMatch(/(maintenance|schedule|status|upcoming)/);
      
      // Look for maintenance details
      const maintenanceInfo = responseMessage.locator('[data-testid="maintenance-info"], .maintenance-schedule');
      if (await maintenanceInfo.isVisible()) {
        const maintenanceText = await maintenanceInfo.textContent();
        expect(maintenanceText?.toLowerCase()).toMatch(/(inspection|service|due|scheduled)/);
      }
    });
  });

  test.describe('Pricing and Quoting', () => {
    test('should generate pricing quote for charter flight', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const query = avinodeQueries.find(q => q.id === 'avinode-charter-pricing');
      
      if (!query) throw new Error('Query not found');

      await chatInput.fill(query.query);
      await chatInput.press('Enter');

      await waitForN8NResponse(page, query.timeout);

      // Verify pricing response
      await verifyChatResponse(page, query.expectedResponsePattern!);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      
      // Check for pricing information
      const pricingElements = responseMessage.locator('[data-testid="pricing-info"], .price-quote, [class*="pricing"]');
      
      if (await pricingElements.count() > 0) {
        await aviationAssertions.assertValidPricing(pricingElements.first());
      }

      // Verify route information
      const routeElements = responseMessage.locator('[data-testid="route-info"], .flight-route');
      if (await routeElements.count() > 0) {
        await aviationAssertions.assertValidFlightRoute(routeElements.first());
      }
    });

    test('should provide detailed cost breakdown', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Generate detailed cost breakdown for round-trip charter from LAX to JFK using G650');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 25000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify cost breakdown
      expect(responseText?.toLowerCase()).toMatch(/(cost|breakdown|round.trip|lax|jfk|g650)/);
      
      // Should include various cost components
      const costComponents = /(flight.*cost|fuel|crew|handling|overnight|catering|fees)/i;
      expect(responseText).toMatch(costComponents);
      
      // Check for pricing structure
      const priceElements = responseMessage.locator('[data-testid="cost-item"], .cost-breakdown-item');
      if (await priceElements.count() > 0) {
        console.log(`✅ Found ${await priceElements.count()} cost breakdown items`);
      }
    });

    test('should compare pricing across multiple operators', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Compare pricing from 3 different operators for Citation X charter Boston to Chicago');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 30000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify pricing comparison
      expect(responseText?.toLowerCase()).toMatch(/(compare|pricing|operators|citation|boston|chicago)/);
      
      // Should show multiple operators
      const operatorElements = responseMessage.locator('[data-testid="operator-quote"], .operator-pricing');
      if (await operatorElements.count() > 1) {
        console.log(`✅ Found ${await operatorElements.count()} operator quotes`);
      }
      
      // Should include price differences
      expect(responseText).toMatch(/\$[\d,]+/); // Dollar amounts
    });

    test('should handle complex routing with stops', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Price multi-leg trip: NYC > Miami > Nassau > NYC using mid-size jet');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 35000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify complex routing
      expect(responseText?.toLowerCase()).toMatch(/(multi.leg|nyc|miami|nassau|mid.size)/);
      
      // Should handle multiple legs
      const legElements = responseMessage.locator('[data-testid="flight-leg"], .route-segment');
      if (await legElements.count() > 0) {
        console.log(`✅ Found ${await legElements.count()} flight legs`);
      }
    });
  });

  test.describe('Booking and Operations', () => {
    test('should show booking history and revenue', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const query = avinodeQueries.find(q => q.id === 'avinode-booking-history');
      
      if (!query) throw new Error('Query not found');

      await chatInput.fill(query.query);
      await chatInput.press('Enter');

      await waitForN8NResponse(page, query.timeout);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify booking history
      expect(responseText?.toLowerCase()).toMatch(/(booking|history|revenue|q3|2024)/);
      
      // Should show revenue information
      expect(responseText).toMatch(/\$[\d,]+/); // Revenue amounts
      
      // Look for booking statistics
      const statsElements = responseMessage.locator('[data-testid="booking-stats"], .revenue-metrics');
      if (await statsElements.count() > 0) {
        const statsText = await statsElements.first().textContent();
        expect(statsText).toMatch(/\d+/); // Should contain numbers
      }
    });

    test('should initiate charter booking process', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Start charter booking for N123AB - Gulfstream G550, client departure tomorrow 2PM from KTEB');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 25000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify booking initiation
      expect(responseText?.toLowerCase()).toMatch(/(booking|charter|n123ab|g550|kteb)/);
      expect(responseText?.toLowerCase()).toMatch(/(tomorrow|2pm|departure)/);
      
      // Should provide booking confirmation or next steps
      expect(responseText?.toLowerCase()).toMatch(/(confirmation|reference|booking.id|next.step)/);
    });

    test('should manage crew scheduling and assignments', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Check crew availability and assign for flight N456GS departure Friday 8AM');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 20000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify crew management
      expect(responseText?.toLowerCase()).toMatch(/(crew|availability|assign|n456gs|friday|8am)/);
      
      // Should show crew information
      const crewElements = responseMessage.locator('[data-testid="crew-info"], .crew-assignment');
      if (await crewElements.count() > 0) {
        const crewText = await crewElements.first().textContent();
        expect(crewText?.toLowerCase()).toMatch(/(captain|pilot|crew|assigned)/);
      }
    });

    test('should handle flight plan filing and approvals', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('File flight plan for KBOS to KIAH, departure 1400Z, G650 performance');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 18000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify flight plan filing
      expect(responseText?.toLowerCase()).toMatch(/(flight.plan|kbos|kiah|1400z|g650)/);
      
      // Should provide filing confirmation
      expect(responseText?.toLowerCase()).toMatch(/(filed|submitted|approved|reference)/);
    });
  });

  test.describe('Market Intelligence and Analytics', () => {
    test('should analyze market trends and pricing', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Analyze charter market trends for super-midsize jets in North America');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 30000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify market analysis
      expect(responseText?.toLowerCase()).toMatch(/(market|trends|super.midsize|north.america)/);
      
      // Should include analytical insights
      expect(responseText?.toLowerCase()).toMatch(/(trend|analysis|increase|decrease|demand)/);
      
      // Look for market data
      const marketData = responseMessage.locator('[data-testid="market-data"], .trend-analysis');
      if (await marketData.count() > 0) {
        console.log(`✅ Found ${await marketData.count()} market analysis sections`);
      }
    });

    test('should compare operator performance metrics', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Compare top 5 charter operators by reliability and customer satisfaction');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 25000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify operator comparison
      expect(responseText?.toLowerCase()).toMatch(/(operator|reliability|satisfaction|compare|top)/);
      
      // Should show performance metrics
      const performanceMetrics = /(rating|score|\d+%|reliability|satisfaction)/i;
      expect(responseText).toMatch(performanceMetrics);
    });

    test('should provide route demand analysis', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Show route demand analysis for East Coast to West Coast corridors');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 22000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify route analysis
      expect(responseText?.toLowerCase()).toMatch(/(route|demand|east.coast|west.coast|corridor)/);
      
      // Should include demand statistics
      expect(responseText?.toLowerCase()).toMatch(/(demand|frequency|popular|volume)/);
    });
  });

  test.describe('Integration Edge Cases', () => {
    test('should handle international flight requirements', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Find aircraft for international flight JFK to EGLL with customs and immigration requirements');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 35000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify international requirements
      expect(responseText?.toLowerCase()).toMatch(/(international|jfk|egll|customs|immigration)/);
      
      // Should address international considerations
      expect(responseText?.toLowerCase()).toMatch(/(permit|clearance|documentation|requirements)/);
    });

    test('should handle weather-related disruptions', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Check aircraft availability considering current weather patterns and potential delays');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 20000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify weather considerations
      expect(responseText?.toLowerCase()).toMatch(/(weather|patterns|delay|availability)/);
      
      // Should provide weather-aware recommendations
      expect(responseText?.toLowerCase()).toMatch(/(alternative|recommend|consider|conditions)/);
    });

    test('should validate aircraft certification requirements', async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      await chatInput.fill('Verify aircraft certifications for Part 135 charter operations');
      await chatInput.press('Enter');

      await waitForN8NResponse(page, 18000);

      const responseMessage = page.locator('[data-testid="chat-message"]').last();
      const responseText = await responseMessage.textContent();
      
      // Verify certification validation
      expect(responseText?.toLowerCase()).toMatch(/(certification|part.135|charter|operation)/);
      
      // Should address regulatory compliance
      expect(responseText?.toLowerCase()).toMatch(/(compliant|certified|approved|valid)/);
    });
  });
});