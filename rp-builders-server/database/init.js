const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initDatabase() {
  console.log('🚀 Initializing R.P. Builders Pvt Ltd Embedded Local Database...');

  const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'rp_builders.db');
  console.log(`📁 Database Location: ${dbPath}`);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  try {
    console.log('📦 Reading schema.sqlite.sql...');
    const schemaPath = path.join(__dirname, 'schema.sqlite.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⚙️ Executing SQLite schema...');
    db.exec(sql);
    console.log('✅ Database & tables created successfully on local hard disk!');

    // Hash password for default admin user
    const hashedAdmin = await bcrypt.hash('password', 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hashedAdmin, 'admin');

    console.log('🎉 R.P. Builders Pvt Ltd Local Database is ready (admin / password)!');
  } catch (error) {
    console.error('❌ Database Initialization failed:', error.message);
  } finally {
    db.close();
  }
}

initDatabase();
