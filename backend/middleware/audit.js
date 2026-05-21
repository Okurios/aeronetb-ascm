// ============================================================
// Audit Logging Middleware
// Writes every authenticated request to audit_log (PostgreSQL)
// ============================================================
const db = require('../db/postgres');

async function writeAuditLog({ empId, actionType, entityType, entityId, entityRef, ipAddress, details }) {
  try {
    await db.query(
      `INSERT INTO audit_log (emp_id, action_type, entity_type, entity_id, entity_ref, ip_address, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [empId || null, actionType, entityType || null, entityId || null, entityRef || null, ipAddress || null, details ? JSON.stringify(details) : null]
    );
  } catch (err) {
    // Audit log failure should not break the main request
    console.error('Audit log write failed:', err.message);
  }
}

// Middleware that auto-logs all authenticated API calls
function auditMiddleware(req, res, next) {
  if (!req.user) return next();

  const originalJson = res.json.bind(res);
  res.json = function(body) {
    // Only log on successful mutating operations and key views
    const method = req.method;
    let actionType = null;
    if (method === 'POST')   actionType = 'create';
    else if (method === 'PUT' || method === 'PATCH') actionType = 'update';
    else if (method === 'DELETE') actionType = 'delete';
    else if (method === 'GET')    actionType = 'view';

    if (actionType && res.statusCode < 400) {
      writeAuditLog({
        empId:      req.user.empId,
        actionType,
        entityType: req.auditEntity  || null,
        entityId:   req.auditId      || null,
        entityRef:  req.auditRef     || null,
        ipAddress:  req.ip,
        details:    req.auditDetails || null,
      });
    }
    return originalJson(body);
  };
  next();
}

module.exports = { auditMiddleware, writeAuditLog };
