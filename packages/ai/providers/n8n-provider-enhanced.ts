import { LanguageModelV1, LanguageModelV1FinishReason, LanguageModelV1StreamPart } from '@ai-sdk/provider';

/**
 * Enhanced n8n Agent Provider for JetVision with proper streaming support
 * Routes chat completions through n8n webhook workflow with real-time streaming
 */

export interface N8nProviderConfig {
  webhookUrl?: string;
  apiKey?: string;
  timeout?: number;
  streamingEnabled?: boolean;
}

export interface N8nAgentModel extends LanguageModelV1 {
  readonly specificationVersion: 'v1';
  readonly provider: string;
  readonly modelId: string;
  readonly defaultObjectGenerationMode: 'tool' | 'json' | undefined;
}

// Enhanced response structure from n8n
interface N8nStreamResponse {
  type: 'content' | 'error' | 'metadata' | 'done';
  content?: string;
  error?: string;
  metadata?: any;
  finished?: boolean;
}

class N8nAgentModelImpl implements N8nAgentModel {
  readonly specificationVersion = 'v1' as const;
  readonly provider = 'n8n-agent';
  readonly modelId: string;
  readonly defaultObjectGenerationMode = undefined;
  
  private webhookUrl: string;
  private apiKey?: string;
  private timeout: number;
  private streamingEnabled: boolean;

  constructor(modelId: string, config: N8nProviderConfig) {
    this.modelId = modelId;
    this.webhookUrl = config.webhookUrl || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/jetvision-agent';
    this.apiKey = config.apiKey || process.env.NEXT_PUBLIC_N8N_API_KEY;
    this.timeout = config.timeout || 30000;
    this.streamingEnabled = config.streamingEnabled ?? true;
  }

  async doGenerate(options: Parameters<LanguageModelV1['doGenerate']>[0]): Promise<Awaited<ReturnType<LanguageModelV1['doGenerate']>>> {
    const { prompt, mode, abortSignal } = options;
    
    // Extract the user's message from the prompt
    const messages = (prompt as any).messages || [];
    const userMessage = messages[messages.length - 1];
    const query = this.extractQuery(userMessage);
    
    // Detect source based on content
    const source = this.detectSource(query);
    
    try {
      const response = await this.callN8nWebhook({
        prompt: query,
        context: {
          source,
          mode: mode.type,
          messages: messages,
          streaming: false
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
    
    // Extract the user's message
    const messages = (prompt as any)?.messages || [];
    let query = '';
    
    if (messages.length > 0) {
      const userMessage = messages[messages.length - 1];
      query = this.extractQuery(userMessage);
    }
    
    // If still no query, check if there's a prompt directly
    if (!query && typeof prompt === 'string') {
      query = prompt;
    }
    
    // Detect source
    const source = this.detectSource(query);

    const self = this;
    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        let totalTokens = 0;
        let responseText = '';
        
        try {
          if (self.streamingEnabled) {
            // Attempt real streaming with n8n
            await self.streamWithN8n({
              query,
              source,
              mode: mode.type,
              messages,
              controller,
              abortSignal
            });
          } else {
            // Fallback to simulated streaming
            await self.simulateStreaming({
              query,
              source,
              mode: mode.type,
              messages,
              controller,
              abortSignal
            });
          }
        } catch (error) {
          console.error('Streaming error:', error);
          
          // Fallback response on error
          const fallbackText = self.generateFallbackResponse(query, error);
          const chunks = self.chunkText(fallbackText, 50);
          
          for (const chunk of chunks) {
            controller.enqueue({
              type: 'text-delta',
              textDelta: chunk,
            });
            totalTokens += chunk.length;
            await self.delay(30);
          }
          
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            usage: {
              promptTokens: query.length,
              completionTokens: totalTokens,
            },
          });
          
          controller.close();
        }
      },
      cancel() {
        console.log('Stream cancelled by user');
        // AbortSignal doesn't have an abort method, it's read-only
        // The abort() method is on AbortController
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

  private async streamWithN8n(options: {
    query: string;
    source: string;
    mode: string;
    messages: any[];
    controller: ReadableStreamDefaultController<LanguageModelV1StreamPart>;
    abortSignal?: AbortSignal;
  }) {
    const { query, source, mode, messages, controller, abortSignal } = options;
    
    // Try to use EventSource for real streaming if the n8n webhook supports it
    if (typeof EventSource !== 'undefined') {
      return this.streamWithEventSource(options);
    }
    
    // Otherwise, use chunked HTTP response streaming
    return this.streamWithChunkedResponse(options);
  }

  private async streamWithEventSource(options: {
    query: string;
    source: string;
    mode: string;
    messages: any[];
    controller: ReadableStreamDefaultController<LanguageModelV1StreamPart>;
    abortSignal?: AbortSignal;
  }) {
    const { query, source, mode, messages, controller, abortSignal } = options;
    
    return new Promise<void>((resolve, reject) => {
      const params = new URLSearchParams({
        prompt: query,
        source,
        mode,
      });
      
      if (this.apiKey) {
        params.append('apiKey', this.apiKey);
      }
      
      const eventSource = new EventSource(`${this.webhookUrl}/stream?${params}`);
      let totalTokens = 0;
      
      // Handle abort signal
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          eventSource.close();
          controller.close();
          resolve();
        });
      }
      
      eventSource.onmessage = (event) => {
        try {
          const data: N8nStreamResponse = JSON.parse(event.data);
          
          if (data.type === 'content' && data.content) {
            controller.enqueue({
              type: 'text-delta',
              textDelta: data.content,
            });
            totalTokens += data.content.length;
          } else if (data.type === 'error') {
            controller.enqueue({
              type: 'error',
              error: new Error(data.error || 'Unknown error'),
            });
          } else if (data.type === 'done' || data.finished) {
            controller.enqueue({
              type: 'finish',
              finishReason: 'stop',
              usage: {
                promptTokens: query.length,
                completionTokens: totalTokens,
              },
            });
            eventSource.close();
            controller.close();
            resolve();
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        eventSource.close();
        
        // Fall back to simulated streaming
        this.simulateStreaming({
          query,
          source,
          mode,
          messages,
          controller,
          abortSignal
        }).then(resolve).catch(reject);
      };
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (eventSource.readyState !== EventSource.CLOSED) {
          eventSource.close();
          controller.close();
          resolve();
        }
      }, this.timeout);
    });
  }

  private async streamWithChunkedResponse(options: {
    query: string;
    source: string;
    mode: string;
    messages: any[];
    controller: ReadableStreamDefaultController<LanguageModelV1StreamPart>;
    abortSignal?: AbortSignal;
  }) {
    const { query, source, mode, messages, controller, abortSignal } = options;
    
    const abortController = new AbortController();
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => abortController.abort());
    }
    
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          prompt: query,
          context: {
            source,
            mode,
            messages,
            streaming: true
          },
        }),
        signal: abortController.signal,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      let buffer = '';
      let totalTokens = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.content) {
                controller.enqueue({
                  type: 'text-delta',
                  textDelta: data.content,
                });
                totalTokens += data.content.length;
              }
              
              if (data.finished) {
                controller.enqueue({
                  type: 'finish',
                  finishReason: 'stop',
                  usage: {
                    promptTokens: query.length,
                    completionTokens: totalTokens,
                  },
                });
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      
      controller.close();
    } catch (error) {
      // Fall back to simulated streaming
      await this.simulateStreaming(options);
    }
  }

  private async simulateStreaming(options: {
    query: string;
    source: string;
    mode: string;
    messages: any[];
    controller: ReadableStreamDefaultController<LanguageModelV1StreamPart>;
    abortSignal?: AbortSignal;
  }) {
    const { query, source, mode, messages, controller, abortSignal } = options;
    
    let text = '';
    
    try {
      const response = await this.callN8nWebhook({
        prompt: query,
        context: {
          source,
          mode,
          messages,
          streaming: false
        },
      }, abortSignal);
      
      text = this.formatResponse(response);
    } catch (error) {
      console.error('n8n webhook call failed:', error);
      text = this.generateFallbackResponse(query, error);
    }
    
    if (!text) {
      text = `Processing your request about: "${query}". Please ensure the n8n workflow is properly configured.`;
    }
    
    // Enhanced streaming simulation with natural pauses
    const sentences = this.splitIntoSentences(text);
    let totalTokens = 0;
    
    for (const sentence of sentences) {
      const words = sentence.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const chunk = i === words.length - 1 ? word : word + ' ';
        
        controller.enqueue({
          type: 'text-delta',
          textDelta: chunk,
        });
        
        totalTokens += chunk.length;
        
        // Variable delay for more natural streaming
        const delay = this.calculateDelay(chunk);
        await this.delay(delay);
      }
      
      // Longer pause between sentences
      await this.delay(100);
    }
    
    controller.enqueue({
      type: 'finish',
      finishReason: 'stop',
      usage: {
        promptTokens: query.length,
        completionTokens: totalTokens,
      },
    });
    
    controller.close();
  }

  private async callN8nWebhook(request: any, signal?: AbortSignal): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

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

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private extractQuery(message: any): string {
    if (message?.content && Array.isArray(message.content)) {
      const textContent = message.content.find((c: any) => c.type === 'text');
      return textContent?.text || '';
    } else if (typeof message?.content === 'string') {
      return message.content;
    }
    return '';
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
    if (response.message) {
      return response.message;
    }
    
    if (response.results && Array.isArray(response.results)) {
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

    let formatted = `I found ${results.length} result${results.length > 1 ? 's' : ''} for your query:\n\n`;
    
    results.forEach((result, index) => {
      formatted += `**${index + 1}. ${result.title || result.name || 'Result'}**\n`;
      
      if (result.subtitle || result.description) {
        formatted += `${result.subtitle || result.description}\n`;
      }
      
      if (result.metadata) {
        Object.entries(result.metadata).forEach(([key, value]) => {
          formatted += `• ${this.formatKey(key)}: ${value}\n`;
        });
      }
      
      if (result.score) {
        formatted += `• Match Score: ${result.score}%\n`;
      }
      
      formatted += '\n';
    });
    
    return formatted;
  }

  private formatKey(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }

  private generateFallbackResponse(query: string, error?: any): string {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('404')) {
      return `I understand you're asking about "${query}". The n8n workflow needs to be activated. Please ensure the workflow is in "Execute" mode in your n8n instance.`;
    }
    
    if (errorMessage.includes('timeout')) {
      return `I'm processing your request about "${query}" but the response is taking longer than expected. Please try again in a moment.`;
    }
    
    return `I'm the JetVision Agent specializing in Apollo.io lead generation and Avinode fleet management. I'm currently having trouble connecting to process your request about "${query}". Please ensure the n8n workflow is properly configured and try again.`;
  }

  private splitIntoSentences(text: string): string[] {
    // Enhanced sentence splitting that preserves formatting
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    return sentences.map(s => s.trim()).filter(s => s.length > 0);
  }

  private chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const words = text.split(' ');
    let currentChunk = '';
    
    for (const word of words) {
      if ((currentChunk + ' ' + word).length > chunkSize && currentChunk) {
        chunks.push(currentChunk);
        currentChunk = word;
      } else {
        currentChunk = currentChunk ? currentChunk + ' ' + word : word;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  private calculateDelay(text: string): number {
    // Natural typing speed simulation
    const baseDelay = 30;
    const punctuationDelay = 150;
    const hasPunctuation = /[.,!?;:]/.test(text);
    
    return hasPunctuation ? punctuationDelay : baseDelay + Math.random() * 20;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create enhanced n8n Agent Provider
 */
export function createN8nAgent(config?: N8nProviderConfig) {
  return (modelId: string = 'jetvision-agent'): N8nAgentModel => {
    return new N8nAgentModelImpl(modelId, config || {});
  };
}

// Export a singleton instance
export const n8nAgent = createN8nAgent();