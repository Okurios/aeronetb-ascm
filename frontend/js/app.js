// ============================================================
// AeroNetB ASCM — Frontend App
// ============================================================

const API = '';  // same origin
let currentUser = null;
let charts = {};

// ── Auth helpers ─────────────────────────────────────────────
function getToken() { return localStorage.getItem('ascm_token'); }
function getUser()  { return JSON.parse(localStorage.getItem('ascm_user') || 'null'); }

async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  if (res.status === 401) { logout(); return null; }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

function logout() {
  fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` } }).catch(() => {});
  localStorage.removeItem('ascm_token');
  localStorage.removeItem('ascm_user');
  window.location.href = 'index.html';
}

// ── Utilities ─────────────────────────────────────────────────
function badge(val, cls) {
  const c = cls || `badge-${(val || '').toString().toLowerCase().replace(/ /g,'_')}`;
  return `<span class="badge ${c}">${val || '—'}</span>`;
}
function fmt(val) { return val ? new Date(val).toLocaleDateString('en-GB') : '—'; }
function fmtNum(n) { return n != null ? Number(n).toLocaleString('en-GB') : '—'; }

function showBanner(msg) {
  const b = document.getElementById('alertBanner');
  b.textContent = '⚠ ' + msg; b.style.display = 'flex';
  setTimeout(() => { b.style.display = 'none'; }, 8000);
}

// ── Detail modal — smart HTML renderer ───────────────────
function labelise(k) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function isISODate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v);
}
function renderVal(v) {
  if (v === null || v === undefined) return '<span style="color:#9ca3af">—</span>';
  if (typeof v === 'boolean')        return v ? '✅ Yes' : '❌ No';
  if (isISODate(v))                  return fmt(v);
  return String(v);
}

const DETAIL_SKIP_KEYS = new Set([
  'po_id','supplier_id','part_id','supplier_part_id','qc_report_id',
  'certification_id','equipment_id','iot_device_id','created_by_emp_id',
  'mongo_report_id','mongo_cert_id','po_line_id'
]);

function buildDetailHTML(obj) {
  if (!obj || typeof obj !== 'object') return `<span>${obj ?? '—'}</span>`;

  const scalars = Object.entries(obj).filter(([k, v]) =>
    !DETAIL_SKIP_KEYS.has(k) && (v === null || (typeof v !== 'object'))
  );
  const arrays  = Object.entries(obj).filter(([k, v]) => Array.isArray(v));
  const nested  = Object.entries(obj).filter(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
  );

  let html = '';

  // Scalar fields in a two-column grid
  if (scalars.length) {
    html += '<div class="detail-grid">';
    for (const [k, v] of scalars) {
      html += `<div class="detail-row"><span class="detail-label">${labelise(k)}</span><span class="detail-val">${renderVal(v)}</span></div>`;
    }
    html += '</div>';
  }

  // Nested objects (e.g. payload, spec)
  for (const [k, v] of nested) {
    html += `<h4 class="detail-subtitle">${labelise(k)}</h4>`;
    html += buildDetailHTML(v);
  }

  // Arrays rendered as mini tables
  for (const [k, arr] of arrays) {
    html += `<h4 class="detail-subtitle">${labelise(k)} <span style="font-weight:400;font-size:0.85rem;color:#6b7280">(${arr.length})</span></h4>`;
    if (!arr.length) {
      html += '<p style="color:#9ca3af;font-size:0.9rem;padding:4px 0 8px">No items</p>';
      continue;
    }
    const firstRow = arr[0];
    const cols = typeof firstRow === 'object' && firstRow !== null
      ? Object.keys(firstRow).filter(c => !DETAIL_SKIP_KEYS.has(c) && (firstRow[c] === null || typeof firstRow[c] !== 'object'))
      : null;

    if (!cols) {
      // Array of primitives
      html += `<p style="font-size:0.9rem;padding:4px 0 8px">${arr.join(', ')}</p>`;
      continue;
    }

    html += '<div class="table-wrapper" style="margin-bottom:12px"><table class="data-table"><thead><tr>';
    cols.forEach(c => { html += `<th>${labelise(c)}</th>`; });
    html += '</tr></thead><tbody>';
    arr.forEach(row => {
      html += '<tr>';
      cols.forEach(c => { html += `<td>${renderVal(row[c])}</td>`; });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  }

  return html || '<p style="color:#9ca3af">No details available.</p>';
}

function showDetail(title, obj) {
  document.getElementById('detailTitle').textContent = title;
  document.getElementById('detailContent').innerHTML = buildDetailHTML(obj);
  document.getElementById('detailModal').style.display = 'flex';
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function exportTable(tableId, filename) {
  const table = document.getElementById(tableId);
  const rows  = [...table.querySelectorAll('tr')];
  const csv   = rows.map(r => [...r.querySelectorAll('th,td')].map(c => `"${c.textContent.replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob  = new Blob([csv], { type: 'text/csv' });
  const a     = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${filename}.csv` });
  a.click();
}

// ── Nav setup ─────────────────────────────────────────────────
function buildNav(user) {
  const links = [];
  const role  = user.roles[0];
  links.push({ id:'overview',    label:'Overview', section:'sectionOverview' });
  if (role === 'procurement_officer')  links.push({ id:'proc',    label:'Procurement',   section:'sectionProcurement' });
  if (role === 'quality_inspector')    links.push({ id:'quality', label:'Quality',        section:'sectionQuality' });
  if (role === 'supply_chain_manager') links.push({ id:'mgr',     label:'Supply Chain',   section:'sectionManager' });
  if (role === 'equipment_engineer')   links.push({ id:'eng',     label:'IoT & Equipment',section:'sectionEngineer' });
  if (role === 'auditor')              links.push({ id:'audit',   label:'Compliance',     section:'sectionAuditor' });

  const nav = document.getElementById('navLinks');
  nav.innerHTML = links.map(l =>
    `<span class="nav-link" data-section="${l.section}" onclick="showSection('${l.section}',this)">${l.label}</span>`
  ).join('');

  document.getElementById('navUserName').textContent = user.fullName;
  document.getElementById('navUserRole').textContent = (role || '').replace(/_/g,' ');
}

function showSection(id, el) {
  document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
  document.getElementById(id).style.display = 'block';
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  if (el) el.classList.add('active');
}

// ── Overview KPIs ─────────────────────────────────────────────
async function loadOverview() {
  try {
    const d = await apiFetch('/api/dashboard/overview');
    if (!d) return;
    const passRate = d.quality.total > 0 ? Math.round(100 * d.quality.passed / d.quality.total) : 0;
    document.querySelector('#kpiSuppliers .kpi-num').textContent = d.suppliers.active;
    document.querySelector('#kpiOrders .kpi-num').textContent    = d.orders.pending;
    document.querySelector('#kpiShipments .kpi-num').textContent = d.shipments.in_transit;
    document.querySelector('#kpiQC .kpi-num').textContent        = passRate + '%';
    document.querySelector('#kpiAlerts .kpi-num').textContent    = d.iot.open_alerts;
    // Role-specific banners — only show alerts relevant to each role
    const role = currentUser ? currentUser.roles[0] : null;
    const msgs = [];
    if (d.orders.overdue > 0 && ['procurement_officer', 'supply_chain_manager'].includes(role))
      msgs.push(`⚠ ${d.orders.overdue} overdue order(s) require attention`);
    if (d.iot.critical > 0 && role === 'equipment_engineer')
      msgs.push(`🔴 ${d.iot.critical} critical IoT alert(s) active`);
    if (msgs.length) showBanner(msgs.join('  ·  '));
  } catch (e) { console.error('Overview load failed:', e); }
}

// ── Procurement Section ────────────────────────────────────────
async function loadProcurement() {
  const [orders, suppliers] = await Promise.all([
    apiFetch('/api/orders'), apiFetch('/api/suppliers')
  ]);
  if (orders) renderOrders(orders);
  if (suppliers) renderSuppliers(suppliers);

  document.getElementById('orderStatusFilter').addEventListener('change', async function() {
    const q = this.value ? `?status=${this.value}` : '';
    const d = await apiFetch('/api/orders' + q);
    if (d) renderOrders(d);
  });
  document.getElementById('orderSearch').addEventListener('input', function() {
    const q = this.value.toLowerCase();
    document.querySelectorAll('#ordersBody tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

function isOverdue(o) {
  return o.desired_delivery_date
    && new Date(o.desired_delivery_date) < new Date()
    && !['delivered','completed','cancelled'].includes(o.status);
}

function renderOrders(orders) {
  document.getElementById('ordersBody').innerHTML = orders.map(o => {
    const overdue = isOverdue(o);
    return `
    <tr class="${overdue ? 'row-overdue' : ''}">
      <td><strong>${o.po_number}</strong></td>
      <td>${o.supplier_name}</td>
      <td>${fmt(o.order_date)}</td>
      <td>${fmt(o.desired_delivery_date)}${overdue ? ' <span class="badge badge-fail" style="font-size:0.65rem">Overdue</span>' : ''}</td>
      <td>${badge(o.status)}</td>
      <td>£${fmtNum(o.total_value)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick='viewOrder(${o.po_id})'>View</button>
        ${['placed','confirmed'].includes(o.status) ? `<button class="btn btn-sm btn-danger" onclick='cancelOrder(${o.po_id})'>Cancel</button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

async function cancelOrder(id) {
  if (!confirm('Cancel this order? This cannot be undone.')) return;
  try {
    await apiFetch(`/api/orders/${id}/cancel`, { method: 'PATCH' });
    showBanner('Order cancelled successfully.');
    loadProcurement();
  } catch(e) { alert('Error: ' + e.message); }
}

async function viewOrder(id) {
  const d = await apiFetch(`/api/orders/${id}`);
  if (d) showDetail(`Order ${d.po_number}`, d);
}

function renderSuppliers(suppliers) {
  document.getElementById('suppliersBody').innerHTML = suppliers.map(s => `
    <tr>
      <td><strong>${s.business_name}</strong></td>
      <td>${s.country}</td>
      <td>${(s.accreditations || []).join(', ') || '—'}</td>
      <td>${badge(s.status)}</td>
      <td>${s.part_count}</td>
    </tr>`).join('');
}

// ── Order lines state ─────────────────────────────────────────
let orderLines = [];

function renderOrderLines() {
  const container = document.getElementById('orderLinesTable');
  if (!orderLines.length) {
    container.innerHTML = '<p style="color:#e07c00;font-size:0.85rem;margin:4px 0">⚠ No parts added yet — select a part above, enter qty &amp; price, then click <strong>+ Add</strong>. At least one line item is required.</p>';
    return;
  }
  const total = orderLines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  container.innerHTML = `
    <table class="data-table" style="margin-top:8px;font-size:0.9rem">
      <thead><tr><th>Part</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th><th></th></tr></thead>
      <tbody>
        ${orderLines.map((l, i) => `
          <tr>
            <td>${l.part_name}</td>
            <td>${l.quantity}</td>
            <td>£${l.unit_price.toFixed(2)}</td>
            <td>£${(l.quantity * l.unit_price).toFixed(2)}</td>
            <td><button type="button" class="btn btn-sm" style="background:#fee2e2;color:#c0392b;padding:2px 8px" onclick="removeOrderLine(${i})">✕</button></td>
          </tr>`).join('')}
      </tbody>
      <tfoot><tr><td colspan="3" style="text-align:right;font-weight:600;padding:6px 8px">Total</td><td style="font-weight:600;padding:6px 8px">£${total.toFixed(2)}</td><td></td></tr></tfoot>
    </table>`;
}

function addOrderLine() {
  const partSel = document.getElementById('orderPartSel');
  const qty     = parseInt(document.getElementById('orderLineQty').value, 10);
  const price   = parseFloat(document.getElementById('orderLinePrice').value);
  const delDate = document.getElementById('orderLineDelivery').value;

  if (!partSel.value)      { alert('Please select a part.'); return; }
  if (!qty || qty < 1)     { alert('Please enter a valid quantity (minimum 1).'); return; }
  if (isNaN(price) || price < 0) { alert('Please enter a valid unit price.'); return; }

  const opt = partSel.options[partSel.selectedIndex];
  orderLines.push({
    supplier_part_id:      parseInt(partSel.value, 10),
    part_name:             opt.text,
    quantity:              qty,
    unit_price:            price,
    required_delivery_date: delDate || null
  });

  // Reset line inputs (keep supplier & dates intact)
  partSel.value = '';
  document.getElementById('orderLineQty').value   = '';
  document.getElementById('orderLinePrice').value = '';

  renderOrderLines();
}

function removeOrderLine(idx) {
  orderLines.splice(idx, 1);
  renderOrderLines();
}

async function showCreateOrderModal() {
  // Reset state
  orderLines = [];
  renderOrderLines();

  const suppliers = await apiFetch('/api/suppliers');
  if (!suppliers) return;

  const sel = document.getElementById('orderSupplierSel');
  sel.innerHTML = '<option value="">— Select Supplier —</option>' +
    suppliers.filter(s => s.status === 'active')
             .map(s => `<option value="${s.supplier_id}">${s.business_name}</option>`)
             .join('');

  // Reset part dropdown
  document.getElementById('orderPartSel').innerHTML = '<option value="">— Choose supplier first —</option>';

  // Set default order date
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('orderDate').value = today;

  // Wire supplier → fetch its parts
  sel.onchange = async function () {
    const sid = this.value;
    const psel = document.getElementById('orderPartSel');
    if (!sid) {
      psel.innerHTML = '<option value="">— Choose supplier first —</option>';
      return;
    }
    psel.innerHTML = '<option value="">Loading…</option>';
    try {
      const parts = await apiFetch(`/api/suppliers/${sid}/parts`);
      if (!parts || !parts.length) {
        psel.innerHTML = '<option value="">— No parts found for this supplier —</option>';
        return;
      }
      psel.innerHTML = '<option value="">— Select Part —</option>' +
        parts.map(p => `<option value="${p.supplier_part_id}">${p.part_name}  (${p.supplier_part_code || p.part_number})</option>`)
             .join('');
    } catch (e) {
      psel.innerHTML = '<option value="">— Error loading parts —</option>';
    }
  };

  document.getElementById('orderModal').style.display = 'flex';
}

// ── Quality Section ────────────────────────────────────────────
async function loadQuality() {
  const [qc, certs] = await Promise.all([
    apiFetch('/api/qcreports'), apiFetch('/api/certifications')
  ]);
  if (qc)    renderQCReports(qc);
  if (certs) renderCertifications(certs);

  // Inspector performance summary bar
  const statsEl = document.getElementById('inspectorStats');
  if (statsEl && (qc || certs)) {
    const totalQC       = qc    ? qc.length    : 0;
    const approvedQC    = qc    ? qc.filter(r  => r.status === 'approved').length  : 0;
    const failedQC      = qc    ? qc.filter(r  => r.overall_result === 'Fail').length : 0;
    const totalCerts    = certs ? certs.length  : 0;
    const finalizedCerts= certs ? certs.filter(c => c.is_finalized).length : 0;
    statsEl.style.display = 'flex';
    statsEl.innerHTML = `
      <span class="stat-pill">📋 QC Reports: <strong>${totalQC}</strong></span>
      <span class="stat-pill">✅ Approved: <strong>${approvedQC}</strong></span>
      <span class="stat-pill">❌ Failed: <strong>${failedQC}</strong></span>
      <span class="stat-pill">📜 Certifications: <strong>${totalCerts}</strong></span>
      <span class="stat-pill">🔒 Finalized: <strong>${finalizedCerts}</strong></span>
    `;
  }

  document.getElementById('qcResultFilter').addEventListener('change', async function() {
    const q = this.value ? `?result=${this.value}` : '';
    const d = await apiFetch('/api/qcreports' + q);
    if (d) renderQCReports(d);
  });

  // Charts
  await loadQCCharts();
}

function renderQCReports(reports) {
  document.getElementById('qcBody').innerHTML = reports.map(r => `
    <tr>
      <td><strong>${r.report_number}</strong></td>
      <td>${r.part_name}</td>
      <td>${r.supplier_name}</td>
      <td><span class="badge">${r.inspection_type}</span></td>
      <td>${badge(r.overall_result, r.overall_result==='Pass'?'badge-pass':r.overall_result==='Fail'?'badge-fail':'badge-conditional')}</td>
      <td>${fmt(r.inspection_date)}</td>
      <td>${badge(r.status)}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick='viewQCReport(${r.qc_report_id})'>View</button>
        ${r.status==='draft'?`<button class="btn btn-sm btn-primary" onclick='submitQCReport(${r.qc_report_id})'>Submit</button>`:''}
        ${r.status==='submitted'?`<button class="btn btn-sm btn-success" onclick='approveQCReport(${r.qc_report_id})'>Approve</button>`:''}
      </td>
    </tr>`).join('');
}

async function viewQCReport(id) {
  const d = await apiFetch(`/api/qcreports/${id}`);
  if (d) showDetail(`QC Report ${d.report_number}`, d);
}

async function submitQCReport(id) {
  if (!confirm('Submit this QC report for approval?')) return;
  try {
    await apiFetch(`/api/qcreports/${id}/submit`, { method: 'PATCH' });
    loadQuality();
  } catch(e) { alert('Error: ' + e.message); }
}

async function approveQCReport(id) {
  if (!confirm('Approve this QC report?')) return;
  try {
    await apiFetch(`/api/qcreports/${id}/approve`, { method: 'PATCH' });
    loadQuality();
  } catch(e) { alert('Error: ' + e.message); }
}

function renderCertifications(certs) {
  document.getElementById('certsBody').innerHTML = certs.map(c => `
    <tr>
      <td><strong>${c.certification_number}</strong></td>
      <td>${c.part_name}</td>
      <td>${c.supplier_name}</td>
      <td>${badge(c.status)}</td>
      <td>${c.is_finalized ? '✅ ' + fmt(c.finalized_at) : '⏳ Pending'}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick='viewCert(${c.certification_id})'>View</button>
        ${!c.is_finalized && c.status!=='approved' ?
          `<button class="btn btn-sm btn-success" onclick='finalizeCert(${c.certification_id})'>Finalize</button>` : ''}
      </td>
    </tr>`).join('');
}

async function viewCert(id) {
  const d = await apiFetch(`/api/certifications/${id}`);
  if (d) showDetail(`Certification ${d.certification_number}`, d);
}

async function finalizeCert(id) {
  if (!confirm('Finalize this certification? This action is irreversible.')) return;
  const now = new Date();
  const stamp = `${currentUser.fullName} | EMP-${currentUser.empId} | ${now.toISOString().slice(0,10)}`;
  const sig   = `Electronically signed by ${currentUser.fullName} (EMP-${currentUser.empId}) on ${now.toLocaleString('en-GB')}`;
  try {
    await apiFetch(`/api/certifications/${id}/finalize`, {
      method: 'PATCH',
      body: JSON.stringify({ digital_stamp: stamp, signature_data: sig })
    });
    loadQuality();
  } catch(e) { alert('Error: ' + e.message); }
}

async function loadQCCharts() {
  const [byType, trends, failures] = await Promise.all([
    apiFetch('/api/dashboard/qc-by-type'),
    apiFetch('/api/dashboard/qc-trends'),
    apiFetch('/api/dashboard/failure-analysis')
  ]);

  if (byType && byType.length) {
    if (charts.qcPie) charts.qcPie.destroy();
    charts.qcPie = new Chart(document.getElementById('qcPieChart'), {
      type: 'doughnut',
      data: {
        labels: byType.map(r => r.inspection_type),
        datasets: [{ data: byType.map(r => r.total), backgroundColor: ['#0066cc','#1a9e4e','#e07c00','#c0392b','#7c3aed'] }]
      },
      options: { plugins: { legend: { position: 'bottom' } } }
    });
  }

  const trendCanvas = document.getElementById('qcTrendChart');
  const trendWrapper = trendCanvas ? trendCanvas.closest('.chart-box') : null;
  // Remove any previous no-data message
  const prevMsg = trendWrapper ? trendWrapper.querySelector('.no-data-msg') : null;
  if (prevMsg) prevMsg.remove();

  if (trends && trends.length) {
    if (charts.qcTrend) charts.qcTrend.destroy();
    charts.qcTrend = new Chart(trendCanvas, {
      type: 'line',
      data: {
        labels: trends.map(r => r.month),
        datasets: [
          { label: 'Pass', data: trends.map(r => Number(r.passed)), borderColor: '#1a9e4e', backgroundColor: '#d1fae5', fill: true },
          { label: 'Fail', data: trends.map(r => Number(r.failed)), borderColor: '#c0392b', backgroundColor: '#fee2e2', fill: true }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            title: { display: true, text: 'Number of Reports' }
          }
        }
      }
    });
  } else if (trendWrapper) {
    if (trendCanvas) trendCanvas.style.display = 'none';
    const msg = document.createElement('p');
    msg.className = 'no-data-msg';
    msg.style.cssText = 'color:#9ca3af;font-size:0.9rem;text-align:center;padding:40px 0;margin:0';
    msg.textContent = 'No QC trend data available yet. Submit and approve QC reports to see the 12-month trend.';
    trendWrapper.appendChild(msg);
  }

  // Failure analysis horizontal bar chart
  const failureCanvas = document.getElementById('failureChart');
  const failureWrapper = failureCanvas ? failureCanvas.closest('.chart-box') : null;
  const prevFailMsg = failureWrapper ? failureWrapper.querySelector('.no-data-msg') : null;
  if (prevFailMsg) prevFailMsg.remove();

  if (failures && failures.length) {
    // Show all causes; highlight those with occurrences > 0
    const withOccurrences = failures.filter(f => Number(f.occurrences) > 0);
    const displayData = withOccurrences.length ? withOccurrences : failures.slice(0, 5);

    if (charts.failureChart) charts.failureChart.destroy();
    if (failureCanvas) failureCanvas.style.display = '';
    charts.failureChart = new Chart(failureCanvas, {
      type: 'bar',
      data: {
        labels: displayData.map(f => f.description),
        datasets: [{
          label: 'Occurrences',
          data: displayData.map(f => Number(f.occurrences)),
          backgroundColor: displayData.map(f =>
            Number(f.occurrences) > 0 ? '#c0392b' : '#d1d5db'
          ),
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${ctx.raw} report(s)` } }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            title: { display: true, text: 'Number of Reports' }
          },
          y: { ticks: { font: { size: 11 } } }
        }
      }
    });
  } else if (failureWrapper) {
    if (failureCanvas) failureCanvas.style.display = 'none';
    const noMsg = document.createElement('p');
    noMsg.className = 'no-data-msg';
    noMsg.style.cssText = 'color:#9ca3af;font-size:0.9rem;text-align:center;padding:40px 0;margin:0';
    noMsg.textContent = 'No failure cause data available yet.';
    failureWrapper.appendChild(noMsg);
  }
}

// ── Certification Modal ─────────────────────────────────────────
async function showCertModal() {
  const suppliers = await apiFetch('/api/suppliers');
  const sSel = document.getElementById('certSupplierSel');
  if (suppliers) {
    sSel.innerHTML = '<option value="">— Select Supplier —</option>' +
      suppliers.filter(s => s.status === 'active')
               .map(s => `<option value="${s.supplier_id}">${s.business_name}</option>`)
               .join('');
  }
  document.getElementById('certSupplierPartSel').innerHTML = '<option value="">— Choose supplier first —</option>';

  // Load approved QC reports for optional linking
  const qcReports = await apiFetch('/api/qcreports?status=approved');
  const qcSel = document.getElementById('certQcSel');
  if (qcReports && qcReports.length) {
    qcSel.innerHTML = '<option value="">— No QC report linked —</option>' +
      qcReports.map(r => `<option value="${r.qc_report_id}">${r.report_number} — ${r.part_name} (${r.overall_result})</option>`)
               .join('');
  } else {
    qcSel.innerHTML = '<option value="">— No approved QC reports found —</option>';
  }

  // Wire supplier → load parts
  sSel.onchange = async function () {
    const sid = this.value;
    const pSel = document.getElementById('certSupplierPartSel');
    if (!sid) { pSel.innerHTML = '<option value="">— Choose supplier first —</option>'; return; }
    pSel.innerHTML = '<option value="">Loading…</option>';
    try {
      const parts = await apiFetch(`/api/suppliers/${sid}/parts`);
      if (!parts || !parts.length) { pSel.innerHTML = '<option value="">— No parts —</option>'; return; }
      pSel.innerHTML = '<option value="">— Select Part —</option>' +
        parts.map(p => `<option value="${p.supplier_part_id}">${p.part_name} (${p.supplier_part_code || p.part_number})</option>`)
             .join('');
    } catch (e) { pSel.innerHTML = '<option value="">— Error —</option>'; }
  };

  document.getElementById('certModal').style.display = 'flex';
}

// ── QC Modal ────────────────────────────────────────────────────
async function showQCModal() {
  // Populate supplier dropdown
  const suppliers = await apiFetch('/api/suppliers');
  const sSel = document.getElementById('qcSupplierSel');
  if (suppliers) {
    sSel.innerHTML = '<option value="">— Select Supplier —</option>' +
      suppliers.filter(s => s.status === 'active')
               .map(s => `<option value="${s.supplier_id}">${s.business_name}</option>`)
               .join('');
  }

  // Reset part dropdown
  document.getElementById('qcSupplierPartSel').innerHTML = '<option value="">— Choose supplier first —</option>';

  // Set default inspection date to today
  document.getElementById('qcDate').value = new Date().toISOString().slice(0, 10);

  // Wire supplier → load parts
  sSel.onchange = async function () {
    const sid = this.value;
    const pSel = document.getElementById('qcSupplierPartSel');
    if (!sid) { pSel.innerHTML = '<option value="">— Choose supplier first —</option>'; return; }
    pSel.innerHTML = '<option value="">Loading…</option>';
    try {
      const parts = await apiFetch(`/api/suppliers/${sid}/parts`);
      if (!parts || !parts.length) {
        pSel.innerHTML = '<option value="">— No parts for this supplier —</option>';
        return;
      }
      pSel.innerHTML = '<option value="">— Select Part —</option>' +
        parts.map(p => `<option value="${p.supplier_part_id}">${p.part_name} (${p.supplier_part_code || p.part_number})</option>`)
             .join('');
    } catch (e) {
      pSel.innerHTML = '<option value="">— Error loading parts —</option>';
    }
  };

  document.getElementById('qcModal').style.display = 'flex';
}
document.addEventListener('DOMContentLoaded', () => {
  // Set default dates for order modal
  const today = new Date().toISOString().slice(0,10);
  const orderDateEl = document.getElementById('orderDate');
  if (orderDateEl) orderDateEl.value = today;

  // Create Order form handler
  const orderForm = document.getElementById('orderForm');
  if (orderForm) orderForm.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('orderModalError');
    errEl.style.display = 'none';
    const supplierId = parseInt(document.getElementById('orderSupplierSel').value);
    if (!supplierId) { errEl.textContent = 'Please select a supplier.'; errEl.style.display = 'block'; return; }
    if (!orderLines.length) {
      errEl.textContent = 'Please add at least one part line before creating the order. Use the "Add Line Items" section above to select a part, set quantity and price, then click + Add.';
      errEl.style.display = 'block';
      return;
    }
    try {
      const po = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id:           supplierId,
          order_date:            document.getElementById('orderDate').value,
          desired_delivery_date: document.getElementById('orderDelivery').value,
          lines: orderLines.map(l => ({
            supplier_part_id:       l.supplier_part_id,
            quantity:               l.quantity,
            unit_price:             l.unit_price,
            required_delivery_date: l.required_delivery_date
          }))
        })
      });
      closeModal('orderModal');
      const lineCount = orderLines.length;
      orderLines = [];
      showBanner(`Order ${po.po_number} created successfully with ${lineCount} line item(s)!`);
      loadProcurement();
    } catch(ex) { errEl.textContent = ex.message; errEl.style.display = 'block'; }
  });

  const qcForm = document.getElementById('qcForm');
  if (qcForm) qcForm.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('qcModalError');
    errEl.style.display = 'none';
    const suppPartId = parseInt(document.getElementById('qcSupplierPartSel').value);
    if (!suppPartId) { errEl.textContent = 'Please select a supplier and part.'; errEl.style.display = 'block'; return; }
    try {
      await apiFetch('/api/qcreports', {
        method: 'POST',
        body: JSON.stringify({
          supplier_part_id: suppPartId,
          inspection_type:  document.getElementById('qcType').value,
          overall_result:   document.getElementById('qcResult').value,
          inspection_date:  document.getElementById('qcDate').value,
          payload:          { notes: document.getElementById('qcNotes').value }
        })
      });
      closeModal('qcModal');
      showBanner('QC report created successfully!');
      loadQuality();
    } catch(ex) { errEl.textContent = ex.message; errEl.style.display = 'block'; }
  });

  // Create Certification form handler
  const certForm = document.getElementById('certForm');
  if (certForm) certForm.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('certModalError');
    errEl.style.display = 'none';
    const suppPartId = parseInt(document.getElementById('certSupplierPartSel').value);
    if (!suppPartId) { errEl.textContent = 'Please select a supplier and part.'; errEl.style.display = 'block'; return; }
    const qcId = document.getElementById('certQcSel').value;
    try {
      const cert = await apiFetch('/api/certifications', {
        method: 'POST',
        body: JSON.stringify({
          supplier_part_id: suppPartId,
          qc_report_id: qcId ? parseInt(qcId) : null,
          notes: document.getElementById('certNotes').value.trim() || null
        })
      });
      closeModal('certModal');
      showBanner(`Certification ${cert.certification_number} created as draft. Use Finalize to approve.`);
      loadQuality();
    } catch(ex) { errEl.textContent = ex.message; errEl.style.display = 'block'; }
  });

  // Create Shipment form handler
  const shipmentForm = document.getElementById('shipmentForm');
  if (shipmentForm) shipmentForm.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = document.getElementById('shipmentModalError');
    errEl.style.display = 'none';
    const carrier = document.getElementById('shipmentCarrier').value.trim();
    const eta     = document.getElementById('shipmentETA').value;
    if (!carrier) { errEl.textContent = 'Carrier name is required.'; errEl.style.display = 'block'; return; }
    if (!eta)     { errEl.textContent = 'Estimated arrival date is required.'; errEl.style.display = 'block'; return; }

    // Collect all checked PO IDs from the checklist
    const checkedBoxes = document.querySelectorAll('#shipmentPoChecklist .po-check:checked');
    const poIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

    try {
      const sh = await apiFetch('/api/shipments', {
        method: 'POST',
        body: JSON.stringify({
          carrier,
          tracking_number: document.getElementById('shipmentTracking').value.trim() || null,
          port_of_entry:   document.getElementById('shipmentPort').value.trim() || null,
          estimated_arrival: eta,
          po_ids: poIds.length ? poIds : undefined
        })
      });
      closeModal('shipmentModal');
      const poMsg = poIds.length ? ` Linked ${poIds.length} order(s), marked as dispatched.` : '';
      showBanner(`Shipment ${sh.shipment_number} created successfully!${poMsg}`);
      loadManager();
    } catch(ex) { errEl.textContent = ex.message; errEl.style.display = 'block'; }
  });
});

// ── Shipment Map (Leaflet) ─────────────────────────────────────
let shipmentMap = null;
let shipmentMarkers = [];

async function loadShipmentMap() {
  if (typeof L === 'undefined') return; // Leaflet not loaded

  const shipments = await apiFetch('/api/dashboard/shipment-tracking');
  if (!shipments || !shipments.length) return;

  // Filter to those with coordinates
  const withCoords = shipments.filter(s => s.last_lat != null && s.last_lon != null);

  const mapEl = document.getElementById('shipmentMap');
  if (!mapEl) return;

  // Initialise map only once
  if (!shipmentMap) {
    // Centre on average lat/lon of active shipments, or default to 0,0
    const avgLat = withCoords.length ? withCoords.reduce((s, x) => s + Number(x.last_lat), 0) / withCoords.length : 30;
    const avgLon = withCoords.length ? withCoords.reduce((s, x) => s + Number(x.last_lon), 0) / withCoords.length : 0;
    shipmentMap = L.map('shipmentMap').setView([avgLat, avgLon], 3);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18
    }).addTo(shipmentMap);
  }

  // Clear previous markers
  shipmentMarkers.forEach(m => m.remove());
  shipmentMarkers = [];

  // Add a marker for each shipment with known coords
  withCoords.forEach(s => {
    const isOverdue = s.overdue;
    const color = isOverdue ? '#c0392b' : s.status === 'in_transit' ? '#e07c00' : '#1a9e4e';
    const icon = L.divIcon({
      className: '',
      html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    const marker = L.marker([Number(s.last_lat), Number(s.last_lon)], { icon })
      .bindPopup(`
        <strong>${s.shipment_number}</strong><br>
        ${s.carrier}<br>
        ${s.last_location || 'Location unknown'}<br>
        ETA: ${s.estimated_arrival ? new Date(s.estimated_arrival).toLocaleDateString('en-GB') : '—'}<br>
        <span style="color:${color};font-weight:600">${s.status.replace(/_/g,' ')}${isOverdue ? ' ⚠ OVERDUE' : ''}</span>
      `)
      .addTo(shipmentMap);
    shipmentMarkers.push(marker);
  });

  // Force Leaflet to recalculate size (needed after section becomes visible)
  setTimeout(() => shipmentMap.invalidateSize(), 400);
}

// ── Manager Section ────────────────────────────────────────────
async function loadManager() {
  const [shipments, kpis, orders] = await Promise.all([
    apiFetch('/api/shipments'),
    apiFetch('/api/dashboard/supplier-kpis'),
    apiFetch('/api/orders')
  ]);
  if (orders)    renderManagerOrders(orders);
  if (shipments) renderShipments(shipments);
  if (kpis)      { renderKPITable(kpis); renderSupplierCharts(kpis); }
  loadShipmentMap();

  // Filter: orders by status
  const mgrFilter = document.getElementById('mgrOrderStatusFilter');
  if (mgrFilter && !mgrFilter._wired) {
    mgrFilter._wired = true;
    mgrFilter.addEventListener('change', async function() {
      const q = this.value ? `?status=${this.value}` : '';
      const d = await apiFetch('/api/orders' + q);
      if (d) renderManagerOrders(d);
    });
  }

  // Filter: shipments by status
  const shipFilter = document.getElementById('shipStatusFilter');
  if (shipFilter && !shipFilter._wired) {
    shipFilter._wired = true;
    shipFilter.addEventListener('change', async function() {
      const q = this.value ? `?status=${this.value}` : '';
      const d = await apiFetch('/api/shipments' + q);
      if (d) renderShipments(d);
    });
  }
}

function renderManagerOrders(orders) {
  document.getElementById('mgrOrdersBody').innerHTML = orders.map(o => {
    // Contextual action button based on current status
    let action = '';
    if (o.status === 'placed') {
      action = `<button class="btn btn-sm btn-primary" onclick="updateOrderStatus(${o.po_id},'confirmed')">Confirm</button>`;
    } else if (o.status === 'confirmed') {
      action = `<button class="btn btn-sm btn-primary" onclick="showCreateShipmentModal(${o.po_id},'${o.po_number}')">📦 Create Shipment</button>`;
    } else if (o.status === 'delivered') {
      action = `<button class="btn btn-sm btn-success" onclick="updateOrderStatus(${o.po_id},'completed')">✓ Complete</button>`;
    }
    return `
      <tr>
        <td><strong>${o.po_number}</strong></td>
        <td>${o.supplier_name}</td>
        <td>${fmt(o.order_date)}</td>
        <td>${fmt(o.desired_delivery_date)}</td>
        <td>${badge(o.status)}</td>
        <td>£${fmtNum(o.total_value)}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick='viewOrder(${o.po_id})'>View</button>
          ${action}
        </td>
      </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;color:#6b7280">No orders found</td></tr>';
}

async function updateOrderStatus(id, newStatus) {
  if (!confirm(`Update order status to "${newStatus}"?`)) return;
  try {
    await apiFetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus })
    });
    showBanner(`Order status updated to "${newStatus}" ✓`);
    loadManager();
  } catch (e) { alert('Error updating order status: ' + e.message); }
}

async function showCreateShipmentModal(preselectedPoId) {
  // Reset form fields
  document.getElementById('shipmentCarrier').value  = '';
  document.getElementById('shipmentTracking').value = '';
  document.getElementById('shipmentPort').value     = '';
  document.getElementById('shipmentModalError').style.display = 'none';

  // Pre-fill ETA (+14 days) when called from an order row
  if (preselectedPoId) {
    const eta = new Date();
    eta.setDate(eta.getDate() + 14);
    document.getElementById('shipmentETA').value = eta.toISOString().slice(0, 10);
  }

  // Build checkbox list of confirmed + dispatched orders (show both so users can re-link)
  const allOrders = await apiFetch('/api/orders');
  const orders = allOrders ? allOrders.filter(o => o.status === 'confirmed' || o.status === 'dispatched') : [];
  const checklist = document.getElementById('shipmentPoChecklist');
  if (!orders || !orders.length) {
    checklist.innerHTML = '<p style="color:#9ca3af;font-size:0.85rem;margin:4px 0">No confirmed orders available to link.</p>';
  } else {
    // Group by supplier for readability
    const bySupplier = {};
    orders.forEach(o => {
      if (!bySupplier[o.supplier_name]) bySupplier[o.supplier_name] = [];
      bySupplier[o.supplier_name].push(o);
    });
    checklist.innerHTML = Object.entries(bySupplier).map(([supplier, pos]) => `
      <div style="margin-bottom:8px">
        <div style="font-size:0.78rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">${supplier}</div>
        ${pos.map(o => `
          <label style="display:flex;align-items:center;gap:8px;padding:5px 4px;cursor:pointer;border-radius:4px;transition:background 0.1s" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'">
            <input type="checkbox" class="po-check" value="${o.po_id}" ${o.po_id === preselectedPoId ? 'checked' : ''}
              style="width:16px;height:16px;cursor:pointer;accent-color:#0066cc">
            <span style="font-size:0.88rem;color:#111827"><strong>${o.po_number}</strong></span>
            <span style="font-size:0.82rem;color:#6b7280">£${fmtNum(o.total_value)} · Due ${fmt(o.desired_delivery_date)}</span>
          </label>`).join('')}
      </div>`).join('');
  }

  document.getElementById('shipmentModal').style.display = 'flex';
}

function renderShipments(shipments) {
  document.getElementById('shipmentsBody').innerHTML = shipments.map(s => `
    <tr>
      <td><strong>${s.shipment_number}</strong></td>
      <td>${s.carrier}</td>
      <td>${s.port_of_entry || '—'}</td>
      <td>${fmt(s.estimated_arrival)}</td>
      <td>${badge(s.status)}</td>
      <td>${s.is_delayed ? badge('Delayed','badge-fail') : badge('On Time','badge-pass')}</td>
      <td>${s.last_location || '<span style="color:#9ca3af">No updates yet</span>'}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick='viewShipment(${s.shipment_id})'>View</button>
        ${s.status !== 'delivered' && s.status !== 'returned'
          ? `<button class="btn btn-sm btn-primary" onclick='updateShipmentStatus(${s.shipment_id},"${s.status}")'>Update</button>`
          : ''}
      </td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;color:#6b7280">No shipments found</td></tr>';
}

async function viewShipment(id) {
  const d = await apiFetch(`/api/shipments/${id}`);
  if (d) showDetail(`Shipment ${d.shipment_number}`, d);
}

async function updateShipmentStatus(id, currentStatus) {
  const next = { pending: 'in_transit', in_transit: 'customs', customs: 'delivered' };
  const nextStatus = next[currentStatus];
  if (!nextStatus) { alert('Shipment is already at a final status.'); return; }
  if (!confirm(`Move shipment to "${nextStatus}"?`)) return;
  try {
    await apiFetch(`/api/shipments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus })
    });
    showBanner(`Shipment status updated to "${nextStatus}" ✓`);
    loadManager();
  } catch (e) { alert('Error: ' + e.message); }
}

function renderKPITable(kpis) {
  document.getElementById('kpiBody').innerHTML = kpis.map(k => `
    <tr>
      <td><strong>${k.business_name}</strong></td>
      <td>${k.country}</td>
      <td>${k.total_orders}</td>
      <td>${k.on_time_pct != null ? badge(k.on_time_pct + '%', k.on_time_pct>=80?'badge-pass':k.on_time_pct>=50?'badge-warn':'badge-fail') : '—'}</td>
      <td>${k.total_qc}</td>
      <td>${k.defect_rate_pct != null ? badge(k.defect_rate_pct + '%', k.defect_rate_pct<=5?'badge-pass':k.defect_rate_pct<=15?'badge-warn':'badge-fail') : '—'}</td>
    </tr>`).join('');
}

function renderSupplierCharts(kpis) {
  const labels = kpis.map(k => k.business_name.split(' ')[0]);
  if (charts.supplierKpi) charts.supplierKpi.destroy();
  charts.supplierKpi = new Chart(document.getElementById('supplierKpiChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'On-Time Delivery %',
        data: kpis.map(k => k.on_time_pct != null ? Number(k.on_time_pct) : 0),
        backgroundColor: kpis.map(k => {
          const v = k.on_time_pct != null ? Number(k.on_time_pct) : 0;
          return v >= 80 ? '#1a9e4e' : v >= 50 ? '#e07c00' : '#c0392b';
        })
      }]
    },
    options: {
      scales: { y: { min: 0, max: 100, title: { display: true, text: '%' } } },
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => ` ${ctx.raw}%` }
      }}
    }
  });

  if (charts.defectRate) charts.defectRate.destroy();
  charts.defectRate = new Chart(document.getElementById('defectRateChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Defect Rate %',
        data: kpis.map(k => k.defect_rate_pct != null ? Number(k.defect_rate_pct) : 0),
        backgroundColor: kpis.map(k => {
          const v = k.defect_rate_pct != null ? Number(k.defect_rate_pct) : 0;
          return v <= 5 ? '#1a9e4e' : v <= 15 ? '#e07c00' : '#c0392b';
        })
      }]
    },
    options: {
      scales: { y: { min: 0, title: { display: true, text: '%' } } },
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => ` ${ctx.raw}%` }
      }}
    }
  });
}

// ── Equipment Engineer Section ─────────────────────────────────
async function loadEngineer() {
  const [health, alerts, equip] = await Promise.all([
    apiFetch('/api/dashboard/iot-health'),
    apiFetch('/api/iot/alerts'),
    apiFetch('/api/equipment')
  ]);
  if (health) {
    document.querySelector('#iotOk .kpi-num').textContent   = health.ok;
    document.querySelector('#iotWarn .kpi-num').textContent = health.warning;
    document.querySelector('#iotCrit .kpi-num').textContent = health.critical;
    document.querySelector('#iotMaint .kpi-num').textContent= health.maintenance;
  }
  if (alerts) renderAlerts(alerts);
  if (equip)  renderEquipment(equip);

  // Populate equipment picker and wire it
  const picker = document.getElementById('iotEquipPicker');
  if (picker && equip && equip.length) {
    picker.innerHTML = equip.map(e =>
      `<option value="${e.equipment_id}">${e.equipment_name} (${e.equipment_code})</option>`
    ).join('');
    if (!picker._wired) {
      picker._wired = true;
      picker.addEventListener('change', function () {
        const selected = equip.find(e => Number(e.equipment_id) === Number(this.value));
        loadIoTChart(selected ? [selected] : equip);
      });
    }
  }

  await loadIoTChart(equip);
}

function renderAlerts(alerts) {
  const open = alerts.filter(a => a.status !== 'resolved');
  document.getElementById('alertsBody').innerHTML = open.map(a => `
    <tr>
      <td>${a.equipment_name || '—'}</td>
      <td>${a.facility || '—'}</td>
      <td>${a.alert_type.replace(/_/g,' ')}</td>
      <td>${badge(a.severity, `badge-${a.severity}`)}</td>
      <td>${a.actual_value ?? '—'}</td>
      <td>${a.threshold_value ?? '—'}</td>
      <td>${badge(a.status)}</td>
      <td>${a.status==='open'?`<button class="btn btn-sm btn-primary" onclick='ackAlert(${a.alert_id})'>Acknowledge</button>`:'—'}</td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;color:#6b7280">No active alerts</td></tr>';
}

async function ackAlert(id) {
  try {
    await apiFetch(`/api/iot/alerts/${id}/acknowledge`, { method: 'PATCH' });
    loadEngineer();
  } catch(e) { alert('Error: ' + e.message); }
}

function renderEquipment(equip) {
  document.getElementById('equipBody').innerHTML = equip.map(e => `
    <tr>
      <td><code>${e.equipment_code}</code></td>
      <td>${e.equipment_name}</td>
      <td>${e.equipment_type.replace(/_/g,' ')}</td>
      <td>${e.facility}</td>
      <td>${badge(e.status)}</td>
      <td>${e.device_count}</td>
      <td>${e.open_alerts > 0 ? badge(e.open_alerts + ' open','badge-fail') : badge('None','badge-pass')}</td>
    </tr>`).join('');
}

async function loadIoTChart(equipList) {
  const equipId   = (equipList && equipList.length) ? equipList[0].equipment_id : null;
  const equipName = (equipList && equipList.length) ? equipList[0].equipment_name : 'Equipment';
  const labelEl   = document.getElementById('iotChartLabel');

  if (!equipId) {
    if (labelEl) labelEl.textContent = 'No equipment available';
    return;
  }

  const readings = await apiFetch(`/api/equipment/${equipId}/readings?limit=30`);

  if (!readings || !readings.length) {
    if (labelEl) labelEl.textContent = `No sensor readings available — ${equipName}`;
    if (charts.iotTrend) { charts.iotTrend.destroy(); charts.iotTrend = null; }
    return;
  }

  // Try temperature first; fall back to any available metric type
  let dataPoints = readings.filter(r => r.metric_type === 'temperature').reverse();
  let metricLabel = 'Temperature (°C)';
  let chartColor  = '#e07c00';
  if (!dataPoints.length) {
    // Use whichever metric type has the most readings
    const metricGroups = {};
    readings.forEach(r => { metricGroups[r.metric_type] = (metricGroups[r.metric_type] || 0) + 1; });
    const topMetric = Object.entries(metricGroups).sort((a,b) => b[1]-a[1])[0]?.[0];
    if (!topMetric) {
      if (labelEl) labelEl.textContent = `No plottable readings — ${equipName}`;
      return;
    }
    dataPoints  = readings.filter(r => r.metric_type === topMetric).reverse();
    metricLabel = topMetric.replace(/_/g,' ') + ' (' + (dataPoints[0]?.unit || '') + ')';
    chartColor  = '#0066cc';
  }

  if (labelEl) labelEl.textContent = `${metricLabel} — ${equipName}`;

  if (charts.iotTrend) charts.iotTrend.destroy();
  charts.iotTrend = new Chart(document.getElementById('iotTrendChart'), {
    type: 'line',
    data: {
      labels: dataPoints.map(r => {
        const d = new Date(r.event_timestamp);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      }),
      datasets: [{
        label: `${metricLabel} — ${equipName}`,
        data: dataPoints.map(r => r.metric_value),
        borderColor: chartColor,
        backgroundColor: chartColor.replace(')', ',0.1)').replace('rgb', 'rgba'),
        fill: true, tension: 0.3
      }]
    },
    options: { scales: { y: { beginAtZero: false } }, plugins: { legend: { display: false } } }
  });
}

// ── Auditor Section ────────────────────────────────────────────
async function loadAuditor() {
  const [certs, qc, auditLog] = await Promise.all([
    apiFetch('/api/certifications'),
    apiFetch('/api/qcreports'),
    apiFetch('/api/audit')
  ]);
  if (certs) {
    document.getElementById('auditCertsBody').innerHTML = certs.map(c => `
      <tr>
        <td><strong>${c.certification_number}</strong></td>
        <td>${c.part_name}</td>
        <td>${c.supplier_name}</td>
        <td>${badge(c.status)}</td>
        <td>${c.is_finalized ? '✅ ' + fmt(c.finalized_at) : '⏳ Pending'}</td>
        <td>${c.certified_by || '—'}</td>
      </tr>`).join('');
  }
  if (qc) {
    document.getElementById('auditQcBody').innerHTML = qc.map(r => `
      <tr>
        <td><strong>${r.report_number}</strong></td>
        <td>${r.part_name}</td>
        <td>${r.inspection_type}</td>
        <td>${badge(r.overall_result, r.overall_result==='Pass'?'badge-pass':r.overall_result==='Fail'?'badge-fail':'badge-conditional')}</td>
        <td>${fmt(r.inspection_date)}</td>
        <td>${r.inspector_name || '—'}</td>
        <td>${badge(r.status)}</td>
      </tr>`).join('');
  }
  if (auditLog) renderAuditLog(auditLog);

  document.getElementById('auditActionFilter').addEventListener('change', async function() {
    const q = this.value ? `?action_type=${this.value}` : '';
    const d = await apiFetch('/api/audit' + q);
    if (d) renderAuditLog(d);
  });
}

function renderAuditLog(logs) {
  document.getElementById('auditLogBody').innerHTML = logs.map(l => `
    <tr>
      <td>${new Date(l.event_timestamp).toLocaleString('en-GB')}</td>
      <td>${l.user_name || 'System'}</td>
      <td>${badge(l.action_type)}</td>
      <td>${l.entity_type || '—'}</td>
      <td>${l.entity_ref || '—'}</td>
      <td><code>${l.ip_address || '—'}</code></td>
    </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:#6b7280">No audit entries</td></tr>';
}

// ── Initialise ────────────────────────────────────────────────
async function init() {
  const token = getToken();
  if (!token) { window.location.href = 'index.html'; return; }

  currentUser = getUser();
  if (!currentUser) { logout(); return; }

  buildNav(currentUser);
  document.getElementById('logoutBtn').addEventListener('click', logout);

  await loadOverview();

  // Show the correct default section based on role
  const role = currentUser.roles[0];
  const sectionMap = {
    procurement_officer:  'sectionProcurement',
    quality_inspector:    'sectionQuality',
    supply_chain_manager: 'sectionManager',
    equipment_engineer:   'sectionEngineer',
    auditor:              'sectionAuditor',
  };
  const defaultSection = sectionMap[role] || 'sectionOverview';
  const firstNavLink   = document.querySelector(`[data-section="${defaultSection}"]`);
  showSection(defaultSection, firstNavLink);

  // Eagerly load the section
  if (role === 'procurement_officer')  loadProcurement();
  if (role === 'quality_inspector')    loadQuality();
  if (role === 'supply_chain_manager') loadManager();
  if (role === 'equipment_engineer') {
    loadEngineer();
    // IoT auto-refresh every 30 seconds — simulates live streaming
    setInterval(() => loadEngineer(), 30000);
  }
  if (role === 'auditor')              loadAuditor();

  // Wire up nav clicks to lazy-load each section
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function() {
      const s = this.dataset.section;
      if (s === 'sectionProcurement' && role === 'procurement_officer') loadProcurement();
      if (s === 'sectionQuality'     && role === 'quality_inspector')   loadQuality();
      if (s === 'sectionManager'     && role === 'supply_chain_manager')loadManager();
      if (s === 'sectionEngineer'    && role === 'equipment_engineer')  loadEngineer();
      if (s === 'sectionAuditor'     && role === 'auditor')             loadAuditor();
    });
  });
}

if (document.getElementById('logoutBtn')) init();
