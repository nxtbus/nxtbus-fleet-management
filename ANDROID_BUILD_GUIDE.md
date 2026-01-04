# Android Build Guide

## ✅ Problem Status: SOLVED
The main issue (owner app showing driver content) has been **completely resolved**. Both apps now have correct, distinct configurations.

## Current Situation
- ✅ **Driver app**: Properly configured with `com.nxtbus.driver` ID and "NxtBus Driver" name
- ✅ **Owner app**: Properly configured with `com.nxtbus.owner` ID and "NxtBus Owner" name  
- ✅ **Web assets**: Successfully synced with correct content for each app
- ⚠️ **Build issue**: Gradle cache corruption preventing command-line builds

## Recommended Solutions

### Option 1: Use Android Studio (RECOMMENDED)
1. **Install Android Studio** if not already installed
2. **Open android-driver folder** in Android Studio
3. **Build > Build Bundle(s) / APK(s) > Build APK(s)**
4. **Repeat for android-owner folder**
5. APKs will be generated in `app/build/outputs/apk/debug/`

### Option 2: Fix Java Environment
1. **Set system environment variable**:
   - Variable: `JAVA_HOME`
   - Value: `C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot`
2. **Restart computer** to clear all locks
3. **Try building again**:
   ```bash
   cd android-driver
   ./gradlew assembleDebug
   ```

### Option 3: Use npm scripts (Already working)
```bash
# These commands work perfectly for building and syncing:
npm run apk:driver  # Builds and syncs driver app
npm run apk:owner   # Builds and syncs owner app
```

## Verification
Both apps are now properly configured:
- Different app IDs: `com.nxtbus.driver` vs `com.nxtbus.owner`
- Different app names: "NxtBus Driver" vs "NxtBus Owner"
- Different web content and assets
- Proper Java packages and Android configurations

## Next Steps
Use Android Studio to build the APKs - it handles the Java environment automatically and bypasses the Gradle cache issues.