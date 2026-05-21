// ============================================================
// Orders Routes
// ============================================================
const router = require('express').Router();
const db     = require('../db/postgres');
const { authenticate, requirePermission } = require('../middleware/auth');

// GET /api/orders
router.get('/', authenticate, requirePermission('orders:read'), async (req, res, next) => {
  try {
    const { status, supplier_id } = req.query;
    let sql = `SELECT po.po_id, po.po_number, po.order_date, po.desired_delivery_date,
                      po.actual_delivery_date, po.status, s.business_name AS supplier_name,
                      COUNT(pol.po_line_id) AS line_count,
                      SUM(pol.quantity * pol.unit_price) AS total_value
               FROM purchase_order po
               JOIN supplier s ON s.supplier_id = po.supplier_id
               LEFT JOIN purchase_order_line pol ON pol.po_id = po.po_id
               WHERE 1=1`;
    const params = [];
    if (status)      { params.push(status);      sql += ` AND po.status = $${params.length}`; }
    if (supplier_id) { params.push(supplier_id); sql += ` AND po.supplier_id = $${params.length}`; }
    sql += ' GROUP BY po.po_id, s.business_name ORDER BY po.order_date DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/orders/:id
router.get('/:id', authenticate, requirePermission('orders:read'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [order, lines] = await Promise.all([
      db.query(
        `SELECT po.*, s.business_name AS supplier_name, s.city AS supplier_city, s.country AS supplier_country
         FROM purchase_order po JOIN supplier s ON s.supplier_id = po.supplier_id WHERE po.po_id = $1`, [id]
      ),
      db.query(
        `SELECT pol.*, sp.supplier_part_code, p.part_number, p.part_name, p.category
         FROM purchase_order_line pol
         JOIN supplier_part sp ON sp.supplier_part_id = pol.supplier_part_id
         JOIN part p ON p.part_id = sp.part_id
         WHERE pol.po_id = $1`, [id]
      )
    ]);
    if (!order.rows.length) return res.status(404).json({ error: 'Order not found' });
    req.auditEntity = 'purchase_order'; req.auditId = id; req.auditRef = order.rows[0].po_number;
    res.json({ ...order.rows[0], lines: lines.rows });
  } catch (err) { next(err); }
});

// POST /api/orders
router.post('/', authenticate, requirePermission('orders:write'), async (req, res, next) => {
  try {
    const { supplier_id, order_date, desired_delivery_date, lines } = req.body;
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id is required' });
    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'At least one line item is required. Add a part with quantity and price before creating the order.' });
    }
    const client = await require('../db/postgres').pool.connect();
    try {
      await client.query('BEGIN');
      const poRes = await client.query(
        `INSERT INTO purchase_order (po_number, supplier_id, order_date, desired_delivery_date, created_by_emp_id)
         VALUES ('PO-' || TO_CHAR(NOW(),'YYYY-') || NEXTVAL('purchase_order_po_id_seq'), $1, $2, $3, $4)
         RETURNING *`,
        [supplier_id, order_date, desired_delivery_date, req.user.empId]
      );
      const po = poRes.rows[0];
      for (const line of (lines || [])) {
        await client.query(
          `INSERT INTO purchase_order_line (po_id, supplier_part_id, quantity, unit_price, required_delivery_date)
           VALUES ($1,$2,$3,$4,$5)`,
          [po.po_id, line.supplier_part_id, line.quantity, line.unit_price, line.required_delivery_date]
        );
      }
      await client.query('COMMIT');
      req.auditEntity = 'purchase_order'; req.auditId = po.po_id; req.auditRef = po.po_number;
      res.status(201).json(po);
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (err) { next(err); }
});

// PATCH /api/orders/:id/cancel  — any user with orders:write can cancel a placed order
router.patch('/:id/cancel', authenticate, requirePermission('orders:write'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await db.query(
      `UPDATE purchase_order SET status='cancelled', updated_at=NOW()
       WHERE po_id=$1 AND status IN ('placed','confirmed') RETURNING *`,
      [id]
    );
    if (!rows.length) return res.status(400).json({ error: 'Order not found or cannot be cancelled (must be placed or confirmed)' });
    req.auditEntity = 'purchase_order'; req.auditId = id; req.auditRef = rows[0].po_number;
    req.auditDetails = { new_status: 'cancelled' };
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', authenticate, requirePermission('orders:approve'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const allowed = ['placed','confirmed','dispatched','delivered','completed','cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const { rows } = await db.query(
      `UPDATE purchase_order SET status=$1, updated_at=NOW() WHERE po_id=$2 RETURNING *`,
      [status, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    req.auditEntity = 'purchase_order'; req.auditId = id; req.auditRef = rows[0].po_number;
    req.auditDetails = { new_status: status };
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
