// ============================================================
// Run DDL + DML SQL files against Render PostgreSQL
// Usage: node scripts/00_run_sql.js
// ============================================================
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\n▶ Running: ${path.basename(filePath)}`);
  try {
    await pool.query(sql);
    console.log(`✅ Done: ${path.basename(filePath)}`);
  } catch (err) {
    console.error(`❌ Error in ${path.basename(filePath)}:`, err.message);
    throw err;
  }
}

async function main() {
  console.log('🔌 Connecting to Render PostgreSQL...');
  const client = await pool.connect();
  console.log('✅ Connected!');
  client.release();

  await runFile(path.join(__dirname, '01_ddl.sql'));
  await runFile(path.join(__dirname, '02_dml_seed.sql'));

  await pool.end();
  console.log('\n🎉 PostgreSQL setup complete! Tables created + seed data inserted.');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  pool.end();
  process.exit(1);
});
