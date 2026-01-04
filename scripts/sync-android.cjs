/**
 * Sync web assets to Android project
 * Usage: node scripts/sync-android.js [driver|owner]
 */

const fs = require('fs');
const path = require('path');

const appType = process.argv[2];

if (!appType || !['driver', 'owner'].includes(appType)) {
  console.error('Usage: node scripts/sync-android.js [driver|owner]');
  process.exit(1);
}

const srcDir = `dist-${appType}`;
const destDir = `android-${appType}/app/src/main/assets/public`;

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy function
function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Clear existing assets (except cordova files)
if (fs.existsSync(destDir)) {
  const files = fs.readdirSync(destDir);
  files.forEach(file => {
    if (!file.startsWith('cordova')) {
      const filePath = path.join(destDir, file);
      if (fs.statSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
  });
}

// Copy new assets
console.log(`Syncing ${srcDir} to ${destDir}...`);
const files = fs.readdirSync(srcDir);
files.forEach(file => {
  copyRecursive(path.join(srcDir, file), path.join(destDir, file));
});

console.log(`✓ Synced ${appType} app to Android project`);
console.log(`\nTo build APK:`);
console.log(`1. Open Android Studio: android-${appType}`);
console.log(`2. Build > Build Bundle(s) / APK(s) > Build APK(s)`);
console.log(`3. APK location: android-${appType}/app/build/outputs/apk/debug/app-debug.apk`);
