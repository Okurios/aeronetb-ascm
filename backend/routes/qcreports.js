// ============================================================
// QC Reports Routes  (header in PostgreSQL, full payload in MongoDB)
// ============================================================
const router = require('express').Router();
const db     = require('../db/postgres');
const { getDb } = require('../db/mongo');
const { authenticate, requirePermission } = require('../middleware/auth');

// GET /api/qcreports
router.get('/', authenticate, requirePermission('qcreports:read'), async (req, res, next) => {
  try {
    const { result, type, supplier_id, status } = req.query;
    let sql = `SELECT qr.qc_report_id, qr.report_number, qr.inspection_type, qr.overall_result,
                      qr.inspection_date, qr.status, qr.version_no,
                      sp.supplier_part_code, p.part_number, p.part_name,
                      s.business_name AS supplier_name,
                      ua.full_name AS inspector_name
               FROM qc_report qr
               JOIN supplier_part sp ON sp.supplier_part_id = qr.supplier_part_id
               JOIN part p ON p.part_id = sp.part_id
               JOIN supplier s ON s.supplier_id = sp.supplier_id
               LEFT JOIN user_account ua ON ua.emp_id = qr.inspector_emp_id
               WHERE 1=1`;
    const params = [];
    if (result)      { params.push(result);      sql += ` AND qr.overall_result = $${params.length}`; }
    if (type)        { params.push(type);         sql += ` AND qr.inspection_type = $${params.length}`; }
    if (supplier_id) { params.push(supplier_id); sql += ` AND s.supplier_id = $${params.length}`; }
    if (status)      { params.push(status);       sql += ` AND qr.status = $${params.length}`; }
    sql += ' ORDER BY qr.inspection_date DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/qcreports/:id  — returns PG header + full MongoDB payload
router.get('/:id', authenticate, requirePermission('qcreports:read'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await db.query(
      `SELECT qr.*, sp.supplier_part_code, p.part_number, p.part_name,
              s.business_name AS supplier_name, ua.full_name AS inspector_name
       FROM qc_report qr
       JOIN supplier_part sp ON sp.supplier_part_id = qr.supplier_part_id
       JOIN part p ON p.part_id = sp.part_id
       JOIN supplier s ON s.supplier_id = sp.supplier_id
       LEFT JOIN user_account ua ON ua.emp_id = qr.inspector_emp_id
       WHERE qr.qc_report_id = $1`, [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'QC Report not found' });
    const header = rows[0];

    // Fetch full document from MongoDB if reference exists
    let mongoDoc = null;
    if (header.mongo_report_id) {
      mongoDoc = await getDb().collection('qc_reports').findOne({ _id: header.mongo_report_id });
    }
    req.auditEntity = 'qc_report'; req.auditId = id; req.auditRef = header.report_number;
    res.json({ ...header, fullPayload: mongoDoc });
  } catch (err) { next(err); }
});

// POST /api/qcreports  — create in both PG (header) and MongoDB (full payload)
router.post('/', authenticate, requirePermission('qcreports:write'), async (req, res, next) => {
  try {
    const { supplier_part_id, shipment_id, inspection_type, overall_result,
            inspection_date, payload } = req.body;
    const reportNumber = `QC-${Date.now()}`;
    const mongoId = `qc_${reportNumber}`;

    // Insert full document into MongoDB
    await getDb().collection('qc_reports').insertOne({
      _id: mongoId,
      reportId: reportNumber,
      supplierPartId: supplier_part_id,
      inspectionType: inspection_type,
      overallResult: overall_result,
      inspectionDate: inspection_date,
      inspector: { name: req.user.fullName || '', employeeId: `EMP-${req.user.empId}` },
      ...payload,
      versionNo: 1,
      status: 'draft',
      versionHistory: []
    });

    // Insert header into PostgreSQL
    const { rows } = await db.query(
      `INSERT INTO qc_report (report_number, supplier_part_id, shipment_id, inspection_type,
        overall_result, version_no, status, inspector_emp_id, inspection_date, report_payload_json, mongo_report_id)
       VALUES ($1,$2,$3,$4,$5,1,'draft',$6,$7,$8,$9) RETURNING *`,
      [reportNumber, supplier_part_id, shipment_id || null, inspection_type,
       overall_result, req.user.empId, inspection_date, JSON.stringify(payload || {}), mongoId]
    );
    req.auditEntity = 'qc_report'; req.auditId = rows[0].qc_report_id; req.auditRef = reportNumber;
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/qcreports/:id/submit  — draft → submitted
router.patch('/:id/submit', authenticate, requirePermission('qcreports:write'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await db.query(
      `UPDATE qc_report SET status='submitted', updated_at=NOW() WHERE qc_report_id=$1 AND status='draft' RETURNING *`,
      [id]
    );
    if (!rows.length) return res.status(400).json({ error: 'Report not found or not in draft state' });
    if (rows[0].mongo_report_id) {
      await getDb().collection('qc_reports').updateOne(
        { _id: rows[0].mongo_report_id },
        { $set: { status: 'submitted' } }
      );
    }
    req.auditEntity = 'qc_report'; req.auditId = id; req.auditRef = rows[0].report_number;
    req.auditDetails = { transition: 'draft→submitted' };
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/qcreports/:id/approve
router.patch('/:id/approve', authenticate, requirePermission('qcreports:approve'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await db.query(
      `UPDATE qc_report SET status='approved', updated_at=NOW() WHERE qc_report_id=$1 AND status='submitted' RETURNING *`,
      [id]
    );
    if (!rows.length) return res.status(400).json({ error: 'Report not found or not in submitted state' });
    // Mirror to MongoDB
    if (rows[0].mongo_report_id) {
      await getDb().collection('qc_reports').updateOne(
        { _id: rows[0].mongo_report_id },
        { $set: { status: 'approved' } }
      );
    }
    req.auditEntity = 'qc_report'; req.auditId = id; req.auditRef = rows[0].report_number;
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/qcreports/trends/monthly  — pass/fail trend last 12 months
router.get('/trends/monthly', authenticate, requirePermission('qcreports:read'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT TO_CHAR(inspection_date,'YYYY-MM') AS month,
              COUNT(*) FILTER (WHERE overall_result='Pass') AS passed,
              COUNT(*) FILTER (WHERE overall_result='Fail') AS failed,
              COUNT(*) AS total
       FROM qc_report
       WHERE inspection_date >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
