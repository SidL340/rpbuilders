const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/materials - all materials
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM materials WHERE is_active = 1 ORDER BY material_name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/materials - add new material item
router.post('/', authenticate, async (req, res) => {
  try {
    const { material_name, material_name_np, unit, category_code, notes } = req.body;
    if (!material_name || !unit) {
      return res.status(400).json({ success: false, message: 'Material name and unit are required' });
    }

    const [cnt] = await pool.query('SELECT COUNT(*) as count FROM materials');
    const material_code = `MAT-${String(cnt[0].count + 1).padStart(4, '0')}`;

    const [result] = await pool.query(
      `INSERT INTO materials (material_code, material_name, material_name_np, unit, category_code, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [material_code, material_name, material_name_np || null, unit, category_code || null, notes || null]
    );

    res.status(201).json({ success: true, data: { id: result.insertId, material_code } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/materials/purchases
router.get('/purchases', authenticate, async (req, res) => {
  try {
    const { project_id, material_id, from_date_bs, to_date_bs } = req.query;
    let query = `
      SELECT mp.*, m.material_name, m.unit, p.project_name, py.party_name as supplier_name, v.voucher_no
      FROM material_purchases mp
      JOIN materials m ON mp.material_id = m.id
      JOIN projects p ON mp.project_id = p.id
      LEFT JOIN parties py ON mp.supplier_id = py.id
      LEFT JOIN vouchers v ON mp.voucher_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) { query += ` AND mp.project_id = ?`; params.push(project_id); }
    if (material_id) { query += ` AND mp.material_id = ?`; params.push(material_id); }
    if (from_date_bs) { query += ` AND mp.purchase_date_bs >= ?`; params.push(from_date_bs); }
    if (to_date_bs) { query += ` AND mp.purchase_date_bs <= ?`; params.push(to_date_bs); }

    query += ` ORDER BY mp.id DESC`;
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/materials/purchases - record purchase & optional payment voucher
router.post('/purchases', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const {
      project_id, material_id, supplier_id, purchase_date_bs, purchase_date_ad,
      quantity, unit_rate, bill_no, delivery_address, remarks,
      create_voucher = true, account_id, payment_mode = 'cash'
    } = req.body;

    if (!project_id || !material_id || !quantity || !unit_rate || !purchase_date_bs) {
      return res.status(400).json({ success: false, message: 'Missing required purchase details' });
    }

    const totalAmount = parseFloat(quantity) * parseFloat(unit_rate);
    const yearBs = purchase_date_bs.substring(0, 4) || '2082';
    const dateAd = purchase_date_ad || new Date().toISOString().split('T')[0];
    let voucherId = null;

    if (create_voucher && account_id) {
      const [vcnt] = await connection.query('SELECT COUNT(*) as count FROM vouchers WHERE voucher_no LIKE ?', [`PV-${yearBs}-%`]);
      const voucher_no = `PV-${yearBs}-${String(vcnt[0].count + 1).padStart(4, '0')}`;

      const [cat] = await connection.query('SELECT id FROM expense_categories WHERE code="SCM"');

      const [vRes] = await connection.query(
        `INSERT INTO vouchers (
          voucher_no, voucher_type, voucher_date_bs, voucher_date_ad,
          project_id, party_id, account_id, payment_mode,
          category_id, narration,
          gross_amount, tds_percent, tds_amount, net_amount,
          bill_no, remarks, status, approved_by, approved_at, entered_by
        ) VALUES (?, 'payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, 'approved', ?, NOW(), ?)`,
        [
          voucher_no, purchase_date_bs, dateAd,
          project_id, supplier_id || null, account_id, payment_mode,
          cat[0]?.id || null,
          `Material Purchase: ${quantity} units @ NPR ${unit_rate} (${remarks || 'Direct Purchase'})`,
          totalAmount, totalAmount,
          bill_no || null, remarks || null, req.user.id, req.user.id
        ]
      );

      voucherId = vRes.insertId;

      await connection.query(
        'UPDATE company_accounts SET current_balance = current_balance - ? WHERE id = ?',
        [totalAmount, account_id]
      );
    }

    const [pRes] = await connection.query(
      `INSERT INTO material_purchases (
        voucher_id, project_id, material_id, supplier_id,
        purchase_date_bs, purchase_date_ad, quantity, unit_rate, total_amount,
        bill_no, delivery_address, remarks, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        voucherId, project_id, material_id, supplier_id || null,
        purchase_date_bs, dateAd, quantity, unit_rate, totalAmount,
        bill_no || null, delivery_address || null, remarks || null, req.user.id
      ]
    );

    await connection.commit();
    res.status(201).json({ success: true, message: 'Material purchase recorded successfully', data: { id: pRes.insertId } });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// POST /api/materials/usage - record usage on site
router.post('/usage', authenticate, async (req, res) => {
  try {
    const { project_id, material_id, usage_date_bs, usage_date_ad, quantity_used, purpose } = req.body;
    if (!project_id || !material_id || !quantity_used || !usage_date_bs) {
      return res.status(400).json({ success: false, message: 'Missing required usage details' });
    }

    const dateAd = usage_date_ad || new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      `INSERT INTO material_usage (project_id, material_id, usage_date_bs, usage_date_ad, quantity_used, purpose, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [project_id, material_id, usage_date_bs, dateAd, quantity_used, purpose || null, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Material consumption logged', data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/materials/stock - stock position
router.get('/stock', authenticate, async (req, res) => {
  try {
    const { project_id } = req.query;
    let query = `
      SELECT * FROM (
        SELECT 
          m.id as material_id,
          m.material_code,
          m.material_name,
          m.unit,
          p.id as project_id,
          p.project_name,
          COALESCE(purchased.total_purchased, 0) as total_purchased,
          COALESCE(used.total_used, 0) as total_used,
          COALESCE(purchased.total_purchased, 0) - COALESCE(used.total_used, 0) as current_stock
        FROM materials m
        CROSS JOIN projects p
        LEFT JOIN (
          SELECT project_id, material_id, SUM(quantity) as total_purchased
          FROM material_purchases GROUP BY project_id, material_id
        ) purchased ON purchased.material_id = m.id AND purchased.project_id = p.id
        LEFT JOIN (
          SELECT project_id, material_id, SUM(quantity_used) as total_used
          FROM material_usage GROUP BY project_id, material_id
        ) used ON used.material_id = m.id AND used.project_id = p.id
        WHERE m.is_active = 1
        ${project_id ? 'AND p.id = ?' : ''}
      ) sub
      WHERE sub.total_purchased > 0 OR sub.total_used > 0
      ORDER BY sub.project_name, sub.material_name
    `;
    const params = [];
    if (project_id) {
      params.push(project_id);
    }

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
