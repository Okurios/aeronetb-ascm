// ============================================================
// AeroNetB ASCM - MongoDB Seed Script
// 5CM506 Data Driven Systems - Student: 100735056
// Run: node backend/scripts/03_mongodb_seed.js
// ============================================================

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME   = process.env.MONGO_DB   || 'aeronetb_ascm';

async function seed() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  console.log(`Connected to MongoDB: ${DB_NAME}`);

  // Drop all collections for clean re-seed
  const collections = ['supplier_catalog','part_master','supplier_part_profile',
    'purchase_orders','shipments','qc_reports','certifications',
    'equipment_devices','sensor_events','users_access','audit_events'];
  for (const col of collections) {
    await db.collection(col).drop().catch(() => {});
  }
  console.log('Dropped existing collections.');

  // ============================================================
  // 1. supplier_catalog
  // ============================================================
  await db.collection('supplier_catalog').insertMany([
    {
      supplierId: 'SUP-001',
      businessName: 'Global AeroParts Ltd.',
      address: { line1: '14 Aviation Way', city: 'Derby', country: 'United Kingdom' },
      status: 'active',
      accreditations: [
        { code: 'ISO9001', certificateNumber: 'ISO-9001-2024-GAP-001', issuedBy: 'BSI Group', validTo: '2027-01-14' },
        { code: 'AS9100',  certificateNumber: 'AS9100-2024-GAP-044',   issuedBy: 'LRQA',      validTo: '2027-02-28' }
      ],
      contacts: [
        { name: 'James Carter', title: 'Account Manager', email: 'j.carter@globalaeroparts.com', phone: '+44-1332-500101', isPrimary: true },
        { name: 'Sandra Liu',   title: 'Technical Director', email: 's.liu@globalaeroparts.com',  phone: '+44-1332-500102', isPrimary: false }
      ],
      suppliedPartIds: ['SPART-001','SPART-004','SPART-006']
    },
    {
      supplierId: 'SUP-002',
      businessName: 'Precision Aerospace GmbH',
      address: { line1: 'Industriestrasse 88', city: 'Hamburg', country: 'Germany' },
      status: 'active',
      accreditations: [
        { code: 'ISO9001', certificateNumber: 'ISO-9001-2024-PAG-002', issuedBy: 'TÜV Rheinland', validTo: '2027-02-09' },
        { code: 'AS9100',  certificateNumber: 'AS9100-2024-PAG-055',   issuedBy: 'DQS',           validTo: '2027-03-31' }
      ],
      contacts: [
        { name: 'Hans Müller', title: 'Sales Director', email: 'h.muller@precisionaero.de', phone: '+49-40-2200100', isPrimary: true }
      ],
      suppliedPartIds: ['SPART-002','SPART-005','SPART-008']
    },
    {
      supplierId: 'SUP-003',
      businessName: 'SkyComp Industries Inc.',
      address: { line1: '200 Aerospace Blvd', city: 'Seattle', country: 'USA' },
      status: 'active',
      accreditations: [
        { code: 'AS9100',  certificateNumber: 'AS9100-2024-SCI-021', issuedBy: 'SAI Global',     validTo: '2026-10-31' },
        { code: 'ISO9001', certificateNumber: 'ISO-9001-2024-SCI-033',issuedBy: 'Bureau Veritas', validTo: '2027-01-01' }
      ],
      contacts: [
        { name: 'Mark Johnson', title: 'VP Operations', email: 'm.johnson@skycomp.com', phone: '+1-206-555-0110', isPrimary: true }
      ],
      suppliedPartIds: ['SPART-003','SPART-009']
    }
  ]);
  console.log('✓ supplier_catalog seeded');

  // ============================================================
  // 2. part_master
  // ============================================================
  await db.collection('part_master').insertMany([
    {
      partId: 'A320-FUSE-P01',
      partNumber: 'A320-FUSE-P01',
      partName: 'A320 Fuselage Panel',
      category: 'Fuselage',
      description: 'Primary fuselage panel for Airbus A320, forward section',
      baselineSpec: {
        versionNo: 1,
        effectiveFrom: '2023-01-01',
        status: 'active',
        mechanicalProperties: {
          tensileStrengthMpa: 570,
          yieldPointMpa: 490,
          fatigueLimitMpa: 280
        },
        processDetails: {
          heatTreatment: 'T6 aging',
          machiningSteps: ['rough_mill','finish_mill','deburr'],
          surfaceFinish: 'anodized_type2',
          toleranceClass: 'ISO_2768_fine'
        },
        cadFileUri: 'cad/A320-FUSE-P01_v1.stp'
      },
      documents: [
        { type: 'CAD',     name: 'A320 Fuselage Panel CAD v1',       uri: 'cad/A320-FUSE-P01_v1.stp',        mimeType: 'model/step' },
        { type: 'drawing', name: 'A320 Fuselage Panel Drawing Rev B', uri: 'drawings/A320-FUSE-P01_revB.pdf', mimeType: 'application/pdf' }
      ],
      notes: [
        { type: 'handling', text: 'Handle with clean cotton gloves. Store at max 60% RH.' }
      ],
      supplierPartIds: ['SPART-001','SPART-002','SPART-003']
    },
    {
      partId: 'A320-WING-01',
      partNumber: 'A320-WING-01',
      partName: 'A320 Wing Assembly',
      category: 'Wing',
      description: 'Main wing assembly for Airbus A320',
      baselineSpec: {
        versionNo: 1,
        effectiveFrom: '2023-03-01',
        status: 'active',
        mechanicalProperties: {
          tensileStrengthMpa: 690,
          yieldPointMpa: 620,
          fatigueLimitMpa: 340
        },
        processDetails: {
          heatTreatment: 'T73_overaging',
          machiningSteps: ['rough_mill','EDM_drilling','finish_mill','shot_peen'],
          surfaceFinish: 'chromate_MIL-DTL-5541',
          toleranceClass: 'ISO_2768_fine'
        },
        cadFileUri: 'cad/A320-WING-01_v1.stp'
      },
      documents: [
        { type: 'CAD',     name: 'A320 Wing Assembly CAD v1',       uri: 'cad/A320-WING-01_v1.stp',        mimeType: 'model/step' },
        { type: 'drawing', name: 'A320 Wing Assembly Drawing Rev C', uri: 'drawings/A320-WING-01_revC.pdf', mimeType: 'application/pdf' }
      ],
      notes: [
        { type: 'engineering', text: 'Critical root-zone welds require 100% ultrasonic inspection before acceptance.' }
      ],
      supplierPartIds: ['SPART-004','SPART-005']
    },
    {
      partId: 'B737-FUSE-02',
      partNumber: 'B737-FUSE-02',
      partName: 'B737 Fuselage Section',
      category: 'Fuselage',
      description: 'Mid-fuselage section for Boeing 737-800',
      baselineSpec: {
        versionNo: 1,
        effectiveFrom: '2023-05-01',
        status: 'active',
        mechanicalProperties: {
          tensileStrengthMpa: 540,
          yieldPointMpa: 460,
          fatigueLimitMpa: 260
        },
        processDetails: {
          heatTreatment: 'T651',
          machiningSteps: ['CNC_mill','drill','countersink','clean'],
          surfaceFinish: 'primer_BMS10-11',
          toleranceClass: 'ISO_2768_medium'
        },
        cadFileUri: 'cad/B737-FUSE-02_v1.stp'
      },
      documents: [
        { type: 'CAD', name: 'B737 Fuselage Section CAD v1', uri: 'cad/B737-FUSE-02_v1.stp', mimeType: 'model/step' }
      ],
      notes: [
        { type: 'inspection', text: 'Dimensional check mandatory on all mating flanges. Reference drawing B737-FUSE-02 Rev C, note 7.' }
      ],
      supplierPartIds: ['SPART-006','SPART-007']
    }
  ]);
  console.log('✓ part_master seeded');

  // ============================================================
  // 3. supplier_part_profile
  // ============================================================
  await db.collection('supplier_part_profile').insertMany([
    {
      supplierPartId: 'SPART-001',
      supplierId: 'SUP-001',
      partId: 'A320-FUSE-P01',
      supplierPartCode: 'GAP-A320-FUSE-P01-A',
      approvalStatus: 'approved',
      leadTimeDays: 45,
      customizations: {
        features: ['anti_corrosion_coating_specification_MIL-C-81706','RFID_tags_embedded_serialized_for_lifecycle_tracking'],
        coating: 'epoxy_primer_polyurethane_topcoat',
        rfidStandard: 'ISO18000-6C'
      }
    },
    {
      supplierPartId: 'SPART-002',
      supplierId: 'SUP-002',
      partId: 'A320-FUSE-P01',
      supplierPartCode: 'PAG-A320-FUSE-P01-B',
      approvalStatus: 'approved',
      leadTimeDays: 60,
      customizations: {
        features: ['reinforced_composite_layering_higher_fatigue_resistance','packaging_integrated_shock_sensors'],
        compositeLayering: 'carbon_fibre_CFRP_extra_3_plies',
        packagingShockSensor: 'model_SSN-25_threshold_50g'
      }
    },
    {
      supplierPartId: 'SPART-003',
      supplierId: 'SUP-003',
      partId: 'A320-FUSE-P01',
      supplierPartCode: 'SCI-A320-FUSE-P01-C',
      approvalStatus: 'approved',
      leadTimeDays: 50,
      customizations: {
        features: ['optimized_heat_treatment_lighter_weight','digital_twin_simulation_data_on_delivery'],
        weightReductionPct: 2.3,
        digitalTwinFormat: 'STEP+simulation_JSON',
        heatTreatVariant: 'T7451_modified'
      }
    },
    {
      supplierPartId: 'SPART-004',
      supplierId: 'SUP-001',
      partId: 'A320-WING-01',
      supplierPartCode: 'GAP-A320-WING-01-A',
      approvalStatus: 'approved',
      leadTimeDays: 90,
      customizations: {
        features: ['anti_corrosion_coating','full_assembly_testing_pre_delivery'],
        testStandard: 'ASTM_F2971'
      }
    },
    {
      supplierPartId: 'SPART-005',
      supplierId: 'SUP-002',
      partId: 'A320-WING-01',
      supplierPartCode: 'PAG-A320-WING-01-B',
      approvalStatus: 'approved',
      leadTimeDays: 75,
      customizations: {
        features: ['reinforced_root_joint','NDT_ultrasonic_pre_shipment'],
        ndtCoverage: '100pct_root_zone'
      }
    },
    {
      supplierPartId: 'SPART-006',
      supplierId: 'SUP-001',
      partId: 'B737-FUSE-02',
      supplierPartCode: 'GAP-B737-FUSE-02-A',
      approvalStatus: 'approved',
      leadTimeDays: 55,
      customizations: {
        features: ['standard_coating','primer_BMS10-11'],
        packagingType: 'wooden_crate_VCI'
      }
    }
  ]);
  console.log('✓ supplier_part_profile seeded');

  // ============================================================
  // 4. purchase_orders
  // ============================================================
  await db.collection('purchase_orders').insertMany([
    {
      orderId: 'PO-2025-0001',
      supplierId: 'SUP-001',
      orderDate: '2025-01-10',
      desiredDeliveryDate: '2025-03-01',
      status: 'completed',
      createdByEmpId: 'EMP-001',
      lines: [
        { lineNo: 1, supplierPartId: 'SPART-001', quantity: 10, unitPrice: 18500, requiredDeliveryDate: '2025-03-01', lineStatus: 'shipped' },
        { lineNo: 2, supplierPartId: 'SPART-004', quantity: 5,  unitPrice: 42000, requiredDeliveryDate: '2025-03-01', lineStatus: 'shipped' }
      ],
      statusHistory: [
        { status: 'placed',     timestamp: '2025-01-10T09:00:00Z', byEmpId: 'EMP-001' },
        { status: 'confirmed',  timestamp: '2025-01-15T11:00:00Z', byEmpId: 'EMP-001' },
        { status: 'dispatched', timestamp: '2025-02-20T08:00:00Z', byEmpId: 'EMP-001' },
        { status: 'delivered',  timestamp: '2025-02-27T09:15:00Z', byEmpId: 'EMP-001' },
        { status: 'completed',  timestamp: '2025-03-05T10:00:00Z', byEmpId: 'EMP-001' }
      ]
    },
    {
      orderId: 'PO-2025-0002',
      supplierId: 'SUP-002',
      orderDate: '2025-02-05',
      desiredDeliveryDate: '2025-04-15',
      status: 'delivered',
      createdByEmpId: 'EMP-001',
      lines: [
        { lineNo: 1, supplierPartId: 'SPART-002', quantity: 8, unitPrice: 22000, requiredDeliveryDate: '2025-04-15', lineStatus: 'shipped' },
        { lineNo: 2, supplierPartId: 'SPART-005', quantity: 3, unitPrice: 98000, requiredDeliveryDate: '2025-04-15', lineStatus: 'shipped' }
      ],
      statusHistory: [
        { status: 'placed',     timestamp: '2025-02-05T10:00:00Z', byEmpId: 'EMP-001' },
        { status: 'confirmed',  timestamp: '2025-02-10T09:00:00Z', byEmpId: 'EMP-001' },
        { status: 'dispatched', timestamp: '2025-04-05T07:00:00Z', byEmpId: 'EMP-001' },
        { status: 'delivered',  timestamp: '2025-04-16T16:00:00Z', byEmpId: 'EMP-001' }
      ]
    }
  ]);
  console.log('✓ purchase_orders seeded');

  // ============================================================
  // 5. shipments
  // ============================================================
  await db.collection('shipments').insertMany([
    {
      shipmentId: 'SHP-2025-001',
      shipmentNumber: 'SHP-2025-001',
      trackingNumber: 'DHL-8849271001',
      carrier: 'DHL Express',
      portOfEntry: 'London Heathrow',
      estimatedArrival: '2025-02-28',
      actualArrival: '2025-02-27',
      status: 'delivered',
      orderLines: ['PO-2025-0001-L1','PO-2025-0001-L2'],
      updates: [
        { timestamp: '2025-02-20T08:00:00Z', location: 'Derby Warehouse - Dispatch', lat: 52.9225, lon: -1.4746, conditionSummary: 'Dispatched OK',    condition: { temperature_c: 18.2, humidity_pct: 45 } },
        { timestamp: '2025-02-24T14:30:00Z', location: 'London Heathrow - Customs', lat: 51.4775, lon: -0.4614, conditionSummary: 'Cleared customs',  condition: { temperature_c: 17.8, humidity_pct: 48 } },
        { timestamp: '2025-02-27T09:15:00Z', location: 'Delivery Confirmed',        lat: 51.5074, lon: -0.1278, conditionSummary: 'Delivered',          condition: { temperature_c: 18.0, humidity_pct: 50 } }
      ]
    },
    {
      shipmentId: 'SHP-2025-002',
      shipmentNumber: 'SHP-2025-002',
      trackingNumber: 'FDX-3312009922',
      carrier: 'FedEx Freight',
      portOfEntry: 'Dover Port',
      estimatedArrival: '2025-04-14',
      actualArrival: '2025-04-16',
      status: 'delivered',
      orderLines: ['PO-2025-0002-L1','PO-2025-0002-L2'],
      updates: [
        { timestamp: '2025-04-05T07:00:00Z', location: 'Hamburg Port - Loading',    lat: 53.5753, lon:  9.9190, conditionSummary: 'Loaded OK',           condition: { temperature_c: 12.1, humidity_pct: 62 } },
        { timestamp: '2025-04-12T11:00:00Z', location: 'Dover Port - Customs',      lat: 51.1284, lon:  1.3094, conditionSummary: 'Delayed in customs',   condition: { temperature_c: 11.5, humidity_pct: 65 } },
        { timestamp: '2025-04-16T16:00:00Z', location: 'Birmingham - Delivered',    lat: 52.4862, lon: -1.8904, conditionSummary: 'Delivered late',       condition: { temperature_c: 13.0, humidity_pct: 58 } }
      ]
    },
    {
      shipmentId: 'SHP-2025-003',
      shipmentNumber: 'SHP-2025-003',
      trackingNumber: 'UPS-7740129834',
      carrier: 'UPS Air',
      portOfEntry: 'Manchester Airport',
      estimatedArrival: '2025-05-30',
      actualArrival: null,
      status: 'in_transit',
      orderLines: ['PO-2025-0003-L1','PO-2025-0003-L2'],
      updates: [
        { timestamp: '2025-05-15T09:00:00Z', location: 'Seattle - Dispatch', lat: 47.6062, lon: -122.3321, conditionSummary: 'In transit',    condition: { temperature_c: 16.5, humidity_pct: 55 } },
        { timestamp: '2025-05-22T12:00:00Z', location: 'Chicago - Hub',      lat: 41.8781, lon:  -87.6298, conditionSummary: 'Hub transfer',  condition: { temperature_c: 17.2, humidity_pct: 52 } }
      ]
    }
  ]);
  console.log('✓ shipments seeded');

  // ============================================================
  // 6. qc_reports (aligned to the two sample JSON files)
  // ============================================================
  await db.collection('qc_reports').insertMany([
    {
      // Aligned to Dim_NDT_report.json
      _id: 'qc_QC-784512-A1',
      reportId: 'QC-784512-A1',
      supplierPartId: 'SPART-004',
      shipmentId: 'SHP-2025-002',
      partId: 'A320-WING-01',
      inspectionType: 'combined',
      overallResult: 'Pass',
      inspectionDate: '2025-08-28',
      inspector: { name: 'Bob Inspector', employeeId: 'EMP-002' },
      results: {
        visualInspection: 'Pass',
        dimensionalTolerance: {
          result: 'Pass',
          measurements: [
            { dimension: 'length', measured: 15.002, unit: 'm' },
            { dimension: 'width',  measured:  3.499, unit: 'm' }
          ],
          deviation: 0.002
        },
        nondestructiveTesting: {
          type: 'Ultrasonic',
          result: 'Pass',
          comments: 'No internal defects detected.'
        }
      },
      certification: { certifiedBy: 'Bob Inspector', certDate: '2025-08-29', stamp: 'CertifiedOK' },
      versionNo: 1,
      status: 'approved',
      versionHistory: []
    },
    {
      // Aligned to EnvironmentalTest_report.json
      _id: 'qc_QC-889234-Z9',
      reportId: 'QC-889234-Z9',
      supplierPartId: 'SPART-006',
      shipmentId: 'SHP-2025-003',
      partId: 'B737-FUSE-02',
      inspectionType: 'environmental',
      overallResult: 'Pass',
      inspectionDate: '2025-09-01',
      inspector: { name: 'Bob Inspector', employeeId: 'EMP-002' },
      environmentalTest: {
        temperatureRange: '-55 to 70C',
        humidityExposure: '95% RH for 48 hours',
        result: 'Pass'
      },
      notes: 'Component withstood environmental stress without cracking or warping.',
      versionNo: 1,
      status: 'approved',
      versionHistory: []
    },
    {
      _id: 'qc_QC-001122-F3',
      reportId: 'QC-001122-F3',
      supplierPartId: 'SPART-007',
      shipmentId: 'SHP-2025-003',
      partId: 'B737-FUSE-02',
      inspectionType: 'dimensional',
      overallResult: 'Fail',
      inspectionDate: '2025-09-10',
      inspector: { name: 'Bob Inspector', employeeId: 'EMP-002' },
      results: {
        visualInspection: 'Pass',
        dimensionalTolerance: {
          result: 'Fail',
          measurements: [
            { dimension: 'flange_width',     measured: 48.7, unit: 'mm', nominal: 47.5, tolerance: '+/-0.5' },
            { dimension: 'bolt_hole_spacing', measured: 120.3, unit: 'mm', nominal: 120.0, tolerance: '+/-0.2' }
          ],
          deviation: 1.3,
          comment: 'Flange width and bolt hole spacing outside tolerance'
        }
      },
      failureCauses: ['DIM-TOL-EXCEED'],
      notes: 'Flange width 1.2mm over upper tolerance; bolt hole spacing 0.3mm over tolerance',
      versionNo: 1,
      status: 'submitted',
      versionHistory: []
    }
  ]);
  console.log('✓ qc_reports seeded');

  // ============================================================
  // 7. certifications (aligned to Component_certification.pdf structure)
  // ============================================================
  await db.collection('certifications').insertMany([
    {
      _id: 'cert_CERT-2025-AX-993',
      certificationId: 'CERT-2025-AX-993',
      supplierPartId: 'SPART-004',
      shipmentId: 'SHP-2025-002',
      qcReportId: 'QC-784512-A1',
      partId: 'A320-WING-01',
      partName: 'Airbus A320 Wing Assembly',
      supplier: 'Global AeroParts Ltd.',
      certificationDate: '2025-09-02',
      currentVersion: 1,
      status: 'approved',
      versions: [
        {
          versionNo: 1,
          isFinalized: true,
          finalizedAt: '2025-08-30T10:00:00Z',
          inspector: { name: 'Bob Inspector', employeeId: 'EMP-002' },
          testResults: [
            { testType: 'Dimensional Check',       result: 'Pass', details: 'Length 15.002m, Width 3.499m, Deviation 0.002m' },
            { testType: 'Non-Destructive Test',    result: 'Pass', details: 'Ultrasonic scan: no internal defects detected' },
            { testType: 'Load Test',               result: 'Pass', details: 'Withstood load of 150% rated capacity without deformation' }
          ],
          materialTraceability: [
            { material: 'Aluminum Alloy 7075', batchId: 'ALU-BATCH-77X', origin: 'Germany', supplierCertification: 'CERT-SUP-2025-442' },
            { material: 'Composite Resin X1',  batchId: 'RES-BATCH-44P', origin: 'USA',     supplierCertification: 'CERT-SUP-2025-981' }
          ],
          approval: {
            certifiedBy: 'Bob Inspector',
            title: 'Quality Inspector',
            digitalStamp: 'STAMP-BOB-7723',
            signature: 'Electronically Signed - Bob Inspector'
          }
        }
      ]
    },
    {
      _id: 'cert_CERT-2025-BZ-441',
      certificationId: 'CERT-2025-BZ-441',
      supplierPartId: 'SPART-006',
      shipmentId: 'SHP-2025-003',
      qcReportId: 'QC-889234-Z9',
      partId: 'B737-FUSE-02',
      partName: 'Boeing B737 Fuselage Section',
      supplier: 'Global AeroParts Ltd.',
      certificationDate: '2025-09-05',
      currentVersion: 1,
      status: 'submitted',
      versions: [
        {
          versionNo: 1,
          isFinalized: false,
          inspector: { name: 'Bob Inspector', employeeId: 'EMP-002' },
          testResults: [
            { testType: 'Environmental Stress Test', result: 'Pass', details: 'Passed -55°C to 70°C, 95% RH 48h exposure' }
          ],
          materialTraceability: [
            { material: 'Aluminium Alloy 2024', batchId: 'ALU-BATCH-24T', origin: 'France', supplierCertification: 'CERT-SUP-2025-771' }
          ],
          approval: {
            certifiedBy: 'Bob Inspector',
            title: 'Quality Inspector',
            digitalStamp: 'STAMP-BOB-7723',
            signature: null
          },
          notes: 'Pending final review and countersignature'
        }
      ]
    }
  ]);
  console.log('✓ certifications seeded');

  // ============================================================
  // 8. equipment_devices (IoT structure inferred from scenario Section 5)
  //    Note: MEQuip_IoT.json was a duplicate of EnvironmentalTest_report.json
  //    so this structure is derived from scenario description
  // ============================================================
  await db.collection('equipment_devices').insertMany([
    {
      equipmentId: 'MACH-CNC-001',
      equipmentType: 'manufacturing_machine',
      equipmentName: 'CNC Milling Centre Alpha',
      facility: 'Derby Plant A',
      locationDetail: 'Bay 3, Line 1',
      status: 'operational',
      devices: [
        {
          deviceId: 'IOT-CNC001-TEMP-01',
          serialNo: 'IOT-CNC001-TEMP-01',
          type: 'temperature',
          firmwareVersion: 'v2.4.1',
          isActive: true,
          installedAt: '2024-01-15T09:00:00Z',
          thresholds: { warningC: 85, criticalC: 95 }
        },
        {
          deviceId: 'IOT-CNC001-VIB-01',
          serialNo: 'IOT-CNC001-VIB-01',
          type: 'vibration',
          firmwareVersion: 'v2.4.1',
          isActive: true,
          installedAt: '2024-01-15T09:00:00Z',
          thresholds: { warningG: 2.5, criticalG: 4.0 }
        }
      ],
      currentStatus: { temperature_c: 89.7, vibration_g: 3.8, lastUpdated: '2025-05-19T08:30:00Z', healthStatus: 'warning' }
    },
    {
      equipmentId: 'CONT-TRANSIT-01',
      equipmentType: 'transit_container',
      equipmentName: 'Refrigerated Transit Container 1',
      facility: 'In Transit',
      locationDetail: 'Shipment SHP-2025-003',
      status: 'operational',
      devices: [
        {
          deviceId: 'IOT-CONT01-TEMP-01',
          serialNo: 'IOT-CONT01-TEMP-01',
          type: 'temperature',
          firmwareVersion: 'v3.1.0',
          isActive: true,
          installedAt: '2025-05-15T07:00:00Z',
          thresholds: { warningC: 8, criticalC: 12 }
        },
        {
          deviceId: 'IOT-CONT01-GPS-01',
          serialNo: 'IOT-CONT01-GPS-01',
          type: 'gps',
          firmwareVersion: 'v3.1.0',
          isActive: true,
          installedAt: '2025-05-15T07:00:00Z',
          thresholds: {}
        }
      ],
      currentStatus: { temperature_c: 4.8, gps: { lat: 41.8781, lon: -87.6298 }, lastUpdated: '2025-05-19T10:30:00Z', healthStatus: 'ok' }
    },
    {
      equipmentId: 'MACH-HEAT-005',
      equipmentType: 'manufacturing_machine',
      equipmentName: 'Heat Treatment Furnace Epsilon',
      facility: 'Derby Plant B',
      locationDetail: 'Bay 7, Line 1',
      status: 'operational',
      devices: [
        {
          deviceId: 'IOT-HEAT005-TEMP-01',
          serialNo: 'IOT-HEAT005-TEMP-01',
          type: 'temperature',
          firmwareVersion: 'v2.4.1',
          isActive: true,
          installedAt: '2024-03-10T11:00:00Z',
          thresholds: { warningC: 855, criticalC: 880, setPointC: 840 }
        }
      ],
      currentStatus: { temperature_c: 862.0, lastUpdated: '2025-05-19T10:00:00Z', healthStatus: 'warning' }
    }
  ]);
  console.log('✓ equipment_devices seeded');

  // ============================================================
  // 9. sensor_events (high-volume IoT telemetry)
  // ============================================================
  await db.collection('sensor_events').insertMany([
    { deviceId: 'IOT-CNC001-TEMP-01', equipmentId: 'MACH-CNC-001', timestamp: new Date('2025-05-19T08:00:00Z'), metricType: 'temperature', metricValue: 72.4,   unit: 'C',   status: 'normal' },
    { deviceId: 'IOT-CNC001-TEMP-01', equipmentId: 'MACH-CNC-001', timestamp: new Date('2025-05-19T08:15:00Z'), metricType: 'temperature', metricValue: 73.1,   unit: 'C',   status: 'normal' },
    { deviceId: 'IOT-CNC001-TEMP-01', equipmentId: 'MACH-CNC-001', timestamp: new Date('2025-05-19T08:30:00Z'), metricType: 'temperature', metricValue: 89.7,   unit: 'C',   status: 'warning', alertTriggered: true },
    { deviceId: 'IOT-CNC001-VIB-01',  equipmentId: 'MACH-CNC-001', timestamp: new Date('2025-05-19T08:00:00Z'), metricType: 'vibration',   metricValue: 1.2,    unit: 'g',   status: 'normal' },
    { deviceId: 'IOT-CNC001-VIB-01',  equipmentId: 'MACH-CNC-001', timestamp: new Date('2025-05-19T08:15:00Z'), metricType: 'vibration',   metricValue: 1.4,    unit: 'g',   status: 'normal' },
    { deviceId: 'IOT-CNC001-VIB-01',  equipmentId: 'MACH-CNC-001', timestamp: new Date('2025-05-19T08:30:00Z'), metricType: 'vibration',   metricValue: 3.8,    unit: 'g',   status: 'alert',  alertTriggered: true },
    { deviceId: 'IOT-CONT01-TEMP-01', equipmentId: 'CONT-TRANSIT-01', timestamp: new Date('2025-05-19T10:00:00Z'), metricType: 'temperature', metricValue: 4.2, unit: 'C',   status: 'normal' },
    { deviceId: 'IOT-CONT01-TEMP-01', equipmentId: 'CONT-TRANSIT-01', timestamp: new Date('2025-05-19T10:30:00Z'), metricType: 'temperature', metricValue: 4.8, unit: 'C',   status: 'normal' },
    { deviceId: 'IOT-CONT01-GPS-01',  equipmentId: 'CONT-TRANSIT-01', timestamp: new Date('2025-05-19T10:00:00Z'), metricType: 'gps',         metricValue: null, unit: null,  status: 'normal', gps: { lat: 41.8781, lon: -87.6298 }, location: 'Chicago Hub' },
    { deviceId: 'IOT-HEAT005-TEMP-01',equipmentId: 'MACH-HEAT-005',   timestamp: new Date('2025-05-19T09:00:00Z'), metricType: 'temperature', metricValue: 845.0, unit: 'C',  status: 'normal', setPoint: 840 },
    { deviceId: 'IOT-HEAT005-TEMP-01',equipmentId: 'MACH-HEAT-005',   timestamp: new Date('2025-05-19T10:00:00Z'), metricType: 'temperature', metricValue: 862.0, unit: 'C',  status: 'warning', setPoint: 840, alertTriggered: true }
  ]);
  console.log('✓ sensor_events seeded');

  // ============================================================
  // 10. users_access
  // ============================================================
  await db.collection('users_access').insertMany([
    {
      empId: 'EMP-001',
      fullName: 'Alice Procurement',
      jobTitle: 'Procurement Officer',
      department: 'Procurement',
      email: 'alice@aeronetb.com',
      roles: ['procurement_officer'],
      accessLevel: 'write',
      roleExtra: { regionManaged: 'EMEA', authorizationLimitGBP: 250000 },
      dashboardPreferences: { defaultView: 'orders', kpis: ['pending_orders','supplier_count'] }
    },
    {
      empId: 'EMP-002',
      fullName: 'Bob Inspector',
      jobTitle: 'Quality Inspector',
      department: 'Quality',
      email: 'bob@aeronetb.com',
      roles: ['quality_inspector'],
      accessLevel: 'approve',
      roleExtra: { inspectorCertId: 'INSP-9012', specializations: ['NDT','dimensional'], digitalStamp: 'STAMP-BOB-7723' },
      dashboardPreferences: { defaultView: 'qcreports', kpis: ['pending_inspections','pass_rate'] }
    },
    {
      empId: 'EMP-003',
      fullName: 'Carol Manager',
      jobTitle: 'Supply Chain Manager',
      department: 'Operations',
      email: 'carol@aeronetb.com',
      roles: ['supply_chain_manager'],
      accessLevel: 'approve',
      roleExtra: { productLines: ['fuselage','wing assemblies'], reportingLevel: 'global_manager', kpiPreferences: ['on_time_delivery','defect_rate'] },
      dashboardPreferences: { defaultView: 'shipments', kpis: ['in_transit','delayed','on_time_rate'] }
    },
    {
      empId: 'EMP-004',
      fullName: 'Dave Engineer',
      jobTitle: 'Equipment Engineer',
      department: 'Engineering',
      email: 'dave@aeronetb.com',
      roles: ['equipment_engineer'],
      accessLevel: 'write',
      roleExtra: { engineeringLicense: 'ENG-5541', assignedFacility: 'Derby Plant A', iotGroups: ['MACH-GROUP-1','MACH-GROUP-2'] },
      dashboardPreferences: { defaultView: 'iot', kpis: ['active_alerts','equipment_health'] }
    },
    {
      empId: 'EMP-005',
      fullName: 'Eve Auditor',
      jobTitle: 'Regulatory Auditor',
      department: 'Compliance',
      email: 'eve@aeronetb.com',
      roles: ['auditor'],
      accessLevel: 'audit',
      roleExtra: { regulatoryAuthority: 'EASA', accreditationId: 'AUD-REG-2024-77', auditScope: ['external_compliance','safety_certification'] },
      dashboardPreferences: { defaultView: 'certifications', kpis: ['open_flags','approved_certs'] }
    }
  ]);
  console.log('✓ users_access seeded');

  // ============================================================
  // 11. audit_events
  // ============================================================
  await db.collection('audit_events').insertMany([
    { empId: 'EMP-001', timestamp: new Date('2025-01-10T09:00:00Z'), actionType: 'login',    entityType: null,            entityRef: null,               details: { method: 'password' } },
    { empId: 'EMP-001', timestamp: new Date('2025-01-10T09:05:00Z'), actionType: 'create',   entityType: 'purchase_order', entityRef: 'PO-2025-0001',    details: { supplierId: 'SUP-001', lines: 2 } },
    { empId: 'EMP-002', timestamp: new Date('2025-08-28T14:00:00Z'), actionType: 'login',    entityType: null,            entityRef: null,               details: { method: 'password' } },
    { empId: 'EMP-002', timestamp: new Date('2025-08-28T14:30:00Z'), actionType: 'create',   entityType: 'qc_report',     entityRef: 'QC-784512-A1',     details: { result: 'Pass', type: 'combined' } },
    { empId: 'EMP-002', timestamp: new Date('2025-08-29T10:00:00Z'), actionType: 'approve',  entityType: 'qc_report',     entityRef: 'QC-784512-A1',     details: { statusBefore: 'submitted', statusAfter: 'approved' } },
    { empId: 'EMP-002', timestamp: new Date('2025-08-30T10:00:00Z'), actionType: 'approve',  entityType: 'certification', entityRef: 'CERT-2025-AX-993', details: { finalized: true } },
    { empId: 'EMP-005', timestamp: new Date('2025-09-15T09:00:00Z'), actionType: 'login',    entityType: null,            entityRef: null,               details: { method: 'password' } },
    { empId: 'EMP-005', timestamp: new Date('2025-09-15T09:10:00Z'), actionType: 'view',     entityType: 'certification', entityRef: 'CERT-2025-AX-993', details: { accessType: 'read_only' } },
    { empId: 'EMP-005', timestamp: new Date('2025-09-15T09:15:00Z'), actionType: 'view',     entityType: 'qc_report',     entityRef: 'QC-784512-A1',     details: { accessType: 'read_only' } }
  ]);
  console.log('✓ audit_events seeded');

  // Create indexes
  await db.collection('sensor_events').createIndex({ deviceId: 1, timestamp: -1 });
  await db.collection('sensor_events').createIndex({ equipmentId: 1, timestamp: -1 });
  await db.collection('qc_reports').createIndex({ supplierPartId: 1 });
  await db.collection('qc_reports').createIndex({ overallResult: 1 });
  await db.collection('certifications').createIndex({ supplierPartId: 1 });
  await db.collection('audit_events').createIndex({ empId: 1, timestamp: -1 });
  console.log('✓ Indexes created');

  await client.close();
  console.log('\n✅ MongoDB seed complete!');
}

seed().catch(err => { console.error(err); process.exit(1); });
