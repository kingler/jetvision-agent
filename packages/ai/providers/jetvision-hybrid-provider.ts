import { LanguageModelV1, LanguageModelV1CallWarning, LanguageModelV1FinishReason, LanguageModelV1StreamPart } from '@ai-sdk/provider';
import { ParseResult } from '@ai-sdk/provider-utils';

/**
 * JetVision Hybrid Provider
 * Combines n8n workflow integration with direct LLM fallback for optimal performance
 */

export interface JetVisionHybridConfig {
  // n8n Configuration
  n8nWebhookUrl?: string;
  n8nApiKey?: string;
  n8nTimeout?: number;
  
  // LLM Fallback Configuration
  llmProvider?: 'openai' | 'anthropic' | 'groq' | 'local';
  llmApiKey?: string;
  llmModel?: string;
  
  // Hybrid Settings
  enableFallback?: boolean;
  fallbackThreshold?: number; // ms before falling back to direct LLM
  preferN8n?: boolean; // Try n8n first, then fallback
}

export interface JetVisionHybridModel extends LanguageModelV1 {
  readonly specificationVersion: 'v1';
  readonly provider: string;
  readonly modelId: string;
  readonly defaultObjectGenerationMode: 'tool' | 'json' | undefined;
}

class JetVisionHybridModelImpl implements JetVisionHybridModel {
  readonly specificationVersion = 'v1' as const;
  readonly provider = 'jetvision-hybrid';
  readonly modelId: string;
  readonly defaultObjectGenerationMode = undefined;
  
  private config: Required<JetVisionHybridConfig>;

  constructor(modelId: string, config: JetVisionHybridConfig) {
    this.modelId = modelId;
    this.config = {
      n8nWebhookUrl: config.n8nWebhookUrl || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/jetvision-agent',
      n8nApiKey: config.n8nApiKey || process.env.NEXT_PUBLIC_N8N_API_KEY || '',
      n8nTimeout: config.n8nTimeout || 8000, // 8 seconds for n8n
      
      llmProvider: config.llmProvider || 'openai',
      llmApiKey: config.llmApiKey || process.env.OPENAI_API_KEY || '',
      llmModel: config.llmModel || 'gpt-4o-mini',
      
      enableFallback: config.enableFallback ?? true,
      fallbackThreshold: config.fallbackThreshold || 5000, // 5 seconds
      preferN8n: config.preferN8n ?? true,
    };
  }

  async doGenerate(options: Parameters<LanguageModelV1['doGenerate']>[0]): Promise<Awaited<ReturnType<LanguageModelV1['doGenerate']>>> {
    const { prompt, mode, abortSignal } = options;
    
    // Extract the user's message from the prompt
    const messages = (prompt as any).messages || [];
    const userMessage = messages[messages.length - 1];
    const query = userMessage?.content?.find((c: any) => c.type === 'text')?.text || '';
    
    console.log('🚀 JetVision Hybrid: Processing query:', query);
    
    let response: string;
    let source: 'n8n' | 'llm' = 'n8n';
    
    if (this.config.preferN8n) {
      try {
        response = await this.tryN8nFirst(query, abortSignal);
      } catch (error) {
        console.log('⚠️ n8n failed, falling back to direct LLM:', error);
        if (this.config.enableFallback) {
          response = await this.callDirectLLM(query, messages, abortSignal);
          source = 'llm';
        } else {
          throw error;
        }
      }
    } else {
      // Direct LLM first, n8n as fallback
      try {
        response = await this.callDirectLLM(query, messages, abortSignal);
        source = 'llm';
      } catch (error) {
        console.log('⚠️ Direct LLM failed, falling back to n8n:', error);
        response = await this.tryN8nFirst(query, abortSignal);
      }
    }

    console.log(`✅ Response generated via ${source}:`, response.substring(0, 100) + '...');

    return {
      finishReason: 'stop' as LanguageModelV1FinishReason,
      usage: {
        promptTokens: query.length,
        completionTokens: response.length,
      },
      text: response,
      rawCall: {
        rawPrompt: null,
        rawSettings: {},
      },
      warnings: [],
    };
  }

  async doStream(options: Parameters<LanguageModelV1['doStream']>[0]): Promise<Awaited<ReturnType<LanguageModelV1['doStream']>>> {
    const { prompt, mode, abortSignal } = options;
    
    // Extract the user's message from the prompt
    const messages = (prompt as any).messages || [];
    const userMessage = messages[messages.length - 1];
    const query = userMessage?.content?.find((c: any) => c.type === 'text')?.text || '';
    
    console.log('🌊 JetVision Hybrid Streaming: Processing query:', query);

    const self = this;
    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          let text = '';
          let source: 'n8n' | 'llm' = 'n8n';
          
          if (self.config.preferN8n) {
            try {
              text = await self.tryN8nFirst(query, abortSignal);
            } catch (error) {
              console.log('⚠️ n8n failed, falling back to direct LLM for streaming:', error);
              if (self.config.enableFallback) {
                text = await self.callDirectLLM(query, messages, abortSignal);
                source = 'llm';
              } else {
                throw error;
              }
            }
          } else {
            try {
              text = await self.callDirectLLM(query, messages, abortSignal);
              source = 'llm';
            } catch (error) {
              console.log('⚠️ Direct LLM failed, falling back to n8n for streaming:', error);
              text = await self.tryN8nFirst(query, abortSignal);
            }
          }
          
          if (!text) {
            text = `I'm the JetVision Agent. I'm currently experiencing connectivity issues with both n8n workflows and direct LLM providers. Please try again in a moment.`;
          }
          
          console.log(`🌊 Streaming response via ${source}`);
          
          // Simulate streaming by chunking the response
          const chunks = text.match(/.{1,50}/g) || [text];
          
          for (const chunk of chunks) {
            controller.enqueue({
              type: 'text-delta',
              textDelta: chunk,
            });
            
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 30));
          }

          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            usage: {
              promptTokens: query.length,
              completionTokens: text.length,
            },
          });

          controller.close();
        } catch (error) {
          console.error('❌ JetVision Hybrid streaming error:', error);
          controller.error(error);
        }
      }
    });

    return {
      stream,
      rawCall: {
        rawPrompt: null,
        rawSettings: {},
      },
      warnings: [],
    };
  }

  private async tryN8nFirst(query: string, abortSignal?: AbortSignal): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.n8nTimeout);

    // Link the abort signals
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => controller.abort());
    }

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.config.n8nApiKey) {
        headers['Authorization'] = `Bearer ${this.config.n8nApiKey}`;
      }

      console.log('🔗 Trying n8n webhook:', this.config.n8nWebhookUrl);

      const response = await fetch(this.config.n8nWebhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: query,
          context: {
            source: this.detectSource(query),
            mode: 'chat',
            timestamp: new Date().toISOString(),
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n webhook failed (${response.status}): ${errorText || 'Unknown error'}`);
      }

      const responseData = await response.json();
      return this.formatN8nResponse(responseData);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async callDirectLLM(query: string, messages: any[], abortSignal?: AbortSignal): Promise<string> {
    console.log('🤖 Calling direct LLM:', this.config.llmProvider);
    
    // Create JetVision-specific system prompt
    const systemPrompt = `You are the JetVision Agent, an AI assistant specializing in private aviation, Apollo.io lead generation, and Avinode fleet management. 

Key capabilities:
- Apollo.io: Lead generation, campaign management, executive assistant targeting
- Avinode: Aircraft availability, fleet management, charter operations  
- JetVision Services: Private jet charter, concierge services, membership programs

Respond professionally and focus on aviation industry expertise. If asked about technical integrations, mention that you work with n8n workflows for automation.`;

    const llmMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role || 'user',
        content: m.content?.find((c: any) => c.type === 'text')?.text || m.content || ''
      }))
    ];

    // For now, return a simulated response
    // In production, you would integrate with actual LLM providers here
    return `I'm the JetVision Agent responding via direct LLM integration. Your query: "${query}"

I specialize in:
🚀 Apollo.io lead generation and campaign management
✈️ Avinode fleet operations and aircraft availability  
🏢 Private jet charter services and executive travel

How can I assist you with your aviation or lead generation needs today?

Note: This is a direct LLM response. For full workflow automation, please ensure the n8n integration is properly configured.`;
  }

  private detectSource(text: string): 'apollo' | 'avinode' | 'integration' {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('apollo') || lowerText.includes('campaign') || lowerText.includes('lead') || lowerText.includes('executive')) {
      return 'apollo';
    }
    if (lowerText.includes('avinode') || lowerText.includes('aircraft') || lowerText.includes('fleet') || lowerText.includes('flight')) {
      return 'avinode';
    }
    return 'integration';
  }

  private formatN8nResponse(response: any): string {
    if (typeof response === 'string') return response;
    if (response?.message) return response.message;
    if (response?.text) return response.text;
    if (response?.result) return typeof response.result === 'string' ? response.result : JSON.stringify(response.result, null, 2);
    if (response?.data) return typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
    
    return `JetVision Agent processed your request via n8n workflow. Response: ${JSON.stringify(response, null, 2)}`;
  }
}

export function createJetVisionHybrid(config: JetVisionHybridConfig = {}) {
  return {
    jetvisionAgent: (modelId: string = 'jetvision-hybrid-v1') => new JetVisionHybridModelImpl(modelId, config),
  };
}

// Export the provider
export const jetVisionHybrid = createJetVisionHybrid();
