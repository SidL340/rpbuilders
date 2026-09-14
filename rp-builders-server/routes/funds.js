const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/funds/sources
router.get('/sources', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT fs.*, p.party_name, p.phone as party_phone,
             COALESCE(SUM(fr.amount), 0) AS total_received,
             fs.total_sanctioned_amount - COALESCE(SUM(fr.amount), 0) AS remaining_sanctioned
      FROM fund_sources fs
      LEFT JOIN parties p ON fs.party_id = p.id
      LEFT JOIN fund_receipts fr ON fs.id = fr.fund_source_id
      WHERE fs.is_active = 1
      GROUP BY fs.id
      ORDER BY fs.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/funds/sources
router.post('/sources', authenticate, async (req, res) => {
  try {
    const { source_name, source_type, party_id, total_sanctioned_amount, interest_rate, notes } = req.body;
    if (!source_name || !source_type) {
      return res.status(400).json({ success: false, message: 'Source name and type are required' });
    }

    const [cnt] = await pool.query('SELECT COUNT(*) as count FROM fund_sources');
    const source_code = `FS-${String(cnt[0].count + 1).padStart(3, '0')}`;

    const [result] = await pool.query(
      `INSERT INTO fund_sources (
        source_code, source_name, source_type, party_id,
        total_sanctioned_amount, interest_rate, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [source_code, source_name, source_type, party_id || null, total_sanctioned_amount || 0, interest_rate || 0, notes || null]
    );

    res.status(201).json({ success: true, message: 'Fund source created', data: { id: result.insertId, source_code } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/funds/receipts
router.get('/receipts', authenticate, async (req, res) => {
  try {
    const { source_id, from_date_bs, to_date_bs } = req.query;
    let query = `
      SELECT fr.*, fs.source_name, fs.source_type, ca.account_name, u.name as received_by_name
      FROM fund_receipts fr
      JOIN fund_sources fs ON fr.fund_source_id = fs.id
      LEFT JOIN company_accounts ca ON fr.account_id = ca.id
      LEFT JOIN users u ON fr.received_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (source_id) {
      query += ` AND fr.fund_source_id = ?`;
      params.push(source_id);
    }
    if (from_date_bs) {
      query += ` AND fr.receipt_date_bs >= ?`;
      params.push(from_date_bs);
    }
    if (to_date_bs) {
      query += ` AND fr.receipt_date_bs <= ?`;
      params.push(to_date_bs);
    }

    query += ` ORDER BY fr.id DESC`;
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/funds/receipts - receive money & create auto-receipt voucher
router.post('/receipts', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const {
      fund_source_id, receipt_date_bs, receipt_date_ad,
      amount, payment_mode = 'cash', account_id,
      bank_ref, cheque_no, description
    } = req.body;

    if (!fund_source_id || !receipt_date_bs || !amount || !account_id) {
      return res.status(400).json({ success: false, message: 'Source, date, amount, and account are required' });
    }

    const yearBs = receipt_date_bs.substring(0, 4) || '2082';
    const [cnt] = await connection.query('SELECT COUNT(*) as count FROM fund_receipts WHERE receipt_no LIKE ?', [`FR-${yearBs}-%`]);
    const receipt_no = `FR-${yearBs}-${String(cnt[0].count + 1).padStart(4, '0')}`;

    const dateAd = receipt_date_ad || new Date().toISOString().split('T')[0];

    const [frResult] = await connection.query(
      `INSERT INTO fund_receipts (
        receipt_no, receipt_date_bs, receipt_date_ad, fund_source_id,
        amount, payment_mode, account_id, bank_ref, cheque_no, description, received_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receipt_no, receipt_date_bs, dateAd, fund_source_id,
        amount, payment_mode, account_id, bank_ref || null, cheque_no || null,
        description || null, req.user.id
      ]
    );

    // Update account balance
    await connection.query(
      'UPDATE company_accounts SET current_balance = current_balance + ? WHERE id = ?',
      [amount, account_id]
    );

    // Also create a Receipt Voucher automatically for bookkeeping
    const [vcnt] = await connection.query('SELECT COUNT(*) as count FROM vouchers WHERE voucher_no LIKE ?', [`RV-${yearBs}-%`]);
    const voucher_no = `RV-${yearBs}-${String(vcnt[0].count + 1).padStart(4, '0')}`;

    const [fs] = await connection.query('SELECT * FROM fund_sources WHERE id = ?', [fund_source_id]);

    await connection.query(
      `INSERT INTO vouchers (
        voucher_no, voucher_type, voucher_date_bs, voucher_date_ad,
        party_id, account_id, fund_source_id, payment_mode, cheque_no, reference_no,
        narration, gross_amount, tds_percent, tds_amount, net_amount,
        status, approved_by, approved_at, entered_by
      ) VALUES (?, 'receipt', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'approved', ?, NOW(), ?)`,
      [
        voucher_no, receipt_date_bs, dateAd,
        fs[0]?.party_id || null, account_id, fund_source_id,
        payment_mode, cheque_no || null, bank_ref || null,
        description || `Fund receipt from ${fs[0]?.source_name || 'Source'}`,
        amount, amount, req.user.id, req.user.id
      ]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `Fund receipt ${receipt_no} recorded successfully`,
      data: { id: frResult.insertId, receipt_no }
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/funds/summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const [received] = await pool.query('SELECT COALESCE(SUM(amount), 0) AS total_funds_received FROM fund_receipts');
    const [spent] = await pool.query('SELECT COALESCE(SUM(net_amount), 0) AS total_expense FROM vouchers WHERE voucher_type="payment" AND status="approved"');
    const [cashBank] = await pool.query('SELECT COALESCE(SUM(current_balance), 0) AS total_balance FROM company_accounts WHERE is_active=1');

    const [byType] = await pool.query(`
      SELECT fs.source_type, SUM(fr.amount) as total
      FROM fund_receipts fr
      JOIN fund_sources fs ON fr.fund_source_id = fs.id
      GROUP BY fs.source_type
    `);

    res.json({
      success: true,
      data: {
        total_funds_received: received[0].total_funds_received,
        total_expense: spent[0].total_expense,
        total_balance: cashBank[0].total_balance,
        by_source_type: byType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
