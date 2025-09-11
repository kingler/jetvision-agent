#!/usr/bin/env tsx
/**
 * N8N Webhook Fix Tool
 * Morpheus Validator - Direct Solution Implementation
 * "The time has come to make a choice."
 */

import { writeFileSync } from 'fs';

// Configuration
const N8N_WEBHOOK_URL = "https://n8n.vividwalls.blog/webhook/jetvision-agent";
const TIMEOUT = 30000;

function logInfo(message: string): void {
    console.log(`[INFO] ${message}`);
}

function logSuccess(message: string): void {
    console.log(`[SUCCESS] ${message}`);
}

function logError(message: string): void {
    console.log(`[ERROR] ${message}`);
}

function logWarning(message: string): void {
    console.log(`[WARNING] ${message}`);
}

async function testWebhookDetailed(): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
    isEmpty: boolean;
    isJson: boolean;
    responseTime: number;
}> {
    const startTime = Date.now();
    
    const payload = {
        prompt: "test workflow activation - detailed diagnostic",
        sessionId: "diagnostic-session-001",
        id: "diagnostic-001",
        category: "diagnostic"
    };
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
        
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        
        const body = await response.text();
        const isEmpty = !body || body.trim() === '' || body === '{}';
        const isJson = headers['content-type']?.includes('application/json') || false;
        
        return {
            status: response.status,
            headers,
            body,
            isEmpty,
            isJson,
            responseTime
        };
    } catch (error) {
        throw error;
    }
}

async function testApolloIntegration(): Promise<{
    status: number;
    body: string;
    hasApolloContent: boolean;
    responseTime: number;
}> {
    const startTime = Date.now();
    
    const payload = {
        prompt: "Find me 3 executive assistants in New York for private aviation clients",
        sessionId: "apollo-diagnostic-001",
        id: "apollo-diagnostic-001",
        category: "lead-generation"
    };
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds for Apollo
        
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        const body = await response.text();
        const hasApolloContent = body.toLowerCase().includes('apollo') || 
                                body.toLowerCase().includes('executive') ||
                                body.toLowerCase().includes('assistant') ||
                                body.toLowerCase().includes('leads');
        
        return {
            status: response.status,
            body,
            hasApolloContent,
            responseTime
        };
    } catch (error) {
        throw error;
    }
}

function generateFixInstructions(basicTest: any, apolloTest: any): string {
    const instructions = [];
    
    instructions.push("# N8N Workflow Fix Instructions");
    instructions.push("## Morpheus Validator - Critical Resolution");
    instructions.push("");
    instructions.push("> \"The time has come to make a choice.\" - Morpheus");
    instructions.push("");
    
    // Analyze the test results
    if (basicTest.status !== 200) {
        instructions.push("## 🚨 CRITICAL ISSUE: Webhook Not Accessible");
        instructions.push(`- Status Code: ${basicTest.status}`);
        instructions.push("- Root Cause: N8N server or webhook endpoint issue");
        instructions.push("");
        instructions.push("### IMMEDIATE ACTIONS:");
        instructions.push("1. Verify N8N server is running at https://n8n.vividwalls.blog");
        instructions.push("2. Check webhook path configuration");
        instructions.push("3. Verify network connectivity");
        instructions.push("");
    } else if (basicTest.isEmpty) {
        instructions.push("## 🚨 CRITICAL ISSUE: Empty Webhook Response");
        instructions.push(`- Status Code: ${basicTest.status} (OK)`);
        instructions.push(`- Response Time: ${basicTest.responseTime}ms`);
        instructions.push(`- Content Type: ${basicTest.headers['content-type'] || 'unknown'}`);
        instructions.push("- Root Cause: Workflow not activated or misconfigured");
        instructions.push("");
        instructions.push("### IMMEDIATE ACTIONS:");
        instructions.push("1. **Access N8N Admin Interface:**");
        instructions.push("   - URL: https://n8n.vividwalls.blog");
        instructions.push("   - Login with admin credentials");
        instructions.push("");
        instructions.push("2. **Check Workflow Status:**");
        instructions.push("   - Go to Workflows section");
        instructions.push("   - Look for JetVision workflows");
        instructions.push("   - Verify at least one is ACTIVE (green toggle)");
        instructions.push("");
        instructions.push("3. **Import Corrected Workflow:**");
        instructions.push("   - Import: ../n8n-workflow/JetVision-Agent-Workflow-FIXED.json");
        instructions.push("   - Deactivate old workflows");
        instructions.push("   - Activate the new workflow");
        instructions.push("");
        instructions.push("4. **Verify Webhook Configuration:**");
        instructions.push("   - Webhook path should be: jetvision-agent");
        instructions.push("   - Response mode should be: responseNode");
        instructions.push("   - Only ONE response node should be active");
        instructions.push("");
    } else {
        instructions.push("## ✅ WEBHOOK RESPONDING");
        instructions.push(`- Status Code: ${basicTest.status}`);
        instructions.push(`- Response Time: ${basicTest.responseTime}ms`);
        instructions.push("- Webhook is returning data");
        instructions.push("");
        
        if (!apolloTest.hasApolloContent) {
            instructions.push("## ⚠️ APOLLO INTEGRATION ISSUE");
            instructions.push("- Webhook responds but Apollo tools not working");
            instructions.push("");
            instructions.push("### ACTIONS NEEDED:");
            instructions.push("1. **Check Environment Variables in N8N:**");
            instructions.push("   - APOLLO_API_KEY");
            instructions.push("   - OPENAI_API_KEY");
            instructions.push("   - Database credentials");
            instructions.push("");
            instructions.push("2. **Verify MCP Tool Configuration:**");
            instructions.push("   - Apollo Search Tool credentials");
            instructions.push("   - MCP server connectivity");
            instructions.push("");
        } else {
            instructions.push("## ✅ APOLLO INTEGRATION WORKING");
            instructions.push("- Apollo tools are responding correctly");
            instructions.push("- System appears to be functioning properly");
            instructions.push("");
        }
    }
    
    instructions.push("## 🔧 TECHNICAL DETAILS");
    instructions.push("");
    instructions.push("### Basic Test Results:");
    instructions.push(`- URL: ${N8N_WEBHOOK_URL}`);
    instructions.push(`- Status: ${basicTest.status}`);
    instructions.push(`- Response Time: ${basicTest.responseTime}ms`);
    instructions.push(`- Content Type: ${basicTest.headers['content-type'] || 'unknown'}`);
    instructions.push(`- Body Length: ${basicTest.body.length} characters`);
    instructions.push(`- Is Empty: ${basicTest.isEmpty ? 'YES' : 'NO'}`);
    instructions.push("");
    
    instructions.push("### Apollo Test Results:");
    instructions.push(`- Status: ${apolloTest.status}`);
    instructions.push(`- Response Time: ${apolloTest.responseTime}ms`);
    instructions.push(`- Has Apollo Content: ${apolloTest.hasApolloContent ? 'YES' : 'NO'}`);
    instructions.push(`- Body Preview: ${apolloTest.body.substring(0, 200)}...`);
    instructions.push("");
    
    instructions.push("## 📞 SUPPORT ESCALATION");
    instructions.push("");
    instructions.push("If issues persist after following these instructions:");
    instructions.push("1. Save this diagnostic report");
    instructions.push("2. Check N8N execution logs for detailed errors");
    instructions.push("3. Contact system administrator with this report");
    instructions.push("");
    
    instructions.push("---");
    instructions.push("");
    instructions.push("> \"Choice is an illusion created between those with power and those without.\"");
    instructions.push("> The choice is clear: follow these instructions to restore N8N functionality.");
    
    return instructions.join('\n');
}

async function main(): Promise<void> {
    console.log("=".repeat(60));
    console.log("N8N WEBHOOK FIX TOOL");
    console.log("Morpheus Validator - Direct Solution Implementation");
    console.log("=".repeat(60));
    console.log();
    
    logInfo("Starting comprehensive webhook diagnostics...");
    console.log();
    
    // Test 1: Basic webhook functionality
    console.log("🔍 TEST 1: Basic Webhook Functionality");
    console.log("-".repeat(40));
    
    let basicTest: any;
    try {
        basicTest = await testWebhookDetailed();
        logInfo(`Status: ${basicTest.status}`);
        logInfo(`Response Time: ${basicTest.responseTime}ms`);
        logInfo(`Content Type: ${basicTest.headers['content-type'] || 'unknown'}`);
        logInfo(`Body Length: ${basicTest.body.length} characters`);
        
        if (basicTest.isEmpty) {
            logWarning("Webhook returned empty response - workflow not processing");
        } else {
            logSuccess("Webhook returned non-empty response");
        }
    } catch (error) {
        logError(`Basic test failed: ${error}`);
        basicTest = { status: 0, headers: {}, body: '', isEmpty: true, isJson: false, responseTime: 0 };
    }
    
    console.log();
    
    // Test 2: Apollo integration
    console.log("🔍 TEST 2: Apollo Integration");
    console.log("-".repeat(40));
    
    let apolloTest: any;
    try {
        apolloTest = await testApolloIntegration();
        logInfo(`Status: ${apolloTest.status}`);
        logInfo(`Response Time: ${apolloTest.responseTime}ms`);
        logInfo(`Has Apollo Content: ${apolloTest.hasApolloContent ? 'YES' : 'NO'}`);
        
        if (apolloTest.hasApolloContent) {
            logSuccess("Apollo integration appears to be working");
        } else {
            logWarning("Apollo integration may not be working properly");
        }
    } catch (error) {
        logError(`Apollo test failed: ${error}`);
        apolloTest = { status: 0, body: '', hasApolloContent: false, responseTime: 0 };
    }
    
    console.log();
    
    // Generate fix instructions
    console.log("📋 GENERATING FIX INSTRUCTIONS");
    console.log("-".repeat(40));
    
    const instructions = generateFixInstructions(basicTest, apolloTest);
    
    // Save instructions to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const instructionsFile = `docs/n8n_fix_instructions_${timestamp}.md`;
    
    writeFileSync(instructionsFile, instructions);
    logSuccess(`Fix instructions saved to: ${instructionsFile}`);
    
    // Display summary
    console.log();
    console.log("=".repeat(60));
    console.log("DIAGNOSTIC SUMMARY");
    console.log("=".repeat(60));
    
    if (basicTest.status !== 200) {
        console.log("❌ CRITICAL: Webhook not accessible");
        console.log("🔧 ACTION: Check N8N server status and connectivity");
    } else if (basicTest.isEmpty) {
        console.log("❌ CRITICAL: Webhook returns empty responses");
        console.log("🔧 ACTION: Activate N8N workflow or import corrected workflow");
    } else if (!apolloTest.hasApolloContent) {
        console.log("⚠️  WARNING: Webhook works but Apollo integration issues");
        console.log("🔧 ACTION: Check environment variables and MCP configuration");
    } else {
        console.log("✅ SUCCESS: N8N workflow appears to be working correctly");
        console.log("🎯 STATUS: System is functioning properly");
    }
    
    console.log();
    console.log(`📄 Detailed fix instructions: ${instructionsFile}`);
    console.log("=".repeat(60));
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
