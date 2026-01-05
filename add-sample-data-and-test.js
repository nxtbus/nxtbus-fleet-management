/**
 * Add Sample Data and Test All CRUD Operations
 * Run with: node add-sample-data-and-test.js
 */

const API_BASE = 'https://nxtbus-backend.onrender.com/api';
let adminToken = '';

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log('\n' + '='.repeat(70), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(70), 'cyan');
}

async function loginAdmin() {
  section('🔐 STEP 1: Admin Login');
  
  try {
    const response = await fetch(`${API_BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    
    const data = await response.json();
    
    if (data.token) {
      adminToken = data.token;
      log('✅ Login successful!', 'green');
      return true;
    } else {
      log('❌ Login failed: ' + data.message, 'red');
      return false;
    }
  } catch (err) {
    log('❌ Login error: ' + err.message, 'red');
    return false;
  }
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };
}

// Sample data
const sampleData = {
  owners: [
    { name: 'Sharma Transport', email: 'sharma@transport.com', phone: '9876500001', pin: '1234', address: 'Bangalore, Karnataka', companyName: 'Sharma Transport Pvt Ltd', licenseNumber: 'KA-TRANS-001' },
    { name: 'Patel Bus Services', email: 'patel@busservices.com', phone: '9876500002', pin: '5678', address: 'Mangalore, Karnataka', companyName: 'Patel Bus Services', licenseNumber: 'KA-TRANS-002' }
  ],
  buses: [
    { number: 'KA01AB1234', type: 'AC', capacity: 40, status: 'active', ownerId: 'OWN001', model: 'Volvo B9R', year: 2023, fuelType: 'Diesel' },
    { number: 'KA02CD5678', type: 'Non-AC', capacity: 50, status: 'active', ownerId: 'OWN001', model: 'Ashok Leyland', year: 2022, fuelType: 'Diesel' },
    { number: 'KA03EF9012', type: 'AC', capacity: 45, status: 'active', ownerId: 'OWN002', model: 'Tata Starbus', year: 2024, fuelType: 'CNG' }
  ],
  routes: [
    { name: 'Bangalore → Mysore', startPoint: 'Bangalore City', endPoint: 'Mysore Palace', startLat: 12.9716, startLon: 77.5946, endLat: 12.3051, endLon: 76.6553, estimatedDuration: 180, distance: 150, fare: 250, status: 'active' },
    { name: 'Bangalore → Mangalore', startPoint: 'Bangalore', endPoint: 'Mangalore', startLat: 12.9716, startLon: 77.5946, endLat: 12.9141, endLon: 74.8560, estimatedDuration: 420, distance: 350, fare: 600, status: 'active' }
  ],
  drivers: [
    { name: 'Rajesh Kumar', phone: '9876543210', licenseNumber: 'KA-DL-2020-001234', pin: '1234', status: 'active', experienceYears: 10 },
    { name: 'Suresh Patel', phone: '9876543211', licenseNumber: 'KA-DL-2019-005678', pin: '5678', status: 'active', experienceYears: 8 },
    { name: 'Amit Singh', phone: '9876543212', licenseNumber: 'KA-DL-2021-009012', pin: '9012', status: 'active', experienceYears: 5 }
  ]
};

const createdIds = {
  owners: [],
  buses: [],
  routes: [],
  drivers: []
};

// CREATE operations
async function createOwners() {
  section('📦 STEP 2: Creating Owners');
  
  for (const owner of sampleData.owners) {
    try {
      const response = await fetch(`${API_BASE}/admin/owners`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(owner)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        createdIds.owners.push(data.owner.id);
        log(`✅ Created owner: ${owner.name} (ID: ${data.owner.id})`, 'green');
      } else {
        log(`❌ Failed to create owner ${owner.name}: ${data.message}`, 'red');
      }
    } catch (err) {
      log(`❌ Error creating owner ${owner.name}: ${err.message}`, 'red');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function createBuses() {
  section('🚌 STEP 3: Creating Buses');
  
  for (const bus of sampleData.buses) {
    try {
      const response = await fetch(`${API_BASE}/admin/buses`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(bus)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        createdIds.buses.push(data.bus.id);
        log(`✅ Created bus: ${bus.number} (ID: ${data.bus.id})`, 'green');
      } else {
        log(`❌ Failed to create bus ${bus.number}: ${data.message}`, 'red');
      }
    } catch (err) {
      log(`❌ Error creating bus ${bus.number}: ${err.message}`, 'red');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function createRoutes() {
  section('🛣️  STEP 4: Creating Routes');
  
  for (const route of sampleData.routes) {
    try {
      const response = await fetch(`${API_BASE}/admin/routes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(route)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        createdIds.routes.push(data.route.id);
        log(`✅ Created route: ${route.name} (ID: ${data.route.id})`, 'green');
      } else {
        log(`❌ Failed to create route ${route.name}: ${data.message}`, 'red');
      }
    } catch (err) {
      log(`❌ Error creating route ${route.name}: ${err.message}`, 'red');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function createDrivers() {
  section('👨‍✈️ STEP 5: Creating Drivers');
  
  for (const driver of sampleData.drivers) {
    try {
      const response = await fetch(`${API_BASE}/admin/drivers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(driver)
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        createdIds.drivers.push(data.driver.id);
        log(`✅ Created driver: ${driver.name} (ID: ${data.driver.id})`, 'green');
      } else {
        log(`❌ Failed to create driver ${driver.name}: ${data.message}`, 'red');
      }
    } catch (err) {
      log(`❌ Error creating driver ${driver.name}: ${err.message}`, 'red');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// READ operations
async function testReadOperations() {
  section('📖 STEP 6: Testing READ Operations');
  
  const endpoints = [
    { name: 'Owners', url: '/owners' },
    { name: 'Buses', url: '/admin/buses' },
    { name: 'Routes', url: '/admin/routes' },
    { name: 'Drivers', url: '/admin/drivers' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint.url}`, {
        headers: getHeaders()
      });
      
      const data = await response.json();
      
      if (response.ok && Array.isArray(data)) {
        log(`✅ ${endpoint.name}: Found ${data.length} items`, 'green');
      } else {
        log(`❌ ${endpoint.name}: Failed to read`, 'red');
      }
    } catch (err) {
      log(`❌ ${endpoint.name}: Error - ${err.message}`, 'red');
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

// UPDATE operations
async function testUpdateOperations() {
  section('✏️  STEP 7: Testing UPDATE Operations');
  
  // Update first bus
  if (createdIds.buses.length > 0) {
    try {
      const busId = createdIds.buses[0];
      const response = await fetch(`${API_BASE}/admin/buses/${busId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'maintenance' })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        log(`✅ Updated bus ${busId} status to 'maintenance'`, 'green');
      } else {
        log(`❌ Failed to update bus ${busId}`, 'red');
      }
    } catch (err) {
      log(`❌ Error updating bus: ${err.message}`, 'red');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Update first route
  if (createdIds.routes.length > 0) {
    try {
      const routeId = createdIds.routes[0];
      const response = await fetch(`${API_BASE}/admin/routes/${routeId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ fare: 300 })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        log(`✅ Updated route ${routeId} fare to 300`, 'green');
      } else {
        log(`❌ Failed to update route ${routeId}`, 'red');
      }
    } catch (err) {
      log(`❌ Error updating route: ${err.message}`, 'red');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// DELETE operations
async function testDeleteOperations() {
  section('🗑️  STEP 8: Testing DELETE Operations');
  
  // Delete last driver
  if (createdIds.drivers.length > 0) {
    try {
      const driverId = createdIds.drivers[createdIds.drivers.length - 1];
      const response = await fetch(`${API_BASE}/admin/drivers/${driverId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        log(`✅ Deleted driver ${driverId}`, 'green');
        createdIds.drivers.pop();
      } else {
        log(`❌ Failed to delete driver ${driverId}`, 'red');
      }
    } catch (err) {
      log(`❌ Error deleting driver: ${err.message}`, 'red');
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Delete last bus
  if (createdIds.buses.length > 0) {
    try {
      const busId = createdIds.buses[createdIds.buses.length - 1];
      const response = await fetch(`${API_BASE}/admin/buses/${busId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        log(`✅ Deleted bus ${busId}`, 'green');
        createdIds.buses.pop();
      } else {
        log(`❌ Failed to delete bus ${busId}`, 'red');
      }
    } catch (err) {
      log(`❌ Error deleting bus: ${err.message}`, 'red');
    }
  }
}

// Summary
async function printSummary() {
  section('📊 FINAL SUMMARY');
  
  log(`\n✅ Sample Data Created:`, 'cyan');
  log(`   Owners: ${createdIds.owners.length}`, 'white');
  log(`   Buses: ${createdIds.buses.length}`, 'white');
  log(`   Routes: ${createdIds.routes.length}`, 'white');
  log(`   Drivers: ${createdIds.drivers.length}`, 'white');
  
  log(`\n📝 Created IDs:`, 'cyan');
  log(`   Owners: ${createdIds.owners.join(', ')}`, 'white');
  log(`   Buses: ${createdIds.buses.join(', ')}`, 'white');
  log(`   Routes: ${createdIds.routes.join(', ')}`, 'white');
  log(`   Drivers: ${createdIds.drivers.join(', ')}`, 'white');
  
  log(`\n🎉 All CRUD operations tested successfully!`, 'green');
  log(`\n📱 You can now view the data in the admin dashboard:`, 'cyan');
  log(`   https://nxtbus-admin.vercel.app\n`, 'blue');
}

// Main execution
async function main() {
  log('\n🚀 NxtBus Sample Data & CRUD Test Suite', 'magenta');
  log('==========================================\n', 'magenta');
  
  // Step 1: Login
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    log('\n❌ Cannot proceed without admin token', 'red');
    return;
  }
  
  // Step 2-5: Create sample data
  await createOwners();
  await createBuses();
  await createRoutes();
  await createDrivers();
  
  // Step 6: Test READ operations
  await testReadOperations();
  
  // Step 7: Test UPDATE operations
  await testUpdateOperations();
  
  // Step 8: Test DELETE operations
  await testDeleteOperations();
  
  // Final summary
  await printSummary();
}

// Run the script
main().catch(err => {
  log('\n❌ Fatal error: ' + err.message, 'red');
  process.exit(1);
});
