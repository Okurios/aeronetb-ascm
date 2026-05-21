// ============================================================
// Shipments Routes
// ============================================================
const router = require('express').Router();
const db     = require('../db/postgres');
const { authenticate, requirePermission } = require('../middleware/auth');

// GET /api/shipments
router.get('/', authenticate, requirePermission('shipments:read'), async (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = `SELECT sh.shipment_id, sh.shipment_number, sh.tracking_number, sh.carrier,
                      sh.port_of_entry, sh.estimated_arrival, sh.actual_arrival, sh.status,
                      CASE WHEN sh.actual_arrival IS NOT NULL AND sh.actual_arrival > sh.estimated_arrival
                           THEN true ELSE false END AS is_delayed,
                      COUNT(DISTINCT sl.shipment_line_id) AS line_count,
                      (SELECT su.location FROM shipment_update su
                       WHERE su.shipment_id = sh.shipment_id
                       ORDER BY su.event_timestamp DESC LIMIT 1) AS last_location,
                      STRING_AGG(DISTINCT po.po_number, ', ') AS linked_orders
               FROM shipment sh
               LEFT JOIN shipment_line sl ON sl.shipment_id = sh.shipment_id
               LEFT JOIN purchase_order_line pol ON pol.po_line_id = sl.po_line_id
               LEFT JOIN purchase_order po ON po.po_id = pol.po_id
               WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); sql += ` AND sh.status = $${params.length}`; }
    sql += ' GROUP BY sh.shipment_id ORDER BY sh.estimated_arrival DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/shipments — create a new shipment, optionally linking multiple POs
// Body: { carrier, tracking_number?, port_of_entry?, estimated_arrival, po_ids?: [1,2,3] }
router.post('/', authenticate, requirePermission('shipments:write'), async (req, res, next) => {
  const { carrier, tracking_number, port_of_entry, estimated_arrival, po_ids } = req.body;
  if (!carrier || !estimated_arrival) {
    return res.status(400).json({ error: 'carrier and estimated_arrival are required' });
  }

  // Normalise po_ids: accept single number, array, or undefined
  const linkedPoIds = Array.isArray(po_ids)
    ? po_ids.map(Number).filter(Boolean)
    : (po_ids ? [Number(po_ids)] : []);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert shipment header with placeholder number
    const ins = await client.query(
      `INSERT INTO shipment (shipment_number, carrier, tracking_number, port_of_entry, estimated_arrival, status)
       VALUES ('TEMP', $1, $2, $3, $4, 'pending') RETURNING *`,
      [carrier, tracking_number || null, port_of_entry || null, estimated_arrival]
    );
    const sh = ins.rows[0];

    // 2. Set real shipment number (SHP-YYYY-NNNN)
    await client.query(
      `UPDATE shipment SET shipment_number = 'SHP-' || TO_CHAR(NOW(),'YYYY') || '-' || LPAD($1::TEXT,4,'0')
       WHERE shipment_id = $1`,
      [sh.shipment_id]
    );

    // 3. For each linked PO, attach all open lines and mark PO as dispatched
    for (const poId of linkedPoIds) {
      const lines = await client.query(
        `SELECT po_line_id, quantity FROM purchase_order_line
         WHERE po_id = $1`, [poId]
      );
      for (const line of lines.rows) {
        await client.query(
          `INSERT INTO shipment_line (shipment_id, po_line_id, quantity_shipped) VALUES ($1,$2,$3)
           ON CONFLICT DO NOTHING`,
          [sh.shipment_id, line.po_line_id, line.quantity]
        );
        await client.query(
          `UPDATE purchase_order_line SET line_status='shipped' WHERE po_line_id=$1`, [line.po_line_id]
        );
      }
      await client.query(
        `UPDATE purchase_order SET status='dispatched', updated_at=NOW() WHERE po_id=$1`, [poId]
      );
    }

    await client.query('COMMIT');
    const final = await db.query('SELECT * FROM shipment WHERE shipment_id=$1', [sh.shipment_id]);
    req.auditEntity = 'shipment'; req.auditId = sh.shipment_id; req.auditRef = final.rows[0].shipment_number;
    res.status(201).json({ ...final.rows[0], linked_po_count: linkedPoIds.length });
  } catch (e) { await client.query('ROLLBACK'); next(e); }
  finally { client.release(); }
});

// PATCH /api/shipments/:id/status
router.patch('/:id/status', authenticate, requirePermission('shipments:write'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const allowed = ['pending','in_transit','customs','delivered','returned'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const { rows } = await db.query(
      `UPDATE shipment SET status=$1, updated_at=NOW() WHERE shipment_id=$2 RETURNING *`,
      [status, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Shipment not found' });
    req.auditEntity = 'shipment'; req.auditId = id; req.auditRef = rows[0].shipment_number;
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/shipments/:id
router.get('/:id', authenticate, requirePermission('shipments:read'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [shipment, lines, updates] = await Promise.all([
      db.query('SELECT * FROM shipment WHERE shipment_id = $1', [id]),
      db.query(
        `SELECT sl.*, pol.quantity, pol.unit_price,
                sp.supplier_part_code, p.part_number, p.part_name,
                po.po_number, s.business_name AS supplier_name
         FROM shipment_line sl
         JOIN purchase_order_line pol ON pol.po_line_id = sl.po_line_id
         JOIN supplier_part sp ON sp.supplier_part_id = pol.supplier_part_id
         JOIN part p ON p.part_id = sp.part_id
         JOIN purchase_order po ON po.po_id = pol.po_id
         JOIN supplier s ON s.supplier_id = po.supplier_id
         WHERE sl.shipment_id = $1`, [id]
      ),
      db.query(
        'SELECT * FROM shipment_update WHERE shipment_id = $1 ORDER BY event_timestamp ASC', [id]
      )
    ]);
    if (!shipment.rows.length) return res.status(404).json({ error: 'Shipment not found' });
    req.auditEntity = 'shipment'; req.auditId = id; req.auditRef = shipment.rows[0].shipment_number;
    res.json({ ...shipment.rows[0], lines: lines.rows, updates: updates.rows });
  } catch (err) { next(err); }
});

// GET /api/shipments/:id/updates
router.get('/:id/updates', authenticate, requirePermission('shipments:read'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await db.query(
      'SELECT * FROM shipment_update WHERE shipment_id = $1 ORDER BY event_timestamp ASC', [id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/shipments/:id/updates  — add a transit checkpoint
router.post('/:id/updates', authenticate, requirePermission('shipments:write'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { event_timestamp, location, latitude, longitude, condition_summary, condition_payload } = req.body;
    const { rows } = await db.query(
      `INSERT INTO shipment_update (shipment_id, event_timestamp, location, latitude, longitude, condition_summary, condition_payload, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, event_timestamp, location, latitude, longitude, condition_summary,
       condition_payload ? JSON.stringify(condition_payload) : null, req.user.email]
    );
    req.auditEntity = 'shipment'; req.auditId = id;
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
