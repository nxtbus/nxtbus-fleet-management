/**
 * Node.js CRUD Test Script
 * Run with: node test-crud-node.js
 */

const API_BASE = 'https://nxtbus-backend.onrender.com/api';
let adminToken = '';
const testResults = { total: 0, passed: 0, failed: 0 };
const createdIds = {};

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function loginAdmin() {
  log('\n🔐 Logging in as admin...', 'cyan');
  
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
      log('❌ Login failed: ' + (data.message || 'Unknown error'), 'red');
      return false;
    }
  } catch (err) {
    log('❌ Login error: ' + err.message, 'red');
    return false;
  }
}

function getHeaders(needsAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (needsAuth && adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }
  return headers;
}

function getTestData(moduleName) {
  const testData = {
    'Owners': { name: 'Test Owner', email: 'test@owner.com', phone: '1234567890', pin: '1234', address: 'Test Address', companyName: 'Test Company', licenseNumber: 'LIC123' },
    'Buses': { number: 'TEST-001', type: 'AC', capacity: 50, status: 'active', ownerId: 'OWN001', model: 'Volvo', year: 2024, fuelType: 'Diesel' },
    'Routes': { name: 'Test Route', startPoint: 'Point A', endPoint: 'Point B', startLat: 12.9716, startLon: 77.5946, endLat: 13.0827, endLon: 80.2707, estimatedDuration: 60, distance: 25, fare: 50, status: 'active' },
    'Drivers': { name: 'Test Driver', phone: '9876543210', licenseNumber: 'DL-TEST-123', pin: '1234', status: 'active', experienceYears: 5 },
    'Schedules': { busId: 'BUS001', routeId: 'ROUTE001', busNumber: 'KA-01-1234', routeName: 'Test Route', driverName: 'Test Driver', startTime: '08:00', endTime: '18:00', days: ['Mon', 'Tue', 'Wed'], status: 'active' },
    'Delays': { busId: 'BUS001', routeId: 'ROUTE001', busNumber: 'KA-01-1234', delayMinutes: 15, reason: 'Traffic', status: 'active' },
    'Notifications': { title: 'Test Notification', message: 'This is a test', type: 'info', priority: 'medium', status: 'active' },
    'Call Alerts': { driverId: 'DRV001', driverName: 'Test Driver', busNumber: 'KA-01-1234', alertType: 'emergency', message: 'Test alert', priority: 'high', status: 'active' }
  };
  return testData[moduleName] || {};
}

async function testCreate(moduleName, endpoint, needsAuth) {
  testResults.total++;
  log(`\n🧪 Testing CREATE for ${moduleName}...`, 'yellow');
  
  try {
    const data = getTestData(moduleName);
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: getHeaders(needsAuth),
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success !== false) {
      testResults.passed++;
      
      // Extract ID from various response formats
      let id = null;
      const singularName = moduleName.toLowerCase().replace(/s$/, ''); // Remove trailing 's'
      
      // Try different ways to extract ID
      if (result[singularName]?.id) {
        id = result[singularName].id;
      } else if (result.data?.id) {
        id = result.data.id;
      } else if (result.id) {
        id = result.id;
      } else if (result.bus?.id) {
        id = result.bus.id;
      } else if (result.route?.id) {
        id = result.route.id;
      } else if (result.driver?.id) {
        id = result.driver.id;
      } else if (result.owner?.id) {
        id = result.owner.id;
      } else if (result.schedule?.id) {
        id = result.schedule.id;
      } else if (result.delay?.id) {
        id = result.delay.id;
      } else if (result.notification?.id) {
        id = result.notification.id;
      } else if (result.alert?.id) {
        id = result.alert.id;
      }
      
      if (id) createdIds[moduleName] = id;
      log(`✅ CREATE ${moduleName}: SUCCESS (${response.status}) - ID: ${id || 'N/A'}`, 'green');
      return true;
    } else {
      testResults.failed++;
      log(`❌ CREATE ${moduleName}: FAILED - ${result.message || response.statusText}`, 'red');
      return false;
    }
  } catch (err) {
    testResults.failed++;
    log(`❌ CREATE ${moduleName}: ERROR - ${err.message}`, 'red');
    return false;
  }
}

async function testRead(moduleName, endpoint, needsAuth) {
  testResults.total++;
  log(`🧪 Testing READ for ${moduleName}...`, 'yellow');
  
  try {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      headers: getHeaders(needsAuth)
    });
    
    const result = await response.json();
    
    if (response.ok && Array.isArray(result)) {
      testResults.passed++;
      log(`✅ READ ${moduleName}: SUCCESS - Found ${result.length} items`, 'green');
      return true;
    } else {
      testResults.failed++;
      log(`❌ READ ${moduleName}: FAILED - ${response.statusText}`, 'red');
      return false;
    }
  } catch (err) {
    testResults.failed++;
    log(`❌ READ ${moduleName}: ERROR - ${err.message}`, 'red');
    return false;
  }
}

async function testUpdate(moduleName, endpoint, needsAuth) {
  testResults.total++;
  log(`🧪 Testing UPDATE for ${moduleName}...`, 'yellow');
  
  const id = createdIds[moduleName];
  if (!id) {
    log(`⚠️  UPDATE ${moduleName}: SKIPPED - No ID from CREATE test`, 'yellow');
    return false;
  }
  
  try {
    const updateData = { status: 'inactive' };
    const response = await fetch(`${API_BASE}/${endpoint}/${id}`, {
      method: 'PUT',
      headers: getHeaders(needsAuth),
      body: JSON.stringify(updateData)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success !== false) {
      testResults.passed++;
      log(`✅ UPDATE ${moduleName}: SUCCESS (${response.status})`, 'green');
      return true;
    } else {
      testResults.failed++;
      log(`❌ UPDATE ${moduleName}: FAILED - ${result.message || response.statusText}`, 'red');
      return false;
    }
  } catch (err) {
    testResults.failed++;
    log(`❌ UPDATE ${moduleName}: ERROR - ${err.message}`, 'red');
    return false;
  }
}

async function testDelete(moduleName, endpoint, needsAuth) {
  testResults.total++;
  log(`🧪 Testing DELETE for ${moduleName}...`, 'yellow');
  
  const id = createdIds[moduleName];
  if (!id) {
    log(`⚠️  DELETE ${moduleName}: SKIPPED - No ID from CREATE test`, 'yellow');
    return false;
  }
  
  try {
    const response = await fetch(`${API_BASE}/${endpoint}/${id}`, {
      method: 'DELETE',
      headers: getHeaders(needsAuth)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success !== false) {
      testResults.passed++;
      log(`✅ DELETE ${moduleName}: SUCCESS (${response.status})`, 'green');
      return true;
    } else {
      testResults.failed++;
      log(`❌ DELETE ${moduleName}: FAILED - ${result.message || response.statusText}`, 'red');
      return false;
    }
  } catch (err) {
    testResults.failed++;
    log(`❌ DELETE ${moduleName}: ERROR - ${err.message}`, 'red');
    return false;
  }
}

async function testModule(name, endpoint, needsAuth) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`📦 Testing ${name} Module`, 'cyan');
  log('='.repeat(60), 'cyan');
  
  await testCreate(name, endpoint, needsAuth);
  await new Promise(resolve => setTimeout(resolve, 500));
  await testRead(name, endpoint, needsAuth);
  await new Promise(resolve => setTimeout(resolve, 500));
  await testUpdate(name, endpoint, needsAuth);
  await new Promise(resolve => setTimeout(resolve, 500));
  await testDelete(name, endpoint, needsAuth);
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('🚀 NxtBus CRUD Operations Test Suite', 'blue');
  log('='.repeat(60) + '\n', 'blue');
  
  // Login first
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    log('\n❌ Cannot proceed without admin token', 'red');
    return;
  }
  
  // Test all modules
  const modules = [
    { name: 'Owners', endpoint: 'admin/owners', hasAuth: true },
    { name: 'Buses', endpoint: 'admin/buses', hasAuth: true },
    { name: 'Routes', endpoint: 'admin/routes', hasAuth: true },
    { name: 'Drivers', endpoint: 'admin/drivers', hasAuth: true },
    { name: 'Schedules', endpoint: 'schedules', hasAuth: false },
    { name: 'Delays', endpoint: 'admin/delays', hasAuth: true },
    { name: 'Notifications', endpoint: 'admin/notifications', hasAuth: true },
    { name: 'Call Alerts', endpoint: 'callAlerts', hasAuth: false }
  ];
  
  for (const module of modules) {
    await testModule(module.name, module.endpoint, module.hasAuth);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print summary
  log('\n' + '='.repeat(60), 'blue');
  log('📊 Test Summary', 'blue');
  log('='.repeat(60), 'blue');
  log(`Total Tests: ${testResults.total}`, 'cyan');
  log(`Passed: ${testResults.passed}`, 'green');
  log(`Failed: ${testResults.failed}`, 'red');
  log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 'cyan');
  log('='.repeat(60) + '\n', 'blue');
  
  if (testResults.failed === 0) {
    log('🎉 All tests passed! System is fully functional!', 'green');
  } else {
    log(`⚠️  ${testResults.failed} test(s) failed. Check errors above.`, 'yellow');
  }
}

// Run tests
runAllTests().catch(err => {
  log('\n❌ Fatal error: ' + err.message, 'red');
  process.exit(1);
});
