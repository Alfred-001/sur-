/*
 * Restaurant dashboard: overview, create listing, manage listings,
 * reservations, and donation offers (kept separate from sales).
 */
(function () {
  'use strict';
  const { h } = App;

  let listingFilter = 'ACTIVE';
  let reservationFilter = '';
  let prefill = null; // used by "Relist" to pre-populate the new-listing form

  App.views.restaurant = function (route, user) {
    const r = Store.restaurantOf(user.id);
    const tabs = { overview, new: newListing, listings, reservations, donations };
    const fn = tabs[route.tab] || overview;
    return h('div', { class: 'container' }, header(r, route.tab), fn(user, r));
  };

  const TITLES = { overview: 'Overview', new: 'Create a listing', listings: 'Manage listings', reservations: 'Reservations', donations: 'Donations' };
  function header(r, tab) {
    return h('div', { class: 'dash-head' },
      h('div', null, h('h1', null, TITLES[tab] || 'Overview'), h('p', null, r.name, ' · ', r.pickup_address, ' · ', h('span', { class: 'badge' }, 'Demo-verified'))),
      h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => { App.render(); App.toast('Dashboard refreshed.'); } }, 'Refresh'));
  }

  // small helper: a modal that asks for one line of text
  function promptModal(o) {
    return new Promise((resolve) => {
      let answered = false;
      const ta = App.field({ label: o.label, name: 'text', type: 'textarea', rows: 3, required: true, maxlength: 200, hint: o.hint });
      const err = h('div', { class: 'field-error', role: 'alert' });
      const finish = (v) => { answered = true; m.close(); resolve(v); };
      const m = App.openModal({
        title: o.title, size: 'narrow', body: h('div', null, o.message ? h('p', null, o.message) : null, ta, err),
        footer: [
          h('button', { type: 'button', class: 'btn btn-outline', onclick: () => finish(null) }, 'Cancel'),
          h('button', { type: 'button', class: 'btn ' + (o.danger ? 'btn-danger' : ''), onclick: () => {
            const v = ta.querySelector('textarea').value.trim();
            if (!v) { err.textContent = 'Please enter a reason.'; return; }
            finish(v);
          } }, o.confirmText || 'Confirm'),
        ],
        onClose: () => { if (!answered) resolve(null); },
      });
    });
  }

  const stat = (cls, n, label, note) => h('div', { class: 'stat ' + cls }, h('strong', null, n), h('span', null, label), note ? h('span', { class: 'stat-note' }, note) : null);

  // ====================================================================
  // OVERVIEW
  // ====================================================================
  function overview(user) {
    const s = Store.restaurantStats(user.id);
    const recent = Store.ordersFor(user.id).slice(0, 5);
    return h('div', null,
      h('p', { class: 'stat-group-title' }, 'Current inventory (live)'),
      h('div', { class: 'stat-grid thirds' },
        stat('green', s.activeListings, 'Active listings'),
        stat('green', s.portionsAvailable, 'Portions available now'),
        stat('sage', s.portionsListedTotal, 'Total portions listed', 'All listings, all time')),
      h('p', { class: 'stat-group-title' }, 'In progress'),
      h('div', { class: 'stat-grid thirds' }, stat('amber', s.confirmedReservations, 'Confirmed reservations', 'Waiting to be collected')),
      h('p', { class: 'stat-group-title' }, 'Completed transactions'),
      h('div', { class: 'stat-grid thirds' },
        stat('green', s.completedPickups, 'Completed pickups'),
        stat('green', App.money(s.revenue), 'Revenue from completed demo sales', 'Demo only: no payments are processed'),
        stat('green', s.donationsCompleted, 'Donations completed', 'Collected by an organization')),
      h('p', { class: 'small muted', style: 'margin-top:.75rem' }, 'All figures are counted from recorded orders and donations. Cancelled and uncollected orders are never counted as sales. No estimates are shown.'),
      h('div', { class: 'panel', style: 'margin-top:1.5rem' },
        h('div', { class: 'section-head', style: 'margin-bottom:.75rem' }, h('h2', { style: 'margin:0' }, 'Latest reservations'), h('a', { class: 'btn btn-outline btn-sm', href: '#/restaurant/reservations' }, 'See all')),
        recent.length ? ordersTable(recent, false) : h('div', { class: 'empty' }, 'No reservations yet.')),
      h('div', { class: 'actions' },
        h('a', { class: 'btn btn-amber', href: '#/restaurant/new' }, 'Create a listing'),
        h('a', { class: 'btn btn-outline', href: '#/restaurant/donations' }, 'Offer a donation')));
  }

  // ====================================================================
  // CREATE LISTING
  // ====================================================================
  function newListing(user) {
    const now = Date.now();
    const p = prefill; prefill = null;
    const v = p || {
      name: 'Mixed Veg Pulao', description: 'Fragrant pulao with seasonal vegetables and raita.', category: 'Meals', dietary_type: 'VEG',
      original_price: '140', discounted_price: '70', quantity: '6', ingredients: 'Basmati rice, carrot, beans, peas, spices, yoghurt',
      allergens: 'Contains milk products.', pickup_instructions: 'Show your order code at the counter.', image_url: '',
    };
    const f = {
      name: App.field({ label: 'Food name', name: 'name', value: v.name, required: true, maxlength: 80 }),
      category: App.field({ label: 'Food category', name: 'category', type: 'select', value: v.category, options: ['Meals', 'Snacks', 'Healthy', 'Bakery', 'Desserts'].map((x) => [x, x]) }),
      diet: App.field({ label: 'Vegetarian / non-vegetarian', name: 'dietary_type', type: 'select', value: v.dietary_type, options: [['VEG', 'Vegetarian'], ['NON_VEG', 'Non-vegetarian']] }),
      desc: App.field({ label: 'Description', name: 'description', type: 'textarea', value: v.description, full: true, maxlength: 400 }),
      orig: App.field({ label: 'Original price (₹)', name: 'original_price', type: 'number', min: 0, step: '0.01', value: v.original_price, required: true }),
      disc: App.field({ label: 'Discounted price (₹)', name: 'discounted_price', type: 'number', min: 0, step: '0.01', value: v.discounted_price, required: true }),
      qty: App.field({ label: 'Quantity available', name: 'quantity', type: 'number', min: 1, step: 1, value: v.quantity, required: true }),
      prep: App.field({ label: 'Prepared at', name: 'prepared_at', type: 'datetime-local', value: App.toLocalInput(now - 3600000), required: true }),
      start: App.field({ label: 'Collection starts', name: 'collection_start', type: 'datetime-local', value: App.toLocalInput(now), required: true, hint: 'Set a future time to allow pre-booking.' }),
      end: App.field({ label: 'Collection deadline', name: 'collection_deadline', type: 'datetime-local', value: App.toLocalInput(now + 3 * 3600000), required: true }),
      ing: App.field({ label: 'Ingredients', name: 'ingredients', type: 'textarea', value: v.ingredients, full: true, required: true, maxlength: 400 }),
      all: App.field({ label: 'Allergen information', name: 'allergens', type: 'textarea', value: v.allergens, full: true, maxlength: 300, hint: 'e.g. contains nuts, gluten, milk' }),
      pick: App.field({ label: 'Pickup instructions', name: 'pickup_instructions', type: 'textarea', value: v.pickup_instructions, full: true, required: true, maxlength: 400 }),
      img: App.field({ label: 'Food image URL (optional)', name: 'image_url', type: 'url', value: v.image_url, full: true, hint: 'Leave blank to use a local placeholder. The app works fully offline without a photo.' }),
      decl: App.checkField({ name: 'safety_declaration', label: 'I confirm this food was prepared today, has been stored and handled safely, is within its collection window and meets the prototype\'s eligibility and handling requirements. (Self-declaration; it does not guarantee food safety.)' }),
    };
    const submit = h('button', { type: 'submit', class: 'btn btn-amber' }, 'Publish listing');
    const form = h('form', { class: 'panel', novalidate: true, 'aria-label': 'Create a food listing' },
      p ? h('div', { class: 'notice', style: 'margin-top:0' }, 'Relisting creates a brand-new listing with fresh times and a new declaration. The expired one stays expired.') : null,
      h('div', { class: 'form-grid' }, Object.values(f)),
      h('div', { class: 'form-actions' }, submit, h('a', { class: 'btn btn-outline', href: '#/restaurant/listings' }, 'Cancel')));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      App.formError(form, '');
      form.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
      const val = (k) => form.elements[k].value;
      const input = {
        name: val('name'), description: val('description'), category: val('category'), dietary_type: val('dietary_type'),
        original_price: val('original_price'), discounted_price: val('discounted_price'), quantity: val('quantity'),
        prepared_at: App.fromLocalInput(val('prepared_at')), collection_start: App.fromLocalInput(val('collection_start')),
        collection_deadline: App.fromLocalInput(val('collection_deadline')), ingredients: val('ingredients'), allergens: val('allergens'),
        pickup_instructions: val('pickup_instructions'), image_url: val('image_url'), safety_declaration: form.elements.safety_declaration.checked,
      };
      try {
        const l = await App.run(submit, () => Store.createListing(user.id, input)); // validated again inside the data layer
        App.toast('"' + l.name + '" is live in the customer marketplace.', 'success');
        listingFilter = 'ACTIVE';
        App.go('/restaurant/listings');
      } catch (err) {
        if (err instanceof Store.StoreError) {
          App.formError(form, err.message);
          const map = [[/name/i, 'name'], [/quantity/i, 'quantity'], [/discounted/i, 'discounted_price'], [/original/i, 'original_price'], [/deadline|expired/i, 'collection_deadline'], [/prepar/i, 'prepared_at'], [/declaration/i, 'safety_declaration'], [/pickup/i, 'pickup_instructions'], [/ingredient/i, 'ingredients']];
          const hit = map.find(([re]) => re.test(err.message));
          if (hit && form.elements[hit[1]]) { form.elements[hit[1]].setAttribute('aria-invalid', 'true'); form.elements[hit[1]].focus(); }
        } else App.handleError(err);
      }
    });
    return form;
  }

  // ====================================================================
  // MANAGE LISTINGS
  // ====================================================================
  function listings(user, r) {
    Store.sweep();
    const all = Store.get().listings.filter((l) => l.restaurant_id === r.id).map((l) => Store.getListing(l.id)).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const shown = listingFilter === 'ALL' ? all : all.filter((l) => (listingFilter === 'ACTIVE' ? l.status === 'ACTIVE' || l.status === 'SOLD_OUT' : l.status === listingFilter));
    const orders = Store.ordersFor(user.id);
    const sel = h('select', { id: 'lf', onchange: (e) => { listingFilter = e.target.value; App.render(); } },
      [['ACTIVE', 'Active & sold out'], ['EXPIRED', 'Expired'], ['WITHDRAWN', 'Withdrawn'], ['ALL', 'All']].map(([v, t]) => h('option', { value: v, selected: v === listingFilter }, t)));
    return h('div', null,
      h('div', { class: 'section-head' },
        h('div', { class: 'field', style: 'max-width:14rem' }, h('label', { for: 'lf' }, 'Show'), sel),
        h('a', { class: 'btn btn-amber', href: '#/restaurant/new' }, '+ New listing')),
      shown.length ? h('div', { class: 'table-wrap' }, h('table', null,
        h('caption', { class: 'sr-only' }, 'Your food listings'),
        h('thead', null, h('tr', null, ['Food', 'Status', 'Remaining', 'Reservations', 'Price', 'Collect by', 'Actions'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', null, shown.map((l) => listingRow(l, orders)))))
        : h('div', { class: 'empty' }, h('h3', null, 'No listings here'), h('p', null, 'Nothing matches this filter yet.'), h('a', { class: 'btn', href: '#/restaurant/new' }, 'Create a listing')));
  }

  function listingRow(l, orders) {
    const mine = orders.filter((o) => o.listing_id === l.id);
    const conf = mine.filter((o) => o.status === 'CONFIRMED').length;
    const done = mine.filter((o) => o.status === 'COLLECTED').length;
    const editable = l.status === 'ACTIVE' || l.status === 'SOLD_OUT';
    return h('tr', null,
      h('td', null, h('strong', null, l.name), h('div', null, App.dietBadge(l.dietary_type))),
      h('td', null, App.listingBadge(l.status)),
      h('td', null, l.quantity_available + ' / ' + l.initial_quantity),
      h('td', null, conf + ' confirmed', h('br'), done + ' collected'),
      h('td', null, h('s', { class: 'muted' }, App.money(l.original_price)), ' ', h('strong', null, App.money(l.discounted_price))),
      h('td', null, App.dateTime(l.collection_deadline), h('div', { class: 'small muted' }, l.status === 'EXPIRED' ? 'passed' : App.timeLeft(l.collection_deadline))),
      h('td', null, h('div', { class: 'actions' },
        editable ? h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => editListing(l) }, 'Edit') : null,
        editable ? h('button', { type: 'button', class: 'btn btn-danger btn-sm', onclick: () => withdraw(l) }, 'Withdraw') : null,
        editable ? h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => report(l) }, 'Report issue') : null,
        !editable ? h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => { prefill = relistValues(l); App.go('/restaurant/new'); } }, 'Relist (revalidate)') : null,
        h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => stockLog(l) }, 'Audit log'))));
  }

  function relistValues(l) {
    return { name: l.name, description: l.description, category: l.category, dietary_type: l.dietary_type, original_price: String(l.original_price / 100), discounted_price: String(l.discounted_price / 100), quantity: String(l.initial_quantity), ingredients: l.ingredients, allergens: l.allergens, pickup_instructions: l.pickup_instructions, image_url: l.image_url };
  }

  function editListing(l) {
    const user = Store.session();
    const f = {
      desc: App.field({ label: 'Description', name: 'description', type: 'textarea', value: l.description }),
      pick: App.field({ label: 'Pickup instructions', name: 'pickup_instructions', type: 'textarea', value: l.pickup_instructions, required: true }),
      price: App.field({ label: 'Discounted price (₹)', name: 'discounted_price', type: 'number', min: 0, step: '0.01', value: String(l.discounted_price / 100), hint: 'Cannot exceed ' + App.money(l.original_price) + '. Existing orders keep the price they were booked at.' }),
      qty: App.field({ label: 'Correct available quantity', name: 'quantity_available', type: 'number', min: 0, step: 1, value: l.quantity_available, hint: 'Use only to fix a counting mistake. Every correction is logged.' }),
      why: App.field({ label: 'Reason for stock correction', name: 'reason', value: '', hint: 'Required if you change the quantity.' }),
    };
    const form = h('form', { class: 'inline-form', novalidate: true }, Object.values(f));
    const saveBtn = h('button', { type: 'submit', class: 'btn btn-amber' }, 'Save changes');
    const m = App.openModal({ title: 'Edit: ' + l.name, body: form });
    m.setFooter([h('button', { type: 'button', class: 'btn btn-outline', onclick: () => m.close() }, 'Cancel'), saveBtn]);
    const submit = async () => {
      App.formError(form, '');
      try {
        await App.run(saveBtn, () => Store.updateListing(user.id, l.id, {
          description: form.elements.description.value, pickup_instructions: form.elements.pickup_instructions.value,
          discounted_price: form.elements.discounted_price.value, quantity_available: form.elements.quantity_available.value, reason: form.elements.reason.value,
        }));
        m.close(); App.toast('Listing updated.', 'success'); App.render();
      } catch (e) { if (e instanceof Store.StoreError) App.formError(form, e.message); else App.handleError(e); }
    };
    saveBtn.addEventListener('click', submit);
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
  }

  async function withdraw(l) {
    const reason = await promptModal({ title: 'Withdraw "' + l.name + '"?', message: 'The listing will be removed from the marketplace and any confirmed reservations will be cancelled. This is logged and cannot be undone.', label: 'Reason', confirmText: 'Withdraw listing', danger: true });
    if (!reason) return;
    try {
      const res = Store.withdrawListing(Store.session().id, l.id, reason);
      App.toast('Listing withdrawn. ' + res.cancelledOrders + ' reservation' + (res.cancelledOrders === 1 ? '' : 's') + ' cancelled.', 'success');
    } catch (e) { App.handleError(e); }
    App.render();
  }

  async function report(l) {
    const text = await promptModal({ title: 'Report a food-safety issue', message: 'Describe the problem (for example a quality or storage concern). Active listings are withdrawn immediately. Demo only: reports are saved locally and not sent to any authority.', label: 'What happened?', confirmText: 'Submit report', danger: true });
    if (!text) return;
    try {
      const res = Store.reportIncident(Store.session().id, l.id, text);
      App.toast(res.withdrawn ? 'Incident recorded and the listing was withdrawn.' : 'Incident recorded.', 'success');
    } catch (e) { App.handleError(e); }
    App.render();
  }

  function stockLog(l) {
    const events = Store.stockEventsFor(l.id).slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const incidents = Store.incidentsFor(l.id);
    const m = App.openModal({
      title: 'Audit log: ' + l.name,
      body: h('div', null,
        events.length ? h('ul', { class: 'stock-log' }, events.map((e) => h('li', null, h('span', null, e.reason, h('div', { class: 'small muted' }, App.dateTime(e.created_at))), h('span', { class: e.change_amount > 0 ? 'pos' : e.change_amount < 0 ? 'neg' : 'muted' }, (e.change_amount > 0 ? '+' : '') + e.change_amount))))
          : h('p', { class: 'muted' }, 'No stock events recorded.'),
        incidents.length ? h('div', null, h('h3', { style: 'margin-top:1rem' }, 'Incident reports'), h('ul', { class: 'stock-log' }, incidents.map((i) => h('li', null, h('span', null, i.text, h('div', { class: 'small muted' }, App.dateTime(i.created_at))))))) : null),
    });
    m.setFooter(h('button', { type: 'button', class: 'btn btn-outline', onclick: () => m.close() }, 'Close'));
  }

  // ====================================================================
  // RESERVATIONS
  // ====================================================================
  function reservations(user) {
    let orders = Store.ordersFor(user.id);
    if (reservationFilter) orders = orders.filter((o) => o.status === reservationFilter);
    const sel = h('select', { id: 'rf', onchange: (e) => { reservationFilter = e.target.value; App.render(); } },
      [['', 'All'], ['CONFIRMED', 'Confirmed'], ['COLLECTED', 'Collected'], ['CANCELLED', 'Cancelled'], ['NO_SHOW', 'Not collected']].map(([v, t]) => h('option', { value: v, selected: v === reservationFilter }, t)));
    return h('div', null,
      h('div', { class: 'field', style: 'max-width:14rem;margin-bottom:1rem' }, h('label', { for: 'rf' }, 'Status'), sel),
      orders.length ? ordersTable(orders, true) : h('div', { class: 'empty' }, h('h3', null, 'No reservations'), h('p', null, 'Reservations from customers will appear here.')));
  }

  function ordersTable(orders, withActions) {
    return h('div', { class: 'table-wrap' }, h('table', null,
      h('caption', { class: 'sr-only' }, 'Reservations'),
      h('thead', null, h('tr', null, ['Order', 'Food', 'Customer (demo)', 'Qty', 'Total', 'Status', 'Collect by'].concat(withActions ? ['Actions'] : []).map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', null, orders.map((o) => h('tr', null,
        h('td', { class: 'mono' }, o.ref),
        h('td', null, o.listing.name),
        h('td', null, o.customer ? o.customer.name : 'Unknown'),
        h('td', null, o.quantity),
        h('td', null, App.money(o.total_amount), h('div', { class: 'small muted' }, 'not paid')),
        h('td', null, App.orderBadge(o.status)),
        h('td', null, App.dateTime(o.listing.collection_deadline)),
        withActions ? h('td', null, o.status === 'CONFIRMED' ? h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'btn btn-sm', onclick: (e) => collect(o, e.currentTarget) }, 'Mark collected'),
          h('button', { type: 'button', class: 'btn btn-danger btn-sm', onclick: () => cancelOrder(o) }, 'Cancel')) : h('span', { class: 'muted small' }, '—')) : null)))));
  }

  async function collect(o, btn) {
    try {
      await App.run(btn, () => Store.collectOrder(Store.session().id, o.id));
      App.toast(o.ref + ' marked as collected.', 'success');
    } catch (e) { App.handleError(e); }
    App.render();
  }
  async function cancelOrder(o) {
    const ok = await App.confirm({ title: 'Cancel reservation?', message: 'Cancel ' + o.ref + ' (' + o.quantity + ' × ' + o.listing.name + ') for ' + o.customer.name + '? Cancelled orders are not counted as sales.', confirmText: 'Cancel reservation', cancelText: 'Keep', danger: true });
    if (!ok) return;
    try {
      const res = Store.cancelOrder(Store.session().id, o.id);
      App.toast(res.stockReturned ? 'Reservation cancelled and portions returned to the listing.' : 'Reservation cancelled. Portions were not returned (listing no longer eligible for sale).', 'success', 5500);
    } catch (e) { App.handleError(e); }
    App.render();
  }

  // ====================================================================
  // DONATIONS (separate from sales)
  // ====================================================================
  function donations(user) {
    const now = Date.now();
    const f = {
      food: App.field({ label: 'Food name', name: 'food_name', value: 'Veg Pulao', required: true, maxlength: 80 }),
      qty: App.field({ label: 'Portions offered', name: 'quantity', type: 'number', min: 1, step: 1, value: '10', required: true }),
      desc: App.field({ label: 'Description', name: 'description', type: 'textarea', value: 'Freshly prepared this evening.', full: true, maxlength: 300 }),
      prep: App.field({ label: 'Prepared at', name: 'prepared_at', type: 'datetime-local', value: App.toLocalInput(now - 3600000), required: true }),
      end: App.field({ label: 'Collection deadline', name: 'collection_deadline', type: 'datetime-local', value: App.toLocalInput(now + 3 * 3600000), required: true }),
      handling: App.field({ label: 'Handling information', name: 'handling_information', type: 'textarea', value: 'Packed in sealed containers. Consume within 4 hours of preparation. Keep covered.', full: true, required: true, maxlength: 400 }),
      decl: App.checkField({ name: 'safety_declaration', label: 'I confirm this food is safe and eligible to donate, was handled hygienically and is within its collection window. (Self-declaration; it does not guarantee food safety.)' }),
    };
    const submit = h('button', { type: 'submit', class: 'btn btn-amber' }, 'Publish donation');
    const form = h('form', { class: 'panel', novalidate: true, 'aria-label': 'Offer a food donation' },
      h('h2', null, 'Offer a donation'),
      h('div', { class: 'notice', style: 'margin-top:0' }, 'Donations are separate from sale listings and are validated on their own. Expired sale listings are never moved here automatically.'),
      h('div', { class: 'form-grid' }, Object.values(f)),
      h('div', { class: 'form-actions' }, submit));
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); App.formError(form, '');
      const val = (k) => form.elements[k].value;
      try {
        await App.run(submit, () => Store.createDonation(user.id, {
          food_name: val('food_name'), quantity: val('quantity'), description: val('description'), prepared_at: App.fromLocalInput(val('prepared_at')),
          collection_deadline: App.fromLocalInput(val('collection_deadline')), handling_information: val('handling_information'), safety_declaration: form.elements.safety_declaration.checked,
        }));
        App.toast('Donation offer published for organizations.', 'success'); App.render();
      } catch (err) { if (err instanceof Store.StoreError) App.formError(form, err.message); else App.handleError(err); }
    });

    const list = Store.listDonations(user.id);
    return h('div', null, form,
      h('h2', null, 'Your donation offers'),
      list.length ? h('div', { class: 'table-wrap' }, h('table', null,
        h('caption', { class: 'sr-only' }, 'Your donation offers'),
        h('thead', null, h('tr', null, ['Food', 'Portions', 'Collect by', 'Status', 'Organization', 'Handed over', 'Actions'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', null, list.map((d) => h('tr', null,
          h('td', null, h('strong', null, d.food_name)),
          h('td', null, d.quantity_available),
          h('td', null, App.dateTime(d.collection_deadline)),
          h('td', null, App.donationBadge(d.status)),
          h('td', null, d.organization ? d.organization.name : '—'),
          h('td', null, d.status === 'COLLECTED' ? d.quantity_handed_over + ' portions' : '—'),
          h('td', null, d.status === 'AVAILABLE' || d.status === 'ACCEPTED' ? h('button', { type: 'button', class: 'btn btn-danger btn-sm', onclick: () => cancelDonation(d) }, 'Cancel') : h('span', { class: 'muted small' }, '—')))))))
        : h('div', { class: 'empty' }, 'No donation offers yet.'));
  }

  async function cancelDonation(d) {
    const ok = await App.confirm({ title: 'Cancel donation offer?', message: 'Cancel "' + d.food_name + '"?' + (d.status === 'ACCEPTED' ? ' An organization has already accepted it.' : ''), confirmText: 'Cancel offer', cancelText: 'Keep', danger: true });
    if (!ok) return;
    try { Store.cancelDonation(Store.session().id, d.id); App.toast('Donation offer cancelled.', 'success'); } catch (e) { App.handleError(e); }
    App.render();
  }
})();
