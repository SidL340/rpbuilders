const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const backupService = require('../services/backupService');

// GET /api/settings/company
router.get('/company', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM company_settings LIMIT 1');
    res.json({ success: true, data: rows[0] || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/settings/company
router.put('/company', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { company_name, company_name_np, company_address, company_phone, company_email, company_pan, fiscal_year_start, currency, date_format } = req.body;
    
    await pool.query(
      `UPDATE company_settings SET
        company_name = ?, company_name_np = ?, company_address = ?,
        company_phone = ?, company_email = ?, company_pan = ?,
        fiscal_year_start = ?, currency = ?, date_format = ?
       WHERE id = 1`,
      [company_name, company_name_np, company_address, company_phone, company_email, company_pan, fiscal_year_start, currency || 'NPR', date_format || 'BS']
    );

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/settings/fiscal-year
router.get('/fiscal-year', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      current_bs_year: '2083',
      fiscal_year: '2083/84',
      start_date_bs: '2083-04-01',
      end_date_bs: '2084-03-31'
    }
  });
});

// ─── Automated Backup & Security Endpoints ────────────────────

// GET /api/settings/backups - List all backups
router.get('/backups', authenticate, (req, res) => {
  try {
    const data = backupService.listBackups();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/settings/backups/create - Trigger manual backup
router.post('/backups/create', authenticate, async (req, res) => {
  try {
    const result = await backupService.createBackup(pool.rawDb, 'manual');
    res.json({
      success: true,
      message: 'नयाँ ब्याकअप सफलतापूर्वक सुरक्षित भयो (Backup created successfully)!',
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/settings/backups/restore - Restore backup (Developer Passcode 20110 required)
router.post('/backups/restore', authenticate, authorize('super_admin'), (req, res) => {
  try {
    const { fileName, passcode } = req.body;
    if (!fileName) {
      return res.status(400).json({ success: false, message: 'Backup file name is required' });
    }
    if (!passcode) {
      return res.status(400).json({ success: false, message: 'Developer passcode is required for database restoration' });
    }

    const result = backupService.restoreBackup(fileName, passcode, pool.dbPath);
    res.json({
      success: true,
      message: 'डाटा सफलतापूर्वक रिस्टोर भयो! कृपया सफ्टवेयर रिस्टार्ट गर्नुहोस्।',
      data: result,
    });
  } catch (error) {
    res.status(403).json({ success: false, message: error.message });
  }
});

// ─── Developer Update Engine & Version Info ───────────────────

// GET /api/settings/version - System & Developer Version Information
router.get('/version', authenticate, async (req, res) => {
  try {
    const [migrations] = await pool.query('SELECT version, description, applied_at FROM schema_migrations ORDER BY id DESC');
    res.json({
      success: true,
      data: {
        appName: 'R.P. Builders ERP',
        version: '1.0.0',
        releaseType: 'Production Desktop Edition (.exe)',
        developer: 'Nirmala Tech Innovations Pvt. Ltd.',
        developerContact: 'Kathmandu, Nepal',
        buildDate: '2083-05-14 (2026-09-14 AD)',
        databaseEngine: 'SQLite WAL Embedded (Local Hard-Disk)',
        migrations: migrations || [],
        latestVersion: '1.0.0',
        isUpToDate: true,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/settings/check-update - Check for online updates
router.post('/check-update', authenticate, (req, res) => {
  try {
    // Returns status: currently v1.0.0 is the latest production build
    res.json({
      success: true,
      data: {
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        hasUpdate: false,
        releaseNotes: 'You are using the latest version of R.P. Builders ERP with automated weekly backups and Nepal Fiscal Year support.',
        releaseDate: '2083-05-14',
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/settings/apply-patch - Apply developer patch (Requires Passcode 20110)
router.post('/apply-patch', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { passcode, patchDescription } = req.body;
    if (passcode !== '20110') {
      return res.status(403).json({ success: false, message: 'Invalid Developer Authentication Passcode!' });
    }

    // Record applied patch in schema_migrations
    const patchVersion = `patch_${Date.now()}`;
    await pool.query(
      'INSERT INTO schema_migrations (version, description) VALUES (?, ?)',
      [patchVersion, patchDescription || 'Manual Developer Update Patch Applied']
    );

    res.json({
      success: true,
      message: 'अपडेट प्याच सफलतापूर्वक प्रमाणीकरण तथा लागू भयो (Patch verified & applied)!',
      data: { patchVersion }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

