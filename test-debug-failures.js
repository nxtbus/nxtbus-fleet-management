/**
 * Debug specific failing tests
 */

const API_BASE = 'https://nxtbus-backend.onrender.com/api';
let adminToken = '';

async function loginAdmin() {
  console.log('\n🔐 Logging in as admin...');
  
  const response = await fetch(`${API_BASE}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  
  const data = await response.json();
  
  if (data.token) {
    adminToken = data.token;
    console.log('✅ Login successful!');
    return true;
  }
  return false;
}

async function testBusCreate() {
  console.log('\n🧪 Testing Bus CREATE with detailed error...');
  
  const busData = {
    number: 'TEST001',
    type: 'AC',
    capacity: 50,
    status: 'active',
    ownerId: 'OWN001',
    model: 'Volvo',
    year: 2024,
    fuelType: 'Diesel'
  };
  
  console.log('Request:', JSON.stringify(busData, null, 2));
  
  const response = await fetch(`${API_BASE}/admin/buses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(busData)
  });
  
  const result = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(result, null, 2));
}

async function testOwnerCreate() {
  console.log('\n🧪 Testing Owner CREATE with detailed error...');
  
  const ownerData = {
    name: 'Test Owner',
    email: 'test@owner.com',
    phone: '1234567890',
    pin: '1234',
    address: 'Test Address',
    companyName: 'Test Company',
    licenseNumber: 'LIC123'
  };
  
  console.log('Request:', JSON.stringify(ownerData, null, 2));
  
  const response = await fetch(`${API_BASE}/admin/owners`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(ownerData)
  });
  
  const result = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(result, null, 2));
}

async function testRouteUpdate() {
  console.log('\n🧪 Testing Route UPDATE with detailed error...');
  
  const updateData = {
    name: 'Updated Test Route',
    startPoint: 'Point A',
    endPoint: 'Point B',
    startLat: 12.9716,
    startLon: 77.5946,
    endLat: 13.0827,
    endLon: 80.2707,
    estimatedDuration: 60,
    status: 'inactive'
  };
  
  console.log('Request:', JSON.stringify(updateData, null, 2));
  
  const response = await fetch(`${API_BASE}/admin/routes/ROUTE002`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(updateData)
  });
  
  const result = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(result, null, 2));
}

async function testCallAlertUpdate() {
  console.log('\n🧪 Testing Call Alert UPDATE with detailed error...');
  
  const updateData = {
    acknowledged: true,
    status: 'inactive'
  };
  
  console.log('Request:', JSON.stringify(updateData, null, 2));
  
  const response = await fetch(`${API_BASE}/callAlerts/CALL001`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(updateData)
  });
  
  const result = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(result, null, 2));
}

async function run() {
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    console.log('❌ Login failed');
    return;
  }
  
  await testBusCreate();
  await testOwnerCreate();
  await testRouteUpdate();
  await testCallAlertUpdate();
}

run().catch(err => console.error('Error:', err));
