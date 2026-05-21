// ============================================================
// AeroNetB ASCM - Express Server
// 5CM506 Data Driven Systems - Student: 100735056
// ============================================================
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { connectMongo } = require('./db/mongo');
const { auditMiddleware } = require('./middleware/audit');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ── Audit logging (after auth routes add req.user) ──────────
app.use(auditMiddleware);

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/suppliers',    require('./routes/suppliers'));
app.use('/api/parts',        require('./routes/parts'));
app.use('/api/orders',       require('./routes/orders'));
app.use('/api/shipments',    require('./routes/shipments'));
app.use('/api/qcreports',    require('./routes/qcreports'));
app.use('/api/certifications', require('./routes/certifications'));
app.use('/api/equipment',    require('./routes/equipment'));
app.use('/api/iot',          require('./routes/iot'));
app.use('/api/dashboard',    require('./routes/dashboard'));
app.use('/api/audit',        require('./routes/audit'));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── Catch-all: serve frontend for SPA navigation ─────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// ── Start ────────────────────────────────────────────────────
async function start() {
  try {
    await connectMongo();
    app.listen(PORT, () => {
      console.log(`\n🚀 AeroNetB ASCM server running on port ${PORT}`);
      console.log(`   Frontend: http://localhost:${PORT}`);
      console.log(`   API:      http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
