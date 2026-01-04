# 🚌 NxtBus - Complete Credentials Guide

## 📋 Overview
This document contains all the real credentials for accessing different sides of the NxtBus system.

---

## 🔐 **ADMIN CREDENTIALS**

### **Admin Portal Access**
- **URL**: `http://localhost:5173/admin` (or your deployed admin URL)
- **Username**: `admin`
- **Password**: `admin123`

### **Admin Details**
- **ID**: ADM001
- **Name**: System Administrator
- **Email**: admin@nxtbus.com
- **Role**: admin
- **Status**: active

---

## 🏢 **OWNER CREDENTIALS**

### **Owner 1 - Sharma Transport**
- **URL**: `http://localhost:5174` (or your deployed owner URL)
- **Phone**: `9876500001`
- **PIN**: `1234`

**Details:**
- **ID**: OWN001
- **Name**: Sharma Transport
- **Email**: sharma@transport.com
- **Address**: Bangalore
- **Status**: active

### **Owner 2 - Patel Bus Services**
- **URL**: `http://localhost:5174` (or your deployed owner URL)
- **Phone**: `9876500002`
- **PIN**: `5678`

**Details:**
- **ID**: OWN002
- **Name**: Patel Bus Services
- **Email**: patel@busservices.com
- **Address**: Mangalore
- **Status**: active

---

## 🚗 **DRIVER CREDENTIALS**

### **Driver 1 - Rajesh Kumar**
- **URL**: Driver mobile app or `http://localhost:5173/driver`
- **Phone**: `9876543210`
- **PIN**: `1234`

**Details:**
- **ID**: DRV001
- **Name**: Rajesh Kumar
- **Status**: active
- **Assigned Buses**: BUS001, BUS002

### **Driver 2 - Suresh Patel**
- **URL**: Driver mobile app or `http://localhost:5173/driver`
- **Phone**: `9876543211`
- **PIN**: `5678`

**Details:**
- **ID**: DRV002
- **Name**: Suresh Patel
- **Status**: active
- **Assigned Buses**: BUS003, BUS004

### **Driver 3 - Amit Singh**
- **URL**: Driver mobile app or `http://localhost:5173/driver`
- **Phone**: `9876543212`
- **PIN**: `9012`

**Details:**
- **ID**: DRV003
- **Name**: Amit Singh
- **Status**: active
- **Assigned Buses**: BUS001, BUS005

---

## 👥 **PASSENGER/USER ACCESS**

### **Public Access (No Authentication Required)**
- **URL**: `http://localhost:5173/passenger` or `http://localhost:5173/`
- **Features Available**:
  - Route Search
  - Bus Tracking
  - Feedback Submission
  - Service Alerts
  - Multi-language Support (English, Kannada, Hindi)

**Note**: Passengers don't need to login - it's a public service for route information and feedback.

---

## 🌐 **ACCESS URLS**

### **Development URLs**
- **App Switcher**: `http://localhost:5173/`
- **Passenger App**: `http://localhost:5173/passenger`
- **Driver App**: `http://localhost:5173/driver`
- **Admin App**: `http://localhost:5173/admin`
- **Owner App**: `http://localhost:5174` (separate port)

### **Production URLs** (when deployed)
- **Main App**: `https://nxtbus.in`
- **Admin Portal**: `https://admin.nxtbus.in`
- **Owner Portal**: `https://owner.nxtbus.in`
- **Driver Portal**: `https://driver.nxtbus.in`

---

## 🔧 **API Endpoints**

### **Server Base URL**
- **Local Development**: `http://localhost:3001/api`
- **Production**: `https://api.nxtbus.in` (when deployed)

### **Authentication Endpoints**
- **Admin Login**: `POST /api/auth/admin/login`
- **Owner Login**: `POST /api/auth/owner/login`
- **Driver Login**: `POST /api/auth/driver/login`

---

## 📱 **Mobile App Credentials**

### **Android APK Files**
- **Driver APK**: `nxtbus-driver-debug-working-final.apk`
- **Owner APK**: `nxtbus-owner-debug-final-fix.apk`

**Use the same credentials as listed above for the respective roles.**

---

## 🛠️ **Testing Credentials**

### **Quick Test Credentials**
For quick testing, use these most common credentials:

**Admin**: `admin` / `admin123`
**Owner**: `9876500001` / `1234`
**Driver**: `9876543210` / `1234`

---

## 🔒 **Security Notes**

1. **Password Hashing**: All passwords and PINs are stored using bcrypt with 10 salt rounds
2. **JWT Tokens**: Sessions use JWT tokens with 24-hour expiration
3. **Rate Limiting**: API endpoints have rate limiting enabled
4. **CORS**: Configured for localhost development and production domains

---

## 📞 **Support Information**

If you encounter login issues:
1. Check that the server is running on port 3001
2. Verify CORS configuration includes your domain
3. Check browser console for detailed error messages
4. Ensure credentials match exactly (case-sensitive)

---

**Last Updated**: January 4, 2026
**System Version**: NxtBus v2.0.0 - Production Ready