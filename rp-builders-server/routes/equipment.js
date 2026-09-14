const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/equipment
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.*, p.project_name as current_project_name, py.party_name as owner_name
      FROM equipment e
      LEFT JOIN projects p ON e.current_project_id = p.id
      LEFT JOIN parties py ON e.owner_party_id = py.id
      WHERE e.is_active = 1
      ORDER BY e.equipment_name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/equipment
router.post('/', authenticate, async (req, res) => {
  try {
    const { equipment_name, equipment_type, category, owner_party_id, registration_no, model, daily_hire_rate, hourly_hire_rate, current_project_id, notes } = req.body;
    if (!equipment_name) return res.status(400).json({ success: false, message: 'Equipment name is required' });

    const [cnt] = await pool.query('SELECT COUNT(*) as count FROM equipment');
    const equipment_code = `EQP-${String(cnt[0].count + 1).padStart(3, '0')}`;

    const [result] = await pool.query(
      `INSERT INTO equipment (equipment_code, equipment_name, equipment_type, category, owner_party_id, registration_no, model, daily_hire_rate, hourly_hire_rate, current_project_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [equipment_code, equipment_name, equipment_type || 'owned', category || null, owner_party_id || null, registration_no || null, model || null, daily_hire_rate || 0, hourly_hire_rate || 0, current_project_id || null, notes || null]
    );

    res.status(201).json({ success: true, message: 'Equipment added', data: { id: result.insertId, equipment_code } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/equipment/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { equipment_name, equipment_type, category, owner_party_id, registration_no, model, daily_hire_rate, hourly_hire_rate, current_project_id, notes, is_active } = req.body;
    await pool.query(
      `UPDATE equipment SET
        equipment_name = ?, equipment_type = ?, category = ?, owner_party_id = ?,
        registration_no = ?, model = ?, daily_hire_rate = ?, hourly_hire_rate = ?,
        current_project_id = ?, notes = ?, is_active = ?
       WHERE id = ?`,
      [equipment_name, equipment_type, category || null, owner_party_id || null, registration_no || null, model || null, daily_hire_rate || 0, hourly_hire_rate || 0, current_project_id || null, notes || null, is_active ?? 1, req.params.id]
    );
    res.json({ success: true, message: 'Equipment updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/equipment/usage - log daily machine run time
router.post('/usage', authenticate, async (req, res) => {
  try {
    const { equipment_id, project_id, usage_date_bs, usage_date_ad, hours_used, days_used, fuel_consumed_ltr, hire_cost, operator_name, remarks } = req.body;
    if (!equipment_id || !project_id || !usage_date_bs) {
      return res.status(400).json({ success: false, message: 'Equipment, project, and date are required' });
    }

    const dateAd = usage_date_ad || new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      `INSERT INTO equipment_usage_log (equipment_id, project_id, usage_date_bs, usage_date_ad, hours_used, days_used, fuel_consumed_ltr, hire_cost, operator_name, remarks, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [equipment_id, project_id, usage_date_bs, dateAd, hours_used || 0, days_used || 0, fuel_consumed_ltr || 0, hire_cost || 0, operator_name || null, remarks || null, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Usage log recorded', data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/equipment/usage
router.get('/usage', authenticate, async (req, res) => {
  try {
    const { project_id, equipment_id, from_date_bs } = req.query;
    let query = `
      SELECT eul.*, e.equipment_name, e.equipment_code, p.project_name
      FROM equipment_usage_log eul
      JOIN equipment e ON eul.equipment_id = e.id
      JOIN projects p ON eul.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) { query += ` AND eul.project_id = ?`; params.push(project_id); }
    if (equipment_id) { query += ` AND eul.equipment_id = ?`; params.push(equipment_id); }
    if (from_date_bs) { query += ` AND eul.usage_date_bs >= ?`; params.push(from_date_bs); }

    query += ` ORDER BY eul.id DESC`;
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/equipment/maintenance
router.post('/maintenance', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { equipment_id, maintenance_date_bs, maintenance_date_ad, maintenance_type, description, cost, vendor_party_id, account_id, payment_mode = 'cash' } = req.body;
    if (!equipment_id || !maintenance_date_bs || !cost) {
      return res.status(400).json({ success: false, message: 'Equipment, date, and cost are required' });
    }

    const yearBs = maintenance_date_bs.substring(0, 4) || '2082';
    const dateAd = maintenance_date_ad || new Date().toISOString().split('T')[0];
    let voucherId = null;

    if (account_id && cost > 0) {
      const [vcnt] = await connection.query('SELECT COUNT(*) as count FROM vouchers WHERE voucher_no LIKE ?', [`PV-${yearBs}-%`]);
      const voucher_no = `PV-${yearBs}-${String(vcnt[0].count + 1).padStart(4, '0')}`;

      const [cat] = await connection.query('SELECT id FROM expense_categories WHERE code="SER"');
      const [eq] = await connection.query('SELECT equipment_name FROM equipment WHERE id = ?', [equipment_id]);

      const [vRes] = await connection.query(
        `INSERT INTO vouchers (
          voucher_no, voucher_type, voucher_date_bs, voucher_date_ad,
          party_id, account_id, payment_mode, category_id,
          narration, gross_amount, tds_percent, tds_amount, net_amount,
          status, approved_by, approved_at, entered_by
        ) VALUES (?, 'payment', ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'approved', ?, NOW(), ?)`,
        [
          voucher_no, maintenance_date_bs, dateAd,
          vendor_party_id || null, account_id, payment_mode, cat[0]?.id || null,
          `Equipment Maintenance (${eq[0]?.equipment_name || 'Machine'}): ${description || maintenance_type}`,
          cost, cost, req.user.id, req.user.id
        ]
      );
      voucherId = vRes.insertId;

      await connection.query('UPDATE company_accounts SET current_balance = current_balance - ? WHERE id = ?', [cost, account_id]);
    }

    const [mRes] = await connection.query(
      `INSERT INTO equipment_maintenance (equipment_id, maintenance_date_bs, maintenance_date_ad, maintenance_type, description, cost, vendor_party_id, voucher_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [equipment_id, maintenance_date_bs, dateAd, maintenance_type || 'repair', description || null, cost, vendor_party_id || null, voucherId]
    );

    await connection.commit();
    res.status(201).json({ success: true, message: 'Maintenance record saved', data: { id: mRes.insertId } });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
