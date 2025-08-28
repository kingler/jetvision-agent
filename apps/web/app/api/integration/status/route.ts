import { NextRequest, NextResponse } from 'next/server';
import { getIntegrationManager } from '../../../../lib/mcp/integration-manager';

/**
 * API endpoint to get integration system status
 */
export async function GET(request: NextRequest) {
  try {
    const integrationManager = getIntegrationManager();
    
    // Check if manager is initialized, if not initialize it
    const initCheck = await integrationManager.getSystemStatus();
    if (!initCheck.success || !initCheck.data?.isInitialized) {
      console.log('Integration manager not initialized, initializing...');
      const initResult = await integrationManager.initialize();
      
      if (!initResult.success) {
        return NextResponse.json({
          error: 'Failed to initialize integration manager',
          details: initResult.error
        }, { status: 500 });
      }
    }

    // Get current system status
    const statusResult = await integrationManager.getSystemStatus();
    
    if (!statusResult.success) {
      return NextResponse.json({
        error: 'Failed to get system status',
        details: statusResult.error
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: statusResult.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting integration status:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * API endpoint to initialize or reinitialize the integration system
 */
export async function POST(request: NextRequest) {
  try {
    const integrationManager = getIntegrationManager();
    
    // Force reinitialization
    const initResult = await integrationManager.initialize();
    
    return NextResponse.json({
      success: initResult.success,
      data: initResult.data,
      error: initResult.error,
      timestamp: new Date().toISOString()
    }, {
      status: initResult.success ? 200 : 500
    });

  } catch (error) {
    console.error('Error initializing integration system:', error);
    return NextResponse.json({
      error: 'Failed to initialize integration system',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}