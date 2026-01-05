# Admin Dashboard Verification Guide

**Date**: January 5, 2026  
**Dashboard URL**: https://nxtbus-admin.vercel.app  
**Backend URL**: https://nxtbus-backend.onrender.com

---

## 🔐 Login Credentials

```
Username: admin
Password: admin123
```

---

## ✅ Verification Steps

### Step 1: Login
1. Open https://nxtbus-admin.vercel.app
2. Enter username: `admin`
3. Enter password: `admin123`
4. Click "Login"
5. ✅ Should redirect to dashboard

### Step 2: View Dashboard
1. Check dashboard statistics
2. Should see counts for:
   - Owners
   - Buses
   - Routes
   - Drivers
   - Active Trips
3. ✅ All numbers should load from database

### Step 3: Test Bus Management

#### CREATE (Add New Bus):
1. Click "Bus Management" in sidebar
2. Click "Add New Bus" button
3. Fill in form:
   - Bus Number: `TEST123`
   - Type: `AC`
   - Capacity: `40`
   - Model: `Test Model`
   - Year: `2024`
   - Fuel Type: `Diesel`
   - Owner: Select any owner
4. Click "Save"
5. ✅ Should see new bus in list immediately

#### READ (View Buses):
1. Stay on Bus Management page
2. ✅ Should see all buses from database
3. ✅ Should see the bus you just created

#### UPDATE (Edit Bus):
1. Find the bus you created (TEST123)
2. Click "Edit" button
3. Change status to "Maintenance"
4. Click "Save"
5. ✅ Should see status updated immediately

#### DELETE (Remove Bus):
1. Find the bus you created (TEST123)
2. Click "Delete" button
3. Confirm deletion
4. ✅ Bus should disappear from list immediately

### Step 4: Test Route Management

#### CREATE (Add New Route):
1. Click "Route Management" in sidebar
2. Click "Add New Route" button
3. Fill in form:
   - Route Name: `Test Route`
   - Start Point: `Point A`
   - End Point: `Point B`
   - Start Lat: `12.9716`
   - Start Lon: `77.5946`
   - End Lat: `13.0827`
   - End Lon: `80.2707`
   - Duration: `60` minutes
   - Distance: `25` km
   - Fare: `50` rupees
4. Click "Save"
5. ✅ Should see new route in list immediately

#### UPDATE (Edit Route):
1. Find the route you created
2. Click "Edit" button
3. Change fare to `75`
4. Click "Save"
5. ✅ Should see fare updated immediately

#### DELETE (Remove Route):
1. Find the route you created
2. Click "Delete" button
3. Confirm deletion
4. ✅ Route should disappear from list immediately

### Step 5: Test Driver Management

#### CREATE (Add New Driver):
1. Click "Driver Management" in sidebar
2. Click "Add New Driver" button
3. Fill in form:
   - Name: `Test Driver`
   - Phone: `9999999999`
   - License Number: `TEST-LIC-001`
   - PIN: `1234`
   - Experience: `5` years
4. Click "Save"
5. ✅ Should see new driver in list immediately

#### UPDATE (Edit Driver):
1. Find the driver you created
2. Click "Edit" button
3. Change status to "Inactive"
4. Click "Save"
5. ✅ Should see status updated immediately

#### DELETE (Remove Driver):
1. Find the driver you created
2. Click "Delete" button
3. Confirm deletion
4. ✅ Driver should disappear from list immediately

---

## 🔍 What to Check

### Browser Console (F12):
- ✅ No CORS errors
- ✅ No "cache-control not allowed" errors
- ✅ API calls should show 200 status
- ✅ Should see logs like:
  ```
  🌐 API Call: https://nxtbus-backend.onrender.com/api/admin/buses
  📡 API Response: 200 OK
  ✅ API Success: /admin/buses
  ```

### Network Tab (F12 → Network):
- ✅ Check request headers include:
  - `Cache-Control: no-cache, no-store, must-revalidate`
  - `Authorization: Bearer <token>`
- ✅ Check response headers include:
  - `Cache-Control: no-store, no-cache, must-revalidate`

### Database Verification:
1. After creating/updating/deleting in dashboard
2. Check Neon database directly
3. ✅ Changes should be reflected in database immediately

---

## ❌ Common Issues & Solutions

### Issue 1: CORS Error
**Error**: `Access to fetch has been blocked by CORS policy`

**Solution**: 
- Backend has been updated with cache-control headers in CORS
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)

### Issue 2: Data Not Loading
**Error**: `Backend server is not available`

**Solution**:
- Check if Render backend is running
- Visit https://nxtbus-backend.onrender.com/api
- Should see: `{"message":"NxtBus API is running"}`

### Issue 3: Changes Not Saving
**Error**: `Validation failed` or `Something went wrong`

**Solution**:
- Check browser console for specific error
- Verify all required fields are filled
- Check field formats (phone: 10 digits, etc.)

### Issue 4: Old Data Showing
**Error**: Seeing stale/cached data

**Solution**:
- Hard refresh browser (Ctrl+F5)
- Clear browser cache
- All data now comes directly from database (no caching)

---

## 🎯 Expected Behavior

### Immediate CRUD Reactions:
- ✅ **CREATE**: New item appears in list instantly
- ✅ **READ**: Always shows fresh data from database
- ✅ **UPDATE**: Changes reflect immediately
- ✅ **DELETE**: Item disappears instantly

### No Caching:
- ✅ Every page load fetches fresh data
- ✅ No localStorage for business data
- ✅ No browser cache for API responses
- ✅ Database is single source of truth

### Multi-User Consistency:
- ✅ User A creates bus → User B sees it (after refresh)
- ✅ User A updates route → User B sees update (after refresh)
- ✅ User A deletes driver → User B sees deletion (after refresh)

---

## 📊 Test Checklist

- [ ] Login successful
- [ ] Dashboard loads with statistics
- [ ] Can view all buses
- [ ] Can create new bus
- [ ] Can edit existing bus
- [ ] Can delete bus
- [ ] Can view all routes
- [ ] Can create new route
- [ ] Can edit existing route
- [ ] Can delete route
- [ ] Can view all drivers
- [ ] Can create new driver
- [ ] Can edit existing driver
- [ ] Can delete driver
- [ ] No CORS errors in console
- [ ] No caching issues
- [ ] Changes persist after refresh
- [ ] Database reflects all changes

---

## 🚀 Success Criteria

✅ All CRUD operations work  
✅ No CORS errors  
✅ No caching issues  
✅ Immediate frontend updates  
✅ Database synchronization  
✅ Multi-user consistency  

---

**Status**: ✅ **READY FOR TESTING**  
**Last Updated**: January 5, 2026

---

## 📞 Support

If you encounter any issues:
1. Check browser console (F12) for errors
2. Check Network tab for failed requests
3. Verify backend is running at https://nxtbus-backend.onrender.com/api
4. Clear browser cache and try again
5. Report specific error messages for debugging
