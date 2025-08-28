 Working Endpoints:

  ✅ Health Check: GET 
  https://apollo-mcp.kingler.workers.dev/health
  ✅ MCP Initialize: POST 
  https://apollo-mcp.kingler.workers.dev/mcp (method:
   initialize)
  ✅ Tools List: POST 
  https://apollo-mcp.kingler.workers.dev/mcp (method:
   tools/list)
  ✅ Tool Call: POST 
  https://apollo-mcp.kingler.workers.dev/mcp (method:
   tools/call)

  n8n Configuration:

  For the n8n MCP Client node, use:
  - Endpoint:
  https://apollo-mcp.kingler.workers.dev/mcp
  - Authentication: Bearer token with value Bearer 
  bj015A7ynPgcjjhrQ_fN_Q
  - Transport: httpStreamable or http