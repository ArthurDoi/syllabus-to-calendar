/**
 * Rate Limit Middleware Helper
 * Simplifies applying rate limiting to API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  rateLimit,
  createRateLimitResponse,
  getRateLimitConfig,
  RateLimitPresets,
  type RateLimitConfig,
} from './rate-limit';

type RateLimitPreset = keyof typeof RateLimitPresets;

interface RateLimitOptions {
  preset?: RateLimitPreset;
  customConfig?: RateLimitConfig;
  identifier?: (request: NextRequest) => string | Promise<string>;
  skipOnSuccess?: boolean; // Reset limit on successful response
}

/**
 * Create a rate limit middleware function
 * Usage:
 *   const rateLimitMiddleware = createRateLimitMiddleware({ preset: 'STRICT' });
 *   const result = await rateLimitMiddleware(request);
 *   if (result) return result; // Rate limited
 */
export function createRateLimitMiddleware(options: RateLimitOptions = {}) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const { preset = 'STANDARD', customConfig, identifier, skipOnSuccess = false } = options;

    // Get identifier if custom function provided
    const customId = identifier ? await identifier(request) : undefined;

    // Get rate limit config
    const config = customConfig || getRateLimitConfig(preset, customId);

    // Check rate limit
    const result = await rateLimit(request, config);

    if (!result.success) {
      return createRateLimitResponse(result);
    }

    // Store result in request for later use (e.g., adding headers)
    (request as any).__rateLimitResult = result;

    return null; // Not rate limited
  };
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: { limit: number; remaining: number; reset: number }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.reset.toString());
  return response;
}

/**
 * Get rate limit result from request (if middleware was used)
 */
export function getRateLimitResult(request: NextRequest): {
  limit: number;
  remaining: number;
  reset: number;
} | null {
  return (request as any).__rateLimitResult || null;
}

