'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@repo/ui';
import { v4 as uuidv4 } from 'uuid';
import { useServiceControlStore } from '../store/service-control.store';
import { ServiceStatusIndicator } from './service-control/ServiceStatusIndicator';

interface N8NResponse {
    status: string;
    message: string;
    executionId: string;
    timestamp: string;
}

interface WorkflowTestPayload {
    sessionId: string;
    message: string;
    context: {
        source: string;
        timestamp: string;
        workflowType: 'lead-generation' | 'outreach-sequence';
        parameters: Record<string, any>;
    };
}

export const N8NWorkflowTester: React.FC = () => {
    const [selectedWorkflow, setSelectedWorkflow] = useState<
        'lead-generation' | 'outreach-sequence' | null
    >(null);
    const [response, setResponse] = useState<N8NResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Service control integration
    const { isServiceAvailable, services } = useServiceControlStore();

    // Available N8N Tools for JetVision Agent
    const availableN8NTools = {
        apollo_tools: [
            {
                name: 'search-leads',
                description:
                    'Find prospects by job title, industry, company size, location with customizable limits',
                parameters: [
                    'job_titles',
                    'company_size',
                    'locations',
                    'industries',
                    'email_status',
                    'limit',
                ],
            },
            {
                name: 'enrich-contact',
                description: 'Enhance contact profiles using email or LinkedIn URL',
                parameters: ['email', 'linkedin_url', 'fields_to_enrich'],
            },
            {
                name: 'create-email-sequence',
                description: 'Set up automated email campaigns with templates and timing',
                parameters: ['contacts', 'sequence_name', 'email_templates', 'timing'],
            },
            {
                name: 'create-contact',
                description: 'Add new prospects to your CRM with complete profile data',
                parameters: ['contact_data', 'source', 'tags'],
            },
            {
                name: 'create-deal',
                description: 'Generate new sales opportunities with value and stage tracking',
                parameters: ['contact_id', 'deal_value', 'stage', 'pipeline'],
            },
            {
                name: 'get-api-usage',
                description: 'Retrieve current API consumption and rate limit statistics',
                parameters: [],
            },
        ],
        avinode_tools: [
            {
                name: 'search-aircraft',
                description:
                    'Find available aircraft matching specific criteria for charter requests',
                parameters: [
                    'departure_airport',
                    'arrival_airport',
                    'departure_date',
                    'passengers',
                    'aircraft_type',
                ],
            },
            {
                name: 'create-charter-request',
                description:
                    'Create new charter booking request with client details and preferences',
                parameters: [
                    'client_info',
                    'flight_details',
                    'aircraft_preferences',
                    'special_requests',
                ],
            },
            {
                name: 'get-pricing',
                description: 'Get detailed pricing for specific routes and aircraft configurations',
                parameters: ['route', 'aircraft_type', 'date', 'duration', 'additional_services'],
            },
            {
                name: 'get-empty-legs',
                description: 'Find discounted positioning flights and empty leg opportunities',
                parameters: ['departure_location', 'radius', 'date_range', 'aircraft_category'],
            },
            {
                name: 'get-operator-info',
                description:
                    'Retrieve detailed information about aircraft operators and fleet status',
                parameters: ['operator_id', 'include_fleet', 'include_safety_record'],
            },
            {
                name: 'get-fleet-utilization',
                description: 'Analyze fleet performance metrics and utilization rates',
                parameters: ['time_period', 'aircraft_ids', 'metrics'],
            },
        ],
        gmail_tools: [
            {
                name: 'send-outreach-email',
                description: 'Send personalized outreach emails to prospects with tracking',
                parameters: ['to', 'subject', 'message', 'template_id', 'tracking_enabled'],
            },
        ],
        knowledge_base_tools: [
            {
                name: 'jetvision-knowledge-search',
                description:
                    'Search JetVision knowledge base for operational procedures and client information',
                parameters: ['query', 'category', 'limit'],
            },
        ],
    };

    // Filter tools based on service availability
    const filteredN8NTools = useMemo(() => {
        const filtered: typeof availableN8NTools = {};

        if (isServiceAvailable('apollo')) {
            filtered.apollo_tools = availableN8NTools.apollo_tools;
        }

        if (isServiceAvailable('avinode')) {
            filtered.avinode_tools = availableN8NTools.avinode_tools;
        }

        // N8N and Gmail tools are always available (they don't depend on external services)
        filtered.gmail_tools = availableN8NTools.gmail_tools;
        filtered.knowledge_base_tools = availableN8NTools.knowledge_base_tools;

        return filtered;
    }, [isServiceAvailable]);

    // Filter Apollo prompt cards based on service availability
    const filteredApolloCards = useMemo(() => {
        return isServiceAvailable('apollo') ? apolloPromptCards : [];
    }, [isServiceAvailable]);

    // Filter tools from prompt cards based on service availability
    const filterPromptCardTools = (promptCard: any) => {
        const availableTools =
            promptCard.suggested_tools?.filter((tool: string) => {
                // Apollo tools require apollo service
                if (availableN8NTools.apollo_tools?.some((t: any) => t.name === tool)) {
                    return isServiceAvailable('apollo');
                }
                // Avinode tools require avinode service
                if (availableN8NTools.avinode_tools?.some((t: any) => t.name === tool)) {
                    return isServiceAvailable('avinode');
                }
                // Other tools are always available
                return true;
            }) || [];

        return {
            ...promptCard,
            suggested_tools: availableTools,
            tool_sequence:
                promptCard.tool_sequence?.filter((step: string) => {
                    // Filter out steps that mention unavailable tools
                    const stepLower = step.toLowerCase();
                    if (!isServiceAvailable('apollo') && stepLower.includes('apollo')) return false;
                    if (!isServiceAvailable('avinode') && stepLower.includes('avinode'))
                        return false;
                    return true;
                }) || [],
        };
    };

    // Apollo Lead Generation Prompt Cards
    const apolloPromptCards = [
        {
            id: 'apollo-1',
            category: 'apollo',
            title: 'Weekly Conversions',
            prompt: 'Analyze prospect to booking conversions this week',
            fullPrompt:
                "As a JetVision sales analytics specialist, analyze this week's conversion funnel from Apollo.io prospects to confirmed charter bookings. Track: 1) Total prospects engaged via Apollo campaigns, 2) Email open rates and click-through rates by campaign, 3) Meeting/call conversion rate from email engagement, 4) Quote requests generated from meetings, 5) Confirmed bookings with revenue attribution. Segment analysis by: Industry vertical (Finance, Tech, Entertainment, Healthcare), Company size (SMB, Mid-market, Enterprise), Decision maker role (C-suite, EA, Travel Manager), Campaign type (Cold outreach, Nurture, Win-back). Calculate: Cost per acquisition from Apollo spend, Average deal size by segment, Time to conversion (first touch to booking), and ROI by campaign. Compare to previous week and monthly averages. Identify top-performing messages and sequences for scaling.",
            description: 'Track conversion metrics from campaigns to bookings',
            icon: 'IconRocket',
            parameters: {
                timeframe: 'current_week',
                metrics: ['open_rate', 'ctr', 'meeting_rate', 'quote_rate', 'booking_rate'],
                segments: ['industry', 'company_size', 'role', 'campaign_type'],
                calculations: ['cpa', 'deal_size', 'conversion_time', 'roi'],
            },
            suggested_tools: ['get-api-usage', 'search-leads', 'jetvision-knowledge-search'],
            tool_sequence: [
                '1. Call get-api-usage to check Apollo API consumption',
                '2. Call search-leads with timeframe filters for current week prospects',
                '3. Call jetvision-knowledge-search for conversion benchmarks',
                '4. Analyze data and calculate ROI metrics',
            ],
        },
        {
            id: 'apollo-2',
            category: 'apollo',
            title: 'Lead Generation',
            prompt: 'Generate qualified leads for private aviation services',
            fullPrompt:
                'As a JetVision lead generation specialist, use Apollo.io to find qualified prospects for private jet charter services. Target: Executive assistants, travel coordinators, and C-suite executives at companies with 101-1000 employees in major metropolitan areas (LA, NYC, SF, Miami, Chicago). Focus on: Technology companies, private equity firms, investment banks, entertainment companies, and luxury brands. Requirements: Verified email addresses only, exclude virtual assistants and teachers, prioritize recent funding or growth indicators. Generate lead list with: Contact details, company information, recent news/achievements, estimated travel budget, decision maker hierarchy, and personalization hooks for outreach.',
            description: 'Find high-quality prospects using Apollo.io targeting',
            icon: 'IconTarget',
            parameters: {
                target_roles: ['executive_assistant', 'travel_coordinator', 'c_suite'],
                company_size: ['101-200', '201-500', '501-1000'],
                locations: ['los_angeles', 'new_york', 'san_francisco', 'miami', 'chicago'],
                industries: [
                    'technology',
                    'private_equity',
                    'investment_banking',
                    'entertainment',
                    'luxury',
                ],
                email_status: 'verified',
            },
            suggested_tools: ['search-leads', 'enrich-contact', 'create-contact'],
            tool_sequence: [
                '1. Call search-leads with specified targeting criteria',
                '2. Call enrich-contact for each prospect to get additional data',
                '3. Call create-contact to add qualified leads to CRM',
                '4. Generate personalization hooks and outreach recommendations',
            ],
        },
    ];

    // Outreach Sequence Prompt Cards
    const outreachPromptCards = [
        {
            id: 'outreach-1',
            category: 'outreach',
            title: 'Email Sequence Builder',
            prompt: 'Create personalized outreach email sequence',
            fullPrompt:
                'As a JetVision email marketing specialist, create a 4-email outreach sequence for private jet charter services targeting executive assistants at high-growth companies. Sequence structure: Email 1 (Day 1): Warm introduction with company-specific achievement mention, value proposition for executive travel efficiency, soft CTA asking about travel planning challenges. Email 2 (Day 3): Case study of similar company using JetVision, empty leg opportunity mention, testimonial from satisfied client, calendar link CTA. Email 3 (Day 7): Urgency element with limited aircraft availability on popular routes, membership program benefits, exclusive pricing mention, direct booking CTA. Email 4 (Day 14): Professional break-up email with final value offer, alternative contact suggestion, referral request, future engagement door-opener. Include A/B test variations for subject lines and personalization variables for company name, executive name, location, industry, and recent company news.',
            description: 'Build multi-touch email campaigns with personalization',
            icon: 'IconMail',
            parameters: {
                sequence_length: 4,
                cadence: [1, 3, 7, 14],
                email_types: ['introduction', 'value_add', 'urgency', 'breakup'],
                personalization: [
                    'company_name',
                    'executive_name',
                    'location',
                    'industry',
                    'recent_news',
                ],
                ab_testing: ['subject_lines', 'send_times', 'cta_buttons'],
            },
            suggested_tools: [
                'create-email-sequence',
                'enrich-contact',
                'get-empty-legs',
                'send-outreach-email',
            ],
            tool_sequence: [
                '1. Call enrich-contact to gather personalization data for prospects',
                '2. Call get-empty-legs to find current empty leg opportunities for urgency emails',
                '3. Call create-email-sequence to set up automated 4-email campaign',
                '4. Call send-outreach-email for immediate first-touch emails',
            ],
        },
        {
            id: 'outreach-2',
            category: 'outreach',
            title: 'Charter Quote Outreach',
            prompt: 'Create charter quote follow-up sequence',
            fullPrompt:
                "As a JetVision charter specialist, create a follow-up email sequence for prospects who have received charter quotes but haven't booked yet. Email sequence: 1) Immediate follow-up (same day): Thank for interest, confirm quote details, address common concerns about private aviation, provide testimonial, soft CTA for questions. 2) Day 2: Market update on aircraft availability, mention similar routes booked by other clients, highlight exclusive membership benefits, calendar link CTA. 3) Day 5: Limited-time pricing incentive, showcase aircraft amenities and safety features, provide case study of executive productivity gains, booking CTA. 4) Day 10: Final pricing confirmation, alternative aircraft options, referral program introduction, maintain relationship for future needs. Include dynamic pricing alerts, competitor comparison, and seasonal demand indicators.",
            description: 'Follow up on charter quotes to increase conversion rates',
            icon: 'IconPlane',
            parameters: {
                sequence_length: 4,
                cadence: [0, 2, 5, 10],
                focus: [
                    'quote_confirmation',
                    'availability_update',
                    'pricing_incentive',
                    'relationship_building',
                ],
                personalization: [
                    'quote_details',
                    'route_specifics',
                    'aircraft_preferences',
                    'timeline',
                ],
                tools_needed: ['pricing', 'aircraft_availability', 'competitor_analysis'],
            },
            suggested_tools: [
                'get-pricing',
                'search-aircraft',
                'create-deal',
                'send-outreach-email',
            ],
            tool_sequence: [
                '1. Call get-pricing to verify current market rates for quoted routes',
                '2. Call search-aircraft to check real-time availability updates',
                '3. Call create-deal to track the opportunity in CRM',
                '4. Call send-outreach-email with personalized follow-up content',
            ],
        },
    ];

    // Create payload with prompt card data including available tools
    const createLeadGenerationPayload = (promptCard: any): WorkflowTestPayload => {
        const sessionId = uuidv4();
        return {
            sessionId,
            message: promptCard.fullPrompt,
            context: {
                source: 'jetvision-workflow-tester',
                timestamp: new Date().toISOString(),
                workflowType: 'lead-generation',
                parameters: {
                    promptCard: promptCard,
                    apollo: promptCard.parameters,
                    suggested_tools: promptCard.suggested_tools,
                    tool_sequence: promptCard.tool_sequence,
                },
                available_tools: filteredN8NTools,
                execution_strategy: {
                    primary_tools: promptCard.suggested_tools,
                    execution_order: promptCard.tool_sequence,
                    fallback_tools: ['jetvision-knowledge-search'],
                    max_tool_calls: 10,
                    parallel_execution: false,
                },
            },
        };
    };

    // Create outreach payload with prompt card data including available tools
    const createOutreachSequencePayload = (promptCard: any): WorkflowTestPayload => {
        const sessionId = uuidv4();
        return {
            sessionId,
            message: promptCard.fullPrompt,
            context: {
                source: 'jetvision-workflow-tester',
                timestamp: new Date().toISOString(),
                workflowType: 'outreach-sequence',
                parameters: {
                    promptCard: promptCard,
                    outreach: promptCard.parameters,
                    suggested_tools: promptCard.suggested_tools,
                    tool_sequence: promptCard.tool_sequence,
                },
                available_tools: filteredN8NTools,
                execution_strategy: {
                    primary_tools: promptCard.suggested_tools,
                    execution_order: promptCard.tool_sequence,
                    fallback_tools: ['jetvision-knowledge-search', 'send-outreach-email'],
                    max_tool_calls: 15,
                    parallel_execution: true,
                },
            },
        };
    };

    const sendWorkflowRequest = async (payload: WorkflowTestPayload) => {
        setLoading(true);
        setError(null);
        setResponse(null);

        try {
            console.log('Sending workflow request:', payload);

            // Generate session ID for n8n memory persistence
            const sessionId = uuidv4();
            const timestamp = new Date().toISOString();

            // Create the payload structure that matches expected n8n webhook format
            const n8nPayload = {
                sessionId: sessionId,
                threadId: payload.sessionId, // Keep original for compatibility
                timestamp: timestamp,
                body: {
                    threadId: payload.sessionId,
                    sessionId: sessionId,
                    message: payload.message,
                    context: payload.context,
                },
                // Include the prompt card data in the root for easy access
                promptCard: payload.context.parameters?.promptCard,
                // Add execution metadata
                execution: {
                    id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: timestamp,
                    source: 'jetvision-workflow-tester',
                },
            };

            console.log('N8N Payload with sessionId:', n8nPayload);

            // Send to the n8n webhook endpoint
            const webhookResponse = await fetch('/api/n8n-webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(n8nPayload),
            });

            if (!webhookResponse.ok) {
                throw new Error(`HTTP error! status: ${webhookResponse.status}`);
            }

            const responseText = await webhookResponse.text();
            console.log('Raw response:', responseText);

            // Try to parse as JSON, fallback to text
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch {
                responseData = {
                    status: 'processing',
                    message: responseText,
                    executionId: 'generated-' + Date.now(),
                    timestamp: new Date().toISOString(),
                };
            }

            setResponse(responseData);
        } catch (err) {
            console.error('Workflow request error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Render service unavailable message
    const renderServiceUnavailable = (serviceName: string, serviceId: string) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 py-12 text-center"
        >
            <div className="mx-auto max-w-md">
                <div className="mb-4">
                    <ServiceStatusIndicator
                        status={services[serviceId]?.status || 'disabled'}
                        size="lg"
                    />
                </div>
                <h3 className="text-muted-foreground mb-2 text-lg font-medium">
                    {serviceName} Service Unavailable
                </h3>
                <p className="text-muted-foreground mb-4 text-sm">
                    The {serviceName} service is currently disabled. Enable it in the Service
                    Control settings to access these workflows and prompts.
                </p>
                <div className="bg-muted/50 mb-4 rounded-lg p-4">
                    <p className="text-muted-foreground text-xs">
                        <strong>Service Status:</strong> {services[serviceId]?.status || 'disabled'}
                    </p>
                    {services[serviceId]?.errorMessage && (
                        <p className="mt-1 text-xs text-red-500">
                            <strong>Error:</strong> {services[serviceId].errorMessage}
                        </p>
                    )}
                </div>
                <p className="text-muted-foreground text-xs">
                    Go to Settings → Service Control to manage service availability
                </p>
            </div>
        </motion.div>
    );

    const renderPromptCard = (promptCard: any, category: 'apollo' | 'outreach') => {
        const filteredCard = filterPromptCardTools(promptCard);

        return (
            <motion.div
                key={promptCard.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group cursor-pointer"
            >
                <div className="border-border bg-background hover:bg-secondary/30 rounded-xl border p-6 transition-all duration-200">
                    <div className="mb-4 flex items-start gap-4">
                        <div className="text-2xl">
                            {filteredCard.icon === 'IconRocket'
                                ? '🚀'
                                : filteredCard.icon === 'IconTarget'
                                  ? '🎯'
                                  : filteredCard.icon === 'IconMail'
                                    ? '✉️'
                                    : '⚡'}
                        </div>
                        <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2">
                                <h3 className="text-foreground text-lg font-semibold">
                                    {filteredCard.title}
                                </h3>
                                <span className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs">
                                    {filteredCard.category}
                                </span>
                            </div>
                            <p className="text-muted-foreground mb-3 text-sm">
                                {filteredCard.description}
                            </p>
                            <p className="text-foreground mb-3 text-sm font-medium">
                                "{filteredCard.prompt}"
                            </p>
                        </div>
                    </div>

                    {/* Suggested Tools Section */}
                    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-blue-800 dark:text-blue-200">
                            🛠️ Available N8N Tools
                        </h4>
                        <div className="mb-3 flex flex-wrap gap-1">
                            {filteredCard.suggested_tools?.map((tool: string, index: number) => (
                                <span
                                    key={index}
                                    className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                >
                                    {tool}
                                </span>
                            ))}
                            {filteredCard.suggested_tools?.length === 0 && (
                                <span className="text-xs text-red-500">
                                    No available tools - required services are disabled
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-300">
                            <strong>Execution Sequence:</strong>
                            <ul className="mt-1 list-inside list-disc">
                                {filteredCard.tool_sequence?.map((step: string, index: number) => (
                                    <li key={index} className="ml-2">
                                        {step}
                                    </li>
                                ))}
                            </ul>
                            {filteredCard.tool_sequence?.length === 0 && (
                                <p className="mt-1 text-red-500">
                                    No available steps - required services are disabled
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-secondary/20 mb-4 rounded-lg p-4">
                        <h4 className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                            📋 Prompt Card Structure
                        </h4>
                        <pre className="bg-background max-h-40 overflow-x-auto rounded p-3 text-xs">
                            {JSON.stringify(filteredCard, null, 2)}
                        </pre>
                    </div>

                    <button
                        onClick={() => {
                            const payload =
                                category === 'apollo'
                                    ? createLeadGenerationPayload(filteredCard)
                                    : createOutreachSequencePayload(filteredCard);
                            sendWorkflowRequest(payload);
                        }}
                        disabled={loading || filteredCard.suggested_tools?.length === 0}
                        className={cn(
                            'w-full rounded-lg px-4 py-2 font-medium transition-colors',
                            filteredCard.suggested_tools?.length === 0
                                ? 'cursor-not-allowed bg-gray-400 text-gray-600'
                                : 'bg-primary hover:bg-primary/90 text-primary-foreground',
                            'disabled:cursor-not-allowed disabled:opacity-50'
                        )}
                    >
                        {loading
                            ? 'Testing Workflow...'
                            : filteredCard.suggested_tools?.length === 0
                              ? 'No Available Tools'
                              : 'Test N8N Workflow'}
                    </button>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="mx-auto max-w-6xl p-6">
            <div className="mb-8">
                <h1 className="text-foreground mb-2 text-2xl font-bold">N8N Workflow Tester</h1>
                <p className="text-muted-foreground">
                    Test JetVision Agent n8n workflows with structured JSON payloads for lead
                    generation and outreach sequences.
                </p>
            </div>

            <div className="mb-8 space-y-8">
                <div>
                    <div className="mb-4 flex items-center gap-3">
                        <h2 className="text-foreground text-xl font-semibold">
                            Apollo.io Lead Generation Prompts
                        </h2>
                        <ServiceStatusIndicator
                            status={services.apollo?.status || 'disabled'}
                            showLabel
                            size="sm"
                        />
                    </div>
                    {filteredApolloCards.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {filteredApolloCards.map(promptCard =>
                                renderPromptCard(promptCard, 'apollo')
                            )}
                        </div>
                    ) : (
                        <div className="border-muted rounded-xl border border-dashed">
                            {renderServiceUnavailable('Apollo.io', 'apollo')}
                        </div>
                    )}
                </div>

                <div>
                    <div className="mb-4 flex items-center gap-3">
                        <h2 className="text-foreground text-xl font-semibold">
                            Outreach Sequence Prompts
                        </h2>
                        <ServiceStatusIndicator status="enabled" showLabel size="sm" />
                        <span className="text-muted-foreground text-xs">(Always Available)</span>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {outreachPromptCards.map(promptCard =>
                            renderPromptCard(promptCard, 'outreach')
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {response && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mb-6"
                    >
                        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
                            <div className="mb-2 flex items-center gap-2">
                                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
                                <h3 className="font-semibold text-green-800 dark:text-green-200">
                                    Workflow Response Received
                                </h3>
                            </div>
                            <div className="bg-background rounded-lg p-3">
                                <pre className="overflow-x-auto text-sm">
                                    {JSON.stringify(response, null, 2)}
                                </pre>
                            </div>
                            <div className="mt-3 text-sm text-green-700 dark:text-green-300">
                                <p>
                                    <strong>Execution ID:</strong> {response.executionId}
                                </p>
                                <p>
                                    <strong>Status:</strong> {response.status}
                                </p>
                                <p>
                                    <strong>Timestamp:</strong> {response.timestamp}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mb-6"
                    >
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
                            <div className="mb-2 flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                                <h3 className="font-semibold text-red-800 dark:text-red-200">
                                    Workflow Error
                                </h3>
                            </div>
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    </motion.div>
                )}

                {loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="mb-6"
                    >
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
                            <div className="flex items-center gap-3">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                                <p className="font-medium text-blue-800 dark:text-blue-200">
                                    Processing workflow request...
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detailed Payload Documentation */}
            <div className="mt-12 space-y-8">
                <div>
                    <h2 className="text-foreground mb-4 text-xl font-semibold">
                        Payload Structure Documentation
                    </h2>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="bg-secondary/20 rounded-lg p-6">
                            <h3 className="text-foreground mb-3 font-semibold">
                                Lead Generation Parameters
                            </h3>
                            <ul className="text-muted-foreground space-y-2 text-sm">
                                <li>
                                    • <strong>sessionId:</strong> Unique identifier for workflow
                                    tracking
                                </li>
                                <li>
                                    • <strong>apollo.searchCriteria:</strong> Job titles, company
                                    size, location, industries
                                </li>
                                <li>
                                    • <strong>apollo.limits:</strong> Record limits and pagination
                                </li>
                                <li>
                                    • <strong>apollo.enrichment:</strong> Additional data fields to
                                    retrieve
                                </li>
                                <li>
                                    • <strong>targeting:</strong> Lead prioritization and scoring
                                </li>
                                <li>
                                    • <strong>workflow:</strong> Automation flags and integrations
                                </li>
                            </ul>
                        </div>

                        <div className="bg-secondary/20 rounded-lg p-6">
                            <h3 className="text-foreground mb-3 font-semibold">
                                Outreach Sequence Parameters
                            </h3>
                            <ul className="text-muted-foreground space-y-2 text-sm">
                                <li>
                                    • <strong>campaign:</strong> Campaign metadata and configuration
                                </li>
                                <li>
                                    • <strong>sequence.emails:</strong> Email templates with timing
                                    and CTAs
                                </li>
                                <li>
                                    • <strong>personalization:</strong> Dynamic fields and
                                    contextual triggers
                                </li>
                                <li>
                                    • <strong>abTesting:</strong> A/B test configurations
                                </li>
                                <li>
                                    • <strong>tracking:</strong> Performance targets and KPIs
                                </li>
                                <li>
                                    • <strong>automation:</strong> Response handling and
                                    integrations
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="bg-secondary/10 mb-6 rounded-lg p-6">
                    <h3 className="text-foreground mb-3 font-semibold">
                        🔧 Available N8N Tools for JetVision Agent
                    </h3>
                    <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(filteredN8NTools).map(([category, tools]) => (
                            <div key={category} className="bg-background rounded-lg p-4">
                                <h4 className="text-foreground mb-2 text-sm font-semibold capitalize">
                                    {category.replace('_', ' ')}
                                </h4>
                                <ul className="space-y-1">
                                    {tools.map((tool: any, index: number) => (
                                        <li key={index} className="text-muted-foreground text-xs">
                                            <code className="bg-secondary/50 text-foreground rounded px-1">
                                                {tool.name}
                                            </code>
                                            <br />
                                            <span className="text-xs">{tool.description}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-secondary/10 rounded-lg p-6">
                    <h3 className="text-foreground mb-3 font-semibold">
                        📡 Expected N8N Workflow Response
                    </h3>
                    <pre className="bg-background overflow-x-auto rounded p-4 text-sm">
                        {`{
  "status": "processing",
  "message": "Request received and being processed",
  "executionId": "execution_12345",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "workflowId": "workflow_67890",
  "sessionId": "session_uuid"
}`}
                    </pre>
                    <p className="text-muted-foreground mt-3 text-sm">
                        The workflow returns an immediate acknowledgment with an executionId for
                        real-time tracking. The actual processing happens asynchronously through the
                        n8n Agent system with access to all available tools.
                    </p>
                </div>
            </div>
        </div>
    );
};
