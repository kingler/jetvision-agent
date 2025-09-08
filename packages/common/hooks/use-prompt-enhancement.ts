'use client';

import { useState, useCallback, useRef } from 'react';
import { ChatMode } from '@repo/shared/config';

// Re-export types from the enhancement service
export interface PromptEnhancementOptions {
    businessContext?: 'lead-generation' | 'market-analysis' | 'competitive-intelligence' | 'client-research' | 'general';
    enhancementLevel?: 'minimal' | 'moderate' | 'comprehensive';
    includeDataRequests?: boolean;
    preserveOriginalTone?: boolean;
}

export interface PromptEnhancementResult {
    enhancedPrompt: string;
    originalPrompt: string;
    improvements: string[];
    suggestedContext: string[];
    estimatedTokens: number;
}

interface UsePromptEnhancementReturn {
    enhancedPrompt: string | null;
    isEnhancing: boolean;
    error: string | null;
    lastEnhancementResult: PromptEnhancementResult | null;
    enhancePrompt: (prompt: string, options?: PromptEnhancementOptions) => Promise<PromptEnhancementResult>;
    clearEnhancement: () => void;
    applyEnhancement: (result: PromptEnhancementResult) => void;
    revertToOriginal: () => void;
}

/**
 * Hook for managing prompt enhancement functionality
 * Provides client-side interface to the prompt enhancement service
 */
export const usePromptEnhancement = (chatMode?: ChatMode): UsePromptEnhancementReturn => {
    const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastEnhancementResult, setLastEnhancementResult] = useState<PromptEnhancementResult | null>(null);
    
    // Keep track of the current request to avoid race conditions
    const currentRequestRef = useRef<AbortController | null>(null);

    /**
     * Enhance a prompt using the enhancement service
     */
    const enhancePrompt = useCallback(
        async (prompt: string, options: PromptEnhancementOptions = {}): Promise<PromptEnhancementResult> => {
            // Cancel any ongoing request
            if (currentRequestRef.current) {
                currentRequestRef.current.abort();
            }

            // Create new abort controller for this request
            const abortController = new AbortController();
            currentRequestRef.current = abortController;

            try {
                setIsEnhancing(true);
                setError(null);

                // Import the service dynamically to avoid SSR issues
                const { PromptEnhancementService } = await import('@repo/ai/services/prompt-enhancement');
                
                // Create service instance with the appropriate chat mode
                const service = new PromptEnhancementService(chatMode || ChatMode.GPT_4o);

                // Validate options
                const validationErrors = PromptEnhancementService.validateOptions(options);
                if (validationErrors.length > 0) {
                    throw new Error(`Invalid options: ${validationErrors.join(', ')}`);
                }

                // Check if request was aborted before making the call
                if (abortController.signal.aborted) {
                    throw new Error('Enhancement request was cancelled');
                }

                // Call the enhancement service
                const result = await service.enhancePrompt(prompt, options);

                // Check if request was aborted after the call
                if (abortController.signal.aborted) {
                    throw new Error('Enhancement request was cancelled');
                }

                setLastEnhancementResult(result);
                setEnhancedPrompt(result.enhancedPrompt);
                
                return result;

            } catch (err) {
                // Don't set error state for cancelled requests
                if (err instanceof Error && err.message.includes('cancelled')) {
                    throw err;
                }

                const errorMessage = err instanceof Error ? err.message : 'Enhancement failed';
                setError(errorMessage);
                console.error('Prompt enhancement failed:', err);
                
                // Return minimal enhancement as fallback
                const fallbackResult: PromptEnhancementResult = {
                    enhancedPrompt: `For aviation business intelligence: ${prompt}`,
                    originalPrompt: prompt,
                    improvements: ['Applied minimal enhancement due to service error'],
                    suggestedContext: [],
                    estimatedTokens: Math.ceil(prompt.split(/\s+/).length * 1.35)
                };

                setLastEnhancementResult(fallbackResult);
                setEnhancedPrompt(fallbackResult.enhancedPrompt);
                
                return fallbackResult;

            } finally {
                setIsEnhancing(false);
                currentRequestRef.current = null;
            }
        },
        [chatMode]
    );

    /**
     * Clear the current enhancement
     */
    const clearEnhancement = useCallback(() => {
        // Cancel any ongoing request
        if (currentRequestRef.current) {
            currentRequestRef.current.abort();
            currentRequestRef.current = null;
        }

        setEnhancedPrompt(null);
        setLastEnhancementResult(null);
        setError(null);
        setIsEnhancing(false);
    }, []);

    /**
     * Apply an enhancement result
     */
    const applyEnhancement = useCallback((result: PromptEnhancementResult) => {
        setLastEnhancementResult(result);
        setEnhancedPrompt(result.enhancedPrompt);
        setError(null);
    }, []);

    /**
     * Revert to the original prompt
     */
    const revertToOriginal = useCallback(() => {
        if (lastEnhancementResult) {
            setEnhancedPrompt(lastEnhancementResult.originalPrompt);
        }
    }, [lastEnhancementResult]);

    return {
        enhancedPrompt,
        isEnhancing,
        error,
        lastEnhancementResult,
        enhancePrompt,
        clearEnhancement,
        applyEnhancement,
        revertToOriginal,
    };
};

/**
 * Default enhancement options for different business contexts
 */
export const DEFAULT_ENHANCEMENT_OPTIONS: Record<string, PromptEnhancementOptions> = {
    leadGeneration: {
        businessContext: 'lead-generation',
        enhancementLevel: 'comprehensive',
        includeDataRequests: true,
        preserveOriginalTone: true,
    },
    marketAnalysis: {
        businessContext: 'market-analysis', 
        enhancementLevel: 'comprehensive',
        includeDataRequests: true,
        preserveOriginalTone: false,
    },
    competitiveIntelligence: {
        businessContext: 'competitive-intelligence',
        enhancementLevel: 'moderate',
        includeDataRequests: true,
        preserveOriginalTone: true,
    },
    clientResearch: {
        businessContext: 'client-research',
        enhancementLevel: 'moderate',
        includeDataRequests: false,
        preserveOriginalTone: true,
    },
    general: {
        businessContext: 'general',
        enhancementLevel: 'moderate',
        includeDataRequests: false,
        preserveOriginalTone: true,
    },
};

/**
 * Utility function to get recommended enhancement options based on prompt content
 */
export const getRecommendedEnhancementOptions = (prompt: string): PromptEnhancementOptions => {
    const lowerPrompt = prompt.toLowerCase();
    
    // Analyze prompt content to suggest appropriate business context
    if (lowerPrompt.includes('lead') || lowerPrompt.includes('prospect') || lowerPrompt.includes('campaign')) {
        return DEFAULT_ENHANCEMENT_OPTIONS.leadGeneration;
    }
    
    if (lowerPrompt.includes('market') || lowerPrompt.includes('trend') || lowerPrompt.includes('analysis')) {
        return DEFAULT_ENHANCEMENT_OPTIONS.marketAnalysis;
    }
    
    if (lowerPrompt.includes('competitor') || lowerPrompt.includes('competitive') || lowerPrompt.includes('pricing')) {
        return DEFAULT_ENHANCEMENT_OPTIONS.competitiveIntelligence;
    }
    
    if (lowerPrompt.includes('client') || lowerPrompt.includes('customer') || lowerPrompt.includes('profile')) {
        return DEFAULT_ENHANCEMENT_OPTIONS.clientResearch;
    }
    
    return DEFAULT_ENHANCEMENT_OPTIONS.general;
};