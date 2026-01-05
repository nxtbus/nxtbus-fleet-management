/**
 * Single CRUD Test - Debug specific operations
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
  console.log('Login response:', JSON.stringify(data, null, 2));
  
  if (data.token) {
    adminToken = data.token;
    console.log('✅ Login successful!');
    return true;
  }
  return false;
}

async function testBusCreate() {
  console.log('\n🧪 Testing Bus CREATE...');
  
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
  
  console.log('Request data:', JSON.stringify(busData, null, 2));
  
  const response = await fetch(`${API_BASE}/admin/buses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(busData)
  });
  
  const result = await response.json();
  console.log('Response status:', response.status);
  console.log('Response data:', JSON.stringify(result, null, 2));
}

async function testOwnerCreate() {
  console.log('\n🧪 Testing Owner CREATE...');
  
  const ownerData = {
    name: 'Test Owner',
    email: 'test@owner.com',
    phone: '1234567890',
    pin: '1234',
    address: 'Test Address',
    companyName: 'Test Company',
    licenseNumber: 'LIC123'
  };
  
  console.log('Request data:', JSON.stringify(ownerData, null, 2));
  
  const response = await fetch(`${API_BASE}/admin/owners`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(ownerData)
  });
  
  const result = await response.json();
  console.log('Response status:', response.status);
  console.log('Response data:', JSON.stringify(result, null, 2));
}

async function testDriverCreate() {
  console.log('\n🧪 Testing Driver CREATE...');
  
  const driverData = {
    name: 'Test Driver',
    phone: '9876543210',
    licenseNumber: 'DL-TEST-123',
    pin: '1234',
    status: 'active',
    experienceYears: 5
  };
  
  console.log('Request data:', JSON.stringify(driverData, null, 2));
  
  const response = await fetch(`${API_BASE}/admin/drivers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(driverData)
  });
  
  const result = await response.json();
  console.log('Response status:', response.status);
  console.log('Response data:', JSON.stringify(result, null, 2));
}

async function testOwnersRead() {
  console.log('\n🧪 Testing Owners READ...');
  
  const response = await fetch(`${API_BASE}/owners`, {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  const result = await response.json();
  console.log('Response status:', response.status);
  console.log('Response data:', JSON.stringify(result, null, 2));
}

async function run() {
  const loginSuccess = await loginAdmin();
  if (!loginSuccess) {
    console.log('❌ Login failed, cannot continue');
    return;
  }
  
  await testBusCreate();
  await testOwnerCreate();
  await testDriverCreate();
  await testOwnersRead();
}

run().catch(err => console.error('Error:', err));
