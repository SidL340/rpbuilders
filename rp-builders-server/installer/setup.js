const readline = require('readline');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const { exec } = require('child_process');

const DEVELOPER_PASSCODE = '20110';
const COMPANY_NAME = 'R.P. Builders Pvt. Ltd.';
const DEVELOPER_NAME = 'Nirmala Tech Innovations Pvt. Ltd.';

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function promptPasscode() {
  console.clear();
  console.log('================================================================');
  console.log(`       ${COMPANY_NAME} — ENTERPRISE ERP SETUP`);
  console.log(`         Developed & Protected by ${DEVELOPER_NAME}`);
  console.log('================================================================\n');

  console.log('🔒 [DEVELOPER SECURITY GATE]');
  console.log('This software package is protected and requires developer authorization prior to client setup.\n');

  const rl = createInterface();

  return new Promise((resolve) => {
    rl.question('👉 Enter Developer Authentication Passcode: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function runInstallation() {
  const enteredPasscode = await promptPasscode();

  if (enteredPasscode !== DEVELOPER_PASSCODE) {
    console.log('\n❌ [ACCESS DENIED] Invalid Developer Authentication Passcode!');
    console.log('Unauthorized installation attempt has been blocked.');
    console.log(`Please contact ${DEVELOPER_NAME} for a valid installation license.\n`);
    console.log('Press any key to exit...');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => process.exit(1));
    return;
  }

  console.log('\n✅ [AUTHENTICATION VERIFIED] Welcome, Nirmala Tech Innovations Developer!');
  console.log('Proceeding with clean local database installation on Hard Disk...\n');

  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'rp_builders.db');
  console.log(`[1/3] Setting up Local Hard-Disk Database at:\n      ${dbPath}`);

  try {
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    console.log('[2/3] Initializing Clean Schema & Nepal Construction Setup...');
    const schemaPath = path.join(__dirname, '../database/schema.sqlite.sql');
    let sqlContent;
    if (fs.existsSync(schemaPath)) {
      sqlContent = fs.readFileSync(schemaPath, 'utf8');
    } else {
      sqlContent = fs.readFileSync(path.join(__dirname, 'schema.sqlite.sql'), 'utf8');
    }

    db.exec(sqlContent);

    // Hash admin password
    const hashedAdmin = bcrypt.hashSync('password', 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hashedAdmin, 'admin');

    db.close();
    console.log('      ✓ Created 30+ tables, views, and standard Nepal accounting rules');
    console.log('      ✓ Default Admin account ready: admin / password');

    console.log('[3/3] Finalizing Standalone Installation...');

    console.log('\n================================================================');
    console.log('🎉 STANDALONE LOCAL SETUP COMPLETED SUCCESSFULLY!');
    console.log('   (Zero external database servers or XAMPP needed!)');
    console.log(`   Developer: ${DEVELOPER_NAME}`);
    console.log('   Local Access URL: http://localhost:5000');
    console.log('================================================================\n');

    console.log('Opening browser at http://localhost:5000...');
    exec('start http://localhost:5000');

  } catch (error) {
    console.log(`\n❌ Installation Error: ${error.message}`);
  }
}

runInstallation();
