/**
 * AI Layer - Main Index
 * Stage 7: Central export point for all AI functionality
 *
 * This file provides the clean API surface for AI features throughout the app.
 * All AI functionality flows through this layer, which ensures:
 * - Provider abstraction
 * - Rate limiting
 * - Error handling with retries
 * - Fallback behavior
 * - Context assembly
 */

// Core provider abstraction
export {
  type AIProvider,
  type AIMessage,
  type AIStreamChunk,
  type AIResponse,
  type AIProviderConfig,
  AIProviderRegistry,
  aiProviderRegistry,
} from './provider';

// Anthropic provider
export { AnthropicProvider, ANTHROPIC_MODELS } from './providers/anthropic';

// Context assembly
export {
  type EntityContext,
  type EventContext,
  type AIContext,
  assembleEntityContext,
  assembleEventContext,
  assembleSpecProjectContext,
  formatContextForPrompt,
} from './context';

// Rate limiting
export {
  type RateLimitConfig,
  type RateLimitResult,
  RATE_LIMITS,
  checkUserRateLimit,
  checkGlobalRateLimit,
  checkRateLimit,
  resetUserRateLimit,
  RateLimitError,
  withRateLimit,
} from './rate-limiter';

// Error handling
export {
  type RetryConfig,
  type AIError,
  DEFAULT_RETRY_CONFIG,
  classifyError,
  withRetry,
  withTimeout,
  withRetryAndTimeout,
  AIOperationError,
} from './error-handler';

// Fallback system
export {
  type FallbackResponse,
  type FallbackConfig,
  AIFallbackHandler,
  aiFallbackHandler,
  FALLBACK_STRATEGIES,
} from './fallback';

// Legacy exports (from Stage 4) - kept for backward compatibility
export { MODELS, calculateCost, sendChatMessage, sendMessage, sendMessageWithSearch } from './claude';
export {
  CHAT_SYSTEM_PROMPT,
  RESEARCH_PHASE_1_PROMPT,
  RESEARCH_PHASE_2_PROMPT,
  RESEARCH_PHASE_3_PROMPT,
  RESEARCH_PHASE_4_PROMPT,
  SPEC_GENERATION_PROMPT,
  SPEC_VALIDATION_PROMPT,
} from './prompts';
export {
  type ResearchProgress,
  type ResearchProgressCallback,
  runPhase1,
  runPhase2,
  runPhase3,
  runPhase4,
  runFullResearch,
} from './research';
export {
  type SpecGenerationResult,
  type ValidationResult,
  generateSpec,
  validateSpec,
} from './spec-generation';

/**
 * Initialize the AI layer
 * Should be called once at application startup
 */
export function initializeAI(config?: {
  anthropicApiKey?: string;
  enableFallback?: boolean;
  enableCaching?: boolean;
}) {
  const apiKey = config?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('No Anthropic API key provided. AI features will be unavailable.');
    return;
  }

  // Register Anthropic as primary provider
  const anthropic = new AnthropicProvider({
    apiKey,
    defaultModel: ANTHROPIC_MODELS.CHAT,
  });

  aiProviderRegistry.register('anthropic', anthropic, true);

  console.log('AI layer initialized with Anthropic provider');
}

/**
 * High-level AI operation wrapper
 * Combines rate limiting, retries, and fallback
 */
export async function executeAIOperation<T>(
  userId: string,
  operation: keyof typeof RATE_LIMITS,
  fn: () => Promise<T>,
  options?: {
    enableFallback?: boolean;
    retryConfig?: Partial<RetryConfig>;
    timeoutMs?: number;
  }
): Promise<T> {
  // Check rate limit
  await withRateLimit(userId, operation, async () => {
    // Execute with retry and timeout
    return withRetryAndTimeout(fn, {
      retryConfig: options?.retryConfig,
      timeoutMs: options?.timeoutMs,
    });
  });

  // Return type assertion needed due to withRateLimit wrapper
  return fn();
}
