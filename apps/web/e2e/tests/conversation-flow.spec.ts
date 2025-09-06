import { test, expect, Page } from '@playwright/test';
import { N8NHelper, waitForN8NResponse, verifyChatResponse } from '../utils/n8n-helpers';

/**
 * Comprehensive Conversation Flow Tests
 * Tests conversation flows across different prompt categories with system prompt activation
 *
 * Test Coverage:
 * 1. Jet Charter Operations (availability, pricing, booking)
 * 2. Apollo Campaign Management (leads, campaigns, analytics)
 * 3. Travel Planning & Coordination (multi-city, weather, ground transport)
 * 4. Lead Generation & Targeting (segments, job changes, decision makers)
 * 5. Analytics & Insights (conversions, ROI, performance)
 * 6. System prompt activation and context switching
 * 7. Follow-up questions maintaining context
 */

test.describe('Conversation Flow Tests', () => {
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

    test.describe('Jet Charter Operations Flows', () => {
        test('should handle aircraft availability conversation flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Check aircraft availability for Miami to New York tomorrow',
                    expectedPromptId: 'jet-1',
                    expectedContext: 'charter',
                    expectedResponse: /aircraft|availability|Miami|New York|tomorrow/i,
                },
                {
                    input: 'Show me pricing for the Gulfstream options',
                    expectedContext: 'charter',
                    expectedResponse: /pricing|gulfstream|hourly rate|total cost/i,
                },
                {
                    input: 'What about passenger capacity for each option?',
                    expectedContext: 'charter',
                    expectedResponse: /passenger|capacity|seating|configuration/i,
                },
                {
                    input: 'Book the G650 option for 8am departure',
                    expectedContext: 'charter',
                    expectedResponse: /booking|G650|8am|confirmed|reservation/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });

        test('should handle empty legs search conversation flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Find empty leg opportunities for this weekend',
                    expectedPromptId: 'jet-2',
                    expectedContext: 'charter',
                    expectedResponse: /empty leg|repositioning|weekend|discount/i,
                },
                {
                    input: 'Focus on Northeast Corridor routes',
                    expectedContext: 'charter',
                    expectedResponse: /northeast|corridor|BOS|DCA|NYC/i,
                },
                {
                    input: 'What discounts are available?',
                    expectedContext: 'charter',
                    expectedResponse: /discount|savings|40%|percentage/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });

        test('should handle fleet utilization analysis flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Analyze fleet utilization metrics for this month',
                    expectedPromptId: 'jet-3',
                    expectedContext: 'charter',
                    expectedResponse: /fleet|utilization|metrics|percentage/i,
                },
                {
                    input: 'Which aircraft are underutilized?',
                    expectedContext: 'charter',
                    expectedResponse: /underutilized|aircraft|tail number|performance/i,
                },
                {
                    input: 'Recommend optimization strategies',
                    expectedContext: 'charter',
                    expectedResponse: /optimization|strategy|remarketing|pricing/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });

        test('should handle heavy jet international booking flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Search heavy jets for 12 passengers to London Tuesday',
                    expectedPromptId: 'jet-4',
                    expectedContext: 'charter',
                    expectedResponse: /heavy jet|12 passenger|London|Tuesday|transatlantic/i,
                },
                {
                    input: 'Show me Gulfstream G650 options specifically',
                    expectedContext: 'charter',
                    expectedResponse: /gulfstream|G650|range|nonstop/i,
                },
                {
                    input: 'Include catering and ground transport',
                    expectedContext: 'charter',
                    expectedResponse: /catering|ground transport|FBO|customs/i,
                },
                {
                    input: 'Get total cost including international fees',
                    expectedContext: 'charter',
                    expectedResponse: /total cost|international fee|fuel surcharge/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });
    });

    test.describe('Apollo Campaign Management Flows', () => {
        test('should handle weekly conversions analysis flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Analyze prospect to booking conversions this week',
                    expectedPromptId: 'apollo-1',
                    expectedContext: 'apollo',
                    expectedResponse: /conversion|prospect|booking|week|funnel/i,
                },
                {
                    input: 'Break down by industry vertical',
                    expectedContext: 'apollo',
                    expectedResponse: /industry|vertical|finance|tech|healthcare/i,
                },
                {
                    input: 'Which campaigns performed best?',
                    expectedContext: 'apollo',
                    expectedResponse: /campaign|performance|ROI|open rate/i,
                },
                {
                    input: 'Show me specific metrics for finance segment',
                    expectedContext: 'apollo',
                    expectedResponse: /finance|metrics|conversion rate|deal size/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });

        test('should handle executive assistant engagement flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Identify top engaged executive assistants from campaigns',
                    expectedPromptId: 'apollo-2',
                    expectedContext: 'apollo',
                    expectedResponse: /executive assistant|engaged|email engagement|top/i,
                },
                {
                    input: 'Focus on private equity firms',
                    expectedContext: 'apollo',
                    expectedResponse: /private equity|PE|investment|fund/i,
                },
                {
                    input: 'What content topics drove highest engagement?',
                    expectedContext: 'apollo',
                    expectedResponse: /content|topics|engagement|safety|convenience/i,
                },
                {
                    input: 'Create personalized outreach list',
                    expectedContext: 'apollo',
                    expectedResponse: /personalized|outreach|list|talking points/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });

        test('should handle finance sector campaign analysis flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Analyze finance sector campaign performance metrics',
                    expectedPromptId: 'apollo-3',
                    expectedContext: 'apollo',
                    expectedResponse: /finance|sector|campaign|performance|metrics/i,
                },
                {
                    input: 'Compare investment banking vs private equity response rates',
                    expectedContext: 'apollo',
                    expectedResponse: /investment banking|private equity|response rate|compare/i,
                },
                {
                    input: 'What are the best performing subject lines?',
                    expectedContext: 'apollo',
                    expectedResponse: /subject line|performing|A\/B test|open rate/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });

        test('should handle VIP campaign design flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Design VIP campaign for top 100 qualified prospects',
                    expectedPromptId: 'apollo-4',
                    expectedContext: 'apollo',
                    expectedResponse: /VIP|campaign|top 100|qualified|prospects/i,
                },
                {
                    input: 'Include personalized multi-channel sequence',
                    expectedContext: 'apollo',
                    expectedResponse: /personalized|multi-channel|sequence|email|LinkedIn/i,
                },
                {
                    input: 'Set up behavioral triggers and tracking',
                    expectedContext: 'apollo',
                    expectedResponse: /behavioral|triggers|tracking|Slack|notifications/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });
    });

    test.describe('Travel Planning & Coordination Flows', () => {
        test('should handle multi-city roadshow planning flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Plan tech executive roadshow across 5 cities',
                    expectedPromptId: 'travel-1',
                    expectedContext: 'travel',
                    expectedResponse: /tech executive|roadshow|5 cities|planning/i,
                },
                {
                    input: 'Optimize for time zones and jet lag mitigation',
                    expectedContext: 'travel',
                    expectedResponse: /time zone|jet lag|mitigation|optimization/i,
                },
                {
                    input: 'Include FBO preferences and ground transportation',
                    expectedContext: 'travel',
                    expectedResponse: /FBO|ground transportation|preferences|logistics/i,
                },
                {
                    input: 'Generate master itinerary with mobile integration',
                    expectedContext: 'travel',
                    expectedResponse: /master itinerary|mobile|integration|real-time/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });

        test('should handle weather routing optimization flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Optimize routes to avoid weather delays this week',
                    expectedPromptId: 'travel-2',
                    expectedContext: 'travel',
                    expectedResponse: /optimize|routes|weather|delays|week/i,
                },
                {
                    input: 'Focus on East Coast operations',
                    expectedContext: 'travel',
                    expectedResponse: /east coast|operations|nor\'easter|weather/i,
                },
                {
                    input: 'Provide alternate routing options',
                    expectedContext: 'travel',
                    expectedResponse: /alternate|routing|options|diversions/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });

        test('should handle industry travel patterns analysis flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Analyze entertainment industry seasonal travel trends',
                    expectedPromptId: 'travel-3',
                    expectedContext: 'travel',
                    expectedResponse: /entertainment|industry|seasonal|travel|trends/i,
                },
                {
                    input: 'Focus on award season travel patterns',
                    expectedContext: 'travel',
                    expectedResponse: /award season|travel patterns|Golden Globes|Oscars/i,
                },
                {
                    input: 'Predict upcoming demand spikes',
                    expectedContext: 'travel',
                    expectedResponse: /predict|demand spike|festival|production/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });
    });

    test.describe('Lead Generation & Targeting Flows', () => {
        test('should handle private equity assistant targeting flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Find executive assistants at NYC private equity firms',
                    expectedPromptId: 'lead-1',
                    expectedContext: 'leads',
                    expectedResponse: /executive assistant|NYC|private equity|firms/i,
                },
                {
                    input: 'Filter for firms with $1B+ AUM',
                    expectedContext: 'leads',
                    expectedResponse: /filter|1B|AUM|assets under management/i,
                },
                {
                    input: 'Export to Apollo campaign with personalized templates',
                    expectedContext: 'leads',
                    expectedResponse: /export|Apollo|campaign|personalized|template/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });

        test('should handle job change tracking flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Track job changes in target accounts last 30 days',
                    expectedPromptId: 'lead-2',
                    expectedContext: 'leads',
                    expectedResponse: /track|job change|target account|30 days/i,
                },
                {
                    input: 'Prioritize by high-growth companies with fresh funding',
                    expectedContext: 'leads',
                    expectedResponse: /prioritize|high-growth|fresh funding|companies/i,
                },
                {
                    input: 'Create segmented engagement campaigns',
                    expectedContext: 'leads',
                    expectedResponse: /segmented|engagement|campaign|role|industry/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });

        test('should handle Fortune 500 decision maker mapping flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Map decision makers at Fortune 500 companies',
                    expectedPromptId: 'lead-3',
                    expectedContext: 'leads',
                    expectedResponse: /map|decision maker|Fortune 500|companies/i,
                },
                {
                    input: 'Identify economic and user buyers',
                    expectedContext: 'leads',
                    expectedResponse: /economic buyer|user buyer|CFO|CEO|authority/i,
                },
                {
                    input: 'Build multi-threaded account plans',
                    expectedContext: 'leads',
                    expectedResponse: /multi-threaded|account plan|engagement|strategy/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });
    });

    test.describe('Analytics & Insights Flows', () => {
        test('should handle conversion trends comparison flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Compare conversion rates with last quarter',
                    expectedPromptId: 'analytics-1',
                    expectedContext: 'analytics',
                    expectedResponse: /compare|conversion rate|last quarter/i,
                },
                {
                    input: 'Break down by lead source and industry',
                    expectedContext: 'analytics',
                    expectedResponse: /break down|lead source|industry|segment/i,
                },
                {
                    input: 'Identify statistically significant changes',
                    expectedContext: 'analytics',
                    expectedResponse: /statistically significant|changes|confidence/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });

        test('should handle campaign ROI analysis flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Calculate ROI by campaign type and industry vertical',
                    expectedPromptId: 'analytics-2',
                    expectedContext: 'analytics',
                    expectedResponse: /ROI|campaign type|industry vertical|calculate/i,
                },
                {
                    input: 'Show attribution models comparison',
                    expectedContext: 'analytics',
                    expectedResponse: /attribution|model|first-touch|last-touch|multi-touch/i,
                },
                {
                    input: 'Provide optimization recommendations',
                    expectedContext: 'analytics',
                    expectedResponse: /optimization|recommendation|projected impact/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });

        test('should handle message performance analysis flow', async ({ page }) => {
            const conversationFlow = [
                {
                    input: 'Analyze top performing email templates and messaging',
                    expectedPromptId: 'analytics-3',
                    expectedContext: 'analytics',
                    expectedResponse: /analyze|performing|email template|messaging/i,
                },
                {
                    input: 'Focus on A/B test results for subject lines',
                    expectedContext: 'analytics',
                    expectedResponse: /A\/B test|subject line|results|variation/i,
                },
                {
                    input: 'Create template optimization roadmap',
                    expectedContext: 'analytics',
                    expectedResponse: /template|optimization|roadmap|expected lift/i,
                },
            ];

            await simulateConversationFlow(page, conversationFlow);
        });
    });

    test.describe('System Prompt Activation and Context Switching', () => {
        test('should activate appropriate system prompts based on query intent', async ({
            page,
        }) => {
            const contextSwitches = [
                {
                    input: 'Check aircraft availability for charter flight',
                    expectedPromptCategory: 'charter',
                    expectedSystemPrompt: /JetVision fleet operations specialist/i,
                },
                {
                    input: 'Find executive contacts using Apollo',
                    expectedPromptCategory: 'apollo',
                    expectedSystemPrompt: /JetVision lead generation specialist/i,
                },
                {
                    input: 'Plan multi-city travel itinerary',
                    expectedPromptCategory: 'travel',
                    expectedSystemPrompt: /JetVision travel logistics coordinator/i,
                },
                {
                    input: 'Analyze conversion funnel metrics',
                    expectedPromptCategory: 'analytics',
                    expectedSystemPrompt: /JetVision revenue operations analyst/i,
                },
            ];

            for (const contextSwitch of contextSwitches) {
                await testSystemPromptActivation(page, contextSwitch);

                // Wait between context switches
                await page.waitForTimeout(2000);
                await page.fill('[contenteditable="true"]', '');
            }
        });

        test('should maintain context within same conversation thread', async ({ page }) => {
            let sessionId: string;
            let threadId: string;

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();

                if (!sessionId) {
                    sessionId = payload.sessionId;
                    threadId = payload.threadId;
                }

                // Verify same session/thread maintained
                expect(payload.sessionId).toBe(sessionId);
                expect(payload.threadId).toBe(threadId);

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: `Context maintained for: ${payload.message}`,
                        sessionId: payload.sessionId,
                        threadId: payload.threadId,
                        status: 'success',
                    }),
                });
            });

            // Sequential messages in same context
            const contextualConversation = [
                'I need to book a Gulfstream G650',
                'For next Tuesday morning',
                'From Miami to London',
                'With catering for 8 passengers',
                'What will the total cost be?',
            ];

            for (const message of contextualConversation) {
                await page.fill('[contenteditable="true"]', message);
                await page.click('button[type="submit"]');
                await page.waitForTimeout(1500);
                await page.fill('[contenteditable="true"]', '');
            }
        });

        test('should handle context switching within single conversation', async ({ page }) => {
            const mixedContextFlow = [
                {
                    input: 'Check Gulfstream availability for Miami to NYC',
                    expectedContext: 'avinode',
                    description: 'Aircraft search context',
                },
                {
                    input: 'Now find executive contacts at companies in NYC',
                    expectedContext: 'apollo',
                    description: 'Context switch to lead generation',
                },
                {
                    input: 'Create outreach campaign for those contacts about the flight',
                    expectedContext: 'mixed',
                    description: 'Mixed context combining both',
                },
                {
                    input: 'Show me campaign performance metrics',
                    expectedContext: 'analytics',
                    description: 'Context switch to analytics',
                },
            ];

            await simulateContextSwitchingFlow(page, mixedContextFlow);
        });
    });

    test.describe('Follow-up Questions and Context Retention', () => {
        test('should handle follow-up questions maintaining conversation context', async ({
            page,
        }) => {
            const contextualFollowUps = [
                {
                    initial: 'Find executive assistants at private equity firms',
                    followUps: [
                        'Which ones have the highest email engagement?',
                        'What companies do they work for?',
                        'When were they last contacted?',
                        'Create personalized outreach templates for the top 10',
                    ],
                },
                {
                    initial: 'Check Citation X availability for Dallas to Austin',
                    followUps: [
                        'What about pricing for that route?',
                        'How long is the flight time?',
                        'Are there any empty legs available?',
                        'Book the 2pm departure option',
                    ],
                },
            ];

            for (const scenario of contextualFollowUps) {
                await testFollowUpContext(page, scenario);

                // Reset for next scenario
                await page.reload();
                await expect(page.locator('[data-chat-input="true"]')).toBeVisible();
            }
        });

        test('should maintain conversation history across complex multi-turn dialogues', async ({
            page,
        }) => {
            const conversationHistory: any[] = [];

            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();
                conversationHistory.push({
                    message: payload.message,
                    sessionId: payload.sessionId,
                    threadId: payload.threadId,
                    timestamp: payload.timestamp,
                });

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: `Processing request #${conversationHistory.length}: ${payload.message}`,
                        conversationLength: conversationHistory.length,
                        previousContext: conversationHistory.slice(-2, -1),
                        status: 'success',
                    }),
                });
            });

            // Extended conversation with context dependencies
            const extendedConversation = [
                'I need to plan executive travel for Q4 board meetings',
                'The executives are based in NYC, SF, and Chicago',
                'First meeting is November 15th in London',
                'Second meeting is November 20th in Tokyo',
                'They prefer Gulfstream aircraft for international flights',
                'Book catering for all flights',
                'Also arrange ground transportation in each city',
                'Send confirmation details to their executive assistants',
                'Track all expenses for quarterly budget report',
            ];

            for (let i = 0; i < extendedConversation.length; i++) {
                await page.fill('[contenteditable="true"]', extendedConversation[i]);
                await page.click('button[type="submit"]');
                await page.waitForTimeout(1000);

                // Verify conversation history is building
                expect(conversationHistory.length).toBe(i + 1);

                // All messages should share same session
                if (i > 0) {
                    expect(conversationHistory[i].sessionId).toBe(conversationHistory[0].sessionId);
                    expect(conversationHistory[i].threadId).toBe(conversationHistory[0].threadId);
                }

                await page.fill('[contenteditable="true"]', '');
                await page.waitForTimeout(500);
            }

            // Verify complete conversation history
            expect(conversationHistory.length).toBe(extendedConversation.length);
        });

        test('should handle ambiguous follow-ups with context clarification', async ({ page }) => {
            await page.route(WEBHOOK_URL + '**', async (route, request) => {
                const payload = request.postDataJSON();

                let response = 'Processing your request';

                // Simulate context-aware responses
                if (payload.message.toLowerCase().includes('check availability')) {
                    response = 'Found 3 Gulfstream G650 aircraft available for your route';
                } else if (payload.message.toLowerCase().includes('pricing')) {
                    response = 'Pricing for the G650 options ranges from $8,500-$9,200 per hour';
                } else if (payload.message.toLowerCase().includes('book it')) {
                    response =
                        'Which specific aircraft would you like to book? Please specify the tail number or hourly rate.';
                } else if (payload.message.toLowerCase().includes('the first one')) {
                    response =
                        'Booking N123GS (the first G650 option) for your Miami to NYC flight tomorrow at 8am';
                }

                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        message: response,
                        status: 'success',
                    }),
                });
            });

            // Conversation with ambiguous references
            const ambiguousFlow = [
                'Check availability for Miami to NYC tomorrow',
                'What about pricing?',
                'Book it', // Ambiguous - which one?
                'The first one', // Clarification with context
            ];

            for (const message of ambiguousFlow) {
                await page.fill('[contenteditable="true"]', message);
                await page.click('button[type="submit"]');
                await page.waitForTimeout(2000);
                await page.fill('[contenteditable="true"]', '');
            }

            // Should handle ambiguous "book it" request appropriately
            const messages = await page.locator('[data-testid="chat-message"]').all();
            const responses = await Promise.all(messages.map(msg => msg.textContent()));

            expect(responses.some(r => r?.includes('Which specific aircraft'))).toBe(true);
            expect(responses.some(r => r?.includes('Booking N123GS'))).toBe(true);
        });
    });

    // Helper functions
    async function simulateConversationFlow(page: Page, flow: any[]) {
        const capturedRequests: any[] = [];

        await page.route(WEBHOOK_URL + '**', async (route, request) => {
            const payload = request.postDataJSON();
            capturedRequests.push(payload);

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: `Processed: ${payload.message}`,
                    promptId: flow[capturedRequests.length - 1]?.expectedPromptId,
                    context: flow[capturedRequests.length - 1]?.expectedContext,
                    status: 'success',
                }),
            });
        });

        for (let i = 0; i < flow.length; i++) {
            const step = flow[i];
            await page.fill('[contenteditable="true"]', step.input);
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1500);

            // Verify request was captured
            expect(capturedRequests.length).toBe(i + 1);

            // Verify response pattern if specified
            if (step.expectedResponse) {
                await expect(page.locator(`text=${step.expectedResponse}`)).toBeVisible({
                    timeout: 5000,
                });
            }

            // Clear input for next step
            await page.fill('[contenteditable="true"]', '');
            await page.waitForTimeout(500);
        }

        return capturedRequests;
    }

    async function testSystemPromptActivation(page: Page, testCase: any) {
        let activatedPrompt = '';

        await page.route(WEBHOOK_URL + '**', async (route, request) => {
            const payload = request.postDataJSON();
            activatedPrompt = payload.systemPrompt || '';

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: `System prompt activated for: ${testCase.expectedPromptCategory}`,
                    systemPrompt: activatedPrompt,
                    status: 'success',
                }),
            });
        });

        await page.fill('[contenteditable="true"]', testCase.input);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1500);

        if (testCase.expectedSystemPrompt) {
            expect(activatedPrompt).toMatch(testCase.expectedSystemPrompt);
        }
    }

    async function simulateContextSwitchingFlow(page: Page, flow: any[]) {
        const contextHistory: string[] = [];

        await page.route(WEBHOOK_URL + '**', async (route, request) => {
            const payload = request.postDataJSON();
            const detectedContext = detectContext(payload.message);
            contextHistory.push(detectedContext);

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: `Context switched to: ${detectedContext}`,
                    contextHistory,
                    status: 'success',
                }),
            });
        });

        for (const step of flow) {
            await page.fill('[contenteditable="true"]', step.input);
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1500);
            await page.fill('[contenteditable="true"]', '');
        }

        return contextHistory;
    }

    async function testFollowUpContext(page: Page, scenario: any) {
        const sessionContext: any[] = [];

        await page.route(WEBHOOK_URL + '**', async (route, request) => {
            const payload = request.postDataJSON();
            sessionContext.push({
                message: payload.message,
                sessionId: payload.sessionId,
            });

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: `Context maintained: ${payload.message}`,
                    previousMessages: sessionContext.slice(0, -1),
                    status: 'success',
                }),
            });
        });

        // Send initial message
        await page.fill('[contenteditable="true"]', scenario.initial);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1500);

        // Send follow-up questions
        for (const followUp of scenario.followUps) {
            await page.fill('[contenteditable="true"]', followUp);
            await page.click('button[type="submit"]');
            await page.waitForTimeout(1500);
            await page.fill('[contenteditable="true"]', '');
        }

        // Verify same session maintained throughout
        const sessionIds = sessionContext.map(ctx => ctx.sessionId);
        const uniqueSessions = new Set(sessionIds);
        expect(uniqueSessions.size).toBe(1);
    }

    function detectContext(message: string): string {
        const lowerMessage = message.toLowerCase();

        if (
            lowerMessage.includes('aircraft') ||
            lowerMessage.includes('flight') ||
            lowerMessage.includes('charter')
        ) {
            return 'avinode';
        }
        if (
            lowerMessage.includes('contact') ||
            lowerMessage.includes('lead') ||
            lowerMessage.includes('apollo') ||
            lowerMessage.includes('campaign')
        ) {
            return 'apollo';
        }
        if (
            lowerMessage.includes('travel') ||
            lowerMessage.includes('itinerary') ||
            lowerMessage.includes('planning')
        ) {
            return 'travel';
        }
        if (
            lowerMessage.includes('analytics') ||
            lowerMessage.includes('metrics') ||
            lowerMessage.includes('conversion') ||
            lowerMessage.includes('roi')
        ) {
            return 'analytics';
        }

        return 'general';
    }
});
