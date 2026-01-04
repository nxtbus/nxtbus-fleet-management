# NxtBus APK Build Guide

## Prerequisites
- Android Studio installed
- Java JDK 11+ installed

## Quick Build Steps

### 1. Open Android Studio
Run this command to open the project in Android Studio:
```bash
npx cap open android
```

### 2. Build APK in Android Studio
1. Wait for Gradle sync to complete
2. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Wait for build to complete
4. Click **locate** in the notification to find the APK

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### 3. Install on Phone
- Transfer APK to your Android phone
- Enable "Install from unknown sources" in settings
- Tap the APK to install

---

## Development Workflow

### Make changes to web app:
```bash
npm run build        # Build the web app
npx cap sync         # Sync to Android
npx cap open android # Open in Android Studio
```

### Live reload during development:
```bash
npx cap run android --livereload --external
```

---

## Build Release APK (For Play Store)

### 1. Generate signing key:
```bash
keytool -genkey -v -keystore nxtbus-release.keystore -alias nxtbus -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Build signed APK:
In Android Studio:
1. **Build** → **Generate Signed Bundle / APK**
2. Select **APK**
3. Choose your keystore
4. Select **release** build variant
5. Click **Finish**

---

## App Features by Portal

| Portal | Features |
|--------|----------|
| **Passenger** | Search buses, live tracking, ETA |
| **Driver** | Start/end trips, GPS tracking |
| **Admin** | Manage buses, routes, drivers, owners |
| **Owner** | Fleet tracking, analytics, alerts |

---

## Server Configuration

For the APK to connect to your server, update the API URL in:
`src/services/sharedDataService.js`

Change localhost to your server IP:
```javascript
const HOST = '192.168.1.100'; // Your server IP
```

Then rebuild:
```bash
npm run build
npx cap sync
```

---

## Troubleshooting

### App shows blank screen
- Check if server is running
- Verify API URL is correct
- Check Android logcat for errors

### GPS not working
- Grant location permissions in app settings
- Enable GPS on device

### Build fails
- Run `npx cap sync` again
- Clean project in Android Studio: **Build** → **Clean Project**
