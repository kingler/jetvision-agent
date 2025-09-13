import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const N8N_WEBHOOK_URL =
    process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
    'https://n8n.vividwalls.blog/webhook/jetvision-agent';

// Test data for different scenarios
const TEST_SCENARIOS = {
    lead_generation: {
        simple: {
            query: 'Find CEOs of technology companies in San Francisco with 50-200 employees',
            expectedPayload: {
                category: 'lead_generation',
                apollo_job_titles: ['CEO', 'Chief Executive Officer'],
                apollo_industries: ['Software', 'SaaS', 'Technology'],
                apollo_locations: ['San Francisco, CA'],
                apollo_company_size: '50-200',
                apollo_seniority_levels: ['owner', 'c_suite'],
                expected_results: 25,
                enrich_contacts: true,
                routing_tool: 'apollo',
            },
        },
        complex: {
            query: 'I need executives from fintech companies that raised Series B funding in the last 6 months, specifically CFOs and CTOs in NYC or Boston',
            expectedPayload: {
                category: 'lead_generation',
                apollo_job_titles: [
                    'CFO',
                    'Chief Financial Officer',
                    'CTO',
                    'Chief Technology Officer',
                ],
                apollo_industries: ['Fintech', 'Financial Services', 'Banking Technology'],
                apollo_locations: ['New York, NY', 'Boston, MA'],
                apollo_funding_stage: 'series_b',
                apollo_funding_period: 'last_6_months',
                apollo_seniority_levels: ['c_suite'],
                expected_results: 50,
                enrich_contacts: true,
                routing_tool: 'apollo',
            },
        },
        job_changes: {
            query: 'Show me executives who recently joined private jet companies as VPs or directors',
            expectedPayload: {
                category: 'job_change_alerts',
                apollo_job_change_period: 'last_90_days',
                apollo_industries: ['Aviation', 'Private Aviation', 'Business Aviation'],
                apollo_new_titles: ['VP', 'Vice President', 'Director', 'Managing Director'],
                setup_alerts: true,
                routing_tool: 'apollo',
            },
        },
    },

    aircraft_operations: {
        availability: {
            query: 'Check availability for a light jet from Teterboro to Miami next Tuesday for 4 passengers',
            expectedPayload: {
                category: 'aircraft_availability',
                avinode_departure_airport: 'KTEB',
                avinode_arrival_airport: 'KMIA',
                avinode_departure_date: '{{next_tuesday}}',
                avinode_passengers: 4,
                avinode_aircraft_category: 'Light Jet',
                routing_tool: 'avinode',
            },
        },
        empty_legs: {
            query: 'Find empty leg opportunities from the Northeast to Florida this month',
            expectedPayload: {
                category: 'empty_leg_search',
                avinode_departure_region: 'Northeast US',
                avinode_arrival_region: 'Florida',
                avinode_date_range: '{{current_month}}',
                min_discount_percentage: 40,
                routing_tool: 'avinode',
            },
        },
        quote: {
            query: 'Get me a quote for a super midsize jet round trip from Los Angeles to Las Vegas this weekend',
            expectedPayload: {
                category: 'pricing_quote',
                avinode_route: 'KLAX-KLAS',
                avinode_aircraft_category: 'Super Midsize Jet',
                trip_type: 'round_trip',
                avinode_departure_date: '{{this_weekend}}',
                include_all_fees: true,
                include_taxes: true,
                routing_tool: 'avinode',
            },
        },
    },

    combined_scenarios: {
        lead_to_availability: {
            query: 'Find Fortune 500 executives in Chicago who might need jets and show available aircraft from Chicago to NYC next week',
            expectedPayload: {
                category: 'combined_intel',
                apollo_job_titles: ['CEO', 'CFO', 'President', 'EVP'],
                apollo_company_size: '5000+',
                apollo_locations: ['Chicago, IL'],
                avinode_departure_airport: 'KORD',
                avinode_arrival_airport: 'KTEB',
                avinode_date_range: '{{next_week}}',
                avinode_aircraft_category: 'Heavy Jet',
                match_prospects_to_availability: true,
                routing_tool: 'both',
            },
        },
        event_targeting: {
            query: "Who's attending the World Economic Forum in Davos and what jets are available from major US cities?",
            expectedPayload: {
                category: 'event_based_targeting',
                event_name: 'World Economic Forum',
                event_location: 'Davos, Switzerland',
                apollo_attendee_profiles: {
                    job_titles: ['CEO', 'President', 'Managing Director'],
                    company_size: '1000+',
                    industries: ['Finance', 'Technology', 'Healthcare'],
                },
                avinode_routes: ['KTEB-LSZS', 'KORD-LSZS', 'KLAX-LSZS'],
                avinode_capacity_check: true,
                create_campaign: true,
                routing_tool: 'both',
            },
        },
    },

    edge_cases: {
        ambiguous: {
            query: 'I need help with jets',
            expectedResponse: 'clarification_request',
            clarificationQuestions: [
                'Are you looking to book a private jet?',
                'Do you need aircraft availability information?',
                'Are you searching for potential customers?',
            ],
        },
        incomplete: {
            query: 'Book a flight next week',
            expectedResponse: 'data_completion_request',
            missingFields: [
                'departure_airport',
                'arrival_airport',
                'passenger_count',
                'specific_date',
            ],
        },
    },
};

// Helper functions
async function waitForSSEResponse(page: Page, timeout: number = 30000): Promise<any> {
    return await page.waitForFunction(
        () => {
            const messages = document.querySelectorAll('[data-testid="chat-message"]');
            const lastMessage = messages[messages.length - 1];
            return lastMessage && lastMessage.getAttribute('data-status') === 'complete';
        },
        { timeout }
    );
}

async function extractResponseData(page: Page): Promise<any> {
    return await page.evaluate(() => {
        const messages = document.querySelectorAll('[data-testid="chat-message"]');
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) return null;

        return {
            text: lastMessage.querySelector('[data-testid="message-text"]')?.textContent,
            structured: lastMessage.querySelector('[data-testid="structured-data"]')?.textContent,
            status: lastMessage.getAttribute('data-status'),
            timestamp: lastMessage.getAttribute('data-timestamp'),
        };
    });
}

async function sendChatMessage(page: Page, message: string): Promise<void> {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill(message);
    await chatInput.press('Enter');
}

// Setup and teardown
test.beforeEach(async ({ page }) => {
    // Navigate to chat page
    await page.goto(`${BASE_URL}/chat`);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check if chat interface is ready
    await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
});

test.afterEach(async ({ page }) => {
    // Capture screenshot on failure
    if (test.info().status !== 'passed') {
        await page.screenshot({
            path: `test-results/failure-${Date.now()}.png`,
            fullPage: true,
        });
    }
});

// Main test suites
test.describe('N8N Webhook Integration - Lead Generation', () => {
    test('should process simple lead generation query', async ({ page }) => {
        const scenario = TEST_SCENARIOS.lead_generation.simple;

        // Send the query
        await sendChatMessage(page, scenario.query);

        // Wait for the response
        await waitForSSEResponse(page);

        // Extract and validate response
        const response = await extractResponseData(page);
        expect(response).toBeTruthy();
        expect(response.status).toBe('complete');
        expect(response.text).toContain('CEO');
        expect(response.text).toContain('San Francisco');
    });

    test('should handle complex lead generation with multiple criteria', async ({ page }) => {
        const scenario = TEST_SCENARIOS.lead_generation.complex;

        await sendChatMessage(page, scenario.query);
        await waitForSSEResponse(page);

        const response = await extractResponseData(page);
        expect(response).toBeTruthy();
        expect(response.text).toMatch(/CFO|CTO/i);
        expect(response.text).toMatch(/fintech|financial/i);
    });

    test('should track job changes in aviation industry', async ({ page }) => {
        const scenario = TEST_SCENARIOS.lead_generation.job_changes;

        await sendChatMessage(page, scenario.query);
        await waitForSSEResponse(page);

        const response = await extractResponseData(page);
        expect(response).toBeTruthy();
        expect(response.text).toMatch(/VP|Director/i);
    });
});

test.describe('N8N Webhook Integration - Aircraft Operations', () => {
    test('should check aircraft availability', async ({ page }) => {
        const scenario = TEST_SCENARIOS.aircraft_operations.availability;

        await sendChatMessage(page, scenario.query);
        await waitForSSEResponse(page);

        const response = await extractResponseData(page);
        expect(response).toBeTruthy();
        expect(response.text).toContain('Teterboro');
        expect(response.text).toContain('Miami');
        expect(response.text).toMatch(/light jet/i);
    });

    test('should find empty leg opportunities', async ({ page }) => {
        const scenario = TEST_SCENARIOS.aircraft_operations.empty_legs;

        await sendChatMessage(page, scenario.query);
        await waitForSSEResponse(page);

        const response = await extractResponseData(page);
        expect(response).toBeTruthy();
        expect(response.text).toMatch(/empty leg|repositioning/i);
        expect(response.text).toContain('Florida');
    });

    test('should generate pricing quotes', async ({ page }) => {
        const scenario = TEST_SCENARIOS.aircraft_operations.quote;

        await sendChatMessage(page, scenario.query);
        await waitForSSEResponse(page);

        const response = await extractResponseData(page);
        expect(response).toBeTruthy();
        expect(response.text).toMatch(/quote|price|cost/i);
        expect(response.text).toContain('Los Angeles');
        expect(response.text).toContain('Las Vegas');
    });
});

test.describe('N8N Webhook Integration - Combined Scenarios', () => {
    test('should match leads with aircraft availability', async ({ page }) => {
        const scenario = TEST_SCENARIOS.combined_scenarios.lead_to_availability;

        await sendChatMessage(page, scenario.query);
        await waitForSSEResponse(page, 45000); // Longer timeout for combined operations

        const response = await extractResponseData(page);
        expect(response).toBeTruthy();
        expect(response.text).toMatch(/Fortune 500|executive/i);
        expect(response.text).toContain('Chicago');
        expect(response.text).toMatch(/available|aircraft/i);
    });

    test('should target event attendees with flight options', async ({ page }) => {
        const scenario = TEST_SCENARIOS.combined_scenarios.event_targeting;

        await sendChatMessage(page, scenario.query);
        await waitForSSEResponse(page, 45000);

        const response = await extractResponseData(page);
        expect(response).toBeTruthy();
        expect(response.text).toContain('Davos');
        expect(response.text).toMatch(/CEO|President/i);
    });
});

test.describe('N8N Webhook Integration - Edge Cases', () => {
    test('should request clarification for ambiguous queries', async ({ page }) => {
        const scenario = TEST_SCENARIOS.edge_cases.ambiguous;

        await sendChatMessage(page, scenario.query);
        await waitForSSEResponse(page);

        const response = await extractResponseData(page);
        expect(response).toBeTruthy();
        expect(response.text).toMatch(/clarify|specify|help me understand/i);
    });

    test('should request missing information', async ({ page }) => {
        const scenario = TEST_SCENARIOS.edge_cases.incomplete;

        await sendChatMessage(page, scenario.query);
        await waitForSSEResponse(page);

        const response = await extractResponseData(page);
        expect(response).toBeTruthy();
        expect(response.text).toMatch(/departure|arrival|passengers/i);
    });
});

test.describe('N8N Webhook Integration - Performance Tests', () => {
    test('should respond within acceptable time limits', async ({ page }) => {
        const startTime = Date.now();

        await sendChatMessage(page, 'Find CEOs in tech companies');
        await waitForSSEResponse(page);

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(15000); // Should respond within 15 seconds
    });

    test('should handle rapid sequential queries', async ({ page }) => {
        const queries = [
            'Find CEOs in NYC',
            'Check jet availability from LAX to JFK',
            'Get a quote for a midsize jet',
        ];

        for (const query of queries) {
            await sendChatMessage(page, query);
            await waitForSSEResponse(page);

            const response = await extractResponseData(page);
            expect(response).toBeTruthy();
            expect(response.status).toBe('complete');

            // Small delay between queries
            await page.waitForTimeout(1000);
        }
    });
});

test.describe('N8N Webhook Integration - Error Handling', () => {
    test('should handle network errors gracefully', async ({ page, context }) => {
        // Simulate network failure
        await context.route('**/api/n8n-webhook', route => {
            route.abort('failed');
        });

        await sendChatMessage(page, 'Find CEOs in tech');

        // Wait for error message
        await page.waitForSelector('[data-testid="error-message"]', { timeout: 10000 });

        const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
        expect(errorMessage).toMatch(/network|connection|try again/i);
    });

    test('should handle timeout gracefully', async ({ page, context }) => {
        // Simulate slow response
        await context.route('**/api/n8n-webhook', async route => {
            await new Promise(resolve => setTimeout(resolve, 35000));
            route.continue();
        });

        await sendChatMessage(page, 'Find executives');

        // Should show timeout message
        await page.waitForSelector('[data-testid="error-message"]', { timeout: 40000 });

        const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
        expect(errorMessage).toMatch(/timeout|taking longer|slow/i);
    });
});

test.describe('N8N Webhook Integration - SSE Streaming', () => {
    test('should show progressive status updates', async ({ page }) => {
        await sendChatMessage(page, 'Find CEOs and check jet availability');

        // Check for status updates
        const statusUpdates = [];

        // Monitor status changes
        await page.exposeFunction('recordStatus', (status: string) => {
            statusUpdates.push(status);
        });

        await page.evaluate(() => {
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (
                        mutation.type === 'attributes' &&
                        mutation.attributeName === 'data-status'
                    ) {
                        const status = (mutation.target as HTMLElement).getAttribute('data-status');
                        if (status) (window as any).recordStatus(status);
                    }
                });
            });

            const container = document.querySelector('[data-testid="chat-container"]');
            if (container) {
                observer.observe(container, {
                    attributes: true,
                    subtree: true,
                    attributeFilter: ['data-status'],
                });
            }
        });

        await waitForSSEResponse(page);

        // Should have progressed through multiple status states
        expect(statusUpdates).toContain('connecting');
        expect(statusUpdates).toContain('executing');
        expect(statusUpdates).toContain('complete');
    });
});
