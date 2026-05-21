// ============================================================
// Suppliers Routes
// ============================================================
const router = require('express').Router();
const db     = require('../db/postgres');
const { authenticate, requirePermission } = require('../middleware/auth');

// GET /api/suppliers
router.get('/', authenticate, requirePermission('suppliers:read'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT s.supplier_id, s.business_name, s.city, s.country, s.status,
              ARRAY_AGG(DISTINCT sa.accreditation_code) FILTER (WHERE sa.accreditation_code IS NOT NULL) AS accreditations,
              COUNT(DISTINCT sp.supplier_part_id) AS part_count
       FROM supplier s
       LEFT JOIN supplier_accreditation sa ON sa.supplier_id = s.supplier_id AND (sa.valid_to IS NULL OR sa.valid_to >= CURRENT_DATE)
       LEFT JOIN supplier_part sp ON sp.supplier_id = s.supplier_id
       GROUP BY s.supplier_id
       ORDER BY s.business_name`
    );
    req.auditEntity = 'supplier'; req.auditRef = 'list';
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/suppliers/:id
router.get('/:id', authenticate, requirePermission('suppliers:read'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [supplier, accreditations, contacts, parts] = await Promise.all([
      db.query('SELECT * FROM supplier WHERE supplier_id = $1', [id]),
      db.query('SELECT * FROM supplier_accreditation WHERE supplier_id = $1 ORDER BY valid_from DESC', [id]),
      db.query('SELECT * FROM supplier_contact WHERE supplier_id = $1', [id]),
      db.query(
        `SELECT sp.supplier_part_id, sp.supplier_part_code, sp.approval_status, sp.lead_time_days,
                p.part_number, p.part_name, p.category
         FROM supplier_part sp JOIN part p ON p.part_id = sp.part_id
         WHERE sp.supplier_id = $1`, [id]
      )
    ]);
    if (!supplier.rows.length) return res.status(404).json({ error: 'Supplier not found' });
    req.auditEntity = 'supplier'; req.auditId = id;
    res.json({ ...supplier.rows[0], accreditations: accreditations.rows, contacts: contacts.rows, parts: parts.rows });
  } catch (err) { next(err); }
});

// POST /api/suppliers
router.post('/', authenticate, requirePermission('suppliers:write'), async (req, res, next) => {
  try {
    const { business_name, address_line1, address_line2, city, country } = req.body;
    const { rows } = await db.query(
      `INSERT INTO supplier (business_name, address_line1, address_line2, city, country)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [business_name, address_line1, address_line2, city, country]
    );
    req.auditEntity = 'supplier'; req.auditId = rows[0].supplier_id; req.auditRef = business_name;
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/suppliers/:id
router.put('/:id', authenticate, requirePermission('suppliers:write'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { business_name, address_line1, city, country, status } = req.body;
    const { rows } = await db.query(
      `UPDATE supplier SET business_name=$1, address_line1=$2, city=$3, country=$4, status=$5, updated_at=NOW()
       WHERE supplier_id=$6 RETURNING *`,
      [business_name, address_line1, city, country, status, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Supplier not found' });
    req.auditEntity = 'supplier'; req.auditId = id;
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/suppliers/:id/parts  — list all parts available from this supplier
router.get('/:id/parts', authenticate, requirePermission('suppliers:read'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await db.query(
      `SELECT sp.supplier_part_id, sp.supplier_part_code, sp.lead_time_days,
              p.part_id, p.part_number, p.part_name, p.category, p.description
       FROM supplier_part sp
       JOIN part p ON p.part_id = sp.part_id
       WHERE sp.supplier_id = $1
       ORDER BY p.part_name`, [id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/suppliers/:id/kpis  — on-time delivery & defect rate
router.get('/:id/kpis', authenticate, requirePermission('dashboard:kpis'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [deliveryKpi, qcKpi] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE po.actual_delivery_date IS NOT NULL) AS completed_orders,
           COUNT(*) FILTER (WHERE po.actual_delivery_date <= po.desired_delivery_date) AS on_time,
           ROUND(100.0 * COUNT(*) FILTER (WHERE po.actual_delivery_date <= po.desired_delivery_date)
                 / NULLIF(COUNT(*) FILTER (WHERE po.actual_delivery_date IS NOT NULL),0),1) AS on_time_pct
         FROM purchase_order po WHERE po.supplier_id = $1`, [id]
      ),
      db.query(
        `SELECT
           COUNT(*) AS total_reports,
           COUNT(*) FILTER (WHERE qr.overall_result = 'Fail') AS failed,
           ROUND(100.0 * COUNT(*) FILTER (WHERE qr.overall_result='Fail') / NULLIF(COUNT(*),0),1) AS defect_rate_pct
         FROM qc_report qr
         JOIN supplier_part sp ON sp.supplier_part_id = qr.supplier_part_id
         WHERE sp.supplier_id = $1`, [id]
      )
    ]);
    res.json({ delivery: deliveryKpi.rows[0], quality: qcKpi.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
