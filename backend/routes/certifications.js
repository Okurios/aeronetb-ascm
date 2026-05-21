// ============================================================
// Certifications Routes  (immutability enforced on finalized)
// ============================================================
const router = require('express').Router();
const db     = require('../db/postgres');
const { getDb } = require('../db/mongo');
const { authenticate, requirePermission } = require('../middleware/auth');

// GET /api/certifications
router.get('/', authenticate, requirePermission('certifications:read'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.certification_id, c.certification_number, c.status, c.current_version,
              p.part_number, p.part_name, s.business_name AS supplier_name,
              cv.is_finalized, cv.finalized_at, ua.full_name AS certified_by
       FROM certification c
       JOIN supplier_part sp ON sp.supplier_part_id = c.supplier_part_id
       JOIN part p ON p.part_id = sp.part_id
       JOIN supplier s ON s.supplier_id = sp.supplier_id
       LEFT JOIN certification_version cv ON cv.certification_id = c.certification_id AND cv.version_no = c.current_version
       LEFT JOIN user_account ua ON ua.emp_id = cv.certified_by_emp_id
       ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/certifications  — create a new draft certification
router.post('/', authenticate, requirePermission('certifications:write'), async (req, res, next) => {
  const { supplier_part_id, qc_report_id, notes } = req.body;
  if (!supplier_part_id) return res.status(400).json({ error: 'supplier_part_id is required' });

  const client = await require('../db/postgres').pool.connect();
  try {
    await client.query('BEGIN');

    // Insert header with temp number, then update to include its ID
    const ins = await client.query(
      `INSERT INTO certification (certification_number, supplier_part_id, qc_report_id, status, current_version)
       VALUES ('TEMP', $1, $2, 'draft', 1) RETURNING *`,
      [supplier_part_id, qc_report_id || null]
    );
    const cert = ins.rows[0];

    await client.query(
      `UPDATE certification
       SET certification_number = 'CERT-' || TO_CHAR(NOW(),'YYYY') || '-' || LPAD($1::TEXT,5,'0')
       WHERE certification_id = $1`,
      [cert.certification_id]
    );

    // Create version 1
    await client.query(
      `INSERT INTO certification_version (certification_id, version_no, certified_by_emp_id, notes)
       VALUES ($1, 1, $2, $3)`,
      [cert.certification_id, req.user.empId, notes || null]
    );

    await client.query('COMMIT');
    const final = await db.query('SELECT * FROM certification WHERE certification_id=$1', [cert.certification_id]);
    req.auditEntity = 'certification'; req.auditId = cert.certification_id; req.auditRef = final.rows[0].certification_number;
    res.status(201).json(final.rows[0]);
  } catch (e) { await client.query('ROLLBACK'); next(e); }
  finally { client.release(); }
});

// GET /api/certifications/:id  — PG header + MongoDB full document
router.get('/:id', authenticate, requirePermission('certifications:read'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [cert, versions, batches] = await Promise.all([
      db.query(
        `SELECT c.*, p.part_number, p.part_name, s.business_name AS supplier_name
         FROM certification c
         JOIN supplier_part sp ON sp.supplier_part_id = c.supplier_part_id
         JOIN part p ON p.part_id = sp.part_id
         JOIN supplier s ON s.supplier_id = sp.supplier_id
         WHERE c.certification_id = $1`, [id]
      ),
      db.query('SELECT * FROM certification_version WHERE certification_id = $1 ORDER BY version_no DESC', [id]),
      db.query(
        `SELECT mb.* FROM material_batch mb
         JOIN certification_version cv ON cv.certification_version_id = mb.certification_version_id
         WHERE cv.certification_id = $1`, [id]
      )
    ]);
    if (!cert.rows.length) return res.status(404).json({ error: 'Certification not found' });
    let mongoDoc = null;
    if (cert.rows[0].mongo_cert_id) {
      mongoDoc = await getDb().collection('certifications').findOne({ _id: cert.rows[0].mongo_cert_id });
    }
    req.auditEntity = 'certification'; req.auditId = id; req.auditRef = cert.rows[0].certification_number;
    res.json({ ...cert.rows[0], versions: versions.rows, materialBatches: batches.rows, fullDocument: mongoDoc });
  } catch (err) { next(err); }
});

// PATCH /api/certifications/:id/finalize — immutability: once finalized, no further edits
router.patch('/:id/finalize', authenticate, requirePermission('certifications:approve'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { digital_stamp, signature_data } = req.body;

    // Check if already finalized
    const check = await db.query(
      `SELECT cv.is_finalized FROM certification_version cv
       JOIN certification c ON c.certification_id = cv.certification_id
       WHERE c.certification_id = $1 AND cv.version_no = c.current_version`, [id]
    );
    if (check.rows[0]?.is_finalized) {
      return res.status(409).json({ error: 'Certification is already finalized and cannot be modified' });
    }

    const client = await require('../db/postgres').pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE certification_version SET is_finalized=true, finalized_at=NOW(),
          certified_by_emp_id=$1, digital_stamp=$2, signature_data=$3
         WHERE certification_id=$4 AND version_no=(SELECT current_version FROM certification WHERE certification_id=$4)`,
        [req.user.empId, digital_stamp, signature_data, id]
      );
      const certRes = await client.query(
        `UPDATE certification SET status='approved', updated_at=NOW() WHERE certification_id=$1 RETURNING *`, [id]
      );
      await client.query('COMMIT');

      // Mirror to MongoDB — mark as finalized
      if (certRes.rows[0].mongo_cert_id) {
        await getDb().collection('certifications').updateOne(
          { _id: certRes.rows[0].mongo_cert_id },
          { $set: { status: 'approved', 'versions.$[v].isFinalized': true, 'versions.$[v].approval.digitalStamp': digital_stamp } },
          { arrayFilters: [{ 'v.versionNo': certRes.rows[0].current_version }] }
        );
      }
      req.auditEntity = 'certification'; req.auditId = id; req.auditRef = certRes.rows[0].certification_number;
      res.json({ message: 'Certification finalized', ...certRes.rows[0] });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (err) { next(err); }
});

module.exports = router;
