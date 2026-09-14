const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/users
router.get('/', authenticate, authorize('super_admin', 'manager'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, u.username, u.email, u.phone, u.role_id, u.is_active, u.created_at,
             r.role_name, r.role_label
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users
router.post('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { name, username, email, password, role_id, phone, address } = req.body;
    if (!name || !username || !password || !role_id) {
      return res.status(400).json({ success: false, message: 'Name, username, password, and role are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (name, username, email, password_hash, role_id, phone, address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, username, email || null, hashedPassword, role_id, phone || null, address || null]
    );

    res.status(201).json({ success: true, message: 'User created successfully', data: { id: result.insertId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:id/toggle-active
router.put('/:id/toggle-active', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User status toggled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
