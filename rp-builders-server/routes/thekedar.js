const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/thekedar/work-orders
router.get('/work-orders', authenticate, async (req, res) => {
  try {
    const { project_id, thekedar_id, status } = req.query;
    let query = `
      SELECT wo.*, p.project_name, p.project_code,
             py.party_name AS thekedar_name, py.phone AS thekedar_phone, py.pan_no AS thekedar_pan,
             wo.total_contract_amount - wo.total_paid AS balance_remaining
      FROM thekedar_work_orders wo
      JOIN projects p ON wo.project_id = p.id
      JOIN parties py ON wo.thekedar_id = py.id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) {
      query += ` AND wo.project_id = ?`;
      params.push(project_id);
    }
    if (thekedar_id) {
      query += ` AND wo.thekedar_id = ?`;
      params.push(thekedar_id);
    }
    if (status) {
      query += ` AND wo.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY wo.id DESC`;
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/thekedar/work-orders
router.post('/work-orders', authenticate, async (req, res) => {
  try {
    const {
      project_id, thekedar_id, work_description, work_type,
      unit, quantity, unit_rate, total_contract_amount,
      advance_paid = 0, retention_percent = 0, tds_percent = 1.5,
      start_date_bs, start_date_ad, end_date_bs, end_date_ad, notes
    } = req.body;

    if (!project_id || !thekedar_id || !work_description) {
      return res.status(400).json({ success: false, message: 'Project, thekedar, and description are required' });
    }

    const yearBs = (start_date_bs || '').substring(0, 4) || '2082';
    const [cnt] = await pool.query('SELECT COUNT(*) as count FROM thekedar_work_orders WHERE work_order_no LIKE ?', [`WO-${yearBs}-%`]);
    const work_order_no = `WO-${yearBs}-${String(cnt[0].count + 1).padStart(4, '0')}`;

    const totalAmt = total_contract_amount || (quantity && unit_rate ? quantity * unit_rate : 0);

    const [result] = await pool.query(
      `INSERT INTO thekedar_work_orders (
        work_order_no, project_id, thekedar_id, work_description, work_type,
        unit, quantity, unit_rate, total_contract_amount, advance_paid,
        total_paid, retention_percent, tds_percent, completion_percent,
        start_date_bs, start_date_ad, end_date_bs, end_date_ad, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [
        work_order_no, project_id, thekedar_id, work_description, work_type || null,
        unit || null, quantity || null, unit_rate || null, totalAmt, advance_paid || 0,
        advance_paid || 0, retention_percent || 0, tds_percent || 1.5,
        start_date_bs || null, start_date_ad || null, end_date_bs || null, end_date_ad || null,
        notes || null, req.user.id
      ]
    );

    res.status(201).json({
      success: true,
      message: `Work Order ${work_order_no} created successfully`,
      data: { id: result.insertId, work_order_no }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/thekedar/work-orders/:id
router.get('/work-orders/:id', authenticate, async (req, res) => {
  try {
    const [wo] = await pool.query(
      `SELECT wo.*, p.project_name, p.project_code,
              py.party_name AS thekedar_name, py.phone AS thekedar_phone, py.pan_no AS thekedar_pan,
              wo.total_contract_amount - wo.total_paid AS balance_remaining
       FROM thekedar_work_orders wo
       JOIN projects p ON wo.project_id = p.id
       JOIN parties py ON wo.thekedar_id = py.id
       WHERE wo.id = ?`,
      [req.params.id]
    );

    if (wo.length === 0) return res.status(404).json({ success: false, message: 'Work order not found' });

    const [payments] = await pool.query(
      `SELECT tp.*, v.voucher_no, v.payment_mode
       FROM thekedar_payments tp
       LEFT JOIN vouchers v ON tp.voucher_id = v.id
       WHERE tp.work_order_id = ?
       ORDER BY tp.id DESC`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        work_order: wo[0],
        payments
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/thekedar/work-orders/:id/payments
router.post('/work-orders/:id/payments', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const workOrderId = req.params.id;
    const {
      payment_date_bs, payment_date_ad, bill_no,
      gross_amount = 0, retention_amount = 0, tds_amount = 0,
      advance_adjusted = 0, payment_type = 'running_bill',
      work_completion_percent, remarks, account_id, payment_mode = 'cash'
    } = req.body;

    const [wo] = await connection.query('SELECT * FROM thekedar_work_orders WHERE id = ?', [workOrderId]);
    if (wo.length === 0) return res.status(404).json({ success: false, message: 'Work order not found' });

    const gross = parseFloat(gross_amount);
    const ret = parseFloat(retention_amount || 0);
    const tds = parseFloat(tds_amount || 0);
    const advAdj = parseFloat(advance_adjusted || 0);
    const net = gross - ret - tds - advAdj;

    const yearBs = payment_date_bs.substring(0, 4) || '2082';
    const dateAd = payment_date_ad || new Date().toISOString().split('T')[0];

    // Create Voucher
    const [vcnt] = await connection.query('SELECT COUNT(*) as count FROM vouchers WHERE voucher_no LIKE ?', [`PV-${yearBs}-%`]);
    const voucher_no = `PV-${yearBs}-${String(vcnt[0].count + 1).padStart(4, '0')}`;

    // Get Thekedar Expense Category
    const [cat] = await connection.query('SELECT id FROM expense_categories WHERE code="STK"');

    const [vResult] = await connection.query(
      `INSERT INTO vouchers (
        voucher_no, voucher_type, voucher_date_bs, voucher_date_ad,
        project_id, party_id, account_id, payment_mode,
        category_id, narration,
        gross_amount, tds_percent, tds_amount, net_amount,
        bill_no, remarks, status, approved_by, approved_at, entered_by
      ) VALUES (?, 'payment', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, NOW(), ?)`,
      [
        voucher_no, payment_date_bs, dateAd,
        wo[0].project_id, wo[0].thekedar_id, account_id, payment_mode,
        cat[0]?.id || null,
        `Thekedar Payment (${payment_type}) - WO #${wo[0].work_order_no}: ${remarks || wo[0].work_description}`,
        gross, (tds / gross) * 100 || 0, tds, net,
        bill_no || null, remarks || null, req.user.id, req.user.id
      ]
    );

    const voucherId = vResult.insertId;

    // Create Thekedar Payment record
    await connection.query(
      `INSERT INTO thekedar_payments (
        work_order_id, voucher_id, payment_date_bs, payment_date_ad,
        bill_no, gross_amount, retention_amount, tds_amount, advance_adjusted,
        net_amount, payment_type, work_completion_percent, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workOrderId, voucherId, payment_date_bs, dateAd,
        bill_no || null, gross, ret, tds, advAdj,
        net, payment_type, work_completion_percent || null, remarks || null
      ]
    );

    // Update work order totals
    await connection.query(
      `UPDATE thekedar_work_orders SET
        total_paid = total_paid + ?,
        advance_paid = GREATEST(0, advance_paid - ?),
        completion_percent = COALESCE(?, completion_percent),
        status = CASE WHEN ? = 'final_bill' THEN 'completed' ELSE status END
       WHERE id = ?`,
      [net, advAdj, work_completion_percent || null, payment_type, workOrderId]
    );

    // Update account balance
    await connection.query(
      'UPDATE company_accounts SET current_balance = current_balance - ? WHERE id = ?',
      [net, account_id]
    );

    await connection.commit();
    res.status(201).json({
      success: true,
      message: `Thekedar payment of NPR ${net} recorded successfully with Voucher #${voucher_no}`
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/thekedar/statement
router.get('/statement', authenticate, async (req, res) => {
  try {
    const { thekedar_id, project_id } = req.query;
    let query = `
      SELECT py.id as thekedar_id, py.party_name, py.phone, py.pan_no,
             COUNT(wo.id) as total_contracts,
             COALESCE(SUM(wo.total_contract_amount), 0) as total_contract_value,
             COALESCE(SUM(wo.advance_paid), 0) as total_advance_holding,
             COALESCE(SUM(wo.total_paid), 0) as total_amount_paid,
             COALESCE(SUM(wo.total_contract_amount), 0) - COALESCE(SUM(wo.total_paid), 0) as balance_payable
      FROM parties py
      JOIN thekedar_work_orders wo ON py.id = wo.thekedar_id
      WHERE py.party_type = 'thekedar'
    `;
    const params = [];

    if (thekedar_id) {
      query += ` AND py.id = ?`;
      params.push(thekedar_id);
    }
    if (project_id) {
      query += ` AND wo.project_id = ?`;
      params.push(project_id);
    }

    query += ` GROUP BY py.id, py.party_name, py.phone, py.pan_no`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
