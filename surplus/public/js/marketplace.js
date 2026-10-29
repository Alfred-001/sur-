/*
 * Customer experience: landing page, marketplace, details modal,
 * 3-step pre-booking flow, and My Orders.
 */
(function () {
  'use strict';
  const { h } = App;

  // filter state survives re-renders (e.g. after a reservation updates stock)
  const filters = { q: '', maxPrice: '', diet: '', availableOnly: true, sort: 'recent' };
  let firstLoad = true;

  // ====================================================================
  // HOME
  // ====================================================================
  App.views.home = function () {
    return h('div', null, heroSection(), impactSection(), discoverSection(), howSection());
  };

  function heroSection() {
    return h('section', { class: 'hero', 'aria-labelledby': 'hero-title' },
      h('div', { class: 'container' },
        h('div', null,
          h('h1', { id: 'hero-title' }, 'Good food deserves another chance.'),
          h('p', { class: 'lead' }, 'Discover affordable meals from nearby restaurants and help reduce avoidable food waste.'),
          h('div', { class: 'hero-actions' },
            h('a', { class: 'btn btn-amber', href: '#/discover' }, 'Explore Meals'),
            h('a', { class: 'btn btn-ghost-light', href: '#/how' }, 'How It Works'))),
        h('div', { class: 'hero-logo' }, h('img', { src: 'assets/logo.png', alt: 'SURPLUS – Good food lives on', width: 886, height: 428 }))));
  }

  function impactSection() {
    const s = Store.impact();
    const stat = (cls, n, label) => h('div', { class: 'stat ' + cls }, h('strong', null, n), h('span', null, label));
    return h('section', { class: 'impact', id: 'impact', 'aria-labelledby': 'impact-title' },
      h('div', { class: 'container' },
        h('div', { class: 'impact-head' },
          h('h2', { id: 'impact-title' }, 'Impact so far'),
          h('span', { class: 'badge badge-amber' }, 'Demo data')),
        h('div', { class: 'stat-grid' },
          stat('green', s.portionsSold, 'Portions sold (collected)'),
          stat('amber', s.portionsDonated, 'Portions donated (collected by organizations)'),
          stat('sage', s.restaurants, 'Participating demo restaurants'),
          stat('sage', s.activeListings, 'Active listings right now')),
        h('p', { class: 'small muted', style: 'margin:.75rem 0 0' },
          'Sold and donated portions are counted separately and only after pickup is recorded. ', s.portionsReserved, ' reserved portion', s.portionsReserved === 1 ? ' is' : 's are', ' waiting to be collected. Figures are fictional demo data, not real-world impact.')));
  }

  function discoverSection() {
    const grid = h('div', { class: 'grid', id: 'listing-grid', 'aria-live': 'polite' });
    const count = h('p', { class: 'muted', id: 'result-count' });

    function paint() {
      const list = Store.listListings(filters);
      count.textContent = list.length + (list.length === 1 ? ' meal found' : ' meals found');
      if (!list.length) {
        grid.replaceChildren(h('div', { class: 'empty', style: 'grid-column:1/-1' },
          h('h3', null, 'No meals match your filters'),
          h('p', null, 'Try a higher price limit or turn off "Available only" to also see sold-out and expired listings.'),
          h('button', { type: 'button', class: 'btn btn-outline', onclick: clearFilters }, 'Clear filters')));
        return;
      }
      grid.replaceChildren(...list.map(listingCard));
    }

    const q = App.field({ label: 'Search food or restaurant', name: 'q', type: 'search', value: filters.q, placeholder: 'e.g. biryani, Green Leaf' });
    const price = App.field({ label: 'Max price (₹)', name: 'maxPrice', type: 'number', min: 0, step: 10, value: filters.maxPrice, placeholder: 'Any' });
    const diet = App.field({ label: 'Diet', name: 'diet', type: 'select', value: filters.diet, options: [['', 'All'], ['VEG', 'Vegetarian'], ['NON_VEG', 'Non-vegetarian']] });
    const sort = App.field({ label: 'Sort by', name: 'sort', type: 'select', value: filters.sort, options: [['recent', 'Recently listed'], ['price', 'Lowest price'], ['discount', 'Highest discount']] });
    const avail = App.checkField({ label: 'Available only', name: 'availableOnly', checked: filters.availableOnly });
    avail.classList.remove('full');
    const clearBtn = h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: clearFilters }, 'Clear');

    const read = () => {
      filters.q = q.querySelector('input').value;
      filters.maxPrice = price.querySelector('input').value;
      filters.diet = diet.querySelector('select').value;
      filters.sort = sort.querySelector('select').value;
      filters.availableOnly = avail.querySelector('input').checked;
      paint();
    };
    [q, price, diet, sort, avail].forEach((f) => { f.addEventListener('input', read); f.addEventListener('change', read); });

    function clearFilters() {
      Object.assign(filters, { q: '', maxPrice: '', diet: '', availableOnly: true, sort: 'recent' });
      App.render();
    }

    // first visit shows skeleton placeholders briefly (loading state)
    if (firstLoad) {
      firstLoad = false;
      grid.replaceChildren(...[1, 2, 3].map(() => h('div', { class: 'skeleton' })));
      setTimeout(paint, 350);
    } else paint();

    return h('section', { class: 'section', id: 'discover', 'aria-labelledby': 'discover-title' },
      h('div', { class: 'container' },
        h('div', { class: 'section-head' },
          h('div', null, h('h2', { id: 'discover-title' }, 'Discover surplus meals'), count),
          h('p', { class: 'small muted' }, 'Pre-book meals that open later today, or reserve ones ready now.')),
        h('form', { class: 'filters', onsubmit: (e) => e.preventDefault(), role: 'search', 'aria-label': 'Filter meals' },
          q, price, diet, sort, h('div', { class: 'field' }, avail, clearBtn)),
        grid,
        h('div', { class: 'notice' }, 'Food listings are provided by participating restaurants. Appropriate food handling and storage remain essential.')));
  }

  function listingCard(l) {
    const soldOut = l.status === 'SOLD_OUT';
    const expired = l.status === 'EXPIRED';
    const disabled = soldOut || expired;
    const ctaText = expired ? 'Expired' : soldOut ? 'Sold out' : l.is_prebook ? 'Pre-book' : 'Reserve';
    const open = () => openListing(l.id);
    const card = h('article', { class: 'card clickable' + (disabled ? ' dim' : ''), onclick: open },
      h('div', { class: 'food-img-wrap' }, (() => {
        const img = App.foodImage(l);
        img.appendChild(h('span', { class: 'badge badge-amber badge-corner' }, l.discount_pct + '% off'));
        if (expired) img.appendChild(h('span', { class: 'badge badge-red badge-corner-r' }, 'Expired'));
        else if (soldOut) img.appendChild(h('span', { class: 'badge badge-grey badge-corner-r' }, 'Sold out'));
        else if (l.is_prebook) img.appendChild(h('span', { class: 'badge badge-blue badge-corner-r' }, 'Pre-book'));
        return img;
      })()),
      h('div', { class: 'card-body' },
        h('h3', null, l.name),
        h('p', { class: 'rest-name' }, l.restaurant.name),
        h('div', { class: 'price-row' }, h('s', { 'aria-label': 'Original price' }, App.money(l.original_price)), h('span', { class: 'now' }, App.money(l.discounted_price))),
        h('div', { class: 'tags' }, App.dietBadge(l.dietary_type)),
        h('ul', { class: 'meta-list' },
          h('li', null, disabled ? 'No portions available' : l.quantity_available + ' portion' + (l.quantity_available === 1 ? '' : 's') + ' left'),
          h('li', null, l.is_prebook ? 'Opens ' + App.time(l.collection_start) + ' · collect by ' + App.time(l.collection_deadline) : 'Collect by ' + App.time(l.collection_deadline) + (expired ? '' : ' (' + App.timeLeft(l.collection_deadline) + ')')),
          l.allergens ? h('li', { title: l.allergens }, 'Allergens: ' + (l.allergens.length > 46 ? l.allergens.slice(0, 44) + '…' : l.allergens)) : null),
        h('div', { class: 'card-foot' },
          h('button', { type: 'button', class: 'btn btn-block ' + (disabled ? 'btn-outline' : ''), 'aria-label': ctaText + ': ' + l.name }, disabled ? 'View details' : ctaText))));
    return card;
  }

  function howSection() {
    return h('section', { class: 'section', id: 'how', 'aria-labelledby': 'how-title', style: 'background:var(--white);border-top:1px solid var(--border)' },
      h('div', { class: 'container' },
        h('h2', { id: 'how-title' }, 'How SURPLUS works'),
        h('ol', { class: 'steps' },
          h('li', null, h('h3', null, 'Restaurants list surplus'), h('p', { class: 'muted' }, 'Eligible, unsold prepared food is listed at a discount with ingredients, allergens, a handling declaration and a collection deadline.')),
          h('li', null, h('h3', null, 'You pre-book or reserve'), h('p', { class: 'muted' }, 'Pick a quantity and pickup slot, review the total and confirm. You get an order reference and pickup code. Demo only: no payment is collected.')),
          h('li', null, h('h3', null, 'Collect before the deadline'), h('p', { class: 'muted' }, 'Show your code at the counter. The restaurant marks the order collected. Uncollected food is never resold automatically.')),
          h('li', null, h('h3', null, 'Donations stay separate'), h('p', { class: 'muted' }, 'Restaurants can also post separate donation offers. Verified organizations accept and collect them. Expired food is never moved to donation.'))),
        h('div', { class: 'notice' }, 'Safety controls here (declarations, deadlines, handling notes, listing withdrawal and incident reporting) support good practice but do not by themselves guarantee food safety.')));
  }

  // ====================================================================
  // LISTING DETAILS MODAL
  // ====================================================================
  function openListing(id) {
    const l = Store.getListing(id);
    if (!l) { App.toast('This listing no longer exists.', 'error'); return; }
    const m = App.openModal({ title: l.name, size: 'wide', body: h('div') });
    showDetails(m, id);
  }

  function showDetails(m, id) {
    const l = Store.getListing(id);
    const user = Store.session();
    m.setTitle(l.name);
    const sellable = l.status === 'ACTIVE' && l.quantity_available > 0;
    const save = l.original_price - l.discounted_price;

    m.setBody(h('div', null,
      App.foodImage(l, 'detail-hero'),
      h('div', { class: 'tags' }, App.dietBadge(l.dietary_type), App.listingBadge(l.status), l.is_prebook ? h('span', { class: 'badge badge-blue' }, 'Pre-book') : null, h('span', { class: 'badge' }, l.category)),
      l.description ? h('p', { style: 'margin-top:.75rem' }, l.description) : null,
      h('div', { class: 'summary' },
        h('div', { class: 'row' }, h('span', null, 'Original price'), h('s', null, App.money(l.original_price))),
        h('div', { class: 'row total' }, h('span', null, 'Surplus price (' + l.discount_pct + '% off)'), h('span', null, App.money(l.discounted_price))),
        h('div', { class: 'row' }, h('span', null, 'You save per portion'), h('span', null, App.money(save)))),
      h('dl', { class: 'detail-grid' },
        h('div', null, h('dt', null, 'Restaurant'), h('dd', null, l.restaurant.name), h('dd', { class: 'small muted' }, l.restaurant.pickup_address), h('dd', null, h('span', { class: 'badge' }, l.restaurant.verification_status === 'DEMO_VERIFIED' ? 'Demo-verified restaurant' : 'Unverified'))),
        h('div', null, h('dt', null, 'Remaining quantity'), h('dd', null, l.quantity_available + ' portion' + (l.quantity_available === 1 ? '' : 's')),
          h('dt', null, 'Collection window'), h('dd', null, App.dateTime(l.collection_start) + ' to ' + App.dateTime(l.collection_deadline)), h('dd', { class: 'small muted' }, l.status === 'EXPIRED' ? 'Deadline has passed' : 'Deadline ' + App.timeLeft(l.collection_deadline))),
        h('div', null, h('dt', null, 'Prepared at'), h('dd', null, l.prepared_at ? App.dateTime(l.prepared_at) : 'Not supplied')),
        h('div', null, h('dt', null, 'Food-safety declaration'), h('dd', null, l.safety_declaration ? 'Restaurant has declared eligibility and handling checks (self-declared, not independently verified).' : 'Not declared')),
        h('div', { class: 'full' }, h('dt', null, 'Ingredients'), h('dd', null, l.ingredients || 'Not provided')),
        h('div', { class: 'full' }, h('dt', null, 'Allergen information'), h('dd', null, l.allergens || 'No allergen information supplied. Ask the restaurant before eating if you have allergies.')),
        h('div', { class: 'full' }, h('dt', null, 'Pickup instructions'), h('dd', null, l.pickup_instructions))),
      h('div', { class: 'notice' }, 'Food listings are provided by participating restaurants. Appropriate food handling and storage remain essential.'),
      demoTools(l, user)));

    m.setFooter([
      h('button', { type: 'button', class: 'btn btn-outline', onclick: m.close }, 'Close'),
      h('button', { type: 'button', class: 'btn btn-amber', disabled: !sellable, onclick: () => startBooking(m, id) },
        l.status === 'EXPIRED' ? 'Expired' : l.status === 'SOLD_OUT' ? 'Sold out' : l.status === 'WITHDRAWN' ? 'Withdrawn' : l.is_prebook ? 'Pre-book this meal' : 'Reserve this meal'),
    ]);
  }

  // Lets a presenter prove the rules are enforced by the data layer, not just the buttons.
  function demoTools(l, user) {
    const attempt = (qty, label) => () => {
      try {
        const slot = new Date(Math.max(Date.parse(l.collection_start), Date.now()) + 60000).toISOString();
        Store.reserve(user.id, l.id, qty, slot);
        App.toast('Unexpected: reservation succeeded.', 'error');
      } catch (e) { App.handleError(e); }
      App.render();
    };
    return h('details', { class: 'demo-tools' },
      h('summary', null, 'Demo: test the rules'),
      h('p', { class: 'small muted' }, 'These buttons call the same reservation logic as the real flow and show how invalid requests are rejected.'),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: attempt(l.quantity_available + 1) }, 'Try to reserve more than available'),
        h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: attempt(1) }, 'Try to reserve 1 portion anyway')));
  }

  // ====================================================================
  // PRE-BOOKING FLOW (3 steps, inside the modal)
  // ====================================================================
  function slotsFor(l) {
    const out = [];
    let t = Math.max(Date.parse(l.collection_start), Date.now());
    t = Math.ceil(t / 900000) * 900000; // next 15 minutes
    const end = Date.parse(l.collection_deadline);
    for (; t < end && out.length < 8; t += 1800000) out.push(new Date(t).toISOString());
    return out;
  }

  function stepper(n) {
    return h('ol', { class: 'stepper', 'aria-label': 'Booking steps' },
      ['Quantity & slot', 'Review', 'Confirmed'].map((label, i) =>
        h('li', { class: i + 1 < n ? 'done' : i + 1 === n ? 'current' : '', 'aria-current': i + 1 === n ? 'step' : null }, (i + 1) + '. ' + label)));
  }

  function startBooking(m, id, draft) {
    const l = Store.getListing(id);
    const user = Store.session();
    const d = draft || { qty: 1, slot: '', error: '' };
    if (user.role !== 'customer') { App.toast('Switch to a customer demo account to reserve.', 'error'); return; }
    if (!l || l.status !== 'ACTIVE' || l.quantity_available <= 0) { showDetails(m, id); App.toast('This meal is no longer available.', 'error'); return; }
    const slots = slotsFor(l);
    if (!d.slot || !slots.includes(d.slot)) d.slot = slots[0] || '';
    d.qty = Math.max(1, Math.min(d.qty, l.quantity_available, Store.MAX_PER_ORDER));
    m.setTitle(l.is_prebook ? 'Pre-book: ' + l.name : 'Reserve: ' + l.name);

    const qtyInput = h('input', { type: 'number', id: 'qty-input', min: 1, value: d.qty, inputmode: 'numeric', 'aria-label': 'Quantity' });
    const minus = h('button', { type: 'button', 'aria-label': 'Decrease quantity' }, '−');
    const plus = h('button', { type: 'button', 'aria-label': 'Increase quantity' }, '+');
    const totalEl = h('strong', null);
    const errEl = h('div', { class: 'field-error', role: 'alert' });
    const sync = () => {
      const q = parseInt(qtyInput.value, 10);
      const valid = Number.isInteger(q) && q >= 1;
      minus.disabled = !valid || q <= 1;
      plus.disabled = !valid || q >= Math.min(l.quantity_available, Store.MAX_PER_ORDER);
      totalEl.textContent = valid ? App.money(q * l.discounted_price) : '—';
      errEl.textContent = '';
    };
    minus.onclick = () => { qtyInput.value = Math.max(1, (parseInt(qtyInput.value, 10) || 1) - 1); sync(); };
    plus.onclick = () => { qtyInput.value = Math.min(l.quantity_available, Store.MAX_PER_ORDER, (parseInt(qtyInput.value, 10) || 0) + 1); sync(); };
    qtyInput.addEventListener('input', sync);

    const slotSel = App.field({ label: 'Pickup slot', name: 'slot', type: 'select', value: d.slot, options: slots.length ? slots.map((s) => [s, App.time(s)]) : [['', 'No slots left']], hint: 'Collection window ' + App.time(l.collection_start) + ' to ' + App.time(l.collection_deadline) });

    m.setBody(h('div', null, stepper(1),
      d.error ? h('div', { class: 'form-error', role: 'alert' }, d.error) : null,
      h('div', { class: 'field' }, h('label', { for: 'qty-input' }, 'How many portions? (' + l.quantity_available + ' left, max ' + Store.MAX_PER_ORDER + ' per order)'), h('div', null, h('div', { class: 'qty' }, minus, qtyInput, plus)), errEl),
      h('div', { style: 'margin-top:1rem' }, slotSel),
      h('div', { class: 'summary' },
        h('div', { class: 'row' }, h('span', null, 'Price per portion'), h('span', null, App.money(l.discounted_price))),
        h('div', { class: 'row total' }, h('span', null, 'Total'), totalEl)),
      h('div', { class: 'notice' }, 'Demo reservation — no payment will be collected.')));
    sync();
    m.setFooter([
      h('button', { type: 'button', class: 'btn btn-outline', onclick: () => showDetails(m, id) }, 'Back'),
      h('button', { type: 'button', class: 'btn btn-amber', onclick: () => {
        const q = parseInt(qtyInput.value, 10);
        if (!Number.isInteger(q) || q < 1) { errEl.textContent = 'Enter a whole number of at least 1.'; return; }
        const fresh = Store.getListing(id);
        if (q > fresh.quantity_available) { errEl.textContent = 'Only ' + fresh.quantity_available + ' left. Please lower your quantity.'; return; }
        if (!slotSel.querySelector('select').value) { errEl.textContent = 'No pickup slots are left for this listing.'; return; }
        reviewStep(m, id, { qty: q, slot: slotSel.querySelector('select').value, error: '' });
      } }, 'Continue to review'),
    ]);
    m.focusFirst();
  }

  function reviewStep(m, id, d) {
    const l = Store.getListing(id);
    const user = Store.session();
    const agree = App.checkField({ name: 'agree', label: 'I will collect within my pickup slot, and I understand that food handling and storage remain essential.' });
    const agreeInput = agree.querySelector('input');
    const errEl = h('div', { class: 'field-error', role: 'alert' });
    const confirmBtn = h('button', { type: 'button', class: 'btn btn-amber' }, 'Confirm reservation');

    m.setTitle('Review your reservation');
    m.setBody(h('div', null, stepper(2),
      h('div', { class: 'summary' },
        h('div', { class: 'row' }, h('span', null, 'Meal'), h('strong', null, l.name)),
        h('div', { class: 'row' }, h('span', null, 'Restaurant'), h('span', null, l.restaurant.name)),
        h('div', { class: 'row' }, h('span', null, 'Quantity'), h('span', null, d.qty + ' × ' + App.money(l.discounted_price))),
        h('div', { class: 'row' }, h('span', null, 'Pickup slot'), h('span', null, App.time(d.slot))),
        h('div', { class: 'row' }, h('span', null, 'Collect at'), h('span', null, l.restaurant.pickup_address)),
        h('div', { class: 'row total' }, h('span', null, 'Total'), h('span', null, App.money(d.qty * l.discounted_price)))),
      h('div', { class: 'notice' }, 'Demo reservation — no payment will be collected. The order will show as "Confirmed", not as paid.'),
      agree, errEl));
    m.setFooter([
      h('button', { type: 'button', class: 'btn btn-outline', onclick: () => startBooking(m, id, d) }, 'Back'),
      confirmBtn,
    ]);

    confirmBtn.onclick = async () => {
      if (!agreeInput.checked) { errEl.textContent = 'Please tick the box to confirm.'; agreeInput.focus(); return; }
      errEl.textContent = '';
      try {
        // The data layer re-checks stock, expiry and price at this exact moment.
        const order = await App.run(confirmBtn, () => Store.reserve(user.id, id, d.qty, d.slot));
        App.render(); // marketplace + nav counts update immediately behind the modal
        confirmedStep(m, order);
      } catch (e) {
        if (e instanceof Store.StoreError) {
          App.render(); // refresh the listing behind the modal
          d.error = e.message;
          startBooking(m, id, d); // returns to step 1 with a clear message and fresh stock
        } else App.handleError(e);
      }
    };
  }

  function confirmedStep(m, order) {
    m.setTitle('Reservation confirmed');
    m.setBody(h('div', null, stepper(3), ticketNode(order)));
    m.setFooter([
      h('button', { type: 'button', class: 'btn btn-outline', onclick: m.close }, 'Keep browsing'),
      h('button', { type: 'button', class: 'btn', onclick: () => { m.close(); App.go('/orders'); } }, 'View my orders'),
    ]);
    m.focusFirst();
  }

  // Deterministic mock "QR" so each ticket looks distinct. It is NOT a scannable code.
  function mockQr(seedStr) {
    const N = 25, NS = 'http://www.w3.org/2000/svg';
    let s = 0; for (const c of seedStr) s = (s * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + N + ' ' + N); svg.setAttribute('class', 'qr'); svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Mock pickup code (demo only, not scannable)');
    const inFinder = (x, y) => [[0, 0], [N - 7, 0], [0, N - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
    const rect = (x, y, w, hh, fill) => { const r = document.createElementNS(NS, 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', hh); r.setAttribute('fill', fill); svg.appendChild(r); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rnd() > 0.52) rect(x, y, 1, 1, '#183D32');
    [[0, 0], [N - 7, 0], [0, N - 7]].forEach(([fx, fy]) => { rect(fx, fy, 7, 7, '#183D32'); rect(fx + 1, fy + 1, 5, 5, '#fff'); rect(fx + 2, fy + 2, 3, 3, '#183D32'); });
    return svg;
  }

  function ticketNode(o) {
    const l = o.listing, r = o.restaurant;
    return h('div', { class: 'ticket' },
      h('div', { class: 'check-circle', 'aria-hidden': 'true' }, '✓'),
      h('h3', null, o.status === 'CONFIRMED' ? 'You are all set!' : 'Order ' + o.status.toLowerCase()),
      h('div', null, App.orderBadge(o.status)),
      h('div', null, h('div', { class: 'ref' }, o.ref)),
      h('p', { class: 'pin' }, 'Pickup code: ', h('strong', { class: 'mono' }, o.pickup_code)),
      mockQr(o.ref),
      h('p', { class: 'small muted' }, 'Mock code for the demo. Show the reference or pickup code at the counter.'),
      h('div', { class: 'instructions' },
        h('strong', null, 'Collection instructions'),
        h('ul', null,
          h('li', null, o.quantity + ' × ' + l.name + ' from ' + r.name),
          h('li', null, 'Pickup slot: ' + App.time(o.pickup_slot) + ' (collect by ' + App.time(l.collection_deadline) + ')'),
          h('li', null, 'Address: ' + r.pickup_address),
          h('li', null, l.pickup_instructions),
          h('li', null, 'Total ' + App.money(o.total_amount) + ': no payment was collected in this demo.'))));
  }

  // ====================================================================
  // MY ORDERS
  // ====================================================================
  App.views.orders = function (route, user) {
    const orders = Store.ordersFor(user.id);
    return h('div', { class: 'container' },
      h('div', { class: 'dash-head' },
        h('div', null, h('h1', null, 'My orders'), h('p', null, 'Reservations for ', user.name, '. Demo orders, no payments collected.')),
        h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => { App.render(); App.toast('Orders refreshed.'); } }, 'Refresh')),
      orders.length ? h('div', { class: 'order-list' }, orders.map(orderCard))
        : h('div', { class: 'empty' }, h('h3', null, 'No orders yet'), h('p', null, 'Reserve a meal and it will show up here.'), h('a', { class: 'btn', href: '#/discover' }, 'Explore meals')));
  };

  function orderCard(o) {
    const confirmed = o.status === 'CONFIRMED';
    return h('article', { class: 'order' },
      h('div', null,
        h('h3', null, o.listing.name),
        h('div', { class: 'mono muted' }, o.ref),
        h('ul', { class: 'meta-list' },
          h('li', null, o.restaurant.name + ' · ' + o.quantity + ' portion' + (o.quantity === 1 ? '' : 's')),
          h('li', null, 'Pickup slot ' + App.time(o.pickup_slot) + ' · collect by ' + App.dateTime(o.listing.collection_deadline) + (confirmed ? ' (' + App.timeLeft(o.listing.collection_deadline) + ')' : '')),
          o.note ? h('li', null, o.note) : null,
          o.status === 'NO_SHOW' ? h('li', null, 'The collection deadline passed before pickup.') : null)),
      h('div', { class: 'order-side' },
        App.orderBadge(o.status),
        h('span', { class: 'amount' }, App.money(o.total_amount)),
        h('span', { class: 'small muted' }, 'Not paid · demo'),
        confirmed ? h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => {
            const m = App.openModal({ title: 'Pickup ticket', body: ticketNode(Store.getOrder(o.id)) });
            m.setFooter(h('button', { type: 'button', class: 'btn btn-outline', onclick: () => m.close() }, 'Close'));
          } }, 'Pickup code'),
          h('button', { type: 'button', class: 'btn btn-danger btn-sm', onclick: () => cancel(o) }, 'Cancel')) : null));
  }

  async function cancel(o) {
    const ok = await App.confirm({ title: 'Cancel this order?', message: 'Cancel ' + o.quantity + ' × ' + o.listing.name + ' (' + o.ref + ')? This cannot be undone.', confirmText: 'Cancel order', cancelText: 'Keep order', danger: true });
    if (!ok) return;
    try {
      const res = Store.cancelOrder(Store.session().id, o.id);
      App.toast(res.stockReturned ? 'Order cancelled. The portions were returned to the listing.' : 'Order cancelled. Portions were not returned because the listing is no longer eligible for sale.', 'success', 5500);
    } catch (e) { App.handleError(e); }
    App.render();
  }
})();
