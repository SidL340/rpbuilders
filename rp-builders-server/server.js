const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/projects',   require('./routes/projects'));
app.use('/api/parties',    require('./routes/parties'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/vouchers',   require('./routes/vouchers'));
app.use('/api/funds',      require('./routes/funds'));
app.use('/api/thekedar',   require('./routes/thekedar'));
app.use('/api/materials',  require('./routes/materials'));
app.use('/api/employees',  require('./routes/employees'));
app.use('/api/equipment',  require('./routes/equipment'));
app.use('/api/reports',    require('./routes/reports'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/accounts',   require('./routes/accounts'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/settings',   require('./routes/settings'));

// ─── Serve Frontend & Static ───────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'R.P. Builders Server is running',
    time: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ─── SPA Client Fallback (Catch-all non-API routes) ───────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// ─── Error Handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ─── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   R.P. Builders Pvt Ltd — Server        ║
  ║   Running on http://localhost:${PORT}       ║
  ║   LAN Access: http://<YOUR-IP>:${PORT}    ║
  ╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
