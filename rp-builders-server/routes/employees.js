const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/employees
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM employees ORDER BY is_active DESC, name ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/employees
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, name_np, designation, department, phone, address, join_date_bs, join_date_ad, monthly_salary, daily_rate, bank_name, bank_account, pan_no } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const [cnt] = await pool.query('SELECT COUNT(*) as count FROM employees');
    const emp_code = `EMP-${String(cnt[0].count + 1).padStart(3, '0')}`;

    const [result] = await pool.query(
      `INSERT INTO employees (emp_code, name, name_np, designation, department, phone, address, join_date_bs, join_date_ad, monthly_salary, daily_rate, bank_name, bank_account, pan_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [emp_code, name, name_np || null, designation || null, department || null, phone || null, address || null, join_date_bs || null, join_date_ad || null, monthly_salary || 0, daily_rate || 0, bank_name || null, bank_account || null, pan_no || null]
    );

    res.status(201).json({ success: true, message: 'Employee added', data: { id: result.insertId, emp_code } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/employees/labour-attendance - record daily muster roll
router.post('/labour-attendance', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { project_id, attendance_date_bs, attendance_date_ad, records = [], account_id, payment_mode = 'cash' } = req.body;
    if (!project_id || !attendance_date_bs || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Project, date, and attendance records are required' });
    }

    const dateAd = attendance_date_ad || new Date().toISOString().split('T')[0];
    let totalLabourCost = 0;

    for (const rec of records) {
      const lineTotal = (parseFloat(rec.quantity || 1) * parseFloat(rec.days_fraction || 1)) * parseFloat(rec.daily_rate);
      totalLabourCost += lineTotal;

      await connection.query(
        `INSERT INTO daily_labour_attendance (
          project_id, attendance_date_bs, attendance_date_ad,
          worker_name, worker_type, quantity, days_fraction,
          daily_rate, total_amount, remarks, entered_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project_id, attendance_date_bs, dateAd,
          rec.worker_name || 'Labour Group', rec.worker_type || 'unskilled',
          rec.quantity || 1, rec.days_fraction || 1, rec.daily_rate,
          lineTotal, rec.remarks || null, req.user.id
        ]
      );
    }

    // Optionally auto-create payment voucher if account selected
    if (account_id && totalLabourCost > 0) {
      const yearBs = attendance_date_bs.substring(0, 4) || '2082';
      const [vcnt] = await connection.query('SELECT COUNT(*) as count FROM vouchers WHERE voucher_no LIKE ?', [`PV-${yearBs}-%`]);
      const voucher_no = `PV-${yearBs}-${String(vcnt[0].count + 1).padStart(4, '0')}`;

      const [cat] = await connection.query('SELECT id FROM expense_categories WHERE code="SLW"');

      await connection.query(
        `INSERT INTO vouchers (
          voucher_no, voucher_type, voucher_date_bs, voucher_date_ad,
          project_id, account_id, payment_mode,
          category_id, narration, gross_amount, tds_percent, tds_amount, net_amount,
          status, approved_by, approved_at, entered_by
        ) VALUES (?, 'payment', ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'approved', ?, NOW(), ?)`,
        [
          voucher_no, attendance_date_bs, dateAd,
          project_id, account_id, payment_mode,
          cat[0]?.id || null,
          `Daily Labour Wage Payment (${records.length} items) - Date ${attendance_date_bs}`,
          totalLabourCost, totalLabourCost, req.user.id, req.user.id
        ]
      );

      await connection.query('UPDATE company_accounts SET current_balance = current_balance - ? WHERE id = ?', [totalLabourCost, account_id]);
    }

    await connection.commit();
    res.status(201).json({ success: true, message: `Labour attendance logged (${records.length} records, Total: NPR ${totalLabourCost})` });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/employees/labour-attendance
router.get('/labour-attendance', authenticate, async (req, res) => {
  try {
    const { project_id, date_bs, from_date_bs, to_date_bs } = req.query;
    let query = `
      SELECT dla.*, p.project_name
      FROM daily_labour_attendance dla
      JOIN projects p ON dla.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) { query += ` AND dla.project_id = ?`; params.push(project_id); }
    if (date_bs) { query += ` AND dla.attendance_date_bs = ?`; params.push(date_bs); }
    if (from_date_bs) { query += ` AND dla.attendance_date_bs >= ?`; params.push(from_date_bs); }
    if (to_date_bs) { query += ` AND dla.attendance_date_bs <= ?`; params.push(to_date_bs); }

    query += ` ORDER BY dla.id DESC`;
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/employees/salary-payments
router.post('/salary-payments', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    const { employee_id, payment_month_bs, gross_salary, deductions = 0, payment_date_bs, account_id, payment_mode = 'cash', remarks } = req.body;
    if (!employee_id || !payment_month_bs || !gross_salary || !account_id) {
      return res.status(400).json({ success: false, message: 'Missing required salary payment details' });
    }

    const netSalary = parseFloat(gross_salary) - parseFloat(deductions || 0);
    const yearBs = (payment_date_bs || '').substring(0, 4) || '2082';
    const dateAd = new Date().toISOString().split('T')[0];

    const [emp] = await connection.query('SELECT * FROM employees WHERE id = ?', [employee_id]);

    const [vcnt] = await connection.query('SELECT COUNT(*) as count FROM vouchers WHERE voucher_no LIKE ?', [`PV-${yearBs}-%`]);
    const voucher_no = `PV-${yearBs}-${String(vcnt[0].count + 1).padStart(4, '0')}`;

    const [cat] = await connection.query('SELECT id FROM expense_categories WHERE code="OSL"');

    const [vRes] = await connection.query(
      `INSERT INTO vouchers (
        voucher_no, voucher_type, voucher_date_bs, voucher_date_ad,
        account_id, payment_mode, category_id, narration,
        gross_amount, tds_percent, tds_amount, net_amount,
        status, approved_by, approved_at, entered_by, remarks
      ) VALUES (?, 'payment', ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'approved', ?, NOW(), ?, ?)`,
      [
        voucher_no, payment_date_bs || payment_month_bs, dateAd,
        account_id, payment_mode, cat[0]?.id || null,
        `Staff Salary: ${emp[0]?.name || 'Employee'} for ${payment_month_bs}`,
        gross_salary, netSalary, req.user.id, req.user.id, remarks || null
      ]
    );

    const [spRes] = await connection.query(
      `INSERT INTO salary_payments (
        employee_id, payment_month_bs, gross_salary, deductions, net_salary,
        payment_date_bs, payment_date_ad, voucher_id, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id, payment_month_bs, gross_salary, deductions || 0, netSalary,
        payment_date_bs || payment_month_bs, dateAd, vRes.insertId, remarks || null
      ]
    );

    await connection.query('UPDATE company_accounts SET current_balance = current_balance - ? WHERE id = ?', [netSalary, account_id]);

    await connection.commit();
    res.status(201).json({ success: true, message: `Salary payment of NPR ${netSalary} recorded`, data: { id: spRes.insertId } });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
});

// GET /api/employees/salary-payments
router.get('/salary-payments', authenticate, async (req, res) => {
  try {
    const { employee_id, month_bs } = req.query;
    let query = `
      SELECT sp.*, e.name as employee_name, e.emp_code, e.designation, v.voucher_no
      FROM salary_payments sp
      JOIN employees e ON sp.employee_id = e.id
      LEFT JOIN vouchers v ON sp.voucher_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (employee_id) { query += ` AND sp.employee_id = ?`; params.push(employee_id); }
    if (month_bs) { query += ` AND sp.payment_month_bs = ?`; params.push(month_bs); }

    query += ` ORDER BY sp.id DESC`;
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
