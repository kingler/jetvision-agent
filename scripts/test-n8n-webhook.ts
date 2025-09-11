#!/usr/bin/env tsx
/**
 * N8N Webhook Test Script
 * Morpheus Validator - JetVision Agent Project
 * "The time has come to make a choice."
 */

import { writeFileSync } from 'fs';

// Configuration
const N8N_WEBHOOK_URL = "https://n8n.vividwalls.blog/webhook/jetvision-agent";
const TIMEOUT = 30000; // 30 seconds

interface TestResult {
    success: boolean;
    message: string;
    details?: any;
}

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

async function testWebhookBasic(): Promise<TestResult> {
    logInfo("Testing basic webhook functionality...");
    
    const payload = {
        prompt: "test workflow activation",
        sessionId: "test-session-001",
        id: "test-001"
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
        
        logInfo(`Response Status: ${response.status}`);
        logInfo(`Response Headers: ${JSON.stringify(Object.fromEntries(response.headers))}`);
        
        if (response.status === 200) {
            const contentType = response.headers.get('content-type');
            
            if (contentType?.includes('application/json')) {
                try {
                    const responseData = await response.json();
                    if (!responseData || Object.keys(responseData).length === 0) {
                        logWarning("Webhook returned empty JSON - workflow likely not activated");
                        return {
                            success: false,
                            message: "Webhook returning empty responses",
                            details: { responseData, status: response.status }
                        };
                    } else {
                        logSuccess("Webhook returned non-empty response");
                        logInfo(`Response preview: ${JSON.stringify(responseData, null, 2).substring(0, 500)}...`);
                        return {
                            success: true,
                            message: "Webhook responding with data",
                            details: responseData
                        };
                    }
                } catch (jsonError) {
                    logError(`JSON parsing failed: ${jsonError}`);
                    return {
                        success: false,
                        message: "Invalid JSON response",
                        details: { error: jsonError }
                    };
                }
            } else {
                const responseText = await response.text();
                if (!responseText.trim()) {
                    logWarning("Webhook returned empty response");
                    return {
                        success: false,
                        message: "Empty response",
                        details: { responseText, contentType }
                    };
                } else {
                    logSuccess("Webhook returned text response");
                    logInfo(`Response: ${responseText.substring(0, 200)}...`);
                    return {
                        success: true,
                        message: "Webhook responding with text",
                        details: { responseText: responseText.substring(0, 500) }
                    };
                }
            }
        } else {
            const errorText = await response.text();
            logError(`Webhook returned error status: ${response.status}`);
            logError(`Response: ${errorText}`);
            return {
                success: false,
                message: `HTTP ${response.status} error`,
                details: { status: response.status, errorText }
            };
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logError("Webhook request timed out");
            return {
                success: false,
                message: "Request timeout",
                details: { timeout: TIMEOUT }
            };
        } else {
            logError(`Webhook request failed: ${error}`);
            return {
                success: false,
                message: "Network error",
                details: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
}

async function testApolloIntegration(): Promise<TestResult> {
    logInfo("Testing Apollo integration...");
    
    const payload = {
        prompt: "Find me 3 executive assistants in New York for private aviation clients",
        sessionId: "apollo-test-001",
        id: "apollo-test-001",
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
        
        logInfo(`Apollo Test Response Status: ${response.status}`);
        
        if (response.status === 200) {
            const contentType = response.headers.get('content-type');
            
            if (contentType?.includes('application/json')) {
                try {
                    const responseData = await response.json();
                    const responseText = JSON.stringify(responseData).toLowerCase();
                    
                    if (responseText.includes('apollo') || responseText.includes('leads') || responseText.includes('executive')) {
                        logSuccess("Apollo integration appears to be working");
                        return {
                            success: true,
                            message: "Apollo integration working",
                            details: responseData
                        };
                    } else {
                        logWarning("Apollo integration may not be working properly");
                        logInfo(`Response: ${JSON.stringify(responseData, null, 2).substring(0, 300)}...`);
                        return {
                            success: false,
                            message: "Apollo integration issues detected",
                            details: responseData
                        };
                    }
                } catch (jsonError) {
                    logError(`JSON parsing failed: ${jsonError}`);
                    return {
                        success: false,
                        message: "Invalid JSON response",
                        details: { error: jsonError }
                    };
                }
            } else {
                const responseText = await response.text();
                const lowerText = responseText.toLowerCase();
                
                if (lowerText.includes('apollo') || lowerText.includes('leads')) {
                    logSuccess("Apollo integration appears to be working");
                    return {
                        success: true,
                        message: "Apollo integration working",
                        details: { responseText: responseText.substring(0, 500) }
                    };
                } else {
                    logWarning("Apollo integration may not be working");
                    return {
                        success: false,
                        message: "Apollo integration issues detected",
                        details: { responseText: responseText.substring(0, 500) }
                    };
                }
            }
        } else {
            logError(`Apollo test failed with status: ${response.status}`);
            return {
                success: false,
                message: `HTTP ${response.status} error`,
                details: { status: response.status }
            };
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logError("Apollo integration test timed out");
            return {
                success: false,
                message: "Apollo test timeout",
                details: { timeout: 60000 }
            };
        } else {
            logError(`Apollo integration test failed: ${error}`);
            return {
                success: false,
                message: "Apollo test network error",
                details: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
}

async function generateReport(): Promise<void> {
    logInfo("Generating diagnostic report...");
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const reportFile = `../docs/n8n_diagnostic_report_${timestamp}.txt`;
    
    const basicTestResult = await testWebhookBasic();
    const apolloTestResult = await testApolloIntegration();
    
    const reportContent = `N8N Webhook Diagnostic Report
Generated: ${new Date().toISOString()}
========================================

1. Basic Webhook Test:
   Status: ${basicTestResult.success ? '✅ PASS' : '❌ FAIL'}
   Details: ${basicTestResult.message}

2. Apollo Integration Test:
   Status: ${apolloTestResult.success ? '✅ PASS' : '❌ FAIL'}
   Details: ${apolloTestResult.message}

3. Overall Assessment:
   ${basicTestResult.success && apolloTestResult.success ? '✅ N8N workflow is functioning properly' : '❌ N8N workflow requires attention'}

4. Recommendations:
   ${basicTestResult.success && apolloTestResult.success ? '- System is working correctly' : `- Import JetVision-Agent-Workflow-FIXED.json
   - Deactivate conflicting workflows
   - Verify environment variables
   - Check workflow activation status`}

5. Next Steps:
   ${basicTestResult.success && apolloTestResult.success ? '- Continue monitoring system health' : `- Access N8N admin interface: https://n8n.vividwalls.blog
   - Import corrected workflow from ../n8n-workflow/JetVision-Agent-Workflow-FIXED.json
   - Activate workflow
   - Re-run diagnostics`}

6. Technical Details:
   Basic Test: ${JSON.stringify(basicTestResult.details, null, 2)}
   Apollo Test: ${JSON.stringify(apolloTestResult.details, null, 2)}
`;
    
    try {
        writeFileSync(reportFile, reportContent);
        logSuccess(`Diagnostic report saved to: ${reportFile}`);
    } catch (error) {
        logError(`Failed to save report: ${error}`);
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("DIAGNOSTIC SUMMARY");
    console.log("=".repeat(50));
    console.log(reportContent);
}

async function main(): Promise<void> {
    console.log("=".repeat(50));
    console.log("N8N Webhook Test Script");
    console.log("Morpheus Validator Analysis");
    console.log("=".repeat(50));
    console.log();
    
    await generateReport();
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
