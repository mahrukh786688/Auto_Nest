const me = Session.get(); let riders = [];
async function load() {
  if (!me || me.role !== 'customer') { $('#list').innerHTML = '<div class="panel empty">Log in as a customer to see your orders.</div>'; return; }
  try {
    const s = $('#fStatus').value;
    const [orders, rs, u] = await Promise.all([api(`/orders?customerId=${me.id}&_sort=id&_order=desc${s ? '&status=' + encodeURIComponent(s) : ''}`), api('/users?role=rider'), api('/users/' + me.id)]);
    riders = rs;
    $('#credit').innerHTML = u.workshopStatus === 'approved' ? `<div class="panel" style="margin-bottom:1rem">Workshop credit: <b>${fmt(u.creditLimit - u.creditUsed)}</b> available of ${fmt(u.creditLimit)}</div>` : u.workshopStatus === 'pending' ? '<div class="panel" style="margin-bottom:1rem">Workshop application: <span class="tag warn">Pending review</span></div>' : u.workshopStatus === 'rejected' ? '<div class="panel" style="margin-bottom:1rem">Workshop application: <span class="tag bad">Rejected</span></div>' : '';
    $('#list').innerHTML = orders.length ? orders.map(render).join('') : '<div class="panel empty">No orders yet. <a href="index.html">Browse parts</a></div>';
  } catch { $('#list').innerHTML = '<p class="empty">Could not load orders. Is the API running?</p>'; }
}
function render(o) {
  const rider = riders.find(r => r.id === o.riderId);
  const canCancel = ['Pending Approval', 'Approved'].includes(o.status);
  return `<article class="panel order"><div class="head"><h3>Order #${o.id} ${statusTag(o.status)} ${o.orderType === 'workshop' ? '<span class="tag info">Workshop</span>' : ''}</h3><b>${fmt(o.total)}</b></div>
  <p class="hint">${new Date(o.createdAt).toLocaleString()} &middot; ${esc(o.address)}</p>${timeline(o)}
  <ul>${o.items.map(i => `<li>${esc(i.name)} &times; ${i.qty} &mdash; ${fmt(i.price * i.qty)}</li>`).join('')}</ul>
  ${rider ? `<p>Rider: <b>${esc(rider.name)}</b> (${esc(rider.phone)})</p>` : ''}
  ${o.rejectReason ? `<p class="err">Rejected: ${esc(o.rejectReason)}</p>` : ''}${o.failReason ? `<p class="err">Delivery failed: ${esc(o.failReason)}</p>` : ''}${o.disputeReason ? `<p>Your dispute: ${esc(o.disputeReason)}</p>` : ''}${o.resolution ? `<p>Resolution: ${esc(o.resolution)}</p>` : ''}
  <div class="row">${canCancel ? `<button class="btn danger sm" data-cancel="${o.id}">Cancel order</button>` : ''}
  ${o.status === 'Delivered' ? `<button class="btn ok sm" data-confirm="${o.id}">Confirm delivery</button><button class="btn sec sm" data-dispute="${o.id}">Report a problem</button>` : ''}</div>
  <div id="d${o.id}" hidden class="field" style="margin-top:.6rem"><label for="r${o.id}">What went wrong?</label><textarea id="r${o.id}" rows="2"></textarea><div class="err"></div><button class="btn sm" data-send="${o.id}">Send dispute</button></div></article>`;
}
document.addEventListener('click', async e => {
  const d = e.target.dataset; if (!d) return;
  try {
    if (d.cancel && confirm('Cancel this order?')) { const o = await api('/orders/' + d.cancel); await releaseOrder(o); await setStatus(o, 'Cancelled'); toast('Order cancelled'); load(); }
    if (d.confirm) { await setStatus(await api('/orders/' + d.confirm), 'Confirmed'); toast('Delivery confirmed'); load(); }
    if (d.dispute) { const b = $('#d' + d.dispute); b.hidden = !b.hidden; }
    if (d.send) {
      const t = $('#r' + d.send); if (t.value.trim().length < 10) { t.classList.add('invalid'); t.parentElement.querySelector('.err').textContent = 'Please describe the problem (10+ characters)'; return; }
      await setStatus(await api('/orders/' + d.send), 'Disputed', { disputeReason: t.value.trim() }); toast('Dispute sent to the Store Manager'); load();
    }
  } catch { toast('Action failed. Try again.', true); }
});
(async () => {
  $('#fStatus').insertAdjacentHTML('beforeend', ['Pending Approval', 'Approved', 'Packed', 'Out for Delivery', 'Delivered', 'Confirmed', 'Disputed', 'Cancelled', 'Rejected', 'Failed'].map(s => `<option>${s}</option>`).join(''));
  $('#fStatus').onchange = load; load();
})();
