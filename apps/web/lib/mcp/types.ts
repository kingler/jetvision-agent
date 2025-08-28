/**
 * Type definitions for MCP (Model Context Protocol) integration
 */

// Core MCP Protocol Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

export interface MCPResponse<T = any> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// Server Configuration
export interface MCPServerConfig {
  name: string;
  url: string;
  port: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface MCPSession {
  id: string;
  serverId: string;
  url: string;
  isActive: boolean;
  lastActivity: Date;
  tools: MCPTool[];
}

// Apollo.io Types
export interface ApolloLead {
  id?: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  size: string;
  location: string;
  email: string;
  phone?: string;
  linkedIn?: string;
}

export interface ApolloSearchParams {
  jobTitle?: string;
  industry?: string;
  companySize?: string;
  location?: string;
  limit?: number;
}

export interface ApolloEnrichParams {
  email: string;
  linkedinUrl?: string;
}

export interface ApolloSequenceParams {
  name: string;
  contacts: string[];
  templateIds?: string[];
  delayDays?: number[];
}

export interface ApolloAccountParams {
  domain: string;
  includeContacts?: boolean;
}

export interface ApolloEngagementParams {
  sequenceId: string;
  startDate?: string;
  endDate?: string;
}

// Avainode Types
export interface AircraftSearchParams {
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  passengers: number;
  aircraftCategory?: string;
  maxPrice?: number;
}

export interface Aircraft {
  id: string;
  model: string;
  category: string;
  operator: string;
  maxPassengers: number;
  hourlyRate: number;
  availability: string;
}

export interface CharterRequestParams {
  aircraftId: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  departureTime: string;
  passengers: number;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  specialRequests?: string;
}

export interface PricingParams {
  aircraftId: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  includeAllFees?: boolean;
}

export interface BookingManagementParams {
  bookingId: string;
  action: 'confirm' | 'cancel' | 'get_details' | 'modify';
  paymentMethod?: string;
  cancellationReason?: string;
  modifications?: Record<string, any>;
}

export interface OperatorInfoParams {
  operatorId: string;
  includeFleetDetails?: boolean;
  includeSafetyRecords?: boolean;
}

// N8N Types
export interface N8NWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: N8NNode[];
  connections: Record<string, any>;
}

export interface N8NNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
}

export interface N8NExecution {
  id: string;
  workflowId: string;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  status: 'running' | 'success' | 'error' | 'canceled';
  data?: any;
}

export interface N8NCredential {
  id: string;
  name: string;
  type: string;
  data: Record<string, any>;
}

// Integration Flow Types
export interface LeadToBookingFlow {
  leadId: string;
  apolloData: ApolloLead;
  flightRequirements?: {
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    passengers: number;
  };
  avainodeResults?: Aircraft[];
  bookingStatus?: 'pending' | 'confirmed' | 'cancelled';
  workflowExecutionId?: string;
}

// Service Response Types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

// Connection Status Types
export interface ConnectionStatus {
  serverId: string;
  isConnected: boolean;
  lastChecked: Date;
  responseTime?: number;
  errorCount: number;
  tools: MCPTool[];
}

// Event Types for Real-time Updates
export interface MCPEvent {
  type: 'connection' | 'tool_execution' | 'data_sync' | 'error';
  serverId: string;
  data: any;
  timestamp: Date;
}