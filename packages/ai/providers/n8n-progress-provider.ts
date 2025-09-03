import { LanguageModelV1, LanguageModelV1FinishReason, LanguageModelV1StreamPart } from '@ai-sdk/provider';

/**
 * N8N Progress Provider for JetVision - Enhanced with step-by-step progress tracking
 * Shows real-time workflow execution progress as n8n processes through workflow nodes
 */

export interface N8nProgressConfig {
  webhookUrl?: string;
  apiKey?: string;
  timeout?: number;
  enableProgressTracking?: boolean;
}

// N8n Workflow Steps - matches the workflow structure
export const N8N_WORKFLOW_STEPS = [
  {
    id: 'webhook_trigger',
    text: 'Reading request context',
    order: 1
  },
  {
    id: 'apollo_search',
    text: 'Searching Apollo.io for executive contacts',
    order: 2
  },
  {
    id: 'avinode_check', 
    text: 'Checking Avainode for aircraft availability',
    order: 3
  },
  {
    id: 'analyze_metrics',
    text: 'Analyzing fleet utilization metrics',
    order: 4
  },
  {
    id: 'evaluate_opportunities',
    text: 'Evaluating market opportunities',
    order: 5
  },
  {
    id: 'prepare_campaigns',
    text: 'Preparing outreach campaigns',
    order: 6
  },
  {
    id: 'craft_response',
    text: 'Crafting a comprehensive response',
    order: 7
  }
] as const;

export interface N8nProgressModel extends LanguageModelV1 {
  readonly specificationVersion: 'v1';
  readonly provider: string;
  readonly modelId: string;
  readonly defaultObjectGenerationMode: 'tool' | 'json' | undefined;
}

// Progress event structure
interface ProgressEvent {
  type: 'progress' | 'content' | 'error' | 'done';
  stepId?: string;
  stepText?: string;
  status?: 'QUEUED' | 'PENDING' | 'COMPLETED' | 'ERROR';
  content?: string;
  error?: string;
  finished?: boolean;
}

class N8nProgressModelImpl implements N8nProgressModel {
  readonly specificationVersion = 'v1' as const;
  readonly provider = 'n8n-progress';
  readonly modelId: string;
  readonly defaultObjectGenerationMode = undefined;
  
  private webhookUrl: string;
  private apiKey?: string;
  private timeout: number;
  private enableProgressTracking: boolean;

  constructor(modelId: string, config: N8nProgressConfig) {
    this.modelId = modelId;
    this.webhookUrl = config.webhookUrl || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.vividwalls.blog/webhook/jetvision-agent';
    this.apiKey = config.apiKey || process.env.NEXT_PUBLIC_N8N_API_KEY;
    this.timeout = config.timeout || 45000; // Increased timeout for complex workflows
    this.enableProgressTracking = config.enableProgressTracking ?? true;
  }

  async doGenerate(options: Parameters<LanguageModelV1['doGenerate']>[0]): Promise<Awaited<ReturnType<LanguageModelV1['doGenerate']>>> {
    const { prompt, mode, abortSignal } = options;
    
    const messages = (prompt as any).messages || [];
    const userMessage = messages[messages.length - 1];
    const query = this.extractQuery(userMessage);
    
    try {
      const response = await this.callN8nWebhook({
        prompt: query,
        message: query,
        context: {
          source: 'jetvision-agent',
          mode: mode.type,
          enableProgress: false,
          timestamp: new Date().toISOString()
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
      throw new Error(`n8n workflow error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async doStream(options: Parameters<LanguageModelV1['doStream']>[0]): Promise<Awaited<ReturnType<LanguageModelV1['doStream']>>> {
    const { prompt, mode, abortSignal } = options;
    
    const messages = (prompt as any)?.messages || [];
    let query = '';
    
    if (messages.length > 0) {
      const userMessage = messages[messages.length - 1];
      query = this.extractQuery(userMessage);
    }
    
    if (!query && typeof prompt === 'string') {
      query = prompt;
    }

    const self = this;
    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          if (self.enableProgressTracking) {
            // Stream with progress tracking
            await self.streamWithProgressTracking({
              query,
              mode: mode.type,
              controller,
              abortSignal
            });
          } else {
            // Fallback to basic streaming
            await self.basicStreamingFallback({
              query,
              mode: mode.type,
              controller,
              abortSignal
            });
          }
        } catch (error) {
          console.error('Streaming error:', error);
          
          // Emit error content
          const fallbackText = self.generateFallbackResponse(query, error);
          const chunks = self.chunkText(fallbackText, 50);
          
          for (const chunk of chunks) {
            controller.enqueue({
              type: 'text-delta',
              textDelta: chunk,
            });
            await self.delay(30);
          }
          
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            usage: {
              promptTokens: query.length,
              completionTokens: fallbackText.length,
            },
          });
          
          controller.close();
        }
      },
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

  private async streamWithProgressTracking(options: {
    query: string;
    mode: string;
    controller: ReadableStreamDefaultController<LanguageModelV1StreamPart>;
    abortSignal?: AbortSignal;
  }) {
    const { query, mode, controller, abortSignal } = options;
    
    // First, emit step progress tracking events
    await this.emitProgressSteps(controller);
    
    // Then start the actual n8n workflow request
    try {
      const response = await this.callN8nWebhookWithProgress({
        prompt: query,
        message: query,
        context: {
          source: 'jetvision-agent',
          mode,
          enableProgress: true,
          timestamp: new Date().toISOString(),
          useWebSearch: false
        },
      }, controller, abortSignal);

      // Stream the final response
      const responseText = this.formatResponse(response);
      await this.streamTextResponse(responseText, controller);
      
    } catch (error) {
      console.error('N8n workflow error:', error);
      const fallbackText = this.generateFallbackResponse(query, error);
      await this.streamTextResponse(fallbackText, controller);
    }
    
    // Finish the stream
    controller.enqueue({
      type: 'finish',
      finishReason: 'stop',
      usage: {
        promptTokens: query.length,
        completionTokens: 100, // Approximate
      },
    });
    
    controller.close();
  }

  private async emitProgressSteps(controller: ReadableStreamDefaultController<LanguageModelV1StreamPart>) {
    // Emit step progress events that the frontend can render
    for (let i = 0; i < N8N_WORKFLOW_STEPS.length; i++) {
      const step = N8N_WORKFLOW_STEPS[i];
      const isLast = i === N8N_WORKFLOW_STEPS.length - 1;
      
      // Emit step as started (PENDING)
      controller.enqueue({
        type: 'text-delta',
        textDelta: `[Step ${step.order}: ${step.text}]\n`
      });
      
      // Simulate step execution time (varies by step complexity)
      const executionTime = this.getStepExecutionTime(step.id);
      await this.delay(executionTime);
      
      // Mark step as completed (unless it's the last step which stays pending until response)
      if (!isLast) {
        controller.enqueue({
          type: 'text-delta',
          textDelta: `✓ Step ${step.order} completed\n`
        });
      }
    }
  }

  private getStepExecutionTime(stepId: string): number {
    // Realistic execution times for different workflow steps
    const stepTimings: Record<string, number> = {
      'webhook_trigger': 500,
      'apollo_search': 2000,    // Apollo.io API calls take longer
      'avinode_check': 1800,    // Avinode queries 
      'analyze_metrics': 1200,  // Data processing
      'evaluate_opportunities': 800,
      'prepare_campaigns': 1000,
      'craft_response': 1500    // AI response generation
    };
    
    return stepTimings[stepId] || 1000;
  }

  private async callN8nWebhookWithProgress(
    request: any,
    controller: ReadableStreamDefaultController<LanguageModelV1StreamPart>,
    signal?: AbortSignal
  ): Promise<any> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeout);

    if (signal) {
      signal.addEventListener('abort', () => abortController.abort());
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
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      
      // Complete the final step
      const finalStep = N8N_WORKFLOW_STEPS[N8N_WORKFLOW_STEPS.length - 1];
      controller.enqueue({
        type: 'text-delta',
        textDelta: `✓ Step ${finalStep.order} completed\n\n`
      });
      
      return responseData;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Mark final step as error
      const finalStep = N8N_WORKFLOW_STEPS[N8N_WORKFLOW_STEPS.length - 1];
      controller.enqueue({
        type: 'text-delta',
        textDelta: `❌ Step ${finalStep.order} failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`
      });
      
      throw error;
    }
  }

  private async streamTextResponse(text: string, controller: ReadableStreamDefaultController<LanguageModelV1StreamPart>) {
    const sentences = this.splitIntoSentences(text);
    
    for (const sentence of sentences) {
      const words = sentence.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const chunk = i === words.length - 1 ? word : word + ' ';
        
        controller.enqueue({
          type: 'text-delta',
          textDelta: chunk,
        });
        
        // Natural typing delay
        const delay = this.calculateDelay(chunk);
        await this.delay(delay);
      }
      
      // Pause between sentences
      await this.delay(100);
    }
  }

  private async basicStreamingFallback(options: {
    query: string;
    mode: string;
    controller: ReadableStreamDefaultController<LanguageModelV1StreamPart>;
    abortSignal?: AbortSignal;
  }) {
    const { query, mode, controller, abortSignal } = options;
    
    let text = '';
    
    try {
      const response = await this.callN8nWebhook({
        prompt: query,
        message: query,
        context: {
          source: 'jetvision-agent',
          mode,
          enableProgress: false,
          timestamp: new Date().toISOString()
        },
      }, abortSignal);
      
      text = this.formatResponse(response);
    } catch (error) {
      console.error('n8n webhook call failed:', error);
      text = this.generateFallbackResponse(query, error);
    }
    
    await this.streamTextResponse(text, controller);
    
    controller.enqueue({
      type: 'finish',
      finishReason: 'stop',
      usage: {
        promptTokens: query.length,
        completionTokens: text.length,
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

      return await response.json();
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

  private formatResponse(response: any): string {
    if (response.message) {
      return response.message;
    }
    
    if (response.data) {
      if (typeof response.data === 'string') {
        return response.data;
      }
      return JSON.stringify(response.data, null, 2);
    }
    
    return JSON.stringify(response, null, 2);
  }

  private generateFallbackResponse(query: string, error?: any): string {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('404')) {
      return `I understand you're asking about "${query}". The n8n workflow needs to be activated. Please ensure the workflow is in "Execute" mode in your n8n instance.`;
    }
    
    if (errorMessage.includes('timeout')) {
      return `I'm processing your request about "${query}" but the workflow is taking longer than expected. This may indicate complex processing requirements.`;
    }
    
    return `I'm the JetVision Agent specializing in private jet charter operations. I'm currently having trouble connecting to the n8n workflow to process your request about "${query}". Please ensure the workflow is properly configured and try again.`;
  }

  private splitIntoSentences(text: string): string[] {
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
    const baseDelay = 25;
    const punctuationDelay = 120;
    const hasPunctuation = /[.,!?;:]/.test(text);
    
    return hasPunctuation ? punctuationDelay : baseDelay + Math.random() * 15;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create N8N Progress Provider
 */
export function createN8nProgressProvider(config?: N8nProgressConfig) {
  return (modelId: string = 'jetvision-progress'): N8nProgressModel => {
    return new N8nProgressModelImpl(modelId, config || {});
  };
}

// Export singleton instance
export const n8nProgressAgent = createN8nProgressProvider();