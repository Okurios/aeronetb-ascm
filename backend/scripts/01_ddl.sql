-- ============================================================
-- AeroNetB ASCM - PostgreSQL DDL
-- 5CM506 Data Driven Systems - Student: 100735056
-- ============================================================

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS role_permission CASCADE;
DROP TABLE IF EXISTS user_role CASCADE;
DROP TABLE IF EXISTS permission CASCADE;
DROP TABLE IF EXISTS role CASCADE;
DROP TABLE IF EXISTS user_account CASCADE;
DROP TABLE IF EXISTS alert_event CASCADE;
DROP TABLE IF EXISTS sensor_reading CASCADE;
DROP TABLE IF EXISTS iot_device CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS material_batch CASCADE;
DROP TABLE IF EXISTS certification_version CASCADE;
DROP TABLE IF EXISTS certification CASCADE;
DROP TABLE IF EXISTS qc_report_failure CASCADE;
DROP TABLE IF EXISTS failure_cause CASCADE;
DROP TABLE IF EXISTS qc_report CASCADE;
DROP TABLE IF EXISTS shipment_update CASCADE;
DROP TABLE IF EXISTS shipment_line CASCADE;
DROP TABLE IF EXISTS shipment CASCADE;
DROP TABLE IF EXISTS purchase_order_line CASCADE;
DROP TABLE IF EXISTS purchase_order CASCADE;
DROP TABLE IF EXISTS part_note CASCADE;
DROP TABLE IF EXISTS part_document CASCADE;
DROP TABLE IF EXISTS supplier_part CASCADE;
DROP TABLE IF EXISTS part_baseline_spec CASCADE;
DROP TABLE IF EXISTS part CASCADE;
DROP TABLE IF EXISTS supplier_contact CASCADE;
DROP TABLE IF EXISTS supplier_accreditation CASCADE;
DROP TABLE IF EXISTS supplier CASCADE;


-- ============================================================
-- 1. SUPPLIER & CONTACTS & ACCREDITATIONS
-- ============================================================

CREATE TABLE supplier (
    supplier_id       BIGSERIAL PRIMARY KEY,
    business_name     VARCHAR(150) NOT NULL,
    address_line1     VARCHAR(200),
    address_line2     VARCHAR(200),
    city              VARCHAR(100),
    country           VARCHAR(100),
    status            VARCHAR(30)  NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','suspended','inactive')),
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE supplier_accreditation (
    supplier_accreditation_id BIGSERIAL PRIMARY KEY,
    supplier_id               BIGINT NOT NULL REFERENCES supplier(supplier_id) ON DELETE CASCADE,
    accreditation_code        VARCHAR(50)  NOT NULL,   -- e.g. 'ISO9001','AS9100'
    certificate_number        VARCHAR(100),
    issued_by                 VARCHAR(150),
    valid_from                DATE,
    valid_to                  DATE,
    created_at                TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE supplier_contact (
    contact_id    BIGSERIAL PRIMARY KEY,
    supplier_id   BIGINT NOT NULL REFERENCES supplier(supplier_id) ON DELETE CASCADE,
    full_name     VARCHAR(150) NOT NULL,
    title         VARCHAR(80),
    email         VARCHAR(200),
    phone         VARCHAR(50),
    is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. PARTS, BASELINE SPECS, SUPPLIER-PARTS, DOCUMENTS, NOTES
-- ============================================================

CREATE TABLE part (
    part_id       BIGSERIAL PRIMARY KEY,
    part_number   VARCHAR(80)  NOT NULL UNIQUE,
    part_name     VARCHAR(200) NOT NULL,
    category      VARCHAR(100),
    description   TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE part_baseline_spec (
    baseline_spec_id  BIGSERIAL PRIMARY KEY,
    part_id           BIGINT NOT NULL REFERENCES part(part_id) ON DELETE CASCADE,
    version_no        INTEGER NOT NULL DEFAULT 1,
    effective_from    DATE,
    effective_to      DATE,
    status            VARCHAR(30) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('draft','active','superseded','retired')),
    -- Mechanical properties
    tensile_strength_mpa  NUMERIC(10,2),
    yield_point_mpa       NUMERIC(10,2),
    fatigue_limit_mpa     NUMERIC(10,2),
    -- Process details stored as flexible JSONB
    process_details_json  JSONB,
    -- CAD / geometry reference
    cad_file_uri          TEXT,
    -- Approved by
    approved_by_emp_id    BIGINT,
    approved_at           TIMESTAMP,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (part_id, version_no)
);

CREATE TABLE supplier_part (
    supplier_part_id   BIGSERIAL PRIMARY KEY,
    supplier_id        BIGINT NOT NULL REFERENCES supplier(supplier_id),
    part_id            BIGINT NOT NULL REFERENCES part(part_id),
    supplier_part_code VARCHAR(80),
    -- Supplier-specific customization as flexible JSONB
    customization_json JSONB,
    lead_time_days     INTEGER,
    unit_of_measure    VARCHAR(30) DEFAULT 'EA',
    approval_status    VARCHAR(30) NOT NULL DEFAULT 'pending'
                       CHECK (approval_status IN ('pending','approved','rejected','suspended')),
    active_from        DATE,
    active_to          DATE,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (supplier_id, part_id, supplier_part_code)
);

CREATE TABLE part_document (
    document_id    BIGSERIAL PRIMARY KEY,
    part_id        BIGINT REFERENCES part(part_id) ON DELETE CASCADE,
    supplier_part_id BIGINT REFERENCES supplier_part(supplier_part_id) ON DELETE CASCADE,
    document_type  VARCHAR(50) NOT NULL,  -- 'CAD','drawing','image','pdf','other'
    document_name  VARCHAR(200),
    file_uri       TEXT NOT NULL,         -- path or cloud object URL
    mime_type      VARCHAR(80),
    file_size_bytes BIGINT,
    checksum_sha256 VARCHAR(64),
    uploaded_by_emp_id BIGINT,
    uploaded_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (part_id IS NOT NULL OR supplier_part_id IS NOT NULL)
);

CREATE TABLE part_note (
    note_id        BIGSERIAL PRIMARY KEY,
    part_id        BIGINT REFERENCES part(part_id) ON DELETE CASCADE,
    supplier_part_id BIGINT REFERENCES supplier_part(supplier_part_id) ON DELETE CASCADE,
    note_type      VARCHAR(50) NOT NULL, -- 'engineering','handling','inspection','supplier'
    note_text      TEXT NOT NULL,
    created_by_emp_id BIGINT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (part_id IS NOT NULL OR supplier_part_id IS NOT NULL)
);


-- ============================================================
-- 3. PURCHASE ORDERS & LINES
-- ============================================================

CREATE TABLE purchase_order (
    po_id                 BIGSERIAL PRIMARY KEY,
    po_number             VARCHAR(50) NOT NULL UNIQUE,
    supplier_id           BIGINT NOT NULL REFERENCES supplier(supplier_id),
    order_date            DATE NOT NULL,
    desired_delivery_date DATE,
    actual_delivery_date  DATE,
    status                VARCHAR(30) NOT NULL DEFAULT 'placed'
                          CHECK (status IN ('placed','confirmed','dispatched','delivered','completed','cancelled')),
    created_by_emp_id     BIGINT,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_order_line (
    po_line_id              BIGSERIAL PRIMARY KEY,
    po_id                   BIGINT NOT NULL REFERENCES purchase_order(po_id) ON DELETE CASCADE,
    supplier_part_id        BIGINT NOT NULL REFERENCES supplier_part(supplier_part_id),
    quantity                INTEGER NOT NULL CHECK (quantity > 0),
    unit_price              NUMERIC(15,4),
    required_delivery_date  DATE,
    line_status             VARCHAR(30) NOT NULL DEFAULT 'open'
                            CHECK (line_status IN ('open','partially_shipped','shipped','cancelled')),
    created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 4. SHIPMENTS, SHIPMENT LINES, SHIPMENT UPDATES
-- ============================================================

CREATE TABLE shipment (
    shipment_id     BIGSERIAL PRIMARY KEY,
    shipment_number VARCHAR(60)  NOT NULL UNIQUE,
    tracking_number VARCHAR(100),
    carrier         VARCHAR(100),
    port_of_entry   VARCHAR(100),
    estimated_arrival DATE,
    actual_arrival    DATE,
    status            VARCHAR(30) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','in_transit','customs','delivered','returned')),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE shipment_line (
    shipment_line_id BIGSERIAL PRIMARY KEY,
    shipment_id      BIGINT NOT NULL REFERENCES shipment(shipment_id) ON DELETE CASCADE,
    po_line_id       BIGINT NOT NULL REFERENCES purchase_order_line(po_line_id),
    quantity_shipped INTEGER NOT NULL CHECK (quantity_shipped > 0),
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE shipment_update (
    shipment_update_id BIGSERIAL PRIMARY KEY,
    shipment_id        BIGINT NOT NULL REFERENCES shipment(shipment_id) ON DELETE CASCADE,
    event_timestamp    TIMESTAMP NOT NULL,
    location           VARCHAR(200),
    latitude           NUMERIC(9,6),
    longitude          NUMERIC(9,6),
    condition_summary  VARCHAR(200),
    condition_payload  JSONB,   -- sensor/container readings at checkpoint
    recorded_by        VARCHAR(100),
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 5. QC REPORTS & FAILURE CAUSES
-- ============================================================

CREATE TABLE qc_report (
    qc_report_id       BIGSERIAL PRIMARY KEY,
    report_number      VARCHAR(50) NOT NULL UNIQUE,
    supplier_part_id   BIGINT NOT NULL REFERENCES supplier_part(supplier_part_id),
    shipment_id        BIGINT REFERENCES shipment(shipment_id),
    po_line_id         BIGINT REFERENCES purchase_order_line(po_line_id),
    inspection_type    VARCHAR(50) NOT NULL,  -- 'visual','dimensional','NDT','environmental','combined'
    overall_result     VARCHAR(20) NOT NULL   CHECK (overall_result IN ('Pass','Fail','Conditional')),
    version_no         INTEGER NOT NULL DEFAULT 1,
    status             VARCHAR(30) NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','submitted','approved','rejected','superseded')),
    inspector_emp_id   BIGINT,
    inspection_date    DATE,
    report_payload_json JSONB NOT NULL,       -- full inspection data (measurements, NDT, env test, etc.)
    mongo_report_id    VARCHAR(60),           -- reference to MongoDB qc_reports document
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE failure_cause (
    failure_cause_id BIGSERIAL PRIMARY KEY,
    code             VARCHAR(30) NOT NULL UNIQUE,
    description      TEXT NOT NULL,
    category         VARCHAR(80)  -- 'dimensional','material','surface','NDT','environmental'
);

CREATE TABLE qc_report_failure (
    qc_report_id     BIGINT NOT NULL REFERENCES qc_report(qc_report_id) ON DELETE CASCADE,
    failure_cause_id BIGINT NOT NULL REFERENCES failure_cause(failure_cause_id),
    notes            TEXT,
    PRIMARY KEY (qc_report_id, failure_cause_id)
);


-- ============================================================
-- 6. CERTIFICATIONS & MATERIAL BATCHES
-- ============================================================

CREATE TABLE certification (
    certification_id     BIGSERIAL PRIMARY KEY,
    certification_number VARCHAR(80) NOT NULL UNIQUE,
    supplier_part_id     BIGINT NOT NULL REFERENCES supplier_part(supplier_part_id),
    shipment_id          BIGINT REFERENCES shipment(shipment_id),
    qc_report_id         BIGINT REFERENCES qc_report(qc_report_id),
    current_version      INTEGER NOT NULL DEFAULT 1,
    status               VARCHAR(30) NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','submitted','approved','revoked')),
    mongo_cert_id        VARCHAR(60),  -- reference to MongoDB certifications document
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE certification_version (
    certification_version_id BIGSERIAL PRIMARY KEY,
    certification_id         BIGINT NOT NULL REFERENCES certification(certification_id) ON DELETE CASCADE,
    version_no               INTEGER NOT NULL,
    is_finalized             BOOLEAN NOT NULL DEFAULT FALSE,
    finalized_at             TIMESTAMP,
    certified_by_emp_id      BIGINT,
    digital_stamp            VARCHAR(100),
    signature_data           TEXT,         -- e.g. base64 encoded or reference
    notes                    TEXT,
    created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (certification_id, version_no)
);

CREATE TABLE material_batch (
    material_batch_id        BIGSERIAL PRIMARY KEY,
    certification_version_id BIGINT NOT NULL REFERENCES certification_version(certification_version_id) ON DELETE CASCADE,
    batch_number             VARCHAR(80),
    material_name            VARCHAR(150),
    origin_country           VARCHAR(80),
    supplier_cert_reference  VARCHAR(100),
    created_at               TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 7. EQUIPMENT & IOT
-- ============================================================

CREATE TABLE equipment (
    equipment_id    BIGSERIAL PRIMARY KEY,
    equipment_code  VARCHAR(60) NOT NULL UNIQUE,
    equipment_type  VARCHAR(80) NOT NULL,   -- 'manufacturing_machine','transit_container','test_bench'
    equipment_name  VARCHAR(150),
    facility        VARCHAR(100),
    location_detail VARCHAR(200),
    status          VARCHAR(30) NOT NULL DEFAULT 'operational'
                    CHECK (status IN ('operational','maintenance','offline','decommissioned')),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE iot_device (
    device_id       BIGSERIAL PRIMARY KEY,
    equipment_id    BIGINT NOT NULL REFERENCES equipment(equipment_id) ON DELETE CASCADE,
    serial_no       VARCHAR(80) NOT NULL UNIQUE,
    device_type     VARCHAR(60) NOT NULL,   -- 'temperature','vibration','pressure','gps','multi'
    firmware_version VARCHAR(30),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    installed_at    TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE sensor_reading (
    reading_id     BIGSERIAL PRIMARY KEY,
    device_id      BIGINT NOT NULL REFERENCES iot_device(device_id) ON DELETE CASCADE,
    equipment_id   BIGINT NOT NULL REFERENCES equipment(equipment_id),
    event_timestamp TIMESTAMP NOT NULL,
    metric_type    VARCHAR(50) NOT NULL,    -- 'temperature','vibration','pressure','gps_lat','gps_lon'
    metric_value   NUMERIC(14,4) NOT NULL,
    unit           VARCHAR(20),
    raw_payload    JSONB,                  -- full multi-metric snapshot if needed
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Recommended: PARTITION sensor_reading BY RANGE (event_timestamp) for production

CREATE TABLE alert_event (
    alert_id        BIGSERIAL PRIMARY KEY,
    equipment_id    BIGINT REFERENCES equipment(equipment_id),
    device_id       BIGINT REFERENCES iot_device(device_id),
    alert_type      VARCHAR(60) NOT NULL,  -- 'temperature_breach','vibration_anomaly','pressure_high'
    severity        VARCHAR(20) NOT NULL   CHECK (severity IN ('info','warning','critical')),
    status          VARCHAR(20) NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','acknowledged','resolved')),
    triggered_at    TIMESTAMP NOT NULL,
    resolved_at     TIMESTAMP,
    threshold_value NUMERIC(14,4),
    actual_value    NUMERIC(14,4),
    message         TEXT,
    acknowledged_by_emp_id BIGINT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 8. USERS, ROLES, PERMISSIONS (RBAC)
-- ============================================================

CREATE TABLE role (
    role_id   BIGSERIAL PRIMARY KEY,
    role_name VARCHAR(60) NOT NULL UNIQUE,  -- 'procurement_officer','quality_inspector',
                                             -- 'supply_chain_manager','equipment_engineer','auditor'
    description TEXT
);

CREATE TABLE permission (
    permission_id   BIGSERIAL PRIMARY KEY,
    permission_code VARCHAR(80) NOT NULL UNIQUE,  -- e.g. 'suppliers:write','orders:approve','certifications:read'
    description     TEXT
);

CREATE TABLE role_permission (
    role_id       BIGINT NOT NULL REFERENCES role(role_id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permission(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_account (
    emp_id          BIGSERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    job_title       VARCHAR(100),
    department      VARCHAR(100),
    email           VARCHAR(200) NOT NULL UNIQUE,
    phone           VARCHAR(50),
    password_hash   TEXT NOT NULL,
    auth_id         VARCHAR(100),                 -- external identity management reference
    access_level    VARCHAR(30) NOT NULL DEFAULT 'read'
                    CHECK (access_level IN ('read','write','approve','audit','admin')),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    -- Role-specific extra data stored as JSONB to avoid excessive subtype tables
    role_extra_json JSONB,
    last_login_at   TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE user_role (
    emp_id  BIGINT NOT NULL REFERENCES user_account(emp_id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES role(role_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (emp_id, role_id)
);


-- ============================================================
-- 9. AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
    audit_id        BIGSERIAL PRIMARY KEY,
    emp_id          BIGINT REFERENCES user_account(emp_id),
    event_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    action_type     VARCHAR(40) NOT NULL,  -- 'login','view','create','update','approve','delete','export','flag'
    entity_type     VARCHAR(60),           -- 'supplier','qc_report','certification','order', etc.
    entity_id       BIGINT,
    entity_ref      VARCHAR(100),          -- human-readable identifier (e.g. report number)
    ip_address      VARCHAR(45),
    details         JSONB                  -- additional context (before/after values, fields changed)
);
-- Audit log is append-only — no UPDATE or DELETE on this table in application logic


-- ============================================================
-- INDEXES for common query patterns
-- ============================================================

CREATE INDEX idx_supplier_part_supplier ON supplier_part(supplier_id);
CREATE INDEX idx_supplier_part_part ON supplier_part(part_id);
CREATE INDEX idx_po_supplier ON purchase_order(supplier_id);
CREATE INDEX idx_po_status ON purchase_order(status);
CREATE INDEX idx_shipment_status ON shipment(status);
CREATE INDEX idx_qc_report_supplier_part ON qc_report(supplier_part_id);
CREATE INDEX idx_qc_report_result ON qc_report(overall_result);
CREATE INDEX idx_qc_report_date ON qc_report(inspection_date);
CREATE INDEX idx_sensor_reading_device_time ON sensor_reading(device_id, event_timestamp);
CREATE INDEX idx_sensor_reading_equipment_time ON sensor_reading(equipment_id, event_timestamp);
CREATE INDEX idx_alert_equipment ON alert_event(equipment_id);
CREATE INDEX idx_alert_status ON alert_event(status);
CREATE INDEX idx_audit_log_emp ON audit_log(emp_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(event_timestamp);

-- ============================================================
-- END OF DDL
-- ============================================================
