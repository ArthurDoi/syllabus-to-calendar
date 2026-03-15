#!/usr/bin/env node
/**
 * Database initialization script
 * Run with: npx tsx scripts/init-db.ts
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { getPool } from "../lib/db";
import { getDatabaseConfig } from "../lib/env";

async function initDatabase() {
  try {
    console.log("🚀 Initializing database...");
    
    const pool = await getPool();
    
    // Drop existing tables in reverse order (to handle foreign keys)
    console.log("🗑️  Dropping existing tables...");
    const tablesToDrop = [
      "calendar_events",
      "google_calendar_sync",
      "syllabus_uploads",
      "class_schedules",
      "milestones",
      "exams",
      "assignments",
      "courses",
      "users",
    ];
    
    for (const table of tablesToDrop) {
      try {
        await pool.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`  ✓ Dropped table: ${table}`);
      } catch (error: any) {
        // Ignore errors if table doesn't exist
        if (!error.message.includes("doesn't exist")) {
          console.log(`  ⚠ Could not drop ${table}: ${error.message}`);
        }
      }
    }
    
    // Read SQL schema file
    const schemaPath = join(process.cwd(), "lib", "db-schema.sql");
    const schemaSQL = await readFile(schemaPath, "utf-8");
    
    // Split by semicolon and execute each statement
    // Remove comments and empty lines, then split by semicolon
    const cleanedSQL = schemaSQL
      .split("\n")
      .map((line) => {
        // Remove inline comments
        const commentIndex = line.indexOf("--");
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex).trim();
        }
        return line.trim();
      })
      .filter((line) => line.length > 0 && !line.startsWith("--"))
      .join("\n");
    
    const statements = cleanedSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length > 10); // Filter out very short fragments
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim() && statement.length > 10) {
        try {
          await pool.execute(statement);
          // Extract table name for better logging - handle "CREATE TABLE IF NOT EXISTS"
          const tableMatch = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:`?(\w+)`?|(\w+))/i);
          const tableName = tableMatch ? (tableMatch[1] || tableMatch[2]) : `statement ${i + 1}`;
          console.log(`✅ Created table: ${tableName}`);
        } catch (error: any) {
          // Ignore "table already exists" errors
          if (error.code === "ER_TABLE_EXISTS_ERROR" || error.message.includes("already exists")) {
            const tableMatch = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:`?(\w+)`?|(\w+))/i);
            const tableName = tableMatch ? (tableMatch[1] || tableMatch[2]) : `statement ${i + 1}`;
            console.log(`⚠️  Table already exists: ${tableName}`);
          } else {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            console.error(`Statement: ${statement.substring(0, 200)}...`);
            throw error;
          }
        }
      }
    }
    
    console.log("✅ Database initialization completed successfully!");
    
    // Test connection
    const dbConfig = getDatabaseConfig();
    const [result] = await pool.execute("SELECT COUNT(*) as table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?", [
      dbConfig.database
    ]);
    
    console.log(`📊 Database contains ${(result as any)[0].table_count} tables`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

initDatabase();

