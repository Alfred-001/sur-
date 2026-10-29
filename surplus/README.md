# SURPLUS (localStorage prototype)

Good food lives on. SURPLUS connects restaurants with customers who want discounted surplus meals, and with organizations that coordinate food donations.

This is a **front-end-only demo**: plain HTML, CSS and vanilla JavaScript, with all data kept in the browser's `localStorage`. There is no database server and no real payment, login or location data.

## Prerequisites
- A modern browser (Chrome, Edge, Firefox, Safari).
- Optional: Node.js 18+ (only for the tiny static server and the tests). No `npm install` needed, there are zero dependencies.

## Run it
Option A (no tools): open `public/index.html` in your browser.

Option B (recommended for the pitch):
```bash
npm start
# open http://localhost:3000   (PORT=4000 npm start to change the port)
```
Alternatives: `python -m http.server 3000 --directory public` or `npx serve public`.

## Run the tests
```bash
npm test
```
Runs 10 rule tests (stock, expiry, state machines, validation, donations) using Node's built-in test runner.

## Reset the demo data
Click **Reset demo data** in the footer (it asks for confirmation). Or clear this site's data in the browser dev tools (Application, Local Storage, key `surplus_demo_state_v1`).
Seed data is generated relative to "now", so listings are always active or expired as intended.

## Demo accounts
Use the **Demo account** dropdown in the top bar. It is a demo switcher, **not security**.
- Customers: Asha Menon, Rahul Nair
- Restaurants: Green Leaf Kitchen, Malabar Spice House, Café Nilgiri
- Organizations: Hope Meals Foundation, Annapurna Seva Trust

## Walkthrough for a live demo
1. As **Asha Menon**, open Discover Food. Try search, max price, diet, sort and "Available only".
2. Open **Vegetable Thali** and click **Reserve this meal**. Set quantity 2, choose a pickup slot, **Continue**, tick the box, **Confirm reservation**. You get an order reference, pickup code and mock QR. The marketplace now shows 4 left.
   - **Fruit & Nut Salad Bowl** opens later today, so its button says **Pre-book**.
3. Open **My Orders** to see the order (status "Confirmed", "Not paid").
4. Switch to **Green Leaf Kitchen**. Under **Reservations**, click **Mark collected**. Check **Overview**: pickups and demo revenue went up.
5. Still as the restaurant, open **New listing** (defaults are pre-filled) and publish. It appears for customers at once. Try an invalid price or no declaration to see validation.
6. Under **Donations**, offer a donation (separate from sales).
7. Switch to **Hope Meals Foundation**, **Accept donation**, then **Record collection** with the quantity handed over. The impact numbers on the customer home page update only after collection.
8. Rule checks: as a customer, open an expired listing (untick "Available only") or any listing, expand **Demo: test the rules** and try to over-reserve or reserve an expired meal. It is rejected.
9. Reload the page: everything persists.

## How it is built
```
public/
  index.html            single-page shell
  css/styles.css        design system (CSS variables for colours, spacing, radii)
  js/store.js           the "backend": data, business rules, validation (localStorage)
  js/app.js             DOM helpers, router, role switcher, modals, toasts
  js/marketplace.js     customer: marketplace, details, 3-step pre-booking, My Orders
  js/restaurant.js      restaurant dashboard
  js/donations.js       donation organization dashboard
  assets/logo.png       SURPLUS logo
server.js               optional zero-dependency static server
test/store.test.js      rule tests
```
**Design choice:** every rule lives in `store.js`. The screens only call it and display the result, so the UI cannot bypass validation. The functions mirror what REST endpoints would do, so this can later be swapped for Express and SQLite.

## Important business rules (all enforced in `store.js`)
- **Stock:** never negative; an order cannot exceed available quantity (max 10 per order); a reservation re-checks stock, expiry and price in a single step. Price and total come from the listing, never from the form.
- **Expiry:** checked on every read and write and by a 20-second timer. Expired listings cannot be bought, edited or reactivated; the restaurant must create a **new** listing (the "Relist" button pre-fills the form). Deadlines are never extended automatically. Expired food is **never** moved to donations.
- **Orders:** `CONFIRMED -> COLLECTED` or `CONFIRMED -> CANCELLED` (or `NOT COLLECTED` after the deadline). Invalid transitions and double collection are rejected. Cancelling returns stock only if the listing is still sellable, and only once. Orders are never shown as paid.
- **Donations:** `AVAILABLE -> ACCEPTED -> COLLECTED` (also released, cancelled or expired). Only one organization can accept; expired donations can't be accepted or collected; the impact count rises only after collection with the quantity handed over. Distribution to beneficiaries is not tracked.
- **Food-safety controls:** mandatory declarations, collection deadlines, required handling and allergen information, listing withdrawal (cancels open reservations), and incident reporting (saved locally, withdraws the listing). These support good practice; they do **not** guarantee food safety.
- **Audit trail:** every stock change, correction and withdrawal is logged (Listings, then "Audit log").
- Money is stored in integer paise and shown in ₹; timestamps are ISO UTC, displayed in local time.

## Known limitations
- **Not the originally specified stack.** The brief asked for Express and SQLite (`better-sqlite3`). This version uses `localStorage` as requested later, so data lives only in one browser on one device. No server API exists, and "atomic" reservation means a single synchronous step, not a database transaction. In particular, two browsers cannot share stock.
- The demo account switcher is not authentication; anyone can switch roles.
- No real payments, maps, distances, notifications or emails. The QR code is a decorative mock.
- Restaurant verification, incident review and beneficiary distribution are future extensions.
- Food photos are local illustrations; an optional image URL only loads if you are online.
- All data is fictional. Impact figures are demo data, not real-world impact, and no carbon-savings estimate is shown.
