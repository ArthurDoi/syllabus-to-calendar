/**
 * Rate Limiting Utility
 * Protects against brute force attacks and API abuse
 * 
 * Supports both in-memory (default) and Redis-based rate limiting
 */

import { NextResponse } from 'next/server';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  identifier?: string; // Optional identifier (email, userId, etc.)
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when limit resets
  retryAfter?: number; // Seconds until retry is allowed
}

// In-memory store for rate limiting
// In production with multiple instances, use Redis instead
class InMemoryRateLimiter {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  async check(
    identifier: string,
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const key = identifier;
    const entry = this.store.get(key);

    // If no entry or expired, create new entry
    if (!entry || entry.resetTime < now) {
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });

      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: now + windowMs,
      };
    }

    // Entry exists and is valid
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: entry.resetTime,
        retryAfter,
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - entry.count,
      reset: entry.resetTime,
    };
  }

  async reset(identifier: string): Promise<void> {
    this.store.delete(identifier);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

// Singleton instance
const rateLimiter = new InMemoryRateLimiter();

/**
 * Get client identifier from request
 * Uses IP address, X-Forwarded-For header, or fallback
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from headers (for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take first IP if multiple (client IP is first)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback: use a default identifier
  // In production behind a proxy, this should never happen
  return 'unknown';
}

/**
 * Rate limit check
 * Returns result indicating if request should be allowed
 */
export async function rateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  // Build identifier: IP + optional email/userId
  const clientId = getClientIdentifier(request);
  const identifier = config.identifier
    ? `${clientId}:${config.identifier}`
    : clientId;

  return await rateLimiter.check(
    identifier,
    config.windowMs,
    config.maxRequests
  );
}

/**
 * Reset rate limit for an identifier
 * Useful after successful authentication
 */
export async function resetRateLimit(
  request: Request,
  identifier?: string
): Promise<void> {
  const clientId = getClientIdentifier(request);
  const key = identifier ? `${clientId}:${identifier}` : clientId;
  await rateLimiter.reset(key);
}

/**
 * Create rate limit response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const headers = new Headers({
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  });

  if (result.retryAfter) {
    headers.set('Retry-After', result.retryAfter.toString());
  }

  return NextResponse.json(
    {
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again after ${result.retryAfter} seconds.`,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Rate limit configuration presets
 */
export const RateLimitPresets = {
  // Strict: 5 attempts per 15 minutes (for login)
  STRICT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
  // Moderate: 10 attempts per 15 minutes (for register)
  MODERATE: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  },
  // Standard: 100 requests per minute (for general API)
  STANDARD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
  // Lenient: 1000 requests per hour (for public endpoints)
  LENIENT: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
  },
} as const;

/**
 * Get rate limit config from environment variables
 */
export function getRateLimitConfig(
  preset: keyof typeof RateLimitPresets,
  customIdentifier?: string
): RateLimitConfig {
  const baseConfig = RateLimitPresets[preset];
  
  // Allow environment variable overrides
  const envWindow = process.env[`RATE_LIMIT_${preset}_WINDOW_MS`];
  const envMax = process.env[`RATE_LIMIT_${preset}_MAX`];

  return {
    windowMs: envWindow ? parseInt(envWindow, 10) : baseConfig.windowMs,
    maxRequests: envMax ? parseInt(envMax, 10) : baseConfig.maxRequests,
    identifier: customIdentifier,
  };
}

