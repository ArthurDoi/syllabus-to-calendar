#!/usr/bin/env node
/**
 * Generate a strong random JWT secret
 * Usage: node scripts/generate-jwt-secret.js
 */

import crypto from 'crypto';

// Generate a strong random secret (64 bytes = 512 bits)
const secret = crypto.randomBytes(64).toString('base64');

console.log('\n✅ Generated JWT Secret:');
console.log('─'.repeat(80));
console.log(secret);
console.log('─'.repeat(80));
console.log('\n📝 Add this to your .env.local file:');
console.log(`NEXTAUTH_SECRET=${secret}`);
console.log('\n⚠️  Keep this secret secure and never commit it to version control!\n');

