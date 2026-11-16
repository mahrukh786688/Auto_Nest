let user = Session.get(), fresh = {};
async function render() {
  const cart = Cart.get(), box = $('#cart');
  if (!cart.length) { box.innerHTML = '<div class="panel empty">Your cart is empty. <a href="index.html">Browse parts</a></div>'; $('#place').disabled = true; $('#total').textContent = fmt(0); return; }
  try { const ps = await api('/products?' + cart.map(i => 'id=' + i.productId).join('&')); ps.forEach(p => fresh[p.id] = p); } catch { toast('Cannot refresh stock. Is the API running?', true); }
  let bad = false;
  box.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Part</th><th>Price</th><th>Qty</th><th>Subtotal</th><th><span class="sr" style="position:absolute;left:-9999px">Remove</span></th></tr></thead><tbody>` + cart.map(i => {
    const st = fresh[i.productId] ? fresh[i.productId].stock : i.stock, over = i.qty > st; bad = bad || over;
    return `<tr><td>${i.icon || ''} ${esc(i.name)}${over ? `<div class="err">Only ${st} in stock</div>` : ''}</td><td>${fmt(i.price)}</td>
    <td><input type="number" min="1" max="${st}" value="${i.qty}" data-q="${i.productId}" aria-label="Quantity for ${esc(i.name)}" style="width:80px"></td>
    <td>${fmt(i.price * i.qty)}</td><td><button class="btn danger sm" data-rm="${i.productId}" aria-label="Remove ${esc(i.name)}">Remove</button></td></tr>`;
  }).join('') + '</tbody></table></div>';
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  $('#total').textContent = fmt(total); $('#place').disabled = bad;
}
function setup() {
  if (user && user.role === 'customer') {
    $('#oAddr').value = user.address || ''; $('#oPhone').value = user.phone || '';
    if (user.workshopStatus === 'approved') {
      $('#oType').insertAdjacentHTML('beforeend', '<option value="workshop">Workshop (trade price, needs approval)</option>');
      $('#typeHint').textContent = `Credit available: ${fmt(user.creditLimit - user.creditUsed)}`;
    } else if (user.workshopStatus === 'pending') $('#typeHint').textContent = 'Your workshop application is waiting for approval.';
  }
  live([[$('#oAddr'), v => v.trim().length >= 10 || 'Enter the full address (10+ characters)'], [$('#oPhone'), V.phone], [$('#oPay'), v => !!v || 'Choose a payment method']]);
  $('#orderForm').onsubmit = place;
}
document.addEventListener('click', e => {
  const c = Cart.get();
  if (e.target.dataset.rm) { Cart.set(c.filter(i => i.productId != e.target.dataset.rm)); render(); }
});
document.addEventListener('change', e => {
  if (e.target.dataset.q) {
    const c = Cart.get(), l = c.find(i => i.productId == e.target.dataset.q), v = parseInt(e.target.value, 10);
    l.qty = Number.isInteger(v) && v > 0 ? v : 1; Cart.set(c); render();
  }
});
async function place(e) {
  e.preventDefault();
  if (!user) { toast('Log in to place an order', true); return openAuth(); }
  if (user.role !== 'customer') return toast('Only customers can place orders', true);
  if (![check($('#oAddr'), v => v.trim().length >= 10 || 'Enter the full address (10+ characters)'), check($('#oPhone'), V.phone), check($('#oPay'), v => !!v || 'Choose a payment method')].every(Boolean)) return;
  const cart = Cart.get(), total = cart.reduce((s, i) => s + i.price * i.qty, 0), type = $('#oType').value;
  $('#place').disabled = true;
  try {
    const ps = await api('/products?' + cart.map(i => 'id=' + i.productId).join('&'));
    for (const i of cart) { const p = ps.find(x => x.id === i.productId); if (!p || p.stock < i.qty) { toast(`${i.name}: not enough stock`, true); await render(); return; } }
    let discount = 0;
    if (type === 'workshop') {
      const u = await api('/users/' + user.id), left = u.creditLimit - u.creditUsed;
      if (total > left) { toast(`Over your credit limit. Available: ${fmt(left)}`, true); $('#place').disabled = false; return; }
      await api('/users/' + user.id, 'PATCH', { creditUsed: u.creditUsed + total });
    }
    const now = new Date().toISOString(), status = type === 'workshop' ? 'Pending Approval' : 'Approved';
    await api('/orders', 'POST', { customerId: user.id, items: cart.map(({ productId, name, price, qty }) => ({ productId, name, price, qty })), total, orderType: type, status, address: $('#oAddr').value.trim(), phone: $('#oPhone').value, payment: $('#oPay').value, note: $('#oNote').value.trim(), riderId: null, createdAt: now, history: [{ status: 'Placed', at: now }, { status, at: now }] });
    for (const i of cart) { const p = ps.find(x => x.id === i.productId); await api('/products/' + p.id, 'PATCH', { stock: p.stock - i.qty }); }
    Cart.set([]); toast('Order placed'); setTimeout(() => location.href = 'orders.html', 700);
  } catch (x) { toast('Could not place order. Try again.', true); $('#place').disabled = false; }
}
setup(); render();
