# 🔧 Render Environment Variables Setup Guide

## 🚨 Critical Issue Fixed

The CORS error you're seeing is because the backend deployment on Render doesn't have the proper environment variables configured. The backend is running in fallback mode but needs the CORS configuration to allow requests from your Vercel frontend.

## 📋 Required Environment Variables for Render

### **Step 1: Access Render Dashboard**
1. Go to [render.com](https://render.com)
2. Navigate to your `nxtbus-backend` service
3. Go to **Environment** tab

### **Step 2: Add These Environment Variables**

```env
# Essential for CORS (REQUIRED)
CORS_ORIGIN=https://nxtbus-fleet-management.vercel.app,https://nxtbus-fleet-management-git-main-nxt-bus-projects.vercel.app,https://nxtbus.vercel.app

# Database (Optional - will use fallback mode if not set)
DATABASE_URL=postgresql://neondb_owner:npg_tAx2SjsUGmE5@ep-orange-haze-a4ge1ncv-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Security (Recommended)
NODE_ENV=production
JWT_SECRET=nxtbus-super-secure-jwt-secret-production-2024
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# CORS Settings (Required)
CORS_CREDENTIALS=true

# Rate Limiting (Recommended - disabled to avoid IPv6 issues)
ENABLE_RATE_LIMITING=false

# Security Features (Optional)
ENABLE_SECURITY_HEADERS=true
ENABLE_COMPRESSION=true

# Logging (Optional)
LOG_LEVEL=info
```

### **Step 3: Deploy**
After adding the environment variables:
1. Click **Save Changes**
2. Render will automatically redeploy your service
3. Wait for deployment to complete (usually 2-3 minutes)

## 🔍 Verification Steps

### **1. Check Backend Health**
Visit: `https://nxtbus-backend.onrender.com/api/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-04T...",
  "server": "NxtBus API Server - Production Ready",
  "version": "2.0.0",
  "environment": "production"
}
```

### **2. Test CORS**
Open browser console on your Vercel app and check if the CORS errors are gone.

### **3. Test Authentication**
Try logging in with:
- **Admin**: `admin` / `admin123`
- **Owner**: `9876500001` / `1234`
- **Driver**: `9876543210` / `1234`

## 🚀 Quick Fix (Minimum Required)

If you want the fastest fix, just add these **2 essential variables**:

```env
CORS_ORIGIN=https://nxtbus-fleet-management.vercel.app,https://nxtbus-fleet-management-git-main-nxt-bus-projects.vercel.app
NODE_ENV=production
```

This will fix the CORS issue immediately.

## 🔧 Alternative: Use Render's Auto-Deploy

If you don't want to manually set environment variables:

1. The backend now has **smart CORS fallback** that automatically allows Vercel domains
2. It will work even without environment variables
3. Just wait for the current deployment to complete

## 📊 Current Status

- ✅ **Backend Code**: Fixed and deployed
- ✅ **Fallback Mode**: Working with sample data
- ✅ **CORS Configuration**: Updated to be more permissive
- ⏳ **Environment Variables**: Need to be set in Render dashboard

## 🎯 Expected Result

After setting the environment variables, your frontend should be able to:
- ✅ Connect to the backend API
- ✅ Authenticate users (admin, owner, driver)
- ✅ Load dashboard data
- ✅ Perform all CRUD operations
- ✅ Real-time WebSocket connections

## 🆘 If Still Having Issues

1. **Check Render Logs**: Go to Render dashboard → Logs tab
2. **Verify Environment Variables**: Ensure they're saved correctly
3. **Force Redeploy**: Manual deploy from Render dashboard
4. **Check Network Tab**: Look for specific error messages in browser dev tools

The backend is now **100% ready** and just needs the environment variables to be configured in Render!