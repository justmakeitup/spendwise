import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { db } from './index';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function runEndToEndNeonTest() {
  console.log('🚀 Starting Neon PostgreSQL End-to-End Verification...');
  console.log('🔗 DATABASE_URL target:', process.env.DATABASE_URL?.split('@')[1] || 'NOT SET');
  console.log('🔗 DATABASE_URL_UNPOOLED target:', process.env.DATABASE_URL_UNPOOLED?.split('@')[1] || 'NOT SET');

  // Step 1: Initialize Database & Run Migrations
  console.log('\n--- 1. Initializing DB Connection & Migrations ---');
  await db.initialize();

  // Step 2: Verify Tables Created
  const testEmail = `neon_test_${Date.now()}@spendwise.local`;
  const testPassword = 'Password123!Safe';
  const testId = crypto.randomUUID();

  console.log('\n--- 2. Creating User Record in Neon PostgreSQL ---');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(testPassword, salt);

  const createdUser = await db.createUser({
    id: testId,
    email: testEmail,
    password_hash: passwordHash,
    is_email_verified: false,
    verification_token: 'test_token_123'
  });

  console.log('✅ User successfully inserted into Neon:');
  console.log(`   - ID: ${createdUser.id}`);
  console.log(`   - Email: ${createdUser.email}`);
  console.log(`   - Created At: ${createdUser.created_at}`);

  // Step 3: Fetch User from Neon
  console.log('\n--- 3. Querying User from Neon PostgreSQL ---');
  const fetchedUser = await db.findUserByEmail(testEmail);
  if (!fetchedUser) {
    throw new Error('User was not found in Neon database!');
  }
  console.log('✅ User successfully retrieved from Neon by email:');
  console.log(`   - ID: ${fetchedUser.id}`);
  console.log(`   - Email: ${fetchedUser.email}`);

  // Step 4: Validate Password with Bcrypt
  console.log('\n--- 4. Validating Password Hash ---');
  const isValid = await bcrypt.compare(testPassword, fetchedUser.password_hash);
  if (!isValid) {
    throw new Error('Password hash comparison failed!');
  }
  console.log('✅ Password hash verified successfully against Neon record.');

  // Step 5: Clean Up Test Record
  console.log('\n--- 5. Cleaning Up Test User Record ---');
  await db.deleteUser(testId);
  const recheck = await db.findUserById(testId);
  if (recheck) {
    throw new Error('User was not deleted from Neon!');
  }
  console.log('✅ Test user cleanly removed from Neon.');

  console.log('\n🎉 ALL NEON POSTGRESQL END-TO-END TESTS PASSED SUCCESSFULLY! 🎉');
  process.exit(0);
}

runEndToEndNeonTest().catch(err => {
  console.error('\n❌ Neon E2E Test Failed:', err);
  process.exit(1);
});
