/**
 * Comprehensive TypeScript Types for JetVision API Responses
 * Provides type safety and IntelliSense support for all API endpoints
 */

// ========================
// Base Response Types
// ========================

export interface BaseApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp?: string;
}

export interface PaginatedResponse<T> extends BaseApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrevious: boolean;
    };
}

export interface UsageInfo {
    credits_used: number;
    remaining_credits: number;
    daily_limit?: number;
    reset_time?: string;
}

export interface ApiError {
    code: string;
    message: string;
    details?: any;
    field?: string;
}

// ========================
// Apollo.io API Types
// ========================

export interface ApolloLead {
    id: string;
    name: string;
    title: string;
    company: string;
    industry: string;
    size: string;
    location: string;
    email: string;
    phone?: string;
    linkedIn?: string;
    confidence: number;
    verified?: boolean;
    lastEnriched?: string;
}

export interface ApolloContact {
    email: string;
    name?: string;
    title?: string;
    company?: string;
    phone?: string;
    linkedIn?: string;
    twitter?: string;
    verified: boolean;
    lastUpdated?: string;
    companyInfo?: {
        name: string;
        domain: string;
        industry: string;
        size: string;
        revenue?: string;
    };
}

export interface ApolloSequence {
    id: string;
    name: string;
    status: 'draft' | 'active' | 'paused' | 'completed';
    contactsCount: number;
    templatesCount: number;
    createdAt: string;
    updatedAt?: string;
    createdBy?: string;
    nextSteps?: string[];
}

export interface ApolloAccount {
    domain: string;
    companyName: string;
    industry: string;
    employeeCount: number;
    revenue?: string;
    headquarters?: string;
    website?: string;
    socialMedia?: {
        linkedin?: string;
        twitter?: string;
        facebook?: string;
    };
    contacts?: ApolloContact[];
    technologies?: string[];
    fundingInfo?: {
        stage: string;
        amount?: string;
        lastRound?: string;
    };
}

export interface ApolloMetrics {
    sequenceId: string;
    period: string;
    emailsSent: number;
    opens: number;
    openRate: string;
    clicks: number;
    clickRate: string;
    replies: number;
    replyRate: string;
    meetings: number;
    meetingRate?: string;
    bounces?: number;
    bounceRate?: string;
    unsubscribes?: number;
    unsubscribeRate?: string;
    insights?: ApolloInsight[];
}

export interface ApolloInsight {
    type: 'positive' | 'improvement' | 'warning' | 'info';
    category: 'open_rate' | 'click_rate' | 'reply_rate' | 'meetings' | 'overall';
    message: string;
    suggestion?: string;
    priority?: 'high' | 'medium' | 'low';
}

// Apollo API Request Types
export interface ApolloLeadSearchRequest {
    jobTitle?: string;
    industry?: string;
    companySize?: string;
    location?: string;
    limit?: number;
    keywords?: string[];
    excludeCompanies?: string[];
}

export interface ApolloContactEnrichRequest {
    email: string;
    linkedinUrl?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
}

export interface ApolloCampaignRequest {
    name: string;
    contacts: string[];
    templateIds?: string[];
    delayDays?: number[];
    tags?: string[];
    startDate?: string;
}

export interface ApolloTrackingRequest {
    sequenceId: string;
    startDate?: string;
    endDate?: string;
    includeDetails?: boolean;
}

// Apollo API Response Types
export interface ApolloLeadSearchResponse extends BaseApiResponse<ApolloLead[]> {
    usage: UsageInfo;
    searchCriteria?: ApolloLeadSearchRequest;
}

export interface ApolloContactEnrichResponse extends BaseApiResponse<ApolloContact> {
    usage: UsageInfo;
}

export interface ApolloCampaignResponse extends BaseApiResponse<ApolloSequence> {
    usage: UsageInfo;
}

export interface ApolloTrackingResponse extends BaseApiResponse<ApolloMetrics> {
    usage: UsageInfo;
}

// ========================
// Avainode API Types
// ========================

export interface AvainodeAircraft {
    id: string;
    model: string;
    category: 'Light Jet' | 'Midsize Jet' | 'Super Midsize Jet' | 'Heavy Jet' | 'Ultra Long Range';
    operator: string;
    operatorId: string;
    maxPassengers: number;
    hourlyRate: number;
    availability: 'available' | 'unavailable' | 'on_request';
    location: string;
    homeBase?: string;
    features: string[];
    images?: string[];
    specifications?: {
        range: number;
        speed: number;
        altitude: number;
        baggage: string;
        wifi: boolean;
        entertainment: boolean;
    };
    certifications?: string[];
}

export interface AvainodeCharterRequest {
    requestId: string;
    aircraftId: string;
    route: string;
    departureDate: string;
    departureTime: string;
    returnDate?: string;
    returnTime?: string;
    passengers: number;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    status: 'pending' | 'quoted' | 'confirmed' | 'cancelled' | 'completed';
    estimatedCost?: number;
    specialRequests?: string;
    createdAt: string;
    updatedAt?: string;
    estimatedResponse?: string;
    nextSteps?: string[];
    importantNotes?: string[];
}

export interface AvainodePricing {
    aircraftId: string;
    route: string;
    departureDate: string;
    returnDate?: string;
    flightTime: number;
    baseCost: number;
    fees: {
        fuelSurcharge?: number;
        landingFees?: number;
        handlingFees?: number;
        catering?: number;
        crewFees?: number;
        taxes?: number;
        international?: number;
        overnight?: number;
    };
    total: number;
    currency: string;
    validUntil: string;
    summary?: PricingSummary;
    insights?: PricingInsight[];
    paymentSchedule?: PaymentSchedule;
}

export interface PricingSummary {
    baseCost: number;
    baseCostPercentage: string;
    totalFees: number;
    totalFeesPercentage: string;
    feeBreakdown: FeeCategory[];
    grandTotal: number;
    costStructure: string;
}

export interface FeeCategory {
    category: string;
    amount: number;
    percentage: string;
    description?: string;
}

export interface PricingInsight {
    type: 'cost_breakdown' | 'hourly_rate' | 'round_trip_savings' | 'value_comparison' | 'time_savings';
    message: string;
    value?: number;
    unit?: string;
}

export interface PaymentSchedule {
    deposit: number;
    depositPercentage: string;
    balance: number;
    balancePercentage: string;
    depositDue: string;
    balanceDue: string;
    acceptedMethods?: string[];
}

export interface AvainodeBooking {
    bookingId: string;
    aircraftId: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    route: string;
    departureDate: string;
    departureTime: string;
    returnDate?: string;
    returnTime?: string;
    passengers: number;
    totalCost: number;
    paymentStatus: 'pending' | 'deposit_paid' | 'fully_paid';
    createdAt: string;
    updatedAt: string;
    confirmationNumber?: string;
}

export interface AvainodeOperator {
    id: string;
    name: string;
    certificate: string;
    established: number;
    headquarters: string;
    fleetSize: number;
    safetyRating: string;
    insurance: string;
    businessProfile?: OperatorBusinessProfile;
    certificationStatus?: OperatorCertification;
    serviceCapabilities?: OperatorCapabilities;
    safetyProfile?: OperatorSafety;
    fleetAnalysis?: FleetAnalysis;
    recommendations?: OperatorRecommendation[];
}

export interface OperatorBusinessProfile {
    yearsInBusiness: number;
    businessMaturity: 'Very Established' | 'Established' | 'Growing' | 'New';
    fleetCategory: string;
    marketPosition: string;
    specializations: string[];
}

export interface OperatorCertification {
    certificationType: 'Commercial' | 'Private' | 'Unknown';
    certificateNumber: string;
    regulatoryCompliance: string;
    inspectionSchedule: string;
}

export interface OperatorCapabilities {
    primaryCapabilities: string[];
    estimatedResponseTime: string;
    availabilityScope: string;
    concurrentFlights: number;
}

export interface OperatorSafety {
    overallRating: string;
    insuranceCoverage: string;
    safetyHighlights: string[];
    certifications: string[];
    riskAssessment: string;
}

export interface FleetAnalysis {
    diversity: string;
    capabilities: string[];
    strengths: string[];
    limitations: string[];
}

export interface OperatorRecommendation {
    category: 'experience' | 'capacity' | 'reliability' | 'service' | 'safety' | 'coverage';
    message: string;
    priority?: 'high' | 'medium' | 'low';
}

// Avainode API Request Types
export interface AvainodeAircraftSearchRequest {
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    passengers: number;
    aircraftCategory?: string;
    maxPrice?: number;
    returnDate?: string;
    preferredOperators?: string[];
    excludeOperators?: string[];
}

export interface AvainodeCharterBookingRequest {
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
    returnDate?: string;
    returnTime?: string;
    cateringPreferences?: string;
    groundTransport?: boolean;
}

export interface AvainodePricingRequest {
    aircraftId: string;
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    passengers: number;
    returnDate?: string;
    includeAllFees?: boolean;
    cateringLevel?: 'basic' | 'premium' | 'luxury';
}

export interface AvainodeFleetRequest {
    operatorId: string;
    includeFleetDetails?: boolean;
    includeSafetyRecords?: boolean;
}

export interface AvainodeBookingManagementRequest {
    bookingId: string;
    action: 'confirm' | 'cancel' | 'modify' | 'get_details';
    paymentMethod?: string;
    cancellationReason?: string;
    modifications?: Partial<AvainodeCharterBookingRequest>;
}

// Avainode API Response Types
export interface AvainodeAircraftSearchResponse extends BaseApiResponse<AvainodeAircraft[]> {
    usage: UsageInfo;
    metadata: {
        search_criteria: AvainodeAircraftSearchRequest;
        results_count: number;
        search_time: string;
        recommendations?: SearchRecommendation[];
    };
}

export interface SearchRecommendation {
    type: 'no_results' | 'best_value' | 'right_sizing' | 'category_options';
    aircraftId?: string;
    message: string;
}

export interface AvainodeCharterBookingResponse extends BaseApiResponse<AvainodeCharterRequest> {
    usage: UsageInfo;
}

export interface AvainodePricingResponse extends BaseApiResponse<AvainodePricing> {
    usage: UsageInfo;
}

export interface AvainodeFleetResponse extends BaseApiResponse<AvainodeOperator> {
    usage: UsageInfo;
}

export interface AvainodeBookingManagementResponse extends BaseApiResponse<any> {
    usage: UsageInfo;
}

// ========================
// N8N Webhook Types
// ========================

export interface N8nWebhookRequest {
    message: string;
    threadId?: string;
    threadItemId?: string;
    messages?: ChatMessage[];
    context?: any;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: string;
}

export interface N8nWebhookResponse extends BaseApiResponse<any> {
    executionId?: string;
    status: 'processing' | 'completed' | 'failed';
    estimatedTime?: string;
}

export interface N8nExecutionStatus {
    id: string;
    finished: boolean;
    mode: string;
    startedAt: string;
    stoppedAt?: string;
    workflowId: string;
    status: 'running' | 'success' | 'error' | 'waiting';
    data?: any;
}

export interface N8nHealthStatus {
    service: string;
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    webhook: {
        url: string;
        isHealthy: boolean;
        consecutiveFailures: number;
        lastFailure?: string;
        circuitBreaker: {
            isOpen: boolean;
            openUntil?: string;
            remainingSeconds?: number;
        };
    };
    configuration: {
        hasApiKey: boolean;
        hasWebhookUrl: boolean;
        maxRetries: number;
        pollInterval: number;
        maxPollAttempts: number;
        timeout: number;
    };
    endpoints: {
        webhook: string;
        api: string;
    };
}

// ========================
// MCP Proxy Types
// ========================

export interface MCPServerType {
    'apollo-io': string;
    'avainode': string;
    'hackernews': string;
    'n8n': string;
}

export interface MCPProxyRequest {
    server?: string;
    serverType?: keyof MCPServerType;
    sessionId?: string;
    method: string;
    params?: any;
}

export interface MCPProxyResponse {
    jsonrpc: string;
    id?: string | number;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

// ========================
// Streaming Response Types
// ========================

export interface StreamEvent {
    event: 'status' | 'answer' | 'error' | 'done' | 'heartbeat';
    data: any;
    id?: string;
    retry?: number;
}

export interface StreamStatusEvent {
    status: 'connecting' | 'processing' | 'completing' | 'error';
    message: string;
    isLoading?: boolean;
    progress?: number;
    threadId?: string;
    threadItemId?: string;
    executionId?: string;
}

export interface StreamAnswerEvent {
    answer: {
        text: string;
        type?: 'text' | 'markdown' | 'json';
    };
    threadId?: string;
    threadItemId?: string;
}

export interface StreamErrorEvent {
    error: string;
    code?: string;
    retryable?: boolean;
    threadId?: string;
    threadItemId?: string;
}

export interface StreamDoneEvent {
    type: 'done';
    status?: 'success' | 'error' | 'aborted';
    threadId?: string;
    threadItemId?: string;
    executionTime?: number;
}

// ========================
// Authentication Types
// ========================

export interface AuthUser {
    userId: string;
    emailAddress?: string;
    role?: 'basic' | 'premium' | 'admin';
    permissions?: string[];
}

export interface AuthContext {
    user: AuthUser;
    isAdmin: boolean;
    isPremium: boolean;
    canAccess: (resource: string) => boolean;
}

export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number;
    windowMs: number;
}

// ========================
// Utility Types
// ========================

export type ApiEndpoint = 
    // Apollo endpoints
    | '/api/apollo/leads/search'
    | '/api/apollo/contacts/enrich'
    | '/api/apollo/campaigns'
    | '/api/apollo/tracking'
    // Avainode endpoints
    | '/api/avainode/aircraft/search'
    | '/api/avainode/bookings/create'
    | '/api/avainode/pricing'
    | '/api/avainode/fleet'
    // Other endpoints
    | '/api/n8n-webhook'
    | '/api/mcp/proxy'
    | '/api/completion';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

export interface ApiRequestConfig {
    method: HttpMethod;
    endpoint: ApiEndpoint;
    data?: any;
    params?: Record<string, string>;
    headers?: Record<string, string>;
    timeout?: number;
}

export interface ApiResponseConfig<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    config: ApiRequestConfig;
}

// ========================
// Error Types
// ========================

export type ApiErrorCode = 
    | 'VALIDATION_ERROR'
    | 'AUTH_REQUIRED'
    | 'PERMISSION_DENIED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'RESOURCE_NOT_FOUND'
    | 'EXTERNAL_API_ERROR'
    | 'SERVICE_UNAVAILABLE'
    | 'INTERNAL_ERROR'
    | 'TIMEOUT_ERROR'
    | 'NETWORK_ERROR';

export interface ApiErrorResponse {
    success: false;
    error: string;
    code: ApiErrorCode;
    details?: any;
    field?: string;
    timestamp: string;
    requestId?: string;
}

// ========================
// Validation Types
// ========================

export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: ValidationError[];
}

export interface ValidationError {
    field: string;
    message: string;
    code: string;
    value?: any;
}

// ========================
// Export All Types
// ========================
// All interfaces are already exported above

// Default export for the main types object
export default {
    Apollo: {
        Lead: {} as ApolloLead,
        Contact: {} as ApolloContact,
        Sequence: {} as ApolloSequence,
        Account: {} as ApolloAccount,
        Metrics: {} as ApolloMetrics,
    },
    Avainode: {
        Aircraft: {} as AvainodeAircraft,
        CharterRequest: {} as AvainodeCharterRequest,
        Pricing: {} as AvainodePricing,
        Booking: {} as AvainodeBooking,
        Operator: {} as AvainodeOperator,
    },
    N8n: {
        WebhookRequest: {} as N8nWebhookRequest,
        WebhookResponse: {} as N8nWebhookResponse,
        ExecutionStatus: {} as N8nExecutionStatus,
        HealthStatus: {} as N8nHealthStatus,
    },
    Stream: {
        Event: {} as StreamEvent,
        StatusEvent: {} as StreamStatusEvent,
        AnswerEvent: {} as StreamAnswerEvent,
        ErrorEvent: {} as StreamErrorEvent,
        DoneEvent: {} as StreamDoneEvent,
    },
    Auth: {
        User: {} as AuthUser,
        Context: {} as AuthContext,
    }
};