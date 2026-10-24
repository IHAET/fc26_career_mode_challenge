/*
 * 🏆 Challenge of the week: everyone gets the same challenge from Monday to
 * Sunday (seeded from the week), and the best proven result wins the 👑
 * weekly champion badge.
 *
 * Results are points from objectives proven with a 📸 screenshot (the same
 * points as the leaderboard), kept in weekly/{week}/entries/{uid}. When the
 * week is over, its winner's app adds the week to their profile's `wins`.
 *
 * Weeks are keyed by the date of their Monday ("YYYY-MM-DD", local time).
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const DAY_MS = 86400000;
  const EPOCH = Date.UTC(2026, 9, 19); // Monday of week #1
  const OPTIONS = Object.freeze({
    difficulty: 'random', archetype: 'any', club: 'any', league: 'any', tier: 'any',
    seasons: 'auto', ruleCount: 'auto', events: true,
  });
  const TOP = 100;

  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const utc = (key) => { const [y, m, d] = key.split('-').map(Number); return Date.UTC(y, m - 1, d); };

  /** The week a date falls in: its Monday's key. */
  function weekKey(date) {
    const d = new Date(date || new Date());
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return keyOf(d);
  }
  const shiftWeek = (key, n) => {
    const d = new Date(utc(key) + n * 7 * DAY_MS);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  };
  const number = (key) => Math.round((utc(key) - EPOCH) / (7 * DAY_MS)) + 1;
  const isKey = (k) => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);

  function challenge(key) {
    const ch = FC26.generator.generateChallenge(OPTIONS, `weekly-${key}`);
    ch.weekly = { week: key, number: number(key) };
    return ch;
  }

  /** Milliseconds until next Monday, local midnight. */
  function msLeft(now) {
    const d = new Date(now || new Date());
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - ((d.getDay() + 6) % 7)));
    return next - d;
  }

  /** Your best result this week from your saves: { entry, points, proofs, done, total } or null. */
  function myResult(entries, key) {
    const P = FC26.proofs;
    const mine = (entries || []).filter((e) => e && e.challenge && e.challenge.weekly && e.challenge.weekly.week === key);
    if (!mine.length) return null;
    const rows = mine.map((e) => ({
      entry: e,
      points: P.points(e),
      proofs: P.proofCount(e),
      done: Object.values(e.progress || {}).filter(Boolean).length,
      total: e.challenge.roadmap.reduce((n, s) => n + s.objectives.length, 0) + 1,
    }));
    return rows.sort((a, b) => b.points - a.points || b.done - a.done)[0];
  }

  // ---------- The Community section ----------

  let deps = null; // { esc, toast, entries(), trackChallenge(ch), openChallenge(ch), render() }
  const st = { week: null, rows: null, champion: undefined, error: '', loadedAt: 0 };
  const data = () => (FC26.account && FC26.account.data && FC26.account.data()) || null;
  const account = () => (FC26.account && FC26.account.state()) || { status: 'off' };
  const profile = () => (FC26.subscriptions && FC26.subscriptions.profile && FC26.subscriptions.profile()) || null;
  const esc = (v) => deps.esc(v == null ? '' : v);

  function countdown(ms) {
    const h = Math.floor(ms / 3600000);
    return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${Math.max(1, Math.round((ms % 3600000) / 60000))}m`;
  }

  /** Put your result for this week on the board. */
  async function publishNow() {
    const d = data();
    const p = profile();
    const s = account();
    if (!d || !p || !p.handle || !s.user) return;
    const key = weekKey();
    const r = myResult(deps.entries(), key);
    if (!r) return;
    try {
      await d.set(`weekly/${key}/entries/${s.user.uid}`, { handle: p.handle, pro: Boolean(p.pro), points: r.points, proofs: r.proofs, done: r.done, total: r.total, updated: Date.now() });
    } catch (e) { /* rules not published yet: the section says so */ }
  }

  let timer = null;
  /** The same, soon after a change. */
  function publish() {
    clearTimeout(timer);
    timer = setTimeout(publishNow, 1500);
  }

  async function load() {
    const d = data();
    const key = weekKey();
    if (!d || account().status !== 'signed-in') return;
    st.week = key;
    st.error = '';
    try {
      const [rows, last] = await Promise.all([
        d.top(`weekly/${key}/entries`, 'points', TOP),
        d.top(`weekly/${shiftWeek(key, -1)}/entries`, 'points', 1),
      ]);
      st.rows = rows;
      st.champion = last[0] && Number(last[0].points) > 0 ? last[0] : null;
      st.loadedAt = Date.now();
      // Last week's winner collects the badge.
      const me = account().user.uid;
      if (st.champion && st.champion.id === me && FC26.subscriptions.addWin) FC26.subscriptions.addWin(shiftWeek(key, -1)).catch(() => {});
    } catch (e) {
      const refused = /permission/i.test(String(e.code || e.message));
      if (refused) console.warn('Weekly: the database refused. Publish the latest firestore.rules in Firebase.');
      st.error = refused ? '🏆 The weekly standings aren’t open yet. Check back soon!' : 'Couldn’t load the standings. Check your connection and try again.';
      st.rows = [];
    }
    deps.render();
  }

  const medal = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}`;

  function view() {
    const key = weekKey();
    const ch = challenge(key);
    const r = myResult(deps.entries(), key);
    const s = account();
    const badge = FC26.badges ? FC26.badges.chips : () => '';
    let board;
    if (s.status === 'off') board = '<p class="muted small">The standings need accounts, which aren’t switched on for this copy of the app.</p>';
    else if (s.status !== 'signed-in') board = '<p class="muted small">Sign in to get on the standings.</p><button type="button" class="btn btn-small btn-primary" data-cm="signin">👤 Sign in</button>';
    else if (st.error) board = `<p class="login-error">${esc(st.error)}</p>`;
    else if (st.rows == null || st.week !== key) board = '<p class="muted">Loading…</p>';
    else {
      const rows = st.rows.filter((x) => Number(x.points) > 0 || Number(x.done) > 0);
      const me = s.user.uid;
      board = rows.length ? `<ol class="lb-list">${rows.map((x, i) => `
        <li class="lb-row${x.id === me ? ' is-me' : ''}"><span class="lb-rank">${medal(i)}</span>
          <span class="lb-name"><strong>@${esc(x.handle)} ${badge(x.id)}</strong><small class="muted">${Number(x.proofs) || 0} 📸 · ${Number(x.done) || 0}/${Number(x.total) || 0} ✅</small></span>
          <span class="lb-pts">${Number(x.points) || 0}</span></li>`).join('')}</ol>`
        : '<p class="muted">Nobody has proven an objective this week yet. Be first!</p>';
    }
    const p = profile();
    return `
      <div class="wk-head">
        <div>
          <span class="eyebrow-plain">🏆 Challenge of the week #${number(key)}</span>
          <h3>${esc(ch.archetype.icon)} ${esc(ch.title)}</h3>
          <p class="muted small">${esc(ch.club.name)} · ${esc(ch.difficultyName)} · ${ch.seasons} season${ch.seasons === 1 ? '' : 's'} · ends in <strong>${countdown(msLeft())}</strong></p>
        </div>
        <div class="wk-actions">
          <button type="button" class="btn btn-small btn-primary" data-cm="wk-track">📒 Take it on</button>
          <button type="button" class="btn btn-small" data-cm="wk-open">👀 See the rules</button>
        </div>
      </div>
      <p class="muted small">Everyone plays the same challenge until Sunday night. Prove objectives with a 📸 screenshot on your save: the most points wins the 👑 weekly champion badge, shown next to your name in the forum.</p>
      ${r ? `<p class="wk-me">Your result: <strong>${r.points} points</strong> · ${r.proofs} 📸 · ${r.done}/${r.total} ✅${p && p.handle ? '' : ' <span class="muted small">(pick a username in 🔔 Subscriptions → Following to appear on the standings)</span>'}</p>` : ''}
      ${st.champion ? `<p class="wk-champ">👑 Last week's champion: <strong>@${esc(st.champion.handle)}</strong> with ${Number(st.champion.points) || 0} points</p>` : ''}
      <h4 class="cm-sub">Standings</h4>
      ${board}`;
  }

  /** The section was opened. */
  function show() {
    if (account().status === 'signed-in' && (st.rows == null || st.week !== weekKey() || Date.now() - st.loadedAt > 60000)) {
      clearTimeout(timer);
      publishNow().then(load);
    }
  }

  function onClick(what) {
    const ch = challenge(weekKey());
    if (what === 'wk-track') { deps.trackChallenge(ch); return true; }
    if (what === 'wk-open') { deps.openChallenge(ch); return true; }
    return false;
  }

  function init(d) { deps = d; }
  function onAccount() { st.rows = null; st.champion = undefined; }

  FC26.weekly = { weekKey, shiftWeek, number, isKey, challenge, msLeft, myResult, init, view, show, onClick, publish, onAccount };
})(typeof window !== 'undefined' ? window : globalThis);
