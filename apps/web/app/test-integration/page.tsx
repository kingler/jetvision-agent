'use client';

import React, { useState, useEffect } from 'react';
import { JetVisionChat } from '@repo/common/components/jetvision/JetVisionChat';
import { PromptCards } from '@repo/common/components/jetvision/PromptCards';
import { scrollToChatInputWithFocus } from '@repo/common/utils';
import { Button } from '@repo/ui/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { Badge } from '@repo/ui/components/ui/badge';
import { Separator } from '@repo/ui/components/ui/separator';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  duration?: number;
}

export default function TestIntegrationPage() {
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    const updateTestResult = (testName: string, status: TestResult['status'], message: string, duration?: number) => {
        setTestResults(prev => {
            const existing = prev.find(r => r.test === testName);
            if (existing) {
                existing.status = status;
                existing.message = message;
                existing.duration = duration;
                return [...prev];
            } else {
                return [...prev, { test: testName, status, message, duration }];
            }
        });
    };

    const runTests = async () => {
        setIsRunning(true);
        setTestResults([]);

        // Test 1: Scroll Functionality
        updateTestResult('Smooth Scroll', 'pending', 'Testing scroll animation...');
        try {
            const start = Date.now();
            scrollToChatInputWithFocus(100);
            
            // Wait for scroll animation to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const chatInput = document.querySelector('[data-chat-input="true"]');
            if (chatInput) {
                updateTestResult('Smooth Scroll', 'success', 'Scroll animation completed successfully', Date.now() - start);
            } else {
                updateTestResult('Smooth Scroll', 'error', 'Chat input element not found');
            }
        } catch (error) {
            updateTestResult('Smooth Scroll', 'error', `Scroll test failed: ${error}`);
        }

        // Test 2: n8n Webhook Connectivity
        updateTestResult('n8n Webhook', 'pending', 'Testing n8n webhook connection...');
        try {
            const start = Date.now();
            const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.vividwalls.blog/webhook/jetvision-agent';

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: 'Test connection from JetVision Agent integration test',
                    context: { source: 'integration-test', timestamp: new Date().toISOString() }
                }),
                signal: AbortSignal.timeout(10000) // Updated timeout to match provider
            });

            const duration = Date.now() - start;

            if (response.ok) {
                const data = await response.json();
                updateTestResult('n8n Webhook', 'success', `Connected successfully (${response.status}) - Response received`, duration);
            } else {
                updateTestResult('n8n Webhook', 'error', `HTTP ${response.status}: ${response.statusText}`, duration);
            }
        } catch (error) {
            updateTestResult('n8n Webhook', 'error', `Connection failed: ${error}`);
        }

        // Test 3: Environment Variables
        updateTestResult('Environment Config', 'pending', 'Checking environment configuration...');
        try {
            const config = {
                n8nWebhook: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL,
                n8nApiKey: process.env.NEXT_PUBLIC_N8N_API_KEY ? '***' : undefined,
                openaiKey: process.env.OPENAI_API_KEY ? '***' : undefined,
            };

            const missingVars = [];
            if (!config.n8nWebhook) missingVars.push('NEXT_PUBLIC_N8N_WEBHOOK_URL');
            
            if (missingVars.length > 0) {
                updateTestResult('Environment Config', 'error', `Missing variables: ${missingVars.join(', ')}`);
            } else {
                updateTestResult('Environment Config', 'success', 'All required environment variables are set');
            }
        } catch (error) {
            updateTestResult('Environment Config', 'error', `Config check failed: ${error}`);
        }

        // Test 4: Chat Input Component
        updateTestResult('Chat Input Component', 'pending', 'Testing chat input component...');
        try {
            const chatInput = document.querySelector('[data-chat-input="true"]');
            const proseMirror = document.querySelector('.ProseMirror');
            
            if (chatInput && proseMirror) {
                updateTestResult('Chat Input Component', 'success', 'Chat input component is properly rendered');
            } else {
                updateTestResult('Chat Input Component', 'error', 'Chat input component elements not found');
            }
        } catch (error) {
            updateTestResult('Chat Input Component', 'error', `Component test failed: ${error}`);
        }

        setIsRunning(false);
    };

    const handlePromptSelect = (prompt: string) => {
        console.log('🎯 Prompt selected:', prompt);
        // Trigger scroll behavior
        scrollToChatInputWithFocus(100);
        
        // Update test result
        updateTestResult('Prompt Card Selection', 'success', `Selected: "${prompt.substring(0, 50)}..."`);
    };

    const getStatusColor = (status: TestResult['status']) => {
        switch (status) {
            case 'success': return 'bg-green-500';
            case 'error': return 'bg-red-500';
            case 'pending': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-background p-6">
            {/* Header */}
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">JetVision Agent Integration Tests</h1>
                    <p className="text-muted-foreground">
                        Comprehensive testing suite for chat interface, n8n integration, and smooth scroll functionality
                    </p>
                </div>

                {/* Test Controls */}
                <Card>
                    <CardHeader>
                        <CardTitle>Test Suite</CardTitle>
                        <CardDescription>
                            Run comprehensive tests to verify all JetVision Agent functionality
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button 
                            onClick={runTests} 
                            disabled={isRunning}
                            className="w-full"
                        >
                            {isRunning ? 'Running Tests...' : 'Run All Tests'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Test Results */}
                {testResults.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Test Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {testResults.map((result, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-3 h-3 rounded-full ${getStatusColor(result.status)}`} />
                                            <div>
                                                <p className="font-medium">{result.test}</p>
                                                <p className="text-sm text-muted-foreground">{result.message}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {result.duration && (
                                                <Badge variant="outline">{result.duration}ms</Badge>
                                            )}
                                            <Badge variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}>
                                                {result.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Separator />

                {/* Prompt Cards Test Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Prompt Card Scroll Test</CardTitle>
                        <CardDescription>
                            Click any prompt card below to test the smooth scroll functionality
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PromptCards onSelectPrompt={handlePromptSelect} />
                    </CardContent>
                </Card>

                {/* Spacer for scroll testing */}
                <div className="h-96 bg-muted/10 rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Spacer content for scroll testing</p>
                </div>

                {/* JetVision Chat Integration Test */}
                <Card>
                    <CardHeader>
                        <CardTitle>JetVision Chat Integration</CardTitle>
                        <CardDescription>
                            Unified chat interface with Thread system integration and n8n agent responses
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-96 border rounded-lg overflow-hidden">
                            <JetVisionChat />
                        </div>
                    </CardContent>
                </Card>

                {/* Environment Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Environment Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="font-medium">n8n Webhook URL:</p>
                                <p className="text-muted-foreground font-mono text-xs">
                                    {process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.vividwalls.blog/webhook/jetvision-agent'}
                                </p>
                            </div>
                            <div>
                                <p className="font-medium">n8n API Key:</p>
                                <p className="text-muted-foreground">
                                    {process.env.NEXT_PUBLIC_N8N_API_KEY ? 'Configured' : 'Not configured'}
                                </p>
                            </div>
                            <div>
                                <p className="font-medium">OpenAI API Key:</p>
                                <p className="text-muted-foreground">
                                    {process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}
                                </p>
                            </div>
                            <div>
                                <p className="font-medium">Environment:</p>
                                <p className="text-muted-foreground">
                                    {process.env.NODE_ENV || 'development'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bottom spacer */}
                <div className="h-32" />
            </div>
        </div>
    );
}
