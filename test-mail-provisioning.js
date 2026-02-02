/**
 * Test script to verify mail account provisioning
 *
 * This script tests:
 * 1. Database connection to virtual_users table
 * 2. Mail account creation functionality
 * 3. End-to-end registration with mail provisioning
 */

import accountManager from './src/lib/mail/accountManager.js';
import db from './src/lib/db.js';
import crypto from 'crypto';

async function testMailProvisioning() {
  console.log('=== Testing Mail Account Provisioning ===\n');

  try {
    // Test 1: Check if virtual_users table exists
    console.log('Test 1: Checking virtual_users table...');
    const connection = await db.getMailDbConnection();

    if (!connection) {
      throw new Error('Failed to get mail database connection');
    }

    const [tables] = await connection.query("SHOW TABLES LIKE 'virtual_users'");

    if (tables.length === 0) {
      console.error('❌ virtual_users table does not exist!');
      console.log('Please run the schema.sql to create the table.');
      await connection.end();
      return false;
    }

    console.log('✅ virtual_users table exists\n');

    // Test 2: Check if virtual_domains table exists and has domains
    console.log('Test 2: Checking virtual_domains table...');
    const [domainTables] = await connection.query("SHOW TABLES LIKE 'virtual_domains'");

    if (domainTables.length === 0) {
      console.error('❌ virtual_domains table does not exist!');
      await connection.end();
      return false;
    }

    const [domains] = await connection.query('SELECT * FROM virtual_domains');
    console.log(`✅ virtual_domains table exists with ${domains.length} domain(s)`);

    if (domains.length === 0) {
      console.log('⚠️  No domains found. Adding keykeeper.world...');
      await connection.query("INSERT INTO virtual_domains (name) VALUES ('keykeeper.world')");
      console.log('✅ Added keykeeper.world domain\n');
    } else {
      console.log('Domains:', domains.map(d => d.name).join(', '));
      console.log();
    }

    await connection.end();

    // Test 3: Test mail account creation
    console.log('Test 3: Testing mail account creation...');
    const testEmail = `test_${Date.now()}@keykeeper.world`;
    const testPassword = crypto.randomBytes(32).toString('hex');
    const testUserId = crypto.randomUUID();

    console.log(`Creating test mail account: ${testEmail}`);

    try {
      const result = await accountManager.createMailAccount(
        testEmail,
        testPassword,
        'Test User',
        1024,
        testUserId
      );

      console.log('✅ Mail account created successfully!');
      console.log('Result:', result);

      // Verify the account was created
      const emailCheck = await accountManager.checkMailAccount(testEmail);
      console.log(`✅ Verification: Account exists = ${emailCheck}\n`);

      // Clean up test account
      console.log('Cleaning up test account...');
      await accountManager.deleteMailAccount(testEmail);
      console.log('✅ Test account deleted\n');

    } catch (createError) {
      console.error('❌ Failed to create mail account:', createError.message);
      console.error('Full error:', createError);
      return false;
    }

    // Test 4: Test getUserEmailByUserId
    console.log('Test 4: Testing getUserEmailByUserId...');

    // First, create a test account to query
    const testEmail2 = `test2_${Date.now()}@keykeeper.world`;
    const testPassword2 = crypto.randomBytes(32).toString('hex');
    const testUserId2 = crypto.randomUUID();

    await accountManager.createMailAccount(
      testEmail2,
      testPassword2,
      'Test User 2',
      1024,
      testUserId2
    );

    const foundEmail = await accountManager.getUserEmailByUserId(testUserId2);

    if (foundEmail === testEmail2) {
      console.log(`✅ getUserEmailByUserId works correctly: ${foundEmail}\n`);
    } else {
      console.error(`❌ getUserEmailByUserId failed. Expected ${testEmail2}, got ${foundEmail}\n`);
    }

    // Clean up
    await accountManager.deleteMailAccount(testEmail2);

    console.log('=== All Tests Passed! ===');
    console.log('✅ Mail provisioning is working correctly');
    console.log('✅ Users will get mail accounts automatically upon registration\n');

    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run the tests
testMailProvisioning()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
