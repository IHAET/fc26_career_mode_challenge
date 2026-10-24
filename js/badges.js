/*
 * 🎖️ Badges next to usernames (forum, player picks, standings): leaderboard
 * rank, 👑 weekly champion wins, ⭐ Pro and a few unlocked achievements.
 *
 * Achievements and wins live on each profile (profiles/{uid}: badges, wins),
 * written by its owner's app; ranks come from the leaderboard. Both are
 * fetched once and cached, and chips() slots fill in when they arrive.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const SHOW = 3; // achievement icons shown before "+N"
  const STALE = 5 * 60000;

  const profiles = new Map(); // uid → profile | null (none) | 'loading'
  let ranks = null; // uid → rank (1-based)
  let ranksAt = 0;
  let ranksLoading = false;
  let redrawTimer = null;

  const data = () => (FC26.account && FC26.account.data && FC26.account.data()) || null;
  const signedIn = () => FC26.account && FC26.account.state().status === 'signed-in';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const defs = () => new Map(((FC26.achievements && FC26.achievements.DEFS) || []).map((d) => [d.id, d]));

  function soon() {
    clearTimeout(redrawTimer);
    // Fill in every badge slot on the page, leaving the rest (forms being typed in) alone.
    redrawTimer = setTimeout(() => {
      if (typeof document === 'undefined') return;
      document.querySelectorAll('[data-bdg-uid]').forEach((slot) => { slot.innerHTML = inner(slot.dataset.bdgUid); });
    }, 50);
  }

  function fetchProfile(uid) {
    const d = data();
    if (!d || !uid || profiles.has(uid)) return;
    profiles.set(uid, 'loading');
    d.get(`profiles/${uid}`).then((p) => { profiles.set(uid, p || null); soon(); }, () => profiles.set(uid, null));
  }

  function fetchRanks() {
    const d = data();
    if (!d || ranksLoading || (ranks && Date.now() - ranksAt < STALE)) return;
    ranksLoading = true;
    d.top('leaderboard', 'points', 200).then((rows) => {
      ranks = new Map(rows.filter((r) => Number(r.points) > 0).map((r, i) => [r.id, i + 1]));
      ranksAt = Date.now();
      ranksLoading = false;
      soon();
    }, () => { ranks = new Map(); ranksAt = Date.now(); ranksLoading = false; });
  }

  /** The badges as data: { rank, wins, pro, achievements: [{icon, name}] }. */
  function of(profile, rank) {
    const all = defs();
    const p = profile || {};
    return {
      rank: rank || 0,
      wins: Array.isArray(p.wins) ? p.wins.length : 0,
      pro: Boolean(p.pro),
      achievements: (Array.isArray(p.badges) ? p.badges : []).map((id) => all.get(id)).filter(Boolean).map((d) => ({ icon: d.icon, name: d.name })),
    };
  }

  /** Small badge chips as HTML. */
  function html(b) {
    const out = [];
    if (b.rank) out.push(`<span class="bdg bdg-rank" title="Leaderboard rank #${b.rank}">${['🥇', '🥈', '🥉'][b.rank - 1] || `#${b.rank}`}</span>`);
    if (b.wins) out.push(`<span class="bdg bdg-win" title="Weekly champion ${b.wins} time${b.wins === 1 ? '' : 's'}">👑${b.wins > 1 ? `×${b.wins}` : ''}</span>`);
    if (b.pro) out.push('<span class="bdg bdg-pro" title="Pro">⭐</span>');
    if (b.achievements.length) {
      const names = b.achievements.map((a) => a.name).join(', ');
      const icons = b.achievements.slice(-SHOW).map((a) => a.icon).join('');
      const more = b.achievements.length > SHOW ? `<small>+${b.achievements.length - SHOW}</small>` : '';
      out.push(`<span class="bdg bdg-ach" title="${esc(`${b.achievements.length} achievement${b.achievements.length === 1 ? '' : 's'}: ${names}`)}">${icons}${more}</span>`);
    }
    return out.length ? `<span class="bdgs">${out.join('')}</span>` : '';
  }

  function inner(uid) {
    fetchRanks();
    const p = profiles.get(uid);
    if (p === undefined) fetchProfile(uid);
    return html(of(p && p !== 'loading' ? p : null, ranks && ranks.get(uid)));
  }

  /** Badge chips for a user id, in a slot that fills in when what's missing arrives. */
  function chips(uid) {
    if (!uid || !signedIn()) return '';
    return `<span class="bdg-slot" data-bdg-uid="${esc(uid)}">${inner(uid)}</span>`;
  }

  /** Your own profile changed (badges, wins): show it without a refetch. */
  function remember(uid, profile) { if (uid) { profiles.set(uid, profile || null); soon(); } }

  function reset() { profiles.clear(); ranks = null; ranksAt = 0; }

  FC26.badges = { chips, of, html, remember, reset };
})(typeof window !== 'undefined' ? window : globalThis);
