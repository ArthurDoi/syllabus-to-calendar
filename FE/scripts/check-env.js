#!/usr/bin/env node

/**
 * Check if environment variables are properly configured
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

console.log('🔍 Checking environment configuration...\n');

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  const requiredVars = {
    'DB_HOST': false,
    'DB_USER': false,
    'DB_PASSWORD': false,
    'DB_NAME': false,
    'NEXTAUTH_SECRET': false,
  };
  
  let hasEmptyPassword = false;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      
      if (requiredVars.hasOwnProperty(key)) {
        requiredVars[key] = true;
        
        if (key === 'DB_PASSWORD' && !value) {
          hasEmptyPassword = true;
        }
      }
    }
  });
  
  console.log('📋 Environment Variables Status:');
  console.log('─────────────────────────────────\n');
  
  let allGood = true;
  
  Object.entries(requiredVars).forEach(([key, found]) => {
    const status = found ? '✅' : '❌';
    const value = found && key === 'DB_PASSWORD' && hasEmptyPassword 
      ? '(empty - needs to be set)' 
      : found ? 'set' : 'missing';
    console.log(`${status} ${key}: ${value}`);
    if (!found) allGood = false;
  });
  
  console.log('');
  
  if (hasEmptyPassword) {
    console.log('⚠️  WARNING: DB_PASSWORD is empty!');
    console.log('   Please add your MySQL password to .env.local\n');
    allGood = false;
  }
  
  if (allGood) {
    console.log('✅ All required environment variables are configured!\n');
    console.log('💡 Next steps:');
    console.log('   1. Ensure MySQL server is running');
    console.log('   2. Create database: CREATE DATABASE syllabus_calendar;');
    console.log('   3. Run: npm run db:init');
    console.log('   4. Test: npm run db:test\n');
  } else {
    console.log('❌ Some environment variables are missing or incomplete.\n');
    console.log('💡 Edit .env.local and add the missing values.\n');
    process.exit(1);
  }
  
} catch (error) {
  if (error.code === 'ENOENT') {
    console.log('❌ .env.local file not found!\n');
    console.log('💡 Create it by running: npm run setup:env\n');
  } else {
    console.error('❌ Error reading .env.local:', error.message, '\n');
  }
  process.exit(1);
}

