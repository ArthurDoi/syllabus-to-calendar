import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getDatabaseConfig } from "@/lib/env";

/**
 * Test database connection and show tables
 */
export async function GET() {
  try {
    // Test basic connection
    const [testResult] = await query("SELECT 1 as test, NOW() as current_time, DATABASE() as database_name");
    
    // Get list of tables
    const dbConfig = getDatabaseConfig();
    const tables = await query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      [dbConfig.database]
    );
    
    // Get table counts
    const tableCounts: Record<string, number> = {};
    for (const table of tables as any[]) {
      try {
        const count = await query(`SELECT COUNT(*) as count FROM ${table.TABLE_NAME}`);
        tableCounts[table.TABLE_NAME] = (count[0] as any).count;
      } catch (err) {
        tableCounts[table.TABLE_NAME] = -1; // Error reading table
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      connection: testResult,
      tables: tables.map((t: any) => t.TABLE_NAME),
      tableCounts,
      database: dbConfig.database,
    });
  } catch (error) {
    console.error("Database test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

