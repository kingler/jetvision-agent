import { test, expect, Page } from '@playwright/test';
import { N8NHelper, waitForN8NResponse, verifyChatResponse } from '../utils/n8n-helpers';

/**
 * Prompt-Based Test Scenarios
 * Tests using specific prompts from prompts.md file
 *
 * Test Coverage:
 * 1. Jet Charter Operations (jet-1 to jet-4)
 * 2. Apollo Campaign Management (apollo-1 to apollo-4)
 * 3. Travel Planning & Coordination (travel-1 to travel-4)
 * 4. Lead Generation & Targeting (lead-1 to lead-4)
 * 5. Analytics & Insights (analytics-1 to analytics-4)
 * 6. Session memory with follow-up questions
 * 7. Prompt parameter extraction and processing
 * 8. Expected output format validation
 */

test.describe('Prompt-Based Test Scenarios', () => {
    const WEBHOOK_URL = 'https://n8n.vividwalls.blog/webhook/jetvision-agent';
    const FRONTEND_URL = 'http://localhost:3000';
    let n8nHelper: N8NHelper;

    test.beforeEach(async ({ page }) => {
        n8nHelper = new N8NHelper(page, {
            webhookUrl: WEBHOOK_URL,
            delayMs: 1000,
        });

        await n8nHelper.startMonitoring();
        await page.goto(FRONTEND_URL);
        await expect(page.locator('[data-chat-input="true"]')).toBeVisible();
    });

    test.afterEach(async ({ page }) => {
        await n8nHelper.resetMocks();
    });

    test.describe('Jet Charter Operations Scenarios (jet-1 to jet-4)', () => {
        test('jet-1: Aircraft Availability - Miami to New York tomorrow', async ({ page }) => {
            const scenario = {
                id: 'jet-1',
                category: 'Charter',
                prompt: 'Check aircraft availability for Miami to New York tomorrow',
                expectedParameters: {
                    departure: 'MIA',
                    arrival: ['JFK', 'LGA', 'TEB'],
                    date: 'tomorrow',
                    aircraftCategories: ['light', 'midsize', 'heavy'],
                },
                expectedResponse:
                    /aircraft|availability|Miami|New York|Gulfstream|Citation|hourly rate/i,
            };

            await testPromptScenario(page, scenario);

            // Test follow-up questions for session memory
            const followUps = [
                'Show me pricing for the G650 options',
                'What about passenger capacity?',
                'Include empty leg opportunities',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(page, followUp, /pricing|passenger|capacity|empty leg/i);
            }
        });

        test('jet-2: Empty Legs - Find opportunities for this weekend', async ({ page }) => {
            const scenario = {
                id: 'jet-2',
                category: 'Charter',
                prompt: 'Find empty leg opportunities for this weekend',
                expectedParameters: {
                    dateRange: 'this_weekend',
                    minDiscount: 40,
                    routes: ['popular', 'northeast', 'florida', 'westcoast', 'texas'],
                    sortBy: 'discount_percentage',
                },
                expectedResponse: /empty leg|repositioning|weekend|discount|40%|savings/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Focus on Northeast Corridor routes',
                'Show me deals with 50% or higher discounts',
                'What are the passenger capacities for these options?',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /northeast|corridor|50%|discount|passenger/i
                );
            }
        });

        test('jet-3: Fleet Utilization - Analyze metrics for this month', async ({ page }) => {
            const scenario = {
                id: 'jet-3',
                category: 'Charter',
                prompt: 'Analyze fleet utilization metrics for this month',
                expectedParameters: {
                    period: 'current_month',
                    metrics: ['utilization_rate', 'revenue_per_hour', 'downtime', 'aog'],
                    benchmarks: { target: 85, comparison: ['previous_month', 'year_over_year'] },
                },
                expectedResponse: /fleet|utilization|metrics|85%|revenue|downtime|AOG/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Which aircraft are underutilized?',
                'Compare to industry benchmarks',
                'Recommend optimization strategies',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /underutilized|benchmark|optimization|strategy/i
                );
            }
        });

        test('jet-4: Heavy Jets - Search for 12 passengers to London Tuesday', async ({ page }) => {
            const scenario = {
                id: 'jet-4',
                category: 'Charter',
                prompt: 'Search heavy jets for 12 passengers to London Tuesday',
                expectedParameters: {
                    passengerCount: 12,
                    destination: 'London',
                    preferredAirports: ['Farnborough', 'Luton'],
                    date: 'next_tuesday',
                    aircraftTypes: [
                        'Gulfstream G650',
                        'Gulfstream G550',
                        'Global 6000',
                        'Global 7500',
                        'Falcon 7X',
                        'Falcon 8X',
                    ],
                    requirements: ['transatlantic_range', 'wifi', 'sleeping_config'],
                },
                expectedResponse:
                    /heavy jet|12 passenger|London|Tuesday|Gulfstream|G650|transatlantic|6000nm/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Include catering and ground transportation',
                'What are the total trip costs including international fees?',
                'Show me operator safety ratings',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /catering|ground transport|total cost|international fee|safety rating/i
                );
            }
        });
    });

    test.describe('Apollo Campaign Management Scenarios (apollo-1 to apollo-4)', () => {
        test('apollo-1: Weekly Conversions - Analyze prospect to booking conversions', async ({
            page,
        }) => {
            const scenario = {
                id: 'apollo-1',
                category: 'Apollo',
                prompt: 'Analyze prospect to booking conversions this week',
                expectedParameters: {
                    timeframe: 'current_week',
                    metrics: ['open_rate', 'ctr', 'meeting_rate', 'quote_rate', 'booking_rate'],
                    segments: ['industry', 'company_size', 'role', 'campaign_type'],
                    calculations: ['cpa', 'deal_size', 'conversion_time', 'roi'],
                },
                expectedResponse:
                    /conversion|prospect|booking|funnel|open rate|meeting|ROI|analytics/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Break down by industry vertical',
                'Show me the best performing campaigns',
                'Compare to previous week',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /industry|vertical|campaign|performance|previous week/i
                );
            }
        });

        test('apollo-2: EA Engagement - Identify top engaged executive assistants', async ({
            page,
        }) => {
            const scenario = {
                id: 'apollo-2',
                category: 'Apollo',
                prompt: 'Identify top engaged executive assistants from campaigns',
                expectedParameters: {
                    role: 'executive_assistant',
                    limit: 50,
                    engagementMetrics: ['opens', 'clicks', 'replies', 'forwards'],
                    enrichment: ['company_data', 'executive_profile', 'travel_patterns'],
                    analysis: ['content_performance', 'timing_optimization', 'sentiment'],
                },
                expectedResponse:
                    /executive assistant|engaged|email engagement|top 50|opens|clicks|replies/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Focus on private equity firms',
                'What content topics drove highest engagement?',
                'Create personalized outreach templates',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /private equity|content|engagement|personalized|outreach/i
                );
            }
        });

        test('apollo-3: Finance Campaigns - Analyze finance sector performance', async ({
            page,
        }) => {
            const scenario = {
                id: 'apollo-3',
                category: 'Apollo',
                prompt: 'Analyze finance sector campaign performance metrics',
                expectedParameters: {
                    industry: 'finance',
                    subsectors: [
                        'investment_banking',
                        'private_equity',
                        'hedge_funds',
                        'venture_capital',
                        'family_offices',
                    ],
                    metrics: ['response_rate', 'open_rate', 'meeting_rate', 'conversion_rate'],
                    geographic: ['NYC', 'SF', 'Chicago', 'London'],
                    analysis: ['message_performance', 'timing', 'objections'],
                },
                expectedResponse:
                    /finance|sector|campaign|performance|investment banking|private equity|hedge fund/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Compare investment banking vs private equity response rates',
                'What are the best performing subject lines?',
                'Show seasonal patterns around earnings season',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /investment banking|private equity|subject line|seasonal|earnings/i
                );
            }
        });

        test('apollo-4: VIP Campaign - Design for top 100 qualified prospects', async ({
            page,
        }) => {
            const scenario = {
                id: 'apollo-4',
                category: 'Apollo',
                prompt: 'Design VIP campaign for top 100 qualified prospects',
                expectedParameters: {
                    campaignType: 'vip',
                    prospectCount: 100,
                    scoring: {
                        minRevenue: 500000000,
                        roles: ['c_suite', 'ea'],
                        engagement: 'high',
                    },
                    channels: ['email', 'linkedin', 'direct_mail'],
                    offers: ['complimentary_flight', 'white_glove_onboarding', 'dedicated_account'],
                    sequence: { days: 14, touchpoints: 5, personalization: 'advanced' },
                },
                expectedResponse:
                    /VIP|campaign|top 100|qualified|prospects|multi-channel|sequence|personalized/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Set up behavioral triggers and tracking',
                'Include exclusive VIP offers',
                'Configure Slack notifications for engagement',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /behavioral|trigger|tracking|VIP|offer|Slack|notification/i
                );
            }
        });
    });

    test.describe('Travel Planning & Coordination Scenarios (travel-1 to travel-4)', () => {
        test('travel-1: Multi-City Planning - Tech executive roadshow across 5 cities', async ({
            page,
        }) => {
            const scenario = {
                id: 'travel-1',
                category: 'Travel',
                prompt: 'Plan tech executive roadshow across 5 cities',
                expectedParameters: {
                    cities: ['San Francisco', 'Seattle', 'Austin', 'New York', 'Boston'],
                    duration: '7_days',
                    requirements: ['morning_arrival', 'fbo_conference', 'ground_transport'],
                    services: ['catering', 'wifi', 'concierge', 'hotels'],
                    optimization: ['crew_scheduling', 'positioning', 'timezone'],
                },
                expectedResponse:
                    /tech executive|roadshow|5 cities|SF|Seattle|Austin|NYC|Boston|7 days/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Optimize for time zones and jet lag mitigation',
                'Include FBO preferences with conference facilities',
                'Generate master itinerary with mobile integration',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /time zone|jet lag|FBO|conference|master itinerary|mobile/i
                );
            }
        });

        test('travel-2: Weather Routes - Optimize to avoid delays this week', async ({ page }) => {
            const scenario = {
                id: 'travel-2',
                category: 'Travel',
                prompt: 'Optimize routes to avoid weather delays this week',
                expectedParameters: {
                    timeframe: 'this_week',
                    analysis: ['current_conditions', 'forecasts', 'turbulence', 'alternates'],
                    regions: ['east_coast', 'midwest', 'mountain', 'west_coast'],
                    factors: ['fronts', 'thunderstorms', 'winter_weather', 'visibility'],
                    outputs: ['primary_routes', 'alternates', 'timing', 'confidence'],
                },
                expectedResponse:
                    /optimize|routes|weather|delay|week|forecast|turbulence|alternate/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Focus on East Coast operations',
                'Show me alternate routing options',
                'Include turbulence forecasts and ride quality',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /east coast|alternate|routing|turbulence|forecast|ride quality/i
                );
            }
        });

        test('travel-3: Industry Patterns - Analyze entertainment travel trends', async ({
            page,
        }) => {
            const scenario = {
                id: 'travel-3',
                category: 'Travel',
                prompt: 'Analyze entertainment industry seasonal travel trends',
                expectedParameters: {
                    industry: 'entertainment',
                    timeframe: 'seasonal',
                    events: ['awards', 'festivals', 'production'],
                    routes: ['LA-NYC', 'LA-Cannes', 'NYC-London', 'LA-Toronto'],
                    analysis: [
                        'peak_periods',
                        'aircraft_preferences',
                        'lead_times',
                        'group_travel',
                    ],
                    predictions: ['demand_spikes', 'pricing', 'positioning'],
                },
                expectedResponse:
                    /entertainment|industry|seasonal|travel|trends|award season|festival|production/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Focus on award season travel patterns',
                'Show me festival circuit demand spikes',
                'Predict upcoming production schedule impacts',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /award season|travel pattern|festival|circuit|production|schedule/i
                );
            }
        });

        test("travel-4: Ground Transport - Arrange for tomorrow's flights", async ({ page }) => {
            const scenario = {
                id: 'travel-4',
                category: 'Travel',
                prompt: "Arrange complete ground transportation for tomorrow's flights",
                expectedParameters: {
                    date: 'tomorrow',
                    services: ['luxury_vehicles', 'chauffeurs', 'meet_greet', 'luggage'],
                    coordination: ['flight_tracking', 'pickup_timing', 'backup_vehicles'],
                    special: ['security', 'pets', 'medical', 'vip_handling'],
                    confirmation: ['24_7_contact', 'communication_protocol'],
                },
                expectedResponse:
                    /ground transportation|tomorrow|luxury vehicle|chauffeur|meet greet|flight tracking/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Include executive security requirements',
                'Add pet transportation arrangements',
                'Set up real-time flight tracking coordination',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /executive security|pet transportation|real-time|flight tracking/i
                );
            }
        });
    });

    test.describe('Lead Generation & Targeting Scenarios (lead-1 to lead-4)', () => {
        test('lead-1: PE Assistants - Find at NYC private equity firms', async ({ page }) => {
            const scenario = {
                id: 'lead-1',
                category: 'Leads',
                prompt: 'Find executive assistants at NYC private equity firms',
                expectedParameters: {
                    location: 'New York City',
                    industry: 'private_equity',
                    minimumAUM: 1000000000,
                    role: 'executive_assistant',
                    supporting: ['Partner', 'MD', 'C-suite'],
                    count: 20,
                    filters: ['tenure_6m+', 'no_recent_outreach', 'email_available'],
                },
                expectedResponse:
                    /executive assistant|NYC|private equity|firm|Partner|MD|C-suite|AUM/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Filter for firms with $1B+ AUM',
                "Show me their executives' travel patterns",
                'Export to Apollo campaign with personalized templates',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /1B|AUM|executive|travel pattern|Apollo|campaign|personalized/i
                );
            }
        });

        test('lead-2: Job Changes - Track in target accounts last 30 days', async ({ page }) => {
            const scenario = {
                id: 'lead-2',
                category: 'Leads',
                prompt: 'Track job changes in target accounts last 30 days',
                expectedParameters: {
                    timeframe: 'last_30_days',
                    changes: ['new_hire', 'promotion', 'role_change'],
                    levels: ['VP+', 'executive_assistant', 'travel_manager'],
                    prioritization: ['existing_accounts', 'funded_companies', 'key_markets'],
                    engagement: { sequence: '21_day', touchpoints: 4 },
                },
                expectedResponse:
                    /job change|target account|30 days|new hire|promotion|VP|executive assistant|travel manager/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Prioritize high-growth companies with fresh funding',
                'Create segmented engagement campaigns',
                'Set up congratulations sequence for new hires',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /high-growth|fresh funding|segmented|engagement|congratulations|sequence/i
                );
            }
        });

        test('lead-3: Decision Makers - Map at Fortune 500 companies', async ({ page }) => {
            const scenario = {
                id: 'lead-3',
                category: 'Leads',
                prompt: 'Map decision makers at Fortune 500 companies',
                expectedParameters: {
                    companyType: 'fortune_500',
                    roles: [
                        'economic_buyer',
                        'user_buyer',
                        'technical_buyer',
                        'influencer',
                        'champion',
                    ],
                    mapping: ['hierarchy', 'budget_process', 'travel_policy', 'spend'],
                    intelligence: ['leadership_changes', 'events', 'competitors', 'renewals'],
                    output: 'account_plan',
                },
                expectedResponse:
                    /decision maker|Fortune 500|economic buyer|user buyer|technical buyer|influencer|champion/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Identify economic buyers with budget authority',
                'Map reporting structure and hierarchy',
                'Build multi-threaded account engagement strategies',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /economic buyer|budget authority|reporting structure|hierarchy|multi-threaded/i
                );
            }
        });

        test('lead-4: Web Visitors - Identify high-intent from pricing page', async ({ page }) => {
            const scenario = {
                id: 'lead-4',
                category: 'Leads',
                prompt: 'Identify high-intent visitors from pricing page',
                expectedParameters: {
                    page: 'pricing',
                    timeframe: 'this_week',
                    tracking: ['page_flow', 'time_spent', 'downloads', 'return_visits'],
                    scoring: {
                        'Pricing View': 20,
                        Calculator: 30,
                        'Multiple Sessions': 15,
                        'Company Match': 25,
                        'Form Started': 40,
                    },
                    enrichment: ['apollo_match', 'crm_check', 'intent_score'],
                },
                expectedResponse:
                    /high-intent|visitor|pricing page|lead scoring|calculator|company match|intent score/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Show me calculator usage patterns',
                'Match visitors to Apollo.io profiles',
                'Trigger automated nurture for high-intent scores',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /calculator|usage pattern|Apollo|profile|automated|nurture|high-intent/i
                );
            }
        });
    });

    test.describe('Analytics & Insights Scenarios (analytics-1 to analytics-4)', () => {
        test('analytics-1: Conversion Trends - Compare with last quarter', async ({ page }) => {
            const scenario = {
                id: 'analytics-1',
                category: 'Analytics',
                prompt: 'Compare conversion rates with last quarter',
                expectedParameters: {
                    comparison: 'last_quarter',
                    funnel: ['lead_to_mql', 'mql_to_sql', 'sql_to_opp', 'opp_to_won', 'overall'],
                    sources: ['apollo', 'inbound', 'partner', 'event', 'expansion'],
                    segments: ['industry', 'deal_size', 'aircraft_type', 'rep', 'response_time'],
                    analysis: ['significance', 'confidence', 'seasonality', 'projection'],
                },
                expectedResponse:
                    /conversion rate|last quarter|funnel|lead to MQL|MQL to SQL|opportunity|closed won/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Break down by lead source and industry',
                'Show statistically significant changes',
                'Project end-of-quarter performance',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /lead source|industry|statistically significant|project|end-of-quarter/i
                );
            }
        });

        test('analytics-2: Campaign ROI - Calculate by type and industry vertical', async ({
            page,
        }) => {
            const scenario = {
                id: 'analytics-2',
                category: 'Analytics',
                prompt: 'Calculate ROI by campaign type and industry vertical',
                expectedParameters: {
                    metrics: ['costs', 'revenue', 'ltv', 'indirect_value', 'time_to_roi'],
                    campaignTypes: ['email', 'linkedin', 'webinar', 'direct_mail', 'paid'],
                    industries: [
                        'financial',
                        'technology',
                        'healthcare',
                        'entertainment',
                        'manufacturing',
                    ],
                    attribution: ['first_touch', 'last_touch', 'multi_touch'],
                    calculations: ['cac', 'payback', 'ltv_cac', 'velocity'],
                },
                expectedResponse:
                    /ROI|campaign type|industry vertical|costs|revenue|LTV|CAC|payback|attribution/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Show attribution model comparison',
                'Calculate customer lifetime value by segment',
                'Provide optimization recommendations with projected impact',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /attribution|model|lifetime value|segment|optimization|recommendation|projected/i
                );
            }
        });

        test('analytics-3: Message Performance - Analyze email templates and messaging', async ({
            page,
        }) => {
            const scenario = {
                id: 'analytics-3',
                category: 'Analytics',
                prompt: 'Analyze top performing email templates and messaging',
                expectedParameters: {
                    metrics: ['open_rate', 'ctr', 'reply_rate', 'meeting_rate', 'unsub_rate'],
                    templates: [
                        'cold_outreach',
                        'follow_up',
                        're_engagement',
                        'event',
                        'case_study',
                    ],
                    tests: ['subject_line', 'length', 'value_prop', 'social_proof', 'cta'],
                    insights: ['power_words', 'personalization', 'timing', 'device_optimization'],
                    output: 'optimization_roadmap',
                },
                expectedResponse:
                    /email template|messaging|open rate|click-through|reply rate|A\/B test|optimization/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Focus on A/B test results for subject lines',
                'Show me power words that drive engagement',
                'Create template optimization roadmap with expected lift',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /A\/B test|subject line|power word|engagement|optimization|roadmap|expected lift/i
                );
            }
        });

        test('analytics-4: Executive Briefing - Generate Monday morning report', async ({
            page,
        }) => {
            const scenario = {
                id: 'analytics-4',
                category: 'Analytics',
                prompt: 'Generate comprehensive Monday executive briefing',
                expectedParameters: {
                    sections: [
                        'weekend_highlights',
                        'week_ahead',
                        'kpis',
                        'strategic_updates',
                        'action_items',
                    ],
                    metrics: ['bookings', 'revenue', 'utilization', 'nps', 'pipeline'],
                    timeframe: 'monday_morning',
                    format: 'executive_5min',
                    delivery: ['email', 'slack', 'dashboard'],
                },
                expectedResponse:
                    /executive briefing|Monday morning|weekend highlight|week ahead|KPI|strategic update|action item/i,
            };

            await testPromptScenario(page, scenario);

            // Follow-up questions
            const followUps = [
                'Include critical customer communications',
                'Show fleet utilization and revenue per hour',
                'Highlight blockers requiring executive attention',
            ];

            for (const followUp of followUps) {
                await testFollowUpQuestion(
                    page,
                    followUp,
                    /customer communication|fleet utilization|revenue per hour|blocker|executive attention/i
                );
            }
        });
    });

    test.describe('Session Memory and Context Retention', () => {
        test('should maintain context across multi-turn conversations', async ({ page }) => {
            let sessionContext: any[] = [];

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();
                sessionContext.push({
                    message: payload.message,
                    sessionId: payload.sessionId,
                    threadId: payload.threadId,
                });

                // Simulate context-aware responses
                let response = 'Processing your request';

                if (sessionContext.length === 1) {
                    response = 'Found 3 Gulfstream G650 aircraft available for Miami to NYC route';
                } else if (
                    sessionContext.length === 2 &&
                    payload.message.toLowerCase().includes('pricing')
                ) {
                    response =
                        'Pricing for the G650 options: N123GS at $8,500/hr, N456GS at $9,200/hr, N789GS at $8,800/hr';
                } else if (
                    sessionContext.length === 3 &&
                    payload.message.toLowerCase().includes('book')
                ) {
                    response =
                        'Which specific G650 would you prefer? Please specify the tail number or hourly rate.';
                } else if (sessionContext.length === 4) {
                    response =
                        'Booking confirmed for N123GS (Gulfstream G650) at $8,500/hr for Miami to NYC tomorrow';
                }

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: response,
                        sessionContext: sessionContext,
                        status: 'success',
                    }),
                });
            });

            // Multi-turn conversation with context
            const conversation = [
                'Check aircraft availability for Miami to New York tomorrow',
                'Show me pricing for those G650 options',
                'Book one of those aircraft',
                'The first one at $8,500 per hour',
            ];

            for (const message of conversation) {
                await page.fill('[contenteditable="true"]', message);
                await page.click('button[type="submit"]');
                await page.waitForTimeout(2000);
                await page.fill('[contenteditable="true"]', '');
            }

            // Verify context was maintained
            expect(sessionContext.length).toBe(4);

            // All messages should have same session ID
            const sessionIds = sessionContext.map(ctx => ctx.sessionId);
            const uniqueSessions = new Set(sessionIds);
            expect(uniqueSessions.size).toBe(1);

            // Verify responses show context understanding
            const responses = await page.locator('[data-testid="chat-message"]').allTextContents();
            const aiResponses = responses.filter((_, index) => index % 2 === 1); // Odd indices are AI responses

            expect(aiResponses[0]).toContain('3 Gulfstream G650');
            expect(aiResponses[1]).toContain('$8,500/hr');
            expect(aiResponses[2]).toContain('Which specific G650');
            expect(aiResponses[3]).toContain('Booking confirmed for N123GS');
        });

        test('should handle complex parameter extraction from prompts', async ({ page }) => {
            let extractedParameters: any[] = [];

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();

                // Mock parameter extraction
                let params = {};
                const message = payload.message.toLowerCase();

                if (
                    message.includes('gulfstream g650') &&
                    message.includes('12 passengers') &&
                    message.includes('london')
                ) {
                    params = {
                        aircraftType: 'Gulfstream G650',
                        passengerCount: 12,
                        destination: 'London',
                        date: 'Tuesday',
                        requirements: ['transatlantic_range', 'wifi', 'catering'],
                    };
                }

                extractedParameters.push(params);

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: `Parameters extracted: ${JSON.stringify(params)}`,
                        extractedParams: params,
                        status: 'success',
                    }),
                });
            });

            const complexPrompt =
                'Search heavy jets like Gulfstream G650 for 12 passengers to London next Tuesday with transatlantic range, WiFi, and catering';

            await page.fill('[contenteditable="true"]', complexPrompt);
            await page.click('button[type="submit"]');
            await page.waitForTimeout(2000);

            expect(extractedParameters.length).toBe(1);
            expect(extractedParameters[0]).toHaveProperty('aircraftType');
            expect(extractedParameters[0]).toHaveProperty('passengerCount');
            expect(extractedParameters[0]).toHaveProperty('destination');
        });
    });

    // Helper functions
    async function testPromptScenario(page: Page, scenario: any) {
        let capturedPayload: any = null;

        await page.route(WEBHOOK_URL + '**', async (route, request) => {
            capturedPayload = request.postDataJSON();

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: `Processed ${scenario.id}: ${scenario.prompt}`,
                    promptId: scenario.id,
                    category: scenario.category,
                    status: 'success',
                }),
            });
        });

        await page.fill('[contenteditable="true"]', scenario.prompt);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);

        // Verify payload was captured
        expect(capturedPayload).toBeTruthy();
        expect(capturedPayload.message).toBe(scenario.prompt);

        // Verify response pattern if specified
        if (scenario.expectedResponse) {
            const responseText = await page
                .locator('[data-testid="chat-message"]')
                .nth(1)
                .textContent();
            expect(responseText).toMatch(scenario.expectedResponse);
        }

        // Verify prompt classification if available
        if (capturedPayload.promptId) {
            expect(capturedPayload.promptId).toBe(scenario.id);
        }

        return capturedPayload;
    }

    async function testFollowUpQuestion(page: Page, followUp: string, expectedPattern: RegExp) {
        await page.fill('[contenteditable="true"]', followUp);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);

        // Verify follow-up response
        const messages = await page.locator('[data-testid="chat-message"]').all();
        const lastResponse = await messages[messages.length - 1].textContent();

        expect(lastResponse).toMatch(expectedPattern);

        // Clear input for next test
        await page.fill('[contenteditable="true"]', '');
        await page.waitForTimeout(500);
    }
});
