/* Shared helpers: API layer, session, header, toast, login/register modal */
const API = 'http://localhost:3000';
const STATUS_FLOW = ['Pending Approval','Approved','Packed','Out for Delivery','Arrived','Delivered','Confirmed'];
const fmt = n => 'Rs ' + Number(n).toLocaleString('en-PK');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = (s, r = document) => r.querySelector(s);

async function req(path, method = 'GET', body) {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('Server error ' + r.status);
  r.data = await r.json();
  return r;
}
const api = async (...a) => (await req(...a)).data;

const Session = {
  get: () => JSON.parse(localStorage.getItem('an_user') || 'null'),
  set: u => localStorage.setItem('an_user', JSON.stringify(u)),
  clear: () => localStorage.removeItem('an_user')
};
const Cart = {
  get: () => JSON.parse(localStorage.getItem('an_cart') || '[]'),
  set: c => { localStorage.setItem('an_cart', JSON.stringify(c)); renderHeader(); },
  add(p, qty = 1) {
    const c = this.get(), l = c.find(i => i.productId === p.id);
    if (l) l.qty = Math.min(l.qty + qty, p.stock); else c.push({ productId: p.id, name: p.name, price: p.price, qty, stock: p.stock, icon: p.icon });
    this.set(c);
  },
  count: () => Cart.get().reduce((s, i) => s + i.qty, 0)
};

function toast(msg, bad = false) {
  let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.className = bad ? 'bad' : ''; t.style.display = 'block';
  clearTimeout(t._t); t._t = setTimeout(() => t.style.display = 'none', 3200);
}

function renderHeader() {
  const u = Session.get(), page = location.pathname.split('/').pop() || 'index.html';
  const link = (href, txt) => `<a href="${href}" class="${page === href ? 'active' : ''}">${txt}</a>`;
  let nav = link('index.html', 'Catalog') + link('checkout.html', `Cart <span class="badge">${Cart.count()}</span>`);
  if (u && u.role === 'customer') nav += link('orders.html', 'My orders');
  if (u && u.role !== 'customer') nav += link('staff.html', 'Console');
  nav += u ? `<button id="btnLogout">Log out (${esc(u.name.split(' ')[0])})</button>` : `<button id="btnLogin">Log in</button>`;
  $('#site-header').innerHTML = `<header class="site"><div class="bar"><a class="brand" href="index.html">Auto<b>Nest</b></a><nav class="main" aria-label="Main">${nav}</nav></div></header>`;
  $('#btnLogin')?.addEventListener('click', openAuth);
  $('#btnLogout')?.addEventListener('click', () => { Session.clear(); toast('Logged out'); setTimeout(() => location.href = 'index.html', 400); });
}

/* ---------- Validation ---------- */
const V = {
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Enter a valid email like name@example.com',
  phone: v => /^03\d{2}-\d{7}$/.test(v) || 'Use the format 03XX-XXXXXXX',
  cnic: v => /^\d{5}-\d{7}-\d$/.test(v) || 'Use the format 12345-1234567-1',
  pass: v => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v) || 'At least 8 characters with a letter and a number',
  name: v => v.trim().length >= 3 || 'Enter at least 3 characters',
  req: v => v.trim().length > 0 || 'This field is required'
};
function check(input, rule) {
  const r = rule(input.value), err = input.parentElement.querySelector('.err');
  input.classList.toggle('invalid', r !== true); input.setAttribute('aria-invalid', r !== true);
  if (err) err.textContent = r === true ? '' : r; return r === true;
}

/* ---------- Login / Register modal ---------- */
function openAuth() {
  let m = $('#authModal');
  if (!m) {
    m = document.createElement('div'); m.id = 'authModal'; m.className = 'modal';
    m.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-labelledby="authTitle">
      <div class="tabs"><button class="on" data-t="login" type="button">Log in</button><button data-t="reg" type="button">Register</button></div>
      <form id="loginForm" novalidate><h2 id="authTitle">Log in</h2>
        <div class="field"><label for="lEmail">Email</label><input id="lEmail" type="email" autocomplete="username"><div class="err"></div></div>
        <div class="field"><label for="lPass">Password</label><input id="lPass" type="password" autocomplete="current-password"><div class="err"></div></div>
        <p class="hint">Demo: customer@autonest.pk / Pass@123 (also workshop, manager, warehouse, rider, admin @autonest.pk)</p>
        <div class="row"><button class="btn" type="submit">Log in</button><button class="btn sec" type="button" data-close>Cancel</button></div></form>
      <form id="regForm" novalidate hidden><h2>Create account</h2>
        <div class="field"><label for="rName">Full name</label><input id="rName"><div class="err"></div></div>
        <div class="field"><label for="rEmail">Email</label><input id="rEmail" type="email"><div class="err"></div></div>
        <div class="field"><label for="rCnic">CNIC</label><input id="rCnic" placeholder="12345-1234567-1"><div class="err"></div></div>
        <div class="field"><label for="rPhone">Phone</label><input id="rPhone" placeholder="03XX-XXXXXXX"><div class="err"></div></div>
        <div class="field"><label for="rAddr">Delivery address</label><input id="rAddr"><div class="err"></div></div>
        <div class="field"><label for="rPass">Password</label><input id="rPass" type="password" autocomplete="new-password"><div class="err"></div></div>
        <div class="field"><label><input id="rWork" type="checkbox" style="width:auto;min-height:0"> I am a workshop or mechanic (apply for trade pricing)</label></div>
        <div class="row"><button class="btn" type="submit">Register</button><button class="btn sec" type="button" data-close>Cancel</button></div></form></div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if (e.target === m || e.target.dataset.close !== undefined) m.classList.remove('open'); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') m.classList.remove('open'); });
    m.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
      m.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
      $('#loginForm').hidden = b.dataset.t !== 'login'; $('#regForm').hidden = b.dataset.t !== 'reg';
    });
    $('#loginForm').onsubmit = async e => {
      e.preventDefault();
      const ok = [check($('#lEmail'), V.email), check($('#lPass'), V.req)].every(Boolean); if (!ok) return;
      try {
        const users = await api(`/users?email=${encodeURIComponent($('#lEmail').value.trim())}`);
        const u = users[0];
        if (!u || u.password !== $('#lPass').value) return toast('Wrong email or password', true);
        const { password, ...safe } = u; Session.set(safe); toast('Welcome, ' + u.name);
        setTimeout(() => location.href = u.role === 'customer' ? location.pathname.split('/').pop() || 'index.html' : 'staff.html', 500);
      } catch (x) { toast('Cannot reach the API. Is json-server running?', true); }
    };
    $('#regForm').onsubmit = async e => {
      e.preventDefault();
      const ok = [check($('#rName'), V.name), check($('#rEmail'), V.email), check($('#rCnic'), V.cnic), check($('#rPhone'), V.phone), check($('#rAddr'), v => v.trim().length >= 10 || 'Enter the full address (10+ characters)'), check($('#rPass'), V.pass)].every(Boolean);
      if (!ok) return;
      try {
        if ((await api(`/users?email=${encodeURIComponent($('#rEmail').value.trim())}`)).length) { $('#rEmail').classList.add('invalid'); return toast('Email already registered', true); }
        if ((await api(`/users?cnic=${$('#rCnic').value}`)).length) { $('#rCnic').classList.add('invalid'); return toast('CNIC already registered', true); }
        const body = { name: $('#rName').value.trim(), email: $('#rEmail').value.trim(), password: $('#rPass').value, role: 'customer', phone: $('#rPhone').value, cnic: $('#rCnic').value, address: $('#rAddr').value.trim(), accountType: 'retail', workshopStatus: $('#rWork').checked ? 'pending' : 'none', creditLimit: 0, creditUsed: 0 };
        const u = await api('/users', 'POST', body); const { password, ...safe } = u; Session.set(safe);
        toast('Account created'); setTimeout(() => location.reload(), 500);
      } catch (x) { toast('Registration failed. Is json-server running?', true); }
    };
  }
  m.classList.add('open'); $('#lEmail').focus();
}

/* attach live validation helper for forms */
function live(pairs) { pairs.forEach(([el, rule]) => { el.addEventListener('blur', () => check(el, rule)); el.addEventListener('input', () => el.classList.contains('invalid') && check(el, rule)); }); }

function statusTag(s) {
  const c = { 'Pending Approval': 'warn', Approved: 'info', Packed: 'info', 'Out for Delivery': 'info', Arrived: 'info', Delivered: 'ok', Confirmed: 'ok', Cancelled: 'bad', Rejected: 'bad', Failed: 'bad', Disputed: 'warn', Resolved: 'ok' }[s] || 'info';
  return `<span class="tag ${c}">${esc(s)}</span>`;
}
function timeline(o) {
  const idx = STATUS_FLOW.indexOf(o.status);
  const steps = o.orderType === 'workshop' ? STATUS_FLOW : STATUS_FLOW.slice(1);
  if (idx < 0) return `<div class="timeline"><span class="now">${esc(o.status)}</span>${o.failReason ? `<span>${esc(o.failReason)}</span>` : ''}</div>`;
  return `<div class="timeline">${steps.map(s => `<span class="${STATUS_FLOW.indexOf(s) < idx ? 'done' : s === o.status ? 'now' : ''}">${s}</span>`).join('')}</div>`;
}
async function setStatus(o, status, extra = {}) {
  const history = [...(o.history || []), { status, at: new Date().toISOString(), by: (Session.get() || {}).role }];
  return api('/orders/' + o.id, 'PATCH', { status, history, ...extra });
}
/* restore stock/credit when an order is cancelled or rejected */
async function releaseOrder(o) {
  for (const it of o.items) { const p = await api('/products/' + it.productId); await api('/products/' + it.productId, 'PATCH', { stock: p.stock + it.qty }); }
  if (o.orderType === 'workshop') { const c = await api('/users/' + o.customerId); await api('/users/' + o.customerId, 'PATCH', { creditUsed: Math.max(0, c.creditUsed - o.total) }); }
}
document.addEventListener('DOMContentLoaded', () => { if ($('#site-header')) renderHeader(); });
