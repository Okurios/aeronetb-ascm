// Test the new submit endpoint and create order endpoint
const http = require('http');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 3000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data),
                 ...(token ? { 'Authorization': 'Bearer ' + token } : {}) }
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

function patch(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const opts = {
      hostname: 'localhost', port: 3000, path, method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data),
                 'Authorization': 'Bearer ' + token }
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

async function main() {
  // 1. Login as Bob (quality inspector)
  const loginRes = await post('/api/auth/login', { email: 'bob@aeronetb.com', password: 'Password1!' });
  console.log('Login Bob:', loginRes.status, loginRes.body.user?.email);
  const bobToken = loginRes.body.token;

  // 2. Create a new QC report (will be in 'draft')
  const qcRes = await post('/api/qcreports', {
    supplier_part_id: 4,
    inspection_type: 'dimensional',
    overall_result: 'Pass',
    inspection_date: new Date().toISOString().slice(0,10),
    payload: { notes: 'Test report for submit fix' }
  }, bobToken);
  console.log('Create QC report:', qcRes.status, qcRes.body.report_number, 'status:', qcRes.body.status);
  const reportId = qcRes.body.qc_report_id;

  // 3. Submit the report (draft → submitted) — NEW ENDPOINT
  const submitRes = await patch(`/api/qcreports/${reportId}/submit`, {}, bobToken);
  console.log('Submit QC report:', submitRes.status, 'new status:', submitRes.body.status || submitRes.body.error);

  // 4. Approve it
  const approveRes = await patch(`/api/qcreports/${reportId}/approve`, {}, bobToken);
  console.log('Approve QC report:', approveRes.status, 'new status:', approveRes.body.status || approveRes.body.error);

  // 5. Login as Alice (procurement) and create an order — REAL FORM NOW
  const aliceLogin = await post('/api/auth/login', { email: 'alice@aeronetb.com', password: 'Password1!' });
  const aliceToken = aliceLogin.body.token;
  const orderRes = await post('/api/orders', {
    supplier_id: 2,
    order_date: new Date().toISOString().slice(0,10),
    desired_delivery_date: '2025-12-31',
    lines: []
  }, aliceToken);
  console.log('Create Order:', orderRes.status, orderRes.body.po_number || orderRes.body.error);
}

main().catch(console.error);
