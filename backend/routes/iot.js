// ============================================================
// IoT / Sensor Routes
// ============================================================
const router = require('express').Router();
const db     = require('../db/postgres');
const { getDb } = require('../db/mongo');
const { authenticate, requirePermission } = require('../middleware/auth');

// GET /api/iot/alerts  — open alerts across all equipment
router.get('/alerts', authenticate, requirePermission('iot:read'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT al.*, e.equipment_name, e.facility, d.serial_no AS device_serial
       FROM alert_event al
       LEFT JOIN equipment e ON e.equipment_id = al.equipment_id
       LEFT JOIN iot_device d ON d.device_id = al.device_id
       ORDER BY al.triggered_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// PATCH /api/iot/alerts/:id/acknowledge
router.patch('/alerts/:id/acknowledge', authenticate, requirePermission('iot:write'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await db.query(
      `UPDATE alert_event SET status='acknowledged', acknowledged_by_emp_id=$1
       WHERE alert_id=$2 RETURNING *`,
      [req.user.empId, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Alert not found' });
    req.auditEntity = 'alert_event'; req.auditId = id;
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/iot/devices/:deviceId/readings  — time-series for one device
router.get('/devices/:deviceId/readings', authenticate, requirePermission('iot:read'), async (req, res, next) => {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const limit = parseInt(req.query.limit) || 100;
    const { rows } = await db.query(
      `SELECT reading_id, event_timestamp, metric_type, metric_value, unit, raw_payload
       FROM sensor_reading WHERE device_id = $1
       ORDER BY event_timestamp DESC LIMIT $2`,
      [deviceId, limit]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/iot/equipment-summary  — MongoDB live status per equipment
router.get('/equipment-summary', authenticate, requirePermission('iot:read'), async (req, res, next) => {
  try {
    const docs = await getDb().collection('equipment_devices')
      .find({}, { projection: { equipmentId: 1, equipmentName: 1, facility: 1, status: 1, currentStatus: 1 } })
      .toArray();
    res.json(docs);
  } catch (err) { next(err); }
});

// GET /api/iot/sensor-events/:equipmentId  — MongoDB sensor events
router.get('/sensor-events/:equipmentId', authenticate, requirePermission('iot:read'), async (req, res, next) => {
  try {
    const { equipmentId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const docs = await getDb().collection('sensor_events')
      .find({ equipmentId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    res.json(docs);
  } catch (err) { next(err); }
});

module.exports = router;
