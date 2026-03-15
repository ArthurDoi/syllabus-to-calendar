import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from FE directory
dotenv.config({ path: join(__dirname, '..', '.env.local') });

async function createTestUser() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'syllabus_calendar'
  });

  const email = 'test@example.com';
  const password = 'test123';
  const name = 'Test User';
  const id = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await connection.execute(
      'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
      [id, email, passwordHash, name]
    );
    console.log('✅ Test user created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('ℹ️  Test user already exists');
      console.log(`Email: ${email}`);
      console.log(`Password: ${password}`);
    } else {
      console.error('❌ Error creating test user:', error.message);
    }
  } finally {
    await connection.end();
  }
}

createTestUser();
