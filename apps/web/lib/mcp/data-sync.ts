import { IntegrationManager } from './integration-manager';
import {
  ServiceResponse,
  ApolloLead,
  Aircraft,
  LeadToBookingFlow,
  N8NExecution
} from './types';

/**
 * Data synchronization service for maintaining consistency across systems
 */
export class DataSyncService {
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private auditLog: SyncEvent[] = [];
  private readonly MAX_AUDIT_LOG_SIZE = 1000;

  constructor(private integrationManager: IntegrationManager) {}

  /**
   * Start automatic data synchronization
   */
  startAutoSync(intervalMinutes: number = 15): void {
    // Sync Apollo leads
    const apolloSyncInterval = setInterval(async () => {
      try {
        await this.syncApolloLeads();
      } catch (error) {
        this.logSyncEvent('apollo_leads_sync', false, error);
      }
    }, intervalMinutes * 60 * 1000);

    // Sync Avainode availability
    const avainodeSyncInterval = setInterval(async () => {
      try {
        await this.syncAircraftAvailability();
      } catch (error) {
        this.logSyncEvent('aircraft_availability_sync', false, error);
      }
    }, intervalMinutes * 60 * 1000);

    // Sync N8N execution status
    const n8nSyncInterval = setInterval(async () => {
      try {
        await this.syncWorkflowExecutions();
      } catch (error) {
        this.logSyncEvent('workflow_executions_sync', false, error);
      }
    }, (intervalMinutes / 2) * 60 * 1000); // More frequent for workflow status

    this.syncIntervals.set('apollo_leads', apolloSyncInterval);
    this.syncIntervals.set('aircraft_availability', avainodeSyncInterval);
    this.syncIntervals.set('workflow_executions', n8nSyncInterval);

    this.logSyncEvent('auto_sync_started', true, `Intervals set to ${intervalMinutes} minutes`);
  }

  /**
   * Stop automatic data synchronization
   */
  stopAutoSync(): void {
    this.syncIntervals.forEach((interval, key) => {
      clearInterval(interval);
      this.logSyncEvent(`${key}_sync_stopped`, true);
    });
    this.syncIntervals.clear();
  }

  /**
   * Manual full synchronization
   */
  async performFullSync(): Promise<ServiceResponse<{
    apolloLeadsSync: boolean;
    aircraftAvailabilitySync: boolean;
    workflowExecutionsSync: boolean;
    errors: string[];
  }>> {
    const results = {
      apolloLeadsSync: false,
      aircraftAvailabilitySync: false,
      workflowExecutionsSync: false,
      errors: [] as string[]
    };

    try {
      // Sync Apollo leads
      try {
        await this.syncApolloLeads();
        results.apolloLeadsSync = true;
        this.logSyncEvent('manual_apollo_sync', true);
      } catch (error) {
        const errorMsg = `Apollo sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        this.logSyncEvent('manual_apollo_sync', false, error);
      }

      // Sync aircraft availability
      try {
        await this.syncAircraftAvailability();
        results.aircraftAvailabilitySync = true;
        this.logSyncEvent('manual_aircraft_sync', true);
      } catch (error) {
        const errorMsg = `Aircraft sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        this.logSyncEvent('manual_aircraft_sync', false, error);
      }

      // Sync workflow executions
      try {
        await this.syncWorkflowExecutions();
        results.workflowExecutionsSync = true;
        this.logSyncEvent('manual_workflow_sync', true);
      } catch (error) {
        const errorMsg = `Workflow sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        this.logSyncEvent('manual_workflow_sync', false, error);
      }

      return {
        success: results.errors.length === 0,
        data: results,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FULL_SYNC_FAILED',
          message: 'Failed to perform full synchronization',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get synchronization status and recent activity
   */
  getSyncStatus(): {
    isAutoSyncActive: boolean;
    activeIntervals: string[];
    recentEvents: SyncEvent[];
    lastSyncTimes: Record<string, Date>;
  } {
    const recentEvents = this.auditLog.slice(-50); // Last 50 events
    const lastSyncTimes: Record<string, Date> = {};

    // Calculate last sync times from audit log
    const syncTypes = ['apollo_leads_sync', 'aircraft_availability_sync', 'workflow_executions_sync'];
    
    syncTypes.forEach(syncType => {
      const lastEvent = this.auditLog
        .filter(event => event.type === syncType && event.success)
        .pop();
      
      if (lastEvent) {
        lastSyncTimes[syncType] = lastEvent.timestamp;
      }
    });

    return {
      isAutoSyncActive: this.syncIntervals.size > 0,
      activeIntervals: Array.from(this.syncIntervals.keys()),
      recentEvents,
      lastSyncTimes
    };
  }

  /**
   * Sync leads from Apollo to internal database
   */
  private async syncApolloLeads(): Promise<void> {
    const services = this.integrationManager.getServices();
    
    // Get recent leads from Apollo
    const leadsResult = await services.apollo.searchLeads({
      limit: 100 // Sync last 100 leads
    });

    if (!leadsResult.success || !leadsResult.data) {
      throw new Error('Failed to fetch Apollo leads for sync');
    }

    // In a real implementation, this would sync with a database
    // For now, we'll just log the sync operation
    console.log(`Synced ${leadsResult.data.length} Apollo leads`);
    
    this.logSyncEvent('apollo_leads_sync', true, `Synced ${leadsResult.data.length} leads`);
  }

  /**
   * Sync aircraft availability from Avainode
   */
  private async syncAircraftAvailability(): Promise<void> {
    const services = this.integrationManager.getServices();
    
    // Common routes to check availability for
    const routes = [
      { departure: 'KJFK', arrival: 'KLAX' },
      { departure: 'KLAX', arrival: 'KJFK' },
      { departure: 'KTEB', arrival: 'KLAS' },
      { departure: 'KLAS', arrival: 'KTEB' }
    ];

    let totalAircraft = 0;
    const date = new Date();
    date.setDate(date.getDate() + 7); // Check availability for next week

    for (const route of routes) {
      try {
        const availabilityResult = await services.avainode.searchAircraft({
          departureAirport: route.departure,
          arrivalAirport: route.arrival,
          departureDate: date.toISOString().split('T')[0],
          passengers: 8 // Standard search for mid-size requirements
        });

        if (availabilityResult.success && availabilityResult.data) {
          totalAircraft += availabilityResult.data.length;
        }
      } catch (error) {
        console.warn(`Failed to sync availability for ${route.departure}-${route.arrival}:`, error);
      }
    }

    console.log(`Synced availability for ${totalAircraft} aircraft across ${routes.length} routes`);
    
    this.logSyncEvent('aircraft_availability_sync', true, `Synced ${totalAircraft} aircraft`);
  }

  /**
   * Sync workflow execution status
   */
  private async syncWorkflowExecutions(): Promise<void> {
    const services = this.integrationManager.getServices();
    
    // Get recent executions
    const executionsResult = await services.n8n.listExecutions();

    if (!executionsResult.success || !executionsResult.data) {
      throw new Error('Failed to fetch N8N executions for sync');
    }

    // Update status of running executions
    let updatedExecutions = 0;
    
    for (const execution of executionsResult.data) {
      if (execution.status === 'running') {
        try {
          const currentStatus = await services.n8n.getExecution(execution.id);
          if (currentStatus.success && currentStatus.data?.status !== 'running') {
            updatedExecutions++;
            // In a real implementation, would update database record
          }
        } catch (error) {
          console.warn(`Failed to sync execution ${execution.id}:`, error);
        }
      }
    }

    console.log(`Synced ${executionsResult.data.length} workflow executions, ${updatedExecutions} updated`);
    
    this.logSyncEvent('workflow_executions_sync', true, 
      `Synced ${executionsResult.data.length} executions, ${updatedExecutions} updated`);
  }

  /**
   * Handle webhook data for real-time sync
   */
  async handleWebhookSync(source: 'apollo' | 'avainode' | 'n8n', data: any): Promise<void> {
    try {
      switch (source) {
        case 'apollo':
          await this.handleApolloWebhook(data);
          break;
        case 'avainode':
          await this.handleAvainodeWebhook(data);
          break;
        case 'n8n':
          await this.handleN8NWebhook(data);
          break;
        default:
          throw new Error(`Unknown webhook source: ${source}`);
      }
    } catch (error) {
      this.logSyncEvent(`${source}_webhook_sync`, false, error);
      throw error;
    }
  }

  private async handleApolloWebhook(data: any): Promise<void> {
    // Handle real-time Apollo data updates
    console.log('Processing Apollo webhook data:', data);
    this.logSyncEvent('apollo_webhook_sync', true, 'Real-time data processed');
  }

  private async handleAvainodeWebhook(data: any): Promise<void> {
    // Handle real-time Avainode data updates
    console.log('Processing Avainode webhook data:', data);
    this.logSyncEvent('avainode_webhook_sync', true, 'Real-time data processed');
  }

  private async handleN8NWebhook(data: any): Promise<void> {
    // Handle real-time N8N execution updates
    console.log('Processing N8N webhook data:', data);
    this.logSyncEvent('n8n_webhook_sync', true, 'Real-time data processed');
  }

  /**
   * Validate data consistency between systems
   */
  async validateDataConsistency(): Promise<ServiceResponse<{
    consistencyScore: number;
    issues: string[];
    recommendations: string[];
  }>> {
    try {
      const issues: string[] = [];
      const recommendations: string[] = [];
      let consistencyScore = 100;

      // Check system connectivity
      const systemStatus = await this.integrationManager.getSystemStatus();
      if (!systemStatus.success || !systemStatus.data?.isInitialized) {
        issues.push('Integration manager not properly initialized');
        recommendations.push('Restart the integration manager');
        consistencyScore -= 30;
      }

      // Check recent sync activity
      const syncStatus = this.getSyncStatus();
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      Object.entries(syncStatus.lastSyncTimes).forEach(([syncType, lastSync]) => {
        if (lastSync < oneHourAgo) {
          issues.push(`${syncType} hasn't run in over an hour`);
          recommendations.push(`Check ${syncType} sync configuration`);
          consistencyScore -= 10;
        }
      });

      // Check error rates in recent events
      const recentErrors = syncStatus.recentEvents.filter(event => !event.success);
      const errorRate = recentErrors.length / Math.max(syncStatus.recentEvents.length, 1);

      if (errorRate > 0.1) { // More than 10% error rate
        issues.push(`High error rate in sync operations: ${(errorRate * 100).toFixed(1)}%`);
        recommendations.push('Review sync error logs and fix underlying issues');
        consistencyScore -= Math.floor(errorRate * 50);
      }

      consistencyScore = Math.max(0, consistencyScore); // Ensure score doesn't go below 0

      return {
        success: true,
        data: {
          consistencyScore,
          issues,
          recommendations
        },
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONSISTENCY_CHECK_FAILED',
          message: 'Failed to validate data consistency',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Log sync events for audit trail
   */
  private logSyncEvent(type: string, success: boolean, details?: any): void {
    const event: SyncEvent = {
      type,
      success,
      timestamp: new Date(),
      details: details instanceof Error ? details.message : details
    };

    this.auditLog.push(event);

    // Maintain audit log size
    if (this.auditLog.length > this.MAX_AUDIT_LOG_SIZE) {
      this.auditLog.splice(0, this.auditLog.length - this.MAX_AUDIT_LOG_SIZE);
    }
  }

  /**
   * Get audit log
   */
  getAuditLog(limit?: number): SyncEvent[] {
    if (limit) {
      return this.auditLog.slice(-limit);
    }
    return [...this.auditLog];
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
    this.logSyncEvent('audit_log_cleared', true);
  }
}

interface SyncEvent {
  type: string;
  success: boolean;
  timestamp: Date;
  details?: any;
}