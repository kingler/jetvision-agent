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
    this.timeout = config.timeout || 10000; // Reduced to 10 seconds for better UX
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
        const textContent = userMessage.content.find((c: any) => c.type === 'text');
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

      console.log('🚀 Sending to n8n webhook:', this.webhookUrl);
      console.log('📤 Request body:', JSON.stringify(request, null, 2));
      console.log('⏱️ Timeout set to:', this.timeout, 'ms');

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ n8n webhook error:', response.status, errorText);
        console.error('🔗 Webhook URL:', this.webhookUrl);
        throw new Error(`n8n webhook failed (${response.status}): ${errorText || 'Unknown error'}`);
      }

      const responseData = await response.json();
      console.log('✅ n8n webhook response received:', JSON.stringify(responseData, null, 2));
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
    console.log('🔄 Formatting n8n response for Thread system:', response);

    // Handle string responses - perfect for MarkdownContent
    if (typeof response === 'string') {
      return response;
    }

    // Handle different response formats from n8n
    if (response?.message) {
      return response.message;
    }

    if (response?.text) {
      return response.text;
    }

    if (response?.result) {
      return typeof response.result === 'string' ? response.result : this.formatStructuredData(response.result);
    }

    if (response?.results && Array.isArray(response.results)) {
      // Format results as markdown for better display in ThreadItem
      return this.formatResultsAsMarkdown(response.results);
    }

    if (response?.data) {
      if (typeof response.data === 'string') {
        return response.data;
      }
      return this.formatStructuredData(response.data);
    }

    // Handle array responses (common in n8n)
    if (Array.isArray(response) && response.length > 0) {
      const firstItem = response[0];
      if (firstItem?.message) return firstItem.message;
      if (firstItem?.text) return firstItem.text;
      if (firstItem?.result) return typeof firstItem.result === 'string' ? firstItem.result : this.formatStructuredData(firstItem.result);

      // Format array as markdown list
      return this.formatArrayAsMarkdown(response);
    }

    // Default fallback with user-friendly markdown formatting
    const fallbackResponse = `## JetVision Agent Response

I processed your request successfully, but the response format needs optimization for display.

### Raw Response Data:
\`\`\`json
${JSON.stringify(response, null, 2)}
\`\`\`

Please contact support if you continue to see this message.`;

    console.log('⚠️ Using fallback response format for Thread system');
    return fallbackResponse;
  }

  /**
   * Format results as markdown for better display in ThreadItem
   */
  private formatResultsAsMarkdown(results: any[]): string {
    if (results.length === 0) {
      return "## No Results Found\n\nYour query didn't return any results. Please try refining your search terms.";
    }

    let formatted = `## Search Results\n\nFound **${results.length}** result${results.length > 1 ? 's' : ''}:\n\n`;

    results.forEach((result, index) => {
      formatted += `### ${index + 1}. ${result.title || result.name || 'Untitled Result'}\n\n`;

      if (result.subtitle || result.description) {
        formatted += `${result.subtitle || result.description}\n\n`;
      }

      if (result.metadata && typeof result.metadata === 'object') {
        formatted += `**Details:**\n`;
        Object.entries(result.metadata).forEach(([key, value]) => {
          formatted += `- **${key}**: ${value}\n`;
        });
        formatted += '\n';
      }

      if (result.score) {
        formatted += `*Match Score: ${result.score}%*\n\n`;
      }

      formatted += '---\n\n';
    });

    return formatted.trim();
  }

  /**
   * Format structured data as readable markdown
   */
  private formatStructuredData(data: any): string {
    if (typeof data === 'string') return data;
    if (typeof data === 'number' || typeof data === 'boolean') return String(data);

    if (Array.isArray(data)) {
      return this.formatArrayAsMarkdown(data);
    }

    if (typeof data === 'object' && data !== null) {
      let formatted = '';
      Object.entries(data).forEach(([key, value]) => {
        formatted += `**${key}**: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
      });
      return formatted;
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Format array as markdown list
   */
  private formatArrayAsMarkdown(array: any[]): string {
    if (array.length === 0) return 'No items found.';

    let formatted = '';
    array.forEach((item, index) => {
      if (typeof item === 'string') {
        formatted += `${index + 1}. ${item}\n`;
      } else if (typeof item === 'object' && item !== null) {
        formatted += `${index + 1}. ${item.title || item.name || 'Item'}\n`;
        if (item.description) {
          formatted += `   ${item.description}\n`;
        }
      } else {
        formatted += `${index + 1}. ${String(item)}\n`;
      }
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