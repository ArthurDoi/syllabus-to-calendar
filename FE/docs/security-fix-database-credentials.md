# Security Fix: Hardcoded Database Credentials

## Issue
Database credentials were hardcoded as default values in multiple files, exposing sensitive information in source code.

## Solution Implemented

### 1. Created Environment Variable Validation Module
**File:** `FE/lib/env.ts`

- Centralized environment variable validation
- Throws clear errors if required variables are missing
- Provides helpful error messages with setup instructions

### 2. Updated Database Configuration
**File:** `FE/lib/db.ts`

**Before:**
```typescript
const dbConfig = {
  host: process.env.DB_HOST || "db-3c34ls-kr.vpc-pub-cdb.ntruss.com",
  user: process.env.DB_USER || "dbadmin",
  password: process.env.DB_PASSWORD || "Hackathon@2025",
  database: process.env.DB_NAME || "hackathondb",
};
```

**After:**
```typescript
import { getDatabaseConfig } from "./env";

function getDbConfig(): mysql.PoolOptions {
  if (!dbConfig) {
    const config = getDatabaseConfig(); // Throws if env vars missing
    dbConfig = { ...config, ...poolOptions };
  }
  return dbConfig;
}
```

### 3. Updated All Migration Scripts

**Files Updated:**
- `FE/scripts/migrate-add-completed-at.mjs`
- `FE/scripts/migrate-add-icon.mjs`
- `FE/scripts/migrate-add-icon.js`
- `FE/scripts/init-db.ts`

All scripts now require environment variables and throw clear errors if missing.

### 4. Updated API Routes

**Files Updated:**
- `FE/app/api/db/test/route.ts`

Now uses `getDatabaseConfig()` instead of hardcoded defaults.

## Required Environment Variables

All of these must be set in `.env.local`:

```bash
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
DB_PORT=3306  # Optional, defaults to 3306
```

## Error Handling

If environment variables are missing, the application will:

1. **At startup (first DB access):** Throw a clear error message:
   ```
   Missing required environment variable: DB_HOST.
   Please set it in your .env file or environment.
   ```

2. **In migration scripts:** Exit with error code 1 and display setup instructions

3. **In API routes:** Return 500 error with descriptive message

## Migration Guide

### For Existing Deployments

1. **Create `.env.local` file:**
   ```bash
   cd FE
   cp .env.example .env.local  # If example exists
   # Or create manually
   ```

2. **Add required variables:**
   ```bash
   DB_HOST=your-actual-host
   DB_USER=your-actual-user
   DB_PASSWORD=your-actual-password
   DB_NAME=your-actual-database
   ```

3. **Verify setup:**
   ```bash
   npm run db:test
   ```

4. **Restart application:**
   ```bash
   npm run dev
   ```

### For New Deployments

1. Set environment variables in your deployment platform:
   - **Vercel:** Project Settings → Environment Variables
   - **AWS:** Use Secrets Manager or Parameter Store
   - **Docker:** Use `.env` file or docker-compose environment section

2. Never commit `.env.local` or `.env` files to version control

## Security Benefits

✅ **No credentials in source code**  
✅ **Clear error messages guide setup**  
✅ **Prevents accidental credential exposure**  
✅ **Enforces security best practices**  
✅ **Works with secrets management services**

## Testing

To verify the fix works:

1. **Test with missing variables:**
   ```bash
   # Remove DB_HOST from .env.local
   npm run db:test
   # Should show clear error message
   ```

2. **Test with all variables:**
   ```bash
   # Ensure all variables are set
   npm run db:test
   # Should connect successfully
   ```

## Files Changed

- ✅ `FE/lib/env.ts` (new)
- ✅ `FE/lib/db.ts`
- ✅ `FE/scripts/migrate-add-completed-at.mjs`
- ✅ `FE/scripts/migrate-add-icon.mjs`
- ✅ `FE/scripts/migrate-add-icon.js`
- ✅ `FE/scripts/init-db.ts`
- ✅ `FE/app/api/db/test/route.ts`
- ✅ `FE/docs/environment-setup.md` (new)
- ✅ `FE/docs/security-fix-database-credentials.md` (this file)

## Next Steps

1. ✅ Remove hardcoded credentials (DONE)
2. ⏭️ Generate strong JWT secret
3. ⏭️ Remove mock user from production
4. ⏭️ Add rate limiting
5. ⏭️ Implement input sanitization

---

**Status:** ✅ **COMPLETED**  
**Date:** 2025-01-18  
**Security Impact:** **CRITICAL** - Fixed

