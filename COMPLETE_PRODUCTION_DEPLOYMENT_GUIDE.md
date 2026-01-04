# 🚀 Complete Production Deployment Guide
## Vercel + Render + Neon PostgreSQL

### **Total Setup Time: 15-20 minutes**
### **Total Cost: $0 (Free tiers)**

---

## 📋 **Prerequisites**

- ✅ GitHub account
- ✅ Your NxtBus project pushed to GitHub
- ✅ Basic understanding of environment variables

---

## 🗄️ **STEP 1: Database Setup (Neon PostgreSQL)**

### **✅ Your Database is Already Configured!**
Your Neon PostgreSQL database is already set up and ready to use:
- **Database**: `neondb`
- **Host**: `ep-orange-haze-a4ge1ncv-pooler.us-east-1.aws.neon.tech`
- **Connection String**: Ready for Render deployment

### **1.1 Database Status**
✅ **Database Created**: `neondb`  
✅ **Connection String**: Available  
✅ **SSL Enabled**: Required for security  
✅ **Ready for Production**: Yes  

### **1.2 Connection Details**
```
Host: ep-orange-haze-a4ge1ncv-pooler.us-east-1.aws.neon.tech
Database: neondb
User: neondb_owner
SSL Mode: require
Channel Binding: require
```

### **1.3 Get Connection String**
Your Neon database is already configured with this connection string:
```
postgresql://neondb_owner:npg_tAx2SjsUGmE5@ep-orange-haze-a4ge1ncv-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**✅ You can use this connection string directly in Render!**

### **1.4 Create Database Tables (Optional)**
The app works without this (uses fallback data), but for full functionality:

1. Go to **"SQL Editor"** in Neon dashboard
2. Run this SQL to create tables:

```sql
-- Create authentication tables
CREATE TABLE admins (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(200),
    email VARCHAR(200),
    role VARCHAR(50) DEFAULT 'admin',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE owners (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    phone VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    company_name VARCHAR(200),
    license_number VARCHAR(100),
    address TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE drivers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    experience_years INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Create operational tables
CREATE TABLE buses (
    id VARCHAR(50) PRIMARY KEY,
    number VARCHAR(20) NOT NULL,
    model VARCHAR(100),
    year INTEGER,
    capacity INTEGER,
    fuel_type VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    owner_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE routes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    start_point VARCHAR(100) NOT NULL,
    end_point VARCHAR(100) NOT NULL,
    start_lat DECIMAL(10, 8),
    start_lon DECIMAL(11, 8),
    end_lat DECIMAL(10, 8),
    end_lon DECIMAL(11, 8),
    estimated_duration INTEGER,
    distance DECIMAL(8, 2),
    fare DECIMAL(8, 2),
    status VARCHAR(20) DEFAULT 'active',
    stops JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE active_trips (
    id VARCHAR(50) PRIMARY KEY,
    trip_id VARCHAR(50) UNIQUE NOT NULL,
    bus_id VARCHAR(50),
    driver_id VARCHAR(50),
    driver_name VARCHAR(100),
    route_id VARCHAR(50),
    route_name VARCHAR(200),
    owner_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    start_time TIMESTAMP,
    estimated_end_time TIMESTAMP,
    current_gps JSONB,
    previous_gps JSONB,
    max_speed INTEGER,
    avg_speed INTEGER,
    gps_update_count INTEGER DEFAULT 0,
    overspeed_count INTEGER DEFAULT 0,
    last_overspeed BIGINT,
    last_update BIGINT,
    progress INTEGER DEFAULT 0,
    current_stop_id VARCHAR(50),
    next_stop_id VARCHAR(50),
    estimated_arrival TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample admin user
INSERT INTO admins (id, username, password, name, email) VALUES 
('ADM001', 'admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin@nxtbus.com');

-- Insert sample owner
INSERT INTO owners (id, name, email, phone, password, address) VALUES 
('OWN001', 'Sharma Transport', 'sharma@transport.com', '9876500001', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bangalore');

-- Insert sample driver
INSERT INTO drivers (id, name, phone, password, license_number) VALUES 
('DRV001', 'Rajesh Kumar', '9876543210', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'DL123456789');
```

**✅ Database Setup Complete!**

---

## 🖥️ **STEP 2: Backend Setup (Render)**

### **2.1 Create Render Account**
1. Go to [render.com](https://render.com)
2. Click **"Get Started"**
3. Sign up with **GitHub** (recommended)
4. Authorize Render to access your repositories

### **2.2 Create Web Service**
1. Click **"New +"** → **"Web Service"**
2. **Connect Repository**: Select your `nxtbus-fleet-management` repo
3. **Service Configuration**:
   - **Name**: `nxtbus-backend`
   - **Environment**: `Node`
   - **Region**: Same as your Neon database
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`

### **2.3 Configure Environment Variables**
In the **Environment Variables** section, add these:

```env
NODE_ENV=production
PORT=10000

# Database (Your actual Neon connection string)
DATABASE_URL=postgresql://neondb_owner:npg_tAx2SjsUGmE5@ep-orange-haze-a4ge1ncv-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Security
JWT_SECRET=nxtbus-super-secure-jwt-secret-production-2024-change-this
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# CORS (Will be updated after Vercel deployment)
CORS_ORIGIN=https://localhost:3000
CORS_CREDENTIALS=true

# Features
ENABLE_RATE_LIMITING=false
ENABLE_SECURITY_HEADERS=true
ENABLE_COMPRESSION=true

# Logging
LOG_LEVEL=info
```

### **2.4 Deploy Backend**
1. Click **"Create Web Service"**
2. Wait for deployment (3-5 minutes)
3. Your backend will be available at: `https://nxtbus-backend.onrender.com`

### **2.5 Test Backend**
Visit: `https://nxtbus-backend.onrender.com/api/health`

Expected response:
```json
{
  "status": "ok",
  "server": "NxtBus API Server - Production Ready",
  "version": "2.0.0",
  "environment": "production"
}
```

**✅ Backend Setup Complete!**

---

## 🌐 **STEP 3: Frontend Setup (Vercel)**

### **3.1 Create Vercel Account**
1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Sign up with **GitHub**
4. Authorize Vercel to access your repositories

### **3.2 Import Project**
1. Click **"New Project"**
2. **Import Git Repository**: Select `nxtbus-fleet-management`
3. **Project Configuration**:
   - **Project Name**: `nxtbus-fleet-management`
   - **Framework Preset**: `Vite`
   - **Root Directory**: Leave as `/` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### **3.3 Configure Environment Variables**
In **Environment Variables** section, add:

```env
VITE_API_BASE_URL=https://nxtbus-backend.onrender.com/api
NODE_ENV=production
```

### **3.4 Deploy Frontend**
1. Click **"Deploy"**
2. Wait for deployment (2-3 minutes)
3. Your frontend will be available at: `https://nxtbus-fleet-management.vercel.app`

**✅ Frontend Setup Complete!**

---

## 🔗 **STEP 4: Connect Frontend & Backend**

### **4.1 Update Backend CORS**
1. Go back to **Render Dashboard**
2. Select your `nxtbus-backend` service
3. Go to **Environment** tab
4. Update `CORS_ORIGIN` to include your Vercel URL:

```env
CORS_ORIGIN=https://nxtbus-fleet-management.vercel.app,https://nxtbus-fleet-management-git-main-nxt-bus-projects.vercel.app
```

5. Click **"Save Changes"**
6. Wait for automatic redeploy (1-2 minutes)

### **4.2 Test Connection**
1. Visit your Vercel app: `https://nxtbus-fleet-management.vercel.app`
2. Try logging in with test credentials:
   - **Admin**: `admin` / `admin123`
   - **Owner**: `9876500001` / `1234`
   - **Driver**: `9876543210` / `1234`

**✅ Connection Setup Complete!**

---

## 🎯 **STEP 5: Verification & Testing**

### **5.1 Test All Applications**

**Admin Dashboard:**
- URL: `https://nxtbus-fleet-management.vercel.app/admin`
- Login: `admin` / `admin123`
- Test: View dashboard, manage buses, routes, drivers

**Owner Dashboard:**
- URL: `https://nxtbus-fleet-management.vercel.app/owner`
- Login: `9876500001` / `1234`
- Test: View fleet, track buses, manage drivers

**Driver App:**
- URL: `https://nxtbus-fleet-management.vercel.app/driver`
- Login: `9876543210` / `1234`
- Test: Start trip, update GPS, view assigned buses

**Passenger App:**
- URL: `https://nxtbus-fleet-management.vercel.app`
- Test: Search buses, view routes, real-time tracking

### **5.2 API Testing**
Test these endpoints:
- `https://nxtbus-backend.onrender.com/api/health` ✅
- `https://nxtbus-backend.onrender.com/api/buses` ✅
- `https://nxtbus-backend.onrender.com/api/routes` ✅

### **5.3 Real-time Features**
- WebSocket connections ✅
- Live GPS tracking ✅
- Real-time notifications ✅

**✅ All Systems Operational!**

---

## 🔧 **STEP 6: Custom Domain Setup (Optional)**

### **6.1 Configure Custom Domain on Vercel**
1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain (e.g., `nxtbus.in`)
3. Configure DNS records as instructed by Vercel

### **6.2 Update Backend CORS**
Add your custom domain to the CORS_ORIGIN in Render:
```env
CORS_ORIGIN=https://nxtbus.in,https://nxtbus-fleet-management.vercel.app
```

---

## 📱 **STEP 7: Mobile App Configuration**

### **7.1 Update Capacitor Config**
Update `capacitor.config.json`:
```json
{
  "appId": "com.nxtbus.passenger",
  "appName": "NxtBus",
  "webDir": "dist",
  "server": {
    "url": "https://nxtbus-fleet-management.vercel.app",
    "cleartext": true
  }
}
```

### **7.2 Build Mobile Apps**
```bash
# Build for Android
npm run build
npx cap sync android
npx cap open android

# Build for iOS
npx cap sync ios
npx cap open ios
```

---

## 🎉 **DEPLOYMENT COMPLETE!**

## 📊 **Your Production URLs**

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | `https://nxtbus-fleet-management.vercel.app` | ✅ Live |
| **Backend API** | `https://nxtbus-backend.onrender.com` | ✅ Live |
| **Database** | Neon PostgreSQL | ✅ Connected |
| **Admin** | `/admin` | ✅ Working |
| **Owner** | `/owner` | ✅ Working |
| **Driver** | `/driver` | ✅ Working |
| **Passenger** | `/` | ✅ Working |

## 🔑 **Test Credentials**

| Role | Username/Phone | Password |
|------|----------------|----------|
| **Admin** | `admin` | `admin123` |
| **Owner** | `9876500001` | `1234` |
| **Driver** | `9876543210` | `1234` |

## 💰 **Cost Breakdown**

| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| **Vercel** | Hobby | **FREE** | 100GB bandwidth, unlimited projects |
| **Render** | Free | **FREE** | 750 hours/month (24/7 uptime) |
| **Neon** | Free | **FREE** | 512MB database, 1M queries/month |
| **Total** | | **$0/month** | Perfect for development & small production |

## 🚀 **Scaling Options**

When you need more resources:
- **Vercel Pro**: $20/month (more bandwidth, analytics)
- **Render Starter**: $7/month (always-on, more resources)
- **Neon Scale**: $19/month (3GB database, unlimited queries)

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

**1. CORS Errors**
- Check CORS_ORIGIN includes your Vercel URL
- Redeploy backend after updating environment variables

**2. Database Connection Issues**
- Verify DATABASE_URL is correct
- App works in fallback mode without database

**3. Build Failures**
- Check build logs in Vercel/Render dashboards
- Ensure all dependencies are in package.json

**4. Authentication Issues**
- Verify JWT_SECRET is set
- Check user credentials match test data

### **Support Resources**
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **Neon Docs**: [neon.tech/docs](https://neon.tech/docs)

---

## 🎯 **Next Steps**

1. **Add Real Data**: Replace sample data with your actual buses, routes, drivers
2. **Configure Notifications**: Set up email/SMS notifications
3. **Add Analytics**: Integrate tracking and monitoring
4. **Custom Domain**: Set up your own domain name
5. **Mobile Apps**: Build and publish to app stores
6. **Monitoring**: Set up uptime monitoring and alerts

**🎉 Congratulations! Your NxtBus fleet management system is now live in production!**