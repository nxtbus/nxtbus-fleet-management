# 🔐 NxtBus Test Credentials

## Test File
Open `test-complete-system.html` in your browser to run all tests automatically.

## Admin Login
- **Username**: `admin`
- **Password**: `admin123`
- **Endpoint**: `POST /api/auth/admin/login`

## Owner Login
### Owner 1 - Sharma Transport
- **Phone**: `9876500001`
- **PIN**: `1234`
- **Name**: Sharma Transport
- **Location**: Bangalore

### Owner 2 - Patel Bus Services
- **Phone**: `9876500002`
- **PIN**: `5678`
- **Name**: Patel Bus Services
- **Location**: Mangalore

**Endpoint**: `POST /api/auth/owner/login`

## Driver Login
### Driver 1 - Rajesh Kumar
- **Phone**: `9876543210`
- **PIN**: `1234`
- **Assigned Buses**: BUS001, BUS002

### Driver 2 - Suresh Patel
- **Phone**: `9876543211`
- **PIN**: `5678`
- **Assigned Buses**: BUS003, BUS004

### Driver 3 - Amit Singh
- **Phone**: `9876543212`
- **PIN**: `9012`
- **Assigned Buses**: BUS001, BUS005

**Endpoint**: `POST /api/auth/driver/login`

## API Endpoints Summary

### Authentication
- `POST /api/auth/admin/login` - Admin authentication
- `POST /api/auth/owner/login` - Owner authentication
- `POST /api/auth/driver/login` - Driver authentication

### Admin CRUD Operations
- **Buses**: `/api/admin/buses` (GET, POST, PUT, DELETE)
- **Routes**: `/api/admin/routes` (GET, POST, PUT, DELETE)
- **Drivers**: `/api/admin/drivers` (GET, POST, PUT, DELETE)
- **Delays**: `/api/admin/delays` (GET, POST, PUT, DELETE)
- **Notifications**: `/api/admin/notifications` (GET, POST, DELETE)
- **Owners**: `/api/admin/owners` (GET, POST, PUT, DELETE)

### Driver Operations
- `POST /api/driver/trips/start` - Start a trip
- `GET /api/trips/active` - Get active trips
- `PUT /api/trips/:tripId/gps` - Update GPS location

### Owner Operations
- `GET /api/owner/fleet-locations` - Get real-time fleet locations
- `GET /api/owner/dashboard` - Get dashboard statistics

## Running Tests

### Option 1: Automated Test Suite
1. Open `test-complete-system.html` in your browser
2. Click "Run Complete Test Suite"
3. View results with pass/fail status

### Option 2: Individual Tests
1. Open `test-complete-system.html`
2. Click individual test buttons for specific operations
3. View detailed responses for each test

### Option 3: Manual Testing
Use the credentials above to test in the actual application:
- Admin: http://localhost:5173/admin
- Owner: http://localhost:5173/owner
- Driver: http://localhost:5173/driver
- User: http://localhost:5173/

## Server Status
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173
- **Production Backend**: https://nxtbus-backend.onrender.com
- **Production Frontend**: https://nxtbus-fleet-management.vercel.app

## Notes
- All passwords and PINs are stored in plain text for testing purposes
- In production, implement proper password hashing (bcrypt)
- Add rate limiting and input validation
- Implement JWT tokens for session management
