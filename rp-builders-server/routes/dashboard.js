const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [projectCount] = await pool.query("SELECT COUNT(*) as active_projects FROM projects WHERE status = 'active'");
    const [pendingVouchers] = await pool.query("SELECT COUNT(*) as pending_approvals FROM vouchers WHERE status = 'draft'");
    const [totalSpent] = await pool.query("SELECT COALESCE(SUM(net_amount), 0) as total_expenses FROM vouchers WHERE voucher_type='payment' AND status='approved'");
    const [cashBalance] = await pool.query("SELECT COALESCE(SUM(current_balance), 0) as cash_balance FROM company_accounts WHERE is_active = 1");
    const [thekedarDue] = await pool.query("SELECT COALESCE(SUM(total_contract_amount - total_paid), 0) as thekedar_payable FROM thekedar_work_orders WHERE status = 'active'");
    const [fundsReceived] = await pool.query("SELECT COALESCE(SUM(amount), 0) as total_funds FROM fund_receipts");

    res.json({
      success: true,
      data: {
        active_projects: projectCount[0].active_projects,
        pending_approvals: pendingVouchers[0].pending_approvals,
        total_expenses: totalSpent[0].total_expenses,
        cash_balance: cashBalance[0].cash_balance,
        thekedar_payable: thekedarDue[0].thekedar_payable,
        total_funds_received: fundsReceived[0].total_funds
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/monthly-expenses
router.get('/monthly-expenses', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        LEFT(voucher_date_bs, 7) as month_bs,
        SUM(net_amount) as total_expense
      FROM vouchers
      WHERE voucher_type = 'payment' AND status = 'approved'
      GROUP BY LEFT(voucher_date_bs, 7)
      ORDER BY month_bs ASC
      LIMIT 12
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/category-breakdown
router.get('/category-breakdown', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        COALESCE(parent.name, ec.name) as category_name,
        SUM(v.net_amount) as total
      FROM vouchers v
      JOIN expense_categories ec ON v.category_id = ec.id
      LEFT JOIN expense_categories parent ON ec.parent_id = parent.id
      WHERE v.voucher_type = 'payment' AND v.status = 'approved'
      GROUP BY COALESCE(parent.name, ec.name)
      ORDER BY total DESC
      LIMIT 6
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/project-overview
router.get('/project-overview', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id, p.project_code, p.project_name, p.project_type, p.status, p.budget_total,
        COALESCE(s.total_spent, 0) as total_spent,
        CASE WHEN p.budget_total > 0 THEN (COALESCE(s.total_spent, 0) / p.budget_total) * 100 ELSE 0 END as percent_used
      FROM projects p
      LEFT JOIN v_project_expense_summary s ON p.id = s.project_id
      ORDER BY p.status = 'active' DESC, p.id DESC
      LIMIT 8
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/dashboard/recent-vouchers
router.get('/recent-vouchers', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM v_voucher_summary ORDER BY id DESC LIMIT 10
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
