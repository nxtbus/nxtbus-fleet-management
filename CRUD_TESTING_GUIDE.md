# 🧪 CRUD Operations Testing Guide

## Quick Start

### Option 1: Automated Testing (Recommended)

1. **Open the test file**:
   ```
   Open: test-all-crud-operations.html
   ```

2. **Login as Admin**:
   - Click "🔐 Login as Admin" button
   - Uses credentials: `admin` / `admin123`
   - Token will be saved automatically

3. **Run All Tests**:
   - Click "🚀 Test All CRUD Operations" button
   - Watch as all 32 tests run automatically
   - Results appear in real-time

4. **Or Test Individual Modules**:
   - Click any CRUD button (CREATE, READ, UPDATE, DELETE) on specific modules
   - Test one operation at a time

### Option 2: Manual Testing via Admin Panel

1. **Login**: https://nxtbus-fleet-management.vercel.app/admin
   - Username: `admin`
   - Password: `admin123`

2. **Test Each Module**:
   - Navigate to each section
   - Try creating, editing, and deleting items
   - Check if data persists after refresh

---

## 📊 Test Coverage

### Modules Being Tested (8 modules, 32 operations)

| Module | CREATE | READ | UPDATE | DELETE |
|--------|--------|------|--------|--------|
| 👤 Owners | ✅ | ✅ | ✅ | ✅ |
| 🚌 Buses | ✅ | ✅ | ✅ | ✅ |
| 🛣️ Routes | ✅ | ✅ | ✅ | ✅ |
| 🧑‍✈️ Drivers | ✅ | ✅ | ✅ | ✅ |
| 🔗 Schedules | ✅ | ✅ | ✅ | ✅ |
| ⚠️ Delays | ✅ | ✅ | ✅ | ✅ |
| 📢 Notifications | ✅ | ✅ | ✅ | ✅ |
| 📞 Call Alerts | ✅ | ✅ | ✅ | ✅ |

---

## 🎯 Expected Results

### All Tests Should Pass ✅

After running the automated test:
- **Total Tests**: 32
- **Expected Passed**: 32
- **Expected Failed**: 0

### What Each Test Does

#### CREATE Tests
- Creates a new test record for each module
- Saves the ID for UPDATE and DELETE tests
- Verifies 201 or 200 status code

#### READ Tests
- Fetches all records from each module
- Verifies array response
- Counts number of items

#### UPDATE Tests
- Updates the created record (sets status to 'inactive')
- Verifies successful update
- Uses partial update (only status field)

#### DELETE Tests
- Deletes the created test record
- Verifies successful deletion
- Cleans up test data

---

## 🔍 Troubleshooting

### If Tests Fail

1. **Check Deployment Status**:
   - Backend: https://nxtbus-backend.onrender.com/api
   - Frontend: https://nxtbus-fleet-management.vercel.app
   - Wait 3-5 minutes if recently deployed

2. **Verify Token**:
   - Click "Login as Admin" button
   - Check browser console for token
   - Token should be saved in localStorage

3. **Check API Base URL**:
   - Should be: `https://nxtbus-backend.onrender.com/api`
   - No trailing slash

4. **Common Issues**:
   - **404 errors**: Endpoint not deployed yet
   - **401 errors**: Token expired or missing
   - **400 errors**: Validation failed (check data format)
   - **500 errors**: Server error (check backend logs)

---

## 📝 Test Data Used

### Owners
```json
{
  "name": "Test Owner",
  "email": "test@owner.com",
  "phone": "1234567890",
  "pin": "1234",
  "address": "Test Address"
}
```

### Buses
```json
{
  "number": "TEST-001",
  "type": "AC",
  "capacity": 50,
  "status": "active"
}
```

### Routes
```json
{
  "name": "Test Route",
  "startPoint": "Point A",
  "endPoint": "Point B",
  "startLat": 12.9716,
  "startLon": 77.5946,
  "endLat": 13.0827,
  "endLon": 80.2707,
  "estimatedDuration": 60,
  "status": "active"
}
```

### Drivers
```json
{
  "name": "Test Driver",
  "phone": "9876543210",
  "licenseNumber": "TEST123",
  "pin": "1234",
  "status": "active"
}
```

---

## 🎨 Test UI Features

### Visual Indicators
- **Yellow**: Test pending
- **Blue**: Test in progress
- **Green**: Test passed
- **Red**: Test failed

### Real-time Results
- All test results appear in the log
- Timestamp for each operation
- Success/error messages
- Summary statistics

### Individual Testing
- Test each CRUD operation separately
- Useful for debugging specific issues
- Click any button on module cards

---

## ✅ Success Criteria

### All Tests Pass When:
1. ✅ All CREATE operations return 201/200
2. ✅ All READ operations return arrays
3. ✅ All UPDATE operations return 200
4. ✅ All DELETE operations return 200
5. ✅ No 404, 401, or 500 errors
6. ✅ Data persists in database

### Verification Steps:
1. Run automated test suite
2. Check all 32 tests pass
3. Verify in admin panel that test data was created
4. Confirm test data was deleted (cleanup)

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅
- System is production-ready
- All CRUD operations working
- Database integration complete
- API endpoints functional

### If Some Tests Fail ❌
1. Note which module/operation failed
2. Check error message in log
3. Test manually in admin panel
4. Report specific failures for debugging

---

**Last Updated**: January 5, 2026  
**Test File**: `test-all-crud-operations.html`  
**Status**: Ready for testing
