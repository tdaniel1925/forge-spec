/**
 * AI Fallback Behavior System
 * Stage 7: Graceful degradation when AI is unavailable
 *
 * Provides fallback responses and maintains system functionality
 * when primary AI provider is down or rate-limited
 */

export interface FallbackResponse {
  source: 'ai' | 'fallback' | 'cache';
  content: string;
  isPartial: boolean;
  warning?: string;
}

export interface FallbackConfig {
  enableCache?: boolean;
  cacheTimeoutMs?: number;
  provideFallbackMessages?: boolean;
  fallbackMessages?: Record<string, string>;
}

/**
 * Simple in-memory cache for AI responses
 * For production, use Redis or similar distributed cache
 */
class AIResponseCache {
  private cache: Map<
    string,
    {
      response: string;
      timestamp: number;
    }
  > = new Map();

  set(key: string, response: string, ttlMs: number): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now() + ttlMs,
    });
  }

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.timestamp < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  clear(): void {
    this.cache.clear();
  }
}

const responseCache = new AIResponseCache();

/**
 * Generate cache key for AI request
 */
function generateCacheKey(
  operation: string,
  inputs: any[]
): string {
  const inputHash = JSON.stringify(inputs);
  return `ai:${operation}:${inputHash.substring(0, 100)}`;
}

/**
 * Default fallback messages for common operations
 */
const DEFAULT_FALLBACK_MESSAGES: Record<string, string> = {
  chat: 'I apologize, but I\'m currently experiencing technical difficulties. Please try again in a few moments, or contact support if the issue persists.',

  research: 'Unable to complete research at this time. You can continue manually by:\n1. Searching for competitors in your domain\n2. Analyzing their features\n3. Identifying user pain points\n4. Creating your spec based on findings',

  spec_generation: 'Spec generation is temporarily unavailable. You can:\n1. Review your research notes\n2. Download a blank spec template\n3. Fill in the gates manually\n4. Try generation again later',

  validation: 'Validation service is temporarily unavailable. Please review your spec manually and ensure:\n- All entities have CRUD operations\n- All relationships are defined\n- All permissions are specified',
};

/**
 * Fallback handler for AI operations
 */
export class AIFallbackHandler {
  private config: FallbackConfig;

  constructor(config: FallbackConfig = {}) {
    this.config = {
      enableCache: true,
      cacheTimeoutMs: 60 * 60 * 1000, // 1 hour
      provideFallbackMessages: true,
      fallbackMessages: DEFAULT_FALLBACK_MESSAGES,
      ...config,
    };
  }

  /**
   * Try to get cached response
   */
  getCachedResponse(
    operation: string,
    inputs: any[]
  ): FallbackResponse | null {
    if (!this.config.enableCache) return null;

    const cacheKey = generateCacheKey(operation, inputs);
    const cached = responseCache.get(cacheKey);

    if (cached) {
      return {
        source: 'cache',
        content: cached,
        isPartial: false,
        warning: 'This is a cached response from a previous request',
      };
    }

    return null;
  }

  /**
   * Cache successful AI response
   */
  cacheResponse(
    operation: string,
    inputs: any[],
    response: string
  ): void {
    if (!this.config.enableCache) return;

    const cacheKey = generateCacheKey(operation, inputs);
    responseCache.set(cacheKey, response, this.config.cacheTimeoutMs!);
  }

  /**
   * Get fallback message for an operation
   */
  getFallbackMessage(operation: string): FallbackResponse {
    const fallbackMessages = this.config.fallbackMessages || DEFAULT_FALLBACK_MESSAGES;
    const message = fallbackMessages[operation] || fallbackMessages['chat'];

    return {
      source: 'fallback',
      content: message,
      isPartial: true,
      warning: 'AI is currently unavailable. This is a fallback response.',
    };
  }

  /**
   * Handle AI operation with fallback
   */
  async withFallback<T>(
    operation: string,
    inputs: any[],
    aiOperation: () => Promise<T>,
    options?: {
      transformResponse?: (response: T) => string;
      parseResponse?: (content: string) => T;
    }
  ): Promise<{ result: T | null; fallback?: FallbackResponse }> {
    // Try cache first
    if (this.config.enableCache) {
      const cached = this.getCachedResponse(operation, inputs);
      if (cached && options?.parseResponse) {
        try {
          const parsed = options.parseResponse(cached.content);
          return { result: parsed, fallback: cached };
        } catch {
          // Cache parse failed, continue to AI
        }
      }
    }

    // Try AI operation
    try {
      const result = await aiOperation();

      // Cache successful response
      if (this.config.enableCache && options?.transformResponse) {
        const responseStr = options.transformResponse(result);
        this.cacheResponse(operation, inputs, responseStr);
      }

      return { result };
    } catch (error) {
      console.error(`AI operation '${operation}' failed:`, error);

      // Provide fallback
      if (this.config.provideFallbackMessages) {
        const fallback = this.getFallbackMessage(operation);
        return { result: null, fallback };
      }

      // Re-throw if no fallback configured
      throw error;
    }
  }

  /**
   * Clear all cached responses
   */
  clearCache(): void {
    responseCache.clear();
  }
}

/**
 * Global fallback handler instance
 */
export const aiFallbackHandler = new AIFallbackHandler();

/**
 * Graceful degradation strategies for specific operations
 */
export const FALLBACK_STRATEGIES = {
  /**
   * Chat fallback: queue message for later processing
   */
  async queueChatMessage(
    userId: string,
    specProjectId: string,
    message: string
  ): Promise<void> {
    // In production, queue this in a job system
    console.log(`Queued chat message for later processing: ${userId}/${specProjectId}`);

    // Could store in database with 'pending_ai_processing' status
    // When AI comes back online, process queued messages
  },

  /**
   * Research fallback: provide manual research template
   */
  getManualResearchTemplate(): string {
    return `# Manual Research Template

## Phase 1: Domain Analysis
1. Search for top 5-10 competitors
2. For each competitor, note:
   - Name and URL
   - Key features
   - Pricing model
   - Strengths and weaknesses

## Phase 2: Feature Decomposition
1. List major feature areas
2. Break down each area into sub-features
3. Identify atomic components

## Phase 3: Technical Requirements
1. Choose your stack
2. Identify required libraries
3. Estimate build time and cost

## Phase 4: Competitive Gaps
1. What do competitors miss?
2. What's your unique angle?
3. Define MVP scope`;
  },

  /**
   * Spec generation fallback: provide blank template
   */
  getBlankSpecTemplate(): string {
    return `# PROJECT-SPEC.md

# GATE 0 — IDENTITY
[Fill in: System name, tagline, description, target users]

# GATE 1 — ENTITY MODEL
[Fill in: Entities, relationships, fields]

# GATE 2 — STATE CHANGES
[Fill in: Actor → Action → State Change]

# GATE 3 — PERMISSIONS & DATA RULES
[Fill in: Role permissions, data mutability]

# GATE 4 — DEPENDENCY MAP
[Fill in: Adjacency list, data flows]

# GATE 5 — INTEGRATIONS
[Fill in: External services, APIs]`;
  },
};
