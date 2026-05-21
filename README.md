# AeroNetB ASCM — Aerospace Supply Chain Management
**5CM506 Data Driven Systems** | Student: 100735056

---

## Tech Stack
| Layer | Technology |
|---|---|
| Relational DB | **PostgreSQL** (Render free tier / local) |
| Document DB | **MongoDB Atlas** (free M0 cluster) |
| Backend API | **Node.js + Express** |
| Frontend | Vanilla HTML/CSS/JS + Chart.js |
| Hosting | Render Web Service (API + frontend) |

---

## Local Setup

### 1. Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14 (local) OR Render PostgreSQL connection string
- MongoDB Atlas free cluster URI OR local MongoDB

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Configure environment
```bash
cp ../.env .env   # or edit .env at project root
```
Edit `.env` with your actual database credentials:
```
DATABASE_URL=postgresql://user:password@host:5432/aeronetb_ascm
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/
MONGO_DB=aeronetb_ascm
JWT_SECRET=your_long_random_secret
```

### 4. Set up PostgreSQL schema + seed data
```bash
# Connect to your PostgreSQL instance and run:
psql $DATABASE_URL -f backend/scripts/01_ddl.sql
psql $DATABASE_URL -f backend/scripts/02_dml_seed.sql
```

### 5. Seed MongoDB
```bash
cd backend
npm run seed:mongo
```

### 6. Start the server
```bash
npm start
# or for development:
npm run dev
```

Open: http://localhost:3000

---

## Demo Accounts
| Role | Email | Password |
|---|---|---|
| Procurement Officer | alice@aeronetb.com | Password1! |
| Quality Inspector | bob@aeronetb.com | Password1! |
| Supply Chain Manager | carol@aeronetb.com | Password1! |
| Equipment Engineer | dave@aeronetb.com | Password1! |
| Auditor / Regulator | eve@aeronetb.com | Password1! |

---

## API Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/login | Login → returns JWT |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user info |
| GET | /api/suppliers | List all suppliers |
| GET | /api/suppliers/:id | Supplier detail + accreditations |
| GET | /api/suppliers/:id/kpis | Supplier KPIs |
| POST | /api/suppliers | Create supplier |
| GET | /api/parts | List all parts |
| GET | /api/parts/:id | Part detail + specs + documents |
| GET | /api/orders | List purchase orders |
| GET | /api/orders/:id | Order detail + lines |
| POST | /api/orders | Create purchase order |
| PATCH | /api/orders/:id/status | Update order status |
| GET | /api/shipments | List shipments |
| GET | /api/shipments/:id | Shipment detail + updates |
| POST | /api/shipments/:id/updates | Add shipment checkpoint |
| GET | /api/qcreports | List QC reports |
| GET | /api/qcreports/:id | Report detail (PG + MongoDB) |
| POST | /api/qcreports | Create QC report |
| PATCH | /api/qcreports/:id/approve | Approve QC report |
| GET | /api/certifications | List certifications |
| GET | /api/certifications/:id | Certification detail |
| PATCH | /api/certifications/:id/finalize | Finalize (immutable) |
| GET | /api/equipment | List equipment |
| GET | /api/equipment/:id | Equipment + devices + alerts |
| GET | /api/equipment/:id/readings | Sensor readings |
| GET | /api/iot/alerts | All IoT alerts |
| PATCH | /api/iot/alerts/:id/acknowledge | Acknowledge alert |
| GET | /api/iot/equipment-summary | Live status (MongoDB) |
| GET | /api/dashboard/overview | Top-level KPIs |
| GET | /api/dashboard/supplier-kpis | Supplier leaderboard |
| GET | /api/dashboard/qc-trends | Monthly QC trends |
| GET | /api/dashboard/shipment-tracking | Active shipments |
| GET | /api/dashboard/iot-health | Equipment health |
| GET | /api/audit | Audit log |

---

## Deployment on Render

1. Push this repo to GitHub
2. Create a **Render Web Service** pointing to `backend/` with start command `npm start`
3. Create a **Render PostgreSQL** instance and copy the connection string to `DATABASE_URL` env var
4. Create a **MongoDB Atlas** free cluster and copy the URI to `MONGO_URI` env var
5. Add `JWT_SECRET` and `NODE_ENV=production` env vars on Render
6. After first deploy, run DDL + DML via Render's PostgreSQL shell or psql CLI
7. Run `npm run seed:mongo` locally with the Atlas URI to seed MongoDB

---

## Notes on Sample Files

| File | Issue Found | Resolution |
|---|---|---|
| `MEQuip_IoT.json` | **Duplicate** — identical content to `EnvironmentalTest_report.json` | Treated as environmental test; IoT structure derived from scenario Section 5 |
| `Dim_NDT_report.json` | Missing `overallResult` field at top level | Added as derived from inner `results` |
| `EnvironmentalTest_report.json` | `reportType` field inconsistent — should be `inspectionType` | Normalised to `inspectionType` in MongoDB schema |
