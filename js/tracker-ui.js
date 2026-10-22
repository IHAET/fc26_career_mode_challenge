/*
 * Season tracker UI inside a saved challenge: Squad, Transfers and (Player
 * Career) Career moves tabs. Rule checking itself lives in compliance.js;
 * app.js renders the results next to each rule.
 *
 * app.js calls init() with shared helpers, renders with renderTracker(),
 * and forwards click/change events from the saved list.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const C = FC26.compliance;
  const G = FC26.generator;

  const POSITIONS = ['GK', 'RB', 'LB', 'CB', 'RWB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'];
  const IN_TYPES = [['permanent', 'Permanent'], ['loan', 'Loan'], ['free', 'Free transfer'], ['promotion', 'Academy promotion']];
  const OUT_TYPES = [['sale', 'Sale'], ['loan', 'Loan out'], ['release', 'Release']];
  const MOVE_TYPES = [['permanent', 'Transfer'], ['loan', 'Loan'], ['free', 'Free transfer']];

  let deps = null; // { esc, toast, mutateEntry, renderChallenge, refreshSummary }
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
    const real = FC26.squads && FC26.squads[entry.challenge.club.name];
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
          </span>
          <button type="button" class="icon-btn" data-action="squad-del" title="Remove from the squad" aria-label="Remove ${esc(p.name)}">✕</button>
        </div>`).join('');
    return `
      <div class="squad">
        <div class="tools">
          <button type="button" class="btn btn-small" data-action="squad-add">+ Add player</button>
          <button type="button" class="btn btn-small" data-action="squad-paste">📋 Paste squad</button>
          ${real ? `<button type="button" class="btn btn-small" data-action="squad-load">⬇️ Load ${esc(entry.challenge.club.name)} squad</button>` : ''}
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
        ${t.players.length ? `<div class="phead" aria-hidden="true"><span>Name</span><span>Pos</span><span>Age</span><span>Nationality</span><span>OVR</span><span>€K/week</span><span>⭐ 🎓 🔁 ✈️</span><span></span></div>` : ''}
        <div class="plist">${rows || '<p class="muted empty-note">No players yet. Add them one by one, or paste your whole squad.</p>'}</div>
        <p class="muted legend">⭐ starting XI · 🎓 academy graduate · 🔁 on loan at your club · ✈️ loaned out</p>
      </div>`;
  }

  function transferForm(entry, t, dir) {
    const types = dir === 'out' ? OUT_TYPES : IN_TYPES;
    const squadNames = t.players.map((p) => `<option value="${esc(p.name)}"></option>`).join('');
    return `
      <form class="tform" data-tform data-dir="${dir}" autocomplete="off">
        <div class="seg">
          <button type="button" class="${dir === 'in' ? 'is-on' : ''}" data-action="tr-dir" data-dir="in">⬇️ Signing</button>
          <button type="button" class="${dir === 'out' ? 'is-on' : ''}" data-action="tr-dir" data-dir="out">⬆️ Departure</button>
        </div>
        <div class="tgrid">
          <label class="f-wide"><span>Player</span><input name="name" type="text" maxlength="40" required ${dir === 'out' ? 'list="squad-names-' + esc(entry.id) + '"' : ''} placeholder="${dir === 'out' ? 'Pick from your squad' : 'Name'}"></label>
          ${dir === 'out' ? `<datalist id="squad-names-${esc(entry.id)}">${squadNames}</datalist>` : ''}
          <label><span>Type</span><select name="type">${opts(types)}</select></label>
          <label><span>Fee €M</span><input name="fee" type="number" min="0" step="0.1" placeholder="0"></label>
          <label class="f-wide"><span>${dir === 'out' ? 'To club' : 'From club'}</span><input name="club" type="text" maxlength="40"></label>
          ${dir === 'in' ? `
          <label><span>Pos</span><select name="pos"><option value=""></option>${opts(POSITIONS.map((x) => [x, x]))}</select></label>
          <label><span>Age</span><input name="age" type="number" min="14" max="50"></label>
          <label><span>Nationality</span><input name="nat" type="text" list="nat-list" maxlength="30"></label>
          <label><span>OVR</span><input name="ovr" type="number" min="1" max="99"></label>
          <label><span>Wage €K/w</span><input name="wage" type="number" min="0" step="0.1"></label>` : ''}
          <label><span>Season</span><select name="season">${opts(Array.from({ length: Math.max(entry.challenge.seasons, t.season) }, (_, i) => [i + 1, `S${i + 1}`]), t.season)}</select></label>
          <label><span>Window</span><select name="window">${opts([['summer', 'Summer'], ['winter', 'January']], t.window)}</select></label>
        </div>
        <button type="submit" class="btn btn-small btn-primary">${dir === 'out' ? 'Log departure' : 'Log signing'}</button>
      </form>`;
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
          ${items.map((x) => `
          <div class="trow ${x.dir}" data-tid="${esc(x.id)}">
            <span class="tdir">${x.dir === 'in' ? '⬇️' : '⬆️'}</span>
            <span class="tmain"><strong>${esc(x.name)}</strong>
              <small class="muted">${[x.pos, x.age ? `${x.age}y` : '', x.nat ? C.normNat(x.nat) : '', x.ovr ? `${x.ovr} OVR` : ''].filter(Boolean).map(esc).join(' · ')}</small></span>
            <span class="tmeta">${esc(((x.dir === 'in' ? IN_TYPES : OUT_TYPES).find(([v]) => v === x.type) || ['', x.type])[1])}${x.club ? ` · ${x.dir === 'in' ? 'from' : 'to'} ${esc(x.club)}` : ''}${n(x.fee) ? ` · <strong>${money(n(x.fee))}</strong>` : ''}</span>
            <button type="button" class="icon-btn" data-action="tr-del" title="Delete this log entry (your squad list isn't changed)" aria-label="Delete">✕</button>
          </div>`).join('')}
        </div>`;
    }).join('');
    return `
      <div class="transfers">
        ${transferForm(entry, t, 'in')}
        <p class="muted legend">Logging a signing adds the player to your squad. A sale or release removes them; a loan out marks them ✈️.</p>
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
      const real = (FC26.squads || {})[item.dataset.club];
      if (!real) return true;
      const t0 = trackerOf(deps.findEntry(id));
      if (t0.players.length && !root.confirm('Replace your current squad list with the real squad?')) return true;
      change(item, (t) => { t.players = real.players.map((p) => Object.assign({ id: uid() }, p)); }, ['squad']);
      deps.toast(`Loaded ${real.players.length} players`);
      return true;
    }
    if (action === 'tr-dir') {
      const entry = deps.findEntry(id);
      btn.closest('[data-tform]').outerHTML = transferForm(entry, trackerOf(entry), btn.dataset.dir);
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
    if (form.matches('[data-tform]')) {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form).entries());
      const dir = form.dataset.dir;
      const name = String(f.name || '').trim().slice(0, 40);
      if (!name) return true;
      change(item, (t) => {
        const squadPlayer = t.players.find((p) => p.name.trim().toLowerCase() === name.toLowerCase());
        const rec = {
          id: uid(), dir, type: f.type, name, season: Number(f.season) || t.season, window: f.window === 'winter' ? 'winter' : 'summer',
          fee: n(f.fee) || 0, club: String(f.club || '').trim().slice(0, 40),
        };
        if (dir === 'in') {
          Object.assign(rec, { pos: f.pos || '', age: n(f.age) || '', nat: C.normNat(String(f.nat || '').trim()), ovr: n(f.ovr) || '' });
          t.transfers.push(rec);
          t.players.push({
            id: uid(), name, pos: rec.pos, age: rec.age, nat: rec.nat, ovr: rec.ovr, wage: n(f.wage) || '',
            academy: rec.type === 'promotion', loanIn: rec.type === 'loan',
          });
        } else {
          // Snapshot the player's details at the time they left.
          if (squadPlayer) Object.assign(rec, { pos: squadPlayer.pos, age: squadPlayer.age, nat: squadPlayer.nat, ovr: squadPlayer.ovr });
          t.transfers.push(rec);
          if (squadPlayer) {
            if (rec.type === 'loan') squadPlayer.loanedOut = true;
            else t.players = t.players.filter((p) => p !== squadPlayer);
          }
        }
      }, ['transfers', 'squad']);
      deps.toast(dir === 'in' ? `Signed ${name} ⬇️` : `${name} left ⬆️`);
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
      }, []);
      // Forms default to "now".
      item.querySelectorAll('[data-tform] select[name=season], [data-mform] select[name=season]').forEach((s) => { if (el.dataset.tracker === 'season') s.value = el.value; });
      item.querySelectorAll('[data-tform] select[name=window]').forEach((s) => { if (el.dataset.tracker === 'window') s.value = el.value; });
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

  FC26.trackerUI = { init, renderTracker, onClick, onChange, onSubmit, parseSquad, POSITIONS };
})(typeof window !== 'undefined' ? window : globalThis);
