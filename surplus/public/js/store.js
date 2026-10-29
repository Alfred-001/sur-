/*
 * SURPLUS demo data layer (localStorage).
 * ------------------------------------------------------------------
 * This is a MOCK of a backend. All rules (stock, expiry, state machines,
 * validation) live here so the UI never trusts its own inputs. Every
 * function throws StoreError with a human-readable message on failure.
 * Money is stored as integer paise. Timestamps are ISO 8601 (UTC).
 * The "actor" argument is the demo user id. The role switcher is NOT security.
 */
(function (root) {
  'use strict';

  const KEY = 'surplus_demo_state_v1';
  const MIN = 60000, HR = 3600000;
  const MAX_PER_ORDER = 10;
  const iso = (ms) => new Date(ms).toISOString();

  class StoreError extends Error {}
  const fail = (msg) => { throw new StoreError(msg); };

  // localStorage with an in-memory fallback (used when tests run in Node)
  const mem = {};
  const storage = (function () {
    try {
      if (root.localStorage) {
        root.localStorage.setItem('__t', '1');
        root.localStorage.removeItem('__t');
        return root.localStorage;
      }
    } catch (e) { /* fall through */ }
    return {
      getItem: (k) => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; },
    };
  })();

  // ---------- seed data (fictional, relative to "now" so it is always consistent) ----------
  function seed() {
    const now = Date.now();
    const users = [
      { id: 'u_cust1', name: 'Asha Menon', email: 'asha@demo.surplus', role: 'customer' },
      { id: 'u_cust2', name: 'Rahul Nair', email: 'rahul@demo.surplus', role: 'customer' },
      { id: 'u_rest1', name: 'Green Leaf Kitchen', email: 'greenleaf@demo.surplus', role: 'restaurant' },
      { id: 'u_rest2', name: 'Malabar Spice House', email: 'malabar@demo.surplus', role: 'restaurant' },
      { id: 'u_rest3', name: 'Café Nilgiri', email: 'nilgiri@demo.surplus', role: 'restaurant' },
      { id: 'u_org1', name: 'Hope Meals Foundation', email: 'hope@demo.surplus', role: 'organization' },
      { id: 'u_org2', name: 'Annapurna Seva Trust', email: 'annapurna@demo.surplus', role: 'organization' },
    ];
    const restaurants = [
      { id: 'r1', owner_user_id: 'u_rest1', name: 'Green Leaf Kitchen', description: 'Home-style vegetarian meals.', pickup_address: '12 Temple Road, Demo City (fictional)', verification_status: 'DEMO_VERIFIED' },
      { id: 'r2', owner_user_id: 'u_rest2', name: 'Malabar Spice House', description: 'Coastal biryani and curries.', pickup_address: '48 Harbour Street, Demo City (fictional)', verification_status: 'DEMO_VERIFIED' },
      { id: 'r3', owner_user_id: 'u_rest3', name: 'Café Nilgiri', description: 'Sandwiches, salads and baked snacks.', pickup_address: '5 Hill View Lane, Demo City (fictional)', verification_status: 'DEMO_VERIFIED' },
    ];
    const L = (o) => Object.assign({
      safety_declaration: true, created_at: iso(now - 3 * HR), updated_at: iso(now - 3 * HR), image_url: '',
    }, o);
    const listings = [
      L({ id: 'l1', restaurant_id: 'r1', name: 'Vegetable Thali', description: 'Rice, sambar, two sabzis, thoran and papad.', category: 'Meals', dietary_type: 'VEG', original_price: 12000, discounted_price: 6000, initial_quantity: 8, quantity_available: 6, prepared_at: iso(now - 2 * HR), collection_start: iso(now - 30 * MIN), collection_deadline: iso(now + 4 * HR), ingredients: 'Rice, lentils, seasonal vegetables, coconut, spices', allergens: 'Contains mustard. Prepared in a kitchen that handles nuts.', pickup_instructions: 'Show your order code at the counter. Bring your own container if you can.', status: 'ACTIVE' }),
      L({ id: 'l2', restaurant_id: 'r2', name: 'Chicken Biryani', description: 'Dum biryani with raita and pickle.', category: 'Meals', dietary_type: 'NON_VEG', original_price: 22000, discounted_price: 11000, initial_quantity: 6, quantity_available: 4, prepared_at: iso(now - 3 * HR), collection_start: iso(now - 30 * MIN), collection_deadline: iso(now + 3 * HR), ingredients: 'Basmati rice, chicken, yoghurt, onions, spices, ghee', allergens: 'Contains milk products.', pickup_instructions: 'Collect from the side counter. Eat the same day and keep refrigerated if not eaten soon.', status: 'ACTIVE' }),
      L({ id: 'l3', restaurant_id: 'r3', name: 'Paneer Tikka Sandwich', description: 'Grilled sandwich with paneer tikka and mint chutney.', category: 'Snacks', dietary_type: 'VEG', original_price: 9000, discounted_price: 4500, initial_quantity: 8, quantity_available: 8, prepared_at: iso(now - 90 * MIN), collection_start: iso(now - 15 * MIN), collection_deadline: iso(now + 2.5 * HR), ingredients: 'Multigrain bread, paneer, capsicum, mint, butter', allergens: 'Contains gluten and milk.', pickup_instructions: 'Ask for the SURPLUS shelf near the cashier.', status: 'ACTIVE' }),
      L({ id: 'l4', restaurant_id: 'r1', name: 'Masala Dosa Combo', description: 'Dosa with chutneys and sambar.', category: 'Meals', dietary_type: 'VEG', original_price: 14000, discounted_price: 7000, initial_quantity: 6, quantity_available: 0, prepared_at: iso(now - 2 * HR), collection_start: iso(now - HR), collection_deadline: iso(now + 2 * HR), ingredients: 'Rice, urad dal, potato, onion, spices', allergens: 'Contains mustard.', pickup_instructions: 'Show your order code at the counter.', status: 'SOLD_OUT' }),
      L({ id: 'l5', restaurant_id: 'r2', name: 'Veg Fried Rice', description: 'Wok-tossed rice with vegetables.', category: 'Meals', dietary_type: 'VEG', original_price: 15000, discounted_price: 7500, initial_quantity: 5, quantity_available: 5, prepared_at: iso(now - 7 * HR), collection_start: iso(now - 6 * HR), collection_deadline: iso(now - 2 * HR), ingredients: 'Rice, carrot, beans, spring onion, soy sauce', allergens: 'Contains soy.', pickup_instructions: 'Collect from the main counter.', status: 'EXPIRED' }),
      L({ id: 'l6', restaurant_id: 'r2', name: 'Fish Curry Meal', description: 'Kerala-style fish curry with rice.', category: 'Meals', dietary_type: 'NON_VEG', original_price: 26000, discounted_price: 13000, initial_quantity: 3, quantity_available: 3, prepared_at: iso(now - 90 * MIN), collection_start: iso(now - 20 * MIN), collection_deadline: iso(now + 3.5 * HR), ingredients: 'Fish, coconut, tamarind, rice, spices', allergens: 'Contains fish.', pickup_instructions: 'Collect from the side counter.', status: 'ACTIVE' }),
      L({ id: 'l7', restaurant_id: 'r3', name: 'Fruit & Nut Salad Bowl', description: 'Seasonal fruit with seeds and honey-lime dressing. Pre-book now, collect from the opening time.', category: 'Healthy', dietary_type: 'VEG', original_price: 8000, discounted_price: 4000, initial_quantity: 7, quantity_available: 7, prepared_at: iso(now - 30 * MIN), collection_start: iso(now + 2 * HR), collection_deadline: iso(now + 5 * HR), ingredients: 'Apple, banana, grapes, almonds, pumpkin seeds, honey, lime', allergens: 'Contains tree nuts and honey.', pickup_instructions: 'Collect from the chilled counter.', status: 'ACTIVE' }),
    ];
    const O = (o) => Object.assign({ cancelled_at: null, collected_at: null, note: '' }, o);
    const orders = [
      O({ id: 'o1', ref: 'SRP-4K7M2Q', customer_user_id: 'u_cust1', listing_id: 'l1', quantity: 2, unit_price: 6000, total_amount: 12000, status: 'CONFIRMED', pickup_slot: iso(now + HR), pickup_code: '4821', created_at: iso(now - 40 * MIN) }),
      O({ id: 'o2', ref: 'SRP-9P3XD7', customer_user_id: 'u_cust2', listing_id: 'l2', quantity: 2, unit_price: 11000, total_amount: 22000, status: 'COLLECTED', pickup_slot: iso(now - 90 * MIN), pickup_code: '7310', created_at: iso(now - 2 * HR), collected_at: iso(now - 80 * MIN) }),
      O({ id: 'o3', ref: 'SRP-2H8VBN', customer_user_id: 'u_cust1', listing_id: 'l3', quantity: 1, unit_price: 4500, total_amount: 4500, status: 'CANCELLED', pickup_slot: iso(now + HR), pickup_code: '1096', created_at: iso(now - HR), cancelled_at: iso(now - 50 * MIN) }),
      O({ id: 'o4', ref: 'SRP-6W5ATC', customer_user_id: 'u_cust1', listing_id: 'l4', quantity: 4, unit_price: 7000, total_amount: 28000, status: 'COLLECTED', pickup_slot: iso(now - 70 * MIN), pickup_code: '5502', created_at: iso(now - 100 * MIN), collected_at: iso(now - 65 * MIN) }),
      O({ id: 'o5', ref: 'SRP-8R1JGE', customer_user_id: 'u_cust2', listing_id: 'l4', quantity: 2, unit_price: 7000, total_amount: 14000, status: 'COLLECTED', pickup_slot: iso(now - 60 * MIN), pickup_code: '3377', created_at: iso(now - 95 * MIN), collected_at: iso(now - 55 * MIN) }),
    ];
    const D = (o) => Object.assign({ organization_id: null, safety_declaration: true, accepted_at: null, collected_at: null, quantity_handed_over: null, created_at: iso(now - 2 * HR) }, o);
    const donations = [
      D({ id: 'd1', restaurant_id: 'r1', food_name: 'Veg Pulao with raita', description: 'Freshly prepared this evening, kept hot.', quantity_available: 12, prepared_at: iso(now - 90 * MIN), collection_deadline: iso(now + 3 * HR), handling_information: 'Packed in sealed containers. Consume within 4 hours of preparation. Keep covered.', status: 'AVAILABLE' }),
      D({ id: 'd2', restaurant_id: 'r3', food_name: 'Bread rolls and vegetable curry', description: 'Surplus from the evening service.', quantity_available: 10, prepared_at: iso(now - 2 * HR), collection_deadline: iso(now + 2 * HR), handling_information: 'Curry in lidded steel containers; bread in paper bags. Consume today.', status: 'ACCEPTED', organization_id: 'u_org1', accepted_at: iso(now - 30 * MIN) }),
      D({ id: 'd3', restaurant_id: 'r2', food_name: 'Dal and rice', description: 'Packed meal boxes.', quantity_available: 15, prepared_at: iso(now - 26 * HR), collection_deadline: iso(now - 22 * HR), handling_information: 'Boxed and sealed. Consume within 4 hours.', status: 'COLLECTED', organization_id: 'u_org1', accepted_at: iso(now - 25 * HR), collected_at: iso(now - 24 * HR), quantity_handed_over: 15 }),
      D({ id: 'd4', restaurant_id: 'r1', food_name: 'Lemon rice', description: 'Was not accepted in time.', quantity_available: 8, prepared_at: iso(now - 8 * HR), collection_deadline: iso(now - 3 * HR), handling_information: 'Sealed boxes.', status: 'EXPIRED' }),
    ];
    const stock_events = [
      { id: 'se1', listing_id: 'l1', change_amount: 8, reason: 'Initial listing', created_at: iso(now - 3 * HR) },
      { id: 'se2', listing_id: 'l1', change_amount: -2, reason: 'Order SRP-4K7M2Q reserved', created_at: iso(now - 40 * MIN) },
    ];
    return {
      version: 1, users, restaurants, listings, orders, donations, stock_events, incidents: [],
      session: { userId: 'u_cust1' },
    };
  }

  let state = load();

  function load() {
    try {
      const raw = storage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.version === 1) return s;
      }
    } catch (e) { /* corrupted data -> reseed */ }
    const s = seed();
    storage.setItem(KEY, JSON.stringify(s));
    return s;
  }
  function save() { storage.setItem(KEY, JSON.stringify(state)); }
  function reset() { state = seed(); save(); return state; }

  // ---------- helpers ----------
  const uid = (p) => p + Math.random().toString(36).slice(2, 9);
  const nowMs = () => Date.now();
  const byId = (arr, id) => arr.find((x) => x.id === id);
  const getUser = (id) => byId(state.users, id);
  const restaurantOf = (userId) => state.restaurants.find((r) => r.owner_user_id === userId);

  function newOrderRef() {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    for (;;) {
      let s = 'SRP-';
      for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
      if (!state.orders.some((o) => o.ref === s)) return s;
    }
  }
  const newPin = () => String(Math.floor(1000 + Math.random() * 9000));

  function parseMoney(v, label) {
    const s = String(v == null ? '' : v).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(s)) fail(label + ' must be a valid non-negative amount.');
    return Math.round(parseFloat(s) * 100);
  }
  function parseInt1(v, label, min) {
    const s = String(v == null ? '' : v).trim();
    if (!/^\d+$/.test(s)) fail(label + ' must be a whole number.');
    const n = parseInt(s, 10);
    if (n < min) fail(label + ' must be at least ' + min + '.');
    return n;
  }
  function parseTime(v, label) {
    const t = Date.parse(v);
    if (!v || Number.isNaN(t)) fail(label + ' is not a valid date and time.');
    return t;
  }
  function clean(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 500); }

  function actorRestaurant(actor) {
    const r = restaurantOf(actor);
    if (!r) fail('This action needs a restaurant account.');
    return r;
  }
  function logStock(listingId, change, reason) {
    state.stock_events.push({ id: uid('se_'), listing_id: listingId, change_amount: change, reason, created_at: iso(nowMs()) });
  }

  // ---------- expiry sweep ----------
  // Runs before every read/write below, and also on a timer in the UI.
  // Expired food is NEVER moved to donations automatically.
  function sweep() {
    const t = nowMs();
    let changed = false;
    state.listings.forEach((l) => {
      if ((l.status === 'ACTIVE' || l.status === 'SOLD_OUT') && Date.parse(l.collection_deadline) <= t) {
        l.status = 'EXPIRED'; l.updated_at = iso(t); changed = true;
      }
    });
    state.orders.forEach((o) => {
      const l = byId(state.listings, o.listing_id);
      if (o.status === 'CONFIRMED' && l && Date.parse(l.collection_deadline) <= t) {
        o.status = 'NO_SHOW'; changed = true; // not collected in time; stock is NOT returned
      }
    });
    state.donations.forEach((d) => {
      if ((d.status === 'AVAILABLE' || d.status === 'ACCEPTED') && Date.parse(d.collection_deadline) <= t) {
        d.status = 'EXPIRED'; changed = true;
      }
    });
    if (changed) save();
    return changed;
  }

  // ---------- listings ----------
  function listListings(f) {
    sweep();
    f = f || {};
    const q = clean(f.q, 80).toLowerCase();
    let out = state.listings.filter((l) => l.status !== 'WITHDRAWN').map(enrichListing);
    if (q) out = out.filter((l) => l.name.toLowerCase().includes(q) || l.restaurant.name.toLowerCase().includes(q));
    if (f.maxPrice !== '' && f.maxPrice != null && !Number.isNaN(Number(f.maxPrice))) out = out.filter((l) => l.discounted_price <= Math.round(Number(f.maxPrice) * 100));
    if (f.diet === 'VEG' || f.diet === 'NON_VEG') out = out.filter((l) => l.dietary_type === f.diet);
    if (f.availableOnly) out = out.filter((l) => l.status === 'ACTIVE' && l.quantity_available > 0);
    const sorts = {
      price: (a, b) => a.discounted_price - b.discounted_price,
      discount: (a, b) => b.discount_pct - a.discount_pct,
      recent: (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
    };
    out.sort(sorts[f.sort] || sorts.recent);
    // sellable first, then sold out / expired
    out.sort((a, b) => rank(a) - rank(b));
    return out;
  }
  const rank = (l) => (l.status === 'ACTIVE' ? 0 : l.status === 'SOLD_OUT' ? 1 : 2);

  function enrichListing(l) {
    const r = byId(state.restaurants, l.restaurant_id);
    return Object.assign({}, l, {
      restaurant: r,
      discount_pct: l.original_price ? Math.round((1 - l.discounted_price / l.original_price) * 100) : 0,
      is_prebook: l.status === 'ACTIVE' && Date.parse(l.collection_start) > nowMs(),
    });
  }
  function getListing(id) {
    sweep();
    const l = byId(state.listings, id);
    return l ? enrichListing(l) : null;
  }

  // Shared validation for create / relist
  function validateListingInput(input) {
    const name = clean(input.name, 80);
    if (!name) fail('Food name cannot be empty.');
    const quantity = parseInt1(input.quantity, 'Quantity', 1);
    if (quantity > 500) fail('Quantity looks too large for a single listing.');
    const original = parseMoney(input.original_price, 'Original price');
    const discounted = parseMoney(input.discounted_price, 'Discounted price');
    if (original <= 0) fail('Original price must be greater than zero.');
    if (discounted > original) fail('Discounted price cannot exceed the original price.');
    const prepared = parseTime(input.prepared_at, 'Preparation time');
    const start = parseTime(input.collection_start, 'Collection start');
    const deadline = parseTime(input.collection_deadline, 'Collection deadline');
    const t = nowMs();
    if (prepared > t + 5 * MIN) fail('Preparation time cannot be in the future.');
    if (deadline <= start) fail('Collection deadline must be after the collection start.');
    if (deadline <= t) fail('Expired listings cannot be published. Choose a future collection deadline.');
    if (start < prepared) fail('Collection cannot start before the food was prepared.');
    if (!input.safety_declaration) fail('You must confirm the eligibility and food-handling declaration.');
    const pickup = clean(input.pickup_instructions, 400);
    if (!pickup) fail('Pickup instructions are required.');
    const ingredients = clean(input.ingredients, 400);
    if (!ingredients) fail('Ingredients and allergen information are required.');
    const diet = input.dietary_type === 'NON_VEG' ? 'NON_VEG' : 'VEG';
    return {
      name, quantity, original, discounted, prepared, start, deadline, pickup, ingredients, diet,
      description: clean(input.description, 400), category: clean(input.category, 40) || 'Meals',
      allergens: clean(input.allergens, 300), image_url: clean(input.image_url, 500),
    };
  }

  function createListing(actor, input) {
    sweep();
    const r = actorRestaurant(actor);
    const v = validateListingInput(input);
    const t = iso(nowMs());
    const l = {
      id: uid('l_'), restaurant_id: r.id, name: v.name, description: v.description, category: v.category,
      dietary_type: v.diet, original_price: v.original, discounted_price: v.discounted,
      initial_quantity: v.quantity, quantity_available: v.quantity,
      prepared_at: iso(v.prepared), collection_start: iso(v.start), collection_deadline: iso(v.deadline),
      ingredients: v.ingredients, allergens: v.allergens, pickup_instructions: v.pickup,
      image_url: /^https?:\/\//i.test(v.image_url) ? v.image_url : '',
      safety_declaration: true, status: 'ACTIVE', created_at: t, updated_at: t,
    };
    state.listings.push(l);
    logStock(l.id, v.quantity, 'Initial listing');
    save();
    return enrichListing(l);
  }

  // Edit only a safe subset of fields. Expired/withdrawn listings can't be edited:
  // to sell again the restaurant must create a NEW listing (full revalidation).
  function updateListing(actor, id, patch) {
    sweep();
    const r = actorRestaurant(actor);
    const l = byId(state.listings, id);
    if (!l || l.restaurant_id !== r.id) fail('Listing not found for this restaurant.');
    if (l.status !== 'ACTIVE' && l.status !== 'SOLD_OUT') fail('Only active or sold-out listings can be edited. Create a new listing to sell again.');
    if (patch.description != null) l.description = clean(patch.description, 400);
    if (patch.pickup_instructions != null) {
      const p = clean(patch.pickup_instructions, 400);
      if (!p) fail('Pickup instructions are required.');
      l.pickup_instructions = p;
    }
    if (patch.discounted_price != null) {
      const d = parseMoney(patch.discounted_price, 'Discounted price');
      if (d > l.original_price) fail('Discounted price cannot exceed the original price.');
      l.discounted_price = d; // already-confirmed orders keep their own unit_price
    }
    if (patch.quantity_available != null && String(patch.quantity_available) !== '') {
      const q = parseInt1(patch.quantity_available, 'Available quantity', 0);
      if (q > 500) fail('Quantity looks too large.');
      if (q !== l.quantity_available) {
        const reason = clean(patch.reason, 200);
        if (!reason) fail('Please give a reason for the stock correction.');
        const delta = q - l.quantity_available;
        logStock(l.id, delta, 'Correction: ' + reason);
        if (delta > 0) l.initial_quantity += delta;
        l.quantity_available = q;
        l.status = q > 0 ? 'ACTIVE' : 'SOLD_OUT';
      }
    }
    l.updated_at = iso(nowMs());
    save();
    return enrichListing(l);
  }

  // Withdrawal: confirmed orders are cancelled (no stock returned) and the action is logged.
  function withdrawListing(actor, id, reason) {
    sweep();
    const r = actorRestaurant(actor);
    const l = byId(state.listings, id);
    if (!l || l.restaurant_id !== r.id) fail('Listing not found for this restaurant.');
    if (l.status === 'WITHDRAWN') fail('This listing is already withdrawn.');
    if (l.status === 'EXPIRED') fail('This listing has already expired.');
    const why = clean(reason, 200) || 'No reason given';
    let cancelled = 0;
    state.orders.forEach((o) => {
      if (o.listing_id === l.id && o.status === 'CONFIRMED') {
        o.status = 'CANCELLED'; o.cancelled_at = iso(nowMs()); o.note = 'Listing withdrawn by restaurant'; cancelled++;
      }
    });
    if (l.quantity_available > 0) logStock(l.id, -l.quantity_available, 'Withdrawn: ' + why);
    else logStock(l.id, 0, 'Withdrawn: ' + why);
    l.quantity_available = 0;
    l.status = 'WITHDRAWN';
    l.updated_at = iso(nowMs());
    save();
    return { listing: enrichListing(l), cancelledOrders: cancelled };
  }

  function reportIncident(actor, listingId, text) {
    const r = actorRestaurant(actor);
    const l = byId(state.listings, listingId);
    if (!l || l.restaurant_id !== r.id) fail('Listing not found for this restaurant.');
    const t = clean(text, 500);
    if (!t) fail('Please describe the issue.');
    state.incidents.push({ id: uid('inc_'), listing_id: l.id, restaurant_id: r.id, text: t, created_at: iso(nowMs()) });
    let withdrawn = false;
    if (l.status === 'ACTIVE' || l.status === 'SOLD_OUT') { withdrawListing(actor, listingId, 'Incident reported: ' + t); withdrawn = true; }
    else save();
    return { withdrawn };
  }

  // ---------- orders ----------
  /*
   * RESERVE: the critical inventory rule.
   * Everything happens synchronously in one step: re-read the listing, validate,
   * decrement stock, create the order, log the stock event, save. Nothing can
   * interleave, so stock can never go negative or be oversold.
   * (In the real SQLite/Express version this is one DB transaction.)
   */
  function reserve(actor, listingId, quantity, pickupSlot) {
    sweep();
    const user = getUser(actor);
    if (!user || user.role !== 'customer') fail('Only customer accounts can reserve food.');
    const l = byId(state.listings, listingId);
    if (!l) fail('This listing no longer exists.');
    if (l.status === 'WITHDRAWN') fail('This listing was withdrawn by the restaurant.');
    if (l.status === 'EXPIRED' || Date.parse(l.collection_deadline) <= nowMs()) fail('This listing has expired and can no longer be reserved.');
    if (l.status === 'SOLD_OUT' || l.quantity_available <= 0) fail('Sorry, this meal just sold out.');
    const q = parseInt1(quantity, 'Quantity', 1);
    if (q > MAX_PER_ORDER) fail('You can reserve at most ' + MAX_PER_ORDER + ' portions per order.');
    if (q > l.quantity_available) fail('Only ' + l.quantity_available + ' portion' + (l.quantity_available === 1 ? '' : 's') + ' left. Please lower your quantity.');
    const slot = parseTime(pickupSlot, 'Pickup slot');
    const earliest = Math.max(Date.parse(l.collection_start), nowMs() - 5 * MIN);
    if (slot < earliest - MIN || slot >= Date.parse(l.collection_deadline)) fail('Please choose a pickup slot inside the collection window.');

    l.quantity_available -= q;
    if (l.quantity_available === 0) l.status = 'SOLD_OUT';
    l.updated_at = iso(nowMs());
    const order = {
      id: uid('o_'), ref: newOrderRef(), customer_user_id: actor, listing_id: l.id, quantity: q,
      unit_price: l.discounted_price,                     // price comes from the listing, never from the UI
      total_amount: l.discounted_price * q,
      status: 'CONFIRMED', pickup_slot: iso(slot), pickup_code: newPin(),
      created_at: iso(nowMs()), collected_at: null, cancelled_at: null, note: '',
    };
    state.orders.push(order);
    logStock(l.id, -q, 'Order ' + order.ref + ' reserved');
    save();
    return enrichOrder(order);
  }

  function enrichOrder(o) {
    const l = byId(state.listings, o.listing_id);
    const r = l && byId(state.restaurants, l.restaurant_id);
    return Object.assign({}, o, { listing: l, restaurant: r, customer: getUser(o.customer_user_id) });
  }
  function ordersFor(actor) {
    sweep();
    const u = getUser(actor);
    if (!u) return [];
    let list = [];
    if (u.role === 'customer') list = state.orders.filter((o) => o.customer_user_id === actor);
    else if (u.role === 'restaurant') {
      const r = restaurantOf(actor);
      list = state.orders.filter((o) => { const l = byId(state.listings, o.listing_id); return l && r && l.restaurant_id === r.id; });
    }
    return list.map(enrichOrder).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }
  function getOrder(id) { const o = byId(state.orders, id); return o ? enrichOrder(o) : null; }

  function cancelOrder(actor, orderId) {
    sweep();
    const o = byId(state.orders, orderId);
    if (!o) fail('Order not found.');
    const u = getUser(actor);
    const l = byId(state.listings, o.listing_id);
    const owns = u && ((u.role === 'customer' && o.customer_user_id === actor) ||
      (u.role === 'restaurant' && restaurantOf(actor) && l.restaurant_id === restaurantOf(actor).id));
    if (!owns) fail('You cannot cancel this order.');
    if (o.status !== 'CONFIRMED') fail('Only confirmed orders can be cancelled (this one is ' + o.status.toLowerCase() + ').');
    o.status = 'CANCELLED'; o.cancelled_at = iso(nowMs());
    // Stock is returned only if the food is still eligible for sale, and only once
    // (status can no longer be CONFIRMED, so a second cancel is rejected above).
    const sellable = (l.status === 'ACTIVE' || l.status === 'SOLD_OUT') && Date.parse(l.collection_deadline) > nowMs();
    if (sellable) {
      l.quantity_available += o.quantity;
      if (l.status === 'SOLD_OUT') l.status = 'ACTIVE';
      l.updated_at = iso(nowMs());
      logStock(l.id, o.quantity, 'Order ' + o.ref + ' cancelled, stock returned');
    }
    save();
    return { order: enrichOrder(o), stockReturned: sellable };
  }

  function collectOrder(actor, orderId) {
    sweep();
    const r = actorRestaurant(actor);
    const o = byId(state.orders, orderId);
    if (!o) fail('Order not found.');
    const l = byId(state.listings, o.listing_id);
    if (l.restaurant_id !== r.id) fail('This order belongs to another restaurant.');
    if (o.status === 'COLLECTED') fail('This order was already marked as collected.');
    if (o.status !== 'CONFIRMED') fail('Only confirmed orders can be collected (this one is ' + o.status.toLowerCase() + ').');
    o.status = 'COLLECTED'; o.collected_at = iso(nowMs());
    save();
    return enrichOrder(o);
  }

  // ---------- donations ----------
  function enrichDonation(d) {
    return Object.assign({}, d, { restaurant: byId(state.restaurants, d.restaurant_id), organization: d.organization_id ? getUser(d.organization_id) : null });
  }
  function listDonations(actor) {
    sweep();
    const u = getUser(actor);
    let list = state.donations;
    if (u && u.role === 'restaurant') { const r = restaurantOf(actor); list = list.filter((d) => r && d.restaurant_id === r.id); }
    return list.map(enrichDonation).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }

  // Donations are validated independently of sale listings.
  function createDonation(actor, input) {
    sweep();
    const r = actorRestaurant(actor);
    const food = clean(input.food_name, 80);
    if (!food) fail('Food name cannot be empty.');
    const qty = parseInt1(input.quantity, 'Quantity', 1);
    if (qty > 1000) fail('Quantity looks too large.');
    const prepared = parseTime(input.prepared_at, 'Preparation time');
    const deadline = parseTime(input.collection_deadline, 'Collection deadline');
    if (prepared > nowMs() + 5 * MIN) fail('Preparation time cannot be in the future.');
    if (deadline <= nowMs()) fail('Expired food cannot be offered. Choose a future collection deadline.');
    if (deadline <= prepared) fail('Collection deadline must be after the preparation time.');
    const handling = clean(input.handling_information, 400);
    if (!handling) fail('Handling information is required.');
    if (!input.safety_declaration) fail('You must confirm the eligibility and food-handling declaration.');
    const d = {
      id: uid('d_'), restaurant_id: r.id, organization_id: null, food_name: food, description: clean(input.description, 300),
      quantity_available: qty, prepared_at: iso(prepared), collection_deadline: iso(deadline), handling_information: handling,
      safety_declaration: true, status: 'AVAILABLE', created_at: iso(nowMs()), accepted_at: null, collected_at: null, quantity_handed_over: null,
    };
    state.donations.push(d);
    save();
    return enrichDonation(d);
  }

  function requireOrg(actor) {
    const u = getUser(actor);
    if (!u || u.role !== 'organization') fail('Only donation organizations can do this.');
    return u;
  }
  // AVAILABLE -> ACCEPTED. The status check and the update happen in one step,
  // so a second organization trying the same donation is rejected.
  function acceptDonation(actor, id) {
    sweep(); requireOrg(actor);
    const d = byId(state.donations, id);
    if (!d) fail('Donation not found.');
    if (d.status === 'EXPIRED') fail('This donation has expired and cannot be accepted.');
    if (d.status !== 'AVAILABLE') fail('This donation is no longer available (status: ' + d.status.toLowerCase() + ').');
    d.status = 'ACCEPTED'; d.organization_id = actor; d.accepted_at = iso(nowMs());
    save();
    return enrichDonation(d);
  }
  // ACCEPTED -> COLLECTED. Records the quantity actually handed over.
  function collectDonation(actor, id, handedOver) {
    sweep(); requireOrg(actor);
    const d = byId(state.donations, id);
    if (!d) fail('Donation not found.');
    if (d.status === 'EXPIRED') fail('This donation has expired and cannot be collected.');
    if (d.status === 'COLLECTED') fail('This donation was already collected.');
    if (d.status !== 'ACCEPTED') fail('Only accepted donations can be collected.');
    if (d.organization_id !== actor) fail('This donation was accepted by another organization.');
    const q = parseInt1(handedOver, 'Quantity handed over', 1);
    if (q > d.quantity_available) fail('Quantity handed over cannot exceed the ' + d.quantity_available + ' portions offered.');
    d.status = 'COLLECTED'; d.collected_at = iso(nowMs()); d.quantity_handed_over = q;
    save();
    return enrichDonation(d);
  }
  // Organization releases an accepted donation back to the pool.
  function releaseDonation(actor, id) {
    sweep(); requireOrg(actor);
    const d = byId(state.donations, id);
    if (!d) fail('Donation not found.');
    if (d.status !== 'ACCEPTED' || d.organization_id !== actor) fail('Only your accepted donations can be released.');
    d.status = 'AVAILABLE'; d.organization_id = null; d.accepted_at = null;
    save();
    return enrichDonation(d);
  }
  // Restaurant cancels a donation that has not been collected yet.
  function cancelDonation(actor, id) {
    sweep();
    const r = actorRestaurant(actor);
    const d = byId(state.donations, id);
    if (!d || d.restaurant_id !== r.id) fail('Donation not found for this restaurant.');
    if (d.status !== 'AVAILABLE' && d.status !== 'ACCEPTED') fail('Only available or accepted donations can be cancelled.');
    d.status = 'CANCELLED';
    save();
    return enrichDonation(d);
  }

  // ---------- stats ----------
  function impact() {
    sweep();
    const sold = state.orders.filter((o) => o.status === 'COLLECTED').reduce((s, o) => s + o.quantity, 0);
    const reserved = state.orders.filter((o) => o.status === 'CONFIRMED').reduce((s, o) => s + o.quantity, 0);
    const donated = state.donations.filter((d) => d.status === 'COLLECTED').reduce((s, d) => s + (d.quantity_handed_over || 0), 0);
    return {
      portionsSold: sold, portionsReserved: reserved, portionsDonated: donated,
      activeListings: state.listings.filter((l) => l.status === 'ACTIVE').length,
      restaurants: state.restaurants.length,
    };
  }
  function restaurantStats(actor) {
    sweep();
    const r = actorRestaurant(actor);
    const mine = state.listings.filter((l) => l.restaurant_id === r.id);
    const active = mine.filter((l) => l.status === 'ACTIVE');
    const orders = ordersFor(actor);
    const collected = orders.filter((o) => o.status === 'COLLECTED');
    return {
      activeListings: active.length,
      portionsAvailable: active.reduce((s, l) => s + l.quantity_available, 0),
      portionsListedTotal: mine.reduce((s, l) => s + l.initial_quantity, 0),
      confirmedReservations: orders.filter((o) => o.status === 'CONFIRMED').length,
      completedPickups: collected.length,
      revenue: collected.reduce((s, o) => s + o.total_amount, 0),
      donationsCompleted: state.donations.filter((d) => d.restaurant_id === r.id && d.status === 'COLLECTED').length,
    };
  }
  function orgStats(actor) {
    sweep(); requireOrg(actor);
    const mine = state.donations.filter((d) => d.organization_id === actor);
    return {
      accepted: mine.filter((d) => d.status === 'ACCEPTED').length,
      collected: mine.filter((d) => d.status === 'COLLECTED').length,
      portionsCollected: mine.filter((d) => d.status === 'COLLECTED').reduce((s, d) => s + (d.quantity_handed_over || 0), 0),
      availableNow: state.donations.filter((d) => d.status === 'AVAILABLE').length,
    };
  }

  // ---------- session (demo account switcher) ----------
  function setSession(userId) { if (!getUser(userId)) fail('Unknown demo account.'); state.session.userId = userId; save(); }
  const session = () => getUser(state.session.userId);

  const api = {
    StoreError, MAX_PER_ORDER, get: () => state, reset, sweep, save,
    users: () => state.users, getUser, restaurantOf, restaurants: () => state.restaurants,
    session, setSession,
    listListings, getListing, createListing, updateListing, withdrawListing, reportIncident,
    stockEventsFor: (id) => state.stock_events.filter((e) => e.listing_id === id),
    incidentsFor: (id) => state.incidents.filter((i) => i.listing_id === id),
    reserve, ordersFor, getOrder, cancelOrder, collectOrder,
    listDonations, createDonation, acceptDonation, collectDonation, releaseDonation, cancelDonation,
    impact, restaurantStats, orgStats,
  };
  root.Store = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
