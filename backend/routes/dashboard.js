// ============================================================
// Dashboard Analytics Routes
// ============================================================
const router = require('express').Router();
const db     = require('../db/postgres');
const { getDb } = require('../db/mongo');
const { authenticate, requirePermission } = require('../middleware/auth');

// GET /api/dashboard/overview  — top-level KPIs
router.get('/overview', authenticate, requirePermission('dashboard:kpis'), async (req, res, next) => {
  try {
    const [suppliers, orders, shipments, qc, alerts] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active') AS active FROM supplier`),
      db.query(`SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE status IN ('placed','confirmed')) AS pending,
                       COUNT(*) FILTER (WHERE desired_delivery_date < CURRENT_DATE AND status NOT IN ('delivered','completed','cancelled')) AS overdue
                FROM purchase_order`),
      db.query(`SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE status='in_transit') AS in_transit,
                       COUNT(*) FILTER (WHERE actual_arrival > estimated_arrival) AS delayed
                FROM shipment`),
      db.query(`SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE overall_result='Pass') AS passed,
                       COUNT(*) FILTER (WHERE overall_result='Fail') AS failed
                FROM qc_report`),
      db.query(`SELECT COUNT(*) AS open_alerts,
                       COUNT(*) FILTER (WHERE severity='critical') AS critical
                FROM alert_event WHERE status IN ('open','acknowledged')`)
    ]);
    res.json({
      suppliers:  suppliers.rows[0],
      orders:     orders.rows[0],
      shipments:  shipments.rows[0],
      quality:    qc.rows[0],
      iot:        alerts.rows[0],
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/supplier-kpis  — leaderboard
router.get('/supplier-kpis', authenticate, requirePermission('dashboard:kpis'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT s.supplier_id, s.business_name, s.country,
              COUNT(DISTINCT po.po_id) AS total_orders,
              COUNT(DISTINCT po.po_id) FILTER (WHERE po.actual_delivery_date <= po.desired_delivery_date) AS on_time,
              ROUND(100.0 * COUNT(DISTINCT po.po_id) FILTER (WHERE po.actual_delivery_date <= po.desired_delivery_date)
                / NULLIF(COUNT(DISTINCT po.po_id) FILTER (WHERE po.actual_delivery_date IS NOT NULL),0),1) AS on_time_pct,
              COUNT(DISTINCT qr.qc_report_id) AS total_qc,
              COUNT(DISTINCT qr.qc_report_id) FILTER (WHERE qr.overall_result='Fail') AS qc_failed,
              ROUND(100.0 * COUNT(DISTINCT qr.qc_report_id) FILTER (WHERE qr.overall_result='Fail')
                / NULLIF(COUNT(DISTINCT qr.qc_report_id),0),1) AS defect_rate_pct
       FROM supplier s
       LEFT JOIN purchase_order po ON po.supplier_id = s.supplier_id
       LEFT JOIN supplier_part sp ON sp.supplier_id = s.supplier_id
       LEFT JOIN qc_report qr ON qr.supplier_part_id = sp.supplier_part_id
       GROUP BY s.supplier_id
       ORDER BY on_time_pct DESC NULLS LAST`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/dashboard/qc-trends  — monthly pass/fail
router.get('/qc-trends', authenticate, requirePermission('dashboard:kpis'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT TO_CHAR(inspection_date,'YYYY-MM') AS month,
              COUNT(*) FILTER (WHERE overall_result='Pass') AS passed,
              COUNT(*) FILTER (WHERE overall_result='Fail') AS failed,
              COUNT(*) AS total
       FROM qc_report
       WHERE inspection_date >= NOW() - INTERVAL '24 months'
       GROUP BY month ORDER BY month`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/dashboard/qc-by-type  — pie chart data
router.get('/qc-by-type', authenticate, requirePermission('dashboard:kpis'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT inspection_type,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE overall_result='Pass') AS passed,
              COUNT(*) FILTER (WHERE overall_result='Fail') AS failed
       FROM qc_report GROUP BY inspection_type`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/dashboard/shipment-tracking  — active shipments with latest location
router.get('/shipment-tracking', authenticate, requirePermission('shipments:read'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT sh.shipment_id, sh.shipment_number, sh.tracking_number, sh.carrier,
              sh.port_of_entry, sh.estimated_arrival, sh.status,
              CASE WHEN sh.estimated_arrival < CURRENT_DATE AND sh.actual_arrival IS NULL THEN TRUE ELSE FALSE END AS overdue,
              latest.location AS last_location, latest.latitude AS last_lat,
              latest.longitude AS last_lon, latest.event_timestamp AS last_update
       FROM shipment sh
       LEFT JOIN LATERAL (
         SELECT location, latitude, longitude, event_timestamp
         FROM shipment_update WHERE shipment_id = sh.shipment_id
         ORDER BY event_timestamp DESC LIMIT 1
       ) latest ON true
       WHERE sh.status NOT IN ('delivered','returned')
       ORDER BY sh.estimated_arrival ASC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/dashboard/iot-health  — equipment health derived from open alert severities (PostgreSQL)
router.get('/iot-health', authenticate, requirePermission('iot:read'), async (req, res, next) => {
  try {
    // Count alert_event rows by severity (matches Alerts table counts directly),
    // plus maintenance equipment count from the equipment table.
    const [alertCounts, maintCount, okCount] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE severity = 'warning')  AS warning,
          COUNT(*) FILTER (WHERE severity = 'critical') AS critical
        FROM alert_event
        WHERE status IN ('open', 'acknowledged')
      `),
      db.query(`SELECT COUNT(*) AS maintenance FROM equipment WHERE status = 'maintenance'`),
      db.query(`
        SELECT COUNT(*) AS ok FROM equipment
        WHERE status != 'maintenance'
          AND equipment_id NOT IN (
            SELECT DISTINCT equipment_id FROM alert_event
            WHERE status IN ('open','acknowledged') AND equipment_id IS NOT NULL
          )
      `)
    ]);
    res.json({
      ok:          Number(okCount.rows[0].ok),
      warning:     Number(alertCounts.rows[0].warning),
      critical:    Number(alertCounts.rows[0].critical),
      maintenance: Number(maintCount.rows[0].maintenance),
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/failure-analysis  — top failure causes
router.get('/failure-analysis', authenticate, requirePermission('dashboard:kpis'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT fc.code, fc.description, fc.category, COUNT(qrf.qc_report_id) AS occurrences
       FROM failure_cause fc
       LEFT JOIN qc_report_failure qrf ON qrf.failure_cause_id = fc.failure_cause_id
       GROUP BY fc.failure_cause_id
       ORDER BY occurrences DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
