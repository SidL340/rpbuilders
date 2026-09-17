const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Detect if Cloud MySQL is configured
const hasCloudMySQL = Boolean(
  (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('mysql') || process.env.DATABASE_URL.startsWith('mariadb'))) ||
  process.env.MYSQL_HOST ||
  process.env.DB_HOST
);

let pool = null;

if (hasCloudMySQL) {
  console.log('☁️ [DATABASE ENGINE] Connecting to Cloud MySQL Database...');
  const mysql = require('mysql2/promise');

  let mysqlConfig;
  if (process.env.DATABASE_URL) {
    mysqlConfig = {
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    };
  } else {
    mysqlConfig = {
      host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
      user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'rp_builders_db',
      port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    };
  }

  const rawPool = mysql.createPool(mysqlConfig);

  // Auto-initialize schema in Cloud MySQL if needed
  async function initCloudMySQL() {
    try {
      const [tables] = await rawPool.query("SHOW TABLES LIKE 'users'");
      if (!tables || tables.length === 0) {
        console.log('⚙️ Initializing clean Cloud MySQL schema from database/schema.sql...');
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          // Split queries by semicolon to execute safely
          const statements = sql
            .split(/;\s*$/m)
            .map(s => s.trim())
            .filter(s => s.length > 0);

          for (const statement of statements) {
            try {
              await rawPool.query(statement);
            } catch (queryErr) {
              // Ignore view replacement or non-fatal drop errors
              if (!queryErr.message.includes('already exists') && !queryErr.message.includes("doesn't exist")) {
                console.warn('⚠️ SQL notice:', queryErr.message);
              }
            }
          }

          const hashedAdmin = bcrypt.hashSync('password', 10);
          await rawPool.query('UPDATE users SET password_hash = ? WHERE username = ?', [hashedAdmin, 'admin']);
          console.log('✅ Cloud MySQL tables created and admin user seeded (admin / password)!');
        }
      } else {
        console.log('✅ Cloud MySQL tables verified.');
      }
    } catch (err) {
      console.error('❌ Cloud MySQL initialization error:', err.message);
    }
  }

  initCloudMySQL();

  pool = {
    query: async (sql, params = []) => {
      try {
        const cleanParams = Array.isArray(params)
          ? params.map(p => (p === undefined ? null : p))
          : [params];
        return await rawPool.query(sql, cleanParams);
      } catch (err) {
        console.error('Cloud SQL Execution Error:', err.message, '\nQuery:', sql, '\nParams:', params);
        throw err;
      }
    },
    getConnection: async () => {
      const conn = await rawPool.getConnection();
      return {
        query: (sql, params) => conn.query(sql, params),
        release: () => conn.release(),
        beginTransaction: () => conn.beginTransaction(),
        commit: () => conn.commit(),
        rollback: () => conn.rollback(),
      };
    },
    rawPool,
    isCloud: true,
  };

  console.log('✅ Cloud MySQL Database connected successfully.');
} else {
  // Local or Persistent SQLite Engine
  const Database = require('better-sqlite3');
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'rp_builders.db');
  console.log(`📁 [DATABASE ENGINE] Using SQLite Database: ${dbPath}`);

  const db = new Database(dbPath);

  // Configure SQLite for high performance & concurrency
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  // Register MySQL Compatibility Functions in SQLite
  db.function('NOW', () => {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  });

  db.function('LPAD', (str, len, pad) => {
    return String(str || '').padStart(Number(len), pad || '0');
  });

  db.function('LEFT', (str, len) => {
    return String(str || '').substring(0, Number(len));
  });

  db.function('RIGHT', (str, len) => {
    const s = String(str || '');
    return s.substring(Math.max(0, s.length - Number(len)));
  });

  db.function('IF', (cond, a, b) => {
    return cond ? a : b;
  });

  db.function('CONCAT', { varargs: true }, (...args) => {
    return args.map(a => (a === null || a === undefined ? '' : String(a))).join('');
  });

  // Auto-initialize schema & auto-migrate columns
  function initializeAndMigrateSchema() {
    try {
      const tableCheck = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='users'").get();
      if (!tableCheck || tableCheck.count === 0) {
        console.log('⚙️ Initializing clean SQLite schema & accounting setup...');
        const schemaPath = path.join(__dirname, '../database/schema.sqlite.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          db.exec(sql);

          const hashedAdmin = bcrypt.hashSync('password', 10);
          db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hashedAdmin, 'admin');
          console.log('✅ SQLite database initialized successfully (admin / password)!');
        }
      } else {
        // Always ensure missing columns exist unconditionally on startup
        const companyCols = db.prepare("PRAGMA table_info(company_settings)").all().map(c => c.name);
        if (!companyCols.includes('company_logo_data')) {
          console.log('Migrating: Adding column company_logo_data to company_settings table...');
          db.exec('ALTER TABLE company_settings ADD COLUMN company_logo_data TEXT');
        }

        const voucherCols = db.prepare("PRAGMA table_info(vouchers)").all().map(c => c.name);
        const newCols = [
          { name: 'fiscal_year', type: 'TEXT DEFAULT "2083/84"' },
          { name: 'cheque_date_bs', type: 'TEXT' },
          { name: 'bank_name', type: 'TEXT' },
          { name: 'bank_voucher_no', type: 'TEXT' },
          { name: 'cash_receiver_name', type: 'TEXT' },
          { name: 'cash_receiver_phone', type: 'TEXT' },
          { name: 'cash_handed_by', type: 'TEXT' },
        ];

        newCols.forEach(col => {
          if (!voucherCols.includes(col.name)) {
            console.log(`Migrating: Adding column ${col.name} to vouchers table...`);
            db.exec(`ALTER TABLE vouchers ADD COLUMN ${col.name} ${col.type}`);
          }
        });

        // Refresh Views
        db.exec(`
          DROP VIEW IF EXISTS v_voucher_summary;
          CREATE VIEW v_voucher_summary AS
          SELECT
            v.id,
            v.voucher_no,
            v.voucher_type,
            v.voucher_date_bs,
            v.voucher_date_ad,
            v.fiscal_year,
            v.project_id,
            p.project_name,
            p.project_code,
            v.party_id,
            py.party_name,
            py.party_type,
            py.phone AS party_phone,
            py.pan_no AS party_pan,
            v.category_id,
            ec.name AS category_name,
            v.account_id,
            ca.account_name AS paid_from,
            v.payment_mode,
            v.bank_name,
            v.cheque_no,
            v.cheque_date_bs,
            v.bank_voucher_no,
            v.cash_receiver_name,
            v.cash_receiver_phone,
            v.cash_handed_by,
            v.bill_no,
            v.narration,
            v.gross_amount,
            v.tds_percent,
            v.tds_amount,
            v.net_amount,
            v.status,
            u.name AS entered_by_name,
            ap.name AS approved_by_name,
            v.approved_at,
            v.created_at
          FROM vouchers v
          LEFT JOIN projects p ON v.project_id = p.id
          LEFT JOIN parties py ON v.party_id = py.id
          LEFT JOIN expense_categories ec ON v.category_id = ec.id
          LEFT JOIN company_accounts ca ON v.account_id = ca.id
          LEFT JOIN users u ON v.entered_by = u.id
          LEFT JOIN users ap ON v.approved_by = ap.id;
        `);

        // Record and verify schema_migrations
        db.exec(`
          CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version TEXT UNIQUE NOT NULL,
            description TEXT,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        const recordMigration = (version, desc) => {
          try {
            db.prepare('INSERT OR IGNORE INTO schema_migrations (version, description) VALUES (?, ?)').run(version, desc);
          } catch (e) {}
        };

        recordMigration('v1.0.0', 'Initial construction accounting schema with SQLite WAL');
        recordMigration('v1.0.1', 'Aarthik Barsha (Fiscal Year) and payment audit details');
        recordMigration('v1.0.2', 'Automated weekly backup and developer update engine');
        recordMigration('v1.0.3', 'System logo upload, Site & Voucher edit-delete management, and General Journal report');
      }
    } catch (err) {
      console.error('❌ Schema migration error:', err.message);
    }
  }

  initializeAndMigrateSchema();

  // Integrity Check on Boot
  try {
    const integrity = db.pragma('integrity_check');
    if (integrity && integrity[0] && integrity[0].integrity_check === 'ok') {
      console.log('🛡️ [DATABASE INTEGRITY] SQLite database integrity check passed: OK');
    }
  } catch (e) {
    console.error('Integrity check error:', e.message);
  }

  // Initialize & Schedule Automated Weekly Backup for SQLite
  const backupService = require('../services/backupService');
  setTimeout(() => {
    backupService.checkAndRunWeeklyBackup(db).catch(err => {
      console.error('Initial backup check failed:', err.message);
    });
  }, 3000);

  setInterval(() => {
    backupService.checkAndRunWeeklyBackup(db).catch(err => {
      console.error('Recurring backup check failed:', err.message);
    });
  }, 24 * 60 * 60 * 1000);

  // Standard query adapter providing pool.query(sql, params) compatibility
  pool = {
    query: async (sql, params = []) => {
      try {
        const trimmed = sql.trim();
        const isSelect = /^(SELECT|PRAGMA|SHOW|WITH)\b/i.test(trimmed);

        const cleanParams = Array.isArray(params)
          ? params.map(p => (p === undefined ? null : p))
          : [params];

        const stmt = db.prepare(sql);
        if (isSelect) {
          const rows = stmt.all(...cleanParams);
          return [rows];
        } else {
          const info = stmt.run(...cleanParams);
          const result = {
            insertId: Number(info.lastInsertRowid),
            affectedRows: info.changes,
            changes: info.changes,
          };
          return [result];
        }
      } catch (err) {
        console.error('SQL Execution Error:', err.message, '\nQuery:', sql, '\nParams:', params);
        throw err;
      }
    },

    getConnection: async () => {
      return {
        query: pool.query,
        release: () => {},
        beginTransaction: async () => { db.exec('BEGIN TRANSACTION'); },
        commit: async () => { db.exec('COMMIT'); },
        rollback: async () => { db.exec('ROLLBACK'); },
      };
    },

    rawDb: db,
    dbPath: dbPath,
    isCloud: false,
  };

  console.log('✅ SQLite Database engine ready.');
}

module.exports = pool;
