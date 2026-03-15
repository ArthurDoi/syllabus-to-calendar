# Security Fix: Weak JWT Secret

## Issue
JWT secret had a weak default value that could be easily guessed or brute-forced, allowing attackers to forge authentication tokens.

## Solution Implemented

### 1. Created Secure JWT Secret Validation
**File:** `FE/lib/env.ts`

Added `getJwtSecret()` function that:
- Requires `NEXTAUTH_SECRET` environment variable (no defaults)
- Validates minimum length (32 characters)
- Warns about weak patterns
- Returns properly encoded secret

### 2. Updated Authentication Files

**Files Updated:**
- `FE/app/api/auth/login/route.ts` - Removed weak default, uses `getJwtSecret()`
- `FE/lib/session.ts` - Removed weak default, uses `getJwtSecret()`

**Before:**
```typescript
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "your-secret-key-here-change-in-production"
);
```

**After:**
```typescript
import { getJwtSecret } from "@/lib/env";

// In function:
const jwtSecret = getJwtSecret(); // Throws if missing or too weak
```

### 3. Created Secret Generation Script
**File:** `FE/scripts/generate-jwt-secret.js`

Provides easy way to generate cryptographically secure secrets:
```bash
npm run generate:jwt-secret
```

Generates a 512-bit (64-byte) random secret using Node.js crypto.

## Security Requirements

### Minimum Requirements
- **Length:** Minimum 32 characters (64+ recommended)
- **Entropy:** Must be cryptographically random
- **Storage:** Never in source code, only in environment variables
- **Rotation:** Change every 90 days (best practice)

### Validation Rules
The system now validates:
1. ✅ Secret exists (no default fallback)
2. ✅ Minimum 32 characters
3. ⚠️ Warns if contains common weak patterns

## Setup Instructions

### For New Deployments

1. **Generate a strong secret:**
   ```bash
   npm run generate:jwt-secret
   ```

2. **Add to `.env.local`:**
   ```bash
   NEXTAUTH_SECRET=<generated-secret>
   ```

3. **Verify setup:**
   - Try to login - should work if secret is valid
   - Check console for warnings if secret is weak

### For Existing Deployments

1. **Generate new secret:**
   ```bash
   npm run generate:jwt-secret
   ```

2. **Update environment variable:**
   - Update `NEXTAUTH_SECRET` in your deployment platform
   - **Note:** This will invalidate all existing sessions
   - Users will need to log in again

3. **Deploy and verify:**
   - All users will be logged out
   - New logins will work with new secret

### Alternative Generation Methods

**Using OpenSSL:**
```bash
openssl rand -base64 64
```

**Using Node.js directly:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Using 1Password/LastPass:**
- Use password generator
- Set length to 64+ characters
- Use alphanumeric + symbols

## Error Handling

### Missing Secret
```
Error: Missing required environment variable: NEXTAUTH_SECRET.
Please set it in your .env file or environment.
```

**Fix:** Add `NEXTAUTH_SECRET` to `.env.local`

### Weak Secret
```
Error: JWT secret is too short. Minimum 32 characters required, got 20.
Generate a strong secret with: openssl rand -base64 32
```

**Fix:** Generate a longer secret (64+ characters recommended)

### Weak Pattern Warning
```
⚠️  WARNING: JWT secret appears to be weak.
Please use a strong random secret in production.
```

**Fix:** Regenerate secret using `npm run generate:jwt-secret`

## Security Benefits

✅ **No weak defaults** - Application fails if secret not provided  
✅ **Length validation** - Ensures minimum security strength  
✅ **Pattern detection** - Warns about common weak secrets  
✅ **Centralized management** - Single source of truth for secret handling  
✅ **Easy generation** - Built-in script for secure secret creation  

## Testing

### Test Secret Generation
```bash
npm run generate:jwt-secret
# Should output a 64+ character base64 string
```

### Test Validation
1. **Test with missing secret:**
   ```bash
   # Remove NEXTAUTH_SECRET from .env.local
   npm run dev
   # Should show error on first auth attempt
   ```

2. **Test with weak secret:**
   ```bash
   # Set NEXTAUTH_SECRET=test (too short)
   npm run dev
   # Should throw error about length
   ```

3. **Test with strong secret:**
   ```bash
   # Set NEXTAUTH_SECRET=<generated-secret>
   npm run dev
   # Should work normally
   ```

## Migration Impact

### Breaking Changes
- ⚠️ **All existing sessions will be invalidated** when secret changes
- Users will need to log in again after secret update
- No automatic migration - manual secret update required

### Recommended Migration Strategy

1. **During maintenance window:**
   - Generate new secret
   - Update environment variable
   - Deploy application
   - Notify users they may need to log in again

2. **For zero-downtime:**
   - Not possible with single secret
   - Consider implementing secret rotation with dual secrets (future enhancement)

## Files Changed

- ✅ `FE/lib/env.ts` - Added `getJwtSecret()` function
- ✅ `FE/app/api/auth/login/route.ts` - Uses secure secret validation
- ✅ `FE/lib/session.ts` - Uses secure secret validation
- ✅ `FE/scripts/generate-jwt-secret.js` - New secret generation script
- ✅ `FE/package.json` - Added `generate:jwt-secret` script
- ✅ `FE/docs/environment-setup.md` - Updated with secret generation instructions
- ✅ `FE/docs/security-fix-jwt-secret.md` - This documentation

## Best Practices

1. **Never commit secrets** to version control
2. **Use different secrets** for development, staging, and production
3. **Rotate secrets periodically** (every 90 days)
4. **Use secrets management** services in production:
   - AWS Secrets Manager
   - Vercel Environment Variables
   - HashiCorp Vault
   - Azure Key Vault
5. **Monitor for secret exposure** in logs, error messages, or public repos
6. **Use strong secrets** - 64+ characters, cryptographically random

## Related Security Fixes

- ✅ Hardcoded database credentials (Fixed)
- ✅ Weak JWT secret (Fixed)
- ⏭️ Mock user in production (Next)
- ⏭️ Rate limiting (Next)
- ⏭️ Input sanitization (Next)

---

**Status:** ✅ **COMPLETED**  
**Date:** 2025-01-18  
**Security Impact:** **CRITICAL** - Fixed  
**Breaking Change:** Yes - Requires environment variable setup

