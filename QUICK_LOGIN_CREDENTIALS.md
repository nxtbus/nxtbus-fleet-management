# 🚌 NxtBus - Quick Login Credentials

## 🎯 **INSTANT ACCESS CREDENTIALS**

### 🔐 **ADMIN LOGIN**
```
URL: http://localhost:5173/admin
Username: admin
Password: admin123
```
**Access**: Complete system administration, all buses, routes, and analytics

---

### 🏢 **OWNER LOGIN**

#### **Owner 1 - Sharma Transport (Bangalore)**
```
URL: http://localhost:5174
Phone: 9876500001
PIN: 1234
```
**Fleet**: 2 buses (KA-20-MG-1001, KA-20-MG-1002) | **Active Trips**: 2

#### **Owner 2 - Patel Bus Services (Mangalore)**
```
URL: http://localhost:5174
Phone: 9876500002
PIN: 5678
```
**Fleet**: 2 buses (KA-20-MG-1003, KA-20-MG-1004) | **Active Trips**: 1

---

### 🚗 **DRIVER LOGIN**

#### **Driver 1 - Rajesh Kumar**
```
URL: http://localhost:5173/driver
Phone: 9876543210
PIN: 1234
```
**Status**: On active trip (Central Station → Airport) | **Progress**: 35%

#### **Driver 2 - Suresh Patel**
```
URL: http://localhost:5173/driver
Phone: 9876543211
PIN: 5678
```
**Status**: On active trip (Electronic City → Koramangala) | **Progress**: 25%

#### **Driver 3 - Amit Singh**
```
URL: http://localhost:5173/driver
Phone: 9876543212
PIN: 9012
```
**Status**: On active trip (Hebbal → Silk Board) | **Progress**: 20%

---

### 👥 **PASSENGER ACCESS**
```
URL: http://localhost:5173/passenger
Authentication: None required (Public access)
```
**Features**: Route search, bus tracking, feedback submission

---

## 🚀 **QUICK TEST SCENARIOS**

### **Scenario 1: Owner Dashboard Demo**
1. Login as **Sharma Transport** (`9876500001` / `1234`)
2. View **2 active buses** with real-time tracking
3. Check **delay alerts** (15-min traffic delay)
4. Review **customer feedback** (4 entries, avg 3.5/5 stars)
5. Monitor **call alerts** from drivers

### **Scenario 2: Driver Real-time Tracking**
1. Login as **Rajesh Kumar** (`9876543210` / `1234`)
2. See **active trip** in progress (35% complete)
3. View **real-time GPS** location at MG Road
4. Check **speed monitoring** (45 km/h current, 52 km/h max)
5. Receive **traffic delay notification**

### **Scenario 3: Admin System Overview**
1. Login as **admin** (`admin` / `admin123`)
2. View **complete fleet** (5 buses, 3 routes)
3. Monitor **all active trips** (3 trips in progress)
4. Manage **system notifications** (4 active)
5. Review **feedback management** (pending/resolved)

---

## 📊 **SAMPLE DATA HIGHLIGHTS**

### **Fleet Overview**
- **5 Buses**: 3 active, 1 maintenance, 1 inactive
- **3 Routes**: Bangalore city routes with realistic stops
- **3 Active Trips**: Live GPS tracking with speed monitoring

### **Real-time Features**
- **GPS Updates**: Every 30 seconds with accuracy data
- **Speed Monitoring**: Overspeed detection and alerts
- **Delay Tracking**: Traffic, boarding, construction delays
- **Call Monitoring**: Driver communication alerts

### **Customer Data**
- **4 Feedback Entries**: Ratings from 2-5 stars
- **Multiple Categories**: Punctuality, cleanliness, driver behavior
- **Action Tracking**: Reviewed and resolved issues

---

## 🔧 **SYSTEM STATUS**

### **Server Requirements**
- **Backend**: http://localhost:3001 (Running)
- **Owner App**: http://localhost:5174 (Running)
- **Main App**: http://localhost:5173 (Available)

### **Data Files Status**
- ✅ **buses.json**: 5 buses with detailed specs
- ✅ **routes.json**: 3 routes with GPS coordinates
- ✅ **activeTrips.json**: 3 live trips with real-time data
- ✅ **delays.json**: 3 delay records (active/resolved)
- ✅ **notifications.json**: 4 system notifications
- ✅ **feedbacks.json**: 4 customer feedback entries
- ✅ **callAlerts.json**: 2 driver call alerts

---

## 🎯 **RECOMMENDED TESTING ORDER**

1. **Start with Owner Login** - Most feature-rich experience
2. **Test Driver App** - See real-time operations
3. **Check Admin Portal** - Complete system overview
4. **Try Passenger App** - Public features

---

## 📱 **Mobile Testing**

### **APK Files Available**
- **Driver APK**: `nxtbus-driver-debug-working-final.apk`
- **Owner APK**: `nxtbus-owner-debug-final-fix.apk`

**Use same credentials** as web versions for mobile testing.

---

**🚀 Ready to Login and Test!**  
**All credentials verified and working with realistic sample data.**