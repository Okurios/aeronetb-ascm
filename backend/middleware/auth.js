// ============================================================
// Authentication & RBAC Middleware
// ============================================================
const jwt = require('jsonwebtoken');
const db  = require('../db/postgres');

// ── Verify JWT and attach user payload to req.user ──────────
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { empId, email, roles, accessLevel }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }
}

// ── Role-based access control ────────────────────────────────
// Usage: requireRole('procurement_officer','supply_chain_manager')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some(r => userRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }
    next();
  };
}

// ── Permission-based access control ─────────────────────────
// Usage: requirePermission('qcreports:write')
function requirePermission(permissionCode) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const { rows } = await db.query(
        `SELECT 1
         FROM user_role ur
         JOIN role_permission rp ON rp.role_id = ur.role_id
         JOIN permission p       ON p.permission_id = rp.permission_id
         WHERE ur.emp_id = $1 AND p.permission_code = $2`,
        [req.user.empId, permissionCode]
      );
      if (rows.length === 0) {
        return res.status(403).json({
          error: `Access denied. Required permission: ${permissionCode}`
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ── Auditor read-only guard ──────────────────────────────────
// Blocks write operations for auditors
function denyAuditorWrite(req, res, next) {
  const userRoles = req.user?.roles || [];
  if (userRoles.includes('auditor') && ['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    return res.status(403).json({ error: 'Auditors have read-only access' });
  }
  next();
}

module.exports = { authenticate, requireRole, requirePermission, denyAuditorWrite };
