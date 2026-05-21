// ============================================================
// Audit Log Routes  (read-only — auditors and managers)
// ============================================================
const router = require('express').Router();
const db     = require('../db/postgres');
const { authenticate, requirePermission } = require('../middleware/auth');

// GET /api/audit  — audit log with optional filters
router.get('/', authenticate, requirePermission('audit:read'), async (req, res, next) => {
  try {
    const { entity_type, emp_id, action_type, limit = 100 } = req.query;
    let sql = `SELECT al.audit_id, al.emp_id, al.event_timestamp, al.action_type,
                      al.entity_type, al.entity_id, al.entity_ref, al.ip_address, al.details,
                      ua.full_name AS user_name, ua.job_title
               FROM audit_log al
               LEFT JOIN user_account ua ON ua.emp_id = al.emp_id
               WHERE 1=1`;
    const params = [];
    if (entity_type) { params.push(entity_type); sql += ` AND al.entity_type = $${params.length}`; }
    if (emp_id)      { params.push(emp_id);      sql += ` AND al.emp_id = $${params.length}`; }
    if (action_type) { params.push(action_type); sql += ` AND al.action_type = $${params.length}`; }
    params.push(Math.min(parseInt(limit), 500));
    sql += ` ORDER BY al.event_timestamp DESC LIMIT $${params.length}`;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
