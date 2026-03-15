import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  const connection = await mysql.createConnection({
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    port: dbPort,
    multipleStatements: true,
  });

  try {
    
    // Check if completed_at column already exists
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'assignments' 
       AND COLUMN_NAME = 'completed_at'`,
      [dbName]
    );

    if (columns.length === 0) {
      console.log('Adding completed_at column to assignments table...');
      const sql = readFileSync(
        join(__dirname, 'add-completed-at-column.sql'),
        'utf-8'
      );
      await connection.query(sql);
      console.log('✓ Successfully added completed_at column');
    } else {
      console.log('✓ completed_at column already exists, skipping...');
    }

    // Check if user_stats table already exists
    const [tables] = await connection.query(
      `SELECT TABLE_NAME 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'user_stats'`,
      [dbName]
    );

    if (tables.length === 0) {
      console.log('Creating user_stats table...');
      const statsSql = readFileSync(
        join(__dirname, 'create-user-stats-table.sql'),
        'utf-8'
      );
      await connection.query(statsSql);
      console.log('✓ Successfully created user_stats table');
    } else {
      console.log('✓ user_stats table already exists, checking for last_streak_date column...');
      // Check if last_streak_date column exists
      const [columns] = await connection.query(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'user_stats' 
         AND COLUMN_NAME = 'last_streak_date'`,
        [dbName]
      );
      
      if (columns.length === 0) {
        console.log('Adding last_streak_date column to user_stats table...');
        const streakDateSql = readFileSync(
          join(__dirname, 'add-last-streak-date-column.sql'),
          'utf-8'
        );
        await connection.query(streakDateSql);
        console.log('✓ Successfully added last_streak_date column');
      } else {
        console.log('✓ last_streak_date column already exists, skipping...');
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch(console.error);

