import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationManager } from '../../../../lib/mcp/integration-manager';
import { DataSyncService } from '../../../../lib/mcp/data-sync';

// Global data sync service instance
let dataSyncService: DataSyncService | null = null;

function getDataSyncService(): DataSyncService {
  if (!dataSyncService) {
    const integrationManager = getIntegrationManager();
    dataSyncService = new DataSyncService(integrationManager);
  }
  return dataSyncService;
}

/**
 * API endpoint for data synchronization management
 */

/**
 * Get sync status and recent activity
 */
export async function GET(request: NextRequest) {
  try {
    const syncService = getDataSyncService();
    const { searchParams } = request.nextUrl;
    
    const action = searchParams.get('action');
    
    if (action === 'status') {
      const status = syncService.getSyncStatus();
      
      return NextResponse.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    }
    
    else if (action === 'audit') {
      const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
      const auditLog = syncService.getAuditLog(limit);
      
      return NextResponse.json({
        success: true,
        data: { auditLog },
        timestamp: new Date().toISOString()
      });
    }
    
    else if (action === 'validate') {
      const validationResult = await syncService.validateDataConsistency();
      
      return NextResponse.json({
        success: validationResult.success,
        data: validationResult.data,
        error: validationResult.error,
        timestamp: validationResult.timestamp.toISOString()
      }, {
        status: validationResult.success ? 200 : 500
      });
    }
    
    else {
      // Default to returning sync status
      const status = syncService.getSyncStatus();
      
      return NextResponse.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error getting sync information:', error);
    return NextResponse.json({
      error: 'Failed to get sync information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Control synchronization operations
 */
export async function POST(request: NextRequest) {
  try {
    const syncService = getDataSyncService();
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      const intervalMinutes = body.intervalMinutes || 15;
      syncService.startAutoSync(intervalMinutes);
      
      return NextResponse.json({
        success: true,
        message: `Auto-sync started with ${intervalMinutes} minute intervals`,
        timestamp: new Date().toISOString()
      });
    }
    
    else if (action === 'stop') {
      syncService.stopAutoSync();
      
      return NextResponse.json({
        success: true,
        message: 'Auto-sync stopped',
        timestamp: new Date().toISOString()
      });
    }
    
    else if (action === 'full_sync') {
      const result = await syncService.performFullSync();
      
      return NextResponse.json({
        success: result.success,
        data: result.data,
        error: result.error,
        timestamp: result.timestamp.toISOString()
      }, {
        status: result.success ? 200 : 500
      });
    }
    
    else if (action === 'webhook') {
      const { source, data } = body;
      
      if (!source || !data) {
        return NextResponse.json({
          error: 'Missing required fields: source and data'
        }, { status: 400 });
      }

      if (!['apollo', 'avainode', 'n8n'].includes(source)) {
        return NextResponse.json({
          error: 'Invalid source. Supported sources: apollo, avainode, n8n'
        }, { status: 400 });
      }

      await syncService.handleWebhookSync(source as 'apollo' | 'avainode' | 'n8n', data);
      
      return NextResponse.json({
        success: true,
        message: `Webhook data processed for ${source}`,
        timestamp: new Date().toISOString()
      });
    }
    
    else {
      return NextResponse.json({
        error: 'Invalid action. Supported actions: start, stop, full_sync, webhook'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing sync request:', error);
    return NextResponse.json({
      error: 'Failed to process sync request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Clear audit log
 */
export async function DELETE(request: NextRequest) {
  try {
    const syncService = getDataSyncService();
    const { searchParams } = request.nextUrl;
    
    const action = searchParams.get('action');
    
    if (action === 'audit_log') {
      syncService.clearAuditLog();
      
      return NextResponse.json({
        success: true,
        message: 'Audit log cleared',
        timestamp: new Date().toISOString()
      });
    }
    
    else {
      return NextResponse.json({
        error: 'Invalid action. Supported actions: audit_log'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing delete request:', error);
    return NextResponse.json({
      error: 'Failed to process delete request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}