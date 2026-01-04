# 🚀 NxtBus Production Deployment Checklist

## Pre-Deployment Setup ✅

### 1. Database Setup (Neon PostgreSQL)
- [ ] Create Neon account at https://neon.tech
- [ ] Create new project: "nxtbus-production"
- [ ] Copy connection string from Neon dashboard
- [ ] Update `server/.env.production` with DATABASE_URL
- [ ] Run migration script: `cd server && node scripts/migrate-to-postgres.js`

### 2. Backend Setup (Render)
- [ ] Create Render account at https://render.com
- [ ] Connect GitHub repository
- [ ] Create new "Web Service"
- [ ] Configure service settings:
  - **Name**: nxtbus-backend
  - **Environment**: Node
  - **Build Command**: `cd server && npm install`
  - **Start Command**: `cd server && npm start`
  - **Auto-Deploy**: Yes

### 3. Environment Variables (Render)
Add these environment variables in Render dashboard:

```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/nxtbusdb?sslmode=require
JWT_SECRET=your-super-secure-production-jwt-secret-256-bits-long
CORS_ORIGIN=https://nxtbus.vercel.app,https://admin.nxtbus.in,https://owner.nxtbus.in,https://driver.nxtbus.in,https://nxtbus.in
RATE_LIMIT_MAX_REQUESTS=1000
ENABLE_RATE_LIMITING=true
LOG_LEVEL=info
```

### 4. Frontend Setup (Vercel)
- [ ] Create Vercel account at https://vercel.com
- [ ] Import GitHub repository
- [ ] Configure build settings:
  - **Framework Preset**: Vite
  - **Build Command**: `npm run vercel-build`
  - **Output Directory**: `dist`
  - **Install Command**: `npm install`

### 5. Domain Configuration
- [ ] Add custom domains in Vercel:
  - `nxtbus.in` (main passenger app)
  - `admin.nxtbus.in`
  - `owner.nxtbus.in`
  - `driver.nxtbus.in`

### 6. DNS Configuration
Update DNS records at your domain registrar:

```
Type    Name     Value
CNAME   @        cname.vercel-dns.com
CNAME   admin    cname.vercel-dns.com
CNAME   owner    cname.vercel-dns.com
CNAME   driver   cname.vercel-dns.com
```

---

## Deployment Steps 🚀

### Step 1: Database Migration
```bash
# Set up environment
cd server
cp .env.production .env

# Install dependencies
npm install

# Run migration
node scripts/migrate-to-postgres.js
```

### Step 2: Deploy Backend
1. Push code to GitHub
2. Go to Render dashboard
3. Create new Web Service
4. Connect repository
5. Add environment variables
6. Deploy

### Step 3: Update Frontend API URLs
1. Verify backend URL: `https://nxtbus-backend.onrender.com`
2. Test API endpoints
3. Update `src/services/apiService.js` if needed

### Step 4: Deploy Frontend
1. Push updated code to GitHub
2. Go to Vercel dashboard
3. Import repository
4. Configure build settings
5. Deploy

### Step 5: Configure Custom Domains
1. Add domains in Vercel
2. Update DNS records
3. Wait for SSL certificates

---

## Testing Checklist 🧪

### Backend Testing
- [ ] API health check: `https://nxtbus-backend.onrender.com/api/health`
- [ ] Database connection working
- [ ] All endpoints responding
- [ ] CORS headers correct
- [ ] Rate limiting active

### Frontend Testing
- [ ] Main app: `https://nxtbus.in`
- [ ] Admin app: `https://admin.nxtbus.in`
- [ ] Owner app: `https://owner.nxtbus.in`
- [ ] Driver app: `https://driver.nxtbus.in`
- [ ] All routes working
- [ ] API calls successful
- [ ] Real-time features working

### Mobile App Testing
- [ ] Update Capacitor config with production URLs
- [ ] Build and test Android APKs
- [ ] Verify API connectivity from mobile
- [ ] Test GPS and real-time features

---

## Post-Deployment Configuration 🔧

### 1. Update Mobile Apps
```json
// capacitor.config.json
{
  "server": {
    "url": "https://nxtbus.in"
  }
}
```

### 2. Monitor Performance
- [ ] Set up error monitoring (optional)
- [ ] Monitor API response times
- [ ] Check database performance
- [ ] Monitor bandwidth usage

### 3. Security Checklist
- [ ] HTTPS enabled on all domains
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] JWT secrets secure
- [ ] Database access restricted

---

## Troubleshooting 🔧

### Common Issues

**Backend not starting:**
- Check environment variables
- Verify database connection string
- Check Render logs

**Frontend build failing:**
- Verify build command: `npm run vercel-build`
- Check for missing dependencies
- Review Vercel build logs

**API calls failing:**
- Check CORS configuration
- Verify backend URL in frontend
- Test API endpoints directly

**Database connection issues:**
- Verify Neon connection string
- Check SSL configuration
- Test connection locally first

---

## Cost Monitoring 💰

### Free Tier Limits
- **Vercel**: 100GB bandwidth/month
- **Render**: 750 hours/month (31 days = 744 hours)
- **Neon**: 512MB storage, 1M queries/month

### Upgrade Triggers
- **Vercel**: Bandwidth exceeded
- **Render**: Need always-on service
- **Neon**: Storage or query limits exceeded

---

## Backup Strategy 💾

### Database Backups
- Neon provides automatic backups
- Consider periodic data exports
- Test restore procedures

### Code Backups
- GitHub repository (primary)
- Local development environment
- Consider multiple branches for stability

---

## Support Resources 📚

### Documentation
- **Vercel**: https://vercel.com/docs
- **Render**: https://render.com/docs
- **Neon**: https://neon.tech/docs

### Community
- **Vercel Discord**: https://vercel.com/discord
- **Render Community**: https://community.render.com
- **Neon Discord**: https://discord.gg/neon

---

## Success Criteria ✅

Deployment is successful when:
- [ ] All 4 domains are accessible
- [ ] API endpoints respond correctly
- [ ] Database queries work
- [ ] Real-time features function
- [ ] Mobile apps connect properly
- [ ] No critical errors in logs

**Estimated Deployment Time**: 2-3 hours
**Monthly Cost**: $0 (using free tiers)
**Scalability**: Can handle 1000+ concurrent users