# 🚀 Production Deployment Guide: Vercel + Render + Neon

## Overview
- **Frontend**: Vercel (Free tier - unlimited projects)
- **Backend**: Render (Free tier - 750 hours/month)
- **Database**: Neon PostgreSQL (Free tier - 512MB)
- **Domain**: nxtbus.in (your existing domain)

## Total Monthly Cost: $0 (Free tiers)

---

## 📊 Step 1: Database Setup (Neon PostgreSQL)

### 1.1 Create Neon Account
1. Go to https://neon.tech
2. Sign up with GitHub (recommended for easy integration)
3. Create a new project: "nxtbus-production"

### 1.2 Get Database Connection String
After creating the project, you'll get a connection string like:
```
postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/nxtbusdb?sslmode=require
```

### 1.3 Database Schema Setup
We'll need to migrate from JSON files to PostgreSQL. Here's the schema:

```sql
-- Create tables for NxtBus
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
    bus_id VARCHAR(50) REFERENCES buses(id),
    driver_id VARCHAR(50),
    driver_name VARCHAR(100),
    route_id VARCHAR(50) REFERENCES routes(id),
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

CREATE TABLE schedules (
    id VARCHAR(50) PRIMARY KEY,
    bus_id VARCHAR(50) REFERENCES buses(id),
    route_id VARCHAR(50) REFERENCES routes(id),
    bus_number VARCHAR(20),
    route_name VARCHAR(200),
    driver_name VARCHAR(100),
    start_time TIME,
    end_time TIME,
    days TEXT[],
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type VARCHAR(50),
    priority VARCHAR(20) DEFAULT 'medium',
    target_audience VARCHAR(50),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE feedbacks (
    id VARCHAR(50) PRIMARY KEY,
    user_name VARCHAR(100),
    user_email VARCHAR(100),
    bus_number VARCHAR(20),
    route_name VARCHAR(200),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    category VARCHAR(50),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending'
);

CREATE TABLE delays (
    id VARCHAR(50) PRIMARY KEY,
    bus_id VARCHAR(50),
    bus_number VARCHAR(20),
    route_id VARCHAR(50),
    delay_minutes INTEGER,
    reason VARCHAR(200),
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE call_alerts (
    id VARCHAR(50) PRIMARY KEY,
    driver_id VARCHAR(50),
    driver_name VARCHAR(100),
    bus_number VARCHAR(20),
    alert_type VARCHAR(50),
    message TEXT,
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

-- Create indexes for better performance
CREATE INDEX idx_buses_status ON buses(status);
CREATE INDEX idx_routes_status ON routes(status);
CREATE INDEX idx_active_trips_status ON active_trips(status);
CREATE INDEX idx_active_trips_route ON active_trips(route_id);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_feedbacks_status ON feedbacks(status);
```

---

## 🖥️ Step 2: Backend Setup (Render)

### 2.1 Prepare Backend for Production

First, let's update the backend to use PostgreSQL instead of JSON files:

```bash
# Install PostgreSQL driver
cd server
npm install pg
npm install --save-dev @types/pg
```

### 2.2 Create Database Service
Create `server/services/databaseService.js`:

```javascript
const { Pool } = require('pg');

class DatabaseService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Buses
  async getBuses() {
    const result = await this.query('SELECT * FROM buses WHERE status = $1', ['active']);
    return result.rows;
  }

  async getBusById(id) {
    const result = await this.query('SELECT * FROM buses WHERE id = $1', [id]);
    return result.rows[0];
  }

  async addBus(busData) {
    const { id, number, model, year, capacity, fuel_type, owner_id } = busData;
    const result = await this.query(
      'INSERT INTO buses (id, number, model, year, capacity, fuel_type, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [id, number, model, year, capacity, fuel_type, owner_id]
    );
    return result.rows[0];
  }

  // Routes
  async getRoutes() {
    const result = await this.query('SELECT * FROM routes WHERE status = $1', ['active']);
    return result.rows;
  }

  // Active Trips
  async getActiveTrips() {
    const result = await this.query('SELECT * FROM active_trips WHERE status = $1', ['active']);
    return result.rows;
  }

  // Add more methods as needed...
}

module.exports = new DatabaseService();
```

### 2.3 Update Environment Variables
Update `server/.env.production`:

```env
# Production Environment
NODE_ENV=production
PORT=10000

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/nxtbusdb?sslmode=require

# Security
JWT_SECRET=your-super-secure-production-jwt-secret-256-bits-long
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# CORS (Update with your Vercel domains)
CORS_ORIGIN=https://nxtbus.vercel.app,https://admin.nxtbus.in,https://owner.nxtbus.in,https://driver.nxtbus.in,https://nxtbus.in

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
ENABLE_RATE_LIMITING=true

# Logging
LOG_LEVEL=info
```

### 2.4 Create Render Deployment
1. Go to https://render.com
2. Sign up with GitHub
3. Connect your GitHub repository
4. Create a new "Web Service"
5. Configure:
   - **Name**: nxtbus-backend
   - **Environment**: Node
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Environment Variables**: Add all from `.env.production`

---

## 🌐 Step 3: Frontend Setup (Vercel)

### 3.1 Update API Configuration
Update `src/services/apiService.js`:

```javascript
// Production API configuration
const getAPIBase = () => {
  // Production: use Render backend URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://nxtbus-backend.onrender.com/api';
  }
  
  // Development: use localhost
  const HOST = getHost();
  return `http://${HOST}:3001/api`;
};

const API_BASE = getAPIBase();
```

### 3.2 Create Vercel Configuration
Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/admin/(.*)",
      "dest": "/admin/index.html"
    },
    {
      "src": "/owner/(.*)",
      "dest": "/owner/index.html"
    },
    {
      "src": "/driver/(.*)",
      "dest": "/driver/index.html"
    },
    {
      "src": "/passenger/(.*)",
      "dest": "/index.html"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 3.3 Update Build Scripts
Update `package.json`:

```json
{
  "scripts": {
    "build": "npm run build:passenger && npm run build:admin && npm run build:owner && npm run build:driver",
    "build:passenger": "vite build",
    "build:admin": "vite build --config vite.config.admin.js",
    "build:owner": "vite build --config vite.config.owner.js",
    "build:driver": "vite build --config vite.config.driver.js",
    "vercel-build": "npm run build"
  }
}
```

### 3.4 Deploy to Vercel
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import your repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `dist`
   - **Environment Variables**: Add production API URL

---

## 🌍 Step 4: Domain Configuration

### 4.1 Configure Subdomains on Vercel
1. In Vercel dashboard, go to your project
2. Go to "Settings" → "Domains"
3. Add custom domains:
   - `nxtbus.in` (main passenger app)
   - `admin.nxtbus.in`
   - `owner.nxtbus.in`
   - `driver.nxtbus.in`

### 4.2 DNS Configuration
In your domain registrar (where you bought nxtbus.in):

```
Type    Name     Value
CNAME   @        cname.vercel-dns.com
CNAME   admin    cname.vercel-dns.com
CNAME   owner    cname.vercel-dns.com
CNAME   driver   cname.vercel-dns.com
```

---

## 📱 Step 5: Mobile App Updates

### 5.1 Update Capacitor Configuration
Update `capacitor.config.json`:

```json
{
  "appId": "com.nxtbus.passenger",
  "appName": "NxtBus",
  "webDir": "dist",
  "server": {
    "url": "https://nxtbus.in",
    "cleartext": true
  }
}
```

### 5.2 Update API URLs for Mobile
Update `src/services/apiService.js`:

```javascript
const getHost = () => {
  // Mobile app: use production API
  if (window.Capacitor?.isNativePlatform()) {
    return 'nxtbus-backend.onrender.com';
  }
  
  // Web app: use relative URLs (handled by Vercel proxy)
  if (process.env.NODE_ENV === 'production') {
    return 'nxtbus-backend.onrender.com';
  }
  
  // Development
  return 'localhost';
};
```

---

## 🔧 Step 6: Data Migration

### 6.1 Create Migration Script
Create `server/scripts/migrate-to-postgres.js`:

```javascript
const fs = require('fs');
const path = require('path');
const db = require('../services/databaseService');

async function migrateData() {
  console.log('🔄 Starting data migration...');
  
  try {
    // Migrate buses
    const buses = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/buses.json')));
    for (const bus of buses) {
      await db.addBus(bus);
    }
    console.log(`✅ Migrated ${buses.length} buses`);
    
    // Migrate routes
    const routes = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/routes.json')));
    for (const route of routes) {
      await db.query(
        'INSERT INTO routes (id, name, start_point, end_point, start_lat, start_lon, end_lat, end_lon, estimated_duration, distance, fare, stops) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        [route.id, route.name, route.startPoint, route.endPoint, route.startLat, route.startLon, route.endLat, route.endLon, route.estimatedDuration, route.distance, route.fare, JSON.stringify(route.stops)]
      );
    }
    console.log(`✅ Migrated ${routes.length} routes`);
    
    // Continue for other data types...
    
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrateData();
```

---

## 🚀 Step 7: Deployment Checklist

### 7.1 Pre-deployment
- [ ] Database schema created in Neon
- [ ] Environment variables configured
- [ ] API endpoints updated for production
- [ ] CORS configured for all domains
- [ ] Build scripts working locally

### 7.2 Deploy Backend (Render)
- [ ] Repository connected to Render
- [ ] Environment variables set
- [ ] Build and start commands configured
- [ ] Database connection tested

### 7.3 Deploy Frontend (Vercel)
- [ ] Repository connected to Vercel
- [ ] Build configuration set
- [ ] Custom domains added
- [ ] DNS records configured

### 7.4 Post-deployment Testing
- [ ] All subdomains accessible
- [ ] API endpoints responding
- [ ] Database queries working
- [ ] Mobile apps connecting
- [ ] Real-time features working

---

## 💰 Cost Breakdown

### Free Tiers
- **Vercel**: Unlimited projects, 100GB bandwidth
- **Render**: 750 hours/month (enough for 24/7 uptime)
- **Neon**: 512MB database, 1 million queries/month

### Upgrade Paths (if needed)
- **Vercel Pro**: $20/month (more bandwidth, analytics)
- **Render Starter**: $7/month (always-on, more resources)
- **Neon Scale**: $19/month (3GB database, unlimited queries)

---

## 🔧 Next Steps

1. **Set up Neon database** and run schema creation
2. **Deploy backend to Render** with database connection
3. **Deploy frontend to Vercel** with production API URLs
4. **Configure custom domains** and DNS
5. **Test all functionality** in production
6. **Update mobile apps** with production URLs

Would you like me to help you with any specific step in this deployment process?