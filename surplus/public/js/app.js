/*
 * SURPLUS app core: DOM helpers, formatting, router, role switcher, modals, toasts.
 * Views register themselves on App.views (marketplace.js, restaurant.js, donations.js).
 * User-controlled text is ALWAYS inserted with textContent (via h()), never innerHTML.
 */
(function () {
  'use strict';
  const App = { views: {} };
  window.App = App;

  // ---------- tiny DOM builder (safe: strings become text nodes) ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    (function add(list) {
      for (const c of list) {
        if (c == null || c === false) continue;
        if (Array.isArray(c)) add(c);
        else el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
      }
    })(kids);
    return el;
  }
  App.h = h;
  App.clear = (el) => el.replaceChildren();

  // ---------- formatting (INR, Indian locale, browser's local time zone) ----------
  App.money = (paise) => '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });
  App.time = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  App.dateTime = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  App.timeLeft = (iso) => {
    const ms = Date.parse(iso) - Date.now();
    if (ms <= 0) return 'expired';
    const m = Math.floor(ms / 60000);
    if (m < 60) return 'in ' + m + ' min';
    return 'in ' + Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
  };
  // value for <input type="datetime-local"> in local time
  App.toLocalInput = (ms) => {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  };
  App.fromLocalInput = (v) => (v ? new Date(v).toISOString() : '');

  // ---------- badges ----------
  const ORDER_BADGE = { CONFIRMED: ['Confirmed', 'badge-blue'], COLLECTED: ['Collected', 'badge-green'], CANCELLED: ['Cancelled', 'badge-grey'], NO_SHOW: ['Not collected', 'badge-red'] };
  const LISTING_BADGE = { ACTIVE: ['Active', 'badge-green'], SOLD_OUT: ['Sold out', 'badge-amber'], EXPIRED: ['Expired', 'badge-red'], WITHDRAWN: ['Withdrawn', 'badge-grey'] };
  const DONATION_BADGE = { AVAILABLE: ['Available', 'badge-green'], ACCEPTED: ['Accepted', 'badge-blue'], COLLECTED: ['Collected', 'badge-green'], CANCELLED: ['Cancelled', 'badge-grey'], EXPIRED: ['Expired', 'badge-red'] };
  const badgeFrom = (map) => (s) => { const m = map[s] || [s, 'badge-grey']; return h('span', { class: 'badge ' + m[1] }, m[0]); };
  App.orderBadge = badgeFrom(ORDER_BADGE);
  App.listingBadge = badgeFrom(LISTING_BADGE);
  App.donationBadge = badgeFrom(DONATION_BADGE);
  App.dietBadge = (t) => (t === 'VEG' ? h('span', { class: 'badge badge-green' }, '● Vegetarian') : h('span', { class: 'badge badge-nonveg' }, '● Non-vegetarian'));

  // ---------- food image (local emoji placeholder; optional URL with fallback) ----------
  // Local SVG "plate" placeholder (no emoji fonts or external files needed).
  // Colour follows the dish type so cards look varied.
  function plateSvg(l) {
    const NS = 'http://www.w3.org/2000/svg';
    const n = (l.name + ' ' + (l.category || '')).toLowerCase();
    let food = '#C98B3C', dots = ['#E7A54B', '#8a5a1e', '#F6F3EC']; // default: golden rice/curry
    if (/salad|fruit|healthy/.test(n)) { food = '#7fb069'; dots = ['#E7A54B', '#d1495b', '#F6F3EC']; }
    else if (/fish|chicken|biryani|non/.test(n) || l.dietary_type === 'NON_VEG') { food = '#b5651d'; dots = ['#7a3b10', '#E7A54B', '#F6F3EC']; }
    else if (/sandwich|snack|burger|wrap/.test(n)) { food = '#d9a066'; dots = ['#7fb069', '#d1495b', '#F6F3EC']; }
    else if (/thali|meal|rice|pulao|dosa/.test(n)) { food = '#d8b45a'; dots = ['#7fb069', '#c8553d', '#F6F3EC']; }
    const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const svg = el('svg', { viewBox: '0 0 120 120', class: 'emoji plate', 'aria-hidden': 'true', focusable: 'false' });
    svg.appendChild(el('circle', { cx: 60, cy: 62, r: 50, fill: '#FFFFFF', stroke: '#B9CDB9', 'stroke-width': 3 }));
    svg.appendChild(el('circle', { cx: 60, cy: 62, r: 38, fill: '#F6F3EC', stroke: '#e3ece3', 'stroke-width': 2 }));
    svg.appendChild(el('ellipse', { cx: 60, cy: 64, rx: 27, ry: 21, fill: food }));
    let s = 0; for (const c of l.name) s = (s * 31 + c.charCodeAt(0)) >>> 0; // stable pseudo-random per dish
    for (let i = 0; i < 9; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      const a = (s % 360) * Math.PI / 180, r = 4 + (s >> 8) % 17;
      svg.appendChild(el('circle', { cx: (60 + Math.cos(a) * r * 1.2).toFixed(1), cy: (64 + Math.sin(a) * r * 0.85).toFixed(1), r: 3 + (s >> 4) % 3, fill: dots[i % dots.length], opacity: 0.9 }));
    }
    svg.appendChild(el('path', { d: 'M82 30 q12 -4 16 8 q-12 4 -16 -8z', fill: l.dietary_type === 'VEG' ? '#4c9a5f' : '#c8553d' })); // leaf / chilli accent
    return svg;
  }
  App.foodImage = (l, cls) => {
    const emoji = plateSvg(l);
    const box = h('div', { class: cls || 'food-img', 'aria-hidden': 'true' }, emoji);
    if (l.image_url && /^https?:\/\//i.test(l.image_url)) {
      // Optional remote photo; the app works without it. Swap in only if it loads.
      const img = h('img', { src: l.image_url, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
      img.addEventListener('load', () => { emoji.replaceWith(img); });
      img.addEventListener('error', () => { /* keep the local placeholder */ });
    }
    return box;
  };

  // ---------- toasts ----------
  App.toast = (msg, type, ms) => {
    const t = h('div', { class: 'toast ' + (type || '') }, msg);
    document.getElementById('toast-root').appendChild(t);
    setTimeout(() => t.remove(), ms || 4000);
  };
  App.handleError = (e) => {
    if (e instanceof Store.StoreError) App.toast(e.message, 'error', 5500);
    else { console.error(e); App.toast('Something went wrong. Please try again.', 'error'); }
  };

  // Shows a loading state on a button for a moment, then runs fn (errors propagate).
  App.run = async (btn, fn) => {
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }
    await new Promise((r) => setTimeout(r, 280));
    try { return await fn(); } finally { if (btn) { btn.classList.remove('loading'); btn.disabled = false; } }
  };

  // ---------- modal ----------
  let openModals = 0;
  App.modalOpen = () => openModals > 0;
  App.openModal = function (opts) {
    const root = document.getElementById('modal-root');
    const prevFocus = document.activeElement;
    const titleId = 'modal-title-' + Math.random().toString(36).slice(2, 7);
    const titleEl = h('h2', { id: titleId }, opts.title || '');
    const bodyEl = h('div', { class: 'modal-body' });
    const footEl = h('div', { class: 'modal-foot' });
    const closeBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close dialog' }, '×');
    const dialog = h('div', { class: 'modal ' + (opts.size || ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
      h('div', { class: 'modal-head' }, titleEl, closeBtn), bodyEl, footEl);
    const backdrop = h('div', { class: 'modal-backdrop' }, dialog);
    let closed = false;

    const handle = {
      el: dialog,
      setTitle: (t) => { titleEl.textContent = t; },
      setBody: (n) => { bodyEl.replaceChildren(n); },
      setFooter: (n) => { footEl.replaceChildren(...(Array.isArray(n) ? n : n ? [n] : [])); footEl.style.display = footEl.childNodes.length ? '' : 'none'; },
      close: () => {
        if (closed) return; closed = true; openModals--;
        document.removeEventListener('keydown', onKey);
        backdrop.remove();
        if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus();
        if (opts.onClose) opts.onClose();
      },
      focusFirst: () => { const f = dialog.querySelector('input:not([type=hidden]), select, textarea, .modal-foot button, .modal-body button'); (f || closeBtn).focus(); },
    };
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); handle.close(); }
      else if (e.key === 'Tab') { // keep keyboard focus inside the dialog
        const f = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea')].filter((x) => x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    closeBtn.addEventListener('click', handle.close);
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) handle.close(); });
    document.addEventListener('keydown', onKey);
    handle.setBody(opts.body || h('div'));
    handle.setFooter(opts.footer || null);
    root.appendChild(backdrop);
    openModals++;
    setTimeout(handle.focusFirst, 0);
    return handle;
  };

  // Promise-based confirm dialog (used instead of window.confirm)
  App.confirm = (o) => new Promise((resolve) => {
    let answered = false;
    const done = (v) => { answered = true; m.close(); resolve(v); };
    const m = App.openModal({
      title: o.title, size: 'narrow', body: h('p', null, o.message),
      footer: [
        h('button', { type: 'button', class: 'btn btn-outline', onclick: () => done(false) }, o.cancelText || 'Cancel'),
        h('button', { type: 'button', class: 'btn ' + (o.danger ? 'btn-danger' : ''), onclick: () => done(true) }, o.confirmText || 'Confirm'),
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });

  // ---------- form helpers (accessible labels, inline errors) ----------
  let fid = 0;
  App.field = (o) => {
    const id = 'f' + (++fid);
    const control = o.type === 'textarea'
      ? h('textarea', { id, name: o.name, rows: o.rows || 3, placeholder: o.placeholder, maxlength: o.maxlength, required: o.required, value: o.value || '' })
      : o.type === 'select'
        ? h('select', { id, name: o.name, required: o.required }, o.options.map((x) => h('option', { value: x[0], selected: String(x[0]) === String(o.value) }, x[1])))
        : h('input', { id, name: o.name, type: o.type || 'text', value: o.value == null ? '' : o.value, placeholder: o.placeholder, min: o.min, max: o.max, step: o.step, inputmode: o.inputmode, required: o.required, maxlength: o.maxlength });
    if (o.hint) control.setAttribute('aria-describedby', id + '-hint');
    return h('div', { class: 'field ' + (o.full ? 'full' : '') },
      h('label', { for: id }, o.label, o.required ? ' *' : ''), control,
      o.hint ? h('span', { class: 'hint', id: id + '-hint' }, o.hint) : null);
  };
  App.checkField = (o) => {
    const id = 'f' + (++fid);
    return h('div', { class: 'field full' }, h('label', { class: 'check', for: id }, h('input', { type: 'checkbox', id, name: o.name, checked: o.checked }), h('span', null, o.label)));
  };
  App.formError = (form, msg) => {
    let box = form.querySelector('.form-error');
    if (!msg) { if (box) box.remove(); return; }
    if (!box) { box = h('div', { class: 'form-error', role: 'alert' }); form.prepend(box); }
    box.textContent = msg;
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  // ---------- routing ----------
  const HOME = { customer: '/', restaurant: '/restaurant/overview', organization: '/org/available' };
  App.homeFor = (role) => HOME[role] || '/';
  App.go = (path) => { location.hash = '#' + path; };
  let lastPath = null;

  function parseRoute() {
    const path = (location.hash.replace(/^#/, '') || '/').replace(/\/+$/, '') || '/';
    const parts = path.split('/').filter(Boolean);
    if (parts[0] === 'restaurant') return { path, role: 'restaurant', view: 'restaurant', tab: parts[1] || 'overview' };
    if (parts[0] === 'org') return { path, role: 'organization', view: 'org', tab: parts[1] || 'available' };
    if (parts[0] === 'orders') return { path, role: 'customer', view: 'orders' };
    if (['discover', 'how', 'impact'].includes(parts[0])) return { path, role: 'customer', view: 'home', scroll: parts[0] };
    return { path: '/', role: 'customer', view: 'home' };
  }

  App.render = function () {
    const user = Store.session();
    const route = parseRoute();
    if (route.role !== user.role) { App.go(HOME[user.role]); return; } // wrong area for this demo account
    Store.sweep();
    const main = document.getElementById('app');
    const keepScroll = route.path === lastPath ? window.scrollY : 0;
    const view = App.views[route.view];
    try { main.replaceChildren(view ? view(route, user) : h('div', { class: 'container' }, h('div', { class: 'error-box' }, 'Page not found.'))); }
    catch (e) { console.error(e); main.replaceChildren(h('div', { class: 'container' }, h('div', { class: 'error-box' }, h('h3', null, 'Something went wrong'), h('p', null, 'This page could not be displayed. Try the "Reset demo data" link in the footer.')))); }
    renderNav(route, user);
    document.getElementById('brand-link').setAttribute('href', '#' + HOME[user.role]);
    if (route.scroll) { const t = document.getElementById(route.scroll === 'discover' ? 'discover' : route.scroll); if (t) t.scrollIntoView({ block: 'start' }); }
    else window.scrollTo(0, keepScroll);
    lastPath = route.path;
  };

  function renderNav(route, user) {
    const nav = document.getElementById('main-nav');
    let items;
    if (user.role === 'customer') {
      const open = Store.ordersFor(user.id).filter((o) => o.status === 'CONFIRMED').length;
      items = [['Discover Food', '/discover'], ['How It Works', '/how'], ['Impact', '/impact'], ['My Orders', '/orders', open]];
    } else if (user.role === 'restaurant') {
      items = [['Overview', '/restaurant/overview'], ['New listing', '/restaurant/new'], ['Listings', '/restaurant/listings'], ['Reservations', '/restaurant/reservations'], ['Donations', '/restaurant/donations']];
    } else {
      items = [['Available donations', '/org/available'], ['My donations', '/org/mine']];
    }
    nav.replaceChildren(...items.map(([label, path, count]) =>
      h('a', { href: '#' + path, 'aria-current': route.path === path ? 'page' : null }, label, count ? h('span', { class: 'nav-count', 'aria-label': count + ' open' }, count) : null)));
  }

  function renderAccountSwitch() {
    const sel = document.getElementById('account-switch');
    const groups = [['customer', 'Customers'], ['restaurant', 'Restaurants'], ['organization', 'Donation organizations']];
    sel.replaceChildren(...groups.map(([role, label]) =>
      h('optgroup', { label }, Store.users().filter((u) => u.role === role).map((u) => h('option', { value: u.id, selected: u.id === Store.session().id }, u.name)))));
  }

  // ---------- start ----------
  document.addEventListener('DOMContentLoaded', () => {
    renderAccountSwitch();
    document.getElementById('account-switch').addEventListener('change', (e) => {
      Store.setSession(e.target.value);
      const u = Store.session();
      App.toast('Switched to ' + u.name + ' (' + u.role + ' demo account)');
      if (location.hash === '#' + HOME[u.role]) App.render(); else App.go(HOME[u.role]);
    });
    document.getElementById('reset-demo').addEventListener('click', async () => {
      const ok = await App.confirm({ title: 'Reset demo data?', message: 'This restores the original demo restaurants, listings, orders and donations. Anything you created will be removed.', confirmText: 'Reset', danger: true });
      if (!ok) return;
      Store.reset(); renderAccountSwitch(); App.toast('Demo data reset.', 'success'); App.go('/'); App.render();
    });
    window.addEventListener('hashchange', App.render);
    // Periodic expiry sweep: the store re-checks deadlines on every action too,
    // so this timer only keeps the screen current.
    setInterval(() => { if (Store.sweep() && !App.modalOpen()) App.render(); }, 20000);
    App.render();
  });
})();
