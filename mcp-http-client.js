#!/usr/bin/env node

/**
 * MCP HTTP Client Bridge for Claude Desktop
 * This bridges HTTP-based MCP servers to Claude Desktop's stdio interface
 */

const readline = require('readline');
const https = require('https');
const http = require('http');

class MCPHTTPBridge {
  constructor(serverUrl) {
    this.serverUrl = new URL(serverUrl);
    this.sessionId = null;
    this.isHttps = this.serverUrl.protocol === 'https:';
    
    // Setup stdio interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
    
    this.setupHandlers();
  }

  setupHandlers() {
    this.rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        const response = await this.handleRequest(request);
        console.log(JSON.stringify(response));
      } catch (error) {
        const errorResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error',
            data: error.message
          },
          id: null
        };
        console.log(JSON.stringify(errorResponse));
      }
    });
  }

  async handleRequest(request) {
    // Special handling for initialize to capture session ID
    if (request.method === 'initialize') {
      const response = await this.makeHttpRequest(request);
      // Session ID will be in headers of the HTTP response
      return response;
    }
    
    // For other requests, include session ID if we have one
    return await this.makeHttpRequest(request);
  }

  makeHttpRequest(payload) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      
      const options = {
        hostname: this.serverUrl.hostname,
        port: this.serverUrl.port || (this.isHttps ? 443 : 80),
        path: this.serverUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
          'Accept': 'application/json'
        }
      };

      // Add session ID if we have one
      if (this.sessionId) {
        options.headers['mcp-session-id'] = this.sessionId;
      }

      const protocol = this.isHttps ? https : http;
      
      const req = protocol.request(options, (res) => {
        let responseData = '';

        // Capture session ID from response headers
        if (res.headers['mcp-session-id']) {
          this.sessionId = res.headers['mcp-session-id'];
        }

        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  async start() {
    // Send a ready signal
    process.stderr.write(`MCP HTTP Bridge connected to ${this.serverUrl.href}\n`);
  }
}

// Main execution
if (require.main === module) {
  const serverUrl = process.argv[2];
  
  if (!serverUrl) {
    console.error('Usage: node mcp-http-client.js <server-url>');
    process.exit(1);
  }

  const bridge = new MCPHTTPBridge(serverUrl);
  bridge.start();
}