/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are present
 */

interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
}

/**
 * Get required environment variable or throw error
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Please set it in your .env file or environment.`
    );
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get database configuration from environment variables
 * Throws error if any required variable is missing
 */
export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: getRequiredEnv('DB_HOST'),
    user: getRequiredEnv('DB_USER'),
    password: getRequiredEnv('DB_PASSWORD'),
    database: getRequiredEnv('DB_NAME'),
    port: parseInt(getOptionalEnv('DB_PORT', '3306'), 10),
  };
}

/**
 * Get JWT secret from environment variable
 * Requires a strong secret (minimum 32 characters)
 * Throws error if missing or too weak
 */
export function getJwtSecret(): Uint8Array {
  const secret = getRequiredEnv('NEXTAUTH_SECRET');
  
  // Validate secret strength
  if (secret.length < 32) {
    throw new Error(
      `JWT secret is too short. Minimum 32 characters required, got ${secret.length}. ` +
      `Generate a strong secret with: openssl rand -base64 32`
    );
  }
  
  // Warn if secret looks weak (common weak patterns)
  const weakPatterns = [
    'your-secret-key',
    'change-in-production',
    'default-secret',
    'test-secret',
    '12345678',
  ];
  
  const isWeak = weakPatterns.some(pattern => 
    secret.toLowerCase().includes(pattern.toLowerCase())
  );
  
  if (isWeak) {
    console.warn(
      '⚠️  WARNING: JWT secret appears to be weak. ' +
      'Please use a strong random secret in production.'
    );
  }
  
  return new TextEncoder().encode(secret);
}

/**
 * Validate that all required database environment variables are set
 * Call this at application startup
 */
export function validateDatabaseEnv(): void {
  try {
    getDatabaseConfig();
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Database configuration error:', error.message);
      console.error('\nRequired environment variables:');
      console.error('  - DB_HOST');
      console.error('  - DB_USER');
      console.error('  - DB_PASSWORD');
      console.error('  - DB_NAME');
      console.error('\nOptional environment variables:');
      console.error('  - DB_PORT (default: 3306)');
      console.error('\nPlease create a .env file with these variables.');
    }
    throw error;
  }
}

/**
 * Validate that all required environment variables are set
 * Call this at application startup
 */
export function validateRequiredEnv(): void {
  try {
    validateDatabaseEnv();
    getJwtSecret(); // Validate JWT secret
  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Environment validation failed:', error.message);
      console.error('\nPlease ensure all required environment variables are set.');
    }
    throw error;
  }
}

