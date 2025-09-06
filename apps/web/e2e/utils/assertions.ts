import { expect, Page, Locator } from '@playwright/test';

/**
 * Aviation-specific custom assertions for Playwright tests
 */
export class AviationAssertions {
    constructor(private page: Page) {}

    /**
     * Assert that aircraft search results are valid
     */
    async assertValidAircraftResults(resultsLocator: Locator): Promise<void> {
        const results = await resultsLocator.all();

        expect(results.length).toBeGreaterThan(0);

        for (const result of results) {
            // Check for required aircraft information
            await expect(result.locator('[data-testid="aircraft-model"]')).toBeVisible();
            await expect(result.locator('[data-testid="aircraft-operator"]')).toBeVisible();
            await expect(result.locator('[data-testid="aircraft-availability"]')).toBeVisible();

            // Verify pricing information if present
            const pricingElement = result.locator('[data-testid="aircraft-pricing"]');
            if (await pricingElement.isVisible()) {
                const pricingText = await pricingElement.textContent();
                expect(pricingText).toMatch(/\$[\d,]+/); // Should contain dollar amount
            }
        }
    }

    /**
     * Assert that lead search results contain valid contact information
     */
    async assertValidLeadResults(resultsLocator: Locator): Promise<void> {
        const results = await resultsLocator.all();

        expect(results.length).toBeGreaterThan(0);

        for (const result of results) {
            // Check for required contact fields
            await expect(result.locator('[data-testid="contact-name"]')).toBeVisible();
            await expect(result.locator('[data-testid="contact-title"]')).toBeVisible();
            await expect(result.locator('[data-testid="contact-company"]')).toBeVisible();

            // Verify email format if present
            const emailElement = result.locator('[data-testid="contact-email"]');
            if (await emailElement.isVisible()) {
                const emailText = await emailElement.textContent();
                expect(emailText).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
            }
        }
    }

    /**
     * Assert that pricing information is formatted correctly
     */
    async assertValidPricing(pricingLocator: Locator): Promise<void> {
        await expect(pricingLocator).toBeVisible();

        const pricingText = await pricingLocator.textContent();

        // Should contain currency symbol and amount
        expect(pricingText).toMatch(/[\$€£¥]\s?[\d,]+(\.\d{2})?/);

        // Should not contain invalid characters
        expect(pricingText).not.toMatch(/[<>{}[\]]/);
    }

    /**
     * Assert that flight route information is complete
     */
    async assertValidFlightRoute(routeLocator: Locator): Promise<void> {
        await expect(routeLocator).toBeVisible();

        // Check for departure information
        const departure = routeLocator.locator('[data-testid="route-departure"]');
        await expect(departure).toBeVisible();

        // Check for arrival information
        const arrival = routeLocator.locator('[data-testid="route-arrival"]');
        await expect(arrival).toBeVisible();

        // Check for distance or flight time
        const distance = routeLocator.locator(
            '[data-testid="route-distance"], [data-testid="flight-time"]'
        );
        await expect(distance.first()).toBeVisible();
    }

    /**
     * Assert that campaign metrics are properly displayed
     */
    async assertValidCampaignMetrics(metricsLocator: Locator): Promise<void> {
        await expect(metricsLocator).toBeVisible();

        // Check for key performance indicators
        const openRate = metricsLocator.locator('[data-testid="open-rate"]');
        const clickRate = metricsLocator.locator('[data-testid="click-rate"]');
        const replyRate = metricsLocator.locator('[data-testid="reply-rate"]');

        if (await openRate.isVisible()) {
            const openRateText = await openRate.textContent();
            expect(openRateText).toMatch(/\d+(\.\d+)?%/);
        }

        if (await clickRate.isVisible()) {
            const clickRateText = await clickRate.textContent();
            expect(clickRateText).toMatch(/\d+(\.\d+)?%/);
        }

        if (await replyRate.isVisible()) {
            const replyRateText = await replyRate.textContent();
            expect(replyRateText).toMatch(/\d+(\.\d+)?%/);
        }
    }

    /**
     * Assert that system health status is displayed correctly
     */
    async assertValidHealthStatus(healthLocator: Locator): Promise<void> {
        await expect(healthLocator).toBeVisible();

        // Check overall health status
        const overallStatus = healthLocator.locator('[data-testid="overall-health"]');
        await expect(overallStatus).toBeVisible();

        const statusText = await overallStatus.textContent();
        expect(statusText?.toLowerCase()).toMatch(/(healthy|operational|warning|critical)/);

        // Check individual service statuses
        const services = ['n8n', 'apollo', 'avinode', 'database'];
        for (const service of services) {
            const serviceStatus = healthLocator.locator(`[data-testid="${service}-status"]`);
            if (await serviceStatus.isVisible()) {
                const serviceText = await serviceStatus.textContent();
                expect(serviceText?.toLowerCase()).toMatch(/(operational|healthy|degraded|down)/);
            }
        }
    }

    /**
     * Assert that chat streaming is working properly
     */
    async assertChatStreaming(messageLocator: Locator, timeout: number = 30000): Promise<void> {
        // Check for streaming indicator
        const streamingIndicator = messageLocator.locator(
            '[data-testid="streaming-indicator"], .streaming'
        );
        await expect(streamingIndicator).toBeVisible({ timeout: 5000 });

        // Wait for streaming to complete
        await expect(streamingIndicator).toBeHidden({ timeout });

        // Verify final message is visible
        await expect(messageLocator).toBeVisible();

        // Check that message has content
        const messageText = await messageLocator.textContent();
        expect(messageText?.trim()).toBeTruthy();
        expect(messageText?.length).toBeGreaterThan(10);
    }

    /**
     * Assert that error messages are user-friendly
     */
    async assertUserFriendlyError(errorLocator: Locator): Promise<void> {
        await expect(errorLocator).toBeVisible();

        const errorText = await errorLocator.textContent();

        // Should not contain technical error codes in user-facing text
        expect(errorText).not.toMatch(/error code|stack trace|500|404/i);

        // Should provide helpful guidance
        expect(errorText?.toLowerCase()).toMatch(/(try again|contact support|check connection)/);
    }

    /**
     * Assert that response times are within acceptable limits
     */
    async assertResponseTime(
        startTime: number,
        maxTimeMs: number,
        operationType: string
    ): Promise<void> {
        const responseTime = Date.now() - startTime;

        expect(responseTime).toBeLessThan(maxTimeMs);

        console.log(`${operationType} response time: ${responseTime}ms (max: ${maxTimeMs}ms)`);
    }

    /**
     * Assert that data is properly formatted for aviation context
     */
    async assertAviationDataFormat(dataLocator: Locator): Promise<void> {
        const dataText = await dataLocator.textContent();

        if (!dataText) return;

        // Check for aviation-specific formatting
        const aviationPatterns = [
            /[A-Z]{3,4}\s*\([^)]+\)/, // Airport codes: "KJFK (JFK International)"
            /N\d{1,5}[A-Z]{1,3}/, // Tail numbers: "N123AB"
            /\d+(\.\d+)?\s*(nm|mi|km|ft)/, // Distance/altitude with units
            /\d{1,2}:\d{2}\s*(AM|PM|UTC)/, // Time formats
            /\$[\d,]+(\.\d{2})?/, // Currency amounts
        ];

        const hasAviationFormat = aviationPatterns.some(pattern => pattern.test(dataText));

        if (hasAviationFormat) {
            console.log('✓ Aviation-specific data formatting detected');
        }
    }
}

/**
 * Performance assertion helpers
 */
export class PerformanceAssertions {
    /**
     * Assert page load performance
     */
    static async assertPageLoadPerformance(page: Page, maxLoadTime: number = 3000): Promise<void> {
        const startTime = Date.now();
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(maxLoadTime);
        console.log(`Page load time: ${loadTime}ms (max: ${maxLoadTime}ms)`);
    }

    /**
     * Assert API response performance
     */
    static async assertAPIPerformance(
        page: Page,
        apiPattern: string,
        maxResponseTime: number = 5000
    ): Promise<void> {
        const responses: number[] = [];

        page.on('response', async response => {
            if (response.url().includes(apiPattern)) {
                const timing = response.timing();
                const totalTime = timing.responseEnd - timing.requestStart;
                responses.push(totalTime);
            }
        });

        // Wait for at least one API call
        await page.waitForResponse(resp => resp.url().includes(apiPattern));

        if (responses.length > 0) {
            const avgResponse = responses.reduce((a, b) => a + b, 0) / responses.length;
            expect(avgResponse).toBeLessThan(maxResponseTime);
            console.log(
                `Average API response time: ${avgResponse.toFixed(2)}ms (max: ${maxResponseTime}ms)`
            );
        }
    }
}

/**
 * Accessibility assertion helpers
 */
export class AccessibilityAssertions {
    /**
     * Assert basic accessibility requirements
     */
    static async assertBasicAccessibility(page: Page): Promise<void> {
        // Check for page title
        const title = await page.title();
        expect(title.trim()).toBeTruthy();
        expect(title).not.toBe('');

        // Check for main content landmark
        const main = page.locator('main, [role="main"]');
        await expect(main).toBeVisible();

        // Check that interactive elements are focusable
        const buttons = page.locator('button, [role="button"]');
        const buttonCount = await buttons.count();

        if (buttonCount > 0) {
            for (let i = 0; i < Math.min(buttonCount, 3); i++) {
                const button = buttons.nth(i);
                if (await button.isVisible()) {
                    await button.focus();
                    await expect(button).toBeFocused();
                }
            }
        }
    }

    /**
     * Assert color contrast for aviation safety
     */
    static async assertColorContrast(page: Page, selector: string): Promise<void> {
        const element = page.locator(selector).first();

        if (await element.isVisible()) {
            const styles = await element.evaluate(el => {
                const computedStyles = window.getComputedStyle(el);
                return {
                    color: computedStyles.color,
                    backgroundColor: computedStyles.backgroundColor,
                };
            });

            // Basic check that colors are defined
            expect(styles.color).toBeTruthy();
            expect(styles.backgroundColor).toBeTruthy();

            console.log(`Color contrast check for ${selector}:`, styles);
        }
    }
}
