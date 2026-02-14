/**
 * AI Error Handler with Retry Logic
 * Stage 7: Enhanced error handling for AI operations
 *
 * Handles transient failures, rate limits, and provides graceful degradation
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  retryableErrors: string[];
}

export interface AIError {
  type: 'rate_limit' | 'timeout' | 'api_error' | 'network' | 'validation' | 'unknown';
  message: string;
  retryable: boolean;
  retryAfter?: number; // seconds
  originalError?: Error;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  exponentialBackoff: true,
  retryableErrors: ['rate_limit_error', 'timeout', 'network_error', 'service_unavailable'],
};

/**
 * Parse and classify AI errors
 */
export function classifyError(error: any): AIError {
  // Rate limit errors
  if (
    error.message?.includes('rate limit') ||
    error.status === 429 ||
    error.type === 'rate_limit_error'
  ) {
    const retryAfter = error.headers?.['retry-after'] || 60;
    return {
      type: 'rate_limit',
      message: 'Rate limit exceeded',
      retryable: true,
      retryAfter: parseInt(retryAfter, 10),
      originalError: error,
    };
  }

  // Timeout errors
  if (
    error.message?.includes('timeout') ||
    error.code === 'ETIMEDOUT' ||
    error.type === 'timeout'
  ) {
    return {
      type: 'timeout',
      message: 'Request timed out',
      retryable: true,
      originalError: error,
    };
  }

  // Network errors
  if (
    error.message?.includes('network') ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND'
  ) {
    return {
      type: 'network',
      message: 'Network error',
      retryable: true,
      originalError: error,
    };
  }

  // API errors (4xx - not retryable, 5xx - retryable)
  if (error.status) {
    const status = error.status;
    if (status >= 500) {
      return {
        type: 'api_error',
        message: `API error: ${error.message || 'Server error'}`,
        retryable: true,
        originalError: error,
      };
    } else if (status >= 400) {
      return {
        type: 'validation',
        message: `Client error: ${error.message || 'Bad request'}`,
        retryable: false,
        originalError: error,
      };
    }
  }

  // Unknown errors - conservative approach: not retryable
  return {
    type: 'unknown',
    message: error.message || 'Unknown error',
    retryable: false,
    originalError: error,
  };
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(
  attempt: number,
  config: RetryConfig,
  retryAfter?: number
): number {
  // If server provided retry-after, use that
  if (retryAfter) {
    return retryAfter * 1000;
  }

  if (config.exponentialBackoff) {
    const delay = config.initialDelayMs * Math.pow(2, attempt);
    return Math.min(delay, config.maxDelayMs);
  }

  return config.initialDelayMs;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for AI operations
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: AIError | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const aiError = classifyError(error);
      lastError = aiError;

      // If not retryable, fail immediately
      if (!aiError.retryable) {
        throw new AIOperationError(aiError);
      }

      // If this was the last attempt, fail
      if (attempt === finalConfig.maxRetries) {
        throw new AIOperationError(aiError, `Failed after ${finalConfig.maxRetries} retries`);
      }

      // Calculate delay and retry
      const delay = calculateRetryDelay(attempt, finalConfig, aiError.retryAfter);
      console.warn(
        `AI operation failed (attempt ${attempt + 1}/${finalConfig.maxRetries}). Retrying in ${delay}ms...`,
        aiError.message
      );

      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new AIOperationError(lastError!, 'Unexpected retry loop exit');
}

/**
 * AI Operation Error class
 */
export class AIOperationError extends Error {
  constructor(
    public aiError: AIError,
    message?: string
  ) {
    super(message || aiError.message);
    this.name = 'AIOperationError';
  }

  isRetryable(): boolean {
    return this.aiError.retryable;
  }

  getRetryAfter(): number | undefined {
    return this.aiError.retryAfter;
  }
}

/**
 * Timeout wrapper for AI operations
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Combined retry + timeout wrapper
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  options: {
    timeoutMs?: number;
    retryConfig?: Partial<RetryConfig>;
  } = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs || 120000; // Default 2 minutes
  const retryConfig = options.retryConfig || {};

  return withRetry(
    () => withTimeout(fn, timeoutMs, `AI operation timed out after ${timeoutMs}ms`),
    retryConfig
  );
}
