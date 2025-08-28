import { 
  MCPRequest, 
  MCPResponse, 
  MCPServerConfig, 
  MCPSession, 
  MCPTool, 
  ConnectionStatus,
  ServiceResponse 
} from './types';

/**
 * Core MCP Client for managing connections to multiple MCP servers
 */
export class MCPClient {
  private sessions: Map<string, MCPSession> = new Map();
  private connectionPools: Map<string, ConnectionPool> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  
  constructor(private servers: MCPServerConfig[]) {
    this.initializeConnectionPools();
  }

  /**
   * Initialize connection pools for each server
   */
  private initializeConnectionPools() {
    this.servers.forEach(server => {
      this.connectionPools.set(server.name, new ConnectionPool(server));
    });
  }

  /**
   * Connect to a specific MCP server
   */
  async connect(serverName: string): Promise<ServiceResponse<MCPSession>> {
    try {
      const serverConfig = this.servers.find(s => s.name === serverName);
      if (!serverConfig) {
        throw new Error(`Server ${serverName} not found in configuration`);
      }

      const pool = this.connectionPools.get(serverName);
      if (!pool) {
        throw new Error(`Connection pool for ${serverName} not found`);
      }

      // Check if we already have an active session
      const existingSession = this.sessions.get(serverName);
      if (existingSession?.isActive) {
        return {
          success: true,
          data: existingSession,
          timestamp: new Date()
        };
      }

      // Create new session
      const sessionId = `${serverName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session: MCPSession = {
        id: sessionId,
        serverId: serverName,
        url: serverConfig.url,
        isActive: false,
        lastActivity: new Date(),
        tools: []
      };

      // Establish connection
      const connection = await pool.getConnection();
      
      // Initialize session with server
      const initResponse = await this.sendRequest(serverName, {
        jsonrpc: '2.0',
        id: sessionId,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: { listChanged: true },
            sampling: {}
          },
          clientInfo: {
            name: 'jetvision-agent',
            version: '1.0.0'
          }
        }
      });

      if (!initResponse.success || !initResponse.data?.result) {
        throw new Error('Failed to initialize session with server');
      }

      // Discover available tools
      const toolsResponse = await this.sendRequest(serverName, {
        jsonrpc: '2.0',
        id: `${sessionId}_tools`,
        method: 'tools/list'
      });

      if (toolsResponse.success && toolsResponse.data?.result?.tools) {
        session.tools = toolsResponse.data.result.tools;
      }

      session.isActive = true;
      this.sessions.set(serverName, session);

      this.emit('connection', { serverId: serverName, connected: true, session });

      return {
        success: true,
        data: session,
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`Failed to connect to ${serverName}:`, error);
      
      this.emit('connection', { serverId: serverName, connected: false, error });

      return {
        success: false,
        error: {
          code: 'CONNECTION_FAILED',
          message: `Failed to connect to ${serverName}`,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Disconnect from a specific MCP server
   */
  async disconnect(serverName: string): Promise<void> {
    const session = this.sessions.get(serverName);
    if (session) {
      session.isActive = false;
      this.sessions.delete(serverName);
    }

    const pool = this.connectionPools.get(serverName);
    if (pool) {
      await pool.closeAllConnections();
    }

    this.emit('connection', { serverId: serverName, connected: false });
  }

  /**
   * Send a request to a specific MCP server
   */
  async sendRequest<T = any>(
    serverName: string, 
    request: MCPRequest
  ): Promise<ServiceResponse<MCPResponse<T>>> {
    try {
      const session = this.sessions.get(serverName);
      if (!session?.isActive) {
        // Attempt to reconnect
        const connectResult = await this.connect(serverName);
        if (!connectResult.success) {
          throw new Error(`No active session for ${serverName} and reconnection failed`);
        }
      }

      const pool = this.connectionPools.get(serverName);
      if (!pool) {
        throw new Error(`Connection pool for ${serverName} not found`);
      }

      const response = await pool.sendRequest<T>(request);
      
      // Update session activity
      if (session) {
        session.lastActivity = new Date();
      }

      this.emit('request', { serverId: serverName, request, response });

      return {
        success: true,
        data: response,
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`Request failed for ${serverName}:`, error);

      this.emit('error', { serverId: serverName, error, request });

      return {
        success: false,
        error: {
          code: 'REQUEST_FAILED',
          message: `Request to ${serverName} failed`,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute a tool on a specific MCP server
   */
  async executeTool<T = any>(
    serverName: string,
    toolName: string,
    params: Record<string, any>
  ): Promise<ServiceResponse<T>> {
    try {
      const session = this.sessions.get(serverName);
      if (!session?.isActive) {
        const connectResult = await this.connect(serverName);
        if (!connectResult.success) {
          throw new Error(`Cannot execute tool: ${serverName} is not connected`);
        }
      }

      // Validate tool exists
      const tool = session?.tools.find(t => t.name === toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found on server ${serverName}`);
      }

      // Execute tool
      const response = await this.sendRequest<T>(serverName, {
        jsonrpc: '2.0',
        id: `tool_${Date.now()}`,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: params
        }
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Tool execution failed');
      }

      this.emit('tool_execution', { 
        serverId: serverName, 
        toolName, 
        params, 
        result: response.data?.result 
      });

      return {
        success: true,
        data: response.data?.result,
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`Tool execution failed for ${toolName} on ${serverName}:`, error);

      this.emit('error', { serverId: serverName, toolName, error });

      return {
        success: false,
        error: {
          code: 'TOOL_EXECUTION_FAILED',
          message: `Failed to execute ${toolName} on ${serverName}`,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date()
      };
    }
  }

  /**
   * Get connection status for all servers
   */
  async getConnectionStatus(): Promise<ConnectionStatus[]> {
    const statuses: ConnectionStatus[] = [];

    for (const [serverName, session] of this.sessions) {
      const pool = this.connectionPools.get(serverName);
      const status: ConnectionStatus = {
        serverId: serverName,
        isConnected: session.isActive,
        lastChecked: new Date(),
        errorCount: pool?.getErrorCount() || 0,
        tools: session.tools || []
      };

      // Test connection if active
      if (session.isActive) {
        try {
          const start = Date.now();
          const response = await this.sendRequest(serverName, {
            jsonrpc: '2.0',
            id: 'health_check',
            method: 'ping'
          });
          status.responseTime = Date.now() - start;
          status.isConnected = response.success;
        } catch (error) {
          status.isConnected = false;
          status.errorCount += 1;
        }
      }

      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Get all available tools from all servers
   */
  getAllTools(): Record<string, MCPTool[]> {
    const tools: Record<string, MCPTool[]> = {};
    
    this.sessions.forEach((session, serverName) => {
      tools[serverName] = session.tools || [];
    });

    return tools;
  }

  /**
   * Event emission system
   */
  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Add event listener
   */
  on(event: string, listener: Function) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(listener);
    this.eventListeners.set(event, listeners);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: Function) {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  /**
   * Cleanup all connections
   */
  async cleanup() {
    for (const serverName of this.sessions.keys()) {
      await this.disconnect(serverName);
    }
    this.eventListeners.clear();
  }
}

/**
 * Connection pool for managing HTTP connections to MCP servers
 */
class ConnectionPool {
  private connections: Set<Connection> = new Set();
  private errorCount = 0;
  private readonly maxConnections: number = 5;

  constructor(private config: MCPServerConfig) {}

  async getConnection(): Promise<Connection> {
    // Simple connection management - in production would implement proper pooling
    const connection = new Connection(this.config);
    this.connections.add(connection);
    return connection;
  }

  async sendRequest<T>(request: MCPRequest): Promise<MCPResponse<T>> {
    const connection = await this.getConnection();
    try {
      return await connection.sendRequest<T>(request);
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  getErrorCount(): number {
    return this.errorCount;
  }

  async closeAllConnections() {
    for (const connection of this.connections) {
      await connection.close();
    }
    this.connections.clear();
  }
}

/**
 * Individual connection to an MCP server
 */
class Connection {
  constructor(private config: MCPServerConfig) {}

  async sendRequest<T>(request: MCPRequest): Promise<MCPResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout || 30000);

    try {
      const response = await fetch(`${this.config.url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as MCPResponse<T>;

    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  async close() {
    // Cleanup if needed
  }
}