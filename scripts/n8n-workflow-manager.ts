#!/usr/bin/env tsx
/**
 * N8N Workflow Management Tool
 * Morpheus Validator - Direct N8N API Integration
 * "The time has come to make a choice."
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// N8N Configuration
const N8N_CONFIG = {
    apiUrl: process.env.N8N_API_URL || 'https://n8n.vividwalls.blog/api/v1',
    apiKey: process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZWMyMDZhNS05ZGVjLTRlNTktOGMzZS00OTRkYWY2ZWRhZjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1OTk2OTQwfQ.CYm3Dvw5AHWou3-sBMXJvecye7jFWxo-0Z2axVCY-xs',
    webhookUrl: 'https://n8n.vividwalls.blog/webhook/jetvision-agent',
    timeout: 30000
};

interface N8nWorkflow {
    id: string;
    name: string;
    active: boolean;
    nodes: any[];
    connections: any;
    createdAt: string;
    updatedAt: string;
}

interface N8nExecution {
    id: string;
    workflowId: string;
    status: 'running' | 'success' | 'error' | 'waiting';
    startedAt: string;
    stoppedAt?: string;
    data?: any;
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

async function makeN8nRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${N8N_CONFIG.apiUrl}${endpoint}`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), N8N_CONFIG.timeout);
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${N8N_CONFIG.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: data ? JSON.stringify(data) : undefined,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`N8N API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        return await response.json();
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('N8N API request timed out');
        }
        throw error;
    }
}

async function listWorkflows(): Promise<N8nWorkflow[]> {
    logInfo("Fetching all workflows from N8N...");
    
    try {
        const response = await makeN8nRequest('GET', '/workflows');
        const workflows = response.data || response;
        
        logSuccess(`Found ${workflows.length} workflows`);
        
        // Filter JetVision workflows
        const jetVisionWorkflows = workflows.filter((w: N8nWorkflow) => 
            w.name.toLowerCase().includes('jetvision') || 
            w.name.toLowerCase().includes('jet-vision')
        );
        
        console.log('\n=== ALL WORKFLOWS ===');
        workflows.forEach((workflow: N8nWorkflow) => {
            const status = workflow.active ? '✅ ACTIVE' : '❌ INACTIVE';
            console.log(`${status} | ID: ${workflow.id} | Name: ${workflow.name}`);
        });
        
        console.log('\n=== JETVISION WORKFLOWS ===');
        jetVisionWorkflows.forEach((workflow: N8nWorkflow) => {
            const status = workflow.active ? '✅ ACTIVE' : '❌ INACTIVE';
            console.log(`${status} | ID: ${workflow.id} | Name: ${workflow.name}`);
        });
        
        return workflows;
    } catch (error) {
        logError(`Failed to fetch workflows: ${error}`);
        return [];
    }
}

async function getWorkflowDetails(workflowId: string): Promise<N8nWorkflow | null> {
    logInfo(`Fetching details for workflow ${workflowId}...`);
    
    try {
        const workflow = await makeN8nRequest('GET', `/workflows/${workflowId}`);
        
        console.log('\n=== WORKFLOW DETAILS ===');
        console.log(`ID: ${workflow.id}`);
        console.log(`Name: ${workflow.name}`);
        console.log(`Active: ${workflow.active ? '✅ YES' : '❌ NO'}`);
        console.log(`Nodes: ${workflow.nodes?.length || 0}`);
        console.log(`Created: ${workflow.createdAt}`);
        console.log(`Updated: ${workflow.updatedAt}`);
        
        // Check for webhook nodes
        const webhookNodes = workflow.nodes?.filter((node: any) => 
            node.type === 'n8n-nodes-base.webhook'
        ) || [];
        
        console.log(`\nWebhook Nodes: ${webhookNodes.length}`);
        webhookNodes.forEach((node: any, index: number) => {
            console.log(`  ${index + 1}. ${node.name} (${node.parameters?.path || 'no path'})`);
        });
        
        // Check for response nodes
        const responseNodes = workflow.nodes?.filter((node: any) => 
            node.type === 'n8n-nodes-base.respondToWebhook'
        ) || [];
        
        console.log(`Response Nodes: ${responseNodes.length}`);
        responseNodes.forEach((node: any, index: number) => {
            console.log(`  ${index + 1}. ${node.name}`);
        });
        
        // Check for agent nodes
        const agentNodes = workflow.nodes?.filter((node: any) => 
            node.type === '@n8n/n8n-nodes-langchain.agent'
        ) || [];
        
        console.log(`Agent Nodes: ${agentNodes.length}`);
        agentNodes.forEach((node: any, index: number) => {
            console.log(`  ${index + 1}. ${node.name}`);
        });
        
        return workflow;
    } catch (error) {
        logError(`Failed to fetch workflow details: ${error}`);
        return null;
    }
}

async function activateWorkflow(workflowId: string): Promise<boolean> {
    logInfo(`Activating workflow ${workflowId}...`);
    
    try {
        const result = await makeN8nRequest('POST', `/workflows/${workflowId}/activate`);
        logSuccess(`Workflow ${workflowId} activated successfully`);
        return true;
    } catch (error) {
        logError(`Failed to activate workflow: ${error}`);
        return false;
    }
}

async function deactivateWorkflow(workflowId: string): Promise<boolean> {
    logInfo(`Deactivating workflow ${workflowId}...`);
    
    try {
        const result = await makeN8nRequest('POST', `/workflows/${workflowId}/deactivate`);
        logSuccess(`Workflow ${workflowId} deactivated successfully`);
        return true;
    } catch (error) {
        logError(`Failed to deactivate workflow: ${error}`);
        return false;
    }
}

async function importWorkflow(filePath: string): Promise<string | null> {
    logInfo(`Importing workflow from ${filePath}...`);
    
    try {
        const workflowData = JSON.parse(readFileSync(filePath, 'utf8'));
        
        // Remove ID to create new workflow
        delete workflowData.id;
        
        const result = await makeN8nRequest('POST', '/workflows', workflowData);
        const workflowId = result.id || result.data?.id;
        
        logSuccess(`Workflow imported successfully with ID: ${workflowId}`);
        return workflowId;
    } catch (error) {
        logError(`Failed to import workflow: ${error}`);
        return null;
    }
}

async function testWorkflowWebhook(): Promise<boolean> {
    logInfo("Testing workflow webhook...");
    
    const testPayload = {
        prompt: "test workflow activation",
        sessionId: "test-session-001",
        id: "test-001"
    };
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), N8N_CONFIG.timeout);
        
        const response = await fetch(N8N_CONFIG.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPayload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        logInfo(`Webhook Response Status: ${response.status}`);
        
        if (response.status === 200) {
            const responseText = await response.text();
            
            if (!responseText || responseText.trim() === '' || responseText === '{}') {
                logWarning("Webhook returned empty response - workflow not processing requests");
                return false;
            } else {
                logSuccess("Webhook returned non-empty response - workflow is processing");
                console.log(`Response preview: ${responseText.substring(0, 200)}...`);
                return true;
            }
        } else {
            logError(`Webhook returned error status: ${response.status}`);
            return false;
        }
    } catch (error) {
        logError(`Webhook test failed: ${error}`);
        return false;
    }
}

async function getRecentExecutions(workflowId?: string): Promise<N8nExecution[]> {
    logInfo("Fetching recent executions...");
    
    try {
        const endpoint = workflowId ? `/executions?workflowId=${workflowId}&limit=10` : '/executions?limit=10';
        const response = await makeN8nRequest('GET', endpoint);
        const executions = response.data || response;
        
        console.log('\n=== RECENT EXECUTIONS ===');
        executions.forEach((exec: N8nExecution) => {
            const status = exec.status === 'success' ? '✅' : exec.status === 'error' ? '❌' : '⏳';
            console.log(`${status} ${exec.id} | ${exec.status} | ${exec.startedAt}`);
        });
        
        return executions;
    } catch (error) {
        logError(`Failed to fetch executions: ${error}`);
        return [];
    }
}

async function diagnoseWorkflowIssues(): Promise<void> {
    console.log("=".repeat(60));
    console.log("N8N WORKFLOW DIAGNOSTIC TOOL");
    console.log("Morpheus Validator - Direct API Integration");
    console.log("=".repeat(60));
    
    // Step 1: List all workflows
    const workflows = await listWorkflows();
    
    // Step 2: Find JetVision workflows
    const jetVisionWorkflows = workflows.filter((w: N8nWorkflow) => 
        w.name.toLowerCase().includes('jetvision') || 
        w.name.toLowerCase().includes('jet-vision')
    );
    
    if (jetVisionWorkflows.length === 0) {
        logWarning("No JetVision workflows found!");
        console.log("\n🔧 RECOMMENDED ACTIONS:");
        console.log("1. Import the corrected workflow: ../n8n-workflow/JetVision-Agent-Workflow-FIXED.json");
        console.log("2. Run this tool again to verify import");
        return;
    }
    
    // Step 3: Check each JetVision workflow
    for (const workflow of jetVisionWorkflows) {
        console.log(`\n${"=".repeat(40)}`);
        console.log(`ANALYZING WORKFLOW: ${workflow.name}`);
        console.log(`${"=".repeat(40)}`);
        
        await getWorkflowDetails(workflow.id);
        
        if (!workflow.active) {
            logWarning(`Workflow ${workflow.name} is INACTIVE`);
            console.log("🔧 RECOMMENDED ACTION: Activate this workflow");
        }
    }
    
    // Step 4: Test webhook
    console.log(`\n${"=".repeat(40)}`);
    console.log("TESTING WEBHOOK ENDPOINT");
    console.log(`${"=".repeat(40)}`);
    
    const webhookWorking = await testWorkflowWebhook();
    
    // Step 5: Check recent executions
    await getRecentExecutions();
    
    // Step 6: Generate recommendations
    console.log(`\n${"=".repeat(40)}`);
    console.log("DIAGNOSTIC SUMMARY & RECOMMENDATIONS");
    console.log(`${"=".repeat(40)}`);
    
    const activeJetVisionWorkflows = jetVisionWorkflows.filter(w => w.active);
    
    if (activeJetVisionWorkflows.length === 0) {
        console.log("❌ CRITICAL: No active JetVision workflows found");
        console.log("🔧 IMMEDIATE ACTION REQUIRED:");
        console.log("1. Activate an existing JetVision workflow, OR");
        console.log("2. Import and activate the corrected workflow");
    } else if (activeJetVisionWorkflows.length > 1) {
        console.log("⚠️  WARNING: Multiple active JetVision workflows detected");
        console.log("🔧 RECOMMENDED ACTION:");
        console.log("1. Deactivate all but one JetVision workflow");
        console.log("2. Keep only the most recent/corrected workflow active");
    } else if (!webhookWorking) {
        console.log("❌ ISSUE: Workflow is active but webhook returns empty responses");
        console.log("🔧 RECOMMENDED ACTIONS:");
        console.log("1. Check workflow configuration for response node issues");
        console.log("2. Verify agent node is properly connected");
        console.log("3. Check for missing environment variables");
        console.log("4. Import the corrected workflow to replace the current one");
    } else {
        console.log("✅ SUCCESS: JetVision workflow appears to be working correctly");
    }
    
    // Save diagnostic report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const reportFile = `docs/n8n_workflow_diagnostic_${timestamp}.json`;
    
    const report = {
        timestamp: new Date().toISOString(),
        workflows: workflows,
        jetVisionWorkflows: jetVisionWorkflows,
        webhookTest: {
            url: N8N_CONFIG.webhookUrl,
            working: webhookWorking
        },
        recommendations: activeJetVisionWorkflows.length === 0 ? 'activate_workflow' :
                        activeJetVisionWorkflows.length > 1 ? 'deactivate_duplicates' :
                        !webhookWorking ? 'fix_configuration' : 'working_correctly'
    };
    
    writeFileSync(reportFile, JSON.stringify(report, null, 2));
    logSuccess(`Detailed diagnostic report saved to: ${reportFile}`);
}

// Main execution
async function main(): Promise<void> {
    const command = process.argv[2];
    
    switch (command) {
        case 'list':
            await listWorkflows();
            break;
        case 'details':
            const workflowId = process.argv[3];
            if (!workflowId) {
                logError("Please provide workflow ID: npm run n8n:details <workflow-id>");
                return;
            }
            await getWorkflowDetails(workflowId);
            break;
        case 'activate':
            const activateId = process.argv[3];
            if (!activateId) {
                logError("Please provide workflow ID: npm run n8n:activate <workflow-id>");
                return;
            }
            await activateWorkflow(activateId);
            break;
        case 'deactivate':
            const deactivateId = process.argv[3];
            if (!deactivateId) {
                logError("Please provide workflow ID: npm run n8n:deactivate <workflow-id>");
                return;
            }
            await deactivateWorkflow(deactivateId);
            break;
        case 'import':
            const filePath = process.argv[3] || '../n8n-workflow/JetVision-Agent-Workflow-FIXED.json';
            await importWorkflow(filePath);
            break;
        case 'test':
            await testWorkflowWebhook();
            break;
        case 'executions':
            const execWorkflowId = process.argv[3];
            await getRecentExecutions(execWorkflowId);
            break;
        default:
            await diagnoseWorkflowIssues();
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
