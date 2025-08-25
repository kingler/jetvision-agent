import { LanguageModelV1, LanguageModelV1CallWarning, LanguageModelV1FinishReason, LanguageModelV1StreamPart } from '@ai-sdk/provider';
import { ParseResult } from '@ai-sdk/provider-utils';

/**
 * n8n Agent Provider for JetVision
 * Routes chat completions through n8n webhook workflow instead of traditional LLM providers
 */

export interface N8nProviderConfig {
  webhookUrl?: string;
  apiKey?: string;
  timeout?: number;
}

export interface N8nAgentModel extends LanguageModelV1 {
  readonly specificationVersion: 'v1';
  readonly provider: string;
  readonly modelId: string;
  readonly defaultObjectGenerationMode: 'tool' | 'json' | undefined;
}

class N8nAgentModelImpl implements N8nAgentModel {
  readonly specificationVersion = 'v1' as const;
  readonly provider = 'n8n-agent';
  readonly modelId: string;
  readonly defaultObjectGenerationMode = undefined;
  
  private webhookUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(modelId: string, config: N8nProviderConfig) {
    this.modelId = modelId;
    this.webhookUrl = config.webhookUrl || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/jetvision-agent';
    this.apiKey = config.apiKey || process.env.NEXT_PUBLIC_N8N_API_KEY;
    this.timeout = config.timeout || 30000;
  }

  async doGenerate(options: Parameters<LanguageModelV1['doGenerate']>[0]): Promise<Awaited<ReturnType<LanguageModelV1['doGenerate']>>> {
    const { prompt, mode, abortSignal } = options;
    
    // Extract the user's message from the prompt
    const messages = (prompt as any).messages || [];
    const userMessage = messages[messages.length - 1];
    const query = userMessage?.content?.find((c: any) => c.type === 'text')?.text || '';
    
    // Detect source based on content
    const source = this.detectSource(query);
    
    try {
      const response = await this.callN8nWebhook({
        prompt: query,
        context: {
          source,
          mode: mode.type,
          messages: messages,
        },
      }, abortSignal);

      const text = this.formatResponse(response);

      return {
        finishReason: 'stop' as LanguageModelV1FinishReason,
        usage: {
          promptTokens: query.length,
          completionTokens: text.length,
        },
        text,
        rawCall: {
          rawPrompt: null,
          rawSettings: {},
        },
        warnings: [],
      };
    } catch (error) {
      throw new Error(`n8n webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async doStream(options: Parameters<LanguageModelV1['doStream']>[0]): Promise<Awaited<ReturnType<LanguageModelV1['doStream']>>> {
    const { prompt, mode, abortSignal } = options;
    
    console.log('doStream called with prompt:', JSON.stringify(prompt, null, 2));
    
    // Extract the user's message
    let query = '';
    const messages = (prompt as any)?.messages || [];
    
    console.log('Messages array:', messages);
    
    if (messages.length > 0) {
      const userMessage = messages[messages.length - 1];
      console.log('Last message:', userMessage);
      
      if (userMessage?.content && Array.isArray(userMessage.content)) {
        const textContent = userMessage.content.find(c => c.type === 'text');
        query = textContent?.text || '';
        console.log('Extracted query from array content:', query);
      } else if (typeof userMessage?.content === 'string') {
        query = userMessage.content;
        console.log('Extracted query from string content:', query);
      }
    }
    
    // If still no query, check if there's a prompt directly
    if (!query && typeof prompt === 'string') {
      query = prompt;
      console.log('Using direct prompt as query:', query);
    }
    
    console.log('Final query:', query);
    
    // Detect source
    const source = this.detectSource(query);

    const self = this;
    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          // For now, we'll do a non-streaming call and simulate streaming
          // In production, you'd use EventSource for real streaming
          let text = '';
          
          try {
            const response = await self.callN8nWebhook({
              prompt: query,
              context: {
                source,
                mode: mode.type,
                messages: messages,
              },
            }, abortSignal);
            
            text = self.formatResponse(response);
          } catch (error) {
            console.error('n8n webhook call failed:', error);
            // Provide a fallback response
            text = `I'm the JetVision Agent specializing in Apollo.io lead generation and Avinode fleet management. I'm currently having trouble connecting to the backend service. Your query was: "${query}". Please try again in a moment.`;
          }
          
          if (!text) {
            text = `Processing your request about: "${query}". The n8n workflow is being configured. Please ensure the webhook is activated in test mode.`;
          }
          
          // Simulate streaming by chunking the response
          const chunks = text.match(/.{1,50}/g) || [text];
          
          for (const chunk of chunks) {
            controller.enqueue({
              type: 'text-delta',
              textDelta: chunk,
            });
            
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
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

  private async callN8nWebhook(request: any, signal?: AbortSignal): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    // Link the abort signals
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      console.log('Sending to n8n webhook:', this.webhookUrl);
      console.log('Request body:', JSON.stringify(request, null, 2));

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('n8n webhook error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log('n8n webhook response:', JSON.stringify(responseData, null, 2));
      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
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

  private formatResponse(response: any): string {
    // Handle different response formats from n8n
    if (response.message) {
      return response.message;
    }
    
    if (response.results && Array.isArray(response.results)) {
      // Format results as a structured response
      return this.formatResults(response.results);
    }
    
    if (response.data) {
      if (typeof response.data === 'string') {
        return response.data;
      }
      return JSON.stringify(response.data, null, 2);
    }
    
    return JSON.stringify(response, null, 2);
  }

  private formatResults(results: any[]): string {
    if (results.length === 0) {
      return "No results found for your query.";
    }

    let formatted = `Found ${results.length} result${results.length > 1 ? 's' : ''}:\n\n`;
    
    results.forEach((result, index) => {
      formatted += `**${index + 1}. ${result.title || result.name || 'Result'}**\n`;
      
      if (result.subtitle || result.description) {
        formatted += `${result.subtitle || result.description}\n`;
      }
      
      if (result.metadata) {
        Object.entries(result.metadata).forEach(([key, value]) => {
          formatted += `- ${key}: ${value}\n`;
        });
      }
      
      if (result.score) {
        formatted += `- Match Score: ${result.score}%\n`;
      }
      
      formatted += '\n';
    });
    
    return formatted;
  }
}

/**
 * Create n8n Agent Provider
 */
export function createN8nAgent(config?: N8nProviderConfig) {
  return (modelId: string = 'jetvision-agent'): N8nAgentModel => {
    return new N8nAgentModelImpl(modelId, config || {});
  };
}

// Export a singleton instance
export const n8nAgent = createN8nAgent();