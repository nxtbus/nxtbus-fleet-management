#!/usr/bin/env node

/**
 * Post-build script for Vercel deployment
 * Handles file renaming and directory setup
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 Running post-build script...');

try {
  // Rename owner index file if it exists
  const ownerIndexPath = 'dist-owner/index.owner.html';
  const ownerTargetPath = 'dist-owner/index.html';
  
  if (fs.existsSync(ownerIndexPath)) {
    fs.renameSync(ownerIndexPath, ownerTargetPath);
    console.log('✅ Renamed owner index file');
  }

  // Rename driver index file if it exists
  const driverIndexPath = 'dist-driver/index.driver.html';
  const driverTargetPath = 'dist-driver/index.html';
  
  if (fs.existsSync(driverIndexPath)) {
    fs.renameSync(driverIndexPath, driverTargetPath);
    console.log('✅ Renamed driver index file');
  }

  // Copy files to main dist directory for Vercel routing
  if (fs.existsSync('dist-admin') && fs.existsSync('dist')) {
    // Create admin subdirectory in main dist
    if (!fs.existsSync('dist/admin')) {
      fs.mkdirSync('dist/admin', { recursive: true });
    }
    
    // Copy admin files
    const adminFiles = fs.readdirSync('dist-admin');
    adminFiles.forEach(file => {
      fs.copyFileSync(
        path.join('dist-admin', file),
        path.join('dist/admin', file)
      );
    });
    console.log('✅ Copied admin files to dist/admin');
  }

  if (fs.existsSync('dist-owner') && fs.existsSync('dist')) {
    // Create owner subdirectory in main dist
    if (!fs.existsSync('dist/owner')) {
      fs.mkdirSync('dist/owner', { recursive: true });
    }
    
    // Copy owner files
    const ownerFiles = fs.readdirSync('dist-owner');
    ownerFiles.forEach(file => {
      fs.copyFileSync(
        path.join('dist-owner', file),
        path.join('dist/owner', file)
      );
    });
    console.log('✅ Copied owner files to dist/owner');
  }

  if (fs.existsSync('dist-driver') && fs.existsSync('dist')) {
    // Create driver subdirectory in main dist
    if (!fs.existsSync('dist/driver')) {
      fs.mkdirSync('dist/driver', { recursive: true });
    }
    
    // Copy driver files
    const driverFiles = fs.readdirSync('dist-driver');
    driverFiles.forEach(file => {
      fs.copyFileSync(
        path.join('dist-driver', file),
        path.join('dist/driver', file)
      );
    });
    console.log('✅ Copied driver files to dist/driver');
  }

  console.log('🎉 Post-build script completed successfully!');
  
} catch (error) {
  console.error('❌ Post-build script failed:', error.message);
  process.exit(1);
}