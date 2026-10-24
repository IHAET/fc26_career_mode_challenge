/*
 * 🏆 Leaderboard: players ranked by points from proven objectives (an
 * objective counts once it has a 📸 proof photo), and countries by the
 * points of their players. Each player's totals live in leaderboard/{uid},
 * written by their own app; their proof photos are one tap away.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const COUNTRY_KEY = 'fc26-country-v1';
  const SHOW_KEY = 'fc26-on-board-v1';
  const TOP = 200;

  let deps = null; // { esc, toast, entries(), storageGet, storageSet }
  let modal = null;
  const st = { tab: 'players', rows: null, loading: false, error: '', viewing: null };

  const esc = (v) => deps.esc(v == null ? '' : v);
  const data = () => (FC26.account && FC26.account.data && FC26.account.data()) || null;
  const account = () => (FC26.account && FC26.account.state()) || { status: 'off' };
  const profile = () => (FC26.subscriptions && FC26.subscriptions.profile && FC26.subscriptions.profile()) || null;
  const country = () => deps.storageGet(COUNTRY_KEY, '');
  const onBoard = () => deps.storageGet(SHOW_KEY, true) !== false;

  /** Your totals from your saves. */
  function totals() {
    const P = FC26.proofs;
    const list = deps.entries();
    return {
      points: list.reduce((n, e) => n + P.points(e), 0),
      proofs: list.reduce((n, e) => n + P.proofCount(e), 0),
      challenges: list.filter((e) => P.proofCount(e) > 0).length,
    };
  }

  let timer = null;
  /** Put your totals on the leaderboard (soon after a change), if you're signed in with a username. */
  function publish() {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const d = data();
      const p = profile();
      const s = account();
      if (!d || !p || !p.handle || !s.user) return;
      try {
        if (!onBoard()) { await d.remove(`leaderboard/${s.user.uid}`); return; }
        await d.set(`leaderboard/${s.user.uid}`, Object.assign({ handle: p.handle, name: p.name || '', country: country(), pro: Boolean(p.pro), updated: Date.now() }, totals()));
      } catch (e) { /* rules not published yet: the panel says so */ }
    }, 1500);
  }

  async function load() {
    const d = data();
    st.loading = true;
    st.error = '';
    render();
    try {
      st.rows = await d.top('leaderboard', 'points', TOP);
    } catch (e) {
      // The site owner's hint goes to the console; players get a plain message.
      const refused = /permission/i.test(String(e.code || e.message));
      if (refused) console.warn('Leaderboard: the database refused. Publish the latest firestore.rules in Firebase.');
      st.error = refused ? '🏆 The leaderboard isn’t open yet. Check back soon!' : 'Couldn’t load the leaderboard. Check your connection and try again.';
    }
    st.loading = false;
    render();
  }

  function countries(rows) {
    const by = new Map();
    rows.filter((r) => r.country).forEach((r) => {
      const c = by.get(r.country) || { country: r.country, points: 0, players: 0, best: r };
      c.points += Number(r.points) || 0;
      c.players += 1;
      if ((Number(r.points) || 0) > (Number(c.best.points) || 0)) c.best = r;
      by.set(r.country, c);
    });
    return Array.from(by.values()).sort((a, b) => b.points - a.points);
  }

  const medal = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}`;

  function body() {
    const s = account();
    if (s.status === 'off') return '<p class="muted">The leaderboard needs accounts, which aren’t switched on for this copy of the app.</p>';
    if (s.status !== 'signed-in') return '<p class="muted">Sign in to see the leaderboard and get on it.</p><button type="button" class="btn btn-primary btn-small" data-lb="signin">👤 Sign in</button>';
    const p = profile();
    const t = totals();
    const mine = `
      <div class="lb-me">
        <div><strong>${p && p.handle ? `@${esc(p.handle)}` : 'You'}</strong> · ${t.points} points · ${t.proofs} proof${t.proofs === 1 ? '' : 's'}
          ${p && p.handle ? '' : '<br><span class="muted small">Pick a username in 🔔 Subscriptions → Following to appear here.</span>'}</div>
        <label class="lb-country">Your country <select data-lb-field="country"><option value="">Choose…</option>${FC26.compliance.NATIONALITIES.map((n) => `<option ${country() === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label>
        <label class="toggle"><input type="checkbox" data-lb-field="show" ${onBoard() ? 'checked' : ''}> Show me on the leaderboard</label>
      </div>`;
    if (st.viewing) {
      const v = st.viewing;
      return `${mine}
        <div class="lb-proofs">
          <button type="button" class="btn btn-small" data-lb="back">← Back</button>
          <h3>📸 @${esc(v.row.handle)}'s proofs</h3>
          ${v.items == null ? '<p class="muted">Loading…</p>' : v.items.length ? `<div class="lb-gallery">${v.items.map((it, i) => `
            <button type="button" class="lb-shot" data-lb="shot" data-i="${i}"><img src="${it.image}" alt=""><span><strong>${esc(it.objective || 'Challenge')}</strong><small class="muted">${esc(it.title || '')}</small></span></button>`).join('')}</div>` : '<p class="muted">No shared proofs yet.</p>'}
        </div>`;
    }
    const tabs = `<div class="seg lb-tabs"><button type="button" class="${st.tab === 'players' ? 'is-on' : ''}" data-lb="tab" data-tab="players">👤 Players</button><button type="button" class="${st.tab === 'countries' ? 'is-on' : ''}" data-lb="tab" data-tab="countries">🌍 Countries</button></div>`;
    if (st.error) return `${mine}${tabs}<p class="login-error">${esc(st.error)}</p>`;
    if (st.loading || !st.rows) return `${mine}${tabs}<p class="muted">Loading…</p>`;
    const rows = st.rows.filter((r) => (Number(r.points) || 0) > 0);
    if (st.tab === 'countries') {
      const list = countries(rows);
      return `${mine}${tabs}${list.length ? `<ol class="lb-list">${list.map((c, i) => `
        <li class="lb-row${c.country === country() ? ' is-me' : ''}"><span class="lb-rank">${medal(i)}</span><span class="lb-name"><strong>${esc(c.country)}</strong><small class="muted">${c.players} player${c.players === 1 ? '' : 's'} · best @${esc(c.best.handle)}</small></span><span class="lb-pts">${c.points}</span></li>`).join('')}</ol>`
        : '<p class="muted">No countries yet: set yours above.</p>'}`;
    }
    const meUid = account().user.uid;
    return `${mine}${tabs}${rows.length ? `<ol class="lb-list">${rows.map((r, i) => `
      <li class="lb-row${r.id === meUid ? ' is-me' : ''}"><span class="lb-rank">${medal(i)}</span>
        <span class="lb-name"><strong>@${esc(r.handle)}${r.pro ? ' <span class="pro-badge">⭐ PRO</span>' : ''}</strong><small class="muted">${esc([r.country, `${r.proofs || 0} proof${r.proofs === 1 ? '' : 's'}`, `${r.challenges || 0} challenge${r.challenges === 1 ? '' : 's'}`].filter(Boolean).join(' · '))}</small></span>
        <span class="lb-pts">${Number(r.points) || 0}</span>
        <button type="button" class="btn btn-small" data-lb="view" data-uid="${esc(r.id)}">📸</button></li>`).join('')}</ol>`
      : '<p class="muted">Nobody has proven an objective yet. Add a 📸 screenshot to one of yours to be first!</p>'}`;
  }

  function render() {
    if (!modal || modal.hidden) return;
    modal.querySelector('.lb-card').innerHTML = `
      <button type="button" class="icon-btn subs-close" data-lb="close" aria-label="Close">✕</button>
      <h2 id="lb-title">🏆 Leaderboard</h2>
      <p class="muted small">Points come from objectives you've proven with a 📸 screenshot: main 10, side 5, final goal 30, more on harder difficulties.</p>
      ${body()}`;
  }

  function open() {
    modal.hidden = false;
    document.body.classList.add('modal-open');
    st.viewing = null;
    render();
    if (account().status === 'signed-in') { publish(); load(); }
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  async function onClick(e) {
    if (e.target === modal) return close();
    const b = e.target.closest('[data-lb]');
    if (!b) return undefined;
    const what = b.dataset.lb;
    if (what === 'close') return close();
    if (what === 'signin') { close(); return document.getElementById('account-btn').click(); }
    if (what === 'tab') { st.tab = b.dataset.tab; return render(); }
    if (what === 'back') { st.viewing = null; return render(); }
    if (what === 'view') {
      const row = (st.rows || []).find((r) => r.id === b.dataset.uid);
      st.viewing = { row, items: null };
      render();
      st.viewing.items = await FC26.proofs.sharedBy(b.dataset.uid).catch(() => []);
      return render();
    }
    if (what === 'shot') {
      const items = st.viewing.items;
      return FC26.proofs.show(items.map((it) => ({ src: it.image, caption: `@${st.viewing.row.handle}: ${it.objective || ''} (${it.title || ''})` })), Number(b.dataset.i));
    }
    return undefined;
  }

  function onChange(e) {
    const f = e.target.dataset.lbField;
    if (f === 'country') deps.storageSet(COUNTRY_KEY, e.target.value);
    if (f === 'show') deps.storageSet(SHOW_KEY, e.target.checked);
    publish();
    deps.toast(f === 'country' ? `Country set to ${e.target.value || 'none'}` : e.target.checked ? 'You’re on the leaderboard 🏆' : 'You’re off the leaderboard');
    setTimeout(load, 1800);
  }

  function init(d) {
    deps = d;
    modal = document.getElementById('board');
    const btn = document.getElementById('board-btn');
    if (!modal || !btn) return;
    btn.addEventListener('click', open);
    modal.addEventListener('click', onClick);
    modal.addEventListener('change', onChange);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden && !document.querySelector('.proof-viewer:not([hidden])')) close(); });
  }

  FC26.leaderboard = { init, open, publish, totals, countries };
})(typeof window !== 'undefined' ? window : globalThis);
