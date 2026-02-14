/**
 * AI API Rate Limiter
 * Stage 7: Rate limiting for AI API calls
 *
 * Prevents API abuse and manages costs by limiting requests per user/system
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // seconds until retry is allowed
}

/**
 * In-memory rate limiter
 * For production, use Redis or similar distributed cache
 */
class InMemoryRateLimiter {
  private store: Map<
    string,
    {
      count: number;
      resetAt: number;
    }
  > = new Map();

  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.resetAt < now) {
          this.store.delete(key);
        }
      }
    }, 60 * 1000);
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.store.get(key);

    // No existing entry or window expired
    if (!entry || entry.resetAt < now) {
      const resetAt = now + config.windowMs;
      this.store.set(key, {
        count: 1,
        resetAt,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: new Date(resetAt),
      };
    }

    // Within rate limit window
    if (entry.count < config.maxRequests) {
      entry.count++;
      this.store.set(key, entry);

      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetAt: new Date(entry.resetAt),
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  cleanup(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global rate limiter instance
const rateLimiter = new InMemoryRateLimiter();

/**
 * Rate limit configurations for different AI operations
 */
export const RATE_LIMITS = {
  // Per-user limits
  USER_CHAT: {
    maxRequests: 50, // 50 messages
    windowMs: 60 * 60 * 1000, // per hour
  },
  USER_SPEC_GENERATION: {
    maxRequests: 5, // 5 spec generations
    windowMs: 60 * 60 * 1000, // per hour
  },
  USER_RESEARCH: {
    maxRequests: 10, // 10 research runs
    windowMs: 60 * 60 * 1000, // per hour
  },

  // Global system limits (all users combined)
  GLOBAL_CHAT: {
    maxRequests: 1000, // 1000 messages
    windowMs: 60 * 1000, // per minute
  },
  GLOBAL_SPEC_GENERATION: {
    maxRequests: 100, // 100 spec generations
    windowMs: 60 * 1000, // per minute
  },
} as const;

/**
 * Check rate limit for user operation
 */
export async function checkUserRateLimit(
  userId: string,
  operation: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[operation];
  const key = `user:${userId}:${operation}`;
  return rateLimiter.check(key, config);
}

/**
 * Check global rate limit for operation
 */
export async function checkGlobalRateLimit(
  operation: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[operation];
  const key = `global:${operation}`;
  return rateLimiter.check(key, config);
}

/**
 * Check both user and global rate limits
 */
export async function checkRateLimit(
  userId: string,
  operation: keyof typeof RATE_LIMITS
): Promise<RateLimitResult> {
  // Check user limit first
  const userLimit = await checkUserRateLimit(userId, operation);
  if (!userLimit.allowed) {
    return userLimit;
  }

  // Check global limit
  const globalLimit = await checkGlobalRateLimit(operation);
  if (!globalLimit.allowed) {
    return globalLimit;
  }

  // Both limits passed - return user limit (more specific)
  return userLimit;
}

/**
 * Reset rate limit for a user operation
 */
export async function resetUserRateLimit(
  userId: string,
  operation: keyof typeof RATE_LIMITS
): Promise<void> {
  const key = `user:${userId}:${operation}`;
  await rateLimiter.reset(key);
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  constructor(
    public result: RateLimitResult,
    message?: string
  ) {
    super(
      message ||
        `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Rate limit middleware/wrapper for AI operations
 */
export async function withRateLimit<T>(
  userId: string,
  operation: keyof typeof RATE_LIMITS,
  fn: () => Promise<T>
): Promise<T> {
  const result = await checkRateLimit(userId, operation);

  if (!result.allowed) {
    throw new RateLimitError(result);
  }

  return fn();
}
