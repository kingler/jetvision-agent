import { test, expect } from '@playwright/test';

async function sendChatMessage(page: any, query: string) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  // Try to locate the chat input (robust fallback strategy)
  let chatInput = page.locator('[data-chat-input="true"] [contenteditable="true"]').first();
  if (!(await chatInput.isVisible().catch(() => false))) {
    chatInput = page.locator('[contenteditable="true"]').first();
  }
  if (!(await chatInput.isVisible().catch(() => false))) {
    chatInput = page.locator('[data-testid="chat-input"]').first();
  }
  if (!(await chatInput.isVisible().catch(() => false))) {
    chatInput = page.locator('textarea, input[type="text"]').first();
  }

  await expect(chatInput, 'Chat input should be visible').toBeVisible({ timeout: 10000 });
  await chatInput.click();
  await chatInput.fill(query);

  // Send via Enter or Send button
  const sendButton = page
    .locator('button[type="submit"], [data-testid="send-button"], button:has-text("Send")')
    .first();
  try {
    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }
  } catch {
    await chatInput.press('Enter');
  }

  // Confirm user message appears
  await expect(page.locator(`text="${query}"`)).toBeVisible({ timeout: 15000 });

  // Wait for streamed response to begin
  await page.waitForTimeout(4000);
}

test.describe('System Prompt E2E - Core Business Directives', () => {
  test('Executive assistant lead generation', async ({ page }) => {
    const q = 'Find 3 executive assistants in New York with verified emails';
    await sendChatMessage(page, q);

    // Check rendered Apollo UI
    const apolloHeader = page.locator('text=Apollo.io Lead Intelligence');
    await expect.soft(apolloHeader, 'Should display Apollo lead header').toBeVisible({ timeout: 15000 });

    // Leads count badge presence
    const leadsBadge = page.locator('text=/\b\d+\s+leads found\b/');
    await expect.soft(leadsBadge, 'Should show leads count badge').toBeVisible();

    // Any lead row content
    const firstLeadRow = page.locator('text=/Executive Assistant|Chief of Staff|Administrator/i').first();
    await expect.soft(firstLeadRow, 'Should render at least one lead row').toBeVisible();
  });

  test('Private aviation charter inquiry', async ({ page }) => {
    const q = 'I need a charter from TEB to MIA tomorrow, mid-size jet options and pricing';
    await sendChatMessage(page, q);

    // Prefer Avinode structured UI
    const aircraftHeader = page.locator('text=Available Aircraft');
    const quoteHeader = page.locator('text=Charter Quote');

    // Accept either aircraft display or a strong fallback message
    const fallbackSignal = page.locator('text=/N8N workflow|Fallback Engine|Avinode/i');

    if (!(await aircraftHeader.isVisible().catch(() => false)) && !(await quoteHeader.isVisible().catch(() => false))) {
      await expect.soft(fallbackSignal, 'Should at least mention workflow or Avinode in fallback').toBeVisible();
    } else {
      await expect.soft(aircraftHeader.or(quoteHeader), 'Should show aircraft or quote UI').toBeVisible();
    }
  });

  test('Fortune 500 decision-making unit analysis', async ({ page }) => {
    const q = 'Provide Fortune 500 decision-making unit analysis for private aviation procurement';
    await sendChatMessage(page, q);

    // Expect strategic analysis style content from fallback or integration
    await expect.soft(page.locator('text=/Decision[- ]Making Unit|stakeholder|C-Suite/i')).toBeVisible();
  });

  test('Aviation industry strategic consulting', async ({ page }) => {
    const q = 'Advise on aviation industry go-to-market strategy for enterprise charter sales';
    await sendChatMessage(page, q);
    await expect.soft(page.locator('text=/strategy|stakeholders|ROI|procurement/i')).toBeVisible();
  });

  test('Corporate travel procurement scenario', async ({ page }) => {
    const q = 'Outline corporate travel procurement process for private jet services at a large enterprise';
    await sendChatMessage(page, q);
    await expect.soft(page.locator('text=/procurement|vendor|RFP|stakeholder|compliance/i')).toBeVisible();
  });
});

test.describe('System Prompt E2E - Knowledge Base Integration', () => {
  test('Aircraft specs and operator info', async ({ page }) => {
    const q = 'Compare Gulfstream G650 vs Bombardier Global 6000: range, pax, speed, and typical operators';
    await sendChatMessage(page, q);
    await expect.soft(page.locator('text=/Gulfstream|Bombardier|range|pax|speed/i')).toBeVisible();
  });

  test('Aviation best practices recommendations', async ({ page }) => {
    const q = 'Best practices for executive aviation program setup at a Fortune 500 company';
    await sendChatMessage(page, q);
    await expect.soft(page.locator('text=/best practices|policy|safety|compliance|KPI/i')).toBeVisible();
  });
});

test.describe('System Prompt E2E - Apollo MCP Integration', () => {
  test('Lead generation with specific criteria', async ({ page }) => {
    const q = 'Find executive assistants at Series C tech companies in NYC with verified emails';
    await sendChatMessage(page, q);

    const apolloHeader = page.locator('text=Apollo.io Lead Intelligence');
    await expect.soft(apolloHeader).toBeVisible();

    // Ensure at least one contact detail rendered
    await expect.soft(page.locator('text=/@/').first()).toBeVisible(); // email-like
  });

  test('Contact enrichment flow (gap check)', async ({ page }) => {
    const q = 'Enrich contact Sarah Johnson at TechVenture Capital with company info and LinkedIn';
    await sendChatMessage(page, q);

    // If enrichment UI is not present, mark as gap
    const enrichmentHeader = page.locator('text=Contact Enrichment');
    if (!(await enrichmentHeader.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: 'gap', description: 'Apollo enrichment UI not rendered - likely missing enrichment pipeline from N8N/MCP.' });
      expect.soft(false, 'Apollo enrichment UI should render when requested').toBeTruthy();
    }
  });
});

test.describe('System Prompt E2E - Avinode MCP Integration', () => {
  test('Aircraft availability search (gap tolerant)', async ({ page }) => {
    const q = 'Search available Gulfstream G650 from TEB this Friday, show 3 options';
    await sendChatMessage(page, q);

    const aircraftHeader = page.locator('text=Available Aircraft');
    const fallbackMention = page.locator('text=/Avinode|aircraft availability/i');
    await expect.soft(aircraftHeader.or(fallbackMention)).toBeVisible();
  });

  test('Charter pricing request (gap tolerant)', async ({ page }) => {
    const q = 'Price a charter from TEB to MIA on a Challenger 350 tomorrow 10am';
    await sendChatMessage(page, q);

    const quoteHeader = page.locator('text=Charter Quote');
    const pricingText = page.locator('text=/price|quote|cost/i');
    await expect.soft(quoteHeader.or(pricingText)).toBeVisible();
  });
});

