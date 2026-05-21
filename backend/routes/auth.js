// ============================================================
// Auth Routes: POST /api/auth/login  POST /api/auth/logout
// ============================================================
const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const db      = require('../db/postgres');
const { writeAuditLog } = require('../middleware/audit');
const { authenticate }  = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await db.query(
      `SELECT u.emp_id, u.full_name, u.email, u.password_hash, u.access_level,
              u.is_active, u.job_title, u.department,
              ARRAY_AGG(r.role_name) AS roles
       FROM user_account u
       LEFT JOIN user_role ur ON ur.emp_id = u.emp_id
       LEFT JOIN role r       ON r.role_id  = ur.role_id
       WHERE u.email = $1
       GROUP BY u.emp_id`,
      [email]
    );

    if (rows.length === 0)
      return res.status(401).json({ error: 'Invalid email or password' });

    const user = rows[0];
    if (!user.is_active)
      return res.status(403).json({ error: 'Account is inactive' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid email or password' });

    // Update last login
    await db.query('UPDATE user_account SET last_login_at = NOW() WHERE emp_id = $1', [user.emp_id]);

    const roles = user.roles.filter(Boolean);
    const token = jwt.sign(
      { empId: user.emp_id, email: user.email, roles, accessLevel: user.access_level },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    await writeAuditLog({
      empId: user.emp_id, actionType: 'login',
      ipAddress: req.ip, details: { method: 'password' }
    });

    res.json({
      token,
      user: {
        empId:       user.emp_id,
        fullName:    user.full_name,
        email:       user.email,
        jobTitle:    user.job_title,
        department:  user.department,
        roles,
        accessLevel: user.access_level,
      }
    });
  } catch (err) { next(err); }
});

// POST /api/auth/logout  (client discards token; we log the event)
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await writeAuditLog({
      empId: req.user.empId, actionType: 'logout', ipAddress: req.ip
    });
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
});

// GET /api/auth/me  (return current user info from token)
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT emp_id, full_name, email, job_title, department, access_level, role_extra_json
       FROM user_account WHERE emp_id = $1`,
      [req.user.empId]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ ...rows[0], roles: req.user.roles });
  } catch (err) { next(err); }
});

module.exports = router;
