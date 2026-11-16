const me = Session.get(); const view = $('#view'), tabsEl = $('#tabs');
let tab = '', cache = {};
const TABS = {
  manager: [['approvals', 'Order approvals'], ['disputes', 'Disputes'], ['apps', 'Workshop applications'], ['all', 'All orders']],
  warehouse: [['pack', 'To pack'], ['dispatch', 'Ready to dispatch'], ['stock', 'Stock']],
  rider: [['trips', 'My trips']],
  admin: [['overview', 'Overview'], ['products', 'Products'], ['users', 'Users']]
};
async function init() {
  if (!me || me.role === 'customer') { view.innerHTML = '<div class="panel empty">Staff only. <button class="btn sm" onclick="openAuth()">Log in</button></div>'; return; }
  $('#title').textContent = { manager: 'Store Manager', warehouse: 'Warehouse Operator', rider: 'My deliveries', admin: 'Administrator' }[me.role];
  const t = TABS[me.role]; tab = t[0][0]; drawTabs(); show();
}
function drawTabs() {
  tabsEl.innerHTML = TABS[me.role].map(([k, l]) => `<button role="tab" class="${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('');
}
async function show() {
  view.innerHTML = '<p class="empty">Loading...</p>';
  try { await VIEWS[tab](); } catch (e) { view.innerHTML = '<p class="empty">Could not load data. Is the API running?</p>'; }
}
const orderRow = (o, actions = '', users = {}) => `<article class="panel order"><div class="head"><h3>Order #${o.id} ${statusTag(o.status)}</h3><b>${fmt(o.total)}</b></div>
  <p class="hint">${esc((users[o.customerId] || {}).name || 'Customer #' + o.customerId)} &middot; ${esc(o.address)} &middot; ${o.orderType === 'workshop' ? 'Workshop' : 'Retail'}</p>
  <ul>${o.items.map(i => `<li>${esc(i.name)} &times; ${i.qty}</li>`).join('')}</ul>${o.disputeReason ? `<p>Dispute: <i>${esc(o.disputeReason)}</i></p>` : ''}${o.failReason ? `<p class="err">Failed: ${esc(o.failReason)}</p>` : ''}${o.note ? `<p class="hint">Note: ${esc(o.note)}</p>` : ''}
  <div class="row">${actions}</div></article>`;
const customers = async () => Object.fromEntries((await api('/users?role=customer')).map(u => [u.id, u]));
const listOrders = (q, fn, empty) => api('/orders?' + q + '&_sort=id&_order=desc').then(async os => { const us = await customers(); cache.orders = os; view.innerHTML = os.length ? os.map(o => orderRow(o, fn(o), us)).join('') : `<div class="panel empty">${empty}</div>`; });

const VIEWS = {
  approvals: () => listOrders('status=Pending Approval', o => `<button class="btn ok sm" data-act="approve" data-id="${o.id}">Approve</button><input id="rj${o.id}" placeholder="Reason to reject" style="max-width:240px"><button class="btn danger sm" data-act="reject" data-id="${o.id}">Reject</button>`, 'No workshop orders waiting for approval.'),
  disputes: () => listOrders('status=Disputed', o => `<input id="rs${o.id}" placeholder="Resolution note" style="max-width:260px"><button class="btn sm" data-act="resolve" data-id="${o.id}">Resolve</button>`, 'No open disputes.'),
  all: () => listOrders('', () => '', 'No orders yet.'),
  apps: async () => {
    const us = await api('/users?workshopStatus=pending');
    view.innerHTML = us.length ? `<div class="table-wrap"><table><thead><tr><th>Applicant</th><th>CNIC</th><th>Phone</th><th>Credit limit (Rs)</th><th>Decision</th></tr></thead><tbody>${us.map(u => `<tr><td>${esc(u.name)}<br><span class="hint">${esc(u.address)}</span></td><td>${esc(u.cnic)}</td><td>${esc(u.phone)}</td><td><input type="number" min="0" step="5000" value="50000" id="cl${u.id}" style="width:120px"></td><td><button class="btn ok sm" data-act="appok" data-id="${u.id}">Approve</button> <button class="btn danger sm" data-act="appno" data-id="${u.id}">Reject</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="panel empty">No pending applications.</div>';
  },
  pack: () => listOrders('status=Approved', o => `<button class="btn sm" data-act="pack" data-id="${o.id}">Mark as packed</button>`, 'Nothing to pack.'),
  dispatch: async () => {
    const rs = await api('/users?role=rider'); const busy = await api('/orders?status=Out for Delivery&status=Arrived');
    await listOrders('status=Packed', o => `<select id="rd${o.id}" style="max-width:240px" aria-label="Rider for order ${o.id}"><option value="">Choose rider...</option>${rs.map(r => `<option value="${r.id}">${esc(r.name)} (${busy.filter(b => b.riderId === r.id).length} active)</option>`).join('')}</select><button class="btn sm" data-act="dispatch" data-id="${o.id}">Send out</button>`, 'No packed orders waiting for a rider.');
  },
  stock: async () => {
    const ps = await api('/products?_sort=name&_order=asc');
    view.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Part</th><th>Stock</th><th>Update</th></tr></thead><tbody>${ps.map(p => `<tr><td>${esc(p.name)}<br><span class="pno">${esc(p.partNo)}</span></td><td>${p.stock === 0 ? '<span class="tag bad">0</span>' : p.stock}</td><td class="row"><input type="number" min="0" value="${p.stock}" id="st${p.id}" style="width:90px" aria-label="Stock for ${esc(p.name)}"><button class="btn sm" data-act="setstock" data-id="${p.id}">Save</button><button class="btn danger sm" data-act="unavail" data-id="${p.id}">Mark unavailable</button></td></tr>`).join('')}</tbody></table></div>`;
  },
  trips: async () => {
    const os = await api(`/orders?riderId=${me.id}&_sort=id&_order=desc`), us = await customers(); const active = os.filter(o => ['Out for Delivery', 'Arrived'].includes(o.status)), done = os.filter(o => !active.includes(o));
    const card = o => { const c = us[o.customerId] || {}; return `<article class="panel order rider-card"><div class="head"><h3>Trip #${o.id} ${statusTag(o.status)}</h3><b>${fmt(o.total)}</b></div><p><b>${esc(c.name || '')}</b><br>${esc(o.address)}<br><a href="tel:${esc(o.phone || c.phone || '')}">${esc(o.phone || c.phone || '')}</a></p><p class="hint">${o.items.map(i => esc(i.name) + ' x' + i.qty).join(', ')}${o.note ? ' | ' + esc(o.note) : ''}</p>
      ${o.status === 'Out for Delivery' ? `<button class="btn" data-act="arrived" data-id="${o.id}">I have arrived</button>` : ''}
      ${o.status === 'Arrived' ? `<button class="btn ok" data-act="delivered" data-id="${o.id}">Delivered</button>` : ''}
      <div class="field" style="margin-top:.6rem"><label for="fr${o.id}">If delivery failed, reason</label><select id="fr${o.id}"><option value="">Choose reason...</option><option>House locked</option><option>Road blocked</option><option>Customer not reachable</option><option>Customer refused parts</option></select><div class="err"></div><button class="btn danger" data-act="failed" data-id="${o.id}">Mark as failed</button></div></article>`; };
    view.innerHTML = (active.length ? active.map(card).join('') : '<div class="panel empty">No active trips. New ones appear here when the warehouse dispatches them.</div>') + (done.length ? `<h2>Finished</h2>` + done.map(o => `<div class="panel order"><b>#${o.id}</b> ${statusTag(o.status)} <span class="hint">${esc(o.address)}</span></div>`).join('') : '');
  },
  overview: async () => {
    const [os, ps, us] = await Promise.all([api('/orders'), api('/products'), api('/users')]); const by = s => os.filter(o => o.status === s).length;
    const rev = os.filter(o => ['Delivered', 'Confirmed', 'Resolved'].includes(o.status)).reduce((s, o) => s + o.total, 0);
    const low = ps.filter(p => p.stock <= 10);
    view.innerHTML = `<div class="stats">${[['Orders', os.length], ['Awaiting approval', by('Pending Approval')], ['In delivery', by('Out for Delivery') + by('Arrived')], ['Disputes', by('Disputed')], ['Revenue', fmt(rev)], ['Users', us.length]].map(([l, v]) => `<div class="panel stat"><b>${v}</b>${l}</div>`).join('')}</div><h2>Low stock (10 or fewer)</h2><div class="table-wrap"><table><tbody>${low.map(p => `<tr><td>${esc(p.name)}</td><td>${p.stock}</td></tr>`).join('')}</tbody></table></div>`;
  },
  products: async () => {
    const [ps, cats] = await Promise.all([api('/products?_sort=id&_order=desc'), api('/categories')]);
    view.innerHTML = `<form id="pForm" class="panel" novalidate style="margin-bottom:1rem"><h3>Add a part</h3><div class="row">
    <div class="field" style="flex:2;min-width:180px"><label for="pName">Name</label><input id="pName"><div class="err"></div></div>
    <div class="field" style="flex:1;min-width:120px"><label for="pBrand">Brand</label><input id="pBrand"><div class="err"></div></div>
    <div class="field" style="flex:1;min-width:120px"><label for="pCat">Category</label><select id="pCat">${cats.map(c => `<option>${esc(c.name)}</option>`).join('')}</select><div class="err"></div></div>
    <div class="field" style="width:120px"><label for="pPrice">Price (Rs)</label><input id="pPrice" type="number" min="1"><div class="err"></div></div>
    <div class="field" style="width:100px"><label for="pStock">Stock</label><input id="pStock" type="number" min="0"><div class="err"></div></div></div>
    <button class="btn" type="submit">Add part</button></form>
    <div class="table-wrap"><table><thead><tr><th>Part</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody>${ps.map(p => `<tr><td>${p.icon} ${esc(p.name)}<br><span class="pno">${esc(p.partNo)} &middot; ${esc(p.brand)}</span></td><td><input type="number" min="1" value="${p.price}" id="pp${p.id}" style="width:110px"></td><td><input type="number" min="0" value="${p.stock}" id="ps${p.id}" style="width:90px"></td><td class="row"><button class="btn sm" data-act="saveprod" data-id="${p.id}">Save</button><button class="btn danger sm" data-act="delprod" data-id="${p.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>`;
    $('#pForm').onsubmit = addProduct;
  },
  users: async () => {
    const us = await api('/users?_sort=role&_order=asc');
    view.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Workshop</th></tr></thead><tbody>${us.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td><select data-role="${u.id}" aria-label="Role for ${esc(u.name)}">${['customer', 'manager', 'warehouse', 'rider', 'admin'].map(r => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select></td><td>${esc(u.workshopStatus)}</td></tr>`).join('')}</tbody></table></div>`;
  }
};
async function addProduct(e) {
  e.preventDefault();
  const ok = [check($('#pName'), V.name), check($('#pBrand'), V.req), check($('#pPrice'), v => Number(v) > 0 || 'Price must be above 0'), check($('#pStock'), v => (v !== '' && Number(v) >= 0 && Number.isInteger(+v)) || 'Whole number, 0 or more')].every(Boolean); if (!ok) return;
  const all = await api('/products'), n = Math.max(...all.map(p => p.id)) + 1;
  await api('/products', 'POST', { name: $('#pName').value.trim(), brand: $('#pBrand').value.trim(), category: $('#pCat').value, price: +$('#pPrice').value, stock: +$('#pStock').value, makes: [], description: 'New part', icon: '🔧', partNo: 'AN-' + (1000 + n * 7), fitment: [] });
  toast('Part added'); show();
}
document.addEventListener('click', async e => {
  const t = e.target; if (t.dataset.tab) { tab = t.dataset.tab; drawTabs(); return show(); }
  const a = t.dataset.act, id = t.dataset.id; if (!a) return;
  try {
    const o = ['approve', 'reject', 'resolve', 'pack', 'dispatch', 'arrived', 'delivered', 'failed'].includes(a) ? await api('/orders/' + id) : null;
    if (a === 'approve') await setStatus(o, 'Approved');
    if (a === 'reject') { const r = $('#rj' + id).value.trim(); if (r.length < 5) return toast('Give a reason (5+ characters)', true); await releaseOrder(o); await setStatus(o, 'Rejected', { rejectReason: r }); }
    if (a === 'resolve') { const r = $('#rs' + id).value.trim(); if (r.length < 5) return toast('Add a resolution note', true); await setStatus(o, 'Resolved', { resolution: r }); }
    if (a === 'pack') await setStatus(o, 'Packed');
    if (a === 'dispatch') { const r = $('#rd' + id).value; if (!r) return toast('Choose a rider first', true); await setStatus(o, 'Out for Delivery', { riderId: +r }); }
    if (a === 'arrived') { if (o.riderId !== me.id) return toast('Not your trip', true); await setStatus(o, 'Arrived'); }
    if (a === 'delivered') { if (o.riderId !== me.id) return toast('Not your trip', true); await setStatus(o, 'Delivered'); }
    if (a === 'failed') { const f = $('#fr' + id); if (!f.value) { f.classList.add('invalid'); f.parentElement.querySelector('.err').textContent = 'Choose a reason'; return; } await setStatus(o, 'Failed', { failReason: f.value }); await releaseOrder(o); }
    if (a === 'appok') await api('/users/' + id, 'PATCH', { workshopStatus: 'approved', accountType: 'workshop', creditLimit: Math.max(0, +$('#cl' + id).value || 0) });
    if (a === 'appno') await api('/users/' + id, 'PATCH', { workshopStatus: 'rejected' });
    if (a === 'setstock') { const v = +$('#st' + id).value; if (!Number.isInteger(v) || v < 0) return toast('Stock must be 0 or more', true); await api('/products/' + id, 'PATCH', { stock: v }); }
    if (a === 'unavail') await api('/products/' + id, 'PATCH', { stock: 0 });
    if (a === 'saveprod') { const p = +$('#pp' + id).value, s = +$('#ps' + id).value; if (!(p > 0) || !(s >= 0)) return toast('Check price and stock', true); await api('/products/' + id, 'PATCH', { price: p, stock: s }); }
    if (a === 'delprod' && confirm('Delete this part?')) await api('/products/' + id, 'DELETE');
    toast('Done'); show();
  } catch { toast('Action failed. Try again.', true); }
});
document.addEventListener('change', async e => {
  if (e.target.dataset.role) { try { await api('/users/' + e.target.dataset.role, 'PATCH', { role: e.target.value }); toast('Role updated'); } catch { toast('Failed', true); } }
});
init();
