/**
 * Unit tests for MCP Client
 */

import { MCPClient } from '../../lib/mcp/client';
import { MCPServerConfig } from '../../lib/mcp/types';

// Mock fetch globally
global.fetch = jest.fn();

describe('MCPClient', () => {
  let mcpClient: MCPClient;
  let mockServers: MCPServerConfig[];

  beforeEach(() => {
    mockServers = [
      {
        name: 'test-server',
        url: 'http://localhost:8123/mcp',
        port: 8123,
        timeout: 5000,
        retryAttempts: 2,
        retryDelay: 1000
      }
    ];

    mcpClient = new MCPClient(mockServers);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await mcpClient.cleanup();
  });

  describe('Initialization', () => {
    test('should initialize with server configurations', () => {
      expect(mcpClient).toBeDefined();
      expect(mcpClient['servers']).toEqual(mockServers);
      expect(mcpClient['connectionPools'].size).toBe(1);
      expect(mcpClient['connectionPools'].has('test-server')).toBeTruthy();
    });

    test('should initialize connection pools for all servers', () => {
      const multipleServers = [
        ...mockServers,
        {
          name: 'server-2',
          url: 'http://localhost:8124/mcp',
          port: 8124
        }
      ];

      const client = new MCPClient(multipleServers);
      expect(client['connectionPools'].size).toBe(2);
      expect(client['connectionPools'].has('test-server')).toBeTruthy();
      expect(client['connectionPools'].has('server-2')).toBeTruthy();
    });
  });

  describe('Connection Management', () => {
    test('should connect to server successfully', async () => {
      // Mock successful initialization response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 'init',
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {}
          }
        })
      });

      // Mock tools list response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 'tools',
          result: {
            tools: [
              {
                name: 'test-tool',
                description: 'Test tool',
                inputSchema: {
                  type: 'object',
                  properties: {}
                }
              }
            ]
          }
        })
      });

      const result = await mcpClient.connect('test-server');

      expect(result.success).toBeTruthy();
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('serverId', 'test-server');
      expect(result.data).toHaveProperty('isActive', true);
      expect(result.data?.tools).toBeDefined();
      expect(result.data?.tools.length).toBe(1);
    });

    test('should handle connection failure', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

      const result = await mcpClient.connect('test-server');

      expect(result.success).toBeFalsy();
      expect(result.error).toHaveProperty('code', 'CONNECTION_FAILED');
      expect(result.error?.message).toContain('test-server');
    });

    test('should return existing session if already connected', async () => {
      // First connection
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'init',
            result: { protocolVersion: '2024-11-05', capabilities: {} }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'tools',
            result: { tools: [] }
          })
        });

      const firstResult = await mcpClient.connect('test-server');
      expect(firstResult.success).toBeTruthy();

      // Second connection (should reuse existing session)
      const secondResult = await mcpClient.connect('test-server');
      expect(secondResult.success).toBeTruthy();
      expect(secondResult.data?.id).toBe(firstResult.data?.id);
    });

    test('should disconnect from server', async () => {
      // First connect
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'init',
            result: { protocolVersion: '2024-11-05', capabilities: {} }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'tools',
            result: { tools: [] }
          })
        });

      await mcpClient.connect('test-server');
      
      // Then disconnect
      await mcpClient.disconnect('test-server');

      // Should not have active session
      const status = await mcpClient.getConnectionStatus();
      expect(status.length).toBe(0);
    });

    test('should handle disconnect of non-existent server gracefully', async () => {
      expect(async () => {
        await mcpClient.disconnect('non-existent-server');
      }).not.toThrow();
    });
  });

  describe('Request Handling', () => {
    test('should send request to active session', async () => {
      // Setup connection
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'init',
            result: { protocolVersion: '2024-11-05', capabilities: {} }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'tools',
            result: { tools: [] }
          })
        });

      await mcpClient.connect('test-server');

      // Mock request response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 'test-request',
          result: { message: 'success' }
        })
      });

      const result = await mcpClient.sendRequest('test-server', {
        jsonrpc: '2.0',
        id: 'test-request',
        method: 'test-method'
      });

      expect(result.success).toBeTruthy();
      expect(result.data?.result).toEqual({ message: 'success' });
    });

    test('should handle request without active session', async () => {
      const result = await mcpClient.sendRequest('test-server', {
        jsonrpc: '2.0',
        id: 'test-request',
        method: 'test-method'
      });

      expect(result.success).toBeFalsy();
      expect(result.error?.code).toBe('CONNECTION_FAILED');
    });

    test('should handle HTTP errors in requests', async () => {
      // Setup connection
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'init',
            result: { protocolVersion: '2024-11-05', capabilities: {} }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'tools',
            result: { tools: [] }
          })
        });

      await mcpClient.connect('test-server');

      // Mock HTTP error
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const result = await mcpClient.sendRequest('test-server', {
        jsonrpc: '2.0',
        id: 'test-request',
        method: 'test-method'
      });

      expect(result.success).toBeFalsy();
      expect(result.error?.code).toBe('REQUEST_FAILED');
    });
  });

  describe('Tool Execution', () => {
    beforeEach(async () => {
      // Setup connection with tools
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'init',
            result: { protocolVersion: '2024-11-05', capabilities: {} }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'tools',
            result: {
              tools: [
                {
                  name: 'test-tool',
                  description: 'Test tool',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      param: { type: 'string' }
                    }
                  }
                }
              ]
            }
          })
        });

      await mcpClient.connect('test-server');
    });

    test('should execute tool successfully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 'tool-call',
          result: {
            content: [
              {
                type: 'text',
                text: 'Tool executed successfully'
              }
            ]
          }
        })
      });

      const result = await mcpClient.executeTool('test-server', 'test-tool', {
        param: 'test-value'
      });

      expect(result.success).toBeTruthy();
      expect(result.data).toHaveProperty('content');
    });

    test('should validate tool exists before execution', async () => {
      const result = await mcpClient.executeTool('test-server', 'non-existent-tool', {});

      expect(result.success).toBeFalsy();
      expect(result.error?.message).toContain('Tool non-existent-tool not found');
    });

    test('should handle tool execution failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 'tool-call',
          error: {
            code: -32603,
            message: 'Tool execution failed'
          }
        })
      });

      const result = await mcpClient.executeTool('test-server', 'test-tool', {
        param: 'test-value'
      });

      expect(result.success).toBeFalsy();
      expect(result.error?.code).toBe('TOOL_EXECUTION_FAILED');
    });
  });

  describe('Connection Status', () => {
    test('should return connection status for all servers', async () => {
      const status = await mcpClient.getConnectionStatus();

      expect(Array.isArray(status)).toBeTruthy();
      expect(status.length).toBe(1);
      expect(status[0]).toHaveProperty('serverId', 'test-server');
      expect(status[0]).toHaveProperty('isConnected');
      expect(status[0]).toHaveProperty('lastChecked');
      expect(status[0]).toHaveProperty('errorCount');
      expect(status[0]).toHaveProperty('tools');
    });

    test('should test connection with ping for active servers', async () => {
      // Setup connection
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'init',
            result: { protocolVersion: '2024-11-05', capabilities: {} }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'tools',
            result: { tools: [] }
          })
        });

      await mcpClient.connect('test-server');

      // Mock ping response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 'health_check',
          result: 'pong'
        })
      });

      const status = await mcpClient.getConnectionStatus();

      expect(status[0].isConnected).toBeTruthy();
      expect(status[0]).toHaveProperty('responseTime');
      expect(typeof status[0].responseTime).toBe('number');
    });
  });

  describe('Tools Management', () => {
    test('should return all tools from all servers', async () => {
      // Setup connection with tools
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'init',
            result: { protocolVersion: '2024-11-05', capabilities: {} }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'tools',
            result: {
              tools: [
                {
                  name: 'tool-1',
                  description: 'Tool 1',
                  inputSchema: { type: 'object', properties: {} }
                },
                {
                  name: 'tool-2',
                  description: 'Tool 2',
                  inputSchema: { type: 'object', properties: {} }
                }
              ]
            }
          })
        });

      await mcpClient.connect('test-server');

      const allTools = mcpClient.getAllTools();

      expect(allTools).toHaveProperty('test-server');
      expect(allTools['test-server']).toHaveLength(2);
      expect(allTools['test-server'][0]).toHaveProperty('name', 'tool-1');
      expect(allTools['test-server'][1]).toHaveProperty('name', 'tool-2');
    });

    test('should return empty tools for disconnected servers', () => {
      const allTools = mcpClient.getAllTools();
      expect(allTools).toEqual({});
    });
  });

  describe('Event System', () => {
    test('should register and call event listeners', (done) => {
      const mockListener = jest.fn((data) => {
        expect(data).toHaveProperty('test');
        expect(data.test).toBe('value');
        done();
      });

      mcpClient.on('test-event', mockListener);

      // Trigger event (through private emit method)
      mcpClient['emit']('test-event', { test: 'value' });
    });

    test('should remove event listeners', () => {
      const mockListener = jest.fn();

      mcpClient.on('test-event', mockListener);
      mcpClient.off('test-event', mockListener);

      // Trigger event
      mcpClient['emit']('test-event', { test: 'value' });

      expect(mockListener).not.toHaveBeenCalled();
    });

    test('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mcpClient.on('test-event', errorListener);

      expect(() => {
        mcpClient['emit']('test-event', { test: 'value' });
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup all connections and listeners', async () => {
      // Setup connection
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'init',
            result: { protocolVersion: '2024-11-05', capabilities: {} }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'tools',
            result: { tools: [] }
          })
        });

      await mcpClient.connect('test-server');

      const mockListener = jest.fn();
      mcpClient.on('test-event', mockListener);

      await mcpClient.cleanup();

      // Check that sessions are cleared
      const status = await mcpClient.getConnectionStatus();
      expect(status.length).toBe(0);

      // Check that event listeners are cleared
      expect(mcpClient['eventListeners'].size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle network timeouts', async () => {
      const timeoutClient = new MCPClient([
        {
          name: 'timeout-server',
          url: 'http://localhost:8123/mcp',
          port: 8123,
          timeout: 100 // Very short timeout
        }
      ]);

      // Mock a delay longer than timeout
      (fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(resolve, 200))
      );

      const result = await timeoutClient.connect('timeout-server');

      expect(result.success).toBeFalsy();
      expect(result.error?.code).toBe('CONNECTION_FAILED');
    });

    test('should handle malformed JSON responses', async () => {
      // Setup connection
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'init',
            result: { protocolVersion: '2024-11-05', capabilities: {} }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            jsonrpc: '2.0',
            id: 'tools',
            result: { tools: [] }
          })
        });

      await mcpClient.connect('test-server');

      // Mock malformed JSON response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await mcpClient.sendRequest('test-server', {
        jsonrpc: '2.0',
        id: 'test-request',
        method: 'test-method'
      });

      expect(result.success).toBeFalsy();
      expect(result.error?.code).toBe('REQUEST_FAILED');
    });
  });
});