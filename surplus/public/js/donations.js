/*
 * Donation organization dashboard: available offers, accept, record collection.
 * This is NOT a marketplace: nothing here is bought or sold.
 */
(function () {
  'use strict';
  const { h } = App;

  App.views.org = function (route, user) {
    const s = Store.orgStats(user.id);
    const stat = (cls, n, label, note) => h('div', { class: 'stat ' + cls }, h('strong', null, n), h('span', null, label), note ? h('span', { class: 'stat-note' }, note) : null);
    return h('div', { class: 'container' },
      h('div', { class: 'dash-head' },
        h('div', null, h('h1', null, route.tab === 'mine' ? 'My donations' : 'Available donations'), h('p', null, user.name, ' · demo donation organization')),
        h('button', { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => { App.render(); App.toast('Dashboard refreshed.'); } }, 'Refresh')),
      h('div', { class: 'stat-grid', style: 'margin-bottom:1.5rem' },
        stat('amber', s.availableNow, 'Offers available now'),
        stat('sage', s.accepted, 'Accepted, awaiting pickup'),
        stat('green', s.collected, 'Donations collected'),
        stat('green', s.portionsCollected, 'Portions collected', 'Recorded handed over. Distribution to beneficiaries is not tracked.')),
      route.tab === 'mine' ? mine(user) : available(user));
  };

  function available(user) {
    const list = Store.listDonations(user.id).filter((d) => d.status === 'AVAILABLE');
    return h('div', null,
      h('div', { class: 'notice', style: 'margin-top:0' }, 'Accepting reserves the donation for your organization. Expired offers cannot be accepted. Check the handling information before collecting.'),
      list.length ? h('div', { class: 'grid' }, list.map((d) => donationCard(d, user))) : h('div', { class: 'empty' }, h('h3', null, 'No donations available right now'), h('p', null, 'Restaurants publish new offers here. Switch to a restaurant demo account to create one.')));
  }

  function mine(user) {
    const list = Store.listDonations(user.id).filter((d) => d.organization_id === user.id);
    return list.length ? h('div', { class: 'grid' }, list.map((d) => donationCard(d, user)))
      : h('div', { class: 'empty' }, h('h3', null, 'Nothing accepted yet'), h('p', null, 'Accept an available donation and it will show here.'), h('a', { class: 'btn', href: '#/org/available' }, 'See available donations'));
  }

  function donationCard(d, user) {
    const mineAccepted = d.status === 'ACCEPTED' && d.organization_id === user.id;
    const acceptBtn = h('button', { type: 'button', class: 'btn btn-amber btn-block' }, 'Accept donation');
    acceptBtn.onclick = async () => {
      try { await App.run(acceptBtn, () => Store.acceptDonation(user.id, d.id)); App.toast('Accepted "' + d.food_name + '". Collect it before the deadline.', 'success'); }
      catch (e) { App.handleError(e); }
      App.render();
    };
    return h('article', { class: 'card' },
      h('div', { class: 'card-body' },
        h('div', { class: 'tags' }, App.donationBadge(d.status)),
        h('h3', null, d.food_name),
        h('p', { class: 'rest-name' }, d.restaurant.name),
        d.description ? h('p', { class: 'small' }, d.description) : null,
        h('ul', { class: 'meta-list' },
          h('li', null, (d.status === 'COLLECTED' ? d.quantity_handed_over + ' of ' + d.quantity_available + ' portions handed over' : d.quantity_available + ' portions available')),
          h('li', null, 'Prepared ' + App.dateTime(d.prepared_at)),
          h('li', null, 'Collect by ' + App.dateTime(d.collection_deadline) + (d.status === 'AVAILABLE' || d.status === 'ACCEPTED' ? ' (' + App.timeLeft(d.collection_deadline) + ')' : '')),
          h('li', null, 'Pickup: ' + d.restaurant.pickup_address),
          d.accepted_at ? h('li', null, 'Accepted ' + App.dateTime(d.accepted_at) + (d.organization ? ' by ' + d.organization.name : '')) : null,
          d.collected_at ? h('li', null, 'Collected ' + App.dateTime(d.collected_at)) : null),
        h('div', { class: 'notice', style: 'margin:.5rem 0' }, h('strong', null, 'Handling: '), d.handling_information),
        h('div', { class: 'card-foot' },
          d.status === 'AVAILABLE' ? acceptBtn : null,
          mineAccepted ? h('div', { class: 'actions' },
            h('button', { type: 'button', class: 'btn', onclick: () => recordCollection(d, user) }, 'Record collection'),
            h('button', { type: 'button', class: 'btn btn-outline', onclick: () => release(d, user) }, 'Release')) : null)));
  }

  function recordCollection(d, user) {
    const qty = App.field({ label: 'Quantity handed over', name: 'qty', type: 'number', min: 1, max: d.quantity_available, step: 1, value: d.quantity_available, hint: 'Offered: ' + d.quantity_available + ' portions. Enter what was actually handed to you.' });
    const err = h('div', { class: 'field-error', role: 'alert' });
    const ok = h('button', { type: 'button', class: 'btn btn-amber' }, 'Confirm collection');
    const m = App.openModal({ title: 'Record collection', size: 'narrow', body: h('div', null, h('p', null, d.food_name + ' from ' + d.restaurant.name), qty, err, h('p', { class: 'small muted', style: 'margin-top:.75rem' }, 'This records that you collected the food. It does not record distribution to beneficiaries.')) });
    m.setFooter([h('button', { type: 'button', class: 'btn btn-outline', onclick: () => m.close() }, 'Cancel'), ok]);
    ok.onclick = async () => {
      err.textContent = '';
      try {
        await App.run(ok, () => Store.collectDonation(user.id, d.id, qty.querySelector('input').value));
        m.close(); App.toast('Collection recorded. Impact figures updated.', 'success'); App.render();
      } catch (e) { if (e instanceof Store.StoreError) { err.textContent = e.message; if (/expired/i.test(e.message)) { m.close(); App.handleError(e); App.render(); } } else App.handleError(e); }
    };
  }

  async function release(d, user) {
    const yes = await App.confirm({ title: 'Release this donation?', message: 'It will go back to the available list so another organization can accept it.', confirmText: 'Release', cancelText: 'Keep', danger: true });
    if (!yes) return;
    try { Store.releaseDonation(user.id, d.id); App.toast('Donation released.', 'success'); } catch (e) { App.handleError(e); }
    App.render();
  }
})();
