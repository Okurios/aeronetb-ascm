// Fix all user password hashes to the correct bcrypt hash of 'Password1!'
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  const hash = await bcrypt.hash('Password1!', 10);
  console.log('New hash:', hash);
  const result = await pool.query('UPDATE user_account SET password_hash = $1', [hash]);
  console.log(`Updated ${result.rowCount} user(s) password hash to bcrypt('Password1!')`);
  await pool.end();
}
main().catch(e => { console.error(e); pool.end(); process.exit(1); });
