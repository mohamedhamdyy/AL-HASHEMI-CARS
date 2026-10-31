(function () {
  var S = window.SITE, $ = function (id) { return document.getElementById(id); };
  var wa = (S.whatsapp || '').trim();
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ----- ستايل معرض الصور (مضاف من هنا، مش محتاج تعديل theme.css) -----
  var st = document.createElement('style');
  st.textContent =
    '.photo{position:relative}' +
    '.gal{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none;width:100%;height:100%}' +
    '.gal::-webkit-scrollbar{display:none}' +
    '.gal img{flex:0 0 100%;width:100%;height:100%;object-fit:cover;scroll-snap-align:center;display:block}' +
    '.gcount{position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,.6);color:#fff;font:600 12px/1 "IBM Plex Mono",monospace;padding:5px 8px;border-radius:999px;pointer-events:none}';
  document.head.appendChild(st);

  // ----- بيانات الصفحة -----
  document.title = S.brand;
  $('plate').textContent = S.plate; $('brand').textContent = S.brand;
  $('eyebrow').textContent = S.eyebrow; $('title').textContent = S.title; $('text').textContent = S.text;
  $('f-brand').textContent = S.brand; $('f-brand2').textContent = S.brand; $('f-text').textContent = S.footer;
  $('f-addr').textContent = S.address || ''; $('yr').textContent = new Date().getFullYear();
  if (S.phone) { $('call').href = 'tel:' + S.phone; $('f-phone').href = 'tel:' + S.phone; $('f-phone').textContent = S.phone; } else { $('call').hidden = true; }
  if (wa) {
    $('wa-top').href = 'https://wa.me/' + wa; $('wa-float').href = 'https://wa.me/' + wa;
    $('wa-hero').href = 'https://wa.me/' + wa + '?text=' + encodeURIComponent('السلام عليكم، عايز أستفسر عن السيارات المتاحة');
  } else { $('wa-top').hidden = $('wa-hero').hidden = $('wa-float').hidden = true; }

  // ----- CSV -----
  function parseCSV(t) {
    var rows = [], row = [], f = '', q = false, i, c;
    t = t.replace(/^﻿/, '');
    for (i = 0; i < t.length; i++) {
      c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c !== '\r') f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  var T = { sale: ['بيع', 'للبيع', 'sale'], rent: ['إيجار', 'ايجار', 'للإيجار', 'للايجار', 'rent'] };
  function typeOf(v) { v = (v || '').trim().toLowerCase(); return T.rent.indexOf(v) > -1 ? 'rent' : 'sale'; }
  function statusOf(v) { v = (v || '').trim().toLowerCase(); if (['تم البيع', 'تم الايجار', 'تم الإيجار', 'sold'].indexOf(v) > -1) return 'sold'; if (['محجوزة', 'محجوز', 'reserved'].indexOf(v) > -1) return 'reserved'; return 'available'; }
  function imgUrl(v) {
    v = (v || '').trim(); if (!v) return '';
    var m = v.match(/drive\.google\.com\/file\/d\/([\w-]+)/) || v.match(/drive\.google\.com\/.*[?&]id=([\w-]+)/);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w900';
    return v;
  }
  // يجمع الصورة الرئيسية + عمود images (مصفوفة أو نص مفصول بفاصلة/سطر) بدون تكرار
  function imgList(main, extra) {
    var list = [];
    if (main) list.push(main);
    if (Array.isArray(extra)) list = list.concat(extra);
    else if (typeof extra === 'string' && extra.trim()) list = list.concat(extra.replace(/^\{|\}$/g, '').split(/[\n,]+/));
    var seen = {}, out = [];
    list.forEach(function (u) {
      u = imgUrl(String(u || '').replace(/^"|"$/g, '').trim());
      if (u && !seen[u]) { seen[u] = 1; out.push(u); }
    });
    return out;
  }
  function toCars(rows) {
    var out = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i]; if (!r || !(r[2] || '').trim()) continue;
      var show = (r[0] || '').trim().toLowerCase();
      if (['لا', 'no', 'n', 'مخفي', 'hide'].indexOf(show) > -1) continue;
      out.push({ type: typeOf(r[1]), name: r[2].trim(), year: (r[3] || '').trim(), km: (r[4] || '').replace(/[^\d]/g, ''), price: (r[5] || '').trim(), note: (r[6] || '').trim(), status: statusOf(r[7]), images: imgList(r[8], r[9]) });
    }
    return out;
  }

  // ----- عرض الكروت -----
  function odo(km) {
    if (!km) return '';
    var p = ('000000' + km).slice(-6), seen = false, h = '';
    for (var i = 0; i < 6; i++) { var ch = p[i]; if (ch !== '0') seen = true; h += '<i class="' + (seen ? '' : 'dim') + '">' + ch + '</i>'; }
    return '<div class="odo" dir="ltr" aria-label="' + esc(km) + ' كم">' + h + '<small>كم</small></div>';
  }
  function gallery(c) {
    var n = c.images.length;
    if (!n) return '<div class="ph" aria-hidden="true">🚗</div>';
    if (n === 1) return '<img src="' + esc(c.images[0]) + '" alt="' + esc(c.name) + '" loading="lazy" width="900" height="600" referrerpolicy="no-referrer">';
    return '<div class="gal" dir="ltr">' + c.images.map(function (u, i) {
      return '<img src="' + esc(u) + '" alt="' + esc(c.name) + ' ' + (i + 1) + '" loading="lazy" referrerpolicy="no-referrer">';
    }).join('') + '</div><span class="gcount" dir="ltr">1/' + n + '</span>';
  }
  function card(c) {
    var msg = 'السلام عليكم، مهتم بـ ' + c.name + (c.type === 'rent' ? ' (إيجار)' : ' (بيع)');
    var sold = c.status === 'sold' ? '<span class="ribbon">' + (c.type === 'rent' ? 'مؤجرة' : 'تم البيع') + '</span>' : c.status === 'reserved' ? '<span class="ribbon amber">محجوزة</span>' : '';
    return '<article class="card status-' + c.status + '" data-type="' + c.type + '" data-name="' + esc((c.name + ' ' + c.year).toLowerCase()) + '">' +
      '<div class="photo">' + gallery(c) + '<span class="tag ' + c.type + '">' + (c.type === 'rent' ? 'للإيجار' : 'للبيع') + '</span>' + sold + '</div>' +
      '<div class="body"><h3>' + esc(c.name) + '</h3><div class="meta">' +
      (c.year ? '<span>موديل ' + esc(c.year) + '</span>' : '') + (c.price ? '<span class="price">' + esc(c.price) + '</span>' : '') + '</div>' +
      odo(c.km) + (c.note ? '<p class="note">' + esc(c.note) + '</p>' : '') +
      (wa && c.status !== 'sold' ? '<a class="btn wa block" target="_blank" rel="noopener" href="https://wa.me/' + wa + '?text=' + encodeURIComponent(msg) + '">اسأل عنها واتساب</a>' : '') +
      '</div></article>';
  }

  // ----- فلترة وبحث -----
  var grid = $('car-grid'), filter = 'all', input = $('car-search'), empty = $('car-empty'), cards = [];
  function apply() {
    var q = (input.value || '').trim().toLowerCase(), shown = 0;
    cards.forEach(function (x) {
      var ok = (filter === 'all' || x.dataset.type === filter) && (!q || x.dataset.name.indexOf(q) > -1);
      x.hidden = !ok; if (ok) shown++;
    });
    empty.hidden = shown > 0;
  }
  function render(cars) {
    grid.innerHTML = cars.map(card).join('');
    cards = [].slice.call(grid.querySelectorAll('.card'));
    var c = { all: cars.length, sale: 0, rent: 0 };
    cars.forEach(function (x) { c[x.type]++; });
    document.querySelectorAll('[data-count]').forEach(function (b) { b.textContent = c[b.dataset.count] || 0; });
    apply();
  }
  var chips = [].slice.call(document.querySelectorAll('.chip'));
  chips.forEach(function (ch) { ch.addEventListener('click', function () { filter = ch.dataset.filter; chips.forEach(function (c) { c.classList.toggle('is-on', c === ch); }); apply(); }); });
  input.addEventListener('input', apply);

  // عدّاد الصور (1/3) أثناء السحب
  grid.addEventListener('scroll', function (e) {
    var g = e.target;
    if (!g.classList || !g.classList.contains('gal')) return;
    var i = Math.round(Math.abs(g.scrollLeft) / g.clientWidth) + 1, cnt = g.parentNode.querySelector('.gcount');
    if (cnt) cnt.textContent = i + '/' + g.children.length;
  }, true);

  // ----- تحميل -----
  function load(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (t) { return toCars(parseCSV(t)); }); }
  function loadSupabase() {
    var base = S.supabaseUrl.replace(/\/$/, '');
    var key = String(S.supabaseKey).trim(), h = { apikey: key };
    if (key.indexOf('eyJ') === 0) h.Authorization = 'Bearer ' + key;
    return fetch(base + '/rest/v1/cars?select=*&visible=eq.true&order=sort.asc,id.asc', { headers: h, cache: 'no-store' })
      .then(function (r) { if (!r.ok) { return r.text().then(function (t) { throw new Error(r.status + ' ' + t); }); } return r.json(); })
      .then(function (rows) {
        return rows.map(function (r) {
          return { type: r.type === 'rent' ? 'rent' : 'sale', name: r.name || '', year: r.year || '', km: r.km ? String(r.km) : '', price: r.price || '', note: r.note || '', status: ['sold', 'reserved'].indexOf(r.status) > -1 ? r.status : 'available', images: imgList(r.image, r.images) };
        });
      });
  }
  var first = (S.supabaseUrl && S.supabaseKey) ? loadSupabase().catch(function (e) { window.__sbError = String(e && e.message || e); if (window.console) console.error('Supabase:', window.__sbError); return load('cars.csv'); }) : S.sheetCsvUrl ? load(S.sheetCsvUrl).catch(function () { return load('cars.csv'); }) : load('cars.csv');
  first.then(render).catch(function () { empty.textContent = 'تعذّر تحميل السيارات. حدّث الصفحة.'; empty.hidden = false; });
})();
