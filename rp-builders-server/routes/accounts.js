const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/accounts
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT ca.*, b.bank_name, b.bank_short
      FROM company_accounts ca
      LEFT JOIN banks b ON ca.bank_id = b.id
      WHERE ca.is_active = 1
      ORDER BY ca.account_type ASC, ca.account_name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/accounts
router.post('/', authenticate, async (req, res) => {
  try {
    const { account_name, account_type, bank_id, account_number, account_holder_name, branch, opening_balance } = req.body;
    if (!account_name || !account_type) {
      return res.status(400).json({ success: false, message: 'Account name and type are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO company_accounts (
        account_name, account_type, bank_id, account_number,
        account_holder_name, branch, opening_balance, current_balance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        account_name, account_type, bank_id || null, account_number || null,
        account_holder_name || null, branch || null, opening_balance || 0, opening_balance || 0
      ]
    );

    res.status(201).json({ success: true, message: 'Account created', data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/accounts/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { account_name, account_type, bank_id, account_number, account_holder_name, branch, is_active } = req.body;
    await pool.query(
      `UPDATE company_accounts SET
        account_name = ?, account_type = ?, bank_id = ?, account_number = ?,
        account_holder_name = ?, branch = ?, is_active = ?
      WHERE id = ?`,
      [account_name, account_type, bank_id || null, account_number || null, account_holder_name || null, branch || null, is_active ?? 1, req.params.id]
    );
    res.json({ success: true, message: 'Account updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
