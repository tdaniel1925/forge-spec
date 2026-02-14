/**
 * Claude API integration for ForgeSpec
 * Handles all interactions with Anthropic's Claude API
 *
 * Models used per PROJECT-SPEC.md Gate 5:
 * - Chat: claude-sonnet-4-5-20250929
 * - Research: claude-sonnet-4-5-20250929 with web_search
 * - Spec Generation: claude-opus-4-6
 * - Tech Requirements: claude-opus-4-6
 * - Validation: claude-sonnet-4-5-20250929
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODELS = {
  CHAT: 'claude-sonnet-4-5-20250929',
  RESEARCH: 'claude-sonnet-4-5-20250929',
  SPEC_GENERATION: 'claude-opus-4-6',
  TECH_REQUIREMENTS: 'claude-opus-4-6',
  VALIDATION: 'claude-sonnet-4-5-20250929',
  SPEC_REVISION: 'claude-sonnet-4-5-20250929',
} as const;

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamChunk {
  type: 'text' | 'tool_use' | 'done';
  content: string;
  toolName?: string;
  toolInput?: any;
}

/**
 * Send a chat message and get streaming response
 */
export async function* sendChatMessage(
  messages: Message[],
  systemPrompt?: string
): AsyncGenerator<StreamChunk> {
  const stream = await anthropic.messages.create({
    model: MODELS.CHAT,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role,
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
}

/**
 * Send a message with web search tool enabled
 * Used for research phases
 */
export async function sendMessageWithSearch(
  messages: Message[],
  systemPrompt: string,
  model: string = MODELS.RESEARCH
): Promise<{ content: string; searchResults?: any; usage: any }> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    tools: [
      {
        type: 'web_search_20250502' as any,
        name: 'web_search',
        max_uses: 15, // Allow up to 15 searches for thorough research
      },
    ],
  });

  let fullContent = '';
  let searchResults: any[] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      fullContent += block.text;
    } else if (block.type === 'tool_use' && block.name === 'web_search') {
      searchResults.push(block);
    }
  }

  return {
    content: fullContent,
    searchResults: searchResults.length > 0 ? searchResults : undefined,
    usage: response.usage,
  };
}

/**
 * Send a non-streaming message (for spec generation, validation)
 */
export async function sendMessage(
  messages: Message[],
  systemPrompt: string,
  model: string = MODELS.CHAT,
  maxTokens: number = 8192
): Promise<{ content: string; usage: any }> {
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role,
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
    usage: response.usage,
  };
}

/**
 * Calculate API cost based on usage
 * Rates as of Jan 2025:
 * - Sonnet: $3/MTok input, $15/MTok output
 * - Opus: $15/MTok input, $75/MTok output
 */
export function calculateCost(usage: any, model: string): number {
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
