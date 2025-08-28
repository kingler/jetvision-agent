// MCP Server Configuration
export const MCP_SERVERS = {
  'apollo-io': {
    url: 'https://apollo-mcp.designthru.ai/mcp',
    name: 'Apollo.io MCP Server',
    description: 'Sales intelligence and lead generation',
    enabled: true,
  },
  'avainode': {
    url: 'https://avainode-mcp.designthru.ai/mcp',
    name: 'Avainode MCP Server',
    description: 'Aircraft charter and availability',
    enabled: true,
  },
  'hackernews': {
    url: 'https://mcp.composio.dev/hackernews/rapping-bitter-psychiatrist-DjGelP',
    name: 'HackerNews MCP Server',
    description: 'HackerNews content and discussions',
    enabled: false, // Disabled for JetVision
  },
} as const;

export type MCPServerType = keyof typeof MCP_SERVERS;

export function getMCPServerUrl(serverType: MCPServerType): string | null {
  const server = MCP_SERVERS[serverType];
  return server?.enabled ? server.url : null;
}

export function getEnabledMCPServers(): Array<{
  id: MCPServerType;
  name: string;
  description: string;
  url: string;
}> {
  return Object.entries(MCP_SERVERS)
    .filter(([_, config]) => config.enabled)
    .map(([id, config]) => ({
      id: id as MCPServerType,
      name: config.name,
      description: config.description,
      url: config.url,
    }));
}