// Migration script to add icon column to courses table
// Run with: node FE/scripts/migrate-add-icon.js

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "../.env.local") });

function getRequiredEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Please set it in your .env file or environment.`
    );
  }
  return value;
}

async function migrate() {
  // Validate required environment variables
  const dbHost = getRequiredEnv('DB_HOST');
  const dbUser = getRequiredEnv('DB_USER');
  const dbPassword = getRequiredEnv('DB_PASSWORD');
  const dbName = getRequiredEnv('DB_NAME');
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);

  const dbConfig = {
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    port: dbPort,
  };

  let connection;
  try {
    console.log("Connecting to database...");
    connection = await mysql.createConnection(dbConfig);
    
    // Check if column already exists
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'courses' 
       AND COLUMN_NAME = 'icon'`,
      [dbName]
    );

    if (Array.isArray(columns) && columns.length > 0) {
      console.log("✓ Icon column already exists. Migration not needed.");
      return;
    }

    console.log("Adding icon column to courses table...");
    await connection.execute(
      `ALTER TABLE courses 
       ADD COLUMN icon VARCHAR(50) DEFAULT 'Calendar' 
       AFTER color`
    );

    console.log("✓ Migration completed successfully!");
    console.log("✓ Added 'icon' column to courses table with default value 'Calendar'");
  } catch (error) {
    console.error("✗ Migration failed:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

migrate();

