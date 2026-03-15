# Environment Variables Setup

## Required Environment Variables

All database credentials **must** be provided via environment variables. No default values are provided for security reasons.

### Database Configuration

Create a `.env.local` file in the `FE/` directory with the following variables:

```bash
# Database Configuration (REQUIRED)
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
DB_PORT=3306
```

### JWT Secret (REQUIRED)

**IMPORTANT:** JWT secret must be at least 32 characters long and cryptographically secure.

#### Option 1: Use the provided script (Recommended)

```bash
npm run generate:jwt-secret
```

This will generate a strong 512-bit (64-byte) random secret.

#### Option 2: Generate manually

```bash
# Using OpenSSL (64 bytes recommended)
openssl rand -base64 64

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

#### Option 3: Online generator

Use a trusted cryptographically secure random generator (e.g., 1Password, LastPass generator).

#### Add to `.env.local`:

```bash
NEXTAUTH_SECRET=your-generated-secret-here
```

**Security Requirements:**
- Minimum 32 characters (64+ recommended)
- Must be cryptographically random
- Never reuse secrets across environments
- Rotate secrets periodically (every 90 days recommended)

### Optional Variables

```bash
# Application Environment
NODE_ENV=development

# Backend API URL (for AI/OCR processing)
# BACKEND_API_URL=http://localhost:5000

# Rate Limiting Configuration (Optional - uses defaults if not set)
# RATE_LIMIT_STRICT_WINDOW_MS=900000      # 15 minutes (login attempts)
# RATE_LIMIT_STRICT_MAX=5                 # 5 attempts per window
# RATE_LIMIT_MODERATE_WINDOW_MS=900000    # 15 minutes (registration)
# RATE_LIMIT_MODERATE_MAX=10              # 10 attempts per window
# RATE_LIMIT_STANDARD_WINDOW_MS=60000     # 1 minute (general API)
# RATE_LIMIT_STANDARD_MAX=100             # 100 requests per minute
```

## Setup Instructions

1. Copy the example file (if available) or create `.env.local` manually
2. Fill in all required variables
3. **Never commit `.env.local` to version control**
4. Ensure `.env.local` is in `.gitignore`

## Verification

After setting up environment variables, verify the configuration:

```bash
# Test database connection
npm run db:test

# Or check via API (if server is running)
curl http://localhost:3000/api/db/test
```

## Error Messages

If you see errors like:
```
Missing required environment variable: DB_HOST
```

This means the environment variable is not set. Check your `.env.local` file and ensure:
- The file exists in the `FE/` directory
- All required variables are present
- No typos in variable names
- The file is being loaded (Next.js automatically loads `.env.local`)

## Security Notes

- **Never** hardcode credentials in source code
- **Never** commit `.env.local` or `.env` files
- Use different credentials for development, staging, and production
- Rotate secrets periodically
- Use secrets management services in production (AWS Secrets Manager, Vercel Env, etc.)

