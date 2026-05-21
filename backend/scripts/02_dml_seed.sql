-- ============================================================
-- AeroNetB ASCM - PostgreSQL DML Seed Data
-- 5CM506 Data Driven Systems - Student: 100735056
-- ============================================================

-- ============================================================
-- ROLES & PERMISSIONS
-- ============================================================

INSERT INTO role (role_name, description) VALUES
('procurement_officer',    'Manages supplier master data, creates and updates purchase orders'),
('quality_inspector',      'Creates QC reports, performs inspections, validates certifications'),
('supply_chain_manager',   'Oversees global shipment flows, analyses supplier KPIs'),
('equipment_engineer',     'Monitors production equipment and IoT sensor data'),
('auditor',                'Read-only access for compliance review and certification verification');

INSERT INTO permission (permission_code, description) VALUES
('suppliers:read',          'View supplier records'),
('suppliers:write',         'Create/update supplier records'),
('parts:read',              'View parts and specifications'),
('parts:write',             'Create/update parts and specifications'),
('orders:read',             'View purchase orders'),
('orders:write',            'Create/update purchase orders'),
('orders:approve',          'Approve purchase orders'),
('shipments:read',          'View shipments'),
('shipments:write',         'Create/update shipments'),
('qcreports:read',          'View QC reports'),
('qcreports:write',         'Create/update QC reports'),
('qcreports:approve',       'Approve QC reports'),
('certifications:read',     'View certifications'),
('certifications:write',    'Create/update certifications'),
('certifications:approve',  'Approve and finalize certifications'),
('equipment:read',          'View equipment records'),
('equipment:write',         'Create/update equipment records'),
('iot:read',                'View IoT sensor data and alerts'),
('iot:write',               'Acknowledge IoT alerts'),
('audit:read',              'View audit logs'),
('compliance:flag',         'Flag non-compliance issues'),
('dashboard:kpis',          'Access KPI dashboard'),
('users:admin',             'Manage user accounts');

-- Procurement Officer permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM role r, permission p
WHERE r.role_name = 'procurement_officer'
AND p.permission_code IN ('suppliers:read','suppliers:write','parts:read','orders:read','orders:write','orders:approve','shipments:read','dashboard:kpis');

-- Quality Inspector permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM role r, permission p
WHERE r.role_name = 'quality_inspector'
AND p.permission_code IN ('suppliers:read','parts:read','orders:read','shipments:read','qcreports:read','qcreports:write','qcreports:approve','certifications:read','certifications:write','certifications:approve','dashboard:kpis');

-- Supply Chain Manager permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM role r, permission p
WHERE r.role_name = 'supply_chain_manager'
AND p.permission_code IN ('suppliers:read','suppliers:write','parts:read','orders:read','orders:write','orders:approve','shipments:read','shipments:write','qcreports:read','certifications:read','dashboard:kpis','audit:read');

-- Equipment Engineer permissions
INSERT INTO role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM role r, permission p
WHERE r.role_name = 'equipment_engineer'
AND p.permission_code IN ('equipment:read','equipment:write','iot:read','iot:write','dashboard:kpis','parts:read');

-- Auditor permissions (read-only + flag)
INSERT INTO role_permission (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM role r, permission p
WHERE r.role_name = 'auditor'
AND p.permission_code IN ('suppliers:read','parts:read','orders:read','shipments:read','qcreports:read','certifications:read','audit:read','compliance:flag','equipment:read','iot:read');


-- ============================================================
-- USERS
-- ============================================================
-- Passwords are bcrypt hashes of: 'Password1!' for all seed users
-- Hash verified correct: $2b$10$e0e/veHtQ6WM.6kZYQigO.LfdhuJIFBF.n/kh30ED4zHY2tFBQZvq

INSERT INTO user_account (full_name, job_title, department, email, phone, password_hash, access_level, role_extra_json) VALUES
('Alice Procurement',  'Procurement Officer',   'Procurement', 'alice@aeronetb.com', '+44-7700-100001', '$2b$10$Y5zFqj2z5h6DkJ5VeE0yNeVWRdZmz6.8Ys5J6gqQ1K3fjNpkGpZRy', 'write',   '{"regionManaged":"EMEA","authorizationLimitGBP":250000}'),
('Bob Inspector',      'Quality Inspector',     'Quality',     'bob@aeronetb.com',   '+44-7700-100002', '$2b$10$Y5zFqj2z5h6DkJ5VeE0yNeVWRdZmz6.8Ys5J6gqQ1K3fjNpkGpZRy', 'approve',  '{"inspectorCertId":"INSP-9012","specializations":["NDT","dimensional"],"digitalStamp":"STAMP-BOB-7723"}'),
('Carol Manager',      'Supply Chain Manager',  'Operations',  'carol@aeronetb.com', '+44-7700-100003', '$2b$10$Y5zFqj2z5h6DkJ5VeE0yNeVWRdZmz6.8Ys5J6gqQ1K3fjNpkGpZRy', 'approve',  '{"productLines":["fuselage","wing assemblies"],"reportingLevel":"global_manager","kpiPreferences":["on_time_delivery","defect_rate"]}'),
('Dave Engineer',      'Equipment Engineer',    'Engineering', 'dave@aeronetb.com',  '+44-7700-100004', '$2b$10$Y5zFqj2z5h6DkJ5VeE0yNeVWRdZmz6.8Ys5J6gqQ1K3fjNpkGpZRy', 'write',    '{"engineeringLicense":"ENG-5541","assignedFacility":"Derby Plant A","iotGroups":["MACH-GROUP-1","MACH-GROUP-2"]}'),
('Eve Auditor',        'Regulatory Auditor',    'Compliance',  'eve@aeronetb.com',   '+44-7700-100005', '$2b$10$Y5zFqj2z5h6DkJ5VeE0yNeVWRdZmz6.8Ys5J6gqQ1K3fjNpkGpZRy', 'audit',    '{"regulatoryAuthority":"EASA","accreditationId":"AUD-REG-2024-77","auditScope":["external_compliance","safety_certification"]}');

-- Assign roles
INSERT INTO user_role (emp_id, role_id)
SELECT u.emp_id, r.role_id FROM user_account u, role r WHERE u.email='alice@aeronetb.com' AND r.role_name='procurement_officer';
INSERT INTO user_role (emp_id, role_id)
SELECT u.emp_id, r.role_id FROM user_account u, role r WHERE u.email='bob@aeronetb.com' AND r.role_name='quality_inspector';
INSERT INTO user_role (emp_id, role_id)
SELECT u.emp_id, r.role_id FROM user_account u, role r WHERE u.email='carol@aeronetb.com' AND r.role_name='supply_chain_manager';
INSERT INTO user_role (emp_id, role_id)
SELECT u.emp_id, r.role_id FROM user_account u, role r WHERE u.email='dave@aeronetb.com' AND r.role_name='equipment_engineer';
INSERT INTO user_role (emp_id, role_id)
SELECT u.emp_id, r.role_id FROM user_account u, role r WHERE u.email='eve@aeronetb.com' AND r.role_name='auditor';


-- ============================================================
-- SUPPLIERS
-- ============================================================

INSERT INTO supplier (business_name, address_line1, city, country, status) VALUES
('Global AeroParts Ltd.',      '14 Aviation Way',        'Derby',        'United Kingdom', 'active'),
('Precision Aerospace GmbH',   'Industriestrasse 88',    'Hamburg',      'Germany',        'active'),
('SkyComp Industries Inc.',    '200 Aerospace Blvd',     'Seattle',      'USA',            'active'),
('MegaAlloy Solutions SA',     'Zone Industrielle 12',   'Toulouse',     'France',         'active'),
('TechFab Components Ltd.',    '9 Engineering Park',     'Birmingham',   'United Kingdom', 'suspended');

INSERT INTO supplier_accreditation (supplier_id, accreditation_code, certificate_number, issued_by, valid_from, valid_to) VALUES
(1, 'ISO9001',  'ISO-9001-2024-GAP-001', 'BSI Group',       '2024-01-15', '2027-01-14'),
(1, 'AS9100',   'AS9100-2024-GAP-044',   'LRQA',            '2024-03-01', '2027-02-28'),
(2, 'ISO9001',  'ISO-9001-2024-PAG-002', 'TÜV Rheinland',   '2024-02-10', '2027-02-09'),
(2, 'AS9100',   'AS9100-2024-PAG-055',   'DQS',             '2024-04-01', '2027-03-31'),
(3, 'AS9100',   'AS9100-2024-SCI-021',   'SAI Global',      '2023-11-01', '2026-10-31'),
(3, 'ISO9001',  'ISO-9001-2024-SCI-033', 'Bureau Veritas',  '2024-01-01', '2027-01-01'),
(4, 'ISO9001',  'ISO-9001-2023-MAS-009', 'AFNOR',           '2023-06-01', '2026-05-31'),
(5, 'ISO9001',  'ISO-9001-2022-TFC-007', 'BSI Group',       '2022-09-01', '2025-08-31');

INSERT INTO supplier_contact (supplier_id, full_name, title, email, phone, is_primary) VALUES
(1, 'James Carter',    'Account Manager',       'j.carter@globalaeroparts.com',    '+44-1332-500101', TRUE),
(1, 'Sandra Liu',      'Technical Director',    's.liu@globalaeroparts.com',        '+44-1332-500102', FALSE),
(2, 'Hans Müller',     'Sales Director',        'h.muller@precisionaero.de',       '+49-40-2200100',  TRUE),
(3, 'Mark Johnson',    'VP Operations',         'm.johnson@skycomp.com',           '+1-206-555-0110', TRUE),
(4, 'Marie Dupont',    'Key Account Manager',   'm.dupont@megaalloy.fr',           '+33-561-880022',  TRUE),
(5, 'Tom Blackwell',   'Sales Manager',         't.blackwell@techfab.co.uk',       '+44-121-700200',  TRUE);


-- ============================================================
-- PARTS & BASELINE SPECS
-- ============================================================

INSERT INTO part (part_number, part_name, category, description) VALUES
('A320-FUSE-P01',  'A320 Fuselage Panel',            'Fuselage',         'Primary fuselage panel for Airbus A320, forward section'),
('A320-WING-01',   'A320 Wing Assembly',              'Wing',             'Main wing assembly for Airbus A320'),
('B737-FUSE-02',   'B737 Fuselage Section',           'Fuselage',         'Mid-fuselage section for Boeing 737-800'),
('ENG-MOUNT-04',   'Engine Pylon Mount Bracket',      'Engine',           'Structural bracket for engine pylon attachment'),
('LAND-GEAR-05',   'Main Landing Gear Strut',         'Landing Gear',     'Hydraulic strut assembly for main landing gear');

INSERT INTO part_baseline_spec (part_id, version_no, effective_from, status, tensile_strength_mpa, yield_point_mpa, fatigue_limit_mpa, process_details_json, cad_file_uri) VALUES
(1, 1, '2023-01-01', 'active', 570.00, 490.00, 280.00,
 '{"heatTreatment":"T6 aging","machiningSteps":["rough_mill","finish_mill","deburr"],"surfaceFinish":"anodized_type2","toleranceClass":"ISO_2768_fine"}',
 'cad/A320-FUSE-P01_v1.stp'),
(2, 1, '2023-03-01', 'active', 690.00, 620.00, 340.00,
 '{"heatTreatment":"T73_overaging","machiningSteps":["rough_mill","EDM_drilling","finish_mill","shot_peen"],"surfaceFinish":"chromate_MIL-DTL-5541","toleranceClass":"ISO_2768_fine"}',
 'cad/A320-WING-01_v1.stp'),
(3, 1, '2023-05-01', 'active', 540.00, 460.00, 260.00,
 '{"heatTreatment":"T651","machiningSteps":["CNC_mill","drill","countersink","clean"],"surfaceFinish":"primer_BMS10-11","toleranceClass":"ISO_2768_medium"}',
 'cad/B737-FUSE-02_v1.stp'),
(4, 1, '2022-11-01', 'active', 890.00, 830.00, 410.00,
 '{"heatTreatment":"vacuum_brazing","machiningSteps":["rough_turn","finish_turn","grind","lap"],"surfaceFinish":"hard_anodize","toleranceClass":"ISO_2768_fine"}',
 'cad/ENG-MOUNT-04_v1.stp'),
(5, 1, '2022-08-01', 'active', 1050.00, 940.00, 480.00,
 '{"heatTreatment":"high_strength_steel_quench_temper","machiningSteps":["forge","rough_mill","precision_bore","hone"],"surfaceFinish":"cadmium_plate_LHE","toleranceClass":"ISO_2768_fine"}',
 'cad/LAND-GEAR-05_v1.stp');


-- ============================================================
-- SUPPLIER PARTS (with customization_json from scenario)
-- ============================================================

INSERT INTO supplier_part (supplier_id, part_id, supplier_part_code, customization_json, lead_time_days, approval_status, active_from) VALUES
-- Supplier A (Global AeroParts): anti-corrosion + RFID
(1, 1, 'GAP-A320-FUSE-P01-A',
 '{"features":["anti_corrosion_coating_specification_MIL-C-81706","RFID_tags_embedded_serialized_for_lifecycle_tracking"],"coating":"epoxy_primer_polyurethane_topcoat","rfidStandard":"ISO18000-6C"}',
 45, 'approved', '2023-02-01'),
-- Supplier B (Precision Aerospace): reinforced composite + shock sensors
(2, 1, 'PAG-A320-FUSE-P01-B',
 '{"features":["reinforced_composite_layering_higher_fatigue_resistance","packaging_integrated_shock_sensors"],"compositeLayering":"carbon_fibre_CFRP_extra_3_plies","packagingShockSensor":"model_SSN-25_threshold_50g"}',
 60, 'approved', '2023-04-01'),
-- Supplier C (SkyComp): heat treatment optimization + digital twin
(3, 1, 'SCI-A320-FUSE-P01-C',
 '{"features":["optimized_heat_treatment_lighter_weight","digital_twin_simulation_data_on_delivery"],"weightReductionPct":2.3,"digitalTwinFormat":"STEP+simulation_JSON","heatTreatVariant":"T7451_modified"}',
 50, 'approved', '2023-06-01'),
-- Wing assembly - Suppliers 1 and 2
(1, 2, 'GAP-A320-WING-01-A',
 '{"features":["anti_corrosion_coating","full_assembly_testing_pre_delivery"],"testStandard":"ASTM_F2971"}',
 90, 'approved', '2023-03-01'),
(2, 2, 'PAG-A320-WING-01-B',
 '{"features":["reinforced_root_joint","NDT_ultrasonic_pre_shipment"],"ndtCoverage":"100pct_root_zone"}',
 75, 'approved', '2023-05-01'),
-- B737 fuselage - Suppliers 1 and 4
(1, 3, 'GAP-B737-FUSE-02-A',
 '{"features":["standard_coating","primer_BMS10-11"],"packagingType":"wooden_crate_VCI"}',
 55, 'approved', '2023-05-01'),
(4, 3, 'MAS-B737-FUSE-02-D',
 '{"features":["French_aerospace_certified_alloy","reduced_porosity_casting"],"alloyCert":"AFNOR_NF_EN_2090"}',
 65, 'approved', '2023-07-01'),
-- Engine mount - Supplier 2
(2, 4, 'PAG-ENG-MOUNT-04-B',
 '{"features":["vacuum_brazed_assembly","100pct_X-ray_inspection"],"xrayCoverage":"all_brazed_joints"}',
 40, 'approved', '2023-01-15'),
-- Landing gear - Supplier 3
(3, 5, 'SCI-LAND-GEAR-05-C',
 '{"features":["full_hydraulic_test_pre_ship","serialized_traceability_barcode"],"hydraulicTestPressureBar":340,"serialFormat":"SCI-LG-YYYYMMDD-NNNN"}',
 80, 'approved', '2023-02-01');

-- Part documents
INSERT INTO part_document (part_id, document_type, document_name, file_uri, mime_type) VALUES
(1, 'CAD',     'A320 Fuselage Panel CAD v1',        'cad/A320-FUSE-P01_v1.stp',        'model/step'),
(2, 'CAD',     'A320 Wing Assembly CAD v1',          'cad/A320-WING-01_v1.stp',         'model/step'),
(3, 'CAD',     'B737 Fuselage Section CAD v1',       'cad/B737-FUSE-02_v1.stp',         'model/step'),
(1, 'drawing', 'A320 Fuselage Panel Drawing Rev B',  'drawings/A320-FUSE-P01_revB.pdf', 'application/pdf'),
(2, 'drawing', 'A320 Wing Assembly Drawing Rev C',   'drawings/A320-WING-01_revC.pdf',  'application/pdf'),
(4, 'CAD',     'Engine Pylon Mount CAD v1',          'cad/ENG-MOUNT-04_v1.stp',         'model/step'),
(5, 'image',   'Landing Gear Strut Prototype Photo', 'images/LAND-GEAR-05_proto.jpg',   'image/jpeg');

-- Part notes
INSERT INTO part_note (part_id, note_type, note_text) VALUES
(1, 'handling',     'Handle with clean cotton gloves. No bare-hand contact with machined surfaces. Store in humidity-controlled environment (max 60% RH).'),
(2, 'engineering',  'Critical root-zone welds require 100% ultrasonic inspection before final assembly acceptance.'),
(3, 'inspection',   'Dimensional check mandatory on all mating flanges before installation. Reference drawing B737-FUSE-02 Rev C, note 7.'),
(5, 'handling',     'Hydraulic fittings must be capped after test. Strut must remain vertical during storage to prevent seal deformation.');


-- ============================================================
-- PURCHASE ORDERS & LINES
-- ============================================================

INSERT INTO purchase_order (po_number, supplier_id, order_date, desired_delivery_date, status, created_by_emp_id) VALUES
('PO-2025-0001', 1, '2025-01-10', '2025-03-01', 'completed',    1),
('PO-2025-0002', 2, '2025-02-05', '2025-04-15', 'delivered',    1),
('PO-2025-0003', 3, '2025-03-20', '2025-06-01', 'dispatched',   1),
('PO-2025-0004', 4, '2025-05-01', '2025-07-30', 'confirmed',    1),
('PO-2025-0005', 1, '2025-06-15', '2025-09-01', 'placed',       1),
('PO-2025-0006', 2, '2025-07-01', '2025-10-15', 'placed',       1);

INSERT INTO purchase_order_line (po_id, supplier_part_id, quantity, unit_price, required_delivery_date, line_status) VALUES
(1, 1, 10, 18500.00, '2025-03-01', 'shipped'),
(1, 4, 5,  42000.00, '2025-03-01', 'shipped'),
(2, 2, 8,  22000.00, '2025-04-15', 'shipped'),
(2, 5, 3,  98000.00, '2025-04-15', 'shipped'),
(3, 3, 12, 19500.00, '2025-06-01', 'open'),
(3, 9, 4,  135000.00,'2025-06-01', 'open'),
(4, 7, 6,  21000.00, '2025-07-30', 'open'),
(5, 1, 15, 18800.00, '2025-09-01', 'open'),
(6, 5, 4,  99000.00, '2025-10-15', 'open');


-- ============================================================
-- SHIPMENTS
-- ============================================================

INSERT INTO shipment (shipment_number, tracking_number, carrier, port_of_entry, estimated_arrival, actual_arrival, status) VALUES
('SHP-2025-001', 'DHL-8849271001', 'DHL Express', 'London Heathrow', '2025-02-28', '2025-02-27', 'delivered'),
('SHP-2025-002', 'FDX-3312009922', 'FedEx Freight','Dover Port',      '2025-04-14', '2025-04-16', 'delivered'),
('SHP-2025-003', 'UPS-7740129834', 'UPS Air',      'Manchester Airport','2026-06-15',NULL,         'in_transit'),
('SHP-2025-004', 'DHL-9921004451', 'DHL Express',  'Rotterdam Port',  '2026-08-01', NULL,         'pending'),
('SHP-2025-005', 'BAE-1140229001', 'BAE Cargo',    'Glasgow Prestwick','2026-05-15', NULL,         'in_transit');

INSERT INTO shipment_line (shipment_id, po_line_id, quantity_shipped) VALUES
(1, 1, 10),
(1, 2, 5),
(2, 3, 8),
(2, 4, 3),
(3, 5, 12),
(3, 6, 4);

INSERT INTO shipment_update (shipment_id, event_timestamp, location, latitude, longitude, condition_summary, condition_payload) VALUES
(1, '2025-02-20 08:00:00', 'Derby Warehouse - Dispatch',   52.9225, -1.4746, 'Dispatched OK', '{"temperature_c":18.2,"humidity_pct":45}'),
(1, '2025-02-24 14:30:00', 'London Heathrow - Customs',   51.4775, -0.4614, 'Cleared customs','{"temperature_c":17.8,"humidity_pct":48}'),
(1, '2025-02-27 09:15:00', 'Delivery Confirmed',          51.5074, -0.1278, 'Delivered',       '{"temperature_c":18.0,"humidity_pct":50}'),
(2, '2025-04-05 07:00:00', 'Hamburg Port - Loading',      53.5753,  9.9190, 'Loaded OK',       '{"temperature_c":12.1,"humidity_pct":62}'),
(2, '2025-04-12 11:00:00', 'Dover Port - Customs',        51.1284,  1.3094, 'Delayed in customs','{"temperature_c":11.5,"humidity_pct":65}'),
(2, '2025-04-16 16:00:00', 'Birmingham - Delivered',      52.4862, -1.8904, 'Delivered late',  '{"temperature_c":13.0,"humidity_pct":58}'),
(3, '2025-05-15 09:00:00', 'Seattle - Dispatch',          47.6062,-122.3321,'In transit',      '{"temperature_c":16.5,"humidity_pct":55}'),
(3, '2025-05-22 12:00:00', 'Chicago - Hub',               41.8781, -87.6298,'Hub transfer',    '{"temperature_c":17.2,"humidity_pct":52}');


-- ============================================================
-- FAILURE CAUSES
-- ============================================================

INSERT INTO failure_cause (code, description, category) VALUES
('DIM-TOL-EXCEED',  'Dimensional measurement outside tolerance band',           'dimensional'),
('SURFACE-DEFECT',  'Surface scratch, corrosion, or coating delamination found', 'surface'),
('NDT-CRACK',       'Internal crack or void detected via NDT',                   'NDT'),
('MATERIAL-CERT',   'Material certification missing or invalid',                 'material'),
('ENV-HUMIDITY',    'Component exposed to humidity beyond specification',         'environmental'),
('ENV-TEMP',        'Component exposed to temperature outside specification',     'environmental'),
('PACK-DAMAGE',     'Packaging damage leading to component impact',               'surface'),
('WELD-DEFECT',     'Weld porosity or incomplete fusion detected',               'NDT');


-- ============================================================
-- QC REPORTS (reflecting the two sample JSON files)
-- ============================================================

INSERT INTO qc_report (report_number, supplier_part_id, shipment_id, po_line_id, inspection_type, overall_result, version_no, status, inspector_emp_id, inspection_date, report_payload_json, mongo_report_id) VALUES
-- Aligned to Dim_NDT_report.json sample
('QC-784512-A1', 4, 2, 4, 'combined', 'Pass', 1, 'approved', 2, '2025-08-28',
 '{
   "reportId": "QC-784512-A1",
   "partId": "A320-WING-01",
   "inspectionDate": "2025-08-28",
   "inspector": {"name": "Bob Inspector", "employeeId": "EMP-002"},
   "results": {
     "visualInspection": "Pass",
     "dimensionalTolerance": {
       "result": "Pass",
       "measurements": [
         {"dimension": "length", "measured": 15.002, "unit": "m"},
         {"dimension": "width", "measured": 3.499, "unit": "m"}
       ],
       "deviation": 0.002
     },
     "nondestructiveTesting": {
       "type": "Ultrasonic",
       "result": "Pass",
       "comments": "No internal defects detected."
     }
   },
   "certification": {
     "certifiedBy": "Bob Inspector",
     "certDate": "2025-08-29",
     "stamp": "CertifiedOK"
   }
 }',
 'qc_QC-784512-A1'),

-- Aligned to EnvironmentalTest_report.json sample
('QC-889234-Z9', 6, 3, 5, 'environmental', 'Pass', 1, 'approved', 2, '2025-09-01',
 '{
   "reportId": "QC-889234-Z9",
   "partId": "B737-FUSE-02",
   "inspectionDate": "2025-09-01",
   "inspector": {"name": "Bob Inspector", "employeeId": "EMP-002"},
   "overallResult": "Pass",
   "environmentalTest": {
     "temperatureRange": "-55 to 70C",
     "humidityExposure": "95% RH for 48 hours",
     "result": "Pass"
   },
   "notes": "Component withstood environmental stress without cracking or warping."
 }',
 'qc_QC-889234-Z9'),

-- Additional QC report with failure
('QC-001122-F3', 7, 3, NULL, 'dimensional', 'Fail', 1, 'submitted', 2, '2025-09-10',
 '{
   "reportId": "QC-001122-F3",
   "partId": "B737-FUSE-02",
   "inspectionDate": "2025-09-10",
   "inspector": {"name": "Bob Inspector", "employeeId": "EMP-002"},
   "overallResult": "Fail",
   "results": {
     "visualInspection": "Pass",
     "dimensionalTolerance": {
       "result": "Fail",
       "measurements": [
         {"dimension": "flange_width", "measured": 48.7, "unit": "mm", "nominal": 47.5, "tolerance": "+/-0.5"},
         {"dimension": "bolt_hole_spacing", "measured": 120.3, "unit": "mm", "nominal": 120.0, "tolerance": "+/-0.2"}
       ],
       "deviation": 1.3,
       "comment": "Flange width and bolt hole spacing outside tolerance"
     }
   }
 }',
 'qc_QC-001122-F3');

-- Link the failed report to its failure cause
INSERT INTO qc_report_failure (qc_report_id, failure_cause_id, notes)
SELECT qr.qc_report_id, fc.failure_cause_id, 'Flange width 1.2mm over upper tolerance; bolt hole spacing 0.3mm over tolerance'
FROM qc_report qr, failure_cause fc
WHERE qr.report_number='QC-001122-F3' AND fc.code='DIM-TOL-EXCEED';


-- ============================================================
-- CERTIFICATIONS & VERSIONS
-- ============================================================

INSERT INTO certification (certification_number, supplier_part_id, shipment_id, qc_report_id, current_version, status, mongo_cert_id)
SELECT 'CERT-2025-AX-993', sp.supplier_part_id, 2, qr.qc_report_id, 1, 'approved', 'cert_CERT-2025-AX-993'
FROM supplier_part sp, qc_report qr
WHERE sp.supplier_part_code='GAP-A320-WING-01-A' AND qr.report_number='QC-784512-A1';

INSERT INTO certification (certification_number, supplier_part_id, shipment_id, qc_report_id, current_version, status, mongo_cert_id)
SELECT 'CERT-2025-BZ-441', sp.supplier_part_id, 3, qr.qc_report_id, 1, 'submitted', 'cert_CERT-2025-BZ-441'
FROM supplier_part sp, qc_report qr
WHERE sp.supplier_part_code='GAP-B737-FUSE-02-A' AND qr.report_number='QC-889234-Z9';

-- Certification versions
INSERT INTO certification_version (certification_id, version_no, is_finalized, finalized_at, certified_by_emp_id, digital_stamp, signature_data, notes)
SELECT c.certification_id, 1, TRUE, '2025-08-30 10:00:00', u.emp_id, 'STAMP-BOB-7723', 'Electronically Signed - Bob Inspector', 'Initial approval'
FROM certification c, user_account u
WHERE c.certification_number='CERT-2025-AX-993' AND u.email='bob@aeronetb.com';

INSERT INTO certification_version (certification_id, version_no, is_finalized, certified_by_emp_id, digital_stamp, notes)
SELECT c.certification_id, 1, FALSE, u.emp_id, 'STAMP-BOB-7723', 'Pending final review'
FROM certification c, user_account u
WHERE c.certification_number='CERT-2025-BZ-441' AND u.email='bob@aeronetb.com';

-- Material batches
INSERT INTO material_batch (certification_version_id, batch_number, material_name, origin_country, supplier_cert_reference)
SELECT cv.certification_version_id, 'ALU-BATCH-77X', 'Aluminum Alloy 7075', 'Germany', 'CERT-SUP-2025-442'
FROM certification_version cv JOIN certification c ON cv.certification_id=c.certification_id
WHERE c.certification_number='CERT-2025-AX-993';

INSERT INTO material_batch (certification_version_id, batch_number, material_name, origin_country, supplier_cert_reference)
SELECT cv.certification_version_id, 'RES-BATCH-44P', 'Composite Resin X1', 'USA', 'CERT-SUP-2025-981'
FROM certification_version cv JOIN certification c ON cv.certification_id=c.certification_id
WHERE c.certification_number='CERT-2025-AX-993';


-- ============================================================
-- EQUIPMENT & IOT DEVICES
-- ============================================================

INSERT INTO equipment (equipment_code, equipment_type, equipment_name, facility, location_detail, status) VALUES
('MACH-CNC-001',   'manufacturing_machine', 'CNC Milling Centre Alpha',       'Derby Plant A',   'Bay 3, Line 1',  'operational'),
('MACH-LATHE-002', 'manufacturing_machine', 'Precision Lathe Beta',            'Derby Plant A',   'Bay 5, Line 2',  'operational'),
('MACH-NDT-003',   'test_bench',            'Ultrasonic NDT Station',          'Derby Plant A',   'QC Lab, Bay 1',  'operational'),
('CONT-TRANSIT-01','transit_container',     'Refrigerated Transit Container 1','In Transit',      'Shipment SHP-2025-003', 'operational'),
('MACH-PRESS-004', 'manufacturing_machine', 'Hydraulic Press Delta',           'Derby Plant B',   'Bay 2, Line 3',  'maintenance'),
('MACH-HEAT-005',  'manufacturing_machine', 'Heat Treatment Furnace Epsilon',  'Derby Plant B',   'Bay 7, Line 1',  'operational');

INSERT INTO iot_device (equipment_id, serial_no, device_type, firmware_version, is_active, installed_at) VALUES
(1, 'IOT-CNC001-TEMP-01',  'temperature', 'v2.4.1', TRUE, '2024-01-15 09:00:00'),
(1, 'IOT-CNC001-VIB-01',   'vibration',   'v2.4.1', TRUE, '2024-01-15 09:00:00'),
(2, 'IOT-LATHE002-TEMP-01','temperature', 'v2.3.0', TRUE, '2024-02-20 10:00:00'),
(3, 'IOT-NDT003-PRESS-01', 'pressure',    'v1.9.2', TRUE, '2023-11-01 08:00:00'),
(4, 'IOT-CONT01-TEMP-01',  'temperature', 'v3.1.0', TRUE, '2025-05-15 07:00:00'),
(4, 'IOT-CONT01-GPS-01',   'gps',         'v3.1.0', TRUE, '2025-05-15 07:00:00'),
(6, 'IOT-HEAT005-TEMP-01', 'temperature', 'v2.4.1', TRUE, '2024-03-10 11:00:00');

-- Sensor readings (IoT telemetry - scenario Section 5 structure)
INSERT INTO sensor_reading (device_id, equipment_id, event_timestamp, metric_type, metric_value, unit, raw_payload) VALUES
(1, 1, '2025-05-19 08:00:00', 'temperature',  72.4,  'C',   '{"deviceId":"IOT-CNC001-TEMP-01","equipmentId":"MACH-CNC-001","timestamp":"2025-05-19T08:00:00Z","temperature_c":72.4,"status":"normal"}'),
(1, 1, '2025-05-19 08:15:00', 'temperature',  73.1,  'C',   '{"deviceId":"IOT-CNC001-TEMP-01","equipmentId":"MACH-CNC-001","timestamp":"2025-05-19T08:15:00Z","temperature_c":73.1,"status":"normal"}'),
(1, 1, '2025-05-19 08:30:00', 'temperature',  89.7,  'C',   '{"deviceId":"IOT-CNC001-TEMP-01","equipmentId":"MACH-CNC-001","timestamp":"2025-05-19T08:30:00Z","temperature_c":89.7,"status":"warning"}'),
(2, 1, '2025-05-19 08:00:00', 'vibration',    1.2,   'g',   '{"deviceId":"IOT-CNC001-VIB-01","equipmentId":"MACH-CNC-001","timestamp":"2025-05-19T08:00:00Z","vibration_g":1.2,"status":"normal"}'),
(2, 1, '2025-05-19 08:15:00', 'vibration',    1.4,   'g',   '{"deviceId":"IOT-CNC001-VIB-01","equipmentId":"MACH-CNC-001","timestamp":"2025-05-19T08:15:00Z","vibration_g":1.4,"status":"normal"}'),
(2, 1, '2025-05-19 08:30:00', 'vibration',    3.8,   'g',   '{"deviceId":"IOT-CNC001-VIB-01","equipmentId":"MACH-CNC-001","timestamp":"2025-05-19T08:30:00Z","vibration_g":3.8,"status":"alert"}'),
(5, 4, '2025-05-19 10:00:00', 'temperature',  4.2,   'C',   '{"deviceId":"IOT-CONT01-TEMP-01","equipmentId":"CONT-TRANSIT-01","timestamp":"2025-05-19T10:00:00Z","temperature_c":4.2,"status":"normal"}'),
(5, 4, '2025-05-19 10:30:00', 'temperature',  4.8,   'C',   '{"deviceId":"IOT-CONT01-TEMP-01","equipmentId":"CONT-TRANSIT-01","timestamp":"2025-05-19T10:30:00Z","temperature_c":4.8,"status":"normal"}'),
(6, 4, '2025-05-19 10:00:00', 'gps_lat',      41.8781,'deg', '{"deviceId":"IOT-CONT01-GPS-01","equipmentId":"CONT-TRANSIT-01","timestamp":"2025-05-19T10:00:00Z","gps":{"lat":41.8781,"lon":-87.6298},"location":"Chicago Hub"}'),
(6, 4, '2025-05-19 10:00:00', 'gps_lon',     -87.6298,'deg', NULL),
(7, 6, '2025-05-19 09:00:00', 'temperature', 845.0,  'C',   '{"deviceId":"IOT-HEAT005-TEMP-01","equipmentId":"MACH-HEAT-005","timestamp":"2025-05-19T09:00:00Z","temperature_c":845.0,"setPoint_c":840,"status":"normal"}'),
(7, 6, '2025-05-19 10:00:00', 'temperature', 862.0,  'C',   '{"deviceId":"IOT-HEAT005-TEMP-01","equipmentId":"MACH-HEAT-005","timestamp":"2025-05-19T10:00:00Z","temperature_c":862.0,"setPoint_c":840,"status":"warning"}');

-- Alert events
INSERT INTO alert_event (equipment_id, device_id, alert_type, severity, status, triggered_at, threshold_value, actual_value, message) VALUES
(1, 1, 'temperature_breach', 'warning',  'open', '2025-05-19 08:30:00', 85.0, 89.7, 'CNC Milling Centre Alpha temperature exceeded 85°C threshold'),
(1, 2, 'vibration_anomaly',  'critical', 'open', '2025-05-19 08:30:00',  2.5,  3.8, 'CNC Milling Centre Alpha vibration exceeded 2.5g threshold - inspect spindle bearing'),
(6, 7, 'temperature_breach', 'warning',  'acknowledged', '2025-05-19 10:00:00', 855.0, 862.0, 'Heat furnace temperature 7°C above upper setpoint tolerance');


-- ============================================================
-- SAMPLE AUDIT LOG ENTRIES
-- ============================================================

INSERT INTO audit_log (emp_id, action_type, entity_type, entity_id, entity_ref, ip_address, details) VALUES
(1, 'login',    NULL,        NULL, NULL,              '10.0.1.5',  '{"method":"password"}'),
(1, 'create',   'purchase_order', 1, 'PO-2025-0001', '10.0.1.5',  '{"supplier_id":1,"lines":2}'),
(2, 'login',    NULL,        NULL, NULL,              '10.0.1.8',  '{"method":"password"}'),
(2, 'create',   'qc_report', 1, 'QC-784512-A1',      '10.0.1.8',  '{"result":"Pass","type":"combined"}'),
(2, 'approve',  'qc_report', 1, 'QC-784512-A1',      '10.0.1.8',  '{"status_before":"submitted","status_after":"approved"}'),
(2, 'approve',  'certification', 1, 'CERT-2025-AX-993','10.0.1.8','{"finalized":true}'),
(5, 'login',    NULL,        NULL, NULL,              '10.0.1.15', '{"method":"password"}'),
(5, 'view',     'certification', 1, 'CERT-2025-AX-993','10.0.1.15','{"action":"read_only_access"}'),
(5, 'view',     'qc_report', 1, 'QC-784512-A1',      '10.0.1.15', '{"action":"read_only_access"}');

-- ============================================================
-- SEED ENRICHMENT — Demo-ready data
-- ============================================================

-- Delivery dates on existing POs (fixes supplier KPI bar chart)
UPDATE purchase_order SET actual_delivery_date = '2025-02-27' WHERE po_number = 'PO-2025-0001';  -- on-time
UPDATE purchase_order SET actual_delivery_date = '2025-04-17' WHERE po_number = 'PO-2025-0002';  -- 2 days late


-- ============================================================
-- ADDITIONAL QC REPORTS — 18 reports, Jun 2024–May 2026
-- ~70% Pass / ~30% Fail, all suppliers, all types
-- ============================================================

INSERT INTO qc_report (report_number, supplier_part_id, shipment_id, po_line_id, inspection_type, overall_result, version_no, status, inspector_emp_id, inspection_date, report_payload_json, mongo_report_id) VALUES

('QC-100-001', 1, NULL, NULL, 'visual',        'Pass', 1, 'approved', 2, '2024-06-05',
 '{"reportId":"QC-100-001","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"visualInspection":"Pass","notes":"No surface defects found."}}',
 'qc_QC-100-001'),

('QC-100-002', 2, NULL, NULL, 'dimensional',   'Pass', 1, 'approved', 2, '2024-06-20',
 '{"reportId":"QC-100-002","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"dimensionalTolerance":{"result":"Pass","deviation":0.001}}}',
 'qc_QC-100-002'),

('QC-100-003', 3, NULL, NULL, 'NDT',           'Fail', 1, 'approved', 2, '2024-07-08',
 '{"reportId":"QC-100-003","inspector":{"name":"Bob Inspector"},"overallResult":"Fail","results":{"nondestructiveTesting":{"type":"Ultrasonic","result":"Fail","comments":"Internal void detected near weld seam."}}}',
 'qc_QC-100-003'),

('QC-100-004', 4, NULL, NULL, 'environmental', 'Pass', 1, 'approved', 2, '2024-07-22',
 '{"reportId":"QC-100-004","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"environmentalTest":{"temperatureRange":"-55 to 70C","result":"Pass"}}}',
 'qc_QC-100-004'),

('QC-100-005', 5, NULL, NULL, 'visual',        'Pass', 1, 'approved', 2, '2024-08-10',
 '{"reportId":"QC-100-005","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"visualInspection":"Pass","notes":"Landing gear strut — surface clean, no scoring."}}',
 'qc_QC-100-005'),

('QC-100-006', 6, NULL, NULL, 'dimensional',   'Fail', 1, 'approved', 2, '2024-08-28',
 '{"reportId":"QC-100-006","inspector":{"name":"Bob Inspector"},"overallResult":"Fail","results":{"dimensionalTolerance":{"result":"Fail","deviation":1.8,"comment":"Bolt hole spacing 1.8mm over upper tolerance."}}}',
 'qc_QC-100-006'),

('QC-100-007', 7, NULL, NULL, 'combined',      'Pass', 1, 'approved', 2, '2024-09-12',
 '{"reportId":"QC-100-007","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"visualInspection":"Pass","dimensionalTolerance":{"result":"Pass"},"nondestructiveTesting":{"result":"Pass"}}}',
 'qc_QC-100-007'),

('QC-100-008', 8, NULL, NULL, 'NDT',           'Pass', 1, 'approved', 2, '2024-09-25',
 '{"reportId":"QC-100-008","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"nondestructiveTesting":{"type":"X-ray","result":"Pass","comments":"All brazed joints clean."}}}',
 'qc_QC-100-008'),

('QC-100-009', 9, NULL, NULL, 'visual',        'Fail', 1, 'approved', 2, '2024-10-14',
 '{"reportId":"QC-100-009","inspector":{"name":"Bob Inspector"},"overallResult":"Fail","results":{"visualInspection":"Fail","notes":"Coating delamination found on leading edge. Rejected."}}',
 'qc_QC-100-009'),

('QC-100-010', 1, NULL, NULL, 'dimensional',   'Pass', 1, 'approved', 2, '2024-10-30',
 '{"reportId":"QC-100-010","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"dimensionalTolerance":{"result":"Pass","deviation":0.003}}}',
 'qc_QC-100-010'),

('QC-100-011', 2, NULL, NULL, 'environmental', 'Pass', 1, 'approved', 2, '2024-11-18',
 '{"reportId":"QC-100-011","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"environmentalTest":{"humidityExposure":"95% RH for 48h","result":"Pass"}}}',
 'qc_QC-100-011'),

('QC-100-012', 3, NULL, NULL, 'NDT',           'Pass', 1, 'approved', 2, '2024-12-05',
 '{"reportId":"QC-100-012","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"nondestructiveTesting":{"type":"Ultrasonic","result":"Pass","comments":"No defects detected."}}}',
 'qc_QC-100-012'),

('QC-100-013', 5, NULL, NULL, 'combined',      'Pass', 1, 'approved', 2, '2025-01-14',
 '{"reportId":"QC-100-013","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"visualInspection":"Pass","dimensionalTolerance":{"result":"Pass"}}}',
 'qc_QC-100-013'),

('QC-100-014', 4, NULL, NULL, 'visual',        'Fail', 1, 'approved', 2, '2025-02-03',
 '{"reportId":"QC-100-014","inspector":{"name":"Bob Inspector"},"overallResult":"Fail","results":{"visualInspection":"Fail","notes":"Weld porosity visible on bracket base. Scrapped."}}',
 'qc_QC-100-014'),

('QC-100-015', 6, NULL, NULL, 'dimensional',   'Pass', 1, 'approved', 2, '2025-02-20',
 '{"reportId":"QC-100-015","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"dimensionalTolerance":{"result":"Pass","deviation":0.2}}}',
 'qc_QC-100-015'),

('QC-100-016', 1, NULL, NULL, 'NDT',           'Pass', 1, 'approved', 2, '2025-03-10',
 '{"reportId":"QC-100-016","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"nondestructiveTesting":{"type":"Ultrasonic","result":"Pass"}}}',
 'qc_QC-100-016'),

('QC-100-017', 7, NULL, NULL, 'environmental', 'Pass', 1, 'approved', 2, '2025-04-07',
 '{"reportId":"QC-100-017","inspector":{"name":"Bob Inspector"},"overallResult":"Pass","results":{"environmentalTest":{"temperatureRange":"-55 to 70C","result":"Pass"}}}',
 'qc_QC-100-017'),

('QC-100-018', 3, NULL, NULL, 'visual',        'Fail', 1, 'submitted', 2, '2025-05-02',
 '{"reportId":"QC-100-018","inspector":{"name":"Bob Inspector"},"overallResult":"Fail","results":{"visualInspection":"Fail","notes":"Packaging damage — component shows impact marks on flange."}}',
 'qc_QC-100-018');


-- Link Fail reports to failure causes
INSERT INTO qc_report_failure (qc_report_id, failure_cause_id, notes)
SELECT qr.qc_report_id, fc.failure_cause_id, 'Internal void detected via ultrasonic scan near weld seam'
FROM qc_report qr, failure_cause fc
WHERE qr.report_number = 'QC-100-003' AND fc.code = 'NDT-CRACK';

INSERT INTO qc_report_failure (qc_report_id, failure_cause_id, notes)
SELECT qr.qc_report_id, fc.failure_cause_id, 'Bolt hole spacing 1.8mm over upper tolerance'
FROM qc_report qr, failure_cause fc
WHERE qr.report_number = 'QC-100-006' AND fc.code = 'DIM-TOL-EXCEED';

INSERT INTO qc_report_failure (qc_report_id, failure_cause_id, notes)
SELECT qr.qc_report_id, fc.failure_cause_id, 'Coating delamination on leading edge surface'
FROM qc_report qr, failure_cause fc
WHERE qr.report_number = 'QC-100-009' AND fc.code = 'SURFACE-DEFECT';

INSERT INTO qc_report_failure (qc_report_id, failure_cause_id, notes)
SELECT qr.qc_report_id, fc.failure_cause_id, 'Weld porosity visible on bracket base — scrapped'
FROM qc_report qr, failure_cause fc
WHERE qr.report_number = 'QC-100-014' AND fc.code = 'WELD-DEFECT';

INSERT INTO qc_report_failure (qc_report_id, failure_cause_id, notes)
SELECT qr.qc_report_id, fc.failure_cause_id, 'Impact marks on flange from packaging damage during transit'
FROM qc_report qr, failure_cause fc
WHERE qr.report_number = 'QC-100-018' AND fc.code = 'PACK-DAMAGE';


-- ============================================================
-- ADDITIONAL SENSOR READINGS — CNC Milling Centre Alpha
-- Device 1 (temperature), Equipment 1
-- 40 readings over past 30 days at realistic intervals
-- ============================================================

INSERT INTO sensor_reading (device_id, equipment_id, event_timestamp, metric_type, metric_value, unit, raw_payload) VALUES
(1, 1, NOW() - INTERVAL '29 days 8 hours',  'temperature', 68.2, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '29 days 7 hours',  'temperature', 69.8, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '28 days 9 hours',  'temperature', 71.1, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '28 days 8 hours',  'temperature', 72.4, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '27 days 9 hours',  'temperature', 70.9, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '27 days 7 hours',  'temperature', 73.5, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '26 days 9 hours',  'temperature', 74.8, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '26 days 7 hours',  'temperature', 76.3, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '25 days 8 hours',  'temperature', 75.0, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '24 days 9 hours',  'temperature', 77.2, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '24 days 7 hours',  'temperature', 78.9, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '23 days 9 hours',  'temperature', 80.1, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '23 days 7 hours',  'temperature', 81.5, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '22 days 9 hours',  'temperature', 79.3, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '22 days 7 hours',  'temperature', 82.7, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '21 days 9 hours',  'temperature', 84.1, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '20 days 9 hours',  'temperature', 86.3, 'C', '{"status":"warning"}'),
(1, 1, NOW() - INTERVAL '20 days 7 hours',  'temperature', 88.9, 'C', '{"status":"warning"}'),
(1, 1, NOW() - INTERVAL '19 days 9 hours',  'temperature', 91.4, 'C', '{"status":"alert"}'),
(1, 1, NOW() - INTERVAL '19 days 7 hours',  'temperature', 89.7, 'C', '{"status":"warning"}'),
(1, 1, NOW() - INTERVAL '18 days 9 hours',  'temperature', 87.2, 'C', '{"status":"warning"}'),
(1, 1, NOW() - INTERVAL '18 days 7 hours',  'temperature', 84.6, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '17 days 9 hours',  'temperature', 82.1, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '17 days 7 hours',  'temperature', 80.5, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '16 days 9 hours',  'temperature', 78.8, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '15 days 9 hours',  'temperature', 76.3, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '14 days 9 hours',  'temperature', 74.9, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '13 days 9 hours',  'temperature', 73.5, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '12 days 9 hours',  'temperature', 75.8, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '11 days 9 hours',  'temperature', 77.4, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '10 days 9 hours',  'temperature', 79.1, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '9 days 9 hours',   'temperature', 76.6, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '8 days 9 hours',   'temperature', 74.2, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '7 days 9 hours',   'temperature', 72.8, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '6 days 9 hours',   'temperature', 71.5, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '5 days 9 hours',   'temperature', 73.9, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '4 days 9 hours',   'temperature', 75.2, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '3 days 9 hours',   'temperature', 76.8, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '2 days 9 hours',   'temperature', 74.5, 'C', '{"status":"normal"}'),
(1, 1, NOW() - INTERVAL '1 day 9 hours',    'temperature', 72.3, 'C', '{"status":"normal"}');


-- ============================================================
-- SHIPMENT MAP CHECKPOINTS — active shipments with lat/lon
-- SHP-2025-003 (in_transit, id=3): Seattle → Chicago → Atlantic → Manchester
-- SHP-2025-004 (pending,    id=4): Derby → Rotterdam (loading)
-- ============================================================

-- SHP-2025-003: more recent checkpoints showing trans-Atlantic progress
INSERT INTO shipment_update (shipment_id, event_timestamp, location, latitude, longitude, condition_summary, condition_payload) VALUES
(3, NOW() - INTERVAL '12 days', 'Mid-Atlantic — Flight LH8847',        49.5000, -35.1000, 'In transit',     '{"temperature_c":20.1,"humidity_pct":45,"altitude_ft":37000}'),
(3, NOW() - INTERVAL '6 days',  'Shannon Airport, Ireland — Refuelling',52.7020,  -8.9248, 'Fuel stop OK',   '{"temperature_c":14.3,"humidity_pct":72}'),
(3, NOW() - INTERVAL '2 days',  'Manchester Airport — Customs Hold',   53.3537,  -2.2750, 'Awaiting customs clearance', '{"temperature_c":12.8,"humidity_pct":68}');

-- SHP-2025-004: departure + loading checkpoints
INSERT INTO shipment_update (shipment_id, event_timestamp, location, latitude, longitude, condition_summary, condition_payload) VALUES
(4, NOW() - INTERVAL '18 days', 'Derby Plant A — Dispatch Warehouse',  52.9225,  -1.4746, 'Packed and labelled OK', '{"temperature_c":18.0,"humidity_pct":50}'),
(4, NOW() - INTERVAL '10 days', 'Rotterdam Port — Container Loading',  51.9225,   4.4792, 'Loaded onto vessel MV Aero Freight 7', '{"temperature_c":15.5,"humidity_pct":62}');

-- SHP-2025-005: overdue mid-Atlantic flight (red pin — visual alert demo)
INSERT INTO shipment_update (shipment_id, event_timestamp, location, latitude, longitude, condition_summary, condition_payload) VALUES
(5, NOW() - INTERVAL '8 days', 'New York JFK — Dispatch',             40.6413, -73.7781, 'Loaded OK',     '{"temperature_c":21.5,"humidity_pct":48}'),
(5, NOW() - INTERVAL '3 days', 'Mid-Atlantic — Flight BAE8847',       45.0000, -38.5000, 'In transit — ETA exceeded', '{"temperature_c":19.8,"humidity_pct":47,"altitude_ft":37000}');


-- ============================================================
-- END OF SEED DATA
-- ============================================================
