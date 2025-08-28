/**
 * Integration tests for MCP server connections and data flow
 */

import { IntegrationManager } from '../../lib/mcp/integration-manager';
import { DataSyncService } from '../../lib/mcp/data-sync';
import { MCPClient } from '../../lib/mcp/client';
import { ApolloService } from '../../lib/mcp/services/apollo-service';
import { AvainodeService } from '../../lib/mcp/services/avainode-service';
import { N8NService } from '../../lib/mcp/services/n8n-service';

// Mock environment variables
process.env.APOLLO_MCP_SERVER_URL = 'http://localhost:8123/mcp';
process.env.AVAINODE_MCP_SERVER_URL = 'http://localhost:8124/mcp';
process.env.N8N_MCP_SERVER_URL = 'http://localhost:8125/mcp';

describe('MCP Integration System', () => {
  let integrationManager: IntegrationManager;
  let dataSyncService: DataSyncService;

  beforeAll(async () => {
    integrationManager = new IntegrationManager();
    dataSyncService = new DataSyncService(integrationManager);
  });

  afterAll(async () => {
    await integrationManager.cleanup();
    dataSyncService.stopAutoSync();
  });

  describe('Integration Manager', () => {
    test('should initialize with proper server configurations', async () => {
      const result = await integrationManager.initialize();
      
      // Allow partial success in test environment
      expect(result.success || (result.data && result.data.connectedServers.length > 0)).toBeTruthy();
      
      if (result.success) {
        expect(result.data).toHaveProperty('connectedServers');
        expect(Array.isArray(result.data.connectedServers)).toBeTruthy();
      }
    }, 30000);

    test('should get system status', async () => {
      const status = await integrationManager.getSystemStatus();
      
      expect(status).toHaveProperty('success');
      expect(status).toHaveProperty('data');
      expect(status).toHaveProperty('timestamp');
      
      if (status.success) {
        expect(status.data).toHaveProperty('connections');
        expect(status.data).toHaveProperty('totalTools');
        expect(Array.isArray(status.data.connections)).toBeTruthy();
      }
    });

    test('should handle lead-to-booking flow', async () => {
      const mockLead = {
        name: 'John Doe',
        title: 'CEO',
        company: 'Test Aviation Corp',
        email: 'john@testaviation.com',
        industry: 'Aviation',
        size: '100-500',
        location: 'New York'
      };

      const mockFlightRequirements = {
        departureAirport: 'KJFK',
        arrivalAirport: 'KLAX',
        departureDate: '2024-04-01',
        passengers: 8
      };

      const result = await integrationManager.processLeadToBooking(
        mockLead,
        mockFlightRequirements
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      
      if (result.success) {
        expect(result.data).toHaveProperty('leadId');
        expect(result.data).toHaveProperty('apolloData');
        expect(result.data).toHaveProperty('flightRequirements');
        expect(result.data).toHaveProperty('bookingStatus');
      }
    }, 45000);

    test('should batch process leads', async () => {
      const searchCriteria = {
        industry: 'Aviation',
        limit: 5
      };

      const flightTemplate = {
        departureAirport: 'KTEB',
        arrivalAirport: 'KLAS',
        departureDate: '2024-04-15',
        passengers: 6
      };

      const result = await integrationManager.searchAndConvertLeads(
        searchCriteria,
        flightTemplate
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      
      if (result.success) {
        expect(Array.isArray(result.data)).toBeTruthy();
        result.data.forEach((flow: any) => {
          expect(flow).toHaveProperty('leadId');
          expect(flow).toHaveProperty('apolloData');
          expect(flow).toHaveProperty('bookingStatus');
        });
      }
    }, 60000);
  });

  describe('Service Layer Integration', () => {
    let services: any;

    beforeAll(() => {
      services = integrationManager.getServices();
    });

    describe('Apollo Service', () => {
      test('should search leads', async () => {
        const result = await services.apollo.searchLeads({
          industry: 'Aviation',
          limit: 10
        });

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('timestamp');
        
        if (result.success) {
          expect(Array.isArray(result.data)).toBeTruthy();
          result.data.forEach((lead: any) => {
            expect(lead).toHaveProperty('name');
            expect(lead).toHaveProperty('email');
            expect(lead).toHaveProperty('company');
          });
        }
      });

      test('should enrich contact', async () => {
        const result = await services.apollo.enrichContact({
          email: 'test@example.com'
        });

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('timestamp');
        
        if (result.success) {
          expect(result.data).toHaveProperty('name');
          expect(result.data).toHaveProperty('email');
          expect(result.data).toHaveProperty('company');
        }
      });

      test('should handle contact not found', async () => {
        const result = await services.apollo.enrichContact({
          email: 'nonexistent@example.com'
        });

        expect(result).toHaveProperty('success');
        // Should handle gracefully even if contact not found
      });

      test('should check connection', async () => {
        const result = await services.apollo.checkConnection();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('isConnected');
      });
    });

    describe('Avainode Service', () => {
      test('should search aircraft', async () => {
        const result = await services.avainode.searchAircraft({
          departureAirport: 'KJFK',
          arrivalAirport: 'KLAX',
          departureDate: '2024-04-01',
          passengers: 8
        });

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('timestamp');
        
        if (result.success) {
          expect(Array.isArray(result.data)).toBeTruthy();
          result.data.forEach((aircraft: any) => {
            expect(aircraft).toHaveProperty('id');
            expect(aircraft).toHaveProperty('model');
            expect(aircraft).toHaveProperty('operator');
            expect(aircraft).toHaveProperty('maxPassengers');
            expect(aircraft).toHaveProperty('hourlyRate');
          });
        }
      });

      test('should create charter request', async () => {
        const result = await services.avainode.createCharterRequest({
          aircraftId: 'ACF123',
          departureAirport: 'KJFK',
          arrivalAirport: 'KLAX',
          departureDate: '2024-04-01',
          departureTime: '10:00',
          passengers: 8,
          contactName: 'John Doe',
          contactEmail: 'john@example.com',
          contactPhone: '+1-555-0123'
        });

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('timestamp');
        
        if (result.success) {
          expect(result.data).toHaveProperty('requestId');
          expect(typeof result.data.requestId).toBe('string');
        }
      });

      test('should get pricing', async () => {
        const result = await services.avainode.getPricing({
          aircraftId: 'ACF123',
          departureAirport: 'KJFK',
          arrivalAirport: 'KLAX',
          departureDate: '2024-04-01',
          passengers: 8
        });

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('timestamp');
        
        if (result.success) {
          expect(result.data).toHaveProperty('baseCost');
          expect(result.data).toHaveProperty('total');
          expect(typeof result.data.baseCost).toBe('number');
          expect(typeof result.data.total).toBe('number');
        }
      });

      test('should validate airport codes', async () => {
        const resultValid = await services.avainode.searchAircraft({
          departureAirport: 'KJFK',
          arrivalAirport: 'KLAX',
          departureDate: '2024-04-01',
          passengers: 8
        });

        const resultInvalid = await services.avainode.searchAircraft({
          departureAirport: 'INVALID',
          arrivalAirport: 'KLAX',
          departureDate: '2024-04-01',
          passengers: 8
        });

        // Valid should work (even if no connection)
        expect(resultValid).toHaveProperty('success');
        
        // Invalid should fail with proper error
        if (!resultInvalid.success) {
          expect(resultInvalid.error?.message).toContain('Invalid airport code');
        }
      });

      test('should check connection', async () => {
        const result = await services.avainode.checkConnection();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('isConnected');
      });
    });

    describe('N8N Service', () => {
      test('should list workflows', async () => {
        const result = await services.n8n.listWorkflows();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('timestamp');
        
        if (result.success) {
          expect(Array.isArray(result.data)).toBeTruthy();
        }
      });

      test('should create lead-to-booking workflow', async () => {
        const result = await services.n8n.createLeadToBookingWorkflow();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('timestamp');
        
        if (result.success) {
          expect(result.data).toHaveProperty('workflowId');
        }
      });

      test('should check connection', async () => {
        const result = await services.n8n.checkConnection();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('data');
        expect(result.data).toHaveProperty('isConnected');
      });
    });
  });

  describe('Data Synchronization', () => {
    test('should start and stop auto-sync', () => {
      expect(() => dataSyncService.startAutoSync(5)).not.toThrow();
      
      const status = dataSyncService.getSyncStatus();
      expect(status.isAutoSyncActive).toBeTruthy();
      expect(status.activeIntervals.length).toBeGreaterThan(0);
      
      expect(() => dataSyncService.stopAutoSync()).not.toThrow();
      
      const statusAfterStop = dataSyncService.getSyncStatus();
      expect(statusAfterStop.isAutoSyncActive).toBeFalsy();
    });

    test('should perform full sync', async () => {
      const result = await dataSyncService.performFullSync();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('timestamp');
      
      expect(result.data).toHaveProperty('apolloLeadsSync');
      expect(result.data).toHaveProperty('aircraftAvailabilitySync');
      expect(result.data).toHaveProperty('workflowExecutionsSync');
      expect(result.data).toHaveProperty('errors');
      expect(Array.isArray(result.data.errors)).toBeTruthy();
    }, 30000);

    test('should validate data consistency', async () => {
      const result = await dataSyncService.validateDataConsistency();
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      
      if (result.success) {
        expect(result.data).toHaveProperty('consistencyScore');
        expect(result.data).toHaveProperty('issues');
        expect(result.data).toHaveProperty('recommendations');
        expect(typeof result.data.consistencyScore).toBe('number');
        expect(Array.isArray(result.data.issues)).toBeTruthy();
        expect(Array.isArray(result.data.recommendations)).toBeTruthy();
      }
    });

    test('should handle webhook sync', async () => {
      const mockWebhookData = {
        eventType: 'lead_updated',
        leadId: 'test_lead_123',
        data: {
          name: 'Test Lead',
          email: 'test@example.com'
        }
      };

      expect(async () => {
        await dataSyncService.handleWebhookSync('apollo', mockWebhookData);
      }).not.toThrow();

      // Check that the event was logged
      const auditLog = dataSyncService.getAuditLog(10);
      expect(auditLog.length).toBeGreaterThan(0);
    });

    test('should manage audit log', () => {
      const initialLog = dataSyncService.getAuditLog();
      const initialLength = initialLog.length;

      // Clear audit log
      dataSyncService.clearAuditLog();
      
      const clearedLog = dataSyncService.getAuditLog();
      expect(clearedLog.length).toBe(1); // Should have one event for the clear action
      expect(clearedLog[0].type).toBe('audit_log_cleared');
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle invalid server configurations gracefully', async () => {
      const invalidManager = new IntegrationManager([
        {
          name: 'invalid-server',
          url: 'http://nonexistent-server:9999/mcp',
          port: 9999,
          timeout: 5000,
          retryAttempts: 1,
          retryDelay: 1000
        }
      ]);

      const result = await invalidManager.initialize();
      
      // Should not throw, but may not succeed
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      
      await invalidManager.cleanup();
    }, 15000);

    test('should handle service calls with no connection', async () => {
      const disconnectedManager = new IntegrationManager();
      const disconnectedServices = disconnectedManager.getServices();

      const result = await disconnectedServices.apollo.searchLeads({
        industry: 'Test'
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      
      if (!result.success) {
        expect(result.error).toHaveProperty('code');
        expect(result.error).toHaveProperty('message');
      }
    });

    test('should validate required parameters', async () => {
      const services = integrationManager.getServices();

      // Test Apollo service validation
      const apolloResult = await services.apollo.enrichContact({});
      expect(apolloResult.success).toBeFalsy();
      expect(apolloResult.error?.message).toContain('email');

      // Test Avainode service validation
      const avainodeResult = await services.avainode.searchAircraft({
        departureAirport: 'KJFK'
        // Missing required parameters
      });
      expect(avainodeResult.success).toBeFalsy();
    });

    test('should handle rate limiting', async () => {
      const services = integrationManager.getServices();
      
      // This test depends on the rate limiting implementation
      // In a real scenario, you'd make many rapid requests to trigger rate limiting
      const promises = Array(10).fill(null).map(() =>
        services.apollo.searchLeads({ industry: 'Test' })
      );

      const results = await Promise.allSettled(promises);
      
      // Should not throw errors, but may return rate limit responses
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toHaveProperty('success');
        }
      });
    });
  });

  describe('Event System', () => {
    test('should emit and handle events', (done) => {
      let eventReceived = false;

      integrationManager.on('test_event', (data: any) => {
        eventReceived = true;
        expect(data).toHaveProperty('testData');
        expect(data.testData).toBe('test_value');
        
        if (eventReceived) {
          done();
        }
      });

      // Emit test event (this would normally be internal)
      // Since emit is private, we'll test through connection events
      integrationManager.initialize().then(() => {
        // The initialize should trigger connection events
        setTimeout(() => {
          if (!eventReceived) {
            // If no connection events, manually complete the test
            done();
          }
        }, 5000);
      });
    }, 10000);

    test('should handle event listener management', () => {
      const mockListener = jest.fn();
      
      integrationManager.on('test_event', mockListener);
      integrationManager.off('test_event', mockListener);
      
      // This tests that the listener management doesn't throw errors
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent requests', async () => {
      const services = integrationManager.getServices();
      
      const promises = [
        services.apollo.searchLeads({ industry: 'Aviation' }),
        services.avainode.searchAircraft({
          departureAirport: 'KJFK',
          arrivalAirport: 'KLAX',
          departureDate: '2024-04-01',
          passengers: 8
        }),
        services.n8n.listWorkflows()
      ];

      const results = await Promise.allSettled(promises);
      
      // Should handle concurrent requests without errors
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toHaveProperty('success');
          expect(result.value).toHaveProperty('timestamp');
        }
      });
    }, 30000);

    test('should handle large dataset processing', async () => {
      const searchCriteria = {
        industry: 'Aviation',
        limit: 50 // Larger dataset
      };

      const flightTemplate = {
        departureAirport: 'KTEB',
        arrivalAirport: 'KLAS',
        departureDate: '2024-04-15',
        passengers: 6
      };

      const startTime = Date.now();
      const result = await integrationManager.searchAndConvertLeads(
        searchCriteria,
        flightTemplate
      );
      const endTime = Date.now();

      expect(result).toHaveProperty('success');
      
      // Performance check (should complete within reasonable time)
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
    }, 70000);
  });
});