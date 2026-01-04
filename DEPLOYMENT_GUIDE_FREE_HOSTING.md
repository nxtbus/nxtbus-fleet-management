# NxtBus Free Deployment Guide
## Deploy to Production with Free Hosting

---

## 🎯 Deployment Architecture

```
nxtbus.in (User App) → Vercel
├── admin.nxtbus.in (Admin) → Vercel
├── owner.nxtbus.in (Owner) → Vercel  
├── driver.nxtbus.in (Driver) → Vercel
└── api.nxtbus.in (Backend) → Railway
    └── Database → MongoDB Atlas (Free)
```

---

## 📋 Pre-Deployment Checklist

### 1. **Code Preparation**
- [ ] All features tested locally
- [ ] Environment variables configured
- [ ] Production builds working
- [ ] Database migration ready

### 2. **Account Setup**
- [ ] GitHub repository ready
- [ ] Vercel account created
- [ ] Railway account created
- [ ] MongoDB Atlas account created
- [ ] Domain DNS access (nxtbus.in)

---

## 🗄️ Step 1: Database Setup (MongoDB Atlas)

### Create Free MongoDB Cluster
1. **Sign up**: Go to [mongodb.com/atlas](https://mongodb.com/atlas)
2. **Create Cluster**: Choose "Free Shared" cluster
3. **Configure**:
   - Cloud Provider: AWS
   - Region: Choose closest to your users
   - Cluster Name: `nxtbus-cluster`

### Setup Database Access
1. **Database User**:
   ```
   Username: nxtbus-admin
   Password: [Generate strong password]
   Role: Atlas Admin
   ```

2. **Network Access**:
   ```
   IP Address: 0.0.0.0/0 (Allow from anywhere)
   Description: Production access
   ```

3. **Get Connection String**:
   ```
   mongodb+srv://nxtbus-admin:<password>@nxtbus-cluster.xxxxx.mongodb.net/nxtbus?retryWrites=true&w=majority
   ```

### Create Database Schema
```javascript
// Collections to create:
- admins
- owners  
- buses
- routes
- drivers
- activeTrips
- delays
- notifications
- feedbacks
- schedules
- callAlerts
```

---

## 🖥️ Step 2: Backend Deployment (Railway)

### Deploy Node.js Server
1. **Connect Repository**:
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your NxtBus repository

2. **Configure Deployment**:
   - Root Directory: `/server`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Environment Variables**:
   ```bash
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://nxtbus-admin:<password>@nxtbus-cluster.xxxxx.mongodb.net/nxtbus
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=24h
   PORT=3001
   HOST=0.0.0.0
   CORS_ORIGIN=https://nxtbus.in,https://admin.nxtbus.in,https://owner.nxtbus.in,https://driver.nxtbus.in
   ENABLE_RATE_LIMITING=true
   ENABLE_SECURITY_HEADERS=true
   ENABLE_COMPRESSION=true
   ```

4. **Custom Domain**:
   - In Railway dashboard, go to Settings
   - Add custom domain: `api.nxtbus.in`
   - Update your domain DNS with provided CNAME

---

## 🌐 Step 3: Frontend Deployment (Vercel)

### Deploy Each App Separately

#### 3.1 User App (Main Website)
1. **Create New Project**:
   - Go to [vercel.com](https://vercel.com)
   - Import from GitHub
   - Select your repository

2. **Configure Build**:
   ```bash
   Framework Preset: Vite
   Root Directory: /
   Build Command: npm run build:user
   Output Directory: dist-user
   Install Command: npm install
   ```

3. **Environment Variables**:
   ```bash
   VITE_API_URL=https://api.nxtbus.in
   VITE_WS_URL=wss://api.nxtbus.in
   VITE_APP_NAME=NxtBus
   NODE_ENV=production
   ```

4. **Custom Domain**: `nxtbus.in` and `www.nxtbus.in`

#### 3.2 Admin App
1. **Create New Project** (repeat process)
2. **Configure Build**:
   ```bash
   Build Command: npm run build:admin
   Output Directory: dist-admin
   ```
3. **Custom Domain**: `admin.nxtbus.in`

#### 3.3 Owner App
1. **Create New Project**
2. **Configure Build**:
   ```bash
   Build Command: npm run build:owner
   Output Directory: dist-owner
   ```
3. **Custom Domain**: `owner.nxtbus.in`

#### 3.4 Driver App
1. **Create New Project**
2. **Configure Build**:
   ```bash
   Build Command: npm run build:driver
   Output Directory: dist-driver
   ```
3. **Custom Domain**: `driver.nxtbus.in`

---

## 🔧 Step 4: Code Modifications for Production

### 4.1 Update Package.json Build Scripts
```json
{
  "scripts": {
    "build:user": "vite build --config vite.config.js",
    "build:admin": "vite build --config vite.config.admin.js", 
    "build:owner": "vite build --config vite.config.owner.js",
    "build:driver": "vite.config.driver.js",
    "preview:user": "vite preview --config vite.config.js",
    "preview:admin": "vite preview --config vite.config.admin.js",
    "preview:owner": "vite preview --config vite.config.owner.js",
    "preview:driver": "vite preview --config vite.config.driver.js"
  }
}
```

### 4.2 Create MongoDB Data Service
```javascript
// server/services/mongoService.js
const { MongoClient } = require('mongodb');

class MongoService {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    this.client = new MongoClient(process.env.MONGODB_URI);
    await this.client.connect();
    this.db = this.client.db('nxtbus');
    console.log('✅ Connected to MongoDB Atlas');
  }

  async getCollection(name) {
    if (!this.db) await this.connect();
    return this.db.collection(name);
  }

  // Replace file-based operations
  async readData(collection) {
    const coll = await this.getCollection(collection);
    return await coll.find({}).toArray();
  }

  async writeData(collection, data) {
    const coll = await this.getCollection(collection);
    await coll.deleteMany({}); // Clear existing
    await coll.insertMany(data);
    return true;
  }

  async insertOne(collection, document) {
    const coll = await this.getCollection(collection);
    const result = await coll.insertOne(document);
    return result.insertedId;
  }

  async updateOne(collection, filter, update) {
    const coll = await this.getCollection(collection);
    return await coll.updateOne(filter, { $set: update });
  }

  async deleteOne(collection, filter) {
    const coll = await this.getCollection(collection);
    return await coll.deleteOne(filter);
  }
}

module.exports = new MongoService();
```

### 4.3 Update Server to Use MongoDB
```javascript
// Replace file operations in server/index.js
const mongoService = require('./services/mongoService');

// Replace readData function
function readData(collection) {
  return mongoService.readData(collection);
}

// Replace writeData function  
function writeData(collection, data) {
  return mongoService.writeData(collection, data);
}
```

---

## 🌍 Step 5: Domain Configuration

### DNS Settings for nxtbus.in
```bash
# A Records
@ → [Vercel IP for main site]
www → [Vercel IP for main site]

# CNAME Records  
admin → cname.vercel-dns.com
owner → cname.vercel-dns.com
driver → cname.vercel-dns.com
api → [Railway provided domain]
```

### SSL Certificates
- Vercel: Automatic SSL for all subdomains
- Railway: Automatic SSL for API domain
- All connections will be HTTPS

---

## 📱 Step 6: Mobile App Deployment

### Android APK Distribution
1. **Build APKs**:
   ```bash
   npm run build:android:driver
   npm run build:android:owner
   ```

2. **Distribution Options**:
   - **Direct Download**: Host APKs on your website
   - **Google Play Store**: Submit for review (requires developer account)
   - **Alternative Stores**: F-Droid, Amazon Appstore

### iOS App Distribution  
1. **Build iOS Apps**:
   ```bash
   npm run build:ios:driver
   npm run build:ios:owner
   ```

2. **Distribution**:
   - **App Store**: Submit for review (requires Apple Developer account)
   - **TestFlight**: Beta testing distribution

---

## 🔍 Step 7: Testing & Monitoring

### Production Testing Checklist
- [ ] All subdomains accessible
- [ ] API endpoints responding
- [ ] WebSocket connections working
- [ ] Database operations successful
- [ ] Mobile apps connecting to production API
- [ ] GPS tracking functional
- [ ] Real-time updates working

### Monitoring Setup
1. **Uptime Monitoring**: Use UptimeRobot (free)
2. **Error Tracking**: Use Sentry (free tier)
3. **Analytics**: Use Google Analytics (free)
4. **Performance**: Use Vercel Analytics (free)

---

## 💰 Cost Breakdown (All Free!)

| Service | Free Tier Limits | Cost |
|---------|------------------|------|
| **Vercel** | Unlimited personal projects | $0 |
| **Railway** | 500 hours/month, $5 credit | $0 |
| **MongoDB Atlas** | 512MB storage | $0 |
| **Domain** | You already own nxtbus.in | $0 |
| **SSL Certificates** | Automatic with hosting | $0 |
| **Total Monthly** | | **$0** |

---

## 🚀 Deployment Commands

### Quick Deployment Script
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Deploying NxtBus to Production..."

# Build all apps
echo "📦 Building applications..."
npm run build:user
npm run build:admin  
npm run build:owner
npm run build:driver

# Deploy to Vercel (if using Vercel CLI)
echo "🌐 Deploying to Vercel..."
vercel --prod

# Deploy server to Railway (auto-deploys on git push)
echo "🖥️ Pushing server to Railway..."
git add .
git commit -m "Production deployment"
git push origin main

echo "✅ Deployment complete!"
echo "🌍 Visit: https://nxtbus.in"
```

---

## 🔧 Post-Deployment Tasks

### 1. **Initialize Database**
- Run data migration script
- Create default admin user
- Set up initial routes and schedules

### 2. **Configure Monitoring**
- Set up uptime monitoring
- Configure error alerts
- Enable performance tracking

### 3. **Security Hardening**
- Review security headers
- Test rate limiting
- Verify CORS settings
- Check authentication flows

### 4. **Performance Optimization**
- Enable CDN caching
- Optimize images
- Minimize bundle sizes
- Configure compression

---

## 📞 Support & Maintenance

### Regular Tasks
- [ ] Monitor uptime and performance
- [ ] Review error logs weekly
- [ ] Update dependencies monthly
- [ ] Backup database regularly
- [ ] Monitor free tier usage limits

### Scaling Considerations
When you outgrow free tiers:
- **Vercel Pro**: $20/month for team features
- **Railway Pro**: $5/month for more resources  
- **MongoDB Atlas**: $9/month for dedicated cluster
- **CDN**: Cloudflare Pro for better performance

---

**🎉 Your NxtBus system will be live at:**
- **Main Site**: https://nxtbus.in
- **Admin Panel**: https://admin.nxtbus.in
- **Owner Dashboard**: https://owner.nxtbus.in  
- **Driver App**: https://driver.nxtbus.in
- **API Server**: https://api.nxtbus.in

**Total Setup Time**: 2-3 hours  
**Monthly Cost**: $0 (Free tier limits should handle initial traffic)