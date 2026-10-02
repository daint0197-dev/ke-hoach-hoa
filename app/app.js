/* Kế Hoạch Hoá — logic ứng dụng (không cần thư viện ngoài) */
(function () {
  'use strict';

  // ---------- tiện ích ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const dLabel = (s) => { const d = parse(s); return `${WD[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`; };
  const dRange = (a, b) => { const A = parse(a), B = parse(b); const f = (d) => `${d.getDate()}/${d.getMonth() + 1}`; return `${f(A)} – ${f(B)}/${B.getFullYear()}`; };

  const CURRENCIES = [
    ['VND', 'Việt Nam Đồng', '🇻🇳', 0], ['USD', 'Đô la Mỹ', '🇺🇸', 2], ['EUR', 'Euro', '🇪🇺', 2], ['JPY', 'Yên Nhật', '🇯🇵', 0],
    ['KRW', 'Won Hàn Quốc', '🇰🇷', 0], ['CNY', 'Nhân dân tệ', '🇨🇳', 2], ['THB', 'Baht Thái', '🇹🇭', 2], ['SGD', 'Đô la Singapore', '🇸🇬', 2],
    ['MYR', 'Ringgit Malaysia', '🇲🇾', 2], ['TWD', 'Đô la Đài Loan', '🇹🇼', 0], ['HKD', 'Đô la Hồng Kông', '🇭🇰', 2], ['AUD', 'Đô la Úc', '🇦🇺', 2],
    ['GBP', 'Bảng Anh', '🇬🇧', 2], ['LAK', 'Kíp Lào', '🇱🇦', 0], ['KHR', 'Riel Campuchia', '🇰🇭', 0],
  ].map(([c, n, f, d]) => ({ c, n, f, d }));
  const CUR = Object.fromEntries(CURRENCIES.map((x) => [x.c, x]));
  const dec = (c) => (CUR[c] ? CUR[c].d : 2);
  const money = (n, c = 'VND') => {
    try { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: c, maximumFractionDigits: dec(c), minimumFractionDigits: 0 }).format(n || 0); }
    catch { return (n || 0).toLocaleString('vi-VN') + ' ' + c; }
  };
  const short = (n, c = 'VND') => {
    n = n || 0;
    if (c !== 'VND') return money(n, c);
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tỷ';
    if (a >= 1e6) return (n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr';
    if (a >= 1e3) return Math.round(n / 1e3).toLocaleString('vi-VN') + 'k';
    return Math.round(n).toLocaleString('vi-VN') + '₫';
  };

  const CATS = [
    { k: 'move', n: 'Di chuyển', i: '✈️' }, { k: 'stay', n: 'Lưu trú', i: '🏨' }, { k: 'food', n: 'Ăn uống', i: '🍜' },
    { k: 'fun', n: 'Vui chơi', i: '🎡' }, { k: 'shop', n: 'Mua sắm', i: '🛍️' }, { k: 'work', n: 'Công việc', i: '💼' }, { k: 'other', n: 'Khác', i: '📦' },
  ];
  const CAT = Object.fromEntries(CATS.map((c) => [c.k, c]));
  const catColor = (k) => `var(--c-${k})`;
  const CHECK_TPL = {
    travel: ['CCCD / Hộ chiếu', 'Vé máy bay / tàu xe', 'Xác nhận đặt phòng', 'Sạc điện thoại & cáp', 'Sạc dự phòng', 'Thuốc cá nhân', 'Kem chống nắng', 'Quần áo', 'Đồ bơi'],
    work: ['CCCD / Hộ chiếu', 'Giấy đi đường / Quyết định cử đi công tác', 'Tạm ứng công tác phí', 'Laptop & sạc', 'Tài liệu họp', 'Danh thiếp', 'Trang phục công sở', 'Vé & xác nhận khách sạn'],
  };
  const EMOJIS = ['🏖️', '⛰️', '🏙️', '🌾', '🏝️', '🚗', '✈️', '💼', '🎒', '🏯', '🍜', '❄️'];
  const PROV = Object.fromEntries(window.PROVINCES.map((p) => [p.id, p]));

  // ---------- lưu trữ ----------
  const KEY = 'soChuyenDi.v1';
  const blank = () => ({ v: 1, settings: { currency: 'VND' }, trips: [], visited: {}, ui: { tab: 'home', tripId: null } });
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch { S = blank(); }
  S = Object.assign(blank(), S);
  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Không lưu được: bộ nhớ trình duyệt đầy hoặc bị chặn'); } }, 60);
    requestPersist();
  }
  let persistAsked = false;
  function requestPersist() {
    if (persistAsked || !navigator.storage || !navigator.storage.persist) return;
    persistAsked = true; navigator.storage.persist().catch(() => {});
  }

  // ---------- tỷ giá (open.er-api.com, cập nhật 1 lần/ngày) ----------
  const RKEY = 'soChuyenDi.rates';
  let R; try { R = JSON.parse(localStorage.getItem(RKEY)); } catch { R = null; }
  async function refreshRates(force) {
    if (!force && R && Date.now() - R.fetched < 3 * 3600e3) return;
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
      const j = await res.json();
      if (j.result !== 'success') throw new Error(j['error-type'] || 'lỗi');
      R = { rates: j.rates, updated: j.time_last_update_unix * 1000, fetched: Date.now() };
      try { localStorage.setItem(RKEY, JSON.stringify(R)); } catch {}
      if (force) toast('Đã cập nhật tỷ giá');
      rerender();
    } catch (e) { if (force) toast(R ? 'Không có mạng — đang dùng tỷ giá đã lưu' : 'Chưa lấy được tỷ giá. Kiểm tra kết nối mạng.'); }
  }
  const rate = (from, to) => { if (from === to) return 1; if (!R || !R.rates[from] || !R.rates[to]) return null; return R.rates[to] / R.rates[from]; };
  const rateTime = () => (R ? new Date(R.updated).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : null);

  // ---------- ảnh hoá đơn (IndexedDB) ----------
  const DB = (() => {
    let p;
    const open = () => p || (p = new Promise((ok, no) => {
      const r = indexedDB.open('soChuyenDi', 1);
      r.onupgradeneeded = () => { const s = r.result.createObjectStore('receipts', { keyPath: 'id' }); s.createIndex('trip', 'tripId'); };
      r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
    }));
    const tx = async (mode, fn) => { const db = await open(); return new Promise((ok, no) => { const t = db.transaction('receipts', mode); const st = t.objectStore('receipts'); const out = fn(st); t.oncomplete = () => ok(out && out.result); t.onerror = () => no(t.error); }); };
    return {
      put: (r) => tx('readwrite', (s) => s.put(r)),
      get: (id) => tx('readonly', (s) => s.get(id)),
      del: (id) => tx('readwrite', (s) => s.delete(id)),
      all: () => tx('readonly', (s) => s.getAll()),
      clear: () => tx('readwrite', (s) => s.clear()),
    };
  })();
  let RECEIPTS = [];
  const urls = new Map();
  const imgUrl = (r) => { if (!urls.has(r.id)) urls.set(r.id, URL.createObjectURL(r.blob)); return urls.get(r.id); };
  async function loadReceipts() { try { RECEIPTS = (await DB.all()) || []; } catch { RECEIPTS = []; } }
  async function compress(file) {
    const max = 1600;
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch { bmp = await new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = URL.createObjectURL(file); }); }
    const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((ok) => c.toBlob((b) => ok(b || file), 'image/jpeg', 0.78));
  }
  function pickImage() {
    return new Promise((ok) => {
      const inp = $('#filepick'); inp.value = '';
      inp.onchange = async () => { const f = inp.files[0]; if (!f) return ok(null); toast('Đang xử lý ảnh…'); try { ok(await compress(f)); } catch { toast('Không đọc được ảnh này'); ok(null); } };
      inp.click();
    });
  }
  async function addReceipt(blob, tripId, expenseId) {
    const r = { id: uid(), tripId, expenseId: expenseId || null, blob, status: 'pending', created: Date.now() };
    await DB.put(r); RECEIPTS.push(r); requestPersist(); return r;
  }
  const ST = { pending: 'Chưa nộp', submitted: 'Đã nộp', approved: 'Đã duyệt' };

  // ---------- truy vấn dữ liệu ----------
  const trip = () => S.trips.find((t) => t.id === S.ui.tripId) || null;
  function pickDefaultTrip() {
    if (trip()) return;
    const t0 = today();
    const on = S.trips.find((t) => t.start <= t0 && t.end >= t0);
    const up = S.trips.filter((t) => t.start > t0).sort((a, b) => a.start.localeCompare(b.start))[0];
    const past = S.trips.slice().sort((a, b) => b.end.localeCompare(a.end))[0];
    S.ui.tripId = (on || up || past || {}).id || null;
  }
  const spent = (t) => t.expenses.reduce((s, e) => s + (e.conv || 0), 0);
  const spentCat = (t, k) => t.expenses.filter((e) => e.cat === k).reduce((s, e) => s + (e.conv || 0), 0);
  const tripDays = (t) => diffDays(t.start, t.end) + 1;
  function status(t) {
    const t0 = today();
    if (t0 < t.start) return { k: 'up', n: diffDays(t0, t.start), label: 'ngày nữa' };
    if (t0 > t.end) return { k: 'past', label: 'Đã kết thúc' };
    return { k: 'on', n: diffDays(t.start, t0) + 1, label: 'đang đi' };
  }
  function visitedMap() {
    const t0 = today(), out = {};
    for (const t of S.trips) if (t.start <= t0) for (const p of t.provinces || []) (out[p] = out[p] || { trips: [] }).trips.push(t);
    for (const [id, v] of Object.entries(S.visited)) if (v.manual) (out[id] = out[id] || { trips: [] }).manual = true;
    return out;
  }

  // ---------- điều hướng & sheet ----------
  let planDay = null, walletFilter = 'all';
  function go(tab) {
    S.ui.tab = tab; save();
    $$('.screen').forEach((s) => s.classList.toggle('active', s.dataset.screen === tab));
    $$('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    $('#fab').hidden = !(tab === 'budget' && trip());
    $('#scroll').scrollTop = 0; render(tab);
  }
  const rerender = () => render(S.ui.tab);
  function render(tab) { ({ home: renderHome, plan: renderPlan, budget: renderBudget, map: renderMap })[tab](); }

  let sheetStack = [];
  function openSheet(html, level = 1, onOpen) {
    const el = level === 2 ? $('#sheet2') : $('#sheet');
    el.innerHTML = '<div class="grab"></div>' + html; el.scrollTop = 0;
    if (level === 1) $('#sheet2').classList.remove('open');
    el.classList.add('open'); $('#backdrop').classList.add('open');
    sheetStack = level === 2 ? [1, 2] : [1];
    onOpen && onOpen(el);
    return el;
  }
  function closeSheet(level) {
    if (level === 2 || (level === undefined && $('#sheet2').classList.contains('open'))) {
      $('#sheet2').classList.remove('open'); sheetStack = [1];
      if (!$('#sheet').classList.contains('open')) $('#backdrop').classList.remove('open');
      return;
    }
    $('#sheet').classList.remove('open'); $('#sheet2').classList.remove('open'); $('#backdrop').classList.remove('open'); sheetStack = [];
    keyHandler = null;
  }
  $('#backdrop').addEventListener('click', () => closeSheet());
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }
  function confirmBox(msg, okLabel, onOk) {
    openSheet(`<div style="text-align:center;padding:6px 4px 0"><div style="font-size:17px;font-weight:700;line-height:1.4">${esc(msg)}</div>
      <button class="primary" id="cOk" style="background:var(--red);box-shadow:none">${esc(okLabel)}</button><button class="secondary" id="cNo">Huỷ</button></div>`, 2, (el) => {
      $('#cNo', el).onclick = () => closeSheet(2);
      $('#cOk', el).onclick = () => { closeSheet(2); onOk(); };
    });
  }
  let keyHandler = null;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return closeSheet();
    if (keyHandler && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) keyHandler(e);
  });

  // ---------- vẽ vòng tròn ----------
  function ringsSvg(t) {
    const rows = ringRows(t).slice(0, 4); let o = '', r = 56;
    for (const c of rows) {
      const C = 2 * Math.PI * r, p = Math.min(c.p, 1);
      o += `<circle cx="62" cy="62" r="${r}" fill="none" stroke="${catColor(c.k)}" stroke-opacity=".18" stroke-width="10"/>` +
        `<circle cx="62" cy="62" r="${r}" fill="none" stroke="${catColor(c.k)}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(p * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 62 62)"/>`;
      r -= 13;
    }
    if (!rows.length) o = `<circle cx="62" cy="62" r="56" fill="none" stroke="var(--track)" stroke-width="10"/>`;
    return `<svg viewBox="0 0 124 124" aria-hidden="true">${o}</svg>`;
  }
  function ringRows(t) {
    // ưu tiên hạng mục có ngân sách riêng; nếu không, dùng tỷ trọng trên tổng ngân sách
    const b = t.catBudgets || {};
    const withB = CATS.filter((c) => b[c.k] > 0).map((c) => ({ ...c, s: spentCat(t, c.k), b: b[c.k] }));
    const list = withB.length ? withB : CATS.map((c) => ({ ...c, s: spentCat(t, c.k), b: t.budget || 0 })).filter((c) => c.s > 0);
    return list.map((c) => ({ ...c, p: c.b ? c.s / c.b : 0 })).sort((a, b2) => b2.s - a.s);
  }
  const miniRing = (p, color, size = 40) => { const r = 15, C = 2 * Math.PI * r; return `<svg viewBox="0 0 40 40" style="width:${size}px;height:${size}px" aria-hidden="true"><circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--track)" stroke-width="5"/><circle cx="20" cy="20" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(Math.min(p, 1) * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 20 20)"/></svg>`; };
  const pctCls = (p) => (p > 1 ? 'over' : p >= 0.85 ? 'warn' : '');

  // ---------- TRANG CHỦ ----------
  function renderHome() {
    const el = $('#s-home'), t = trip(), d = new Date();
    const greet = d.getHours() < 11 ? 'Chào buổi sáng' : d.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
    let h = `<div class="top"><div><small>${WD[d.getDay()]}, ${d.getDate()} Th${d.getMonth() + 1}</small><h1>${greet} 👋</h1></div><button class="iconbtn" id="btnSettings" aria-label="Cài đặt">⚙️</button></div>`;
    if (!t) {
      h += `<div class="glass empty"><div class="big">🧳</div><b>Chưa có chuyến đi nào</b>Tạo chuyến đầu tiên để lên lịch trình, đặt ngân sách và ghi chi tiêu.<button class="primary" id="btnNew">＋ Tạo chuyến đi</button><button class="secondary" id="btnSample">Xem thử với chuyến mẫu</button></div>`;
      el.innerHTML = h;
      $('#btnNew').onclick = () => tripForm();
      $('#btnSample').onclick = loadSample;
      $('#btnSettings').onclick = settingsSheet;
      return;
    }
    const st = status(t), sp = spent(t), left = (t.budget || 0) - sp;
    const cd = st.k === 'up' ? `<div class="cd"><b class="grad-text">${st.n}</b><small>ngày nữa</small></div>` : st.k === 'on' ? `<div class="cd"><b class="grad-text">${st.n}/${tripDays(t)}</b><small>đang đi</small></div>` : `<div class="cd"><b style="font-size:30px">✓</b><small>đã xong</small></div>`;
    h += `<button class="glass hero" id="btnEditTrip"><span class="type">${t.type === 'work' ? '💼 Công tác' : (esc(t.emoji) || '🏖️') + ' Du lịch'}</span>${cd}
      <h2>${esc(t.name)}</h2><p>${dRange(t.start, t.end)} · ${tripDays(t)}N${Math.max(tripDays(t) - 1, 0)}Đ${t.provinces?.length ? ' · ' + t.provinces.map((p) => PROV[p]?.name).join(', ') : ''}</p></button>`;
    const rows = ringRows(t);
    h += `<button class="glass rings" data-go="budget">${ringsSvg(t)}<div class="legend">${rows.slice(0, 4).map((c) => `<div><span><i style="background:${catColor(c.k)}"></i>${c.n}</span><b class="${pctCls(c.p)}">${Math.round(c.p * 100)}%</b></div>`).join('') || '<div><span>Chưa có chi tiêu</span></div>'}
      <div style="margin-top:4px"><span>${t.budget ? 'Còn lại' : 'Đã chi'}</span><b class="${t.budget && left < 0 ? 'over' : ''}" style="${t.budget && left >= 0 ? 'color:var(--green)' : ''}">${short(t.budget ? left : sp, t.currency)}</b></div></div></button>`;
    // hôm nay / ngày đầu
    const day = st.k === 'on' ? today() : t.start;
    const its = t.items.filter((i) => i.date === day).sort(byTime);
    h += `<div class="h3">${st.k === 'on' ? 'Hôm nay' : 'Ngày 1'} · ${dLabel(day)} <button data-go="plan">Xem hết →</button></div>`;
    h += its.length ? `<div class="glass list">${its.slice(0, 4).map(itemRow).join('')}</div>` : `<div class="glass empty" style="padding:18px">Chưa có hoạt động. <button class="grad-text" style="font-weight:700" data-go="plan">Thêm vào lịch trình</button></div>`;
    // checklist
    const done = t.checklist.filter((c) => c.done).length;
    h += `<div class="h3">Chuẩn bị <button id="btnCheck">${done}/${t.checklist.length} · Sửa</button></div><div class="glass list" id="chk">${t.checklist.slice(0, 6).map((c) => `<button class="item ${c.done ? 'done' : ''}" data-ck="${c.id}"><span class="check">✓</span><div class="m"><b>${esc(c.t)}</b></div></button>`).join('') || '<div class="empty" style="padding:14px">Danh sách trống</div>'}</div>`;
    // các chuyến
    const others = S.trips.slice().sort((a, b) => b.start.localeCompare(a.start));
    h += `<div class="h3">Tất cả chuyến đi <button id="btnNew2">＋ Mới</button></div><div class="glass list">${others.map((x) => { const s2 = status(x); return `<button class="item triprow" data-trip="${x.id}"><div class="ic">${x.type === 'work' ? '💼' : esc(x.emoji || '🏖️')}</div><div class="m"><b>${esc(x.name)}${x.id === t.id ? ' ·  <span class="grad-text">đang xem</span>' : ''}</b><small>${dRange(x.start, x.end)} · ${s2.k === 'up' ? 'còn ' + s2.n + ' ngày' : s2.k === 'on' ? 'đang đi' : 'đã đi'}</small></div><div class="e">${short(spent(x), x.currency)}</div></button>`; }).join('')}</div>`;
    el.innerHTML = h;
    $('#btnSettings').onclick = settingsSheet;
    $('#btnEditTrip').onclick = () => tripForm(t);
    $('#btnNew2').onclick = () => tripForm();
    $('#btnCheck').onclick = checklistSheet;
    $$('[data-ck]', el).forEach((b) => b.onclick = () => { const c = t.checklist.find((x) => x.id === b.dataset.ck); c.done = !c.done; save(); renderHome(); });
    $$('[data-trip]', el).forEach((b) => b.onclick = () => { S.ui.tripId = b.dataset.trip; planDay = null; save(); renderHome(); $('#scroll').scrollTop = 0; toast('Đã chuyển sang ' + trip().name); });
    $$('[data-iid]', el).forEach((b) => b.onclick = () => itemForm(t.items.find((i) => i.id === b.dataset.iid)));
    bindGo(el);
  }
  const bindGo = (el) => $$('[data-go]', el).forEach((b) => b.onclick = () => go(b.dataset.go));
  const byTime = (a, b) => (a.time || '99').localeCompare(b.time || '99');
  const itemRow = (i) => `<button class="item" data-iid="${i.id}"><div class="ic">${CAT[i.type]?.i || '📍'}</div><div class="m"><b>${esc(i.title)}</b><small>${esc(i.time || '--:--')}${i.place ? ' · ' + esc(i.place) : ''}</small></div>${i.cost ? `<div class="e">${short(i.cost, trip().currency)}</div>` : ''}</button>`;

  // ---------- CHUYẾN ĐI: tạo / sửa ----------
  function tripForm(t) {
    const isNew = !t;
    const st = today();
    const f = t ? JSON.parse(JSON.stringify(t)) : { id: uid(), name: '', type: 'travel', emoji: '🏖️', start: addDays(st, 7), end: addDays(st, 10), provinces: [], currency: S.settings.currency, budget: 0, catBudgets: {}, items: [], expenses: [], checklist: [] };
    const draw = () => `
      <div class="shead"><button data-x>Huỷ</button><span>${isNew ? 'Chuyến đi mới' : 'Sửa chuyến đi'}</span><button data-ok>Lưu</button></div>
      <label class="field"><span>Tên chuyến</span><input class="input" id="fName" maxlength="60" placeholder="VD: Đà Nẵng – Hội An" value="${esc(f.name)}"></label>
      <div class="field"><span>Loại</span><div class="seg" id="fType"><button data-v="travel" class="${f.type === 'travel' ? 'on' : ''}">🏖️ Du lịch</button><button data-v="work" class="${f.type === 'work' ? 'on' : ''}">💼 Công tác</button></div></div>
      <div class="field"><span>Biểu tượng</span><div class="chips" id="fEmoji">${EMOJIS.map((e) => `<button class="chip ${f.emoji === e ? 'sel' : ''}" data-v="${e}">${e}</button>`).join('')}</div></div>
      <div class="row2"><label class="field"><span>Ngày đi</span><input class="input" type="date" id="fStart" value="${f.start}"></label><label class="field"><span>Ngày về</span><input class="input" type="date" id="fEnd" value="${f.end}"></label></div>
      <div class="field"><span>Điểm đến (đánh dấu lên bản đồ)</span><div class="provpick" id="fProv">${window.PROVINCES.map((p) => `<button class="chip ${f.provinces.includes(p.id) ? 'sel' : ''}" data-v="${p.id}">${esc(p.name)}</button>`).join('')}</div></div>
      <div class="row2"><label class="field"><span>Ngân sách</span><input class="input" inputmode="decimal" id="fBudget" placeholder="0" value="${f.budget ? f.budget.toLocaleString('vi-VN') : ''}"></label>
        <div class="field"><span>Tiền tệ chuyến</span><button class="input" id="fCur" style="text-align:left">${CUR[f.currency]?.f || ''} ${f.currency}</button></div></div>
      ${isNew ? '' : '<button class="secondary danger" id="fDel">Xoá chuyến đi</button>'}
      <button class="primary" data-ok>${isNew ? 'Tạo chuyến đi' : 'Lưu thay đổi'}</button>`;
    const el = openSheet(draw(), 1, wire);
    function wire(el) {
      $$('[data-x]', el).forEach((b) => b.onclick = () => closeSheet());
      $$('#fType button', el).forEach((b) => b.onclick = () => { f.type = b.dataset.v; $$('#fType button', el).forEach((x) => x.classList.toggle('on', x === b)); });
      $$('#fEmoji .chip', el).forEach((b) => b.onclick = () => { f.emoji = b.dataset.v; $$('#fEmoji .chip', el).forEach((x) => x.classList.toggle('sel', x === b)); });
      $$('#fProv .chip', el).forEach((b) => b.onclick = () => { const v = b.dataset.v; f.provinces = f.provinces.includes(v) ? f.provinces.filter((x) => x !== v) : [...f.provinces, v]; b.classList.toggle('sel'); });
      $('#fBudget', el).oninput = (e) => { const n = num(e.target.value); e.target.value = n ? n.toLocaleString('vi-VN') : ''; };
      $('#fCur', el).onclick = () => currencyPicker(f.currency, (c) => { f.currency = c; $('#fCur', el).textContent = `${CUR[c].f} ${c}`; });
      const del = $('#fDel', el);
      if (del) del.onclick = () => confirmBox(`Xoá chuyến "${t.name}" cùng toàn bộ lịch trình, chi tiêu và ảnh hoá đơn?`, 'Xoá chuyến đi', async () => {
        S.trips = S.trips.filter((x) => x.id !== t.id);
        for (const r of RECEIPTS.filter((r) => r.tripId === t.id)) await DB.del(r.id).catch(() => {});
        RECEIPTS = RECEIPTS.filter((r) => r.tripId !== t.id);
        S.ui.tripId = null; pickDefaultTrip(); save(); closeSheet(); go('home'); toast('Đã xoá chuyến đi');
      });
      $$('[data-ok]', el).forEach((b) => b.onclick = () => {
        f.name = $('#fName', el).value.trim(); f.start = $('#fStart', el).value; f.end = $('#fEnd', el).value; f.budget = num($('#fBudget', el).value);
        if (!f.name) return toast('Nhập tên chuyến đi'), $('#fName', el).focus();
        if (!f.start || !f.end) return toast('Chọn ngày đi và ngày về');
        if (f.end < f.start) return toast('Ngày về phải sau ngày đi');
        if (isNew) { f.checklist = CHECK_TPL[f.type].map((x) => ({ id: uid(), t: x, done: false })); S.trips.push(f); }
        else {
          if (f.currency !== t.currency) { const r = rate(t.currency, f.currency); if (r) { f.expenses.forEach((e) => { e.conv = e.conv * r; e.rate = e.rate * r; }); f.items.forEach((i) => i.cost && (i.cost = i.cost * r)); for (const k in f.catBudgets) f.catBudgets[k] *= r; toast('Đã quy đổi các khoản sang ' + f.currency); } }
          Object.assign(t, f);
        }
        S.ui.tripId = f.id; save(); closeSheet(); rerender(); if (isNew) toast('Đã tạo chuyến đi');
      });
    }
  }
  const num = (s) => { const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')); return isFinite(n) ? n : 0; };

  function checklistSheet() {
    const t = trip();
    const draw = () => `<div class="shead"><span></span><span>Chuẩn bị</span><button data-x>Xong</button></div>
      <div class="list" style="padding:0">${t.checklist.map((c) => `<div class="item ${c.done ? 'done' : ''}"><button class="check" data-t="${c.id}" aria-label="Đánh dấu">✓</button><div class="m"><b>${esc(c.t)}</b></div><button data-d="${c.id}" class="danger" aria-label="Xoá" style="font-size:18px;padding:4px 8px">✕</button></div>`).join('')}</div>
      <div class="addplace"><input class="input" id="ckNew" placeholder="Thêm mục mới…" maxlength="80"><button id="ckAdd">Thêm</button></div>`;
    const wire = (el) => {
      $$('[data-x]', el).forEach((b) => b.onclick = () => { closeSheet(); renderHome(); });
      $$('[data-t]', el).forEach((b) => b.onclick = () => { const c = t.checklist.find((x) => x.id === b.dataset.t); c.done = !c.done; save(); redraw(); });
      $$('[data-d]', el).forEach((b) => b.onclick = () => { t.checklist = t.checklist.filter((x) => x.id !== b.dataset.d); save(); redraw(); });
      const add = () => { const v = $('#ckNew', el).value.trim(); if (!v) return; t.checklist.push({ id: uid(), t: v, done: false }); save(); redraw(); $('#ckNew').focus(); };
      $('#ckAdd', el).onclick = add; $('#ckNew', el).onkeydown = (e) => e.key === 'Enter' && add();
    };
    const redraw = () => { const el = $('#sheet'); el.innerHTML = '<div class="grab"></div>' + draw(); wire(el); };
    openSheet(draw(), 1, wire);
  }

  // ---------- LỊCH TRÌNH ----------
  function renderPlan() {
    const el = $('#s-plan'), t = trip();
    if (!t) { el.innerHTML = noTrip('Lịch trình'); bindNoTrip(el); return; }
    const n = tripDays(t), days = Array.from({ length: n }, (_, i) => addDays(t.start, i));
    if (!planDay || !days.includes(planDay)) planDay = days.includes(today()) ? today() : days[0];
    const its = t.items.filter((i) => i.date === planDay).sort(byTime);
    const planned = its.reduce((s, i) => s + (i.cost || 0), 0);
    const totalPlanned = t.items.reduce((s, i) => s + (i.cost || 0), 0);
    const di = days.indexOf(planDay) + 1;
    el.innerHTML = `<div class="top"><div><small>${esc(t.name)}</small><h1>Lịch trình</h1></div><button class="iconbtn grad" id="pAdd" aria-label="Thêm hoạt động">＋</button></div>
      <div class="days" id="days">${days.map((d, i) => { const x = parse(d); return `<button class="glass day ${d === planDay ? 'on' : ''}" data-d="${d}"><small>${WD[x.getDay()]} · N${i + 1}</small><b>${x.getDate()}</b></button>`; }).join('')}</div>
      <div class="h3" style="margin-top:4px">Ngày ${di} · ${dLabel(planDay)}<span style="font-size:14px;color:var(--sub);font-weight:600">${planned ? 'Dự kiến ' + short(planned, t.currency) : ''}</span></div>
      <div class="timeline">${its.map((i) => `<button class="glass tli" data-iid="${i.id}"><span class="t">${esc(i.time || '--:--')}</span><b>${CAT[i.type]?.i || '📍'} ${esc(i.title)}</b>${i.place ? `<small>📍 ${esc(i.place)}</small>` : ''}${i.note ? `<div class="note">${esc(i.note)}</div>` : ''}${i.cost ? `<span class="c">${short(i.cost, t.currency)}</span>` : ''}</button>`).join('')}
      <button class="addrow" id="pAdd2">＋ Thêm hoạt động</button></div>
      ${totalPlanned ? `<p class="note">Tổng chi phí dự kiến cả chuyến: <b>${money(totalPlanned, t.currency)}</b>${t.budget ? ` · ${Math.round(totalPlanned / t.budget * 100)}% ngân sách` : ''}</p>` : ''}`;
    $$('[data-d]', el).forEach((b) => b.onclick = () => { planDay = b.dataset.d; renderPlan(); });
    $('#pAdd').onclick = $('#pAdd2').onclick = () => itemForm(null);
    $$('[data-iid]', el).forEach((b) => b.onclick = () => itemForm(t.items.find((i) => i.id === b.dataset.iid)));
    const on = $('.day.on', el); on && on.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function itemForm(it) {
    const t = trip(), isNew = !it;
    const f = it ? { ...it } : { id: uid(), date: planDay || t.start, time: '09:00', title: '', type: 'fun', place: '', cost: 0, note: '' };
    const days = Array.from({ length: tripDays(t) }, (_, i) => addDays(t.start, i));
    openSheet(`<div class="shead"><button data-x>Huỷ</button><span>${isNew ? 'Thêm hoạt động' : 'Sửa hoạt động'}</span><button data-ok>Lưu</button></div>
      <label class="field"><span>Tên hoạt động</span><input class="input" id="iTitle" maxlength="80" placeholder="VD: Tham quan Bà Nà Hills" value="${esc(f.title)}"></label>
      <div class="field"><span>Loại</span><div class="chips" id="iType">${CATS.map((c) => `<button class="chip ${f.type === c.k ? 'sel' : ''}" data-v="${c.k}">${c.i} ${c.n}</button>`).join('')}</div></div>
      <div class="row2"><label class="field"><span>Ngày</span><select class="input" id="iDate">${days.map((d, i) => `<option value="${d}" ${d === f.date ? 'selected' : ''}>Ngày ${i + 1} · ${dLabel(d)}</option>`).join('')}</select></label>
        <label class="field"><span>Giờ</span><input class="input" type="time" id="iTime" value="${esc(f.time)}"></label></div>
      <label class="field"><span>Địa điểm</span><input class="input" id="iPlace" maxlength="80" placeholder="VD: Phố cổ Hội An" value="${esc(f.place)}"></label>
      <label class="field"><span>Chi phí dự kiến (${t.currency})</span><input class="input" inputmode="decimal" id="iCost" placeholder="0" value="${f.cost ? f.cost.toLocaleString('vi-VN') : ''}"></label>
      <label class="field"><span>Ghi chú</span><textarea class="input" id="iNote" maxlength="500" placeholder="Mã đặt chỗ, số điện thoại, lưu ý…">${esc(f.note)}</textarea></label>
      ${isNew ? '' : '<button class="secondary" id="iToExp">💸 Ghi thành chi tiêu</button><button class="secondary danger" id="iDel">Xoá hoạt động</button>'}
      <button class="primary" data-ok>${isNew ? 'Thêm vào lịch trình' : 'Lưu'}</button>`, 1, (el) => {
      $$('[data-x]', el).forEach((b) => b.onclick = () => closeSheet());
      $$('#iType .chip', el).forEach((b) => b.onclick = () => { f.type = b.dataset.v; $$('#iType .chip', el).forEach((x) => x.classList.toggle('sel', x === b)); });
      $('#iCost', el).oninput = (e) => { if (dec(t.currency)) return; const n = num(e.target.value); e.target.value = n ? n.toLocaleString('vi-VN') : ''; };
      const collect = () => { f.title = $('#iTitle', el).value.trim(); f.date = $('#iDate', el).value; f.time = $('#iTime', el).value; f.place = $('#iPlace', el).value.trim(); f.cost = num($('#iCost', el).value); f.note = $('#iNote', el).value.trim(); };
      $$('[data-ok]', el).forEach((b) => b.onclick = () => {
        collect(); if (!f.title) return toast('Nhập tên hoạt động'), $('#iTitle', el).focus();
        if (isNew) t.items.push(f); else Object.assign(it, f);
        planDay = f.date; save(); closeSheet(); rerender();
      });
      const del = $('#iDel', el); if (del) del.onclick = () => confirmBox(`Xoá "${it.title}" khỏi lịch trình?`, 'Xoá', () => { t.items = t.items.filter((x) => x.id !== it.id); save(); closeSheet(); rerender(); });
      const te = $('#iToExp', el); if (te) te.onclick = () => { collect(); expenseForm(null, { title: f.title, cat: f.type, amount: f.cost, date: f.date }); };
    });
  }

  // ---------- NGÂN SÁCH ----------
  function renderBudget() {
    const el = $('#s-budget'), t = trip();
    if (!t) { el.innerHTML = noTrip('Ngân sách'); bindNoTrip(el); return; }
    const sp = spent(t), left = (t.budget || 0) - sp, p = t.budget ? sp / t.budget : 0;
    const reimb = t.expenses.filter((e) => e.reimb).reduce((s, e) => s + e.conv, 0);
    const recs = RECEIPTS.filter((r) => r.tripId === t.id).sort((a, b) => b.created - a.created);
    const cnt = (s) => recs.filter((r) => r.status === s).length;
    const cb = t.catBudgets || {};
    const usedCats = CATS.filter((c) => cb[c.k] > 0 || spentCat(t, c.k) > 0);
    const rt = rateTime();
    el.innerHTML = `<div class="top"><div><small>${esc(t.name)}</small><h1>Ngân sách</h1></div><button class="iconbtn" id="bEdit" aria-label="Đặt ngân sách">✏️</button></div>
      <div class="glass big"><button class="curpill" id="bCur">${CUR[t.currency]?.f || ''} ${t.currency}</button>
        ${t.budget ? `<small>${left >= 0 ? 'Còn lại' : 'Vượt ngân sách'}</small><div class="v ${left < 0 ? 'over' : ''}">${money(Math.abs(left), t.currency)}</div>
        <div class="bar ${p > 1 ? 'over' : ''}"><i style="width:${Math.min(p, 1) * 100}%"></i></div>
        <div class="row"><span>Đã chi ${short(sp, t.currency)} · ${Math.round(p * 100)}%</span><span>Ngân sách ${short(t.budget, t.currency)}</span></div>`
        : `<small>Đã chi</small><div class="v">${money(sp, t.currency)}</div><button class="secondary" id="bSet" style="margin-top:12px">Đặt ngân sách cho chuyến này</button>`}
      </div>
      ${p > 1 ? `<div class="glass banner" style="margin-top:12px"><span>⚠️</span><span><b>Đã vượt ngân sách ${money(-left, t.currency)}.</b> Xem lại các hạng mục bên dưới.</span></div>` : p >= 0.85 ? `<div class="glass banner" style="margin-top:12px"><span>⚠️</span><span><b>Sắp chạm ngân sách</b> — đã dùng ${Math.round(p * 100)}%.</span></div>` : ''}
      <div class="h3">Hạng mục <button id="bEdit2">Đặt hạn mức</button></div>
      ${usedCats.length ? `<div class="cats">${usedCats.map((c) => { const s = spentCat(t, c.k), b = cb[c.k] || 0, q = b ? s / b : 0; return `<button class="glass cat" data-cat="${c.k}"><div class="ic">${c.i}</div><b>${c.n}</b><small class="${pctCls(q)}">${short(s, t.currency)}${b ? ' / ' + short(b, t.currency) : ''}</small>${miniRing(b ? q : (sp ? s / sp : 0), catColor(c.k))}</button>`; }).join('')}</div>` : `<div class="glass empty" style="padding:18px">Chưa có chi tiêu. Bấm <b style="display:inline">＋</b> để ghi khoản đầu tiên.</div>`}
      <div class="h3">Ví hoá đơn <button id="bWallet">Tất cả →</button></div>
      <div class="glass"><div class="wallet"><button class="rc new" id="bAddRc" aria-label="Chụp hoá đơn">＋</button>${recs.slice(0, 8).map((r) => `<button class="rc" data-rc="${r.id}"><img src="${imgUrl(r)}" alt="Hoá đơn"><span class="st st-${r.status}">${ST[r.status]}</span></button>`).join('')}</div>
        <div class="wsum"><div><b>${short(reimb, t.currency)}</b><small>Cần hoàn ứng</small></div><div><b>${cnt('pending')}</b><small>Chưa nộp</small></div><div><b style="color:var(--orange)">${cnt('submitted')}</b><small>Chờ duyệt</small></div><div><b style="color:var(--green)">${cnt('approved')}</b><small>Đã duyệt</small></div></div></div>
      <div class="h3">Chi tiêu (${t.expenses.length})</div>
      ${t.expenses.length ? `<div class="glass list">${t.expenses.slice().sort((a, b) => (b.date + b.created).localeCompare(a.date + a.created)).map((e) => expRow(e, t)).join('')}</div>` : ''}
      <p class="note">${rt ? `Tỷ giá cập nhật ${rt} · ` : 'Chưa có tỷ giá · '}<button class="grad-text" style="font-weight:700;font-size:12px" id="bRates">Làm mới</button><br>Nguồn tỷ giá: <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Rates By Exchange Rate API</a></p>`;
    $('#bEdit').onclick = $('#bEdit2').onclick = budgetForm;
    const bs = $('#bSet'); if (bs) bs.onclick = budgetForm;
    $('#bCur').onclick = () => currencyPicker(t.currency, (c) => { if (c === t.currency) return; const r = rate(t.currency, c); if (!r) return toast('Chưa có tỷ giá để đổi'); t.expenses.forEach((e) => { e.conv *= r; e.rate *= r; }); t.items.forEach((i) => i.cost && (i.cost *= r)); t.budget *= r; for (const k in t.catBudgets) t.catBudgets[k] *= r; t.currency = c; save(); renderBudget(); toast('Đã hiển thị theo ' + c); });
    $('#bWallet').onclick = walletSheet;
    $('#bAddRc').onclick = async () => { const b = await pickImage(); if (!b) return; await addReceipt(b, t.id); toast('Đã lưu hoá đơn vào ví'); renderBudget(); };
    $$('[data-rc]', el).forEach((b) => b.onclick = () => viewer(b.dataset.rc));
    $$('[data-eid]', el).forEach((b) => b.onclick = () => expenseForm(t.expenses.find((e) => e.id === b.dataset.eid)));
    $$('[data-cat]', el).forEach((b) => b.onclick = () => expenseForm(null, { cat: b.dataset.cat }));
    $('#bRates').onclick = () => refreshRates(true);
  }
  function expRow(e, t) {
    const hasRc = RECEIPTS.some((r) => r.expenseId === e.id);
    return `<button class="item" data-eid="${e.id}"><div class="ic" style="background:color-mix(in srgb, ${catColor(e.cat)} 18%, transparent)">${CAT[e.cat]?.i || '📦'}</div><div class="m"><b>${esc(e.title || CAT[e.cat]?.n)}</b><small>${dLabel(e.date)}${e.reimb ? ' · 💼 hoàn ứng' : ''}${hasRc ? ' · 🧾' : ''}</small></div><div class="e">−${short(e.conv, t.currency)}${e.cur !== t.currency ? `<small>${money(e.amount, e.cur)}</small>` : ''}</div></button>`;
  }
  function budgetForm() {
    const t = trip(), cb = { ...(t.catBudgets || {}) };
    const fmtIn = (n) => (n ? Math.round(n).toLocaleString('vi-VN') : '');
    openSheet(`<div class="shead"><button data-x>Huỷ</button><span>Ngân sách (${t.currency})</span><button data-ok>Lưu</button></div>
      <label class="field"><span>Tổng ngân sách</span><input class="input" inputmode="decimal" id="bbTotal" value="${fmtIn(t.budget)}" placeholder="0"></label>
      <div class="lbl" style="margin:4px 4px 8px">Hạn mức theo hạng mục (không bắt buộc)</div>
      ${CATS.map((c) => `<label class="field" style="display:flex;align-items:center;gap:10px"><span style="width:110px;margin:0;text-transform:none;letter-spacing:0;font-size:15px;color:var(--text)">${c.i} ${c.n}</span><input class="input" inputmode="decimal" data-k="${c.k}" value="${fmtIn(cb[c.k])}" placeholder="—"></label>`).join('')}
      <p class="note" id="bbSum"></p>
      <button class="primary" data-ok>Lưu ngân sách</button>`, 1, (el) => {
      const sum = () => { const s = $$('[data-k]', el).reduce((a, i) => a + num(i.value), 0); $('#bbSum', el).textContent = s ? `Tổng các hạng mục: ${money(s, t.currency)}` : ''; };
      $$('input', el).forEach((i) => i.oninput = () => { if (!dec(t.currency)) { const n = num(i.value); i.value = n ? n.toLocaleString('vi-VN') : ''; } sum(); });
      sum();
      $$('[data-x]', el).forEach((b) => b.onclick = () => closeSheet());
      $$('[data-ok]', el).forEach((b) => b.onclick = () => {
        t.budget = num($('#bbTotal', el).value); t.catBudgets = {};
        $$('[data-k]', el).forEach((i) => { const n = num(i.value); if (n) t.catBudgets[i.dataset.k] = n; });
        if (!t.budget) t.budget = Object.values(t.catBudgets).reduce((a, b2) => a + b2, 0);
        save(); closeSheet(); rerender(); toast('Đã lưu ngân sách');
      });
    });
  }

  // ---------- thêm / sửa chi tiêu (bàn phím số) ----------
  function expenseForm(e, preset = {}) {
    const t = trip(), isNew = !e;
    const f = e ? { ...e } : { id: uid(), date: today() >= t.start && today() <= t.end ? today() : t.start, title: '', cat: 'food', amount: 0, cur: S.settings.currency || t.currency, reimb: t.type === 'work', created: Date.now(), ...preset };
    if (preset.amount) f.cur = t.currency;
    let str = f.amount ? String(+f.amount.toFixed(dec(f.cur))).replace('.', ',') : '';
    let newBlob = null;
    const linked = () => RECEIPTS.filter((r) => r.expenseId === f.id);
    const show = (el) => {
      const n = num(str);
      $('#kpv', el).textContent = str ? (dec(f.cur) ? str.replace(/^(\d+)/, (m) => Number(m).toLocaleString('vi-VN')) : n.toLocaleString('vi-VN')) : '0';
      $('#kCur', el).textContent = f.cur;
      const r = rate(f.cur, t.currency);
      $('#kConv', el).textContent = f.cur === t.currency ? `Tiền tệ chuyến: ${t.currency}` : r ? `≈ ${money(n * r, t.currency)} · 1 ${f.cur} = ${money(r, t.currency).replace(/\s/g, ' ')}` : 'Chưa có tỷ giá — mở mạng để cập nhật';
      $('#kDot', el).textContent = dec(f.cur) ? ',' : '000';
      $('#kDot', el).dataset.key = dec(f.cur) ? ',' : '000';
    };
    const press = (k, el) => {
      if (k === 'del') str = str.slice(0, -1);
      else if (k === ',') { if (!str.includes(',')) str = (str || '0') + ','; }
      else if (k === '000') { if (str && str !== '0') str += '000'; }
      else { if (str.includes(',') && str.split(',')[1].length >= 2) return; str = str === '0' ? k : str + k; }
      if (str.replace(',', '').length > 13) str = str.slice(0, -1);
      show(el);
    };
    openSheet(`<div class="shead"><button data-x>Huỷ</button><span>${isNew ? 'Khoản chi mới' : 'Sửa khoản chi'}</span><button data-ok>Lưu</button></div>
      <div class="amount"><span class="v" id="kpv">0</span><button class="curbtn" id="kCur">VND</button><small id="kConv"></small></div>
      <div class="chips" id="kCat">${CATS.map((c) => `<button class="chip ${f.cat === c.k ? 'sel' : ''}" data-v="${c.k}">${c.i} ${c.n}</button>`).join('')}</div>
      <div class="row2"><input class="input" id="kTitle" maxlength="80" placeholder="Ghi chú (VD: Ăn tối hải sản)" value="${esc(f.title)}"><input class="input" type="date" id="kDate" value="${f.date}"></div>
      <div class="opts" style="margin-top:10px"><button class="opt ${f.reimb ? 'on' : ''}" id="kReimb">💼 Hoàn ứng</button><button class="opt ${linked().length ? 'on' : ''}" id="kRc">📷 Hoá đơn${linked().length ? ' (' + linked().length + ')' : ''}</button></div>
      <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => `<button data-key="${k}">${k}</button>`).join('')}<button data-key="000" id="kDot">000</button><button data-key="0">0</button><button data-key="del" aria-label="Xoá">⌫</button></div>
      ${isNew ? '' : '<button class="secondary danger" id="kDel">Xoá khoản chi</button>'}
      <button class="primary" data-ok>${isNew ? 'Thêm khoản chi' : 'Lưu'}</button>`, 1, (el) => {
      show(el);
      $$('[data-key]', el).forEach((b) => b.onclick = () => press(b.dataset.key, el));
      keyHandler = (ev) => { if (/^\d$/.test(ev.key)) press(ev.key, el); else if (ev.key === 'Backspace') press('del', el); else if ((ev.key === ',' || ev.key === '.') && dec(f.cur)) press(',', el); else if (ev.key === 'Enter') $('[data-ok]', el).click(); };
      $$('#kCat .chip', el).forEach((b) => b.onclick = () => { f.cat = b.dataset.v; $$('#kCat .chip', el).forEach((x) => x.classList.toggle('sel', x === b)); });
      $('#kCur', el).onclick = () => currencyPicker(f.cur, (c) => { f.cur = c; if (!dec(c)) str = str.split(',')[0]; show(el); });
      $('#kReimb', el).onclick = (ev) => { f.reimb = !f.reimb; ev.currentTarget.classList.toggle('on', f.reimb); };
      $('#kRc', el).onclick = async (ev) => {
        const ex = linked();
        if (ex.length && !newBlob) return viewer(ex[0].id);
        const b = await pickImage(); if (!b) return; newBlob = b; ev.target.classList.add('on'); ev.target.textContent = '📷 Đã đính kèm'; };
      $$('[data-x]', el).forEach((b) => b.onclick = () => closeSheet());
      const del = $('#kDel', el); if (del) del.onclick = () => confirmBox('Xoá khoản chi này? Ảnh hoá đơn đi kèm vẫn được giữ trong ví.', 'Xoá', () => { t.expenses = t.expenses.filter((x) => x.id !== e.id); RECEIPTS.filter((r) => r.expenseId === e.id).forEach((r) => { r.expenseId = null; DB.put(r); }); save(); closeSheet(); rerender(); });
      $$('[data-ok]', el).forEach((b) => b.onclick = async () => {
        const n = num(str); if (!n) return toast('Nhập số tiền');
        const r = f.cur === t.currency ? 1 : (rate(f.cur, t.currency) ?? (e && e.cur === f.cur ? e.rate : null));
        if (r == null) return toast('Chưa có tỷ giá ' + f.cur + '. Kết nối mạng rồi thử lại.');
        f.amount = n; f.rate = r; f.conv = n * r; f.title = $('#kTitle', el).value.trim(); f.date = $('#kDate', el).value || f.date;
        if (isNew) t.expenses.push(f); else Object.assign(e, f);
        if (newBlob) await addReceipt(newBlob, t.id, f.id);
        save(); closeSheet(); rerender();
        const left = t.budget - spent(t);
        toast(t.budget && left < 0 ? `⚠️ Vượt ngân sách ${short(-left, t.currency)}` : isNew ? `Đã ghi ${money(f.conv, t.currency)}` : 'Đã lưu');
      });
    });
  }
  function currencyPicker(cur, onPick) {
    openSheet(`<div class="shead"><span></span><span>Đơn vị tiền tệ</span><button data-x>Xong</button></div>
      ${CURRENCIES.map((c) => { const r = rate(c.c, 'VND'); return `<button class="cur-row ${c.c === cur ? 'sel' : ''}" data-c="${c.c}"><span class="flag">${c.f}</span><span class="cn"><b>${c.c}</b><small>${c.n}</small></span><span class="rate">${c.c === 'VND' ? '' : r ? '1 = ' + money(r, 'VND') : '—'}</span></button>`; }).join('')}
      <p class="note">${rateTime() ? 'Cập nhật ' + rateTime() : 'Chưa có tỷ giá'} · Rates By <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener">Exchange Rate API</a></p>`, 2, (el) => {
      $$('[data-x]', el).forEach((b) => b.onclick = () => closeSheet(2));
      $$('[data-c]', el).forEach((b) => b.onclick = () => { onPick(b.dataset.c); closeSheet(2); });
    });
  }

  // ---------- VÍ HOÁ ĐƠN ----------
  function walletSheet() {
    const t = trip();
    const draw = () => {
      const recs = RECEIPTS.filter((r) => r.tripId === t.id && (walletFilter === 'all' || r.status === walletFilter)).sort((a, b) => b.created - a.created);
      const amt = (s) => RECEIPTS.filter((r) => r.tripId === t.id && r.status === s).reduce((a, r) => a + (t.expenses.find((e) => e.id === r.expenseId)?.conv || 0), 0);
      return `<div class="shead"><span></span><span>Ví hoá đơn · ${esc(t.name)}</span><button data-x>Xong</button></div>
        <div class="seg">${[['all', 'Tất cả'], ['pending', 'Chưa nộp'], ['submitted', 'Đã nộp'], ['approved', 'Đã duyệt']].map(([k, n]) => `<button data-f="${k}" class="${walletFilter === k ? 'on' : ''}">${n}</button>`).join('')}</div>
        <div class="wsum" style="padding:0 0 14px"><div><b>${short(amt('pending'), t.currency)}</b><small>Chưa nộp</small></div><div><b style="color:var(--orange)">${short(amt('submitted'), t.currency)}</b><small>Chờ duyệt</small></div><div><b style="color:var(--green)">${short(amt('approved'), t.currency)}</b><small>Đã duyệt</small></div></div>
        <div class="wgrid"><button class="rc new" id="wAdd" aria-label="Thêm hoá đơn">＋</button>${recs.map((r) => `<button class="rc" data-rc="${r.id}"><img src="${imgUrl(r)}" alt="Hoá đơn"><span class="st st-${r.status}">${ST[r.status]}</span></button>`).join('')}</div>
        ${recs.length ? '' : '<p class="note">Chưa có hoá đơn ở mục này. Chụp hoặc chọn ảnh hoá đơn để lưu lại cho thủ tục duyệt chi.</p>'}
        <p class="note">Số tiền theo khoản chi được gắn với từng hoá đơn. Ảnh chỉ lưu trên máy này.</p>`;
    };
    const wire = (el) => {
      $$('[data-x]', el).forEach((b) => b.onclick = () => { closeSheet(); renderBudget(); });
      $$('[data-f]', el).forEach((b) => b.onclick = () => { walletFilter = b.dataset.f; el.innerHTML = '<div class="grab"></div>' + draw(); wire(el); });
      $$('[data-rc]', el).forEach((b) => b.onclick = () => viewer(b.dataset.rc, () => { el.innerHTML = '<div class="grab"></div>' + draw(); wire(el); }));
      $('#wAdd', el).onclick = async () => { const b = await pickImage(); if (!b) return; await addReceipt(b, t.id); el.innerHTML = '<div class="grab"></div>' + draw(); wire(el); toast('Đã lưu hoá đơn'); };
    };
    openSheet(draw(), 1, wire);
  }
  function viewer(id, onChange) {
    const r = RECEIPTS.find((x) => x.id === id); if (!r) return;
    const t = S.trips.find((x) => x.id === r.tripId) || trip();
    const v = $('#viewer');
    const draw = () => {
      v.innerHTML = `<div class="vbar"><button id="vClose">‹ Đóng</button><span>${new Date(r.created).toLocaleDateString('vi-VN')}</span><button id="vDel" style="color:#FF6B7D">Xoá</button></div>
        <img src="${imgUrl(r)}" alt="Ảnh hoá đơn">
        <div class="vfoot"><div class="seg">${Object.entries(ST).map(([k, n]) => `<button data-s="${k}" class="${r.status === k ? 'on' : ''}">${n}</button>`).join('')}</div>
          <select class="input" id="vExp" style="background:rgba(255,255,255,.15);color:#fff;border:0"><option value="">— Chưa gắn khoản chi —</option>${t.expenses.map((e) => `<option value="${e.id}" ${e.id === r.expenseId ? 'selected' : ''} style="color:#000">${esc(e.title || CAT[e.cat].n)} · ${short(e.conv, t.currency)} · ${dLabel(e.date)}</option>`).join('')}</select>
          <div class="vacts"><button id="vShare">Chia sẻ / Lưu ảnh</button></div></div>`;
      $('#vClose').onclick = () => { v.hidden = true; onChange && onChange(); rerender(); };
      $$('[data-s]', v).forEach((b) => b.onclick = async () => { r.status = b.dataset.s; await DB.put(r); draw(); });
      $('#vExp').onchange = async (ev) => { r.expenseId = ev.target.value || null; await DB.put(r); toast('Đã gắn hoá đơn'); };
      $('#vDel').onclick = () => confirmBox('Xoá vĩnh viễn ảnh hoá đơn này khỏi máy?', 'Xoá ảnh', async () => { await DB.del(r.id); RECEIPTS = RECEIPTS.filter((x) => x.id !== r.id); v.hidden = true; onChange && onChange(); rerender(); toast('Đã xoá ảnh'); });
      $('#vShare').onclick = async () => {
        const file = new File([r.blob], `hoa-don-${iso(new Date(r.created))}-${r.id.slice(-4)}.jpg`, { type: 'image/jpeg' });
        try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Hoá đơn' }); return; } } catch (e) { if (e.name === 'AbortError') return; }
        const a = document.createElement('a'); a.href = imgUrl(r); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
      };
    };
    draw(); v.hidden = false;
  }

  // ---------- BẢN ĐỒ ----------
  let selProv = null;
  function renderMap() {
    const el = $('#s-map'), M = window.VN_MAP, vis = visitedMap(), n = Object.keys(vis).length, C = 2 * Math.PI * 30;
    const reg = ['Bắc', 'Trung', 'Nam'].map((r) => { const a = window.PROVINCES.filter((p) => p.r === r); return { r, all: a.length, v: a.filter((p) => vis[p.id]).length }; });
    const has = (ids) => ids.filter((i) => vis[i]).length;
    const cities = window.PROVINCES.filter((p) => p.city).map((p) => p.id);
    const BADGES = [
      { i: '🏔️', n: 'Tây Bắc', ids: ['dienbien', 'laichau', 'sonla', 'laocai'] },
      { i: '🏖️', n: 'Biển miền Trung', ids: ['hue', 'danang', 'quangngai', 'gialai', 'daklak', 'khanhhoa'] },
      { i: '🏙️', n: `${cities.length} thành phố TW`, ids: cities },
      { i: '🌾', n: 'Miền Tây', ids: ['vinhlong', 'dongthap', 'cantho', 'angiang', 'camau'] },
    ];
    const isl = (k, label) => { const I = M.islands[k], on = !!vis[I.prov]; const xs = I.pts.map((p) => p[0]), ys = I.pts.map((p) => p[1]); const x0 = Math.min(...xs) - 10, y0 = Math.min(...ys) - 10, w = Math.max(...xs) - x0 + 10, h = Math.max(...ys) - y0 + 10;
      return `<g class="isl ${on ? 'on' : ''}" data-p="${I.prov}" style="cursor:pointer"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="10"/>${I.pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('')}<text x="${x0 + w / 2}" y="${y0 + h + 15}" text-anchor="middle">${label}</text></g>`; };
    el.innerHTML = `<div class="top"><div><small>Hành trình của bạn</small><h1>Dấu chân 🇻🇳</h1></div></div>
      <div class="glass mstat"><svg viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="30" fill="none" stroke="var(--track)" stroke-width="9"/><circle cx="38" cy="38" r="30" fill="none" stroke="url(#grad)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(n / 34 * C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle" font-size="15" font-weight="800" fill="var(--text)">${Math.round(n / 34 * 100)}%</text></svg>
        <div><b>${n} / 34</b><small>tỉnh, thành phố đã đến</small><small>${reg.map((x) => `${x.r} ${x.v}/${x.all}`).join(' · ')}</small></div></div>
      <div class="glass mapwrap"><svg class="vnmap" viewBox="0 0 ${M.w} ${M.h}" role="img" aria-label="Bản đồ 34 tỉnh thành Việt Nam">
        ${Object.entries(M.p).map(([id, p]) => `<path class="prov ${vis[id] ? 'on' : ''} ${selProv === id ? 'sel' : ''}" d="${p.d}" data-p="${id}"><title>${esc(PROV[id].name)}</title></path>`).join('')}
        ${isl('hoangsa', 'QĐ Hoàng Sa')}${isl('truongsa', 'QĐ Trường Sa')}
      </svg></div>
      <p class="note">Chạm vào tỉnh để đánh dấu, xem các tỉnh cũ đã hợp nhất và ghi chú địa danh.<br>Tỉnh có trong chuyến đi đã bắt đầu sẽ tự được tô màu.</p>
      <div class="badges">${BADGES.map((b) => { const k = has(b.ids); return `<div class="glass bdg ${k === b.ids.length ? '' : 'lock'}"><div>${b.i}</div><small>${b.n}<br>${k}/${b.ids.length}</small></div>`; }).join('')}</div>
      <div class="h3">Đã đến (${n})</div>
      <div class="glass list">${window.PROVINCES.filter((p) => vis[p.id]).map((p) => `<button class="item" data-p="${p.id}"><div class="ic">📍</div><div class="m"><b>${esc(p.name)}</b><small>${(S.visited[p.id]?.places || []).map(esc).join(', ') || (vis[p.id].trips.length ? vis[p.id].trips.length + ' chuyến' : 'Đánh dấu thủ công')}</small></div></button>`).join('') || '<div class="empty" style="padding:16px">Chưa đánh dấu tỉnh nào</div>'}</div>
      <p class="note">Ranh giới: <a href="https://github.com/ThangLeQuoc/vietnamese-provinces-database" target="_blank" rel="noopener">vietnamese-provinces-database</a> (MIT), theo NQ 202/2025/QH15. Vị trí hai quần đảo được thu gần bờ để vừa màn hình.</p>`;
    $$('[data-p]', el).forEach((b) => b.addEventListener('click', () => provinceSheet(b.dataset.p)));
  }
  function provinceSheet(id) {
    const p = PROV[id]; selProv = id;
    const draw = () => {
      const vis = visitedMap()[id], v = S.visited[id] || {};
      return `<div class="shead"><span></span><span></span><button data-x>Xong</button></div>
        <div style="text-align:center"><div style="font-size:44px">${vis ? '📍' : '🗺️'}</div><div style="font-size:26px;font-weight:800">${esc(p.name)}</div>
        <div style="color:var(--sub);font-size:14px;margin-top:2px">${p.city ? 'Thành phố trực thuộc Trung ương' : 'Tỉnh'} · Miền ${p.r}</div>${p.cityNote ? `<div style="color:var(--sub);font-size:12px;margin-top:2px">${esc(p.cityNote)}</div>` : ''}</div>
        <div class="lbl">Hợp nhất từ 1/7/2025</div>
        <div class="old">${p.old.length ? p.old.map((x) => `<span>${esc(x)}</span>`).join('<i>+</i>') : '<span>Giữ nguyên, không sáp nhập</span>'}</div>
        ${p.extra ? `<div style="font-size:13px;color:var(--sub);margin:-6px 4px 10px">${esc(p.extra)}</div>` : ''}
        <div class="glass toggle" style="padding:12px 14px;border-radius:18px"><span>Đã đến nơi này${vis && vis.trips.length ? `<br><small style="color:var(--sub);font-weight:500">Qua ${vis.trips.map((t) => esc(t.name)).join(', ')}</small>` : ''}</span><button class="switch ${vis ? 'on' : ''}" id="pvT" role="switch" aria-checked="${!!vis}" ${vis && vis.trips.length && !v.manual ? 'disabled style="opacity:.6"' : ''}></button></div>
        <div class="lbl">Địa danh của tôi</div>
        <div style="margin-top:8px">${(v.places || []).map((x, i) => `<span class="place">📍 ${esc(x)}<button data-rm="${i}" aria-label="Xoá">✕</button></span>`).join('') || '<p class="note" style="text-align:left;margin:0 4px 8px">Ghi lại những nơi bạn đã ghé: bãi biển, quán ăn, điểm check-in…</p>'}</div>
        <div class="addplace"><input class="input" id="pvNew" maxlength="60" placeholder="VD: Phố cổ Hội An"><button id="pvAdd">Thêm</button></div>
        <label class="field" style="margin-top:12px"><span>Ghi chú</span><textarea class="input" id="pvNote" maxlength="500" placeholder="Kỷ niệm, món ngon, mẹo cho lần sau…">${esc(v.note || '')}</textarea></label>`;
    };
    const ensure = () => (S.visited[id] = S.visited[id] || { manual: false, places: [], note: '' });
    const wire = (el) => {
      $$('[data-x]', el).forEach((b) => b.onclick = () => { closeSheet(); selProv = null; renderMap(); });
      const sw = $('#pvT', el); sw.onclick = () => { if (sw.disabled) return; const v = ensure(); v.manual = !v.manual; save(); redraw(); renderMap(); };
      $$('[data-rm]', el).forEach((b) => b.onclick = () => { ensure().places.splice(+b.dataset.rm, 1); save(); redraw(); });
      const add = () => { const x = $('#pvNew', el).value.trim(); if (!x) return; const v = ensure(); v.places.push(x); if (!visitedMap()[id]) v.manual = true; save(); redraw(); renderMap(); $('#pvNew').focus(); };
      $('#pvAdd', el).onclick = add; $('#pvNew', el).onkeydown = (e) => e.key === 'Enter' && add();
      $('#pvNote', el).oninput = (e) => { ensure().note = e.target.value; save(); };
    };
    const redraw = () => { const el = $('#sheet'); const st = el.scrollTop; el.innerHTML = '<div class="grab"></div>' + draw(); wire(el); el.scrollTop = st; };
    openSheet(draw(), 1, wire);
    $$('.prov').forEach((x) => x.classList.toggle('sel', x.dataset.p === id));
  }

  // ---------- CÀI ĐẶT ----------
  async function settingsSheet() {
    let persisted = null; try { persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch {}
    let usage = ''; try { const e = await navigator.storage.estimate(); usage = (e.usage / 1048576).toFixed(1) + ' MB'; } catch {}
    openSheet(`<div class="shead"><span></span><span>Cài đặt</span><button data-x>Xong</button></div>
      <div class="field"><span>Tiền tệ mặc định khi ghi chi tiêu</span><button class="input" id="stCur" style="text-align:left">${CUR[S.settings.currency].f} ${S.settings.currency} · ${CUR[S.settings.currency].n}</button></div>
      <div class="glass banner" style="border-radius:18px"><span>💱</span><span><b>Tỷ giá</b><br>${rateTime() ? 'Cập nhật lần cuối ' + rateTime() : 'Chưa tải được'} · nguồn cập nhật mỗi ngày một lần.<br><button class="grad-text" style="font-weight:700" id="stRates">Cập nhật ngay</button></span></div>
      <div class="glass banner" style="border-radius:18px"><span>💾</span><span><b>Dữ liệu lưu trên máy này</b><br>Chuyến đi và ảnh hoá đơn chỉ nằm trong trình duyệt của điện thoại${usage ? ` (đang dùng ${usage})` : ''}. ${persisted ? 'Trình duyệt đã cho phép lưu lâu dài.' : 'Hãy thêm app vào Màn hình chính để trình duyệt không tự xoá dữ liệu.'} Xoá dữ liệu Safari/Chrome sẽ mất toàn bộ.</span></div>
      <button class="secondary" id="stSample">Thêm chuyến mẫu để xem thử</button>
      <button class="secondary danger" id="stWipe">Xoá toàn bộ dữ liệu</button>
      <p class="note">Bản đồ: 34 tỉnh, thành theo NQ 202/2025/QH15; Quảng Ninh, Bắc Ninh là thành phố trực thuộc TW từ tháng 9/2026.<br>Kế Hoạch Hoá · phiên bản 1.1</p>`, 1, (el) => {
      $$('[data-x]', el).forEach((b) => b.onclick = () => closeSheet());
      $('#stCur', el).onclick = () => currencyPicker(S.settings.currency, (c) => { S.settings.currency = c; save(); $('#stCur', el).textContent = `${CUR[c].f} ${c} · ${CUR[c].n}`; });
      $('#stRates', el).onclick = () => refreshRates(true);
      $('#stSample', el).onclick = () => { closeSheet(); loadSample(); };
      $('#stWipe', el).onclick = () => confirmBox('Xoá toàn bộ chuyến đi, chi tiêu, địa danh và ảnh hoá đơn trên máy này? Không thể khôi phục.', 'Xoá tất cả', async () => {
        S = blank(); save(); try { await DB.clear(); } catch {} RECEIPTS = []; closeSheet(); go('home'); toast('Đã xoá toàn bộ dữ liệu');
      });
    });
  }

  // ---------- trạng thái trống & dữ liệu mẫu ----------
  const noTrip = (title) => `<div class="top"><div><h1>${title}</h1></div></div><div class="glass empty"><div class="big">🧭</div><b>Chưa chọn chuyến đi</b>Tạo một chuyến đi để bắt đầu.<button class="primary" data-new>＋ Tạo chuyến đi</button></div>`;
  const bindNoTrip = (el) => { $('[data-new]', el).onclick = () => tripForm(); };
  function loadSample() {
    const t0 = today(), s = addDays(t0, 11), id = uid();
    const r = (from) => rate(from, 'VND') || { USD: 26000 }[from] || 1;
    const day = (n) => addDays(s, n);
    const T = { id, name: 'Đà Nẵng – Hội An (mẫu)', type: 'travel', emoji: '🏖️', start: s, end: addDays(s, 3), provinces: ['danang'], currency: 'VND', budget: 12000000,
      catBudgets: { move: 4000000, stay: 4500000, food: 2000000, fun: 1500000 },
      items: [
        ['0', '07:30', 'Bay HAN → DAD', 'move', 'Sân bay Nội Bài', 1600000, 'Có mặt trước 90 phút'], ['0', '10:00', 'Nhận phòng khách sạn', 'stay', 'An Thượng, Ngũ Hành Sơn', 0, ''],
        ['0', '12:00', 'Mì Quảng Bà Mua', 'food', 'Hải Châu', 120000, ''], ['0', '16:00', 'Tắm biển Mỹ Khê', 'fun', 'Biển Mỹ Khê', 0, ''],
        ['1', '08:00', 'Cáp treo Bà Nà Hills', 'fun', 'Hoà Vang', 900000, 'Mua vé online trước'], ['1', '21:00', 'Xem cầu Rồng phun lửa', 'fun', 'Sông Hàn', 0, 'Chỉ tối T7 và CN'],
        ['2', '09:00', 'Xe đi Hội An', 'move', 'Khoảng 45 phút', 300000, ''], ['2', '15:00', 'Dạo phố cổ, thả đèn hoa đăng', 'fun', 'Phố cổ Hội An', 200000, ''],
        ['3', '17:20', 'Bay DAD → HAN', 'move', 'Sân bay Đà Nẵng', 1600000, ''],
      ].map(([d, time, title, type, place, cost, note]) => ({ id: uid(), date: day(+d), time, title, type, place, cost, note })),
      expenses: [
        { title: 'Vé máy bay khứ hồi', cat: 'move', amount: 3200000, cur: 'VND', date: addDays(t0, -2) },
        { title: 'Khách sạn 3 đêm (đặt cọc)', cat: 'stay', amount: 2400000, cur: 'VND', date: addDays(t0, -1) },
        { title: 'Vé Bà Nà Hills', cat: 'fun', amount: 500000, cur: 'VND', date: t0 },
        { title: 'Đồ lặn ngắm san hô (mua online)', cat: 'shop', amount: 35, cur: 'USD', date: t0 },
      ].map((e) => { const rr = e.cur === 'VND' ? 1 : r(e.cur); return { ...e, id: uid(), rate: rr, conv: e.amount * rr, reimb: false, created: Date.now() }; }),
      checklist: CHECK_TPL.travel.map((x, i) => ({ id: uid(), t: x, done: i < 2 })) };
    const P = { id: uid(), name: 'Sa Pa mùa lúa chín (mẫu)', type: 'travel', emoji: '⛰️', start: addDays(t0, -40), end: addDays(t0, -37), provinces: ['laocai'], currency: 'VND', budget: 6000000, catBudgets: {}, items: [],
      expenses: [{ id: uid(), title: 'Xe giường nằm', cat: 'move', amount: 900000, cur: 'VND', rate: 1, conv: 900000, date: addDays(t0, -40), reimb: false, created: Date.now() }, { id: uid(), title: 'Homestay', cat: 'stay', amount: 1800000, cur: 'VND', rate: 1, conv: 1800000, date: addDays(t0, -40), reimb: false, created: Date.now() }],
      checklist: [] };
    S.trips.push(T, P);
    for (const [k, places] of Object.entries({ hanoi: ['Hồ Gươm', 'Phố cổ'], quangninh: ['Vịnh Hạ Long'], ninhbinh: ['Tràng An', 'Tam Cốc'], hcm: ['Chợ Bến Thành', 'Vũng Tàu'] })) S.visited[k] = { manual: true, places, note: '' };
    S.visited.laocai = { manual: false, places: ['Sa Pa', 'Fansipan'], note: '' };
    S.ui.tripId = id; planDay = null; save(); go('home'); toast('Đã thêm chuyến mẫu — có thể xoá trong phần sửa chuyến');
  }

  // ---------- khởi động ----------
  $$('[data-tab]').forEach((b) => b.onclick = () => go(b.dataset.tab));
  $('#fab').onclick = () => expenseForm(null);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshRates(false); rerender(); } });
  (async () => {
    await loadReceipts();
    pickDefaultTrip();
    go(S.ui.tab || 'home');
    refreshRates(false);
  })();
})();
