/**
 * Prompt Enhancement Service
 * 
 * Provides intelligent prompt enhancement capabilities for aviation business intelligence
 * using OpenAI's GPT-4o model with specialized aviation domain expertise.
 */

import { generateText } from 'ai';
import { ChatMode } from '@repo/shared/config';
import { ModelEnum } from '../models';
import { getLanguageModel } from '../providers';

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

const AVIATION_DOMAIN_CONTEXT = `
You are an expert prompt enhancement specialist for luxury private aviation business intelligence. 
Your role is to enhance user prompts to maximize the effectiveness of AI-powered aviation business analysis.

Aviation Business Context:
- Industry: Luxury private jet services, aircraft sales/leasing, charter operations
- Target Market: Ultra-high-net-worth individuals, C-suite executives, investment firms
- Key Metrics: Aircraft utilization rates, market pricing, route demand, fleet optimization
- Business Intelligence Focus: Lead generation, competitive analysis, market trends, client profiling

Enhancement Guidelines:
1. Add specific aviation terminology and context where relevant
2. Include requests for quantitative data and market insights
3. Suggest relevant business intelligence angles (competitive positioning, market opportunities)
4. Enhance prompts to elicit actionable business recommendations
5. Maintain professional tone appropriate for executive-level communications
6. Include requests for data sources and confidence levels when appropriate
`;

const ENHANCEMENT_PROMPTS = {
    minimal: `Enhance this prompt with minimal changes while maintaining the original intent. Focus on clarity and specificity for aviation business intelligence:`,
    moderate: `Significantly enhance this prompt to make it more effective for aviation business intelligence. Add relevant context, specify desired outputs, and include business-relevant angles:`,
    comprehensive: `Comprehensively transform this prompt into a powerful business intelligence query. Add extensive aviation industry context, specify detailed output requirements, suggest analysis frameworks, and include requests for actionable recommendations:`
};

export class PromptEnhancementService {
    private model: any;

    constructor(chatMode: ChatMode = ChatMode.GPT_4o) {
        // Use GPT-4o for enhancement (best balance of capability and speed)
        this.model = getLanguageModel(ModelEnum.GPT_4o);
    }

    /**
     * Enhance a prompt for aviation business intelligence
     */
    async enhancePrompt(
        originalPrompt: string,
        options: PromptEnhancementOptions = {}
    ): Promise<PromptEnhancementResult> {
        const {
            businessContext = 'general',
            enhancementLevel = 'moderate',
            includeDataRequests = true,
            preserveOriginalTone = true
        } = options;

        try {
            const enhancementPrompt = this.buildEnhancementPrompt(
                originalPrompt,
                businessContext,
                enhancementLevel,
                includeDataRequests,
                preserveOriginalTone
            );

            const result = await generateText({
                model: this.model,
                prompt: enhancementPrompt,
                maxTokens: 2048,
                temperature: 0.3, // Lower temperature for consistent, focused enhancements
            });

            const parsed = this.parseEnhancementResult(result.text, originalPrompt);
            
            return {
                ...parsed,
                estimatedTokens: this.estimateTokens(parsed.enhancedPrompt)
            };

        } catch (error) {
            console.error('Prompt enhancement failed:', error);
            
            // Fallback to minimal enhancement
            return {
                enhancedPrompt: this.applyMinimalEnhancement(originalPrompt),
                originalPrompt,
                improvements: ['Applied minimal enhancement due to service error'],
                suggestedContext: [],
                estimatedTokens: this.estimateTokens(originalPrompt)
            };
        }
    }

    /**
     * Build the enhancement prompt for the AI model
     */
    private buildEnhancementPrompt(
        originalPrompt: string,
        businessContext: string,
        enhancementLevel: string,
        includeDataRequests: boolean,
        preserveOriginalTone: boolean
    ): string {
        const contextualGuidance = this.getContextualGuidance(businessContext);
        const basePrompt = ENHANCEMENT_PROMPTS[enhancementLevel as keyof typeof ENHANCEMENT_PROMPTS];
        
        const instructions = [
            AVIATION_DOMAIN_CONTEXT,
            contextualGuidance,
            basePrompt,
            '',
            `Original Prompt: "${originalPrompt}"`,
            '',
            'Requirements:',
        ];

        if (includeDataRequests) {
            instructions.push('- Include specific requests for data, metrics, and sources where relevant');
        }

        if (preserveOriginalTone) {
            instructions.push('- Maintain the original tone and communication style');
        }

        instructions.push(
            '- Focus on aviation industry business intelligence applications',
            '- Ensure the enhanced prompt will generate actionable insights',
            '',
            'Please provide your response in this exact JSON format:',
            '{',
            '  "enhancedPrompt": "Your enhanced prompt here",',
            '  "improvements": ["List of specific improvements made"],',
            '  "suggestedContext": ["Additional context that could be valuable"]',
            '}'
        );

        return instructions.join('\n');
    }

    /**
     * Get business context-specific guidance
     */
    private getContextualGuidance(businessContext: string): string {
        const contextMap = {
            'lead-generation': 'Focus on prospect identification, contact enrichment, and outreach optimization for aviation clients.',
            'market-analysis': 'Emphasize market sizing, trend analysis, competitive landscape, and opportunity identification.',
            'competitive-intelligence': 'Prioritize competitor analysis, pricing strategies, service offerings, and market positioning.',
            'client-research': 'Focus on client profiling, needs assessment, relationship mapping, and personalized insights.',
            'general': 'Apply general aviation business intelligence principles with broad analytical scope.'
        };

        return contextMap[businessContext as keyof typeof contextMap] || contextMap.general;
    }

    /**
     * Parse the AI model's enhancement result
     */
    private parseEnhancementResult(result: string, originalPrompt: string): Omit<PromptEnhancementResult, 'estimatedTokens'> {
        try {
            // Try to parse as JSON first
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    enhancedPrompt: parsed.enhancedPrompt || originalPrompt,
                    originalPrompt,
                    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
                    suggestedContext: Array.isArray(parsed.suggestedContext) ? parsed.suggestedContext : []
                };
            }

            // Fallback: extract enhanced prompt from free-form text
            const lines = result.split('\n').filter(line => line.trim());
            const enhancedPrompt = lines.find(line => 
                line.length > originalPrompt.length * 0.8 && 
                !line.toLowerCase().includes('enhancement') &&
                !line.toLowerCase().includes('improvement')
            ) || originalPrompt;

            return {
                enhancedPrompt,
                originalPrompt,
                improvements: ['Enhanced for aviation business context'],
                suggestedContext: []
            };

        } catch (error) {
            console.error('Failed to parse enhancement result:', error);
            return {
                enhancedPrompt: this.applyMinimalEnhancement(originalPrompt),
                originalPrompt,
                improvements: ['Applied minimal enhancement due to parsing error'],
                suggestedContext: []
            };
        }
    }

    /**
     * Apply minimal enhancement as fallback
     */
    private applyMinimalEnhancement(prompt: string): string {
        // Simple enhancements for aviation context
        const enhancements = [
            'For aviation business intelligence: ',
            'Please provide specific data and actionable insights for: '
        ];

        const enhancement = enhancements.find(prefix => 
            !prompt.toLowerCase().includes(prefix.toLowerCase().slice(0, 10))
        );

        return enhancement ? `${enhancement}${prompt}` : prompt;
    }

    /**
     * Estimate token count for a prompt
     */
    private estimateTokens(text: string): number {
        // Simple estimation: ~1.35 tokens per word for English
        const words = text.trim().split(/\s+/).length;
        return Math.ceil(words * 1.35);
    }

    /**
     * Validate enhancement options
     */
    static validateOptions(options: PromptEnhancementOptions): string[] {
        const errors: string[] = [];

        const validBusinessContexts = ['lead-generation', 'market-analysis', 'competitive-intelligence', 'client-research', 'general'];
        const validEnhancementLevels = ['minimal', 'moderate', 'comprehensive'];

        if (options.businessContext && !validBusinessContexts.includes(options.businessContext)) {
            errors.push(`Invalid business context. Must be one of: ${validBusinessContexts.join(', ')}`);
        }

        if (options.enhancementLevel && !validEnhancementLevels.includes(options.enhancementLevel)) {
            errors.push(`Invalid enhancement level. Must be one of: ${validEnhancementLevels.join(', ')}`);
        }

        return errors;
    }
}

// Export singleton instance for convenience
export const promptEnhancementService = new PromptEnhancementService();