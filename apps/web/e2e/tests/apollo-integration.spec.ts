import { test, expect } from '@playwright/test';
import { AuthHelper, quickLogin } from '../utils/auth-helpers';
import { N8NHelper, waitForN8NResponse, verifyChatResponse } from '../utils/n8n-helpers';
import { AviationAssertions } from '../utils/assertions';
import { apolloQueries } from '../fixtures/aviation-queries';
import { getResponseById } from '../fixtures/n8n-responses';

test.describe('Apollo.io Integration Tests', () => {
    let authHelper: AuthHelper;
    let n8nHelper: N8NHelper;
    let aviationAssertions: AviationAssertions;

    test.beforeEach(async ({ page }) => {
        authHelper = new AuthHelper(page);
        n8nHelper = new N8NHelper(page);
        aviationAssertions = new AviationAssertions(page);

        // Setup N8N mocks with Apollo.io responses
        await n8nHelper.setupMocks();

        // Login as sales user (has Apollo permissions)
        await quickLogin(page, 'user');

        // Navigate to chat interface
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test.describe('Lead Generation Workflows', () => {
        test('should find executive assistants at Fortune 500 companies', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');
            const query = apolloQueries.find(q => q.id === 'apollo-exec-assistants-fortune500');

            if (!query) throw new Error('Query not found');

            const startTime = Date.now();

            // Send lead generation query
            await chatInput.fill(query.query);
            await chatInput.press('Enter');

            // Wait for N8N workflow to complete
            await waitForN8NResponse(page, query.timeout);

            // Verify response contains lead data
            await verifyChatResponse(page, query.expectedResponsePattern!);

            // Check response time
            await aviationAssertions.assertResponseTime(
                startTime,
                query.timeout!,
                'Apollo lead search'
            );

            // Verify lead results structure
            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const leadElements = responseMessage.locator(
                '[data-testid="lead-result"], .lead-item, [class*="lead"]'
            );

            if ((await leadElements.count()) > 0) {
                await aviationAssertions.assertValidLeadResults(leadElements.first());
            }
        });

        test('should search for aviation industry executives', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill('Find CEOs in private aviation industry with 100+ employees');
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 20000);

            // Verify aviation-specific results
            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const responseText = await responseMessage.textContent();

            expect(responseText?.toLowerCase()).toMatch(/(aviation|aircraft|jet|charter)/);
            expect(responseText?.toLowerCase()).toMatch(/(ceo|chief executive|president)/);

            // Check for proper contact formatting
            await aviationAssertions.assertAviationDataFormat(responseMessage);
        });

        test('should handle bulk lead enrichment', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill(
                'Enrich these 5 contacts with full profile data and email verification'
            );
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 25000);

            // Verify enrichment results
            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const enrichedContacts = responseMessage.locator(
                '[data-testid="enriched-contact"], .contact-enriched'
            );

            if ((await enrichedContacts.count()) > 0) {
                // Check first enriched contact
                const firstContact = enrichedContacts.first();

                // Should have enhanced data
                const emailElement = firstContact.locator('[data-testid="contact-email"]');
                const phoneElement = firstContact.locator('[data-testid="contact-phone"]');
                const linkedinElement = firstContact.locator('[data-testid="contact-linkedin"]');

                if (await emailElement.isVisible()) {
                    const emailText = await emailElement.textContent();
                    expect(emailText).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
                }
            }
        });

        test('should filter leads by industry and location', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill('Find VPs of Operations in aerospace companies in Texas');
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 18000);

            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const responseText = await responseMessage.textContent();

            // Verify industry filtering
            expect(responseText?.toLowerCase()).toMatch(/(aerospace|aviation|aircraft)/);

            // Verify title filtering
            expect(responseText?.toLowerCase()).toMatch(/(vp|vice president|operations)/);

            // Verify location filtering
            expect(responseText?.toLowerCase()).toMatch(/(texas|tx|dallas|houston|austin)/);
        });
    });

    test.describe('Campaign Management', () => {
        test('should show campaign performance metrics', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');
            const query = apolloQueries.find(q => q.id === 'apollo-campaign-metrics');

            if (!query) throw new Error('Query not found');

            await chatInput.fill(query.query);
            await chatInput.press('Enter');

            await waitForN8NResponse(page, query.timeout);

            // Verify campaign metrics are displayed
            const responseMessage = page.locator('[data-testid="chat-message"]').last();

            // Look for metrics indicators
            const metricsSection = responseMessage.locator(
                '[data-testid="campaign-metrics"], .campaign-stats, [class*="metrics"]'
            );

            if (await metricsSection.isVisible()) {
                await aviationAssertions.assertValidCampaignMetrics(metricsSection);
            }

            // Check for key performance indicators in text
            const responseText = await responseMessage.textContent();
            const metricsPattern = /\d+(\.\d+)?%|open rate|click rate|reply rate|conversion/i;
            expect(responseText).toMatch(metricsPattern);
        });

        test('should create and launch targeted campaigns', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill('Launch targeted campaign for tech companies in aviation sector');
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 25000);

            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const responseText = await responseMessage.textContent();

            // Verify campaign creation confirmation
            expect(responseText?.toLowerCase()).toMatch(/(campaign|created|launched|targeting)/);
            expect(responseText?.toLowerCase()).toMatch(/(tech|technology|aviation)/);

            // Look for campaign details
            const campaignDetails = responseMessage.locator(
                '[data-testid="campaign-details"], .campaign-info'
            );
            if (await campaignDetails.isVisible()) {
                await expect(
                    campaignDetails.locator('[data-testid="campaign-name"]')
                ).toBeVisible();
                await expect(campaignDetails.locator('[data-testid="target-count"]')).toBeVisible();
            }
        });

        test('should manage email sequences', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill(
                'Add these 50 aviation executives to our executive outreach sequence'
            );
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 20000);

            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const responseText = await responseMessage.textContent();

            // Verify sequence enrollment
            expect(responseText?.toLowerCase()).toMatch(/(sequence|enrolled|added|outreach)/);
            expect(responseText?.toLowerCase()).toMatch(/(aviation|executive)/);

            // Check for enrollment confirmation
            expect(responseText).toMatch(/\d+/); // Should contain numbers (contact count)
        });

        test('should optimize campaign targeting', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill(
                'Analyze campaign performance and suggest optimization for aviation leads'
            );
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 30000);

            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const responseText = await responseMessage.textContent();

            // Verify optimization suggestions
            expect(responseText?.toLowerCase()).toMatch(
                /(optimization|optimize|improve|suggestion)/
            );
            expect(responseText?.toLowerCase()).toMatch(/(performance|metrics|results)/);
            expect(responseText?.toLowerCase()).toMatch(/(aviation|aerospace)/);

            // Look for specific recommendations
            const recommendations = responseMessage.locator(
                '[data-testid="recommendations"], .optimization-tips'
            );
            if (await recommendations.isVisible()) {
                const recText = await recommendations.textContent();
                expect(recText?.length).toBeGreaterThan(50); // Should have substantial recommendations
            }
        });
    });

    test.describe('Contact and Account Management', () => {
        test('should create and update contact profiles', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill(
                'Create contact profile for John Smith, CEO at AeroTech Solutions'
            );
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 15000);

            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const responseText = await responseMessage.textContent();

            // Verify contact creation
            expect(responseText?.toLowerCase()).toMatch(/(contact|profile|created)/);
            expect(responseText).toContain('John Smith');
            expect(responseText).toContain('AeroTech Solutions');

            // Check for contact details
            const contactCard = responseMessage.locator(
                '[data-testid="contact-card"], .contact-profile'
            );
            if (await contactCard.isVisible()) {
                await expect(contactCard.locator('[data-testid="contact-name"]')).toBeVisible();
                await expect(contactCard.locator('[data-testid="contact-title"]')).toBeVisible();
                await expect(contactCard.locator('[data-testid="contact-company"]')).toBeVisible();
            }
        });

        test('should search existing contacts with filters', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill(
                'Search contacts from aviation companies contacted in last 30 days'
            );
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 18000);

            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const contactResults = responseMessage.locator(
                '[data-testid="contact-result"], .contact-item'
            );

            if ((await contactResults.count()) > 0) {
                await aviationAssertions.assertValidLeadResults(contactResults.first());

                // Verify time-based filtering
                const responseText = await responseMessage.textContent();
                expect(responseText?.toLowerCase()).toMatch(/(recent|last|30 days|contacted)/);
            }
        });

        test('should manage account-based marketing data', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill('Show account intelligence for Boeing and their key contacts');
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 22000);

            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const responseText = await responseMessage.textContent();

            // Verify account intelligence
            expect(responseText).toContain('Boeing');
            expect(responseText?.toLowerCase()).toMatch(/(account|intelligence|contacts)/);

            // Look for company details
            const companyInfo = responseMessage.locator(
                '[data-testid="company-info"], .account-details'
            );
            if (await companyInfo.isVisible()) {
                // Should have company-specific data
                await aviationAssertions.assertAviationDataFormat(companyInfo);
            }
        });
    });

    test.describe('Data Validation and Quality', () => {
        test('should validate email addresses in lead data', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill(
                'Find and verify email addresses for procurement managers at aerospace companies'
            );
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 25000);

            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const emailElements = responseMessage.locator(
                '[data-testid="contact-email"], .email-address'
            );

            if ((await emailElements.count()) > 0) {
                // Check each email format
                const emails = await emailElements.allTextContents();
                for (const email of emails) {
                    if (email.includes('@')) {
                        expect(email.trim()).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
                    }
                }
            }
        });

        test('should handle data enrichment accuracy', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill(
                'Enrich contact data and validate job titles in aviation industry'
            );
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 20000);

            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const responseText = await responseMessage.textContent();

            // Verify enrichment quality indicators
            expect(responseText?.toLowerCase()).toMatch(/(enriched|validated|verified|accuracy)/);

            // Check for aviation-specific job titles
            const aviationTitles = /(pilot|captain|cfo|ceo|vp|director|manager|coordinator)/i;
            expect(responseText).toMatch(aviationTitles);
        });

        test('should detect and handle duplicate contacts', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill(
                'Find contacts and remove duplicates from aviation executive list'
            );
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 18000);

            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const responseText = await responseMessage.textContent();

            // Verify deduplication process
            expect(responseText?.toLowerCase()).toMatch(/(duplicate|unique|deduplicated|removed)/);

            // Should mention the process
            expect(responseText?.toLowerCase()).toMatch(/(found|identified|processed)/);
        });
    });

    test.describe('Integration Edge Cases', () => {
        test('should handle large result sets', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            await chatInput.fill(
                'Find all executives in aerospace industry across North America (expect 500+ results)'
            );
            await chatInput.press('Enter');

            await waitForN8NResponse(page, 45000); // Longer timeout for large datasets

            const responseMessage = page.locator('[data-testid="chat-message"]').last();
            const responseText = await responseMessage.textContent();

            // Should handle pagination or limiting
            expect(responseText?.toLowerCase()).toMatch(/(results|found|executives)/);

            // Should mention handling large datasets
            expect(responseText?.toLowerCase()).toMatch(/(showing|displaying|first|top)/);
        });

        test('should handle API rate limits gracefully', async ({ page }) => {
            // Simulate rate limiting scenario
            n8nHelper.setFailureRate(0.3); // 30% failure rate to simulate rate limits

            const chatInput = page.locator('[data-testid="chat-input"]');

            // Send multiple rapid requests
            const rapidQueries = ['Quick search 1', 'Quick search 2', 'Quick search 3'];

            for (const query of rapidQueries) {
                await chatInput.fill(query);
                await chatInput.press('Enter');
                await page.waitForTimeout(1000);
            }

            // Wait for responses
            await page.waitForTimeout(15000);

            // Should handle rate limits without complete failure
            const errorMessages = page.locator('[data-testid="error-message"]');
            const errorCount = await errorMessages.count();

            // Some requests might fail, but system should remain stable
            expect(errorCount).toBeLessThan(rapidQueries.length); // Not all should fail
        });

        test('should maintain data consistency across requests', async ({ page }) => {
            const chatInput = page.locator('[data-testid="chat-input"]');

            // First request - get baseline data
            await chatInput.fill('Show me current Apollo.io credit balance');
            await chatInput.press('Enter');
            await waitForN8NResponse(page, 10000);

            // Second request - should maintain consistency
            await chatInput.fill('Show API usage statistics for this session');
            await chatInput.press('Enter');
            await waitForN8NResponse(page, 10000);

            // Verify both responses are coherent
            const messages = page.locator('[data-testid="chat-message"]');
            const messageCount = await messages.count();

            expect(messageCount).toBeGreaterThanOrEqual(4); // 2 user + 2 AI messages

            // Check for consistency indicators
            const lastMessage = messages.last();
            const lastText = await lastMessage.textContent();

            expect(lastText?.toLowerCase()).toMatch(/(usage|statistics|api|session)/);
        });
    });
});
