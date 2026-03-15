import mysql from "mysql2/promise";
import { getDatabaseConfig } from "./env";
import { lookup } from "dns/promises";

// Database connection configuration
// All credentials must be provided via environment variables
let dbConfig: mysql.PoolOptions | null = null;
let hostnameResolved: Promise<string> | null = null;

/**
 * Known IP addresses for NAVER Cloud DB hostnames
 * Used as fallback when DNS resolution fails
 */
const KNOWN_HOSTNAME_IPS: Record<string, string> = {
  'db-3c34ls-kr.vpc-pub-cdb.ntruss.com': '49.50.131.166',
};

/**
 * Resolve hostname to IP address if it's not already an IP
 * This helps with DNS resolution issues on some platforms (like Vercel)
 * Caches the resolution result to avoid repeated DNS lookups
 */
function resolveHost(hostname: string): Promise<string> {
  // Clean hostname (remove any trailing newlines/whitespace)
  const cleanHostname = hostname.trim();
  
  // If it's already an IP address, return as-is
  if (/^\d+\.\d+\.\d+\.\d+$/.test(cleanHostname)) {
    return Promise.resolve(cleanHostname);
  }

  // Check if we have a known IP for this hostname (fallback)
  if (KNOWN_HOSTNAME_IPS[cleanHostname]) {
    console.log(`✅ Using known IP for ${cleanHostname}: ${KNOWN_HOSTNAME_IPS[cleanHostname]}`);
    return Promise.resolve(KNOWN_HOSTNAME_IPS[cleanHostname]);
  }

  // If we're already resolving this hostname, return the same promise
  if (hostnameResolved) {
    return hostnameResolved;
  }

  // Start DNS resolution
  hostnameResolved = (async () => {
    try {
      const addresses = await lookup(cleanHostname, { family: 4 });
      console.log(`✅ Resolved ${cleanHostname} to ${addresses.address}`);
      return addresses.address;
    } catch (error) {
      // If DNS resolution fails, check for known IP fallback
      if (KNOWN_HOSTNAME_IPS[cleanHostname]) {
        console.warn(`⚠️ DNS resolution failed for ${cleanHostname}, using known IP fallback: ${KNOWN_HOSTNAME_IPS[cleanHostname]}`);
        return KNOWN_HOSTNAME_IPS[cleanHostname];
      }
      
      // If no fallback, log warning and return original hostname
      console.warn(`⚠️ DNS resolution failed for ${cleanHostname}. Error:`, error);
      console.warn(`   Using hostname directly. Connection may fail if DNS is not resolvable.`);
      return cleanHostname;
    }
  })();

  return hostnameResolved;
}

async function getDbConfig(): Promise<mysql.PoolOptions> {
  if (!dbConfig) {
    const config = getDatabaseConfig();
    
    // Resolve hostname to IP if DNS resolution is problematic
    // This helps with Vercel's DNS servers that may not resolve certain domains
    const resolvedHost = await resolveHost(config.host);
    
    const dbConfigObj: mysql.PoolOptions = {
      ...config,
      host: resolvedHost, // Use resolved IP address
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      // Add connection timeout
      connectTimeout: 10000, // 10 seconds
    };

    // SSL configuration - only add if explicitly enabled
    // NAVER Cloud DB doesn't require SSL by default
    if (process.env.DB_SSL === "true") {
      dbConfigObj.ssl = {
        rejectUnauthorized: false, // Allow self-signed certificates
      };
    }
    // If DB_SSL is not set or false, don't include ssl property at all

    dbConfig = dbConfigObj;
  }
  return dbConfig;
}

// Create connection pool
let pool: mysql.Pool | null = null;
let poolInitializing: Promise<mysql.Pool> | null = null;

export async function getPool(): Promise<mysql.Pool> {
  if (pool) {
    return pool;
  }
  
  if (poolInitializing) {
    return poolInitializing;
  }
  
  poolInitializing = (async () => {
    const config = await getDbConfig();
    pool = mysql.createPool(config);
    poolInitializing = null;
    return pool;
  })();
  
  return poolInitializing;
}

// Get a single connection (for transactions)
export async function getConnection(): Promise<mysql.PoolConnection> {
  const pool = await getPool();
  return await pool.getConnection();
}

// Execute a query
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  } catch (error) {
    // Log detailed database error
    console.error("Database query error:", {
      sql,
      params: params ? params.map(() => "?") : [],
      error: error instanceof Error ? error.message : error,
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
    });
    throw error;
  }
}

// Execute a query and return first result
export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  const results = await query<T>(sql, params);
  return results[0] || null;
}

// Close all connections (useful for cleanup)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
