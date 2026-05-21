// ============================================================
// Equipment Routes
// ============================================================
const router = require('express').Router();
const db     = require('../db/postgres');
const { authenticate, requirePermission } = require('../middleware/auth');

// GET /api/equipment
router.get('/', authenticate, requirePermission('equipment:read'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT e.equipment_id, e.equipment_code, e.equipment_type, e.equipment_name,
              e.facility, e.status,
              COUNT(d.device_id) AS device_count,
              COUNT(al.alert_id) FILTER (WHERE al.status IN ('open','acknowledged')) AS open_alerts
        FROM equipment e
        LEFT JOIN iot_device d ON d.equipment_id = e.equipment_id AND d.is_active = true
        LEFT JOIN alert_event al ON al.equipment_id = e.equipment_id AND al.status IN ('open','acknowledged')
       GROUP BY e.equipment_id
       ORDER BY e.facility, e.equipment_name`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/equipment/:id
router.get('/:id', authenticate, requirePermission('equipment:read'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [equip, devices, alerts] = await Promise.all([
      db.query('SELECT * FROM equipment WHERE equipment_id = $1', [id]),
      db.query('SELECT * FROM iot_device WHERE equipment_id = $1', [id]),
      db.query(
        `SELECT * FROM alert_event WHERE equipment_id = $1 ORDER BY triggered_at DESC LIMIT 20`, [id]
      )
    ]);
    if (!equip.rows.length) return res.status(404).json({ error: 'Equipment not found' });
    req.auditEntity = 'equipment'; req.auditId = id;
    res.json({ ...equip.rows[0], devices: devices.rows, recentAlerts: alerts.rows });
  } catch (err) { next(err); }
});

// GET /api/equipment/:id/readings  — latest sensor readings
router.get('/:id/readings', authenticate, requirePermission('iot:read'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 50;
    const { rows } = await db.query(
      `SELECT sr.reading_id, sr.event_timestamp, sr.metric_type, sr.metric_value, sr.unit,
              d.serial_no AS device_serial, d.device_type
       FROM sensor_reading sr
       JOIN iot_device d ON d.device_id = sr.device_id
       WHERE sr.equipment_id = $1
       ORDER BY sr.event_timestamp DESC
       LIMIT $2`, [id, limit]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
