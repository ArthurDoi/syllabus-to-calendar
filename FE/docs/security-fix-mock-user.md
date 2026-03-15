# Security Fix: Mock User in Production

## Issue
Mock user authentication was enabled in development mode, allowing unauthenticated access to protected resources. This development code path could potentially be exploited or accidentally enabled in production.

## Solution Implemented

### 1. Removed Mock User from Session Management
**File:** `FE/lib/session.ts`

**Before:**
```typescript
const isDev = process.env.NODE_ENV !== "production";
const MOCK_USER = {
  userId: "demo-user",
  email: "demo@example.com",
};

export async function getSession(): Promise<SessionUser | null> {
  if (!token) {
    return isDev ? { ...MOCK_USER, isMock: true } : null;
  }
  // ...
  return isDev ? { ...MOCK_USER, isMock: true } : null;
}
```

**After:**
```typescript
export async function getSession(): Promise<SessionUser | null> {
  if (!token) {
    return null; // No mock fallback
  }
  // ...
  return null; // No mock fallback on error
}
```

**Changes:**
- ✅ Removed `MOCK_USER` constant
- ✅ Removed `isDev` check
- ✅ Removed `isMock` property from `SessionUser` interface
- ✅ Always returns `null` when not authenticated

### 2. Simplified User ID Resolution
**File:** `FE/lib/user-resolver.ts`

**Before:**
```typescript
export async function resolveUserId(session: SessionUser): Promise<string> {
  if (!session.isMock) {
    return session.userId;
  }
  // Fallback to first user in database
  const fallbackUser = await queryOne(...);
  return fallbackUser.id;
}
```

**After:**
```typescript
export async function resolveUserId(session: SessionUser): Promise<string> {
  return session.userId; // Always use authenticated user ID
}
```

**Changes:**
- ✅ Removed mock user fallback logic
- ✅ Removed database query for fallback user
- ✅ Simplified to always use session user ID

### 3. Removed Mock User Checks from API Routes
**File:** `FE/app/api/upload/route.ts`

**Before:**
```typescript
const shouldPersistUploads = !session.isMock;
```

**After:**
```typescript
// Removed - all authenticated users can persist uploads
```

**Changes:**
- ✅ Removed `isMock` check
- ✅ All authenticated users treated equally

### 4. Removed Mock Events Fallback
**File:** `FE/app/api/parse-syllabus/stream/route.ts`

**Before:**
```typescript
if (process.env.NODE_ENV !== "production") {
  // Return mock events for development
  const mockEvents = [...];
  return new Response(stream, {...});
}
```

**After:**
```typescript
// Always return proper error response
return new Response(JSON.stringify({
  success: false,
  error: error.message
}), { status: 500 });
```

**Changes:**
- ✅ Removed development-only mock events
- ✅ Always returns proper error responses
- ✅ Updates upload status on error

## Security Benefits

✅ **No development code paths in production**  
✅ **Consistent authentication behavior** across all environments  
✅ **No fallback authentication** - proper errors when not authenticated  
✅ **Simplified codebase** - removed conditional logic  
✅ **Better error handling** - clear failures instead of silent fallbacks  

## Breaking Changes

### For Development

**Before:** Could access app without logging in (mock user)  
**After:** Must register and log in to access app

**Migration:**
1. Register a user account through `/register`
2. Log in through `/login`
3. Use the application normally

### For Production

**Before:** Mock user could potentially be enabled  
**After:** Mock user completely removed - no risk

## Testing

### Test Authentication Flow

1. **Test without authentication:**
   ```bash
   # Try to access protected route
   curl http://localhost:3000/api/courses
   # Should return 401 Unauthorized
   ```

2. **Test with authentication:**
   ```bash
   # Login first
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   
   # Use token in subsequent requests
   curl http://localhost:3000/api/courses \
     -H "Cookie: auth-token=<token>"
   # Should return courses
   ```

3. **Test error handling:**
   - Invalid token → Returns null session
   - Expired token → Returns null session
   - No token → Returns null session
   - All cases properly handled without mock fallback

## Files Changed

- ✅ `FE/lib/session.ts` - Removed MOCK_USER and isMock logic
- ✅ `FE/lib/user-resolver.ts` - Removed mock user fallback
- ✅ `FE/app/api/upload/route.ts` - Removed isMock check
- ✅ `FE/app/api/parse-syllabus/stream/route.ts` - Removed mock events fallback
- ✅ `FE/docs/security-fix-mock-user.md` - This documentation

## Related Security Fixes

- ✅ Hardcoded database credentials (Fixed)
- ✅ Weak JWT secret (Fixed)
- ✅ Mock user in production (Fixed)
- ⏭️ Rate limiting (Next)
- ⏭️ Input sanitization (Next)

## Development Workflow

### Setting Up Development Environment

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Register a test user:**
   - Navigate to `/register`
   - Create an account with test credentials
   - Log in through `/login`

3. **Use the application:**
   - All features require authentication
   - No mock user shortcuts

### Testing Without Backend

If backend services are unavailable during development:

1. **Use proper error handling:**
   - API routes return appropriate error messages
   - Frontend handles errors gracefully
   - No mock data fallbacks

2. **Mock at the API level (if needed):**
   - Use environment variables to enable test mode
   - Create dedicated test endpoints
   - Never bypass authentication

## Best Practices

1. **Always require authentication** for protected resources
2. **Never use mock users** in production code
3. **Use environment-based feature flags** if needed (not for auth)
4. **Test authentication flows** in CI/CD pipeline
5. **Monitor authentication failures** in production
6. **Use proper error messages** instead of silent fallbacks

## Verification

To verify the fix:

1. **Check for mock user references:**
   ```bash
   grep -r "MOCK_USER\|isMock\|demo-user" FE/ --exclude-dir=node_modules
   # Should only find references in documentation
   ```

2. **Test authentication:**
   - Try accessing protected routes without login → Should fail
   - Login and access routes → Should work
   - Invalid token → Should fail properly

3. **Check error handling:**
   - All authentication failures return proper errors
   - No silent fallbacks to mock users
   - Error messages are clear and actionable

---

**Status:** ✅ **COMPLETED**  
**Date:** 2025-01-18  
**Security Impact:** **HIGH** - Fixed  
**Breaking Change:** Yes - Development workflow requires user registration

