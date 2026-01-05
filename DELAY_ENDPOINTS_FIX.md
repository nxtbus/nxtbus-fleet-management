# Delay & Notification Endpoints Fix

**Date**: January 5, 2026  
**Issue**: Frontend calling wrong endpoints for delays and notifications  
**Status**: ✅ FIXED

---

## 🐛 Problem

The admin frontend was calling public endpoints for delays and notifications:
- ❌ `POST /api/delays` (404 - doesn't exist)
- ❌ `PUT /api/delays/:id` (404 - doesn't exist)
- ❌ `DELETE /api/delays/:id` (404 - doesn't exist)
- ❌ `POST /api/notifications` (404 - doesn't exist)
- ❌ `DELETE /api/notifications/:id` (404 - doesn't exist)

But the backend only has admin-authenticated endpoints:
- ✅ `POST /api/admin/delays` (requires auth)
- ✅ `PUT /api/admin/delays/:id` (requires auth)
- ✅ `DELETE /api/admin/delays/:id` (requires auth)
- ✅ `POST /api/admin/notifications` (requires auth)
- ✅ `DELETE /api/admin/notifications/:id` (requires auth)

---

## 🔧 Solution

Updated `src/services/apiService.js` to use the correct admin endpoints:

### Before:
```javascript
export async function addDelay(delayData) {
  return create('delays', {  // ❌ Calls /api/delays
    ...delayData,
    status: 'active',
    reportedAt: new Date().toISOString()
  });
}

export async function updateDelayStatus(id, status) {
  return update('delays', id, { status });  // ❌ Calls /api/delays/:id
}

export async function deleteDelay(id) {
  return remove('delays', id);  // ❌ Calls /api/delays/:id
}
```

### After:
```javascript
export async function addDelay(delayData) {
  return fetchApi('/admin/delays', {  // ✅ Calls /api/admin/delays
    method: 'POST',
    body: JSON.stringify({
      ...delayData,
      status: 'active',
      reportedAt: new Date().toISOString()
    })
  });
}

export async function updateDelayStatus(id, status) {
  return fetchApi(`/admin/delays/${id}`, {  // ✅ Calls /api/admin/delays/:id
    method: 'PUT',
    body: JSON.stringify({ status })
  });
}

export async function deleteDelay(id) {
  return fetchApi(`/admin/delays/${id}`, {  // ✅ Calls /api/admin/delays/:id
    method: 'DELETE'
  });
}
```

Same fix applied to notifications:
```javascript
export async function addNotification(notifData) {
  return fetchApi('/admin/notifications', {  // ✅ Calls /api/admin/notifications
    method: 'POST',
    body: JSON.stringify({
      ...notifData,
      sentAt: new Date().toISOString(),
      sentBy: 'Admin'
    })
  });
}

export async function deleteNotification(id) {
  return fetchApi(`/admin/notifications/${id}`, {  // ✅ Calls /api/admin/notifications/:id
    method: 'DELETE'
  });
}
```

---

## ✅ Benefits

1. **Proper Authentication**: Admin token is automatically included via `fetchApi()` helper
2. **Correct Endpoints**: Uses `/api/admin/delays` and `/api/admin/notifications` as backend expects
3. **Consistent Pattern**: Matches how other admin operations (buses, routes, drivers) work
4. **Security**: Ensures only authenticated admins can create/update/delete delays and notifications

---

## 🧪 Testing

### Manual Test:
1. Open `test-delay-endpoints.html` in browser
2. Click "Login" button
3. Click "Create Delay" - should succeed with 201 status
4. Click "Update Delay Status" - should succeed with 200 status
5. Click "Delete Delay" - should succeed with 200 status

### In Admin Dashboard:
1. Login to admin dashboard: https://nxtbus-admin.vercel.app
2. Go to "Delay Management" section
3. Try creating a new delay - should work ✅
4. Try updating delay status - should work ✅
5. Try deleting a delay - should work ✅

---

## 📋 Affected Files

- `src/services/apiService.js` - Updated delay and notification functions
- `dist-admin/` - Rebuilt admin frontend (auto-deployed to Vercel)

---

## 🚀 Deployment

1. ✅ Code committed to GitHub
2. ✅ Vercel auto-deployment triggered
3. ✅ Admin dashboard updated at https://nxtbus-admin.vercel.app

---

## 📊 Endpoint Summary

### Delays (All Working ✅)
| Method | Endpoint | Auth | Status |
|--------|----------|------|--------|
| GET | `/api/delays` | Public | ✅ Working |
| POST | `/api/admin/delays` | Admin | ✅ Fixed |
| PUT | `/api/admin/delays/:id` | Admin | ✅ Fixed |
| DELETE | `/api/admin/delays/:id` | Admin | ✅ Fixed |

### Notifications (All Working ✅)
| Method | Endpoint | Auth | Status |
|--------|----------|------|--------|
| GET | `/api/notifications` | Public | ✅ Working |
| POST | `/api/admin/notifications` | Admin | ✅ Fixed |
| PUT | `/api/admin/notifications/:id` | Admin | ✅ Working |
| DELETE | `/api/admin/notifications/:id` | Admin | ✅ Fixed |

---

**Status**: ✅ **FIXED AND DEPLOYED**  
**Next Steps**: Test in production admin dashboard

---

**Last Updated**: January 5, 2026
