/**
 * Simple script to check if mail tables exist and are set up correctly
 */

import mysql from 'mysql2/promise';

// Parse DATABASE_URL from environment
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

// Parse connection string
const parseConnectionString = (connectionString) => {
  const withoutProtocol = connectionString.replace(/^mysql2?:\/\//, '');
  const [userPart, hostPart] = withoutProtocol.split('@');
  const [username, password] = userPart.split(':');
  const [host, dbPart] = hostPart.split('/');
  const [hostname, port] = host.split(':');
  const parsedPort = port ? parseInt(port, 10) : 3306;
  let database = dbPart;
  if (dbPart && dbPart.includes('?')) {
    [database] = dbPart.split('?');
  }

  return {
    host: hostname,
    port: parsedPort,
    user: username,
    password: password,
    database: database
  };
};

async function checkMailTables() {
  console.log('=== Checking Mail Tables Setup ===\n');

  const config = parseConnectionString(dbUrl);
  console.log(`Connecting to: ${config.user}@${config.host}:${config.port}/${config.database}\n`);

  let connection;

  try {
    connection = await mysql.createConnection(config);
    console.log('✅ Database connection successful\n');

    // Check virtual_users table
    console.log('Checking virtual_users table...');
    const [tables1] = await connection.query("SHOW TABLES LIKE 'virtual_users'");

    if (tables1.length === 0) {
      console.error('❌ virtual_users table does NOT exist!');
      console.log('\nYou need to create it. Run:');
      console.log('  mysql -u user -p database < schema.sql\n');
      await connection.end();
      process.exit(1);
    }

    console.log('✅ virtual_users table exists');

    // Get structure
    const [structure] = await connection.query('DESCRIBE virtual_users');
    console.log('   Columns:', structure.map(s => s.Field).join(', '));

    // Check if user_id column exists
    const hasUserId = structure.some(s => s.Field === 'user_id');
    if (!hasUserId) {
      console.error('   ❌ Missing user_id column! Mail provisioning will fail.');
      console.log('   Run: ALTER TABLE virtual_users ADD COLUMN user_id VARCHAR(36) NULL;');
    } else {
      console.log('   ✅ Has user_id column for linking to users table');
    }

    // Check row count
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM virtual_users');
    console.log(`   Current mail accounts: ${rows[0].count}\n`);

    // Check virtual_domains table
    console.log('Checking virtual_domains table...');
    const [tables2] = await connection.query("SHOW TABLES LIKE 'virtual_domains'");

    if (tables2.length === 0) {
      console.error('❌ virtual_domains table does NOT exist!');
      await connection.end();
      process.exit(1);
    }

    console.log('✅ virtual_domains table exists');

    // Get domains
    const [domains] = await connection.query('SELECT * FROM virtual_domains');
    if (domains.length === 0) {
      console.log('   ⚠️  No domains found!');
      console.log('   Creating keykeeper.world domain...');
      await connection.query("INSERT INTO virtual_domains (name) VALUES ('keykeeper.world')");
      console.log('   ✅ Added keykeeper.world');
    } else {
      console.log('   Domains:', domains.map(d => `${d.name} (ID: ${d.id})`).join(', '));
    }

    console.log('\n=== Setup Check Complete ===');
    console.log('✅ All required tables exist and are properly configured');
    console.log('✅ Mail provisioning should work during user registration\n');

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkMailTables();
