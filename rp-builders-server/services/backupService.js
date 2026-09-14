const path = require('path');
const fs = require('fs');

const BACKUP_DIR = path.join(__dirname, '../data/backups');
const META_FILE = path.join(BACKUP_DIR, 'backup_meta.json');
const DEVELOPER_PASSCODE = '20110';
const MAX_BACKUPS_RETAINED = 5;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function getMeta() {
  try {
    if (fs.existsSync(META_FILE)) {
      return JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading backup metadata:', err.message);
  }
  return { lastBackupDate: null, lastBackupStatus: 'none', backups: [] };
}

function saveMeta(meta) {
  try {
    fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving backup metadata:', err.message);
  }
}

/**
 * Creates an atomic, transaction-safe SQLite database backup
 * @param {import('better-sqlite3').Database} db
 * @param {string} reason - 'weekly' | 'manual'
 */
async function createBackup(db, reason = 'weekly') {
  if (!db) throw new Error('Database instance is required for backup');

  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `rp_builders_backup_${reason}_${dateStr}.db`;
  const destPath = path.join(BACKUP_DIR, fileName);

  console.log(`🔒 [BACKUP ENGINE] Initiating ${reason} backup to: ${fileName}...`);

  // SQLite online backup API ensures zero table locking and zero data corruption
  await db.backup(destPath);

  const stats = fs.statSync(destPath);
  const fileSizeKB = (stats.size / 1024).toFixed(2);

  const meta = getMeta();
  meta.lastBackupDate = now.toISOString();
  meta.lastBackupStatus = 'success';
  meta.lastBackupFile = fileName;

  meta.backups.unshift({
    fileName,
    sizeKB: fileSizeKB,
    createdAt: now.toISOString(),
    reason,
  });

  // Rotate backups: keep the most recent MAX_BACKUPS_RETAINED
  while (meta.backups.length > MAX_BACKUPS_RETAINED) {
    const oldest = meta.backups.pop();
    const oldPath = path.join(BACKUP_DIR, oldest.fileName);
    if (fs.existsSync(oldPath)) {
      try {
        fs.unlinkSync(oldPath);
        console.log(`🧹 [BACKUP ENGINE] Auto-purged old backup: ${oldest.fileName}`);
      } catch (e) {
        console.error('Error deleting old backup:', e.message);
      }
    }
  }

  saveMeta(meta);
  console.log(`✅ [BACKUP ENGINE] ${reason} backup completed successfully (${fileSizeKB} KB)!`);

  return {
    success: true,
    fileName,
    sizeKB: fileSizeKB,
    createdAt: now.toISOString(),
  };
}

/**
 * Checks if 7 or more days have elapsed since the last backup. If so, runs backup.
 * @param {import('better-sqlite3').Database} db
 */
async function checkAndRunWeeklyBackup(db) {
  try {
    const meta = getMeta();
    const now = new Date();

    if (!meta.lastBackupDate) {
      console.log('ℹ️ [BACKUP ENGINE] Initial database backup running...');
      return await createBackup(db, 'weekly');
    }

    const lastDate = new Date(meta.lastBackupDate);
    const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);

    if (diffDays >= 7) {
      console.log(`⏰ [BACKUP ENGINE] ${diffDays.toFixed(1)} days since last backup. Running automated weekly backup...`);
      return await createBackup(db, 'weekly');
    } else {
      console.log(`ℹ️ [BACKUP ENGINE] Last backup was ${diffDays.toFixed(1)} days ago. Weekly backup scheduled in ${(7 - diffDays).toFixed(1)} days.`);
      return null;
    }
  } catch (err) {
    console.error('❌ [BACKUP ENGINE] Weekly backup failed:', err.message);
    const meta = getMeta();
    meta.lastBackupStatus = 'failed';
    meta.lastError = err.message;
    saveMeta(meta);
    return null;
  }
}

/**
 * Lists all available backup files
 */
function listBackups() {
  const meta = getMeta();
  // Ensure physical existence
  const verifiedBackups = meta.backups.filter(b => fs.existsSync(path.join(BACKUP_DIR, b.fileName)));
  return {
    lastBackupDate: meta.lastBackupDate,
    lastBackupStatus: meta.lastBackupStatus,
    backups: verifiedBackups,
  };
}

/**
 * Restores database from a specific backup file (Protected by Developer Passcode 20110)
 * @param {string} fileName
 * @param {string} passcode
 * @param {string} activeDbPath
 */
function restoreBackup(fileName, passcode, activeDbPath) {
  if (passcode !== DEVELOPER_PASSCODE) {
    throw new Error('Invalid Developer Authentication Passcode! Access Denied.');
  }

  const backupPath = path.join(BACKUP_DIR, fileName);
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file ${fileName} not found`);
  }

  console.log(`⚠️ [BACKUP ENGINE] Restoring database from: ${fileName}...`);
  fs.copyFileSync(backupPath, activeDbPath);
  console.log(`✅ [BACKUP ENGINE] Database successfully restored from ${fileName}!`);

  return { success: true, message: `Database restored from ${fileName}` };
}

module.exports = {
  createBackup,
  checkAndRunWeeklyBackup,
  listBackups,
  restoreBackup,
  BACKUP_DIR,
  DEVELOPER_PASSCODE,
};
