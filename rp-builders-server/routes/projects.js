const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/projects - list all projects with financial summary
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, type, search } = req.query;
    let query = `
      SELECT p.*,
        COALESCE(s.total_spent, 0) AS total_spent,
        COALESCE(s.budget_remaining, p.budget_total) AS budget_remaining
      FROM projects p
      LEFT JOIN v_project_expense_summary s ON p.id = s.project_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }
    if (type) {
      query += ` AND p.project_type = ?`;
      params.push(type);
    }
    if (search) {
      query += ` AND (p.project_name LIKE ? OR p.project_code LIKE ? OR p.main_client_name LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY p.id DESC`;

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/projects - create a new project
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      project_name, project_name_np, site_address, site_ward,
      site_municipality, site_district, project_type, main_client_name,
      main_client_phone, main_client_address, contract_value,
      partner_company_name, partner_company_address, rp_share_percent,
      partner_share_percent, start_date_bs, start_date_ad,
      expected_end_date_bs, expected_end_date_ad, budget_total,
      status, description
    } = req.body;

    if (!project_name) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }

    // Auto-generate project_code (e.g. RP-2082-001)
    const yearBs = (start_date_bs || '').substring(0, 4) || '2082';
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as count FROM projects WHERE project_code LIKE ?`,
      [`RP-${yearBs}-%`]
    );
    const nextSeq = String(countResult[0].count + 1).padStart(3, '0');
    const project_code = `RP-${yearBs}-${nextSeq}`;

    const [result] = await pool.query(
      `INSERT INTO projects (
        project_code, project_name, project_name_np, site_address, site_ward,
        site_municipality, site_district, project_type, main_client_name,
        main_client_phone, main_client_address, contract_value,
        partner_company_name, partner_company_address, rp_share_percent,
        partner_share_percent, start_date_bs, start_date_ad,
        expected_end_date_bs, expected_end_date_ad, budget_total,
        status, description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project_code, project_name, project_name_np || null, site_address || null, site_ward || null,
        site_municipality || null, site_district || null, project_type || 'solo', main_client_name || null,
        main_client_phone || null, main_client_address || null, contract_value || 0,
        partner_company_name || null, partner_company_address || null, rp_share_percent || 100,
        partner_share_percent || 0, start_date_bs || null, start_date_ad || null,
        expected_end_date_bs || null, expected_end_date_ad || null, budget_total || 0,
        status || 'planning', description || null, req.user.id
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { id: result.insertId, project_code }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/projects/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [projects] = await pool.query(
      `SELECT p.*, 
        COALESCE(s.total_spent, 0) AS total_spent,
        COALESCE(s.budget_remaining, p.budget_total) AS budget_remaining
      FROM projects p
      LEFT JOIN v_project_expense_summary s ON p.id = s.project_id
      WHERE p.id = ?`,
      [req.params.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, data: projects[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      project_name, project_name_np, site_address, site_ward,
      site_municipality, site_district, project_type, main_client_name,
      main_client_phone, main_client_address, contract_value,
      partner_company_name, partner_company_address, rp_share_percent,
      partner_share_percent, start_date_bs, start_date_ad,
      expected_end_date_bs, expected_end_date_ad, actual_end_date_bs, actual_end_date_ad,
      budget_total, status, description
    } = req.body;

    await pool.query(
      `UPDATE projects SET
        project_name = ?, project_name_np = ?, site_address = ?, site_ward = ?,
        site_municipality = ?, site_district = ?, project_type = ?, main_client_name = ?,
        main_client_phone = ?, main_client_address = ?, contract_value = ?,
        partner_company_name = ?, partner_company_address = ?, rp_share_percent = ?,
        partner_share_percent = ?, start_date_bs = ?, start_date_ad = ?,
        expected_end_date_bs = ?, expected_end_date_ad = ?, actual_end_date_bs = ?, actual_end_date_ad = ?,
        budget_total = ?, status = ?, description = ?
      WHERE id = ?`,
      [
        project_name, project_name_np, site_address, site_ward,
        site_municipality, site_district, project_type, main_client_name,
        main_client_phone, main_client_address, contract_value,
        partner_company_name, partner_company_address, rp_share_percent,
        partner_share_percent, start_date_bs, start_date_ad,
        expected_end_date_bs, expected_end_date_ad, actual_end_date_bs, actual_end_date_ad,
        budget_total, status, description, req.params.id
      ]
    );

    res.json({ success: true, message: 'Project updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/projects/:id - delete a project site
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;

    // Check if project exists
    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!projects.length) {
      return res.status(404).json({ success: false, message: 'Project site not found' });
    }

    // Check if vouchers exist for this project
    const [voucherCount] = await pool.query('SELECT COUNT(*) as count FROM vouchers WHERE project_id = ?', [projectId]);
    const cnt = voucherCount[0]?.count || 0;

    if (cnt > 0 && req.query.force !== 'true') {
      return res.status(400).json({
        success: false,
        hasVouchers: true,
        voucherCount: cnt,
        message: `यस साइटमा ${cnt} वटा भौचर कारोबारहरु रेकर्ड छन्। साइट मेटाउन पहिले ति भौचरहरु मेटाउनुहोस् वा पुष्टि गर्नुहोस्।`
      });
    }

    // If force delete is requested, unlink vouchers to prevent orphaned FK constraint
    if (cnt > 0 && req.query.force === 'true') {
      await pool.query('UPDATE vouchers SET project_id = NULL WHERE project_id = ?', [projectId]);
    }

    // Also unlink or remove any work orders
    await pool.query('UPDATE thekedar_work_orders SET project_id = NULL WHERE project_id = ?', [projectId]).catch(() => {});

    await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);
    res.json({ success: true, message: 'Project site deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/projects/:id/summary
router.get('/:id/summary', authenticate, async (req, res) => {
  try {
    const projectId = req.params.id;

    const [project] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (project.length === 0) return res.status(404).json({ success: false, message: 'Project not found' });

    // Category breakdown
    const [categoryBreakdown] = await pool.query(
      `SELECT ec.name AS category_name, ec.code, SUM(v.net_amount) AS total
       FROM vouchers v
       JOIN expense_categories ec ON v.category_id = ec.id
       WHERE v.project_id = ? AND v.voucher_type = 'payment' AND v.status = 'approved'
       GROUP BY ec.name, ec.code
       ORDER BY total DESC`,
      [projectId]
    );

    // Thekedar summary
    const [thekedars] = await pool.query(
      `SELECT COUNT(*) as total_thekedars,
              COALESCE(SUM(total_contract_amount), 0) as total_contract,
              COALESCE(SUM(total_paid), 0) as total_paid
       FROM thekedar_work_orders WHERE project_id = ?`,
      [projectId]
    );

    // Total spent
    const [spentResult] = await pool.query(
      `SELECT COALESCE(SUM(net_amount), 0) AS total_spent
       FROM vouchers
       WHERE project_id = ? AND voucher_type = 'payment' AND status = 'approved'`,
      [projectId]
    );

    res.json({
      success: true,
      data: {
        project: project[0],
        total_spent: spentResult[0].total_spent,
        budget_remaining: project[0].budget_total - spentResult[0].total_spent,
        categoryBreakdown,
        thekedarSummary: thekedars[0],
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/projects/:id/expenses
router.get('/:id/expenses', authenticate, async (req, res) => {
  try {
    const { category_id, fiscal_year, page = 1, limit = 50 } = req.query;
    let query = `SELECT * FROM v_voucher_summary WHERE project_id = ?`;
    const params = [req.params.id];

    if (category_id) {
      query += ` AND category_id = ?`;
      params.push(category_id);
    }
    if (fiscal_year) {
      query += ` AND fiscal_year = ?`;
      params.push(fiscal_year);
    }

    query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/projects/:id/ledger - full site-wise ledger (साइट खाता)
router.get('/:id/ledger', authenticate, async (req, res) => {
  try {
    const { from_bs, to_bs, fiscal_year } = req.query;
    const projectId = req.params.id;

    const [projects] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!projects.length) {
      return res.status(404).json({ success: false, message: 'Site / Project not found' });
    }
    const project = projects[0];

    let query = `
      SELECT * FROM v_voucher_summary
      WHERE project_id = ?
    `;
    const params = [projectId];

    if (fiscal_year) {
      query += ` AND fiscal_year = ?`;
      params.push(fiscal_year);
    }
    if (from_bs) {
      query += ` AND voucher_date_bs >= ?`;
      params.push(from_bs);
    }
    if (to_bs) {
      query += ` AND voucher_date_bs <= ?`;
      params.push(to_bs);
    }

    query += ` ORDER BY voucher_date_bs ASC, id ASC`;
    const [transactions] = await pool.query(query, params);

    // Calculate running balance
    let totalExpense = 0;
    let totalInflow = 0;
    const ledgerEntries = transactions.map((t) => {
      const net = parseFloat(t.net_amount) || 0;
      if (t.voucher_type === 'payment') {
        totalExpense += net;
      } else if (t.voucher_type === 'receipt') {
        totalInflow += net;
      }
      return {
        ...t,
        running_spent: totalExpense,
        budget_remaining: (parseFloat(project.budget_total) || 0) - totalExpense,
      };
    });

    res.json({
      success: true,
      data: {
        project,
        summary: {
          budget_total: parseFloat(project.budget_total) || 0,
          contract_value: parseFloat(project.contract_value) || 0,
          total_expense: totalExpense,
          total_inflow: totalInflow,
          budget_remaining: (parseFloat(project.budget_total) || 0) - totalExpense,
          percent_used: project.budget_total > 0 ? Math.round((totalExpense / project.budget_total) * 100) : 0,
        },
        transactions: ledgerEntries
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
