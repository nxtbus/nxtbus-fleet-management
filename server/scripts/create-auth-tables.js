/**
 * Create Authentication Tables and Migrate Data
 * Creates drivers and owners tables with proper authentication fields
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../services/databaseService');

async function createAuthTables() {
  console.log('🔐 Creating authentication tables...');
  
  const authSchema = `
    -- Create drivers table
    CREATE TABLE IF NOT EXISTS drivers (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        pin VARCHAR(255) NOT NULL, -- Hashed PIN
        license_number VARCHAR(50),
        experience_years INTEGER,
        status VARCHAR(20) DEFAULT 'active',
        owner_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create owners table  
    CREATE TABLE IF NOT EXISTS owners (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL, -- Hashed password
        company_name VARCHAR(200),
        license_number VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create admins table
    CREATE TABLE IF NOT EXISTS admins (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL, -- Hashed password
        role VARCHAR(20) DEFAULT 'admin',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for authentication
    CREATE INDEX IF NOT EXISTS idx_drivers_phone ON drivers(phone);
    CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
    CREATE INDEX IF NOT EXISTS idx_owners_email ON owners(email);
    CREATE INDEX IF NOT EXISTS idx_owners_status ON owners(status);
    CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
    CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
  `;

  try {
    await db.query(authSchema);
    console.log('✅ Authentication tables created successfully');
  } catch (error) {
    console.error('❌ Failed to create authentication tables:', error.message);
    throw error;
  }
}

async function migrateAuthData() {
  console.log('👥 Migrating authentication data...');
  
  const dataDir = path.join(__dirname, '../data');
  
  try {
    // 1. Migrate Drivers
    console.log('🚗 Migrating drivers...');
    const driversFile = path.join(dataDir, 'drivers.json');
    if (fs.existsSync(driversFile)) {
      const drivers = JSON.parse(fs.readFileSync(driversFile, 'utf8'));
      for (const driver of drivers) {
        try {
          await db.query(
            `INSERT INTO drivers (id, name, phone, pin, license_number, experience_years, status, owner_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             ON CONFLICT (id) DO UPDATE SET 
             name = EXCLUDED.name, phone = EXCLUDED.phone, pin = EXCLUDED.pin,
             license_number = EXCLUDED.license_number, experience_years = EXCLUDED.experience_years,
             status = EXCLUDED.status, owner_id = EXCLUDED.owner_id, updated_at = CURRENT_TIMESTAMP`,
            [driver.id, driver.name, driver.phone, driver.pin, driver.licenseNumber, 
             driver.experienceYears, driver.status || 'active', driver.ownerId]
          );
        } catch (error) {
          console.error(`Failed to migrate driver ${driver.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${drivers.length} drivers`);
    } else {
      console.log('⚠️  No drivers.json file found - creating sample drivers');
      await createSampleDrivers();
    }

    // 2. Migrate Owners
    console.log('🏢 Migrating owners...');
    const ownersFile = path.join(dataDir, 'owners.json');
    if (fs.existsSync(ownersFile)) {
      const owners = JSON.parse(fs.readFileSync(ownersFile, 'utf8'));
      for (const owner of owners) {
        try {
          await db.query(
            `INSERT INTO owners (id, name, email, phone, password, company_name, license_number, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             ON CONFLICT (id) DO UPDATE SET 
             name = EXCLUDED.name, email = EXCLUDED.email, phone = EXCLUDED.phone,
             password = EXCLUDED.password, company_name = EXCLUDED.company_name,
             license_number = EXCLUDED.license_number, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP`,
            [owner.id, owner.name, owner.email, owner.phone, owner.pin || owner.password, 
             owner.companyName || owner.name, owner.licenseNumber || 'N/A', owner.status || 'active']
          );
        } catch (error) {
          console.error(`Failed to migrate owner ${owner.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${owners.length} owners`);
    } else {
      console.log('⚠️  No owners.json file found - creating sample owners');
      await createSampleOwners();
    }

    // 3. Migrate Admins
    console.log('👑 Migrating admins...');
    const adminsFile = path.join(dataDir, 'admins.json');
    if (fs.existsSync(adminsFile)) {
      const admins = JSON.parse(fs.readFileSync(adminsFile, 'utf8'));
      for (const admin of admins) {
        try {
          await db.query(
            `INSERT INTO admins (id, username, email, password, role, status) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT (id) DO UPDATE SET 
             username = EXCLUDED.username, email = EXCLUDED.email, password = EXCLUDED.password,
             role = EXCLUDED.role, status = EXCLUDED.status, updated_at = CURRENT_TIMESTAMP`,
            [admin.id, admin.username, admin.email, admin.password, 
             admin.role || 'admin', admin.status || 'active']
          );
        } catch (error) {
          console.error(`Failed to migrate admin ${admin.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${admins.length} admins`);
    } else {
      console.log('⚠️  No admins.json file found - creating sample admin');
      await createSampleAdmin();
    }

  } catch (error) {
    console.error('❌ Authentication data migration failed:', error);
    throw error;
  }
}

async function createSampleDrivers() {
  const bcrypt = require('bcrypt');
  const sampleDrivers = [
    {
      id: 'DRV001',
      name: 'Rajesh Kumar',
      phone: '9876543210',
      pin: await bcrypt.hash('1234', 10),
      licenseNumber: 'KA20230001',
      experienceYears: 5,
      ownerId: 'OWN001'
    },
    {
      id: 'DRV002', 
      name: 'Suresh Patel',
      phone: '9876543211',
      pin: await bcrypt.hash('5678', 10),
      licenseNumber: 'KA20230002',
      experienceYears: 8,
      ownerId: 'OWN001'
    },
    {
      id: 'DRV003',
      name: 'Amit Singh',
      phone: '9876543212',
      pin: await bcrypt.hash('9012', 10),
      licenseNumber: 'KA20230003',
      experienceYears: 3,
      ownerId: 'OWN002'
    }
  ];

  for (const driver of sampleDrivers) {
    await db.query(
      `INSERT INTO drivers (id, name, phone, pin, license_number, experience_years, owner_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [driver.id, driver.name, driver.phone, driver.pin, driver.licenseNumber, 
       driver.experienceYears, driver.ownerId, 'active']
    );
  }
  console.log(`✅ Created ${sampleDrivers.length} sample drivers`);
}

async function createSampleOwners() {
  const bcrypt = require('bcrypt');
  const sampleOwners = [
    {
      id: 'OWN001',
      name: 'Bangalore Transport Co.',
      email: 'owner@nxtbus.in',
      phone: '9876543200',
      password: await bcrypt.hash('owner123', 10),
      companyName: 'Bangalore Transport Co.',
      licenseNumber: 'BTC2023001'
    },
    {
      id: 'OWN002',
      name: 'City Bus Services',
      email: 'citybus@nxtbus.in', 
      phone: '9876543201',
      password: await bcrypt.hash('city123', 10),
      companyName: 'City Bus Services Pvt Ltd',
      licenseNumber: 'CBS2023001'
    }
  ];

  for (const owner of sampleOwners) {
    await db.query(
      `INSERT INTO owners (id, name, email, phone, password, company_name, license_number, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [owner.id, owner.name, owner.email, owner.phone, owner.password, 
       owner.companyName, owner.licenseNumber, 'active']
    );
  }
  console.log(`✅ Created ${sampleOwners.length} sample owners`);
}

async function createSampleAdmin() {
  const bcrypt = require('bcrypt');
  const admin = {
    id: 'ADM001',
    username: 'admin',
    email: 'admin@nxtbus.in',
    password: await bcrypt.hash('admin123', 10),
    role: 'admin'
  };

  await db.query(
    `INSERT INTO admins (id, username, email, password, role, status) 
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [admin.id, admin.username, admin.email, admin.password, admin.role, 'active']
  );
  console.log('✅ Created sample admin');
}

async function verifyAuthTables() {
  console.log('\n🔍 Verifying authentication tables...');
  
  const counts = await Promise.all([
    db.query('SELECT COUNT(*) FROM drivers'),
    db.query('SELECT COUNT(*) FROM owners'),
    db.query('SELECT COUNT(*) FROM admins')
  ]);

  console.log('📊 Authentication Data Summary:');
  console.log(`✅ Drivers: ${counts[0].rows[0].count}`);
  console.log(`✅ Owners: ${counts[1].rows[0].count}`);
  console.log(`✅ Admins: ${counts[2].rows[0].count}`);
}

async function main() {
  try {
    console.log('🔐 Setting up authentication system...\n');
    
    // Create tables
    await createAuthTables();
    
    // Migrate data
    await migrateAuthData();
    
    // Verify
    await verifyAuthTables();
    
    console.log('\n🎉 Authentication system setup completed successfully!');
    console.log('🔗 Login credentials are now stored securely in PostgreSQL.');
    
  } catch (error) {
    console.error('\n❌ Authentication setup failed:', error.message);
    process.exit(1);
  } finally {
    await db.close();
    process.exit(0);
  }
}

main();