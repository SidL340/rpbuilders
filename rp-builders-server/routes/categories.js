const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/categories - hierarchical list
router.get('/', authenticate, async (req, res) => {
  try {
    const { type } = req.query; // 'expense' or 'income'
    let query = 'SELECT * FROM expense_categories WHERE is_active = 1';
    const params = [];
    if (type === 'income') {
      query += ' AND category_type = ?';
      params.push('income');
    } else if (type === 'expense') {
      query += ' AND (category_type = ? OR category_type IS NULL)';
      params.push('expense');
    }
    query += ' ORDER BY sort_order ASC, name ASC';

    const [all] = await pool.query(query, params);

    const parents = all.filter(c => !c.parent_id);
    const result = parents.map(parent => ({
      ...parent,
      children: all.filter(c => c.parent_id === parent.id)
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/categories/flat - flat list
router.get('/flat', authenticate, async (req, res) => {
  try {
    const { type } = req.query;
    let query = `
      SELECT c.*, p.name as parent_name 
      FROM expense_categories c 
      LEFT JOIN expense_categories p ON c.parent_id = p.id 
      WHERE c.is_active = 1 
    `;
    const params = [];
    if (type === 'income') {
      query += ' AND c.category_type = ?';
      params.push('income');
    } else if (type === 'expense') {
      query += ' AND (c.category_type = ? OR c.category_type IS NULL)';
      params.push('expense');
    }
    query += ' ORDER BY c.parent_id IS NULL DESC, c.sort_order ASC, c.name ASC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/categories - add new category
router.post('/', authenticate, async (req, res) => {
  try {
    const { code, name, name_np, parent_id, icon } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Code and name are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO expense_categories (code, name, name_np, parent_id, icon) VALUES (?, ?, ?, ?, ?)`,
      [code, name, name_np || null, parent_id || null, icon || null]
    );

    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
