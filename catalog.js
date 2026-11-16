const LIMIT = 8; let page = 1;
async function init() {
  try {
    const [vehicles, cats, all] = await Promise.all([api('/vehicles'), api('/categories'), api('/products')]);
    $('#fMake').insertAdjacentHTML('beforeend', vehicles.map(v => `<option>${esc(v.make)}</option>`).join(''));
    $('#fCat').insertAdjacentHTML('beforeend', cats.map(c => `<option>${esc(c.name)}</option>`).join(''));
    $('#fBrand').insertAdjacentHTML('beforeend', [...new Set(all.map(p => p.brand))].sort().map(b => `<option>${esc(b)}</option>`).join(''));
  } catch (e) { $('#grid').innerHTML = '<p class="empty">Cannot reach the API. Start it with <code>npm run api</code>.</p>'; return; }
  let t; $('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { page = 1; load(); }, 300); });
  ['fMake', 'fCat', 'fBrand', 'fSort'].forEach(id => $('#' + id).addEventListener('change', () => { page = 1; load(); }));
  $('#fPrice').addEventListener('input', () => {
    const v = $('#fPrice').value; $('#priceErr').textContent = v !== '' && Number(v) < 0 ? 'Price cannot be negative' : '';
    if (!$('#priceErr').textContent) { page = 1; load(); }
  });
  $('#reset').onclick = () => { ['q', 'fMake', 'fCat', 'fBrand', 'fPrice'].forEach(id => $('#' + id).value = ''); $('#fSort').value = 'id|asc'; page = 1; load(); };
  load();
}
async function load() {
  const [s, o] = $('#fSort').value.split('|'), p = new URLSearchParams({ _page: page, _limit: LIMIT, _sort: s, _order: o });
  if ($('#q').value.trim()) p.set('q', $('#q').value.trim());
  if ($('#fMake').value) p.set('makes_like', $('#fMake').value);
  if ($('#fCat').value) p.set('category', $('#fCat').value);
  if ($('#fBrand').value) p.set('brand', $('#fBrand').value);
  if ($('#fPrice').value) p.set('price_lte', $('#fPrice').value);
  try {
    const r = await req('/products?' + p), total = +r.headers.get('X-Total-Count');
    $('#count').textContent = total + ' part' + (total === 1 ? '' : 's') + ' found';
    $('#grid').innerHTML = r.data.length ? r.data.map(card).join('') : '<p class="empty">No parts match these filters. Try clearing one.</p>';
    const pages = Math.ceil(total / LIMIT);
    $('#pager').innerHTML = pages > 1 ? Array.from({ length: pages }, (_, i) => `<button class="btn ${i + 1 === page ? '' : 'sec'} sm" data-p="${i + 1}" aria-label="Page ${i + 1}">${i + 1}</button>`).join('') : '';
  } catch (e) { $('#grid').innerHTML = '<p class="empty">Could not load parts.</p>'; }
}
const card = p => `<article class="part"><div class="pic" aria-hidden="true">${p.icon}</div><div class="body">
  <span class="pno">${esc(p.partNo)} &middot; ${esc(p.brand)}</span><h3><a href="product.html?id=${p.id}">${esc(p.name)}</a></h3>
  <span class="price">${fmt(p.price)}</span>
  <span>${p.stock === 0 ? '<span class="tag bad">Out of stock</span>' : p.stock <= 10 ? `<span class="tag warn">Only ${p.stock} left</span>` : '<span class="tag ok">In stock</span>'}</span>
  <div style="margin-top:auto;padding-top:.5rem" class="row"><a class="btn sec sm" href="product.html?id=${p.id}">Details</a><button class="btn sm" data-add="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>Add to cart</button></div></div></article>`;
document.addEventListener('click', async e => {
  if (e.target.dataset.p) { page = +e.target.dataset.p; load(); scrollTo({ top: 0 }); }
  if (e.target.dataset.add) { try { Cart.add(await api('/products/' + e.target.dataset.add)); toast('Added to cart'); } catch { toast('Could not add item', true); } }
});
init();
