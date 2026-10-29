// Run with: npm test   (uses Node's built-in test runner; no packages needed)
const test = require('node:test');
const assert = require('node:assert');
const Store = require('../public/js/store.js');

const throwsMsg = (fn, re) => assert.throws(fn, (e) => e instanceof Store.StoreError && re.test(e.message));
const slot = (l) => new Date(Math.max(Date.parse(l.collection_start), Date.now()) + 60000).toISOString();
const local = (ms) => new Date(ms).toISOString();
const HR = 3600000;

test.beforeEach(() => Store.reset());

test('reserve reduces stock and creates a confirmed order priced by the listing', () => {
  const l = Store.getListing('l3');
  const o = Store.reserve('u_cust1', 'l3', 2, slot(l));
  assert.strictEqual(o.status, 'CONFIRMED');
  assert.strictEqual(o.total_amount, 2 * l.discounted_price);
  assert.strictEqual(Store.getListing('l3').quantity_available, l.quantity_available - 2);
});

test('cannot reserve more than available, and stock never goes negative', () => {
  const l = Store.getListing('l6'); // 3 left
  throwsMsg(() => Store.reserve('u_cust1', 'l6', 4, slot(l)), /Only 3 portion/);
  assert.strictEqual(Store.getListing('l6').quantity_available, 3);
  Store.reserve('u_cust1', 'l6', 3, slot(l));
  assert.strictEqual(Store.getListing('l6').status, 'SOLD_OUT');
  throwsMsg(() => Store.reserve('u_cust2', 'l6', 1, slot(l)), /sold out/);
});

test('expired listing cannot be reserved', () => {
  throwsMsg(() => Store.reserve('u_cust1', 'l5', 1, local(Date.now())), /expired/);
});

test('order state machine: collect once, no cancel after collect, no double cancel', () => {
  const l = Store.getListing('l3');
  const o = Store.reserve('u_cust1', 'l3', 1, slot(l));
  Store.collectOrder('u_rest3', o.id);
  throwsMsg(() => Store.collectOrder('u_rest3', o.id), /already/);
  throwsMsg(() => Store.cancelOrder('u_cust1', o.id), /Only confirmed/);
  const o2 = Store.reserve('u_cust1', 'l3', 1, slot(l));
  const before = Store.getListing('l3').quantity_available;
  Store.cancelOrder('u_cust1', o2.id);
  assert.strictEqual(Store.getListing('l3').quantity_available, before + 1);
  throwsMsg(() => Store.cancelOrder('u_cust1', o2.id), /Only confirmed/); // no duplicate stock return
  assert.strictEqual(Store.getListing('l3').quantity_available, before + 1);
});

test('restaurant cannot collect another restaurant\'s order', () => {
  const l = Store.getListing('l3');
  const o = Store.reserve('u_cust1', 'l3', 1, slot(l));
  throwsMsg(() => Store.collectOrder('u_rest1', o.id), /another restaurant/);
});

test('listing validation is enforced', () => {
  const t = Date.now();
  const ok = { name: 'Test', quantity: 3, original_price: '100', discounted_price: '50', prepared_at: local(t - HR), collection_start: local(t), collection_deadline: local(t + 2 * HR), ingredients: 'x', pickup_instructions: 'y', safety_declaration: true };
  throwsMsg(() => Store.createListing('u_rest1', { ...ok, name: ' ' }), /Food name/);
  throwsMsg(() => Store.createListing('u_rest1', { ...ok, quantity: '0' }), /at least 1/);
  throwsMsg(() => Store.createListing('u_rest1', { ...ok, quantity: '2.5' }), /whole number/);
  throwsMsg(() => Store.createListing('u_rest1', { ...ok, discounted_price: '150' }), /cannot exceed/);
  throwsMsg(() => Store.createListing('u_rest1', { ...ok, discounted_price: '-5' }), /valid/);
  throwsMsg(() => Store.createListing('u_rest1', { ...ok, collection_deadline: local(t - HR) }), /after the collection start|Expired/);
  throwsMsg(() => Store.createListing('u_rest1', { ...ok, safety_declaration: false }), /declaration/);
  const l = Store.createListing('u_rest1', ok);
  assert.strictEqual(l.quantity_available, 3);
  assert.ok(Store.listListings({ q: 'Test' }).some((x) => x.id === l.id));
});

test('expired listings cannot be edited back to life; stock corrections are logged', () => {
  throwsMsg(() => Store.updateListing('u_rest2', 'l5', { quantity_available: 9, reason: 'x' }), /Only active/);
  Store.updateListing('u_rest1', 'l1', { quantity_available: 5, reason: 'miscount' });
  assert.ok(Store.stockEventsFor('l1').some((e) => /miscount/.test(e.reason) && e.change_amount === -1));
  throwsMsg(() => Store.updateListing('u_rest1', 'l1', { quantity_available: 4 }), /reason/);
});

test('withdraw cancels confirmed orders without returning stock and is logged', () => {
  const r = Store.withdrawListing('u_rest1', 'l1', 'quality check');
  assert.strictEqual(r.cancelledOrders, 1);
  assert.strictEqual(Store.getListing('l1').status, 'WITHDRAWN');
  assert.ok(Store.stockEventsFor('l1').some((e) => /Withdrawn/.test(e.reason)));
  throwsMsg(() => Store.withdrawListing('u_rest1', 'l1', 'again'), /already withdrawn/);
});

test('donation flow: accept once, collect, impact only after collection, expired rejected', () => {
  const before = Store.impact().portionsDonated;
  const d = Store.createDonation('u_rest1', { food_name: 'Test rice', quantity: '9', prepared_at: local(Date.now() - HR), collection_deadline: local(Date.now() + 2 * HR), handling_information: 'Sealed boxes', safety_declaration: true });
  assert.strictEqual(d.status, 'AVAILABLE');
  Store.acceptDonation('u_org1', d.id);
  throwsMsg(() => Store.acceptDonation('u_org2', d.id), /no longer available/);
  assert.strictEqual(Store.impact().portionsDonated, before); // accepted != collected
  throwsMsg(() => Store.collectDonation('u_org1', d.id, 99), /cannot exceed/);
  Store.collectDonation('u_org1', d.id, 9);
  assert.strictEqual(Store.impact().portionsDonated, before + 9);
  throwsMsg(() => Store.collectDonation('u_org1', d.id, 9), /already collected/);
  throwsMsg(() => Store.acceptDonation('u_org1', 'd4'), /expired/);
  throwsMsg(() => Store.createDonation('u_rest1', { food_name: 'Old', quantity: '2', prepared_at: local(Date.now() - 5 * HR), collection_deadline: local(Date.now() - HR), handling_information: 'x', safety_declaration: true }), /Expired/);
});

test('expired sale listings are never moved into donations', () => {
  const n = Store.get().donations.length;
  Store.sweep();
  assert.strictEqual(Store.get().donations.length, n);
});
