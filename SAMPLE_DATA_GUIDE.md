# 🚌 NxtBus - Complete Sample Data Guide

## 📋 Overview
This document describes all the sample data that has been created for the NxtBus system to provide a realistic testing environment.

---

## 🚌 **BUSES DATA**

### **Owner 1 (OWN001 - Sharma Transport)**
- **BUS001**: KA-20-MG-1001 (AC, 40 seats, Tata Starbus 2023)
- **BUS002**: KA-20-MG-1002 (Non-AC, 50 seats, Ashok Leyland Viking 2022)

### **Owner 2 (OWN002 - Patel Bus Services)**
- **BUS003**: KA-20-MG-1003 (AC, 40 seats, Tata Starbus 2023) - *Under Maintenance*
- **BUS004**: KA-20-MG-1004 (Electric, 35 seats, Tata Ultra Electric 2024)

### **Unassigned**
- **BUS005**: KA-20-MG-1005 (Diesel, 45 seats, Mahindra Tourister 2021) - *Inactive*

---

## 🛣️ **ROUTES DATA**

### **ROUTE001: Central Station → Airport Terminal**
- **Distance**: 35.2 km | **Duration**: 90 minutes | **Fare**: ₹45
- **Stops**: Central Station → MG Road → Indiranagar → Whitefield → Airport Terminal

### **ROUTE002: Electronic City → Koramangala**
- **Distance**: 28.5 km | **Duration**: 75 minutes | **Fare**: ₹35
- **Stops**: Electronic City → Bommanahalli → BTM Layout → Koramangala

### **ROUTE003: Hebbal → Silk Board**
- **Distance**: 32.8 km | **Duration**: 85 minutes | **Fare**: ₹40
- **Stops**: Hebbal → RT Nagar → Cantonment → Shivajinagar → Silk Board

---

## 📅 **SCHEDULES DATA**

### **Daily Schedules**
- **Morning Rush**: 06:00-10:00 (Multiple trips on all routes)
- **Evening Rush**: 16:00-19:00 (Peak hour services)
- **Regular Service**: Throughout the day

### **Schedule Types**
- **Regular**: Standard daily service
- **Peak Hour**: High-frequency during rush hours
- **Express**: Faster service with limited stops

---

## 🚍 **ACTIVE TRIPS DATA**

### **Currently Running Trips**
1. **TRIP001**: BUS001 on ROUTE001 (35% complete, at MG Road)
2. **TRIP002**: BUS002 on ROUTE002 (25% complete, at Bommanahalli)
3. **TRIP003**: BUS004 on ROUTE003 (20% complete, at RT Nagar)

### **Real-time Features**
- **GPS Tracking**: Live location updates
- **Speed Monitoring**: Current, max, and average speeds
- **Progress Tracking**: Trip completion percentage
- **ETA Calculations**: Estimated arrival times

---

## ⚠️ **DELAYS DATA**

### **Active Delays**
1. **DEL001**: BUS001 - 15 min delay due to heavy traffic at MG Road
2. **DEL003**: BUS004 - 5 min delay due to road construction at RT Nagar

### **Resolved Delays**
1. **DEL002**: BUS002 - 8 min delay resolved (passenger boarding issue)

---

## 📢 **NOTIFICATIONS DATA**

### **Service Updates**
- Route delays and traffic alerts
- New service announcements
- Maintenance schedules

### **Performance Alerts**
- Driver performance notifications
- System status updates
- Emergency broadcasts

---

## 💬 **FEEDBACK DATA**

### **Recent Feedback**
1. **5-star**: Excellent punctuality (KA-20-MG-1001)
2. **3-star**: Good service, AC needs improvement (KA-20-MG-1002)
3. **4-star**: Great electric bus experience (KA-20-MG-1004)
4. **2-star**: Late arrival complaint (KA-20-MG-1001)

### **Feedback Categories**
- Punctuality
- Cleanliness
- Driver Behavior
- Vehicle Condition
- Overall Experience

---

## 📞 **CALL ALERTS DATA**

### **Active Call Alerts**
1. **CALL001**: Driver Rajesh Kumar (incoming call, unacknowledged)
2. **CALL002**: Driver Suresh Patel (outgoing call, acknowledged)

---

## 🔐 **LOGIN CREDENTIALS**

### **Admin**
- Username: `admin`
- Password: `admin123`

### **Owners**
- **Sharma Transport**: Phone `9876500001`, PIN `1234`
- **Patel Bus Services**: Phone `9876500002`, PIN `5678`

### **Drivers**
- **Rajesh Kumar**: Phone `9876543210`, PIN `1234`
- **Suresh Patel**: Phone `9876543211`, PIN `5678`
- **Amit Singh**: Phone `9876543212`, PIN `9012`

---

## 🎯 **TESTING SCENARIOS**

### **Owner Dashboard Testing**
1. **Login as OWN001** to see:
   - 2 active buses (BUS001, BUS002)
   - 2 active trips with real-time tracking
   - 1 active delay alert
   - Recent feedback and performance data

2. **Login as OWN002** to see:
   - 2 buses (1 active, 1 under maintenance)
   - 1 active trip (electric bus)
   - Road construction delay
   - Positive feedback for electric service

### **Driver App Testing**
1. **Login as DRV001** to see:
   - Currently on active trip (TRIP001)
   - Real-time GPS tracking
   - Traffic delay notification
   - Call alert system

2. **Login as DRV002** to see:
   - Active trip with passenger boarding resolved
   - Performance feedback
   - Schedule management

### **Admin Portal Testing**
1. **Login as admin** to see:
   - Complete fleet overview (5 buses)
   - All active trips and delays
   - System-wide notifications
   - Comprehensive feedback management
   - Call alerts monitoring

---

## 📱 **Real-time Features**

### **Live Data Updates**
- GPS coordinates update every 30 seconds
- Speed monitoring with overspeed alerts
- Automatic delay detection
- Real-time passenger feedback

### **WebSocket Integration**
- Live fleet tracking
- Instant notifications
- Real-time call alerts
- Emergency broadcasts

---

## 🚀 **Getting Started**

1. **Start the server**: `cd server && npm start`
2. **Start owner app**: `npx vite --config vite.config.owner.js --port 5174`
3. **Access main app**: `http://localhost:5173`
4. **Use any credentials above** to login and explore

---

## 📊 **Data Statistics**

- **5 Buses** (3 active, 1 maintenance, 1 inactive)
- **3 Routes** with detailed stop information
- **6 Schedules** covering peak and regular hours
- **3 Active Trips** with real-time GPS data
- **3 Delay Records** (1 active, 2 resolved)
- **4 Notifications** (service updates, announcements)
- **4 Feedback Entries** (ratings 2-5 stars)
- **2 Call Alerts** (1 active, 1 acknowledged)

---

**Last Updated**: January 4, 2026  
**Data Version**: v2.0.0 - Production Ready Sample Data