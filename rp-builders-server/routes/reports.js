const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/reports/daybook - day book report
router.get('/daybook', authenticate, async (req, res) => {
  try {
    const { from_date_bs, to_date_bs, fiscal_year, project_id, type } = req.query;
    let query = `SELECT * FROM v_voucher_summary WHERE 1=1`;
    const params = [];

    if (fiscal_year) { query += ` AND fiscal_year = ?`; params.push(fiscal_year); }
    if (from_date_bs) { query += ` AND voucher_date_bs >= ?`; params.push(from_date_bs); }
    if (to_date_bs) { query += ` AND voucher_date_bs <= ?`; params.push(to_date_bs); }
    if (project_id) { query += ` AND project_id = ?`; params.push(project_id); }
    if (type) { query += ` AND voucher_type = ?`; params.push(type); }

    query += ` ORDER BY voucher_date_bs ASC, id ASC`;
    const [rows] = await pool.query(query, params);

    // Group by date
    const byDate = {};
    let grandDebit = 0;
    let grandCredit = 0;

    rows.forEach(r => {
      if (!byDate[r.voucher_date_bs]) {
        byDate[r.voucher_date_bs] = { date_bs: r.voucher_date_bs, vouchers: [], totalDebit: 0, totalCredit: 0 };
      }
      const debit = r.voucher_type === 'payment' ? parseFloat(r.net_amount) : 0;
      const credit = r.voucher_type === 'receipt' ? parseFloat(r.net_amount) : 0;
      byDate[r.voucher_date_bs].vouchers.push(r);
      byDate[r.voucher_date_bs].totalDebit += debit;
      byDate[r.voucher_date_bs].totalCredit += credit;
      grandDebit += debit;
      grandCredit += credit;
    });

    res.json({
      success: true,
      data: {
        days: Object.values(byDate),
        grandTotals: { totalDebit: grandDebit, totalCredit: grandCredit, netFlow: grandCredit - grandDebit }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/reports/expense-summary - by category
router.get('/expense-summary', authenticate, async (req, res) => {
  try {
    const { project_id, fiscal_year, from_date_bs, to_date_bs } = req.query;
    let query = `
      SELECT 
        ec.id as category_id,
        COALESCE(parent.name, ec.name) as main_category,
        ec.name as category_name,
        ec.code,
        COUNT(v.id) as transaction_count,
        COALESCE(SUM(v.net_amount), 0) as total_amount
      FROM expense_categories ec
      LEFT JOIN expense_categories parent ON ec.parent_id = parent.id
      JOIN vouchers v ON v.category_id = ec.id
      WHERE v.voucher_type = 'payment' AND v.status = 'approved'
    `;
    const params = [];

    if (fiscal_year) { query += ` AND v.fiscal_year = ?`; params.push(fiscal_year); }
    if (project_id) { query += ` AND v.project_id = ?`; params.push(project_id); }
    if (from_date_bs) { query += ` AND v.voucher_date_bs >= ?`; params.push(from_date_bs); }
    if (to_date_bs) { query += ` AND v.voucher_date_bs <= ?`; params.push(to_date_bs); }

    query += ` GROUP BY ec.id, parent.name, ec.name, ec.code ORDER BY total_amount DESC`;

    const [rows] = await pool.query(query, params);
    const grandTotal = rows.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);

    const withPercent = rows.map(r => ({
      ...r,
      percent: grandTotal > 0 ? ((parseFloat(r.total_amount) / grandTotal) * 100).toFixed(2) : 0
    }));

    res.json({ success: true, data: { items: withPercent, grandTotal } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/reports/profit-loss - project-wise P&L
router.get('/profit-loss', authenticate, async (req, res) => {
  try {
    const { project_id, fiscal_year } = req.query;
    let query = `SELECT * FROM projects WHERE 1=1`;
    const params = [];
    if (project_id) { query += ` AND id = ?`; params.push(project_id); }

    const [projects] = await pool.query(query, params);

    const results = [];
    for (const p of projects) {
      // Total revenue (contract value or receipts)
      let recQuery = `SELECT COALESCE(SUM(net_amount), 0) as total_received 
                      FROM vouchers WHERE project_id = ? AND voucher_type = 'receipt' AND status = 'approved'`;
      const recParams = [p.id];
      if (fiscal_year) {
        recQuery += ` AND fiscal_year = ?`;
        recParams.push(fiscal_year);
      }
      const [income] = await pool.query(recQuery, recParams);

      // Expenses by category
      let expQuery = `SELECT ec.name as category_name, SUM(v.net_amount) as amount
                      FROM vouchers v
                      JOIN expense_categories ec ON v.category_id = ec.id
                      WHERE v.project_id = ? AND v.voucher_type = 'payment' AND v.status = 'approved'`;
      const expParams = [p.id];
      if (fiscal_year) {
        expQuery += ` AND v.fiscal_year = ?`;
        expParams.push(fiscal_year);
      }
      expQuery += ` GROUP BY ec.name ORDER BY amount DESC`;
      const [expenses] = await pool.query(expQuery, expParams);

      const totalExpense = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const contractVal = parseFloat(p.contract_value || 0);
      const totalRec = parseFloat(income[0].total_received || 0);

      results.push({
        project_id: p.id,
        project_name: p.project_name,
        project_code: p.project_code,
        project_type: p.project_type,
        contract_value: contractVal,
        total_received: totalRec,
        expenses,
        total_expense: totalExpense,
        gross_profit: contractVal - totalExpense,
        cash_margin: totalRec - totalExpense,
        margin_percent: contractVal > 0 ? (((contractVal - totalExpense) / contractVal) * 100).toFixed(2) : 0
      });
    }

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/reports/trial-balance
router.get('/trial-balance', authenticate, async (req, res) => {
  try {
    const { fiscal_year } = req.query;
    const [accounts] = await pool.query('SELECT * FROM chart_of_accounts WHERE is_active = 1 ORDER BY account_code ASC');

    let vQuery = `SELECT voucher_type, COALESCE(SUM(net_amount), 0) as total FROM vouchers WHERE status = 'approved'`;
    const vParams = [];
    if (fiscal_year) {
      vQuery += ` AND fiscal_year = ?`;
      vParams.push(fiscal_year);
    }
    vQuery += ` GROUP BY voucher_type`;

    const [voucherTotals] = await pool.query(vQuery, vParams);

    const [accountBalances] = await pool.query(`
      SELECT ca.account_name, ca.account_type, ca.current_balance
      FROM company_accounts ca
      WHERE ca.is_active = 1
    `);

    let totalDebit = 0;
    let totalCredit = 0;

    const list = accounts.map(a => {
      let debit = 0;
      let credit = 0;

      if (a.account_type === 'asset') {
        const matchingAcc = accountBalances.find(ca => ca.account_name.toLowerCase().includes(a.account_name.toLowerCase()));
        debit = matchingAcc ? parseFloat(matchingAcc.current_balance) : 0;
      } else if (a.account_type === 'expense') {
        const paymentTot = voucherTotals.find(v => v.voucher_type === 'payment');
        debit = a.account_code === '5000' && paymentTot ? parseFloat(paymentTot.total) : 0;
      } else if (a.account_type === 'income') {
        const recTot = voucherTotals.find(v => v.voucher_type === 'receipt');
        credit = a.account_code === '4000' && recTot ? parseFloat(recTot.total) : 0;
      }

      totalDebit += debit;
      totalCredit += credit;

      return {
        ...a,
        debit,
        credit
      };
    });

    res.json({
      success: true,
      data: {
        accounts: list,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
