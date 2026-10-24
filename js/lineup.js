/*
 * ⚽ Lineup: the squad tab's starting XI in a formation, like the game's team
 * management screen. Pick a formation, click a position to put a player there,
 * fill the bench, choose a captain and set-piece takers.
 *
 * Kept on the tracker as t.lineup = { formation, slots: [11 player ids|null],
 * bench: [BENCH ids|null], captain, pk, fk, ck }. Each player's `starter` flag
 * still says who's in the XI (the rule checks use it); the lineup says where.
 *
 * Players out of position play worse, as in the game: a natural position
 * keeps their OVR, a nearby one costs 3, anything else 12 (a keeper out of
 * goal, or an outfielder in it, much more).
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const BENCH = 9;

  // [position, x %, y %] from the left touchline and from the opponents' goal line.
  const D4 = [['LB', 12, 72], ['CB', 37, 76], ['CB', 63, 76], ['RB', 88, 72]];
  const D3 = [['CB', 25, 76], ['CB', 50, 78], ['CB', 75, 76]];
  const D5 = [['LWB', 9, 64], ['CB', 29, 76], ['CB', 50, 78], ['CB', 71, 76], ['RWB', 91, 64]];
  const GK = [['GK', 50, 92]];
  const LAYOUTS = {
    '4-3-3': GK.concat(D4, [['CM', 28, 50], ['CM', 50, 54], ['CM', 72, 50], ['LW', 16, 22], ['ST', 50, 14], ['RW', 84, 22]]),
    '4-3-3 (Attack)': GK.concat(D4, [['CM', 30, 52], ['CAM', 50, 38], ['CM', 70, 52], ['LW', 16, 20], ['ST', 50, 12], ['RW', 84, 20]]),
    '4-3-3 (Holding)': GK.concat(D4, [['CDM', 50, 60], ['CM', 30, 46], ['CM', 70, 46], ['LW', 16, 22], ['ST', 50, 13], ['RW', 84, 22]]),
    '4-2-3-1 (Wide)': GK.concat(D4, [['CDM', 36, 58], ['CDM', 64, 58], ['LM', 14, 36], ['CAM', 50, 36], ['RM', 86, 36], ['ST', 50, 13]]),
    '4-4-2 (Flat)': GK.concat(D4, [['LM', 12, 46], ['CM', 37, 50], ['CM', 63, 50], ['RM', 88, 46], ['ST', 36, 16], ['ST', 64, 16]]),
    '4-4-2 (Holding)': GK.concat(D4, [['LM', 12, 44], ['CDM', 37, 58], ['CDM', 63, 58], ['RM', 88, 44], ['ST', 36, 16], ['ST', 64, 16]]),
    '4-1-2-1-2 (Narrow)': GK.concat(D4, [['CDM', 50, 60], ['CM', 30, 48], ['CM', 70, 48], ['CAM', 50, 34], ['ST', 36, 15], ['ST', 64, 15]]),
    '4-2-2-2': GK.concat(D4, [['CDM', 36, 58], ['CDM', 64, 58], ['CAM', 22, 36], ['CAM', 78, 36], ['ST', 36, 15], ['ST', 64, 15]]),
    '4-3-2-1': GK.concat(D4, [['CM', 28, 52], ['CM', 50, 56], ['CM', 72, 52], ['CF', 32, 30], ['CF', 68, 30], ['ST', 50, 13]]),
    '4-5-1 (Flat)': GK.concat(D4, [['LM', 10, 44], ['CM', 30, 50], ['CM', 50, 54], ['CM', 70, 50], ['RM', 90, 44], ['ST', 50, 15]]),
    '4-1-4-1': GK.concat(D4, [['CDM', 50, 60], ['LM', 12, 42], ['CM', 37, 44], ['CM', 63, 44], ['RM', 88, 42], ['ST', 50, 15]]),
    '3-5-2': GK.concat(D3, [['CDM', 36, 58], ['CDM', 64, 58], ['LM', 10, 44], ['CAM', 50, 36], ['RM', 90, 44], ['ST', 36, 15], ['ST', 64, 15]]),
    '3-4-3': GK.concat(D3, [['LM', 12, 48], ['CM', 37, 52], ['CM', 63, 52], ['RM', 88, 48], ['LW', 18, 22], ['ST', 50, 14], ['RW', 82, 22]]),
    '3-4-2-1': GK.concat(D3, [['LM', 12, 48], ['CM', 37, 54], ['CM', 63, 54], ['RM', 88, 48], ['CF', 32, 30], ['CF', 68, 30], ['ST', 50, 13]]),
    '3-1-4-2': GK.concat(D3, [['CDM', 50, 62], ['LM', 12, 44], ['CM', 37, 46], ['CM', 63, 46], ['RM', 88, 44], ['ST', 36, 15], ['ST', 64, 15]]),
    '5-3-2': GK.concat(D5, [['CM', 28, 48], ['CM', 50, 52], ['CM', 72, 48], ['ST', 36, 16], ['ST', 64, 16]]),
    '5-2-1-2': GK.concat(D5, [['CM', 34, 52], ['CM', 66, 52], ['CAM', 50, 36], ['ST', 36, 15], ['ST', 64, 15]]),
    '5-4-1': GK.concat(D5, [['LM', 14, 44], ['CM', 38, 48], ['CM', 62, 48], ['RM', 86, 44], ['ST', 50, 15]]),
  };
  const NAMES = Object.keys(LAYOUTS);
  const DEFAULT = '4-3-3';

  // Natural positions, and nearby ones a player can cover (as in the game's position ratings).
  const FIT = {
    GK: [['GK'], []],
    CB: [['CB'], ['CDM', 'LB', 'RB']],
    LB: [['LB', 'LWB'], ['LM', 'CB', 'RB']],
    RB: [['RB', 'RWB'], ['RM', 'CB', 'LB']],
    LWB: [['LWB', 'LB'], ['LM', 'LW', 'RWB']],
    RWB: [['RWB', 'RB'], ['RM', 'RW', 'LWB']],
    CDM: [['CDM'], ['CM', 'CB']],
    CM: [['CM'], ['CDM', 'CAM', 'LM', 'RM']],
    CAM: [['CAM'], ['CM', 'CF', 'LW', 'RW']],
    LM: [['LM', 'LW'], ['LWB', 'CM', 'RM', 'LB']],
    RM: [['RM', 'RW'], ['RWB', 'CM', 'LM', 'RB']],
    LW: [['LW', 'LM'], ['ST', 'CF', 'RW', 'CAM']],
    RW: [['RW', 'RM'], ['ST', 'CF', 'LW', 'CAM']],
    CF: [['CF', 'ST'], ['CAM', 'LW', 'RW']],
    ST: [['ST', 'CF'], ['LW', 'RW', 'CAM']],
  };
  const LINE = { GK: 'def', CB: 'def', LB: 'def', RB: 'def', LWB: 'def', RWB: 'def', CDM: 'mid', CM: 'mid', CAM: 'mid', LM: 'mid', RM: 'mid', LW: 'att', RW: 'att', CF: 'att', ST: 'att' };

  const num = (v) => { const x = Number(v); return Number.isFinite(x) && v !== '' && v != null ? x : null; };

  /** How well a player in `playerPos` fits a slot: 'good', 'ok' or 'bad'. */
  function fit(playerPos, slotPos) {
    const f = FIT[slotPos];
    if (!f || !playerPos) return 'ok';
    if (f[0].includes(playerPos)) return 'good';
    if (f[1].includes(playerPos)) return 'ok';
    return 'bad';
  }

  /** A player's rating in a slot, after any out-of-position penalty (null when unrated). */
  function rating(p, slotPos) {
    const ovr = num(p && p.ovr);
    if (ovr == null) return null;
    const f = fit(p.pos, slotPos);
    if (f === 'good') return ovr;
    if ((slotPos === 'GK') !== (p.pos === 'GK') && p.pos) return Math.max(1, ovr - 40);
    return Math.max(1, ovr - (f === 'ok' ? 3 : 12));
  }

  // For choosing: fit first, then rating (unrated players count as 60).
  const score = (p, slotPos) => ({ good: 1000, ok: 500, bad: 0 }[fit(p.pos, slotPos)]) + (rating(p, slotPos) == null ? 60 : rating(p, slotPos));

  const active = (t) => (t.players || []).filter((p) => !p.loanedOut && p.id);
  const layout = (name) => LAYOUTS[name] || LAYOUTS[DEFAULT];

  /**
   * Better placements by swapping: two slots trade players, or a slot takes
   * someone from `spare`, whenever that raises the total. `fixedSet` slots stay put.
   */
  function improve(ids, positions, byId, spare, fixedSet) {
    const val = (id, i) => (id ? score(byId.get(id), positions[i]) : 0);
    const out = ids.slice();
    const pool = (spare || []).slice();
    for (let round = 0; round < 20; round++) {
      let better = false;
      for (let a = 0; a < out.length; a++) {
        if (fixedSet && fixedSet.has(a)) continue;
        for (let b = a + 1; b < out.length; b++) {
          if (fixedSet && fixedSet.has(b)) continue;
          if (val(out[b], a) + val(out[a], b) > val(out[a], a) + val(out[b], b)) { [out[a], out[b]] = [out[b], out[a]]; better = true; }
        }
        pool.forEach((id, k) => {
          if (val(id, a) > val(out[a], a)) { const was = out[a]; out[a] = id; pool[k] = was; better = true; }
        });
      }
      if (!better) break;
    }
    return out;
  }

  /** Put `players` into the formation's slots, scarcest slots first. Returns 11 ids/nulls. */
  function assign(players, formation, fixed) {
    const slots = layout(formation).map(([pos]) => ({ pos, id: null }));
    const pool = players.slice();
    (fixed || []).forEach((id, i) => { if (id && slots[i]) { slots[i].id = id; const k = pool.findIndex((p) => p.id === id); if (k >= 0) pool.splice(k, 1); } });
    const open = slots.map((s, i) => i).filter((i) => !slots[i].id);
    const goodCount = (i) => pool.filter((p) => fit(p.pos, slots[i].pos) === 'good').length;
    open.sort((a, b) => (slots[a].pos === 'GK' ? -1 : 0) - (slots[b].pos === 'GK' ? -1 : 0) || goodCount(a) - goodCount(b));
    open.forEach((i) => {
      if (!pool.length) return;
      let best = 0;
      pool.forEach((p, k) => { if (score(p, slots[i].pos) > score(pool[best], slots[i].pos)) best = k; });
      slots[i].id = pool[best].id;
      pool.splice(best, 1);
    });
    const byId = new Map(players.map((p) => [p.id, p]));
    const fixedSet = new Set((fixed || []).map((id, i) => (id ? i : -1)).filter((i) => i >= 0));
    return improve(slots.map((s) => s.id), slots.map((s) => s.pos), byId, [], fixedSet);
  }

  /** The best XI and bench for a formation from the whole squad. */
  function autoPick(t, formation) {
    const players = active(t);
    const byOvr = players.slice().sort((a, b) => (num(b.ovr) || 0) - (num(a.ovr) || 0));
    // Take the strongest candidates for each slot in turn, scarcest positions first.
    const slots = layout(formation).map(([pos]) => pos);
    const chosen = new Set();
    const order = slots.map((pos, i) => i).sort((a, b) => (slots[a] === 'GK' ? -1 : 0) - (slots[b] === 'GK' ? -1 : 0)
      || players.filter((p) => fit(p.pos, slots[a]) === 'good').length - players.filter((p) => fit(p.pos, slots[b]) === 'good').length);
    const ids = new Array(slots.length).fill(null);
    order.forEach((i) => {
      let best = null;
      players.forEach((p) => { if (!chosen.has(p.id) && (!best || score(p, slots[i]) > score(best, slots[i]))) best = p; });
      if (best) { ids[i] = best.id; chosen.add(best.id); }
    });
    // Then swap players around (and in from the rest of the squad) while that helps.
    const byIdAll = new Map(players.map((p) => [p.id, p]));
    const better = improve(ids, slots, byIdAll, players.filter((p) => !chosen.has(p.id)).map((p) => p.id));
    better.forEach((id, i) => { ids[i] = id; });
    chosen.clear();
    ids.forEach((id) => { if (id) chosen.add(id); });
    // Bench: a keeper first, then the best of the rest.
    const rest = byOvr.filter((p) => !chosen.has(p.id));
    const keeper = rest.find((p) => p.pos === 'GK');
    const bench = (keeper ? [keeper] : []).concat(rest.filter((p) => p !== keeper)).slice(0, BENCH).map((p) => p.id);
    while (bench.length < BENCH) bench.push(null);
    const xi = ids.map((id) => players.find((p) => p.id === id)).filter(Boolean);
    const best = (key) => xi.slice().sort((a, b) => (num(b.ovr) || 0) - (num(a.ovr) || 0)).filter((p) => key(p))[0];
    const captain = best(() => true);
    return {
      formation, slots: ids, bench,
      captain: captain ? captain.id : null,
      pk: (best((p) => ['ST', 'CF'].includes(p.pos)) || captain || {}).id || null,
      fk: (best((p) => ['CAM', 'CM', 'LW', 'RW', 'LM', 'RM'].includes(p.pos)) || captain || {}).id || null,
      ck: (best((p) => ['CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'LB', 'RB'].includes(p.pos)) || captain || {}).id || null,
    };
  }

  /**
   * The lineup as it stands: the saved one, tidied up against the squad. Players
   * ticked ⭐ but not placed go into the best free slots; players no longer
   * starting (or gone) leave theirs.
   */
  function ensure(t, preferred) {
    const players = active(t);
    const ids = new Set(players.map((p) => p.id));
    const starters = new Set(players.filter((p) => p.starter).map((p) => p.id));
    const saved = t.lineup && typeof t.lineup === 'object' ? t.lineup : {};
    const formation = LAYOUTS[saved.formation] ? saved.formation : (LAYOUTS[preferred] ? preferred : DEFAULT);
    const n = layout(formation).length;
    let slots = (Array.isArray(saved.slots) ? saved.slots : []).slice(0, n).map((id) => (id && starters.has(id) ? id : null));
    while (slots.length < n) slots.push(null);
    slots = slots.map((id, i) => (slots.indexOf(id) === i ? id : null));
    const loose = players.filter((p) => starters.has(p.id) && !slots.includes(p.id));
    if (loose.length) slots = assign(loose, formation, slots);
    let bench = (Array.isArray(saved.bench) ? saved.bench : []).slice(0, BENCH).map((id) => (id && ids.has(id) && !starters.has(id) ? id : null));
    bench = bench.map((id, i) => (id && bench.indexOf(id) === i ? id : null));
    while (bench.length < BENCH) bench.push(null);
    const role = (id) => (id && slots.includes(id) ? id : null);
    return { formation, slots, bench, captain: role(saved.captain), pk: role(saved.pk), fk: role(saved.fk), ck: role(saved.ck) };
  }

  /** Save a lineup on the tracker and set everyone's ⭐ to match. */
  function apply(t, lu) {
    t.lineup = { formation: lu.formation, slots: lu.slots.slice(), bench: lu.bench.slice(), captain: lu.captain || null, pk: lu.pk || null, fk: lu.fk || null, ck: lu.ck || null };
    const xi = new Set(lu.slots.filter(Boolean));
    (t.players || []).forEach((p) => { p.starter = xi.has(p.id); });
    return t.lineup;
  }

  /** A new formation: the same XI, moved into the new shape's slots. */
  function changeFormation(t, lu, formation) {
    const xi = lu.slots.filter(Boolean).map((id) => active(t).find((p) => p.id === id)).filter(Boolean);
    return Object.assign({}, lu, { formation, slots: assign(xi, formation, []) });
  }

  /**
   * Put a player in a place ({ kind: 'xi'|'bench', i }), or empty it (pid null).
   * If he was already in the XI or on the bench, whoever had this place takes his.
   */
  function place(lu, where, pid) {
    const out = { formation: lu.formation, slots: lu.slots.slice(), bench: lu.bench.slice(), captain: lu.captain, pk: lu.pk, fk: lu.fk, ck: lu.ck };
    const list = where.kind === 'bench' ? out.bench : out.slots;
    const current = list[where.i] || null;
    if (pid) {
      const inXI = out.slots.indexOf(pid);
      const onBench = out.bench.indexOf(pid);
      if (inXI >= 0) out.slots[inXI] = current;
      else if (onBench >= 0) out.bench[onBench] = current;
    }
    list[where.i] = pid || null;
    ['captain', 'pk', 'fk', 'ck'].forEach((k) => { if (out[k] && !out.slots.includes(out[k])) out[k] = null; });
    return out;
  }

  /** Team ratings like the game's: overall, attack, midfield, defence (null when nobody's rated). */
  function ratings(t, lu) {
    const byId = new Map(active(t).map((p) => [p.id, p]));
    const parts = { all: [], att: [], mid: [], def: [] };
    layout(lu.formation).forEach(([pos], i) => {
      const p = byId.get(lu.slots[i]);
      const r = p ? rating(p, pos) : null;
      if (r == null) return;
      parts.all.push(r);
      parts[LINE[pos]].push(r);
    });
    const avg = (v) => (v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null);
    return { ovr: parts.all.length ? avg(parts.all) : null, att: avg(parts.att), mid: avg(parts.mid), def: avg(parts.def), filled: lu.slots.filter(Boolean).length };
  }

  /** A formation the challenge's rules or events name (e.g. "Play 5-3-2 in every match"), or ''. */
  function ruleFormation(ch) {
    if (!ch) return '';
    const text = [].concat(ch.coreRules || [], ch.rules || []).map((r) => r.text || '').join(' ');
    const hits = NAMES.filter((name) => text.includes(name)).sort((a, b) => b.length - a.length);
    if (hits.length) return hits[0];
    const bare = text.match(/\b([345]-\d(?:-\d){1,3})\b/);
    if (!bare) return '';
    return NAMES.find((name) => name === bare[1]) || NAMES.find((name) => name.startsWith(`${bare[1]} `)) || '';
  }

  // ---------- Drawing ----------

  const picks = {}; // saved entry id → the place being picked for: { kind, i } or null

  function render(entry, t, esc) {
    const players = active(t);
    if (!players.length) return '';
    const wanted = ruleFormation(entry.challenge);
    const lu = ensure(t, wanted);
    const L = layout(lu.formation);
    const byId = new Map(players.map((p) => [p.id, p]));
    const r = ratings(t, lu);
    const surname = (name) => String(name || '?').trim().split(/\s+/).slice(-1)[0];
    const tags = (id) => [lu.captain === id ? 'C' : '', lu.pk === id ? 'PK' : '', lu.fk === id ? 'FK' : '', lu.ck === id ? 'CK' : ''].filter(Boolean);
    const open = picks[entry.id];
    const slot = (pos, x, y, i) => {
      const p = byId.get(lu.slots[i]);
      const f = p ? fit(p.pos, pos) : '';
      const v = p ? rating(p, pos) : null;
      const sel = open && open.kind === 'xi' && open.i === i;
      return `<button type="button" class="lu-slot${p ? ` fit-${f}` : ' is-empty'}${sel ? ' is-picking' : ''}${p && p.regen ? ' is-regen' : ''}" style="left:${x}%;top:${y}%" data-action="lu-slot" data-kind="xi" data-i="${i}"
          title="${esc(p ? `${p.name}${p.pos ? ` (${p.pos})` : ''} at ${pos}${v != null ? `: ${v}` : ''}${f === 'ok' ? ', slightly out of position' : f === 'bad' ? ', out of position' : ''}` : `Pick a ${pos}`)}">
          <span class="lu-dot">${p ? (v != null ? v : esc(p.pos || '?')) : '+'}</span>
          <span class="lu-pos">${esc(pos)}</span>
          ${p ? `<span class="lu-name">${esc(surname(p.name))}</span>` : ''}
          ${p && tags(p.id).length ? `<span class="lu-tags">${tags(p.id).map((x) => `<i>${x}</i>`).join('')}</span>` : ''}
        </button>`;
    };
    const benchSlot = (id, i) => {
      const p = byId.get(id);
      const sel = open && open.kind === 'bench' && open.i === i;
      return `<button type="button" class="lu-sub${p ? '' : ' is-empty'}${sel ? ' is-picking' : ''}" data-action="lu-slot" data-kind="bench" data-i="${i}" title="${esc(p ? `${p.name}${p.pos ? ` (${p.pos})` : ''}` : 'Add a substitute')}">
          <span class="lu-sub-ovr">${p ? esc(num(p.ovr) || '–') : '+'}</span>
          <span class="lu-sub-main"><strong>${p ? esc(surname(p.name)) : `SUB ${i + 1}`}</strong><small>${p ? esc(p.pos || '') : ''}</small></span>
        </button>`;
    };
    const placed = new Set(lu.slots.concat(lu.bench).filter(Boolean));
    const reserves = players.filter((p) => !placed.has(p.id)).sort((a, b) => (num(b.ovr) || 0) - (num(a.ovr) || 0));
    const xiPlayers = lu.slots.map((id) => byId.get(id)).filter(Boolean);
    const roleSel = (key, label) => `<label class="lu-role"><span>${label}</span><select data-lu-role="${key}" aria-label="${label}"><option value="">–</option>${xiPlayers.map((p) => `<option value="${esc(p.id)}" ${lu[key] === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>`;
    const bad = lu.slots.map((id, i) => [byId.get(id), L[i][0]]).filter(([p, pos]) => p && fit(p.pos, pos) === 'bad');
    return `
      <div class="lu">
        <div class="lu-head">
          <label class="lu-formation"><span>Formation</span><select data-lu-formation aria-label="Formation">${NAMES.map((name) => `<option ${name === lu.formation ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label>
          <div class="lu-ratings" title="Average of your XI's ratings in their positions">
            <span><small>OVR</small><strong>${r.ovr == null ? '–' : r.ovr}</strong></span>
            <span><small>ATT</small><strong>${r.att == null ? '–' : r.att}</strong></span>
            <span><small>MID</small><strong>${r.mid == null ? '–' : r.mid}</strong></span>
            <span><small>DEF</small><strong>${r.def == null ? '–' : r.def}</strong></span>
          </div>
          <div class="lu-tools">
            <button type="button" class="btn btn-small btn-primary" data-action="lu-auto" title="Pick the best XI and bench for this formation">⭐ Auto-pick</button>
            <button type="button" class="btn btn-small" data-action="lu-image" title="Save your lineup as a picture">📸 Lineup image</button>
            <button type="button" class="btn btn-small" data-action="lu-clear" title="Empty the XI and bench">Clear</button>
          </div>
        </div>
        ${wanted && wanted !== lu.formation ? `<p class="lu-warn">📋 Your rules say <strong>${esc(wanted)}</strong>. <button type="button" class="login-link" data-action="lu-use" data-formation="${esc(wanted)}">Switch to it</button></p>` : ''}
        ${bad.length ? `<p class="lu-warn">⚠️ Out of position: ${bad.map(([p, pos]) => `${esc(surname(p.name))} (${esc(p.pos)}) at ${esc(pos)}`).join(', ')}</p>` : ''}
        <p class="muted small lu-hint">${r.filled}/11 picked. Click a position to choose who plays there; pick someone already in the team to swap them.</p>
        <div class="lu-pitch" role="group" aria-label="Starting XI in a ${esc(lu.formation)}">
          <span class="lu-box lu-box-top"></span><span class="lu-box lu-box-bottom"></span><span class="lu-circle"></span>
          ${L.map(([pos, x, y], i) => slot(pos, x, y, i)).join('')}
        </div>
        ${open ? picker(entry, t, lu, open, esc) : ''}
        <h4 class="lu-sub-head">🪑 Bench <span class="count">${lu.bench.filter(Boolean).length}/${BENCH}</span></h4>
        <div class="lu-bench">${lu.bench.map(benchSlot).join('')}</div>
        ${reserves.length ? `<p class="muted small lu-reserves">Reserves: ${reserves.map((p) => esc(`${surname(p.name)}${p.pos ? ` ${p.pos}` : ''}${num(p.ovr) ? ` ${p.ovr}` : ''}`)).join(' · ')}</p>` : ''}
        ${xiPlayers.length ? `<div class="lu-roles">${roleSel('captain', '©️ Captain')}${roleSel('pk', '🎯 Penalties')}${roleSel('fk', '🌀 Free kicks')}${roleSel('ck', '🚩 Corners')}</div>` : ''}
      </div>`;
  }

  function picker(entry, t, lu, open, esc) {
    const players = active(t);
    const L = layout(lu.formation);
    const pos = open.kind === 'xi' ? L[open.i][0] : null;
    const where = (id) => {
      const i = lu.slots.indexOf(id);
      if (i >= 0) return `XI · ${L[i][0]}`;
      const b = lu.bench.indexOf(id);
      return b >= 0 ? 'Bench' : '';
    };
    const sorted = players.slice().sort(pos
      ? (a, b) => score(b, pos) - score(a, pos)
      : (a, b) => (lu.slots.includes(a.id) - lu.slots.includes(b.id)) || (num(b.ovr) || 0) - (num(a.ovr) || 0));
    const current = (open.kind === 'xi' ? lu.slots : lu.bench)[open.i];
    return `
      <div class="lu-picker" role="dialog" aria-label="Pick a player">
        <div class="lu-picker-head"><strong>${pos ? `Who plays ${esc(pos)}?` : `Substitute ${open.i + 1}`}</strong>
          ${current ? '<button type="button" class="btn btn-small" data-action="lu-pick" data-pid="">Leave empty</button>' : ''}
          <button type="button" class="icon-btn" data-action="lu-close" aria-label="Close">✕</button></div>
        <ul class="lu-options">${sorted.map((p) => {
    const f = pos ? fit(p.pos, pos) : 'good';
    const v = pos ? rating(p, pos) : num(p.ovr);
    const w = where(p.id);
    return `<li><button type="button" class="lu-opt${p.id === current ? ' is-current' : ''}" data-action="lu-pick" data-pid="${esc(p.id)}">
            <span class="lu-opt-ovr fit-${f}">${v == null ? '–' : v}</span>
            <span class="lu-opt-main"><strong>${esc(p.name)}</strong><small>${esc([p.pos, num(p.age) ? `${p.age} yrs` : '', pos && f !== 'good' && num(p.ovr) ? `${p.ovr} in his position` : ''].filter(Boolean).join(' · '))}</small></span>
            ${w ? `<span class="lu-opt-where">${esc(w)}</span>` : ''}
          </button></li>`;
  }).join('')}</ul>
      </div>`;
  }

  // ---------- The lineup as a picture ----------

  async function exportImage(entry, t) {
    const players = active(t);
    const lu = ensure(t, ruleFormation(entry.challenge));
    const L = layout(lu.formation);
    const byId = new Map(players.map((p) => [p.id, p]));
    const r = ratings(t, lu);
    const W = 1080;
    const H = 1350;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#19e68c';
    ctx.font = `800 30px ${FONT}`;
    ctx.fillText(`${lu.formation.toUpperCase()}${r.ovr ? `  ·  TEAM OVR ${r.ovr}` : ''}`, 60, 80);
    ctx.fillStyle = '#e9eef5';
    ctx.font = `900 64px ${FONT}`;
    ctx.fillText(String(entry.challenge.club.name).toUpperCase().slice(0, 26), 60, 150);
    ctx.fillStyle = '#8d9bb0';
    ctx.font = `600 28px ${FONT}`;
    ctx.fillText(String(entry.challenge.title).slice(0, 60), 60, 192);
    // Pitch
    const px = 60;
    const py = 230;
    const pw = W - 120;
    const ph = 860;
    const g = ctx.createLinearGradient(0, py, 0, py + ph);
    g.addColorStop(0, '#1f7a3e');
    g.addColorStop(1, '#165c2e');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, pw, ph);
    ctx.beginPath();
    ctx.moveTo(px, py + ph / 2);
    ctx.lineTo(px + pw, py + ph / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px + pw / 2, py + ph / 2, 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(px + pw * 0.25, py, pw * 0.5, 130);
    ctx.strokeRect(px + pw * 0.25, py + ph - 130, pw * 0.5, 130);
    ctx.textAlign = 'center';
    L.forEach(([pos, x, y], i) => {
      const p = byId.get(lu.slots[i]);
      const cx = px + (pw * x) / 100;
      const cy = py + (ph * (y - 4)) / 96;
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fillStyle = '#0b0f14';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = !p ? 'rgba(255,255,255,0.4)' : { good: '#19e68c', ok: '#ffc94d', bad: '#ff5c6c' }[fit(p.pos, pos)];
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `800 28px ${FONT}`;
      const v = p ? rating(p, pos) : null;
      ctx.fillText(p ? String(v != null ? v : pos) : pos, cx, cy + 10);
      ctx.font = `800 26px ${FONT}`;
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 6;
      const name = p ? String(p.name).trim().split(/\s+/).slice(-1)[0] : '';
      ctx.fillText(`${name.slice(0, 14)}${p && lu.captain === p.id ? ' ©' : ''}`, cx, cy + 74);
      ctx.shadowBlur = 0;
    });
    ctx.textAlign = 'left';
    // Bench
    const subs = lu.bench.map((id) => byId.get(id)).filter(Boolean);
    ctx.fillStyle = '#19e68c';
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText('BENCH', 60, 1140);
    ctx.fillStyle = '#e9eef5';
    ctx.font = `500 25px ${FONT}`;
    const benchText = subs.map((p) => `${String(p.name).trim().split(/\s+/).slice(-1)[0]}${p.pos ? ` (${p.pos})` : ''}`).join(' · ') || '–';
    const words = benchText.split(' ');
    let line = '';
    let y = 1180;
    words.forEach((w) => {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > W - 120 && line) { ctx.fillText(line, 60, y); y += 34; line = w; } else line = test;
    });
    if (line && y < 1260) ctx.fillText(line, 60, y);
    ctx.fillStyle = '#8d9bb0';
    ctx.font = `600 22px ${FONT}`;
    const site = /^https?:$/.test(root.location.protocol) ? (root.location.host + root.location.pathname).replace(/index\.html$/, '').replace(/\/$/, '') : String((FC26.config && FC26.config.siteUrl) || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
    ctx.fillText(`FC26 Career Challenge${site ? `  ·  ${site}` : ''}`, 60, H - 40);
    const slug = String(entry.challenge.club.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return FC26.shareImage.deliver(c, `fc26-lineup-${slug}.png`, `${entry.challenge.club.name} lineup`);
  }

  FC26.lineup = { LAYOUTS, NAMES, BENCH, FIT, fit, rating, assign, autoPick, ensure, apply, changeFormation, place, ratings, ruleFormation, render, picks, exportImage };
})(typeof window !== 'undefined' ? window : globalThis);
