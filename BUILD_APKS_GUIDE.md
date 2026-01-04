# Building NxtBus APKs - Driver & Owner

This guide explains how to build separate APKs for the Driver and Owner apps.

## Overview

| App | Package ID | App Name |
|-----|------------|----------|
| Driver | `com.nxtbus.driver` | NxtBus Driver |
| Owner | `com.nxtbus.owner` | NxtBus Owner |

## Prerequisites

1. **Node.js** (v18+)
2. **Java JDK 21** (REQUIRED - Capacitor 8 requires Java 21)
3. **Android Studio** with SDK installed

### Installing JDK 21

Download and install JDK 21 from one of these sources:
- Eclipse Adoptium: https://adoptium.net/temurin/releases/?version=21
- Oracle: https://www.oracle.com/java/technologies/downloads/#java21

After installation, set JAVA_HOME:
```powershell
# Windows (PowerShell) - adjust path to your JDK 21 installation
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.x-hotspot"

# Or add to system environment variables permanently
```

**Note:** JDK 17 is too old (Capacitor requires 21), and JDK 25 is too new (Gradle 8.14 doesn't support it yet).

---

## Quick Build Commands

### Step 1: Build web assets
```bash
# Build Driver app
npm run apk:driver

# Build Owner app  
npm run apk:owner
```

### Step 2: Build APK in Android Studio

1. Open the Android project folder in Android Studio:
   - Driver: `android-driver`
   - Owner: `android-owner`

2. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**

3. APK locations:
   - Driver: `android-driver/app/build/outputs/apk/debug/app-debug.apk`
   - Owner: `android-owner/app/build/outputs/apk/debug/app-debug.apk`

### Alternative: Build via Command Line

```powershell
# Set JAVA_HOME to JDK 21
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.x-hotspot"

# Build Driver APK
cd android-driver
.\gradlew.bat assembleDebug

# Build Owner APK
cd android-owner
.\gradlew.bat assembleDebug
```

---

## File Structure

```
project/
├── vite.config.driver.js          # Driver build config
├── vite.config.owner.js           # Owner build config
├── index.driver.html              # Driver HTML (with splash)
├── index.owner.html               # Owner HTML (with splash)
├── scripts/
│   └── sync-android.cjs           # Sync script
├── src/
│   ├── main.driver.jsx            # Driver entry point
│   └── main.owner.jsx             # Owner entry point
├── dist-driver/                   # Driver build output
├── dist-owner/                    # Owner build output
├── android-driver/                # Driver Android project
└── android-owner/                 # Owner Android project
```

---

## App Features

### NxtBus Driver
- Driver login
- Trip management (start/end)
- GPS tracking
- Speed monitoring
- Busway theme

### NxtBus Owner
- Owner login
- Fleet tracking (active & parked buses)
- Driver management
- Alerts (delay, speed, timing, calls)
- Busway theme

---

## Customizing App Icons

Replace icon files in `android-[driver|owner]/app/src/main/res/`:
- `mipmap-hdpi/ic_launcher.png` (72x72)
- `mipmap-mdpi/ic_launcher.png` (48x48)
- `mipmap-xhdpi/ic_launcher.png` (96x96)
- `mipmap-xxhdpi/ic_launcher.png` (144x144)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192)

---

## Signing for Release

1. Generate keystore:
```bash
keytool -genkey -v -keystore nxtbus.keystore -alias nxtbus -keyalg RSA -keysize 2048 -validity 10000
```

2. In Android Studio: **Build > Generate Signed Bundle / APK**

---

## Troubleshooting

### "Unsupported class file major version 69"
You're using JDK 25 which is too new. Install and use JDK 21.

### "invalid source release: 21"
You're using JDK 17 which is too old. Install and use JDK 21.

### Assets not updating
```bash
npm run sync:driver
# or
npm run sync:owner
```
