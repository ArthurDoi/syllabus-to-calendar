import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { getPool } from "@/lib/db";

/**
 * Initialize database schema
 * This endpoint creates all necessary tables
 * WARNING: This will drop existing tables if they exist
 */
export async function POST() {
  try {
    const pool = await getPool();
    
    // Read SQL schema file
    const schemaPath = join(process.cwd(), "lib", "db-schema.sql");
    const schemaSQL = await readFile(schemaPath, "utf-8");
    
    // Split by semicolon and execute each statement
    const statements = schemaSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.execute(statement);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Database schema initialized successfully",
    });
  } catch (error) {
    console.error("Database initialization error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Test database connection
 */
export async function GET() {
  try {
    const pool = await getPool();
    const [rows] = await pool.execute("SELECT 1 as test");
    
    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      data: rows,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      },
      { status: 500 }
    );
  }
}

