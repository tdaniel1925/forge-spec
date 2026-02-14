/**
 * Anthropic (Claude) Provider Implementation
 * Stage 7: Concrete implementation of AIProvider interface
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  AIMessage,
  AIStreamChunk,
  AIResponse,
  AIProviderConfig,
} from '../provider';

export const ANTHROPIC_MODELS = {
  CHAT: 'claude-sonnet-4-5-20250929',
  RESEARCH: 'claude-sonnet-4-5-20250929',
  SPEC_GENERATION: 'claude-opus-4-6',
  TECH_REQUIREMENTS: 'claude-opus-4-6',
  VALIDATION: 'claude-sonnet-4-5-20250929',
  SPEC_REVISION: 'claude-sonnet-4-5-20250929',
} as const;

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * Stream chat messages
   */
  async *streamChat(
    messages: AIMessage[],
    options?: {
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): AsyncGenerator<AIStreamChunk> {
    try {
      const stream = await this.client.messages.create({
        model: options?.model || this.config.defaultModel || ANTHROPIC_MODELS.CHAT,
        max_tokens: options?.maxTokens || 4096,
        system: options?.systemPrompt,
        temperature: options?.temperature,
        messages: messages.map((m) => ({
          role: m.role === 'system' ? 'user' : m.role,
          content: m.content,
        })),
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield {
              type: 'text',
              content: event.delta.text,
            };
          }
        } else if (event.type === 'message_stop') {
          yield {
            type: 'done',
            content: '',
          };
        }
      }
    } catch (error) {
      yield {
        type: 'error',
        content: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Send non-streaming message
   */
  async sendMessage(
    messages: AIMessage[],
    options?: {
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<AIResponse> {
    const response = await this.client.messages.create({
      model: options?.model || this.config.defaultModel || ANTHROPIC_MODELS.CHAT,
      max_tokens: options?.maxTokens || 8192,
      system: options?.systemPrompt,
      temperature: options?.temperature,
      messages: messages.map((m) => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      })),
    });

    let fullContent = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        fullContent += block.text;
      }
    }

    return {
      content: fullContent,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  }

  /**
   * Send message with tools (e.g., web search)
   */
  async sendMessageWithTools(
    messages: AIMessage[],
    tools: any[],
    options?: {
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
    }
  ): Promise<AIResponse> {
    const response = await this.client.messages.create({
      model: options?.model || this.config.defaultModel || ANTHROPIC_MODELS.RESEARCH,
      max_tokens: options?.maxTokens || 8192,
      system: options?.systemPrompt,
      messages: messages.map((m) => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      })),
      tools,
    });

    let fullContent = '';
    const toolUses: any[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        fullContent += block.text;
      } else if (block.type === 'tool_use') {
        toolUses.push(block);
      }
    }

    return {
      content: fullContent,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
      metadata: {
        toolUses: toolUses.length > 0 ? toolUses : undefined,
      },
    };
  }

  /**
   * Calculate API cost
   * Rates as of Jan 2025:
   * - Sonnet: $3/MTok input, $15/MTok output
   * - Opus: $15/MTok input, $75/MTok output
   */
  calculateCost(
    usage: { input_tokens: number; output_tokens: number },
    model: string
  ): number {
    const inputTokens = usage.input_tokens || 0;
    const outputTokens = usage.output_tokens || 0;

    let inputRate = 0;
    let outputRate = 0;

    if (model.includes('opus')) {
      inputRate = 15 / 1_000_000;
      outputRate = 75 / 1_000_000;
    } else {
      // Sonnet
      inputRate = 3 / 1_000_000;
      outputRate = 15 / 1_000_000;
    }

    return inputTokens * inputRate + outputTokens * outputRate;
  }

  /**
   * Check if Anthropic API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple ping to check API availability
      // Use a minimal request with low token count
      await this.client.messages.create({
        model: ANTHROPIC_MODELS.CHAT,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch (error) {
      console.error('Anthropic provider unavailable:', error);
      return false;
    }
  }
}
