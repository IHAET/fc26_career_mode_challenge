/*
 * Season tracker UI: Squad, Transfers and (Player Career) Career moves, shown
 * inside a saved challenge and, for transfers, in the stand-alone Transfers
 * section. Rule checking lives in compliance.js and the transfer assistant
 * in assistant.js; app.js renders rule results next to each rule.
 *
 * app.js calls init() with shared helpers, renders with renderTracker(),
 * and forwards click/change events from the saved list.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const C = FC26.compliance;
  const G = FC26.generator;
  const A = FC26.assistant;
  const DB = FC26.playerDB;

  const POSITIONS = ['GK', 'RB', 'LB', 'CB', 'RWB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'];
  const IN_TYPES = [['permanent', 'Permanent'], ['loan', 'Loan'], ['free', 'Free transfer'], ['promotion', 'Academy promotion']];
  const OUT_TYPES = [['sale', 'Sale'], ['loan', 'Loan out'], ['release', 'Release']];
  const MOVE_TYPES = [['permanent', 'Transfer'], ['loan', 'Loan'], ['free', 'Free transfer']];

  let deps = null; // { esc, toast, mutateEntry, findEntry, refresh, rememberKnown }
  const tabs = {}; // saved entry id → open tab

  const esc = (v) => deps.esc(v == null ? '' : v);
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const n = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
  const money = (m) => (Math.abs(m) >= 1 ? `€${+m.toFixed(1)}M` : `€${Math.round(m * 1000)}K`);
  const opts = (list, selected) => list.map(([v, label]) => `<option value="${v}" ${String(selected) === String(v) ? 'selected' : ''}>${esc(label)}</option>`).join('');

  function init(d) {
    deps = d;
  }

  const trackerOf = (entry) => C.normalizeTracker(entry.tracker);
  const realSquad = (club) => (FC26.squads && FC26.squads.clubs && FC26.squads.clubs[club]) || null;
  // Ages are worked out for the start of the season you're on (season 1 = summer 2025).
  function seasonDay(season) {
    const start = (FC26.squads && FC26.squads.seasonStart) || '2025-07-01';
    return `${Number(start.slice(0, 4)) + (Number(season) || 1) - 1}${start.slice(4)}`;
  }
  const isPlayer = (entry) => entry.challenge.mode === 'player';

  // ---------- Rendering ----------

  function renderTracker(entry, challengeHtml) {
    const t = trackerOf(entry);
    const tab = tabs[entry.id] || 'challenge';
    const seasons = Math.max(entry.challenge.seasons, t.season);
    const tabBtn = (id, label, count) => `<button type="button" class="ttab ${tab === id ? 'is-active' : ''}" data-action="ttab" data-tab="${id}" role="tab" aria-selected="${tab === id}">${label}${count != null ? ` <span class="count">${count}</span>` : ''}</button>`;
    return `
      <div class="tracker">
        <div class="tracker-bar">
          <span class="tracker-now">📅 Now:
            <select data-tracker="season" aria-label="Current season">${opts(Array.from({ length: seasons }, (_, i) => [i + 1, `Season ${i + 1}`]), t.season)}</select>
            ${isPlayer(entry) ? '' : `<select data-tracker="window" aria-label="Current transfer window">${opts([['summer', 'Summer window'], ['winter', 'January window']], t.window)}</select>`}
          </span>
          <button type="button" class="btn btn-small btn-spotify-soft" data-action="open-soundtrack" title="Make a Spotify playlist for this save">🎧 Soundtrack</button>
          <button type="button" class="btn btn-small btn-yt-soft" data-action="open-videos" title="Videos of creators playing career modes like this">📺 Videos</button>
          <button type="button" class="btn btn-small btn-danger-soft" data-action="delete" title="Delete this save" aria-label="Delete this save">🗑️</button>
          <div class="tracker-tabs" role="tablist">
            ${tabBtn('challenge', '📋 Challenge')}
            ${isPlayer(entry)
    ? tabBtn('moves', '🧳 Career moves', t.moves.length)
    : `${tabBtn('squad', '👥 Squad', t.players.filter((p) => !p.loanedOut).length)}${tabBtn('transfers', '🔁 Transfers', t.transfers.length)}${tabBtn('scout', '🔭 Scout', (entry.shortlist || []).length || null)}`}
            ${FC26.matches ? tabBtn('matches', '📰 Matches', (entry.matches || []).length) : ''}
          </div>
        </div>
        <div class="tpanel" data-panel="challenge" ${tab === 'challenge' ? '' : 'hidden'}>${challengeHtml}</div>
        ${isPlayer(entry)
    ? `<div class="tpanel" data-panel="moves" ${tab === 'moves' ? '' : 'hidden'}>${renderMoves(entry, t)}</div>`
    : `<div class="tpanel" data-panel="squad" ${tab === 'squad' ? '' : 'hidden'}>${renderSquad(entry, t)}</div>
        <div class="tpanel" data-panel="transfers" ${tab === 'transfers' ? '' : 'hidden'}>${renderTransfers(entry, t)}</div>
        <div class="tpanel" data-panel="scout" ${tab === 'scout' ? '' : 'hidden'}>${tab === 'scout' ? renderScout(entry, t) : ''}</div>`}
        ${FC26.matches ? `<div class="tpanel" data-panel="matches" ${tab === 'matches' ? '' : 'hidden'}>${FC26.matches.render(entry)}</div>` : ''}
      </div>`;
  }

  function squadStats(t) {
    const squad = t.players.filter((p) => !p.loanedOut);
    const xi = squad.filter((p) => p.starter).length;
    const ages = squad.map((p) => n(p.age)).filter((a) => a);
    const wages = squad.reduce((sum, p) => sum + (n(p.wage) || 0), 0);
    const bits = [`${squad.length} players`, `⭐ XI ${xi}/11`];
    if (ages.length) bits.push(`avg age ${(ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1)}`);
    if (wages) bits.push(`wages €${wages >= 1000 ? `${(wages / 1000).toFixed(2)}M` : `${Math.round(wages)}K`}/week`);
    const out = t.players.length - squad.length;
    if (out) bits.push(`${out} out on loan`);
    return bits.join(' · ');
  }

  // ---------- Wonderkid scout ----------

  const scoutState = {}; // entry id → filters and how many to show

  function scoutFilters(id) {
    return scoutState[id] || (scoutState[id] = { group: '', maxAge: 21, leagueId: '', query: '', fits: true, shown: 15 });
  }

  const scoutData = (p) => esc(JSON.stringify({ name: p.name, pos: p.pos, age: p.age, nat: p.nat, club: p.club, ovr: p.ovr || '' }));

  function scoutRow(p, fit, shortlisted) {
    return `
      <div class="scout-row${p.known ? ' is-known' : ''}">
        <span class="sr-main">
          <strong>${p.ovr ? `<span class="sr-ovr ${ovrBand(p.ovr)}" title="Overall rating in FC 26">${esc(p.ovr)}</span> ` : ''}${p.known ? '<span class="sr-star" title="Widely rated young talent">⭐</span> ' : ''}${esc(p.name)}</strong>
          <small>${[p.pos, p.age ? `${p.age} yrs` : '', p.nat, p.club ? `${p.club}${p.loan === 'in' ? ' (on loan)' : ''}` : ''].filter(Boolean).map(esc).join(' · ')}</small>
        </span>
        ${fit ? `<span class="sr-fit ${fit.ok ? 'ok' : 'bad'}" title="${esc(fit.ok ? 'Signing him breaks none of the rules this tracker can check' : fit.breaks.map((b) => b.text).join(' · '))}">${fit.ok ? '✅ Fits your rules' : `❌ ${esc(fit.breaks[0].text)}`}</span>` : '<span></span>'}
        <span class="sr-actions">
          <button type="button" class="btn btn-small${shortlisted ? ' is-on' : ''}" data-action="scout-short" data-p="${scoutData(p)}" aria-pressed="${shortlisted}">${shortlisted ? '🎯 Shortlisted' : '🎯 Shortlist'}</button>
          <button type="button" class="btn btn-small btn-primary" data-action="scout-sign" data-p="${scoutData(p)}">⬇️ Sign</button>
        </span>
      </div>`;
  }

  function scoutList(entry, t) {
    const s = scoutFilters(entry.id);
    const exclude = new Set(t.players.map((p) => DB.key(p.name)));
    const all = FC26.scout.prospects(seasonDay(t.season), { maxAge: s.maxAge, group: s.group, leagueId: s.leagueId, query: s.query, exclude });
    const short = new Set((entry.shortlist || []).map((p) => DB.key(p.name)));
    const cache = {};
    const rows = [];
    let looked = 0;
    for (const p of all) {
      if (rows.length >= s.shown || looked >= 600) break;
      looked += 1;
      const fit = A.precheck(entry.challenge, t, { dir: 'in', type: 'permanent', name: p.name, nat: p.nat, pos: p.pos, age: p.age, fee: '', season: t.season, window: t.window, club: p.club }, cache);
      if (s.fits && !fit.ok) continue;
      rows.push(scoutRow(p, fit, short.has(DB.key(p.name))));
    }
    if (!rows.length) {
      return `<p class="muted empty-note">${all.length ? 'Nobody in the first few hundred prospects fits all your rules with these filters. Untick "Only players who fit my rules" or loosen a filter.' : 'No young players match these filters.'}</p>`;
    }
    const more = rows.length >= s.shown && looked < all.length;
    return rows.join('') + (more ? '<button type="button" class="btn btn-small scout-more" data-action="scout-more">Show more</button>' : '');
  }

  function renderScout(entry, t) {
    const s = scoutFilters(entry.id);
    const short = entry.shortlist || [];
    const leagues = (G.CLUBS || []).reduce((m, c) => (m.some(([id]) => id === c.leagueId) ? m : m.concat([[c.leagueId, c.league]])), []);
    return `
      <div class="scout">
        <p class="scout-intro"><strong>🔭 Wonderkid scout.</strong> <span class="muted">Young players from every club's FC 26 squad, best prospects first (⭐ = widely rated talent), each checked against this challenge's rules. The number is each player's FC 26 rating at launch; potential isn't included, so ask your scouts in the game.</span></p>
        ${short.length ? `<div class="shortlist"><h4>🎯 Your shortlist</h4>${short.map((p) => scoutRow(p, A.precheck(entry.challenge, t, { dir: 'in', type: 'permanent', name: p.name, nat: p.nat, pos: p.pos, age: p.age, fee: '', season: t.season, window: t.window, club: p.club }), true)).join('')}</div>` : ''}
        <form class="scout-filters" data-scout-form autocomplete="off">
          <select name="group" aria-label="Position">${opts([['', 'Any position'], ['GK', 'Goalkeepers'], ['DEF', 'Defenders'], ['MID', 'Midfielders'], ['ATT', 'Attackers']], s.group)}</select>
          <select name="maxAge" aria-label="Maximum age">${opts([17, 18, 19, 20, 21, 22, 23].map((a) => [a, `Up to ${a}`]), s.maxAge)}</select>
          <select name="leagueId" aria-label="League">${opts([['', 'Any league']], s.leagueId)}<optgroup label="Career mode leagues">${opts(leagues, s.leagueId)}</optgroup>${FC26.scout.extraLeagues().length ? `<optgroup label="Other leagues">${opts(FC26.scout.extraLeagues(), s.leagueId)}</optgroup>` : ''}</select>
          <input type="search" name="query" value="${esc(s.query)}" placeholder="Name, club or nationality" aria-label="Search prospects" maxlength="40">
          <label class="toggle"><input type="checkbox" name="fits" ${s.fits ? 'checked' : ''}> Only players who fit my rules</label>
        </form>
        <div class="scout-list" data-scout-list>${scoutList(entry, t)}</div>
      </div>`;
  }

  function refreshScoutList(item) {
    const entry = deps.findEntry(item.dataset.id);
    const list = item.querySelector('[data-scout-list]');
    if (entry && list) list.innerHTML = scoutList(entry, trackerOf(entry));
  }

  // ---------- Starting XI on a pitch ----------

  // Pitch lines from attack down to goal; within a line, left to right.
  const LINES = [['LW', 'ST', 'CF', 'RW'], ['CAM'], ['LM', 'CM', 'RM'], ['CDM'], ['LWB', 'LB', 'CB', 'RB', 'RWB'], ['GK']];
  const lineOf = (pos) => { const i = LINES.findIndex((l) => l.includes(pos)); return i < 0 ? 2 : i; };
  const surname = (name) => {
    const parts = String(name || '?').trim().split(/\s+/);
    if (parts.length < 2 || parts[parts.length - 1].length <= 2) return parts.join(' ');
    let i = parts.length - 1;
    // "ter Stegen", "van Dijk", "De Ketelaere"
    while (i > 1 && (/^\p{Ll}/u.test(parts[i - 1]) || /^(de|da|di|do|dos|das|del|della|van|von|der|den|ter|te|le|la|du)$/i.test(parts[i - 1]))) i--;
    return parts.slice(i).join(' ');
  };

  function renderPitch(t, preview) {
    const xi = t.players.filter((p) => p.starter && !p.loanedOut);
    const squad = t.players.filter((p) => !p.loanedOut);
    if (!squad.length) return '';
    const rows = LINES.map((line, i) => xi.filter((p) => lineOf(p.pos) === i)
      .sort((a, b) => line.indexOf(a.pos) - line.indexOf(b.pos)));
    const def = rows[4].length;
    const att = xi.filter((p) => ['ST', 'CF', 'LW', 'RW'].includes(p.pos)).length;
    const shape = xi.length ? `${def}-${xi.length - def - att - rows[5].length}-${att}` : '';
    const avg = (key) => { const v = xi.map((p) => n(p[key])).filter((x) => x); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : null; };
    const info = [
      `⭐ XI ${xi.length}/11${xi.length === 11 && shape ? ` · ${shape}` : ''}`,
      avg('ovr') && `avg OVR ${avg('ovr')}`,
      avg('age') && `avg age ${avg('age')}`,
      xi.length && `${new Set(xi.map((p) => p.nat).filter(Boolean)).size} nationalities`,
    ].filter(Boolean).join(' · ');
    return `
      ${preview ? `<p class="pitch-note muted">${esc(info)} · a best guess from shirt numbers and star players; change it in the Squad tab once you track the save.</p>` : `<div class="pitch-head">
        <strong>Starting XI</strong><span class="muted">${esc(info)}</span>
        <button type="button" class="btn btn-small" data-action="pick-xi" title="Pick 11 by OVR in a 4-3-3 shape (you can change them after)">⭐ Pick my best XI</button>
      </div>`}
      <div class="pitch" role="img" aria-label="Starting XI: ${esc(xi.map((p) => p.name).join(', ') || 'nobody picked yet')}">
        ${xi.length ? rows.map((r) => (r.length ? `<div class="pitch-line">${r.map((p) => `
          <div class="pp${p.regen ? ' is-regen' : ''}" title="${esc(`${p.name}${p.pos ? `, ${p.pos}` : ''}${p.ovr ? `, ${p.ovr} OVR` : ''}`)}">
            <span class="pp-dot">${p.ovr ? esc(p.ovr) : esc(p.pos || '?')}</span><span class="pp-name">${esc(surname(p.name))}</span>
          </div>`).join('')}</div>` : '')).join('')
    : '<p class="pitch-empty">Tick ⭐ next to your starters, or press <strong>Pick my best XI</strong>.</p>'}
      </div>`;
  }

  // The formation and lineup (lineup.js), or the simple pitch if it isn't loaded.
  const lineupHTML = (entry, t) => (FC26.lineup ? FC26.lineup.render(entry, t, esc) : renderPitch(t));
  const LU = () => FC26.lineup;

  /** Redraw just the lineup (pitch, bench, picker). */
  function redrawLineup(item) {
    const entry = deps.findEntry(item.dataset.id);
    const el = item.querySelector('[data-pitch]');
    if (entry && el) el.innerHTML = lineupHTML(entry, trackerOf(entry));
  }

  /** Change the lineup: fn(lineup, tracker) returns the new lineup, which is saved with everyone's ⭐ to match. */
  function changeLineup(item, fn) {
    return change(item, (t, e) => {
      const lu = LU().ensure(t, LU().ruleFormation(e.challenge));
      LU().apply(t, fn(lu, t));
    }, ['squad']);
  }

  /** Eleven players in a 4-3-3: best by OVR (list order breaks ties) in each part of the pitch, gaps filled from the rest. */
  function bestXI(players) {
    const pool = players.filter((p) => !p.loanedOut).map((p, i) => ({ p, i, ovr: n(p.ovr) || 0 }))
      .sort((a, b) => b.ovr - a.ovr || a.i - b.i);
    const picked = new Set();
    // Adds up to `count` of the best unpicked players in these positions; returns how many it found.
    const take = (positions, count) => {
      const got = pool.filter((x) => positions.includes(x.p.pos) && !picked.has(x.p.id)).slice(0, Math.max(0, count));
      got.forEach((x) => picked.add(x.p.id));
      return got.length;
    };
    take(['GK'], 1);
    let def = take(['LB', 'LWB'], 1) + take(['RB', 'RWB'], 1) + take(['CB'], 2);
    def += take(['CB', 'LB', 'RB', 'LWB', 'RWB'], 4 - def);
    let mid = take(['CDM', 'CM', 'CAM'], 3);
    mid += take(['LM', 'RM'], 3 - mid);
    let att = take(['LW'], 1) + take(['RW'], 1) + take(['ST', 'CF'], 1);
    att += take(['ST', 'CF', 'LW', 'RW', 'LM', 'RM'], 3 - att);
    pool.filter((x) => x.p.pos !== 'GK' && !picked.has(x.p.id)).slice(0, Math.max(0, 11 - picked.size)).forEach((x) => picked.add(x.p.id));
    return picked;
  }

  // Lines of the squad list, in pitch order.
  const SQUAD_LINES = [
    ['gk', '🧤 Goalkeepers', ['GK']],
    ['def', '🛡️ Defenders', ['CB', 'LB', 'RB', 'LWB', 'RWB']],
    ['mid', '🎯 Midfielders', ['CDM', 'CM', 'CAM', 'LM', 'RM']],
    ['att', '⚡ Attackers', ['LW', 'RW', 'ST', 'CF']],
  ];
  const squadLine = (pos) => (SQUAD_LINES.find(([, , list]) => list.includes(pos)) || ['other'])[0];
  const POS_ORDER = ['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'];
  const squadSort = {}; // saved entry id → 'pos' | 'ovr' | 'age' | 'name'
  const SORTS = {
    pos: (a, b) => POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos) || (n(b.ovr) || 0) - (n(a.ovr) || 0),
    ovr: (a, b) => (n(b.ovr) || 0) - (n(a.ovr) || 0),
    age: (a, b) => (n(a.age) || 99) - (n(b.age) || 99),
    name: (a, b) => String(a.name).localeCompare(String(b.name)),
  };
  // OVR colour bands, as in the game's cards.
  const ovrBand = (v) => (v == null || v === '' ? '' : v >= 85 ? 'ovr-elite' : v >= 78 ? 'ovr-gold' : v >= 70 ? 'ovr-silver' : 'ovr-bronze');

  function playerRow(p) {
    return `
        <div class="prow line-${squadLine(p.pos)}${p.loanedOut ? ' is-out' : ''}${p.starter ? ' is-starter' : ''}" data-pid="${esc(p.id)}">
          <select class="p-pos" data-pfield="pos" aria-label="Position"><option value="">–</option>${opts(POSITIONS.map((x) => [x, x]), p.pos)}</select>
          <input class="p-name" type="text" data-pfield="name" value="${esc(p.name)}" placeholder="Player name" maxlength="40" aria-label="Name">
          <input class="p-ovr ${ovrBand(n(p.ovr))}" type="number" min="1" max="99" data-pfield="ovr" value="${esc(p.ovr)}" placeholder="OVR" aria-label="Overall rating">
          <label class="p-mini"><span>Age</span><input class="p-age" type="number" min="14" max="50" data-pfield="age" value="${esc(p.age)}" placeholder="–" aria-label="Age"></label>
          <label class="p-mini p-mini-wide"><span>Nation</span><input class="p-nat" type="text" list="nat-list" data-pfield="nat" value="${esc(p.nat)}" placeholder="–" maxlength="30" aria-label="Nationality"></label>
          <label class="p-mini"><span>€K/w</span><input class="p-wage" type="number" min="0" step="0.1" data-pfield="wage" value="${esc(p.wage)}" placeholder="–" aria-label="Wage in thousands of euros per week"></label>
          <span class="p-flags">
            <label title="In your starting XI"><input type="checkbox" data-pfield="starter" ${p.starter ? 'checked' : ''} aria-label="Starting XI">⭐</label>
            <label title="Academy graduate"><input type="checkbox" data-pfield="academy" ${p.academy ? 'checked' : ''} aria-label="Academy graduate">🎓</label>
            <label title="On loan at your club"><input type="checkbox" data-pfield="loanIn" ${p.loanIn ? 'checked' : ''} aria-label="On loan at your club">🔁</label>
            <label title="Loaned out to another club"><input type="checkbox" data-pfield="loanedOut" ${p.loanedOut ? 'checked' : ''} aria-label="Loaned out">✈️</label>
            <label title="Regen: a player the game generated"><input type="checkbox" data-pfield="regen" ${p.regen ? 'checked' : ''} aria-label="Regen">🧬</label>
          </span>
          <button type="button" class="icon-btn p-del" data-action="squad-del" title="Remove from the squad" aria-label="Remove ${esc(p.name)}">✕</button>
        </div>`;
  }

  /** The summary along the top of the squad: players, XI, ages, ratings, nations, wages. */
  function squadCards(t) {
    const squad = t.players.filter((p) => !p.loanedOut);
    const avg = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
    const ages = squad.map((p) => n(p.age)).filter((a) => a);
    const ovrs = squad.map((p) => n(p.ovr)).filter((a) => a);
    const wages = squad.reduce((sum, p) => sum + (n(p.wage) || 0), 0);
    const nations = new Set(squad.map((p) => p.nat).filter(Boolean)).size;
    const card = (value, label, extra) => `<div class="sq-card${extra || ''}"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`;
    return `
      <div class="sq-cards">
        ${card(squad.length, t.players.length > squad.length ? `players · ${t.players.length - squad.length} on loan` : 'players')}
        ${card(`${squad.filter((p) => p.starter).length}/11`, 'starting XI', squad.filter((p) => p.starter).length === 11 ? ' is-good' : '')}
        ${card(ages.length ? avg(ages).toFixed(1) : '–', 'average age')}
        ${card(ovrs.length ? avg(ovrs).toFixed(1) : '–', ovrs.length && ovrs.length < squad.length ? `avg OVR (${ovrs.length} rated)` : 'average OVR')}
        ${card(nations || '–', 'nationalities')}
        ${card(wages ? `€${wages >= 1000 ? `${(wages / 1000).toFixed(2)}M` : `${Math.round(wages)}K`}` : '–', 'wages a week')}
      </div>`;
  }

  function renderSquad(entry, t) {
    const real = realSquad(entry.challenge.club.name);
    const sort = squadSort[entry.id] || 'pos';
    const by = SORTS[sort];
    const active = t.players.filter((p) => !p.loanedOut);
    const groups = SQUAD_LINES.map(([id, label, list]) => [id, label, active.filter((p) => list.includes(p.pos))])
      .concat([['other', '❔ No position yet', active.filter((p) => squadLine(p.pos) === 'other')]])
      .filter(([, , list]) => list.length);
    const out = t.players.filter((p) => p.loanedOut);
    const list = groups.map(([id, label, players]) => `
        <section class="pgroup pgroup-${id}">
          <h4 class="pgroup-head">${label} <span class="count">${players.length}</span></h4>
          ${players.slice().sort(by).map(playerRow).join('')}
        </section>`).join('')
      + (out.length ? `
        <details class="pgroup pgroup-out">
          <summary class="pgroup-head">✈️ Out on loan <span class="count">${out.length}</span></summary>
          ${out.slice().sort(by).map(playerRow).join('')}
        </details>` : '');
    return `
      <div class="squad">
        <div class="tools">
          <button type="button" class="btn btn-small" data-action="squad-add">+ Add player</button>
          <button type="button" class="btn btn-small" data-action="squad-paste">📋 Paste squad</button>
          ${real ? `<button type="button" class="btn btn-small${t.players.length ? '' : ' btn-primary'}" data-action="squad-load" title="${esc(SQUAD_SOURCE)}">⬇️ Load real squad (${esc(squadSize(real))})</button>` : ''}
          <span class="muted squad-stats" hidden>${esc(squadStats(t))}</span>
        </div>
        ${t.players.length ? squadCards(t) : ''}
        <div class="pitch-wrap" data-pitch>${lineupHTML(entry, t)}</div>
        <div class="paste-box" hidden>
          <p class="muted">One player per line: <code>Name, Position, Age, Nationality, OVR, Wage</code>. Only the name is required, and the other values can come in any order. Copying a table from a ratings site works too.</p>
          <textarea rows="6" data-paste placeholder="Bukayo Saka, RW, 24, English, 87&#10;Jamie Gittens LW 21 English 80"></textarea>
          <label class="toggle"><input type="checkbox" data-paste-replace> Replace the current squad</label>
          <div class="tools">
            <button type="button" class="btn btn-small btn-primary" data-action="paste-import">Import</button>
            <button type="button" class="btn btn-small" data-action="paste-cancel">Cancel</button>
          </div>
        </div>
        ${t.players.length ? `<div class="squad-bar"><h3>👥 Squad</h3>
          <label class="squad-sort">Sort <select data-squad-sort aria-label="Sort the squad">${opts([['pos', 'Position'], ['ovr', 'OVR'], ['age', 'Age'], ['name', 'Name']], sort)}</select></label></div>` : ''}
        <div class="plist">${list || `<p class="muted empty-note">${real
    ? `No players yet. Press <strong>⬇️ Load real squad</strong> to start from ${esc(entry.challenge.club.name)}'s squad as it is in FC 26 (names, positions, ages, nationalities and loans), ratings included. Or paste your own list.`
    : 'No players yet. Add them one by one, or paste your whole squad.'}</p>`}</div>
        <p class="muted legend">⭐ starting XI · 🎓 academy graduate · 🔁 on loan at your club · ✈️ loaned out · 🧬 regen (generated player)</p>
      </div>`;
  }

  function transferForm(entry, t, dir, pre) {
    const v = Object.assign({}, pre || {});
    const types = dir === 'out' ? OUT_TYPES : IN_TYPES;
    const squadNames = t.players.map((p) => `<option value="${esc(p.name)}"></option>`).join('');
    const val = (k) => (v[k] == null ? '' : esc(v[k]));
    // Values the assistant read from a sentence belong to the player named in it.
    const owner = (k) => (v.name && v[k] != null && v[k] !== '' ? ` data-for="${esc(DB.key(v.name))}"` : '');
    const seasons = Array.from({ length: Math.max(entry.challenge.seasons, t.season) }, (_, i) => [i + 1, `S${i + 1}`]);
    return `
      <form class="tform" data-tform data-dir="${dir}" autocomplete="off">
        <div class="seg">
          <button type="button" class="${dir === 'in' ? 'is-on' : ''}" data-action="tr-dir" data-dir="in">⬇️ Signing</button>
          <button type="button" class="${dir === 'out' ? 'is-on' : ''}" data-action="tr-dir" data-dir="out">⬆️ Departure</button>
          <button type="button" class="${dir === 'swap' ? 'is-on' : ''}" data-action="tr-dir" data-dir="swap" title="Give a player and get one back, with cash either way if you like">🔄 Swap</button>
        </div>
        <div class="tgrid">
          ${dir === 'swap' ? `
          <label class="f-wide"><span>You give</span><input name="give" type="text" maxlength="40" required value="${val('give')}" list="squad-names-${esc(entry.id)}" placeholder="Pick from your squad"></label>
          <datalist id="squad-names-${esc(entry.id)}">${squadNames}</datalist>
          <label class="f-wide"><span>You get</span><input name="name" type="text" maxlength="40" required value="${val('name')}" list="known-players" placeholder="Name"></label>
          <label><span>Cash €M</span><input name="fee" type="number" step="0.1" placeholder="0" value="${val('fee')}" title="What you pay on top; a minus number if they pay you"></label>
          <input type="hidden" name="type" value="swap">` : `
          <label class="f-wide"><span>Player</span><input name="name" type="text" maxlength="40" required value="${val('name')}" list="${dir === 'out' ? `squad-names-${esc(entry.id)}` : 'known-players'}" placeholder="${dir === 'out' ? 'Pick from your squad' : 'Name'}"></label>
          ${dir === 'out' ? `<datalist id="squad-names-${esc(entry.id)}">${squadNames}</datalist>` : ''}
          <label><span>Type</span><select name="type">${opts(types, v.type)}</select></label>
          <label><span>Fee €M</span><input name="fee" type="number" min="0" step="0.1" placeholder="0" value="${val('fee')}"></label>`}
          <label class="f-wide"><span>${dir === 'out' ? 'To club' : dir === 'swap' ? 'Their club' : 'From club'}</span><input name="club" type="text" maxlength="40" value="${val('club')}"${owner('club')}></label>
          ${dir !== 'out' ? `
          <label><span>Pos</span><select name="pos"${owner('pos')}><option value=""></option>${opts(POSITIONS.map((x) => [x, x]), v.pos)}</select></label>
          <label><span>Age</span><input name="age" type="number" min="14" max="50" value="${val('age')}"${owner('age')}></label>
          <label><span>Nationality</span><input name="nat" type="text" list="nat-list" maxlength="30" value="${val('nat')}"${owner('nat')}></label>
          <label><span>OVR</span><input name="ovr" type="number" min="1" max="99" value="${val('ovr')}"${owner('ovr')}></label>
          <label><span>Wage €K/w</span><input name="wage" type="number" min="0" step="0.1" value="${val('wage')}"></label>` : ''}
          <label><span>Season</span><select name="season">${opts(seasons, v.season || t.season)}</select></label>
          <label><span>Window</span><select name="window">${opts([['summer', 'Summer'], ['winter', 'January']], v.window || t.window)}</select></label>
        </div>
        <div class="recog" data-recog aria-live="polite"></div>
        ${dir !== 'out' ? '<label class="toggle regen-toggle"><input type="checkbox" name="regen"> 🧬 Regen (a player the game generated)</label>' : ''}
        ${dir === 'swap' ? '<p class="muted small">Cash: what you pay on top, or a minus number if they pay you. The player you give leaves your squad and the one you get joins it.</p>' : ''}
        <div class="precheck" data-precheck aria-live="polite"></div>
        <button type="submit" class="btn btn-small btn-primary">${dir === 'out' ? 'Log departure' : dir === 'swap' ? 'Log swap' : 'Log signing'}</button>
      </form>`;
  }

  function assistantBox(entry) {
    return `
      <form class="assistant" data-assist-form autocomplete="off">
        <div class="assistant-head">🤖 <strong>Transfer assistant</strong>
          <span class="muted">Describe a move in your own words: I'll fill in the form and check it against ${esc(entry.challenge.title)}'s rules.</span></div>
        <div class="assistant-row">
          <input type="text" data-assist maxlength="200" placeholder="e.g. Signed Florian Wirtz from Leverkusen for €60m in January" aria-label="Describe a transfer">
          <button type="submit" class="btn btn-small btn-primary">Read it</button>
          <label class="btn btn-small shot-btn" title="Upload a screenshot of a transfer from the game: I'll read the player, rating and fee">📷 Read a screenshot<input type="file" accept="image/*" data-shot hidden></label>
        </div>
        <div class="assist-note muted" data-assist-note></div>
      </form>`;
  }

  // The challenge this log belongs to, its signing rules and the assistant's to-do list.
  function challengeContext(entry, t) {
    const chips = A.signingRules(entry.challenge, t);
    const steps = A.nextSteps(entry.challenge, t).slice(0, 5);
    return `
      <div class="tcontext">
        <div>📒 Logging for <strong>${esc(entry.challenge.title)}</strong> · Season ${t.season} · ${t.window === 'winter' ? 'January' : 'Summer'} window</div>
        ${chips.length ? `<div class="chips" title="This challenge's rules for signings">📜 ${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}</div>`
    : '<div class="muted">This challenge has no rules about signings the assistant can check.</div>'}
        ${steps.length ? `<div class="steps"><strong>🤖 What to do next</strong><ul>${steps.map((x) => `<li class="s-${x.status}">${x.status === 'broken' ? '❌' : '⚠️'} ${esc(x.summary)}<small class="muted">${esc(x.rule)}</small></li>`).join('')}</ul></div>`
    : '<div class="steps ok">🤖 All the rules I can check are fine so far.</div>'}
      </div>`;
  }

  function renderTransfers(entry, t) {
    const groups = new Map();
    t.transfers.forEach((x) => {
      const key = `${x.season}-${x.window === 'winter' ? 2 : 1}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(x);
    });
    const list = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).map((key) => {
      const items = groups.get(key);
      const [season, w] = key.split('-');
      const spent = items.filter((x) => x.dir === 'in').reduce((s, x) => s + (n(x.fee) || 0), 0);
      const made = items.filter((x) => x.dir === 'out').reduce((s, x) => s + (n(x.fee) || 0), 0);
      const net = made - spent;
      return `
        <div class="tgroup">
          <div class="tgroup-head"><strong>Season ${season} · ${w === '2' ? 'January' : 'Summer'}</strong>
            <span class="muted">in ${money(spent)} · out ${money(made)} · <span class="${net < 0 ? 'neg' : 'pos'}">net ${net < 0 ? '−' : '+'}${money(Math.abs(net))}</span></span></div>
          ${items.slice().reverse().map((x) => `
          <div class="trow ${x.dir}" data-tid="${esc(x.id)}">
            <span class="tdir">${x.type === 'swap' ? '🔄' : x.dir === 'in' ? '⬇️' : '⬆️'}</span>
            <span class="tmain"><strong>${esc(x.name)}</strong>${x.regen ? ' <span class="regen-badge" title="Regen: generated by the game">🧬 Regen</span>' : ''}
              <small class="muted">${[x.pos, x.age ? `${x.age}y` : '', x.nat ? C.normNat(x.nat) : '', x.ovr ? `${x.ovr} OVR` : ''].filter(Boolean).map(esc).join(' · ')}</small></span>
            <span class="tmeta">${x.type === 'swap' ? `${x.dir === 'in' ? 'Swap in' : 'Swap out'}${x.swapWith ? ` for ${esc(x.swapWith)}` : ''}` : esc(((x.dir === 'in' ? IN_TYPES : OUT_TYPES).find(([v]) => v === x.type) || ['', x.type])[1])}${x.club ? ` · ${x.dir === 'in' ? 'from' : 'to'} ${esc(x.club)}` : ''}${n(x.fee) ? ` · <strong>${money(n(x.fee))}</strong>` : ''}</span>
            <button type="button" class="icon-btn" data-action="tr-del" title="Delete this log entry (your squad list isn't changed)" aria-label="Delete">✕</button>
          </div>`).join('')}
        </div>`;
    }).join('');
    return `
      <div class="transfers">
        ${challengeContext(entry, t)}
        ${assistantBox(entry)}
        ${transferForm(entry, t, 'in')}
        <p class="muted legend">Logging a signing adds the player to your squad. A sale or release removes them; a loan out marks them ✈️. Players I don't recognise are marked 🧬 regen; untick it and I'll remember the name.</p>
        ${list || '<p class="muted empty-note">No transfers logged yet.</p>'}
      </div>`;
  }

  function renderMoves(entry, t) {
    const ch = entry.challenge;
    const age = (s) => (Number(ch.startAge) || 17) + s - 1;
    const rows = t.moves.slice().sort((a, b) => a.season - b.season).map((m) => `
        <div class="trow" data-mid="${esc(m.id)}">
          <span class="tdir">${m.type === 'loan' ? '🔁' : '✈️'}</span>
          <span class="tmain"><strong>${esc(m.club || 'New club')}</strong><small class="muted">${esc(m.country || '')}</small></span>
          <span class="tmeta">${esc((MOVE_TYPES.find(([v]) => v === m.type) || ['', m.type])[1])} · season ${Number(m.season)} (age ${age(Number(m.season))})</span>
          <button type="button" class="icon-btn" data-action="mv-del" aria-label="Delete">✕</button>
        </div>`).join('');
    return `
      <div class="transfers">
        <form class="tform" data-mform autocomplete="off">
          <div class="tgrid">
            <label class="f-wide"><span>New club</span><input name="club" type="text" maxlength="40" required></label>
            <label><span>Country</span><select name="country">${G.COUNTRIES.map((c) => `<option ${c.name === ch.club.country ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
            <label><span>Type</span><select name="type">${opts(MOVE_TYPES)}</select></label>
            <label><span>Season</span><select name="season">${opts(Array.from({ length: Math.max(ch.seasons, t.season) }, (_, i) => [i + 1, `S${i + 1} (age ${age(i + 1)})`]), t.season)}</select></label>
          </div>
          <button type="submit" class="btn btn-small btn-primary">Log move</button>
        </form>
        <div class="trow start"><span class="tdir">🏁</span><span class="tmain"><strong>${esc(ch.club.name)}</strong><small class="muted">${esc(ch.club.country || '')}</small></span><span class="tmeta">Starting club · age ${age(1)}</span><span></span></div>
        ${rows}
      </div>`;
  }

  // ---------- Paste import ----------

  const isNat = (s) => C.NATIONALITIES.includes(C.normNat(s));
  const POS_SET = new Set(POSITIONS.concat(['LF', 'RF', 'DM', 'AM', 'FW', 'DF', 'MF', 'LCB', 'RCB']));

  /** Turn pasted lines into players. Exposed for tests. */
  function parseSquad(text) {
    return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
      const separated = line.includes(',') || line.includes('\t') || line.includes(';');
      let tokens = separated ? line.split(/[,\t;]+/).map((x) => x.trim()).filter(Boolean) : line.split(/\s+/);
      // Space-separated: join two-word nationalities ("South Korean", "Costa Rican") before reading tokens.
      if (!separated) {
        const merged = [];
        for (let i = 0; i < tokens.length; i++) {
          const pair = tokens[i + 1] ? `${tokens[i]} ${tokens[i + 1]}` : '';
          if (pair && isNat(pair)) {
            merged.push(pair);
            i += 1;
          } else merged.push(tokens[i]);
        }
        tokens = merged;
      }
      const p = { name: [], nums: [] };
      tokens.forEach((tok) => {
        const up = tok.toUpperCase();
        if (/^€?\d+(\.\d+)?\s*[KM](\/W(EEK)?)?$/i.test(tok)) {
          const v = parseFloat(tok.replace(/[^\d.]/g, ''));
          p.wage = /M/i.test(tok) ? v * 1000 : v;
        } else if (/^\d{1,2}$/.test(tok)) p.nums.push(Number(tok));
        else if (POS_SET.has(up) && !p.pos) p.pos = { LF: 'LW', RF: 'RW', DM: 'CDM', AM: 'CAM', FW: 'ST', LCB: 'CB', RCB: 'CB' }[up] || (POSITIONS.includes(up) ? up : '');
        else if (isNat(tok)) p.nat = p.nat || C.normNat(tok);
        else if (!/^\d/.test(tok)) p.name.push(tok);
      });
      // Ratings are 40+, ages 15-45: with two numbers the larger is the rating.
      const nums = p.nums.filter((x) => x >= 14 && x <= 99);
      let age = null;
      let ovr = null;
      if (nums.length >= 2) {
        const sorted = nums.slice(0, 2).sort((a, b) => a - b);
        [age, ovr] = sorted[0] <= 45 ? sorted : [null, sorted[1]];
      } else if (nums.length === 1) {
        if (nums[0] > 45) ovr = nums[0];
        else age = nums[0];
      }
      return {
        id: uid(),
        name: p.name.join(' ').slice(0, 40),
        pos: p.pos || '',
        age: age == null ? '' : age,
        nat: p.nat || '',
        ovr: ovr == null ? '' : ovr,
        wage: p.wage == null ? '' : p.wage,
      };
    }).filter((p) => p.name);
  }

  // ---------- Live recognition and pre-check ----------

  /** A swap as two moves: the player you give leaves (with any cash you receive), then the one you get arrives. */
  function swapMoves(v) {
    const swapId = uid();
    const shared = { type: 'swap', club: v.club, season: v.season, window: v.window, swapId };
    return [
      Object.assign({ dir: 'out', name: v.give, fee: v.fee < 0 ? -v.fee : 0, swapWith: v.name }, shared),
      Object.assign({ dir: 'in', name: v.name, fee: v.fee > 0 ? v.fee : 0, swapWith: v.give, pos: v.pos, age: v.age, nat: v.nat, ovr: v.ovr, wage: v.wage, regen: v.regen }, shared),
    ].filter((m) => m.name);
  }

  function formValues(form) {
    const f = Object.fromEntries(new FormData(form).entries());
    return {
      dir: form.dataset.dir,
      type: f.type,
      name: String(f.name || '').trim().slice(0, 40),
      give: String(f.give || '').trim().slice(0, 40),
      fee: n(f.fee) || 0,
      club: String(f.club || '').trim().slice(0, 40),
      pos: f.pos || '',
      age: n(f.age) || '',
      nat: f.nat ? C.normNat(String(f.nat).trim()) : '',
      ovr: n(f.ovr) || '',
      wage: n(f.wage) || '',
      season: Number(f.season) || 1,
      window: f.window === 'winter' ? 'winter' : 'summer',
      regen: Boolean(form.elements.regen && form.elements.regen.checked),
    };
  }

  // Details that follow the player's name. Each box remembers which name its value
  // was entered or filled in for (data-for), and data-auto marks values we filled.
  const FOLLOW = ['nat', 'pos', 'age', 'club', 'ovr'];

  /**
   * The name now points at a known player (facts) or at nobody we know (null).
   * A known player replaces every value that wasn't entered for this name; for an
   * unknown one, only values we filled in for an earlier name are cleared.
   * Values typed for this name are never touched.
   */
  function fillFor(form, name, facts) {
    const k = DB.key(name);
    FOLLOW.forEach((f) => {
      const el = form.elements[f];
      if (!el || (el.value && el.dataset.for === k)) return;
      if (facts) {
        if (!el.value || el.dataset.for !== k) {
          el.value = facts[f] == null ? '' : String(facts[f]);
          el.dataset.for = k;
          el.dataset.auto = '1';
        }
      } else if (el.dataset.auto) {
        el.value = '';
        delete el.dataset.auto;
        delete el.dataset.for;
      }
    });
  }

  // Under the name box: who this is, and whether they'll be logged as a regen.
  function updateRecognition(form, item, autofill) {
    const note = form.querySelector('[data-recog]');
    if (!note) return;
    const v = formValues(form);
    const regen = form.elements.regen;
    const setRegen = (on) => { if (regen && !regen.dataset.touched) regen.checked = on; };
    if (!v.name) {
      note.innerHTML = '';
      setRegen(false);
      return;
    }
    if (v.dir === 'out') {
      const t = trackerOf(deps.findEntry(item.dataset.id));
      const inSquad = t.players.some((p) => String(p.name).trim().toLowerCase() === v.name.toLowerCase());
      note.innerHTML = inSquad ? '👥 In your squad: they\'ll be removed when you log this.' : '<span class="muted">Not in your squad list. The move will be logged, but no squad row changes.</span>';
      return;
    }
    if (v.type === 'promotion') {
      note.innerHTML = '🎓 Academy graduates are players the game generates, so this one is marked 🧬 regen.';
      setRegen(true);
      return;
    }
    const hit = DB.recognise(v.name);
    if (hit && hit.player) {
      const p = hit.player;
      const age = DB.ageOn(p.dob, seasonDay(v.season));
      const bits = [p.nat, p.pos, p.ovr ? `${p.ovr} OVR` : '', age ? `${age} at the start of season ${v.season}` : '', p.club ? `plays for ${p.club}` : ''].filter(Boolean);
      note.innerHTML = `👤 Recognised: <strong>${esc(p.name)}</strong>${bits.length ? ` · ${bits.map(esc).join(' · ')}` : ''}${p.custom ? ' <span class="muted">(you confirmed this one)</span>' : ''}`;
      setRegen(false);
      if (autofill) fillFor(form, v.name, { nat: p.nat, pos: p.pos, age, club: p.club, ovr: p.ovr || '' });
    } else if (hit && hit.candidates) {
      note.innerHTML = `Did you mean ${hit.candidates.map((p) => `<button type="button" class="link-btn" data-action="pick-player" data-name="${esc(p.name)}">${esc(p.name)}</button>`).join(', ')}?`;
      setRegen(false);
      if (autofill) fillFor(form, v.name, null);
    } else {
      note.innerHTML = '🧬 Not in my player list, so I\'ll log them as a <strong>regen</strong>. Untick below if they\'re a real player.';
      setRegen(true);
      if (autofill) fillFor(form, v.name, null);
    }
  }

  // The verdict box: would this move break any of the challenge's rules?
  function updatePrecheck(form, item) {
    const box = form.querySelector('[data-precheck]');
    if (!box) return;
    const v = formValues(form);
    if (!v.name) {
      box.innerHTML = '';
      return;
    }
    const entry = deps.findEntry(item.dataset.id);
    if (!entry) return;
    const res = A.precheck(entry.challenge, trackerOf(entry), v.dir === 'swap' ? swapMoves(v) : Object.assign({}, v, { id: 'preview' }));
    const breaks = res.breaks.map((b) => `<li><span>❌ <strong>${esc(b.text)}</strong></span><small>${b.details.slice(0, 3).map(esc).join(' · ')}</small></li>`).join('');
    const fixes = res.fixes.map((f) => `<li><span>✅ Completes: ${esc(f.text)}</span></li>`).join('');
    box.innerHTML = `
      <div class="verdict ${res.ok ? 'ok' : 'bad'}">
        <strong>${res.ok ? `🤖 ✅ ${({ in: 'This signing fits', swap: 'This swap fits' })[v.dir] || 'This move fits'} your rules` : `🤖 ❌ This would break ${res.breaks.length} rule${res.breaks.length === 1 ? '' : 's'}`}</strong>
        ${breaks || fixes ? `<ul>${breaks}${fixes}</ul>` : ''}
        <small class="muted">Checked against ${res.checked} rule${res.checked === 1 ? '' : 's'}${res.manual ? `; ✋ ${res.manual} you'll need to check yourself` : ''}.</small>
      </div>`;
  }

  // Name suggestions as you type (the full list is too long for one dropdown).
  function suggest(text) {
    const list = document.getElementById('known-players');
    if (!list) return;
    list.innerHTML = DB.search(text, 25).map((p) => `<option value="${esc(p.name)}">${esc([p.pos, p.club].filter(Boolean).join(' · '))}</option>`).join('');
  }

  let liveTimer = null;
  function onInput(e, item) {
    if (e.target.closest('[data-scout-form]') && e.target.name === 'query') {
      const s = scoutFilters(item.dataset.id);
      s.query = e.target.value.trim();
      s.shown = 15;
      clearTimeout(liveTimer);
      liveTimer = setTimeout(() => refreshScoutList(item), 150);
      return true;
    }
    const form = e.target.closest('[data-tform]');
    if (!form) return false;
    if (e.target.name === 'name' && form.dataset.dir === 'in') suggest(e.target.value);
    noteTyped(form, e.target);
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      updateRecognition(form, item, e.target.name === 'name');
      updatePrecheck(form, item);
    }, 120);
    return true;
  }

  // Typed by hand: this value belongs to whoever is named right now.
  function noteTyped(form, el) {
    if (el.name === 'regen') el.dataset.touched = '1';
    if (FOLLOW.includes(el.name)) {
      el.dataset.for = DB.key(form.elements.name.value);
      delete el.dataset.auto;
    }
  }

  // ---------- Events ----------

  function refreshAll(item, entry) {
    deps.refresh(item, entry);
  }

  function rerenderPanel(item, entry, panel) {
    const t = trackerOf(entry);
    const el = item.querySelector(`[data-panel="${panel}"]`);
    if (!el) return;
    if (panel === 'squad') el.innerHTML = renderSquad(entry, t);
    if (panel === 'transfers') el.innerHTML = renderTransfers(entry, t);
    if (panel === 'moves') el.innerHTML = renderMoves(entry, t);
    if (panel === 'scout') el.innerHTML = renderScout(entry, t);
  }

  function updateCounts(item, entry) {
    const t = trackerOf(entry);
    const set = (tab, value) => {
      const c = item.querySelector(`.ttab[data-tab="${tab}"] .count`);
      if (c) c.textContent = value;
    };
    set('squad', t.players.filter((p) => !p.loanedOut).length);
    set('transfers', t.transfers.length);
    set('moves', t.moves.length);
    const stats = item.querySelector('.squad-stats');
    if (stats) stats.textContent = squadStats(t);
    const pitch = item.querySelector('[data-pitch]');
    if (pitch) pitch.innerHTML = lineupHTML(entry, t);
  }

  // Save a tracker change, then refresh rule checks and counts around it.
  function change(item, fn, panels) {
    const entry = deps.mutateEntry(item.dataset.id, (e) => {
      e.tracker = C.normalizeTracker(e.tracker);
      fn(e.tracker, e);
    });
    if (!entry) return null;
    (panels || []).forEach((p) => rerenderPanel(item, entry, p));
    updateCounts(item, entry);
    refreshAll(item, entry);
    return entry;
  }

  function onClick(e, item) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return false;
    const { action } = btn.dataset;
    const id = item.dataset.id;
    if (action === 'ttab') {
      tabs[id] = btn.dataset.tab;
      item.querySelectorAll('.ttab').forEach((b) => {
        const on = b.dataset.tab === btn.dataset.tab;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
      });
      item.querySelectorAll('.tpanel').forEach((p) => { p.hidden = p.dataset.panel !== btn.dataset.tab; });
      // The scout list is worked out when it's opened, so it always leaves out the current squad.
      if (btn.dataset.tab === 'scout') rerenderPanel(item, deps.findEntry(id), 'scout');
      return true;
    }
    if (FC26.matches && FC26.matches.onClick(e, item)) return true;
    if (action === 'squad-add') {
      change(item, (t) => t.players.push({ id: uid(), name: '' }), ['squad']);
      const inputs = item.querySelectorAll('.p-name');
      if (inputs.length) inputs[inputs.length - 1].focus();
      return true;
    }
    if (action === 'squad-del') {
      const pid = btn.closest('[data-pid]').dataset.pid;
      change(item, (t) => { t.players = t.players.filter((p) => p.id !== pid); }, ['squad']);
      return true;
    }
    if (action === 'squad-paste' || action === 'paste-cancel') {
      const box = item.querySelector('.paste-box');
      box.hidden = action === 'paste-cancel' ? true : !box.hidden;
      if (!box.hidden) box.querySelector('textarea').focus();
      return true;
    }
    if (action === 'paste-import') {
      const box = item.querySelector('.paste-box');
      const players = parseSquad(box.querySelector('[data-paste]').value);
      if (!players.length) {
        deps.toast('Nothing to import: put one player per line');
        return true;
      }
      const replace = box.querySelector('[data-paste-replace]').checked;
      change(item, (t) => { t.players = (replace ? [] : t.players).concat(players); }, ['squad']);
      deps.toast(`Imported ${players.length} player${players.length === 1 ? '' : 's'}`);
      return true;
    }
    if (action === 'scout-more') {
      scoutFilters(id).shown += 15;
      refreshScoutList(item);
      return true;
    }
    if (action === 'scout-short') {
      const p = JSON.parse(btn.dataset.p);
      let added = false;
      deps.mutateEntry(id, (e) => {
        const list = e.shortlist || [];
        const at = list.findIndex((x) => DB.key(x.name) === DB.key(p.name));
        if (at >= 0) list.splice(at, 1);
        else { list.unshift(Object.assign({ known: FC26.scout.KNOWN.some((n) => DB.key(n) === DB.key(p.name)), addedAt: Date.now() }, p)); added = true; }
        e.shortlist = list.slice(0, 30);
      });
      rerenderPanel(item, deps.findEntry(id), 'scout');
      const c = item.querySelector('.ttab[data-tab="scout"]');
      if (c) c.innerHTML = `🔭 Scout${(deps.findEntry(id).shortlist || []).length ? ` <span class="count">${deps.findEntry(id).shortlist.length}</span>` : ''}`;
      deps.toast(added ? `🎯 ${p.name} added to your shortlist` : `${p.name} taken off your shortlist`);
      return true;
    }
    if (action === 'scout-sign') {
      const p = JSON.parse(btn.dataset.p);
      const entry = deps.findEntry(id);
      const t = trackerOf(entry);
      const tabBtn = item.querySelector('.ttab[data-tab="transfers"]');
      if (tabBtn) tabBtn.click();
      const old = item.querySelector('[data-tform]');
      if (!old) return true;
      old.outerHTML = transferForm(entry, t, 'in', { name: p.name, pos: p.pos, age: p.age, nat: p.nat, club: p.club, ovr: p.ovr, type: 'permanent' });
      const form = item.querySelector('[data-tform]');
      updateRecognition(form, item, true);
      updatePrecheck(form, item);
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.elements.fee.focus({ preventScroll: true });
      deps.toast(`Fill in the fee for ${p.name}, then log the signing`);
      return true;
    }
    if (action && action.startsWith('lu-') && LU()) {
      const L = LU();
      if (action === 'lu-slot') {
        const where = { kind: btn.dataset.kind, i: Number(btn.dataset.i) };
        const open = L.picks[id];
        L.picks[id] = open && open.kind === where.kind && open.i === where.i ? null : where;
        redrawLineup(item);
        const pk = item.querySelector('.lu-picker');
        if (pk) pk.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return true;
      }
      if (action === 'lu-close') { L.picks[id] = null; redrawLineup(item); return true; }
      if (action === 'lu-pick') {
        const where = L.picks[id];
        if (!where) return true;
        L.picks[id] = null;
        changeLineup(item, (lu) => L.place(lu, where, btn.dataset.pid || null));
        return true;
      }
      if (action === 'lu-auto') {
        const t0 = trackerOf(deps.findEntry(id));
        if (t0.players.some((p) => p.starter) && !root.confirm('Replace your XI and bench with the best picks for this formation?')) return true;
        L.picks[id] = null;
        changeLineup(item, (lu, t) => L.autoPick(t, lu.formation));
        deps.toast(t0.players.some((p) => n(p.ovr)) ? 'Picked your best XI and bench ⭐' : 'Picked an XI by position. Add OVRs and it picks your best players.');
        return true;
      }
      if (action === 'lu-clear') {
        if (!root.confirm('Empty the starting XI and the bench?')) return true;
        L.picks[id] = null;
        changeLineup(item, (lu) => ({ formation: lu.formation, slots: lu.slots.map(() => null), bench: lu.bench.map(() => null) }));
        return true;
      }
      if (action === 'lu-use') {
        changeLineup(item, (lu, t) => L.changeFormation(t, lu, btn.dataset.formation));
        deps.toast(`Switched to ${btn.dataset.formation}`);
        return true;
      }
      if (action === 'lu-image') {
        const entry = deps.findEntry(id);
        L.exportImage(entry, trackerOf(entry)).then((r) => { if (r === 'downloaded') deps.toast('Lineup saved 📸'); }, () => deps.toast("Couldn't create the image in this browser"));
        return true;
      }
    }
    if (action === 'pick-xi') {
      const t0 = trackerOf(deps.findEntry(id));
      if (t0.players.some((p) => p.starter) && !root.confirm('Replace your current starting XI with the best 11 by OVR?')) return true;
      change(item, (t) => {
        const xi = bestXI(t.players);
        t.players.forEach((p) => { p.starter = xi.has(p.id); });
      }, ['squad']);
      const rated = t0.players.some((p) => n(p.ovr));
      deps.toast(rated ? 'Picked your best XI ⭐' : 'Picked an XI by position. Add OVRs and it picks your best players.');
      return true;
    }
    if (action === 'squad-load') {
      const real = realSquad(item.dataset.club);
      if (!real) return true;
      const t0 = trackerOf(deps.findEntry(id));
      if (t0.players.length && !root.confirm('Replace your current squad list with the real squad?')) return true;
      change(item, (t) => { t.players = realSquadPlayers(item.dataset.club, t.season); }, ['squad']);
      deps.toast(`Loaded ${squadSize(real)} with their FC 26 ratings.`);
      return true;
    }
    if (action === 'tr-dir') {
      const entry = deps.findEntry(id);
      const old = btn.closest('[data-tform]');
      const keep = { name: old.elements.name.value, club: old.elements.club.value, fee: old.elements.fee.value };
      old.outerHTML = transferForm(entry, trackerOf(entry), btn.dataset.dir, keep);
      const form = item.querySelector('[data-tform]');
      updateRecognition(form, item, false);
      updatePrecheck(form, item);
      return true;
    }
    if (action === 'pick-player') {
      const form = btn.closest('[data-tform]');
      form.elements.name.value = btn.dataset.name;
      updateRecognition(form, item, true);
      updatePrecheck(form, item);
      return true;
    }
    if (action === 'tr-del') {
      const tid = btn.closest('[data-tid]').dataset.tid;
      change(item, (t) => {
        const gone = t.transfers.find((x) => x.id === tid);
        // Both halves of a swap go together.
        t.transfers = t.transfers.filter((x) => x.id !== tid && !(gone && gone.swapId && x.swapId === gone.swapId));
      }, ['transfers']);
      return true;
    }
    if (action === 'mv-del') {
      const mid = btn.closest('[data-mid]').dataset.mid;
      change(item, (t) => { t.moves = t.moves.filter((x) => x.id !== mid); }, ['moves']);
      return true;
    }
    return false;
  }

  function onSubmit(e, item) {
    const form = e.target;
    if (FC26.matches && form.matches('[data-mt-form]')) { FC26.matches.onSubmit(e, item); return true; }
    if (form.matches('[data-scout-form]')) {
      e.preventDefault();
      return true;
    }
    if (form.matches('[data-assist-form]')) {
      e.preventDefault();
      const text = form.querySelector('[data-assist]').value;
      const entry = deps.findEntry(item.dataset.id);
      if (!entry || !text.trim()) return true;
      const t = trackerOf(entry);
      const parsed = A.parseTransfer(text, { squad: t.players });
      const note = form.querySelector('[data-assist-note]');
      const old = item.querySelector('[data-tform]');
      old.outerHTML = transferForm(entry, t, parsed.dir, parsed);
      const tform = item.querySelector('[data-tform]');
      updateRecognition(tform, item, true);
      updatePrecheck(tform, item);
      const swap = parsed.dir === 'swap';
      const bits = [
        swap ? 'swap' : parsed.dir === 'in' ? ({ loan: 'loan signing', free: 'free transfer', promotion: 'academy promotion' }[parsed.type] || 'signing') : ({ loan: 'loan out', release: 'release' }[parsed.type] || 'sale'),
        swap && parsed.give ? `${parsed.give} out` : null,
        parsed.name ? (swap ? `${parsed.name} in` : parsed.name) : null,
        parsed.club ? `${swap ? 'with' : parsed.dir === 'in' ? 'from' : 'to'} ${parsed.club}` : null,
        parsed.fee !== '' ? (Number(parsed.fee) < 0 ? `they pay ${money(-parsed.fee)}` : money(Number(parsed.fee))) : null,
        parsed.age ? `age ${parsed.age}` : null,
        parsed.ovr ? `${parsed.ovr} OVR` : null,
        parsed.window ? (parsed.window === 'winter' ? 'January' : 'summer') : null,
        parsed.season ? `season ${parsed.season}` : null,
      ].filter(Boolean);
      note.innerHTML = parsed.name
        ? `I understood: <strong>${bits.map(esc).join(' · ')}</strong>. Check the form, then log it.`
        : `I couldn't find a player name in that. Type it into the form${bits.length ? ` (I did get: ${bits.map(esc).join(' · ')})` : ''}.`;
      tform.elements[parsed.name ? 'fee' : 'name'].focus();
      return true;
    }
    if (form.matches('[data-tform]')) {
      e.preventDefault();
      // Whatever events the browser sent, never log a player with someone else's details.
      updateRecognition(form, item, true);
      const v = formValues(form);
      if (!v.name) return true;
      if (v.dir === 'swap' && !v.give) {
        deps.toast('Pick the player you give from your squad first');
        form.elements.give.focus();
        return true;
      }
      const known = DB.recognise(v.name);
      // Unticking "regen" for someone I didn't know means they're real: remember them.
      if (v.dir !== 'out' && !v.regen && v.type !== 'promotion' && !(known && known.player)) deps.rememberKnown(v.name, v.nat, v.pos);
      const moves = v.dir === 'swap' ? swapMoves(v) : [v];
      change(item, (t) => moves.reduce((tr, m) => C.applyTransfer(tr, Object.assign({ id: uid(), playerId: uid() }, m)), t), ['transfers', 'squad']);
      deps.toast(v.dir === 'swap' ? `Swapped ${v.give} for ${v.name}${v.regen ? ' 🧬' : ''} 🔄` : v.dir === 'in' ? `Signed ${v.name}${v.regen ? ' 🧬' : ''} ⬇️` : `${v.name} left ⬆️`);
      return true;
    }
    if (form.matches('[data-mform]')) {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form).entries());
      const club = String(f.club || '').trim().slice(0, 40);
      if (!club) return true;
      change(item, (t) => t.moves.push({ id: uid(), season: Number(f.season) || t.season, type: f.type, club, country: f.country }), ['moves']);
      return true;
    }
    return false;
  }

  function onChange(e, item) {
    const el = e.target;
    if (FC26.matches && el.closest('[data-panel="matches"]')) { FC26.matches.onChange(e, item); return true; }
    const tform = el.closest('[data-tform]');
    if (tform) {
      // Some browsers report a picked suggestion or autofill only as "change", not "input".
      noteTyped(tform, el);
      clearTimeout(liveTimer);
      updateRecognition(tform, item, el.name === 'name');
      updatePrecheck(tform, item);
      return true;
    }
    if (el.closest('[data-scout-form]')) {
      const s = scoutFilters(item.dataset.id);
      if (el.name === 'fits') s.fits = el.checked;
      else if (el.name === 'maxAge') s.maxAge = Number(el.value) || 21;
      else if (el.name === 'group' || el.name === 'leagueId') s[el.name] = el.value;
      else return true;
      s.shown = 15;
      refreshScoutList(item);
      return true;
    }
    if (el.dataset.tracker) {
      change(item, (t) => {
        if (el.dataset.tracker === 'season') t.season = Number(el.value) || 1;
        else t.window = el.value === 'winter' ? 'winter' : 'summer';
      }, ['transfers', 'moves']);
      return true;
    }
    if (el.matches('[data-shot]')) {
      readShot(el, item);
      return true;
    }
    if (LU() && el.matches('[data-lu-formation]')) {
      LU().picks[item.dataset.id] = null;
      changeLineup(item, (lu, t) => LU().changeFormation(t, lu, el.value));
      return true;
    }
    if (LU() && el.matches('[data-lu-role]')) {
      const key = el.dataset.luRole;
      changeLineup(item, (lu) => Object.assign({}, lu, { [key]: el.value || null }));
      return true;
    }
    if (el.matches('[data-squad-sort]')) {
      squadSort[item.dataset.id] = el.value;
      const entry = deps.findEntry(item.dataset.id);
      if (entry) rerenderPanel(item, entry, 'squad');
      return true;
    }
    if (el.dataset.pfield) {
      const pid = el.closest('[data-pid]').dataset.pid;
      const field = el.dataset.pfield;
      let value = el.type === 'checkbox' ? el.checked : el.value.trim().slice(0, 40);
      if (el.type === 'number') value = n(value) == null ? '' : n(value);
      if (field === 'nat') {
        value = C.normNat(value);
        el.value = value;
      }
      change(item, (t) => {
        const p = t.players.find((x) => x.id === pid);
        if (p) p[field] = value;
      }, []);
      const row = el.closest('.prow');
      if (field === 'loanedOut') row.classList.toggle('is-out', el.checked);
      if (field === 'starter') row.classList.toggle('is-starter', el.checked);
      if (field === 'ovr') el.className = `p-ovr ${ovrBand(value)}`;
      if (field === 'pos') row.className = row.className.replace(/line-\w+/, `line-${squadLine(value)}`);
      return true;
    }
    return false;
  }

  /** 📷 A transfer screenshot: read it and fill in the form. */
  async function readShot(input, item) {
    const file = input.files && input.files[0];
    input.value = '';
    const entry = file && deps.findEntry(item.dataset.id);
    if (!entry || !FC26.ocr) return;
    const note = item.querySelector('[data-assist-note]');
    note.innerHTML = '📷 Reading your screenshot… <span data-shot-pct>0%</span> <span class="muted">(the first time downloads the text reader, about 7 MB)</span>';
    try {
      const t = trackerOf(entry);
      const res = await FC26.ocr.analyze(file, {
        squad: t.players,
        onProgress: (pct) => { const el = note.querySelector('[data-shot-pct]'); if (el) el.textContent = `${pct}%`; },
      });
      const old = item.querySelector('[data-tform]');
      old.outerHTML = transferForm(entry, t, res.dir, res);
      const tform = item.querySelector('[data-tform]');
      updateRecognition(tform, item, true);
      updatePrecheck(tform, item);
      note.innerHTML = res.found.length
        ? `📷 I read: <strong>${res.found.map(esc).join(' · ')}</strong>. Check the form, fix anything I misread, then log it.
          <details class="shot-text"><summary>What I saw</summary><pre>${esc(res.text.trim().slice(0, 1500))}</pre></details>`
        : `📷 I couldn't find a transfer in that picture. Try a sharper screenshot of the transfer screen, or type it in.
          <details class="shot-text"><summary>What I saw</summary><pre>${esc(res.text.trim().slice(0, 1500) || '(no text)')}</pre></details>`;
      tform.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      note.textContent = `📷 ${err.message || 'That screenshot couldn\'t be read.'}`;
    }
  }

  /** The stand-alone Transfers section for one challenge. */
  function renderTransferCentre(entry) {
    const t = trackerOf(entry);
    const seasons = Math.max(entry.challenge.seasons, t.season);
    return `
      <div class="tracker-bar">
        <span class="tracker-now">📅 Now:
          <select data-tracker="season" aria-label="Current season">${opts(Array.from({ length: seasons }, (_, i) => [i + 1, `Season ${i + 1}`]), t.season)}</select>
          ${isPlayer(entry) ? '' : `<select data-tracker="window" aria-label="Current transfer window">${opts([['summer', 'Summer window'], ['winter', 'January window']], t.window)}</select>`}
        </span>
      </div>
      ${isPlayer(entry)
    ? `<div data-panel="moves">${renderMoves(entry, t)}</div>`
    : `<div data-panel="transfers">${renderTransfers(entry, t)}</div>
       <details class="scout-box" data-scout-box ${(entry.shortlist || []).length ? 'open' : ''}>
         <summary>🔭 Wonderkid suggestions${(entry.shortlist || []).length ? ` · 🎯 ${entry.shortlist.length} shortlisted` : ''}</summary>
         <div data-panel="scout">${renderScout(entry, t)}</div>
       </details>`}`;
  }

  /** A club's real squad as tracker players, aged for the given season ([] if unknown). */
  const SQUAD_SOURCE = "The squad as it is in FC 26 at launch: players, positions, ratings, nationalities and ages from EA's own FC 26 database, loans from the clubs' squad lists.";
  const loanedOut = (row) => row[4] === 'out';

  /** "28 players + 6 out on loan", with a warning for lists too short to be a full squad. */
  function squadSize(real) {
    const out = real.filter(loanedOut).length;
    const n = real.length - out;
    return `${n} player${n === 1 ? '' : 's'}${out ? ` + ${out} out on loan` : ''}${n < 16 ? ', may be incomplete' : ''}`;
  }

  /** Tracker players for a club's real squad, aged for the season; [] if under `minimum` (loanees out not counted). */
  function realSquadPlayers(club, season, minimum) {
    const real = realSquad(club);
    if (!real || real.filter((row) => !loanedOut(row)).length < (minimum || 1)) return [];
    const day = seasonDay(season);
    const xi = new Set(((FC26.squads && FC26.squads.xi) || {})[club] || []);
    const fromGame = !((FC26.squads && FC26.squads.notInGame) || []).includes(club);
    return real.map(([name, pos, dob, nat, loan, , ovr], i) => {
      // The game's positions are the ones to use. A Wikipedia list often says just "forward";
      // the hand-written list knows Vinícius is a LW (same name and nationality, so the same player).
      const known = !fromGame && DB.lookup(name);
      const sure = known && known.curated && known.pos && known.nat === C.normNat(nat);
      return {
        id: uid(), name, pos: sure ? known.pos : pos, age: DB.ageOn(dob, day), nat: C.normNat(nat), ovr: Number(ovr) || '',
        loanIn: loan === 'in', loanedOut: loan === 'out', starter: xi.has(i),
      };
    });
  }

  function setTab(id, tab) {
    tabs[id] = tab;
  }

  /** The club's likely starting XI on a pitch (for challenge cards), or '' when there's no real squad. */
  function defaultXIPitch(club) {
    const players = realSquadPlayers(club, 1);
    return players.some((p) => p.starter) ? renderPitch({ players }, true) : '';
  }

  FC26.trackerUI = { init, renderTracker, renderTransferCentre, realSquadPlayers, defaultXIPitch, setTab, onClick, onChange, onSubmit, onInput, parseSquad, bestXI, POSITIONS };
})(typeof window !== 'undefined' ? window : globalThis);
