const db = require('./services/databaseService');

async function checkTables() {
  try {
    console.log('🔍 Checking database tables...');
    
    // Get all tables
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tables in database:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check if drivers and owners tables exist
    const tableNames = result.rows.map(r => r.table_name);
    const hasDrivers = tableNames.includes('drivers');
    const hasOwners = tableNames.includes('owners');
    
    console.log('\n👥 Authentication Tables:');
    console.log(`  - drivers: ${hasDrivers ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - owners: ${hasOwners ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // If missing, we need to create them
    if (!hasDrivers || !hasOwners) {
      console.log('\n⚠️  ISSUE: Drivers and/or Owners tables are missing!');
      console.log('This means authentication will not work properly.');
      console.log('We need to create these tables and migrate the data.');
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await db.close();
  }
}

checkTables();