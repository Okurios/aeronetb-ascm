// ============================================================
// Parts Routes
// ============================================================
const router = require('express').Router();
const db     = require('../db/postgres');
const { authenticate, requirePermission } = require('../middleware/auth');

// GET /api/parts
router.get('/', authenticate, requirePermission('parts:read'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT p.part_id, p.part_number, p.part_name, p.category, p.description,
              COUNT(DISTINCT sp.supplier_id) AS supplier_count
       FROM part p
       LEFT JOIN supplier_part sp ON sp.part_id = p.part_id AND sp.approval_status = 'approved'
       GROUP BY p.part_id
       ORDER BY p.part_name`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/parts/:id
router.get('/:id', authenticate, requirePermission('parts:read'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [part, specs, suppliers, docs, notes] = await Promise.all([
      db.query('SELECT * FROM part WHERE part_id = $1', [id]),
      db.query('SELECT * FROM part_baseline_spec WHERE part_id = $1 ORDER BY version_no DESC', [id]),
      db.query(
        `SELECT sp.*, s.business_name FROM supplier_part sp
         JOIN supplier s ON s.supplier_id = sp.supplier_id WHERE sp.part_id = $1`, [id]
      ),
      db.query('SELECT * FROM part_document WHERE part_id = $1', [id]),
      db.query('SELECT * FROM part_note WHERE part_id = $1 ORDER BY created_at DESC', [id]),
    ]);
    if (!part.rows.length) return res.status(404).json({ error: 'Part not found' });
    req.auditEntity = 'part'; req.auditId = id;
    res.json({ ...part.rows[0], specs: specs.rows, suppliers: suppliers.rows, documents: docs.rows, notes: notes.rows });
  } catch (err) { next(err); }
});

// POST /api/parts
router.post('/', authenticate, requirePermission('parts:write'), async (req, res, next) => {
  try {
    const { part_number, part_name, category, description } = req.body;
    const { rows } = await db.query(
      `INSERT INTO part (part_number, part_name, category, description) VALUES ($1,$2,$3,$4) RETURNING *`,
      [part_number, part_name, category, description]
    );
    req.auditEntity = 'part'; req.auditId = rows[0].part_id; req.auditRef = part_number;
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
