# Security Fix: Rate Limiting Implementation

## Issue
API endpoints, especially authentication endpoints, were vulnerable to brute force attacks and DoS attacks due to lack of rate limiting.

## Solution Implemented

### 1. Created Rate Limiting Utility
**File:** `FE/lib/rate-limit.ts`

**Features:**
- In-memory rate limiting (works immediately, no Redis required)
- Sliding window algorithm
- Per-IP and per-email tracking
- Configurable limits via environment variables
- Automatic cleanup of expired entries
- Rate limit headers in responses

**Key Functions:**
- `rateLimit()` - Check if request should be allowed
- `resetRateLimit()` - Reset limit (e.g., on successful auth)
- `createRateLimitResponse()` - Create 429 response with headers
- `getRateLimitConfig()` - Get config with environment overrides

### 2. Rate Limit Presets

**STRICT** (Login attempts):
- 5 attempts per 15 minutes
- Tracks by IP + email combination
- Resets on successful authentication

**MODERATE** (Registration):
- 10 attempts per 15 minutes
- Tracks by IP address
- Prevents account enumeration attacks

**STANDARD** (General API):
- 100 requests per minute
- Tracks by IP address
- Protects against general abuse

**LENIENT** (Public endpoints):
- 1000 requests per hour
- Tracks by IP address
- For less sensitive endpoints

### 3. Applied to Authentication Endpoints

**Login Endpoint** (`/api/auth/login`):
- ✅ STRICT rate limiting (5 attempts per 15 minutes)
- ✅ Tracks by IP + email (prevents targeted attacks)
- ✅ Resets limit on successful login
- ✅ Returns rate limit headers in all responses

**Register Endpoint** (`/api/auth/register`):
- ✅ MODERATE rate limiting (10 attempts per 15 minutes)
- ✅ Tracks by IP address
- ✅ Prevents account enumeration
- ✅ Returns rate limit headers

### 4. Response Headers

All rate-limited endpoints return standard headers:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1705689600
Retry-After: 450 (if rate limited)
```

## Security Benefits

✅ **Brute Force Protection** - Limits login attempts  
✅ **DoS Protection** - Prevents API abuse  
✅ **Account Enumeration Prevention** - Limits registration attempts  
✅ **IP-based Tracking** - Works behind proxies/load balancers  
✅ **Email-based Tracking** - Additional protection for login  
✅ **Automatic Cleanup** - Prevents memory leaks  
✅ **Configurable** - Adjustable via environment variables  

## Rate Limit Configuration

### Default Limits

| Preset | Window | Max Requests | Use Case |
|--------|--------|--------------|----------|
| STRICT | 15 min | 5 | Login attempts |
| MODERATE | 15 min | 10 | Registration |
| STANDARD | 1 min | 100 | General API |
| LENIENT | 1 hour | 1000 | Public endpoints |

### Environment Variable Overrides

You can override defaults in `.env.local`:

```bash
# Override STRICT preset
RATE_LIMIT_STRICT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_STRICT_MAX=5

# Override MODERATE preset
RATE_LIMIT_MODERATE_WINDOW_MS=900000
RATE_LIMIT_MODERATE_MAX=10

# Override STANDARD preset
RATE_LIMIT_STANDARD_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_STANDARD_MAX=100
```

## Usage Examples

### Basic Rate Limiting

```typescript
import { rateLimit, createRateLimitResponse, getRateLimitConfig } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const config = getRateLimitConfig('STRICT', email);
  const result = await rateLimit(request, config);
  
  if (!result.success) {
    return createRateLimitResponse(result);
  }
  
  // Continue with request...
}
```

### Using Middleware Helper

```typescript
import { createRateLimitMiddleware } from '@/lib/rate-limit-middleware';

const rateLimitMiddleware = createRateLimitMiddleware({ 
  preset: 'STRICT',
  identifier: async (req) => {
    const body = await req.json();
    return body.email; // Track by email
  }
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimitMiddleware(request);
  if (rateLimitResponse) {
    return rateLimitResponse; // Rate limited
  }
  
  // Continue with request...
}
```

## Testing

### Test Rate Limiting

1. **Test login rate limit:**
   ```bash
   # Make 6 rapid login attempts
   for i in {1..6}; do
     curl -X POST http://localhost:3000/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"wrong"}'
   done
   
   # 6th request should return 429 Too Many Requests
   ```

2. **Check rate limit headers:**
   ```bash
   curl -i -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"wrong"}'
   
   # Should include:
   # X-RateLimit-Limit: 5
   # X-RateLimit-Remaining: 4
   # X-RateLimit-Reset: <timestamp>
   ```

3. **Test reset on success:**
   ```bash
   # Make 4 failed attempts
   # Then 1 successful login
   # Rate limit should reset
   ```

## Error Responses

### Rate Limited Response (429)

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again after 450 seconds.",
  "retryAfter": 450
}
```

**Headers:**
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705689600
Retry-After: 450
```

## Implementation Details

### Algorithm: Sliding Window

- Each identifier (IP or IP+email) has a counter
- Counter resets after the time window expires
- Requests increment the counter
- If counter exceeds limit, request is blocked

### Memory Management

- Automatic cleanup every 5 minutes
- Expired entries are removed
- Prevents memory leaks in long-running processes

### IP Detection

The system detects client IP from:
1. `X-Forwarded-For` header (first IP if multiple)
2. `X-Real-IP` header
3. Falls back to 'unknown' (shouldn't happen behind proxy)

## Scaling Considerations

### Current Implementation (In-Memory)

**Pros:**
- ✅ Works immediately, no setup required
- ✅ Fast (no network calls)
- ✅ Simple to understand

**Cons:**
- ❌ Doesn't work across multiple server instances
- ❌ Lost on server restart
- ❌ Memory usage grows with unique IPs

### Future: Redis-Based Rate Limiting

For production with multiple instances, consider upgrading to Redis:

```typescript
// Example: Upgrade to Redis (future)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
});
```

**Benefits:**
- ✅ Works across multiple instances
- ✅ Persistent across restarts
- ✅ Better for high-traffic applications

## Best Practices

1. **Use appropriate presets:**
   - STRICT for authentication
   - MODERATE for registration
   - STANDARD for general API
   - LENIENT for public endpoints

2. **Track by email for login:**
   - Prevents targeted brute force attacks
   - More granular than IP-only

3. **Reset on success:**
   - Clear rate limit after successful authentication
   - Better user experience

4. **Monitor rate limit hits:**
   - Log 429 responses
   - Alert on unusual patterns
   - May indicate attack

5. **Adjust limits based on usage:**
   - Too strict: legitimate users blocked
   - Too lenient: vulnerable to attacks
   - Monitor and adjust

## Files Changed

- ✅ `FE/lib/rate-limit.ts` - Core rate limiting utility (new)
- ✅ `FE/lib/rate-limit-middleware.ts` - Middleware helper (new)
- ✅ `FE/app/api/auth/login/route.ts` - Added STRICT rate limiting
- ✅ `FE/app/api/auth/register/route.ts` - Added MODERATE rate limiting
- ✅ `FE/docs/environment-setup.md` - Added rate limit config
- ✅ `FE/docs/security-fix-rate-limiting.md` - This documentation

## Additional Endpoints to Protect

Consider adding rate limiting to:

- ⏭️ `/api/upload` - File upload endpoint
- ⏭️ `/api/parse-syllabus` - AI processing endpoint
- ⏭️ `/api/courses` - If public or high-traffic
- ⏭️ Password reset endpoints (if added)

## Monitoring

### Key Metrics to Track

1. **Rate limit hits:**
   - Number of 429 responses
   - Which endpoints are hit most
   - Which IPs are blocked

2. **False positives:**
   - Legitimate users blocked
   - May indicate limits too strict

3. **Attack patterns:**
   - Sudden spikes in rate limit hits
   - Multiple IPs targeting same email
   - Distributed attacks

### Logging Recommendations

```typescript
// Example: Log rate limit hits
if (!rateLimitResult.success) {
  console.warn('Rate limit exceeded', {
    ip: getClientIdentifier(request),
    endpoint: request.url,
    retryAfter: rateLimitResult.retryAfter,
  });
}
```

## Related Security Fixes

- ✅ Hardcoded database credentials (Fixed)
- ✅ Weak JWT secret (Fixed)
- ✅ Mock user in production (Fixed)
- ✅ Rate limiting (Fixed)
- ⏭️ Input sanitization (Next)

---

**Status:** ✅ **COMPLETED**  
**Date:** 2025-01-18  
**Security Impact:** **HIGH** - Fixed  
**Breaking Change:** No - Transparent to legitimate users

