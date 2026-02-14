/**
 * AI Provider Abstraction Layer
 * Stage 7: Provider-agnostic wrapper for AI services
 *
 * This allows switching between different AI providers (Anthropic, OpenAI, etc.)
 * without changing business logic throughout the application.
 */

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIStreamChunk {
  type: 'text' | 'tool_use' | 'done' | 'error';
  content: string;
  toolName?: string;
  toolInput?: any;
  error?: Error;
}

export interface AIResponse {
  content: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  metadata?: Record<string, any>;
}

export interface AIProviderConfig {
  apiKey: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface AIProvider {
  /**
   * Send a streaming chat message
   */
  streamChat(
    messages: AIMessage[],
    options?: {
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): AsyncGenerator<AIStreamChunk>;

  /**
   * Send a non-streaming message
   */
  sendMessage(
    messages: AIMessage[],
    options?: {
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<AIResponse>;

  /**
   * Send a message with tool use (e.g., web search)
   */
  sendMessageWithTools(
    messages: AIMessage[],
    tools: any[],
    options?: {
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
    }
  ): Promise<AIResponse>;

  /**
   * Calculate cost for a given usage
   */
  calculateCost(usage: { input_tokens: number; output_tokens: number }, model: string): number;

  /**
   * Check if the provider is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * AI Provider Registry
 * Manages multiple AI providers and allows fallback
 */
export class AIProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private primaryProvider: string | null = null;
  private fallbackOrder: string[] = [];

  /**
   * Register an AI provider
   */
  register(name: string, provider: AIProvider, isPrimary: boolean = false): void {
    this.providers.set(name, provider);
    if (isPrimary) {
      this.primaryProvider = name;
    }
  }

  /**
   * Set fallback order for providers
   */
  setFallbackOrder(order: string[]): void {
    this.fallbackOrder = order;
  }

  /**
   * Get the primary provider or fallback
   */
  async getProvider(): Promise<{ name: string; provider: AIProvider }> {
    // Try primary provider first
    if (this.primaryProvider) {
      const provider = this.providers.get(this.primaryProvider);
      if (provider && (await provider.isAvailable())) {
        return { name: this.primaryProvider, provider };
      }
    }

    // Try fallback providers
    for (const name of this.fallbackOrder) {
      const provider = this.providers.get(name);
      if (provider && (await provider.isAvailable())) {
        return { name, provider };
      }
    }

    throw new Error('No AI provider available');
  }

  /**
   * Get a specific provider by name
   */
  getProviderByName(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }
}

/**
 * Global provider registry instance
 */
export const aiProviderRegistry = new AIProviderRegistry();
