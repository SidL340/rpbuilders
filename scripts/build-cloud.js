#!/usr/bin/env node
/**
 * R.P. Builders ERP — Cloud Build Pipeline
 * Builds frontend with Vite and synchronizes production assets into backend static folder.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'rp-builders-client');
const serverDir = path.join(rootDir, 'rp-builders-server');
const clientDist = path.join(clientDir, 'dist');
const serverPublic = path.join(serverDir, 'public');

console.log('🚀 [CLOUD BUILD] Starting R.P. Builders ERP Cloud Build Pipeline...');
console.log(`📁 Client Dir: ${clientDir}`);
console.log(`📁 Server Dir: ${serverDir}`);

// 1. Install Client Dependencies & Build with Vite
console.log('\n📦 Step 1: Preparing and building React Vite Frontend...');
try {
  if (!fs.existsSync(path.join(clientDir, 'node_modules')) || !fs.existsSync(path.join(clientDir, 'node_modules', '.bin', 'vite'))) {
    console.log('Installing client dependencies (including Vite)...');
    execSync('npm install --include=dev', {
      cwd: clientDir,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    });
  }

  console.log('Compiling React Vite production bundle...');
  execSync('npm run build', {
    cwd: clientDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ React frontend built successfully!');
} catch (err) {
  console.error('❌ Frontend build failed:', err.message);
  process.exit(1);
}

// 2. Synchronize dist to server/public
console.log('\n📂 Step 2: Syncing build assets to Express static directory...');
try {
  if (!fs.existsSync(serverPublic)) {
    fs.mkdirSync(serverPublic, { recursive: true });
  }

  // Copy dist directory contents to server/public
  fs.cpSync(clientDist, serverPublic, { recursive: true, force: true });
  console.log(`✅ Static frontend synchronized to: ${serverPublic}`);
} catch (err) {
  console.error('❌ Failed to copy static build assets:', err.message);
  process.exit(1);
}

// 3. Ensure server dependencies are installed
console.log('\n🛠️ Step 3: Verifying backend server dependencies...');
try {
  if (!fs.existsSync(path.join(serverDir, 'node_modules')) || !fs.existsSync(path.join(serverDir, 'node_modules', 'express'))) {
    console.log('Installing server dependencies in rp-builders-server...');
    execSync('npm install', { cwd: serverDir, stdio: 'inherit' });
  }
  console.log('✅ Server environment ready!');
} catch (err) {
  console.error('❌ Server dependency check failed:', err.message);
  process.exit(1);
}

console.log('\n🎉 [CLOUD BUILD COMPLETE] R.P. Builders ERP is ready for online deployment!');
