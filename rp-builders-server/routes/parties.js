const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/parties
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, search } = req.query;
    let query = `
      SELECT p.*,
        COALESCE(b.total_paid, 0) AS total_paid,
        COALESCE(b.total_received, 0) AS total_received,
        COALESCE(b.current_balance, p.opening_balance) AS current_balance
      FROM parties p
      LEFT JOIN v_party_balance b ON p.id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ` AND p.party_type = ?`;
      params.push(type);
    }
    if (search) {
      query += ` AND (p.party_name LIKE ? OR p.party_code LIKE ? OR p.phone LIKE ? OR p.pan_no LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY p.party_name ASC`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/parties
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      party_name, party_name_np, party_type, phone, secondary_phone,
      email, address, district, pan_no, vat_no,
      bank_name, bank_account_no, bank_branch,
      opening_balance, notes
    } = req.body;

    if (!party_name || !party_type) {
      return res.status(400).json({ success: false, message: 'Party name and type are required' });
    }

    // Auto-generate party_code (PRTY-001)
    const [countResult] = await pool.query('SELECT COUNT(*) as count FROM parties');
    const nextSeq = String(countResult[0].count + 1).padStart(3, '0');
    const party_code = `PRTY-${nextSeq}`;

    const [result] = await pool.query(
      `INSERT INTO parties (
        party_code, party_name, party_name_np, party_type, phone, secondary_phone,
        email, address, district, pan_no, vat_no,
        bank_name, bank_account_no, bank_branch,
        opening_balance, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        party_code, party_name, party_name_np || null, party_type, phone || null, secondary_phone || null,
        email || null, address || null, district || null, pan_no || null, vat_no || null,
        bank_name || null, bank_account_no || null, bank_branch || null,
        opening_balance || 0, notes || null, req.user.id
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Party created successfully',
      data: { id: result.insertId, party_code }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/parties/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*,
        COALESCE(b.total_paid, 0) AS total_paid,
        COALESCE(b.total_received, 0) AS total_received,
        COALESCE(b.current_balance, p.opening_balance) AS current_balance
      FROM parties p
      LEFT JOIN v_party_balance b ON p.id = b.id
      WHERE p.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Party not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/parties/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      party_name, party_name_np, party_type, phone, secondary_phone,
      email, address, district, pan_no, vat_no,
      bank_name, bank_account_no, bank_branch,
      opening_balance, is_active, notes
    } = req.body;

    await pool.query(
      `UPDATE parties SET
        party_name = ?, party_name_np = ?, party_type = ?, phone = ?, secondary_phone = ?,
        email = ?, address = ?, district = ?, pan_no = ?, vat_no = ?,
        bank_name = ?, bank_account_no = ?, bank_branch = ?,
        opening_balance = ?, is_active = ?, notes = ?
      WHERE id = ?`,
      [
        party_name, party_name_np, party_type, phone, secondary_phone,
        email, address, district, pan_no, vat_no,
        bank_name, bank_account_no, bank_branch,
        opening_balance, is_active ?? 1, notes, req.params.id
      ]
    );

    res.json({ success: true, message: 'Party updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/parties/:id/ledger - statement of accounts
router.get('/:id/ledger', authenticate, async (req, res) => {
  try {
    const { from_bs, to_bs, fiscal_year } = req.query;
    const partyId = req.params.id;

    const [party] = await pool.query('SELECT * FROM parties WHERE id = ?', [partyId]);
    if (party.length === 0) return res.status(404).json({ success: false, message: 'Party not found' });

    let query = `
      SELECT v.*, p.project_name, ec.name AS category_name, ca.account_name
      FROM vouchers v
      LEFT JOIN projects p ON v.project_id = p.id
      LEFT JOIN expense_categories ec ON v.category_id = ec.id
      LEFT JOIN company_accounts ca ON v.account_id = ca.id
      WHERE v.party_id = ? AND v.status = 'approved'
    `;
    const params = [partyId];

    if (fiscal_year) {
      query += ` AND v.fiscal_year = ?`;
      params.push(fiscal_year);
    }
    if (from_bs) {
      query += ` AND v.voucher_date_bs >= ?`;
      params.push(from_bs);
    }
    if (to_bs) {
      query += ` AND v.voucher_date_bs <= ?`;
      params.push(to_bs);
    }

    query += ` ORDER BY v.voucher_date_ad ASC, v.id ASC`;

    const [transactions] = await pool.query(query, params);

    // Calculate running balance
    let runningBalance = parseFloat(party[0].opening_balance || 0);
    const ledger = transactions.map(t => {
      const isPayment = t.voucher_type === 'payment';
      const debit = isPayment ? parseFloat(t.net_amount) : 0;
      const credit = !isPayment ? parseFloat(t.net_amount) : 0;
      runningBalance += debit - credit;
      return {
        ...t,
        debit,
        credit,
        running_balance: runningBalance
      };
    });

    res.json({
      success: true,
      data: {
        party: party[0],
        opening_balance: party[0].opening_balance,
        closing_balance: runningBalance,
        transactions: ledger
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
