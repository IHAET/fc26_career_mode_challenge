/*
 * ⚔️ Head-to-head: challenge a friend to the same challenge (same seed) and
 * follow both saves side by side.
 *
 * Firestore duels/{id}: { players: [uidA, uidB], a: side, b: side, link,
 * title, icon, club, status: 'pending' | 'on' | 'declined', created }, where
 * a side is { uid, handle, done, total, points, trophies, season, updated }.
 * Each player's app keeps their own side up to date from the linked save
 * (entry.duel = id). Only the two players can read or change a duel.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

  let deps = null; // { esc, toast, entries(), stats(entry), shareHash(ch), acceptLink(link) → entry id, mutateEntry, openSave(id), render() }
  const st = { list: null, error: '', pick: '', loadedAt: 0 };
  const data = () => (FC26.account && FC26.account.data && FC26.account.data()) || null;
  const account = () => (FC26.account && FC26.account.state()) || { status: 'off' };
  const me = () => (account().user || {}).uid;
  const profile = () => (FC26.subscriptions && FC26.subscriptions.profile && FC26.subscriptions.profile()) || null;
  const esc = (v) => deps.esc(v == null ? '' : v);
  const fail = (e) => {
    const refused = /permission/i.test(String((e && (e.code || e.message)) || ''));
    if (refused) console.warn('Head-to-head: the database refused. Publish the latest firestore.rules in Firebase.');
    return refused ? '⚔️ Head-to-head isn’t open yet. Check back soon!' : (e && e.message) || 'Couldn’t reach the server. Check your connection and try again.';
  };
  const mySide = (d) => (d.a && d.a.uid === me() ? 'a' : 'b');
  const theirSide = (d) => (mySide(d) === 'a' ? 'b' : 'a');

  /** A side's figures from a save. */
  function side(entry) {
    const s = deps.stats(entry);
    const p = profile();
    return { uid: me(), handle: (p && p.handle) || '', done: s.done, total: s.total, points: s.points, trophies: s.trophies, season: s.season, updated: Date.now() };
  }

  /** Who's ahead: proven points, then objectives ticked, then trophies. */
  function leader(a, b) {
    const k = (x) => [Number(x.points) || 0, Number(x.done) || 0, Number(x.trophies) || 0];
    const [ka, kb] = [k(a || {}), k(b || {})];
    for (let i = 0; i < 3; i++) { if (ka[i] !== kb[i]) return ka[i] > kb[i] ? 'a' : 'b'; }
    return '';
  }

  async function load() {
    const d = data();
    if (!d || account().status !== 'signed-in') return;
    try {
      const rows = await d.where('duels', 'players', 'array-contains', me(), 50);
      st.list = rows.filter((x) => x.status !== 'declined').sort((x, y) => (y.created || 0) - (x.created || 0));
      st.error = '';
      st.loadedAt = Date.now();
    } catch (e) { st.error = fail(e); st.list = []; }
    deps.render();
  }

  /** Incoming challenges waiting for an answer. */
  const pending = () => (st.list || []).filter((x) => x.status === 'pending' && x.b && x.b.uid === me());

  async function create(entryId, raw) {
    const d = data();
    const p = profile();
    if (!p || !p.handle) throw new Error('Pick a username first (🔔 Subscriptions → Following).');
    const entry = deps.entries().find((e) => e.id === entryId);
    if (!entry) throw new Error('Pick one of your saves.');
    if (entry.duel) throw new Error('That save is already in a head-to-head.');
    const handle = String(raw || '').trim().toLowerCase().replace(/^@/, '');
    if (!HANDLE_RE.test(handle)) throw new Error('Type their username, e.g. @gaffer99.');
    const hit = await d.get(`handles/${handle}`);
    if (!hit || !hit.uid) throw new Error(`Nobody is called @${handle}.`);
    if (hit.uid === me()) throw new Error('You can’t challenge yourself!');
    const link = await deps.shareHash(entry.challenge);
    if (!link || link.length > 20000) throw new Error('This challenge is too big to send. Try a generated one.');
    const ch = entry.challenge;
    const id = await d.add('duels', {
      players: [me(), hit.uid], a: side(entry), b: { uid: hit.uid, handle, done: 0, total: side(entry).total, points: 0, trophies: 0, season: '', updated: 0 },
      link, title: String(ch.title).slice(0, 120), icon: String(ch.archetype.icon || '⚔️'), club: String(ch.club.name).slice(0, 60), status: 'pending', created: Date.now(),
    });
    deps.mutateEntry(entryId, (e) => { e.duel = id; });
    deps.toast(`⚔️ Challenge sent to @${handle}`);
    await load();
  }

  async function accept(id) {
    const duel = (st.list || []).find((x) => x.id === id);
    if (!duel) return;
    const entryId = await deps.acceptLink(duel.link);
    if (!entryId) throw new Error('That challenge couldn’t be opened.');
    deps.mutateEntry(entryId, (e) => { e.duel = id; });
    const entry = deps.entries().find((e) => e.id === entryId);
    await data().set(`duels/${id}`, { status: 'on', b: side(entry) }, true);
    deps.toast(`⚔️ Game on against @${duel.a.handle}!`);
    await load();
  }

  async function decline(id) {
    await data().set(`duels/${id}`, { status: 'declined' }, true);
    deps.toast('Challenge declined');
    await load();
  }

  async function leave(id) {
    if (!root.confirm('End this head-to-head for both of you?')) return;
    await data().remove(`duels/${id}`);
    deps.entries().filter((e) => e.duel === id).forEach((e) => deps.mutateEntry(e.id, (x) => { delete x.duel; }));
    await load();
  }

  let timer = null;
  /** After any save change: update your side of every head-to-head. */
  function sync() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const d = data();
      if (!d || account().status !== 'signed-in') return;
      deps.entries().filter((e) => e.duel).forEach((e) => {
        const duel = (st.list || []).find((x) => x.id === e.duel);
        const key = duel ? mySide(duel) : null;
        if (!key || (duel.status !== 'on' && key === 'b')) return;
        const next = side(e);
        const old = duel[key] || {};
        if (['done', 'points', 'trophies', 'season', 'handle'].every((f) => old[f] === next[f])) return;
        duel[key] = next;
        d.set(`duels/${e.duel}`, { [key]: next }, true).catch(() => {});
      });
    }, 2000);
  }

  // ---------- Drawing ----------

  function column(s, lead, label) {
    const pct = s.total ? Math.round(((Number(s.done) || 0) / s.total) * 100) : 0;
    return `
      <div class="h2h-side${lead ? ' is-lead' : ''}">
        <div class="h2h-who">${lead ? '👑 ' : ''}<strong>@${esc(s.handle || '?')}</strong>${label ? ` <small class="muted">${label}</small>` : ''} ${FC26.badges ? FC26.badges.chips(s.uid) : ''}</div>
        <div class="h2h-pts">${Number(s.points) || 0}<small> pts</small></div>
        <span class="progress-bar"><span style="width:${pct}%"></span></span>
        <small class="muted">${Number(s.done) || 0}/${Number(s.total) || 0} ✅ · ${Number(s.trophies) || 0} 🏆${s.season ? ` · ${esc(s.season)}` : ''}</small>
      </div>`;
  }

  function card(x) {
    const mine = mySide(x);
    const theirs = theirSide(x);
    const lead = x.status === 'on' ? leader(x.a, x.b) : '';
    const entry = deps.entries().find((e) => e.duel === x.id);
    let foot;
    if (x.status === 'pending' && mine === 'b') {
      foot = `<button type="button" class="btn btn-small btn-primary" data-cm="h2h-accept" data-id="${esc(x.id)}">⚔️ Accept</button>
        <button type="button" class="btn btn-small" data-cm="h2h-decline" data-id="${esc(x.id)}">Decline</button>`;
    } else if (x.status === 'pending') {
      foot = `<span class="muted small">Waiting for @${esc(x.b.handle)} to accept…</span>
        <button type="button" class="login-link" data-cm="h2h-leave" data-id="${esc(x.id)}">Cancel</button>`;
    } else {
      foot = `${entry ? `<button type="button" class="btn btn-small" data-cm="h2h-open" data-entry="${esc(entry.id)}">📂 Open my save</button>` : '<span class="muted small">Your save isn’t on this device.</span>'}
        <button type="button" class="login-link" data-cm="h2h-leave" data-id="${esc(x.id)}">End</button>`;
    }
    return `
      <li class="h2h">
        <div class="h2h-title">${esc(x.icon)} <strong>${esc(x.title)}</strong> <small class="muted">${esc(x.club)}</small></div>
        ${x.status === 'pending' && mine === 'b' ? `<p class="small">@${esc(x.a.handle)} challenges you to this save!</p>` : ''}
        <div class="h2h-vs">${column(x[mine], lead === mine, 'you')}<span class="h2h-x">VS</span>${column(x[theirs], lead === theirs, '')}</div>
        <div class="h2h-foot">${foot}</div>
      </li>`;
  }

  function view() {
    const s = account();
    if (s.status === 'off') return '<p class="muted">Head-to-head needs accounts, which aren’t switched on for this copy of the app.</p>';
    if (s.status !== 'signed-in') return '<p class="muted">Sign in to challenge friends.</p><button type="button" class="btn btn-small btn-primary" data-cm="signin">👤 Sign in</button>';
    const saves = deps.entries().filter((e) => !e.duel);
    const p = profile();
    const form = !p || !p.handle
      ? '<p class="cm-note">✍️ To challenge friends, pick a username first: <button type="button" class="login-link" data-cm="username">🔔 Subscriptions → Following</button></p>'
      : saves.length ? `
        <form class="cm-form h2h-form" data-cm-form="h2h" autocomplete="off">
          <select name="entry" aria-label="Which save">${saves.map((e) => `<option value="${esc(e.id)}" ${st.pick === e.id ? 'selected' : ''}>${esc(e.challenge.archetype.icon)} ${esc(e.challenge.title)}</option>`).join('')}</select>
          <input type="text" name="handle" maxlength="21" placeholder="Friend’s username: @gaffer99" aria-label="Friend’s username" required>
          <button type="submit" class="btn btn-small btn-primary">⚔️ Send challenge</button>
        </form>`
        : `<p class="muted small">${deps.entries().length ? 'All your saves are already in a head-to-head. Save another challenge to send one.' : 'Save a challenge first, then send it to a friend.'}</p>`;
    const list = st.list;
    return `
      <p class="muted">Challenge a friend to the same save. You both play it and see each other's progress side by side: proven 📸 points first, then objectives and trophies.</p>
      ${form}
      ${st.error ? `<p class="login-error">${esc(st.error)}</p>` : ''}
      ${list == null ? '<p class="muted">Loading…</p>' : list.length ? `<ul class="h2h-list">${list.map(card).join('')}</ul>` : '<p class="muted small">No head-to-heads yet.</p>'}`;
  }

  function show() { if (account().status === 'signed-in' && (st.list == null || Date.now() - st.loadedAt > 30000)) load(); }

  async function onClick(what, b) {
    if (what === 'h2h-accept') { await accept(b.dataset.id); return true; }
    if (what === 'h2h-decline') { await decline(b.dataset.id); return true; }
    if (what === 'h2h-leave') { await leave(b.dataset.id); return true; }
    if (what === 'h2h-open') { deps.openSave(b.dataset.entry); return true; }
    return false;
  }

  async function onSubmit(f) {
    try { await create(f.entry.value, f.handle.value); } catch (e) { st.error = e && e.message && !/permission/i.test(e.code || '') ? e.message : fail(e); deps.render(); }
  }

  /** Preselect a save in the form (from the ⚔️ button on a save). */
  function preselect(entryId) { st.pick = entryId; }

  function init(d) { deps = d; }
  function onAccount() { st.list = null; if (account().status === 'signed-in') load(); }

  FC26.duels = { init, view, show, onClick, onSubmit, sync, load, pending, preselect, onAccount, leader, list: () => st.list || [] };
})(typeof window !== 'undefined' ? window : globalThis);
