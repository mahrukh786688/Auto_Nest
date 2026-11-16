const id = new URLSearchParams(location.search).get('id');
(async () => {
  try {
    const [p, vehicles] = await Promise.all([api('/products/' + id), api('/vehicles')]);
    const stock = p.stock === 0 ? '<span class="tag bad">Out of stock</span>' : `<span class="tag ok">${p.stock} in stock</span>`;
    $('#detail').innerHTML = `<div class="panel"><div class="pic" style="font-size:6rem;text-align:center;background:var(--slate2);padding:1.5rem;border-bottom:4px solid var(--amber)" aria-hidden="true">${p.icon}</div></div>
    <div><span class="pno">${esc(p.partNo)} &middot; ${esc(p.brand)} &middot; ${esc(p.category)}</span><h1>${esc(p.name)}</h1><p>${esc(p.description)}</p>
    <p class="price" style="font-size:2rem">${fmt(p.price)}</p><p>${stock}</p>
    <div class="panel" style="margin:1rem 0"><h3>Does this fit my car?</h3>
      <div class="row"><div style="flex:1;min-width:120px"><label for="cMake">Make</label><select id="cMake"><option value="">Select</option>${vehicles.map(v => `<option>${esc(v.make)}</option>`).join('')}</select></div>
      <div style="flex:1;min-width:120px"><label for="cModel">Model</label><select id="cModel" disabled><option value="">Select make first</option></select></div>
      <div style="width:100px"><label for="cYear">Year</label><input id="cYear" type="number" min="1990" max="2026" placeholder="2015"></div></div>
      <div class="err" id="fitErr"></div><p id="fitResult" role="status"></p><button class="btn sec sm" id="checkFit" type="button">Check fitment</button></div>
    <div class="row"><div style="width:110px"><label for="qty">Quantity</label><input id="qty" type="number" min="1" value="1"></div>
    <button class="btn" id="add" style="align-self:end" ${p.stock === 0 ? 'disabled' : ''}>Add to cart</button></div><div class="err" id="qtyErr"></div></div>`;
    $('#cMake').onchange = () => {
      const v = vehicles.find(x => x.make === $('#cMake').value);
      $('#cModel').disabled = !v; $('#cModel').innerHTML = v ? v.models.map(m => `<option>${esc(m)}</option>`).join('') : '<option value="">Select make first</option>';
    };
    $('#checkFit').onclick = () => {
      const mk = $('#cMake').value, mo = $('#cModel').value, yr = +$('#cYear').value;
      $('#fitErr').textContent = ''; $('#fitResult').textContent = '';
      if (!mk || !mo || !yr) return $('#fitErr').textContent = 'Choose make, model and year first';
      if (yr < 1990 || yr > 2026) return $('#fitErr').textContent = 'Year must be between 1990 and 2026';
      const ok = p.fitment.some(f => f.make === mk && f.model === mo && yr >= f.yearFrom && yr <= f.yearTo);
      $('#fitResult').innerHTML = ok ? `<span class="tag ok">Fits your ${yr} ${esc(mk)} ${esc(mo)}</span>` : `<span class="tag bad">Not listed for a ${yr} ${esc(mk)} ${esc(mo)}</span>`;
    };
    $('#add').onclick = () => {
      const q = +$('#qty').value;
      if (!Number.isInteger(q) || q < 1) return $('#qtyErr').textContent = 'Enter a whole number of 1 or more';
      if (q > p.stock) return $('#qtyErr').textContent = `Only ${p.stock} available`;
      $('#qtyErr').textContent = ''; Cart.add(p, q); toast('Added to cart');
    };
    document.title = p.name + ' | AutoNest';
  } catch (e) { $('#detail').innerHTML = '<p class="empty">Part not found, or the API is not running.</p>'; }
})();
