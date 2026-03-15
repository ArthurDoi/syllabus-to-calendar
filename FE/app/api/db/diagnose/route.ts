import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getDatabaseConfig } from "@/lib/env";
import { query } from "@/lib/db";

/**
 * Diagnostic endpoint to check database connection and schema
 * This helps identify what's wrong with the database setup
 */
export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
  };

  try {
    // Check 1: Environment variables
    try {
      const config = getDatabaseConfig();
      diagnostics.checks.envVars = {
        status: "ok",
        host: config.host,
        user: config.user,
        database: config.database,
        port: config.port,
        passwordSet: !!config.password,
      };
    } catch (error) {
      diagnostics.checks.envVars = {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
      diagnostics.errors.push("Environment variables not configured");
      return NextResponse.json(diagnostics, { status: 500 });
    }

    // Check 2: Database connection
    try {
      const pool = await getPool();
      const [result] = await pool.execute("SELECT 1 as test, NOW() as current_time");
      diagnostics.checks.connection = {
        status: "ok",
        test: result,
      };
    } catch (error: any) {
      diagnostics.checks.connection = {
        status: "error",
        error: error.message,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
      };
      diagnostics.errors.push(`Connection failed: ${error.message}`);
      return NextResponse.json(diagnostics, { status: 500 });
    }

    // Check 3: Database exists
    try {
      const config = getDatabaseConfig();
      const [databases] = await query(
        "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?",
        [config.database]
      );
      diagnostics.checks.databaseExists = {
        status: databases.length > 0 ? "ok" : "error",
        found: databases.length > 0,
        database: config.database,
      };
      if (databases.length === 0) {
        diagnostics.errors.push(`Database '${config.database}' does not exist`);
      }
    } catch (error: any) {
      diagnostics.checks.databaseExists = {
        status: "error",
        error: error.message,
      };
      diagnostics.errors.push(`Cannot check database: ${error.message}`);
    }

    // Check 4: Users table exists
    try {
      const config = getDatabaseConfig();
      const [tables] = await query(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
        [config.database]
      );
      diagnostics.checks.usersTable = {
        status: tables.length > 0 ? "ok" : "error",
        exists: tables.length > 0,
      };
      if (tables.length === 0) {
        diagnostics.errors.push("Users table does not exist - database needs initialization");
      }
    } catch (error: any) {
      diagnostics.checks.usersTable = {
        status: "error",
        error: error.message,
      };
      diagnostics.errors.push(`Cannot check users table: ${error.message}`);
    }

    // Check 5: List all tables
    try {
      const config = getDatabaseConfig();
      const [allTables] = await query(
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
        [config.database]
      );
      diagnostics.checks.allTables = {
        status: "ok",
        tables: (allTables as any[]).map((t: any) => t.TABLE_NAME),
        count: (allTables as any[]).length,
      };
    } catch (error: any) {
      diagnostics.checks.allTables = {
        status: "error",
        error: error.message,
      };
    }

    // Summary
    diagnostics.summary = {
      allChecksPassed: diagnostics.errors.length === 0,
      totalErrors: diagnostics.errors.length,
      needsInitialization: diagnostics.errors.some((e: string) =>
        e.includes("does not exist") || e.includes("needs initialization")
      ),
    };

    return NextResponse.json(diagnostics, {
      status: diagnostics.errors.length > 0 ? 500 : 200,
    });
  } catch (error: any) {
    diagnostics.errors.push(`Unexpected error: ${error.message}`);
    return NextResponse.json(diagnostics, { status: 500 });
  }
}

