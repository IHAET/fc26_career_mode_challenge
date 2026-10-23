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
          <div class="tracker-tabs" role="tablist">
            ${tabBtn('challenge', '📋 Challenge')}
            ${isPlayer(entry)
    ? tabBtn('moves', '🧳 Career moves', t.moves.length)
    : `${tabBtn('squad', '👥 Squad', t.players.filter((p) => !p.loanedOut).length)}${tabBtn('transfers', '🔁 Transfers', t.transfers.length)}`}
          </div>
        </div>
        <div class="tpanel" data-panel="challenge" ${tab === 'challenge' ? '' : 'hidden'}>${challengeHtml}</div>
        ${isPlayer(entry)
    ? `<div class="tpanel" data-panel="moves" ${tab === 'moves' ? '' : 'hidden'}>${renderMoves(entry, t)}</div>`
    : `<div class="tpanel" data-panel="squad" ${tab === 'squad' ? '' : 'hidden'}>${renderSquad(entry, t)}</div>
        <div class="tpanel" data-panel="transfers" ${tab === 'transfers' ? '' : 'hidden'}>${renderTransfers(entry, t)}</div>`}
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

  function renderSquad(entry, t) {
    const real = realSquad(entry.challenge.club.name);
    const rows = t.players.map((p) => `
        <div class="prow ${p.loanedOut ? 'is-out' : ''}" data-pid="${esc(p.id)}">
          <input class="p-name" type="text" data-pfield="name" value="${esc(p.name)}" placeholder="Player name" maxlength="40" aria-label="Name">
          <select class="p-pos" data-pfield="pos" aria-label="Position"><option value=""></option>${opts(POSITIONS.map((x) => [x, x]), p.pos)}</select>
          <input class="p-age" type="number" min="14" max="50" data-pfield="age" value="${esc(p.age)}" placeholder="Age" aria-label="Age">
          <input class="p-nat" type="text" list="nat-list" data-pfield="nat" value="${esc(p.nat)}" placeholder="Nationality" maxlength="30" aria-label="Nationality">
          <input class="p-ovr" type="number" min="1" max="99" data-pfield="ovr" value="${esc(p.ovr)}" placeholder="OVR" aria-label="Overall rating">
          <input class="p-wage" type="number" min="0" step="0.1" data-pfield="wage" value="${esc(p.wage)}" placeholder="€K/w" aria-label="Wage in thousands of euros per week">
          <span class="p-flags">
            <label title="In your starting XI"><input type="checkbox" data-pfield="starter" ${p.starter ? 'checked' : ''}>⭐</label>
            <label title="Academy graduate"><input type="checkbox" data-pfield="academy" ${p.academy ? 'checked' : ''}>🎓</label>
            <label title="On loan at your club"><input type="checkbox" data-pfield="loanIn" ${p.loanIn ? 'checked' : ''}>🔁</label>
            <label title="Loaned out to another club"><input type="checkbox" data-pfield="loanedOut" ${p.loanedOut ? 'checked' : ''}>✈️</label>
            <label title="Regen: a player the game generated"><input type="checkbox" data-pfield="regen" ${p.regen ? 'checked' : ''}>🧬</label>
          </span>
          <button type="button" class="icon-btn" data-action="squad-del" title="Remove from the squad" aria-label="Remove ${esc(p.name)}">✕</button>
        </div>`).join('');
    return `
      <div class="squad">
        <div class="tools">
          <button type="button" class="btn btn-small" data-action="squad-add">+ Add player</button>
          <button type="button" class="btn btn-small" data-action="squad-paste">📋 Paste squad</button>
          ${real ? `<button type="button" class="btn btn-small${t.players.length ? '' : ' btn-primary'}" data-action="squad-load" title="Real squad list from Wikidata: names, positions, ages and nationalities (no OVR)">⬇️ Load real squad (${real.length})</button>` : ''}
          <span class="muted squad-stats">${esc(squadStats(t))}</span>
        </div>
        <div class="paste-box" hidden>
          <p class="muted">One player per line: <code>Name, Position, Age, Nationality, OVR, Wage</code>. Only the name is required, and the other values can come in any order. Copying a table from a ratings site works too.</p>
          <textarea rows="6" data-paste placeholder="Bukayo Saka, RW, 24, English, 87&#10;Jamie Gittens LW 21 English 80"></textarea>
          <label class="toggle"><input type="checkbox" data-paste-replace> Replace the current squad</label>
          <div class="tools">
            <button type="button" class="btn btn-small btn-primary" data-action="paste-import">Import</button>
            <button type="button" class="btn btn-small" data-action="paste-cancel">Cancel</button>
          </div>
        </div>
        ${t.players.length ? `<div class="phead" aria-hidden="true"><span>Name</span><span>Pos</span><span>Age</span><span>Nationality</span><span>OVR</span><span>€K/week</span><span>⭐ 🎓 🔁 ✈️ 🧬</span><span></span></div>` : ''}
        <div class="plist">${rows || `<p class="muted empty-note">${real
    ? `No players yet. Press <strong>⬇️ Load real squad</strong> to start from ${esc(entry.challenge.club.name)}'s 2025/26 squad (from Wikidata: names, positions, ages and nationalities; add OVRs yourself), or paste your own list.`
    : 'No players yet. Add them one by one, or paste your whole squad.'}</p>`}</div>
        <p class="muted legend">⭐ starting XI · 🎓 academy graduate · 🔁 on loan at your club · ✈️ loaned out · 🧬 regen (generated player)</p>
      </div>`;
  }

  function transferForm(entry, t, dir, pre) {
    const v = Object.assign({}, pre || {});
    const types = dir === 'out' ? OUT_TYPES : IN_TYPES;
    const squadNames = t.players.map((p) => `<option value="${esc(p.name)}"></option>`).join('');
    const val = (k) => (v[k] == null ? '' : esc(v[k]));
    const seasons = Array.from({ length: Math.max(entry.challenge.seasons, t.season) }, (_, i) => [i + 1, `S${i + 1}`]);
    return `
      <form class="tform" data-tform data-dir="${dir}" autocomplete="off">
        <div class="seg">
          <button type="button" class="${dir === 'in' ? 'is-on' : ''}" data-action="tr-dir" data-dir="in">⬇️ Signing</button>
          <button type="button" class="${dir === 'out' ? 'is-on' : ''}" data-action="tr-dir" data-dir="out">⬆️ Departure</button>
        </div>
        <div class="tgrid">
          <label class="f-wide"><span>Player</span><input name="name" type="text" maxlength="40" required value="${val('name')}" list="${dir === 'out' ? `squad-names-${esc(entry.id)}` : 'known-players'}" placeholder="${dir === 'out' ? 'Pick from your squad' : 'Name'}"></label>
          ${dir === 'out' ? `<datalist id="squad-names-${esc(entry.id)}">${squadNames}</datalist>` : ''}
          <label><span>Type</span><select name="type">${opts(types, v.type)}</select></label>
          <label><span>Fee €M</span><input name="fee" type="number" min="0" step="0.1" placeholder="0" value="${val('fee')}"></label>
          <label class="f-wide"><span>${dir === 'out' ? 'To club' : 'From club'}</span><input name="club" type="text" maxlength="40" value="${val('club')}"></label>
          ${dir === 'in' ? `
          <label><span>Pos</span><select name="pos"><option value=""></option>${opts(POSITIONS.map((x) => [x, x]), v.pos)}</select></label>
          <label><span>Age</span><input name="age" type="number" min="14" max="50" value="${val('age')}"></label>
          <label><span>Nationality</span><input name="nat" type="text" list="nat-list" maxlength="30" value="${val('nat')}"></label>
          <label><span>OVR</span><input name="ovr" type="number" min="1" max="99" value="${val('ovr')}"></label>
          <label><span>Wage €K/w</span><input name="wage" type="number" min="0" step="0.1" value="${val('wage')}"></label>` : ''}
          <label><span>Season</span><select name="season">${opts(seasons, v.season || t.season)}</select></label>
          <label><span>Window</span><select name="window">${opts([['summer', 'Summer'], ['winter', 'January']], v.window || t.window)}</select></label>
        </div>
        <div class="recog" data-recog aria-live="polite"></div>
        ${dir === 'in' ? '<label class="toggle regen-toggle"><input type="checkbox" name="regen"> 🧬 Regen (a player the game generated)</label>' : ''}
        <div class="precheck" data-precheck aria-live="polite"></div>
        <button type="submit" class="btn btn-small btn-primary">${dir === 'out' ? 'Log departure' : 'Log signing'}</button>
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
            <span class="tdir">${x.dir === 'in' ? '⬇️' : '⬆️'}</span>
            <span class="tmain"><strong>${esc(x.name)}</strong>${x.regen ? ' <span class="regen-badge" title="Regen: generated by the game">🧬 Regen</span>' : ''}
              <small class="muted">${[x.pos, x.age ? `${x.age}y` : '', x.nat ? C.normNat(x.nat) : '', x.ovr ? `${x.ovr} OVR` : ''].filter(Boolean).map(esc).join(' · ')}</small></span>
            <span class="tmeta">${esc(((x.dir === 'in' ? IN_TYPES : OUT_TYPES).find(([v]) => v === x.type) || ['', x.type])[1])}${x.club ? ` · ${x.dir === 'in' ? 'from' : 'to'} ${esc(x.club)}` : ''}${n(x.fee) ? ` · <strong>${money(n(x.fee))}</strong>` : ''}</span>
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

  function formValues(form) {
    const f = Object.fromEntries(new FormData(form).entries());
    return {
      dir: form.dataset.dir,
      type: f.type,
      name: String(f.name || '').trim().slice(0, 40),
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
      const bits = [p.nat, p.pos, age ? `${age} at the start of season ${v.season}` : '', p.club ? `plays for ${p.club}` : ''].filter(Boolean);
      note.innerHTML = `👤 Recognised: <strong>${esc(p.name)}</strong>${bits.length ? ` · ${bits.map(esc).join(' · ')}` : ''}${p.custom ? ' <span class="muted">(you confirmed this one)</span>' : ''}`;
      setRegen(false);
      if (autofill) {
        if (form.elements.nat && !form.elements.nat.value && p.nat) form.elements.nat.value = p.nat;
        if (form.elements.pos && !form.elements.pos.value && p.pos) form.elements.pos.value = p.pos;
        if (form.elements.age && !form.elements.age.value && age) form.elements.age.value = age;
        if (form.elements.club && !form.elements.club.value && p.club) form.elements.club.value = p.club;
      }
    } else if (hit && hit.candidates) {
      note.innerHTML = `Did you mean ${hit.candidates.map((p) => `<button type="button" class="link-btn" data-action="pick-player" data-name="${esc(p.name)}">${esc(p.name)}</button>`).join(', ')}?`;
      setRegen(false);
    } else {
      note.innerHTML = '🧬 Not in my player list, so I\'ll log them as a <strong>regen</strong>. Untick below if they\'re a real player.';
      setRegen(true);
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
    const res = A.precheck(entry.challenge, trackerOf(entry), Object.assign({}, v, { id: 'preview' }));
    const breaks = res.breaks.map((b) => `<li><span>❌ <strong>${esc(b.text)}</strong></span><small>${b.details.slice(0, 3).map(esc).join(' · ')}</small></li>`).join('');
    const fixes = res.fixes.map((f) => `<li><span>✅ Completes: ${esc(f.text)}</span></li>`).join('');
    box.innerHTML = `
      <div class="verdict ${res.ok ? 'ok' : 'bad'}">
        <strong>${res.ok ? `🤖 ✅ ${v.dir === 'in' ? 'This signing fits' : 'This move fits'} your rules` : `🤖 ❌ This would break ${res.breaks.length} rule${res.breaks.length === 1 ? '' : 's'}`}</strong>
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
    const form = e.target.closest('[data-tform]');
    if (!form) return false;
    if (e.target.name === 'name' && form.dataset.dir === 'in') suggest(e.target.value);
    if (e.target.name === 'regen') e.target.dataset.touched = '1';
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => {
      updateRecognition(form, item, e.target.name === 'name');
      updatePrecheck(form, item);
    }, 120);
    return true;
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
      return true;
    }
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
    if (action === 'squad-load') {
      const real = realSquad(item.dataset.club);
      if (!real) return true;
      const t0 = trackerOf(deps.findEntry(id));
      if (t0.players.length && !root.confirm('Replace your current squad list with the real squad?')) return true;
      change(item, (t) => { t.players = realSquadPlayers(item.dataset.club, t.season); }, ['squad']);
      deps.toast(`Loaded ${real.length} players. Add their OVRs as you go.`);
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
      change(item, (t) => { t.transfers = t.transfers.filter((x) => x.id !== tid); }, ['transfers']);
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
      const bits = [
        parsed.dir === 'in' ? ({ loan: 'loan signing', free: 'free transfer', promotion: 'academy promotion' }[parsed.type] || 'signing') : ({ loan: 'loan out', release: 'release' }[parsed.type] || 'sale'),
        parsed.name || null,
        parsed.club ? `${parsed.dir === 'in' ? 'from' : 'to'} ${parsed.club}` : null,
        parsed.fee !== '' ? money(Number(parsed.fee)) : null,
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
      const v = formValues(form);
      if (!v.name) return true;
      const known = DB.recognise(v.name);
      // Unticking "regen" for someone I didn't know means they're real: remember them.
      if (v.dir === 'in' && !v.regen && v.type !== 'promotion' && !(known && known.player)) deps.rememberKnown(v.name, v.nat, v.pos);
      change(item, (t) => C.applyTransfer(t, Object.assign({ id: uid(), playerId: uid() }, v)), ['transfers', 'squad']);
      deps.toast(v.dir === 'in' ? `Signed ${v.name}${v.regen ? ' 🧬' : ''} ⬇️` : `${v.name} left ⬆️`);
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
    if (el.dataset.tracker) {
      change(item, (t) => {
        if (el.dataset.tracker === 'season') t.season = Number(el.value) || 1;
        else t.window = el.value === 'winter' ? 'winter' : 'summer';
      }, ['transfers', 'moves']);
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
      if (field === 'loanedOut') el.closest('.prow').classList.toggle('is-out', el.checked);
      return true;
    }
    return false;
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
    : `<div data-panel="transfers">${renderTransfers(entry, t)}</div>`}`;
  }

  /** A club's real squad as tracker players, aged for the given season ([] if unknown). */
  function realSquadPlayers(club, season) {
    const real = realSquad(club);
    if (!real) return [];
    const day = seasonDay(season);
    return real.map(([name, pos, dob, nat]) => ({ id: uid(), name, pos, age: DB.ageOn(dob, day), nat: C.normNat(nat) }));
  }

  function setTab(id, tab) {
    tabs[id] = tab;
  }

  FC26.trackerUI = { init, renderTracker, renderTransferCentre, realSquadPlayers, setTab, onClick, onChange, onSubmit, onInput, parseSquad, POSITIONS };
})(typeof window !== 'undefined' ? window : globalThis);
