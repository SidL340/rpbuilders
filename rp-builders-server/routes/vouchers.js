const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

function calculateFiscalYear(bsDate) {
  if (!bsDate) return '2083/84';
  const parts = bsDate.split('-');
  const y = parseInt(parts[0], 10) || 2083;
  const m = parseInt(parts[1], 10) || 5;
  if (m >= 4) {
    return `${y}/${String(y + 1).slice(-2)}`;
  }
  return `${y - 1}/${String(y).slice(-2)}`;
}

// GET /api/vouchers - list with rich filters & pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      project_id, party_id, type, status, category_id,
      from_date_bs, to_date_bs, fiscal_year, payment_mode, search,
      page = 1, limit = 50
    } = req.query;

    let query = `SELECT * FROM v_voucher_summary WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM vouchers v WHERE 1=1`;
    const params = [];
    const countParams = [];

    if (fiscal_year) {
      query += ` AND fiscal_year = ?`;
      countQuery += ` AND v.fiscal_year = ?`;
      params.push(fiscal_year);
      countParams.push(fiscal_year);
    }
    if (project_id) {
      query += ` AND project_id = ?`;
      countQuery += ` AND v.project_id = ?`;
      params.push(project_id);
      countParams.push(project_id);
    }
    if (party_id) {
      query += ` AND party_id = ?`;
      countQuery += ` AND v.party_id = ?`;
      params.push(party_id);
      countParams.push(party_id);
    }
    if (type) {
      query += ` AND voucher_type = ?`;
      countQuery += ` AND v.voucher_type = ?`;
      params.push(type);
      countParams.push(type);
    }
    if (status) {
      query += ` AND status = ?`;
      countQuery += ` AND v.status = ?`;
      params.push(status);
      countParams.push(status);
    }
    if (payment_mode) {
      query += ` AND payment_mode = ?`;
      countQuery += ` AND v.payment_mode = ?`;
      params.push(payment_mode);
      countParams.push(payment_mode);
    }
    if (category_id) {
      query += ` AND category_id = ?`;
      countQuery += ` AND v.category_id = ?`;
      params.push(category_id);
      countParams.push(category_id);
    }
    if (from_date_bs) {
      query += ` AND voucher_date_bs >= ?`;
      countQuery += ` AND v.voucher_date_bs >= ?`;
      params.push(from_date_bs);
      countParams.push(from_date_bs);
    }
    if (to_date_bs) {
      query += ` AND voucher_date_bs <= ?`;
      countQuery += ` AND v.voucher_date_bs <= ?`;
      params.push(to_date_bs);
      countParams.push(to_date_bs);
    }
    if (search) {
      query += ` AND (voucher_no LIKE ? OR narration LIKE ? OR party_name LIKE ? OR cheque_no LIKE ? OR cash_receiver_name LIKE ?)`;
      countQuery += ` AND (v.voucher_no LIKE ? OR v.narration LIKE ? OR v.cheque_no LIKE ? OR v.cash_receiver_name LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
      countParams.push(s, s, s, s);
    }

    // Get total count
    const [countResult] = await pool.query(countQuery, countParams);
    const total = countResult[0].total;

    query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        vouchers: rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/vouchers/daybook - day book for a specific date or date range
router.get('/daybook', authenticate, async (req, res) => {
  try {
    const { date_bs, project_id, type, fiscal_year } = req.query;
    if (!date_bs && !fiscal_year) {
      return res.status(400).json({ success: false, message: 'Date (BS) or Fiscal Year is required' });
    }

    let query = `SELECT * FROM v_voucher_summary WHERE 1=1`;
    const params = [];

    if (date_bs) {
      query += ` AND voucher_date_bs = ?`;
      params.push(date_bs);
    }
    if (fiscal_year) {
      query += ` AND fiscal_year = ?`;
      params.push(fiscal_year);
    }
    if (project_id) {
      query += ` AND project_id = ?`;
      params.push(project_id);
    }
    if (type) {
      query += ` AND voucher_type = ?`;
      params.push(type);
    }

    query += ` ORDER BY id ASC`;
    const [rows] = await pool.query(query, params);

    // Calculate totals
    let totalDebit = 0;
    let totalCredit = 0;
    rows.forEach(r => {
      if (r.voucher_type === 'payment') totalDebit += parseFloat(r.net_amount || 0);
      if (r.voucher_type === 'receipt') totalCredit += parseFloat(r.net_amount || 0);
    });

    res.json({
      success: true,
      data: {
        date_bs,
        vouchers: rows,
        summary: {
          totalDebit,
          totalCredit,
          netFlow: totalCredit - totalDebit,
          count: rows.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/vouchers - create voucher
router.post('/', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const {
      voucher_type = 'payment',
      voucher_date_bs,
      voucher_date_ad,
      fiscal_year,
      project_id,
      party_id,
      account_id,
      fund_source_id,
      payment_mode = 'cash',
      cheque_no,
      cheque_date_bs,
      bank_name,
      bank_voucher_no,
      cash_receiver_name,
      cash_receiver_phone,
      cash_handed_by,
      reference_no,
      category_id,
      narration,
      gross_amount = 0,
      tds_percent = 0,
      bill_no,
      bill_image_path,
      remarks,
      auto_approve = true // Default auto-approve for streamlined builder daily entry
    } = req.body;

    if (!voucher_date_bs || !account_id || !narration || !gross_amount) {
      return res.status(400).json({
        success: false,
        message: 'Date, account, narration, and gross amount are required'
      });
    }

    const computedFiscalYear = fiscal_year || calculateFiscalYear(voucher_date_bs);

    // Auto-generate voucher_no: PV-2083-0001
    const prefixMap = {
      payment: 'PV', receipt: 'RV', journal: 'JV',
      contra: 'CV', debit_note: 'DN', credit_note: 'CN'
    };
    const prefix = prefixMap[voucher_type] || 'VR';
    const yearBs = (voucher_date_bs || '').substring(0, 4) || '2083';

    const [cntRes] = await connection.query(
      `SELECT COUNT(*) as count FROM vouchers WHERE voucher_no LIKE ?`,
      [`${prefix}-${yearBs}-%`]
    );
    const nextSeq = String((cntRes[0]?.count || 0) + 1).padStart(4, '0');
    const voucher_no = `${prefix}-${yearBs}-${nextSeq}`;

    // Calculations
    const gross = parseFloat(gross_amount);
    const tdsPct = parseFloat(tds_percent || 0);
    const tdsAmount = Math.round((gross * tdsPct / 100) * 100) / 100;
    const netAmount = gross - tdsAmount;

    // Status
    const initialStatus = auto_approve ? 'approved' : 'draft';
    const approvedBy = auto_approve ? req.user.id : null;
    const approvedAt = auto_approve ? new Date().toISOString() : null;

    // Convert date AD if missing
    const dateAd = voucher_date_ad || new Date().toISOString().split('T')[0];

    const [insertResult] = await connection.query(
      `INSERT INTO vouchers (
        voucher_no, voucher_type, voucher_date_bs, voucher_date_ad, fiscal_year,
        project_id, party_id, account_id, fund_source_id,
        payment_mode, cheque_no, cheque_date_bs, bank_name, bank_voucher_no,
        cash_receiver_name, cash_receiver_phone, cash_handed_by, reference_no,
        category_id, narration,
        gross_amount, tds_percent, tds_amount, net_amount,
        status, approved_by, approved_at,
        bill_image_path, bill_no, remarks, entered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        voucher_no, voucher_type, voucher_date_bs, dateAd, computedFiscalYear,
        project_id || null, party_id || null, account_id, fund_source_id || null,
        payment_mode, cheque_no || null, cheque_date_bs || null, bank_name || null, bank_voucher_no || null,
        cash_receiver_name || null, cash_receiver_phone || null, cash_handed_by || null, reference_no || null,
        category_id || null, narration,
        gross, tdsPct, tdsAmount, netAmount,
        initialStatus, approvedBy, approvedAt,
        bill_image_path || null, bill_no || null, remarks || null, req.user.id
      ]
    );

    const voucherId = insertResult.insertId;

    // Update account balance
    if (initialStatus === 'approved') {
      if (voucher_type === 'payment') {
        await connection.query(
          'UPDATE company_accounts SET current_balance = current_balance - ? WHERE id = ?',
          [netAmount, account_id]
        );
      } else if (voucher_type === 'receipt') {
        await connection.query(
          'UPDATE company_accounts SET current_balance = current_balance + ? WHERE id = ?',
          [netAmount, account_id]
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `Voucher ${voucher_no} created successfully`,
      data: {
        id: voucherId,
        voucher_no,
        fiscal_year: computedFiscalYear,
        net_amount: netAmount
      }
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/vouchers/:id - single voucher
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM v_voucher_summary WHERE id = ?`, [req.params.id]);
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Voucher not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/vouchers/:id/approve - approve voucher
router.put('/:id/approve', authenticate, authorize('manager', 'super_admin'), async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [vouchers] = await connection.query('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
    if (!vouchers.length) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }
    const voucher = vouchers[0];
    if (voucher.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Voucher is already approved' });
    }

    await connection.query(
      'UPDATE vouchers SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?',
      ['approved', req.user.id, new Date().toISOString(), req.params.id]
    );

    if (voucher.voucher_type === 'payment') {
      await connection.query(
        'UPDATE company_accounts SET current_balance = current_balance - ? WHERE id = ?',
        [voucher.net_amount, voucher.account_id]
      );
    } else if (voucher.voucher_type === 'receipt') {
      await connection.query(
        'UPDATE company_accounts SET current_balance = current_balance + ? WHERE id = ?',
        [voucher.net_amount, voucher.account_id]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Voucher approved successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/vouchers/:id/cancel - cancel voucher
router.put('/:id/cancel', authenticate, authorize('manager', 'super_admin'), async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [vouchers] = await connection.query('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
    if (!vouchers.length) {
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }
    const voucher = vouchers[0];
    if (voucher.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Voucher is already cancelled' });
    }

    await connection.query('UPDATE vouchers SET status = ? WHERE id = ?', ['cancelled', req.params.id]);

    if (voucher.status === 'approved') {
      if (voucher.voucher_type === 'payment') {
        await connection.query(
          'UPDATE company_accounts SET current_balance = current_balance + ? WHERE id = ?',
          [voucher.net_amount, voucher.account_id]
        );
      } else if (voucher.voucher_type === 'receipt') {
        await connection.query(
          'UPDATE company_accounts SET current_balance = current_balance - ? WHERE id = ?',
          [voucher.net_amount, voucher.account_id]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Voucher cancelled successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/vouchers/:id - edit voucher entry with automatic account balance re-balancing
router.put('/:id', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [vouchers] = await connection.query('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
    if (!vouchers.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }
    const oldVoucher = vouchers[0];

    const {
      voucher_type,
      voucher_date_bs,
      voucher_date_ad,
      fiscal_year,
      project_id,
      party_id,
      account_id,
      payment_mode,
      cheque_no,
      cheque_date_bs,
      bank_name,
      bank_voucher_no,
      cash_receiver_name,
      cash_receiver_phone,
      cash_handed_by,
      reference_no,
      category_id,
      narration,
      gross_amount,
      tds_percent,
      bill_no,
      bill_image_path,
      remarks,
      status
    } = req.body;

    const vType = voucher_type || oldVoucher.voucher_type;
    const gross = gross_amount !== undefined ? parseFloat(gross_amount) : parseFloat(oldVoucher.gross_amount);
    const tdsPct = tds_percent !== undefined ? parseFloat(tds_percent) : parseFloat(oldVoucher.tds_percent || 0);
    const tdsAmount = Math.round((gross * tdsPct / 100) * 100) / 100;
    const netAmount = gross - tdsAmount;
    const vDateBs = voucher_date_bs || oldVoucher.voucher_date_bs;
    const computedFY = fiscal_year || calculateFiscalYear(vDateBs);
    const vDateAd = voucher_date_ad || oldVoucher.voucher_date_ad;
    const targetAccountId = account_id || oldVoucher.account_id;
    const targetStatus = status || oldVoucher.status;

    // 1. If old voucher was approved, reverse old balance impact
    if (oldVoucher.status === 'approved') {
      if (oldVoucher.voucher_type === 'payment') {
        await connection.query(
          'UPDATE company_accounts SET current_balance = current_balance + ? WHERE id = ?',
          [oldVoucher.net_amount, oldVoucher.account_id]
        );
      } else if (oldVoucher.voucher_type === 'receipt') {
        await connection.query(
          'UPDATE company_accounts SET current_balance = current_balance - ? WHERE id = ?',
          [oldVoucher.net_amount, oldVoucher.account_id]
        );
      }
    }

    // 2. Update the voucher row
    await connection.query(
      `UPDATE vouchers SET
        voucher_type = ?, voucher_date_bs = ?, voucher_date_ad = ?, fiscal_year = ?,
        project_id = ?, party_id = ?, account_id = ?, payment_mode = ?,
        cheque_no = ?, cheque_date_bs = ?, bank_name = ?, bank_voucher_no = ?,
        cash_receiver_name = ?, cash_receiver_phone = ?, cash_handed_by = ?, reference_no = ?,
        category_id = ?, narration = ?, gross_amount = ?, tds_percent = ?, tds_amount = ?, net_amount = ?,
        bill_no = ?, bill_image_path = ?, remarks = ?, status = ?
      WHERE id = ?`,
      [
        vType, vDateBs, vDateAd, computedFY,
        project_id !== undefined ? (project_id || null) : oldVoucher.project_id,
        party_id !== undefined ? (party_id || null) : oldVoucher.party_id,
        targetAccountId,
        payment_mode || oldVoucher.payment_mode,
        cheque_no !== undefined ? cheque_no : oldVoucher.cheque_no,
        cheque_date_bs !== undefined ? cheque_date_bs : oldVoucher.cheque_date_bs,
        bank_name !== undefined ? bank_name : oldVoucher.bank_name,
        bank_voucher_no !== undefined ? bank_voucher_no : oldVoucher.bank_voucher_no,
        cash_receiver_name !== undefined ? cash_receiver_name : oldVoucher.cash_receiver_name,
        cash_receiver_phone !== undefined ? cash_receiver_phone : oldVoucher.cash_receiver_phone,
        cash_handed_by !== undefined ? cash_handed_by : oldVoucher.cash_handed_by,
        reference_no !== undefined ? reference_no : oldVoucher.reference_no,
        category_id !== undefined ? (category_id || null) : oldVoucher.category_id,
        narration !== undefined ? narration : oldVoucher.narration,
        gross, tdsPct, tdsAmount, netAmount,
        bill_no !== undefined ? bill_no : oldVoucher.bill_no,
        bill_image_path !== undefined ? bill_image_path : oldVoucher.bill_image_path,
        remarks !== undefined ? remarks : oldVoucher.remarks,
        targetStatus,
        req.params.id
      ]
    );

    // 3. If voucher remains or is set to approved, apply new balance impact
    if (targetStatus === 'approved') {
      if (vType === 'payment') {
        await connection.query(
          'UPDATE company_accounts SET current_balance = current_balance - ? WHERE id = ?',
          [netAmount, targetAccountId]
        );
      } else if (vType === 'receipt') {
        await connection.query(
          'UPDATE company_accounts SET current_balance = current_balance + ? WHERE id = ?',
          [netAmount, targetAccountId]
        );
      }
    }

    await connection.commit();
    res.json({
      success: true,
      message: 'Voucher updated successfully',
      data: { id: req.params.id, net_amount: netAmount }
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/vouchers/:id - delete voucher entry with account balance reversal
router.delete('/:id', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const [vouchers] = await connection.query('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
    if (!vouchers.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Voucher not found' });
    }
    const voucher = vouchers[0];

    // If approved, reverse impact on account balance
    if (voucher.status === 'approved') {
      if (voucher.voucher_type === 'payment') {
        await connection.query(
          'UPDATE company_accounts SET current_balance = current_balance + ? WHERE id = ?',
          [voucher.net_amount, voucher.account_id]
        );
      } else if (voucher.voucher_type === 'receipt') {
        await connection.query(
          'UPDATE company_accounts SET current_balance = current_balance - ? WHERE id = ?',
          [voucher.net_amount, voucher.account_id]
        );
      }
    }

    await connection.query('DELETE FROM vouchers WHERE id = ?', [req.params.id]);
    await connection.commit();

    res.json({ success: true, message: 'Voucher deleted successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
