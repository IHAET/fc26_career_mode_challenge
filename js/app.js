/* UI for the FC 26 Career Challenge Builder. */
(function () {
  'use strict';
  const { data, modes, generator: G, daily: Daily, shareImage, compliance: Compliance, trackerUI: Tracker, playerDB: PlayerDB } = window.FC26;

  const STORE_KEY = 'fc26-challenges-v1';
  const OPTIONS_KEY = 'fc26-options-v1';
  const DAILY_KEY = 'fc26-daily-v1';
  const KNOWN_KEY = 'fc26-known-v1'; // players the user confirmed are real (not regens)
  const TC_KEY = 'fc26-transfers-challenge-v1'; // challenge picked in the Transfers section

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const state = {
    challenge: null,
    dailyKey: null, // date being viewed on the Daily tab
    dailyChallenge: null,
    locks: { club: false, archetype: false, seasons: false, difficulty: false, position: false, rules: new Set() },
    draft: null, // challenge being edited in the Builder, or null
  };

  // The Builder's starting placeholder, restored when you cancel a blank challenge.
  let EMPTY_RESULT = '';

  // ---------- Helpers ----------

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function storageGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  const toB64 = (bytes) => {
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const fromB64 = (str) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0));

  function encodeKey(obj) {
    return toB64(new TextEncoder().encode(JSON.stringify(obj)));
  }

  function decodeKey(str) {
    try {
      return JSON.parse(new TextDecoder().decode(fromB64(str)));
    } catch (e) {
      return null;
    }
  }

  // Edited challenges can't be rebuilt from a seed, so their links carry the
  // whole challenge, deflated where the browser supports it ("z"), else raw ("j").
  async function packCustom(ch) {
    const slim = Object.assign({}, ch);
    ['scoring', 'settings', 'notes', 'version', 'daily'].forEach((k) => delete slim[k]);
    const bytes = new TextEncoder().encode(JSON.stringify(slim));
    if (typeof CompressionStream === 'function') {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return 'z' + toB64(new Uint8Array(await new Response(stream).arrayBuffer()));
    }
    return 'j' + toB64(bytes);
  }

  async function unpackCustom(str) {
    if (str.length > 60000) return null;
    try {
      let bytes = fromB64(str.slice(1));
      if (str[0] === 'z') {
        if (typeof DecompressionStream !== 'function') return null;
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      } else if (str[0] !== 'j') {
        return null;
      }
      return G.sanitizeChallenge(JSON.parse(new TextDecoder().decode(bytes)));
    } catch (e) {
      return null;
    }
  }

  async function shareUrl(ch) {
    const url = new URL(window.location.href);
    url.hash = ch.custom ? 'x=' + (await packCustom(ch)) : 'c=' + encodeKey(G.toShareKey(ch));
    return url.toString();
  }

  // Identity used to spot duplicates in My Challenges.
  const challengeKey = (ch) => (ch.custom ? 'x:' + JSON.stringify(G.sanitizeChallenge(ch)) : JSON.stringify(G.toShareKey(ch)));

  // ---------- Options form ----------

  const formEl = () => $('#options');
  const currentMode = () => (formEl().elements.mode.value === 'player' ? 'player' : 'manager');

  function populateArchetypes(selected) {
    const sel = $('#opt-archetype');
    const mode = modes[currentMode()];
    sel.length = 1; // keep "Surprise me"
    mode.archetypes.forEach((a) => sel.add(new Option(`${a.icon} ${a.name}`, a.id)));
    sel.value = mode.archetypeById[selected] ? selected : 'any';
  }

  function syncMode() {
    populateArchetypes($('#opt-archetype').value);
    $$('[data-mode-only]').forEach((el) => { el.hidden = el.dataset.modeOnly !== currentMode(); });
  }

  function populateOptions() {
    modes.player.positions.forEach((pos) => $('#opt-position').add(new Option(pos.name, pos.id)));
    G.COUNTRIES.forEach((c) => $('#cc-country').add(new Option(c.name, c.name)));
    $('#cc-country').value = 'England';

    const club = $('#opt-club');
    data.leagues.forEach((l) => {
      const group = document.createElement('optgroup');
      group.label = l.name;
      l.clubs.map(([name]) => name).sort((a, b) => a.localeCompare(b)).forEach((name) => {
        group.appendChild(new Option(`${window.FC26.heritage[name] ? '🏛️ ' : ''}${name}`, `${l.id}|${name}`));
      });
      club.appendChild(group);
    });

    const league = $('#opt-league');
    data.leagues.forEach((l) => league.add(new Option(`${l.name} (${l.country})`, l.id)));

    const seasons = $('#opt-seasons');
    for (let i = 1; i <= 10; i++) seasons.add(new Option(String(i), String(i)));

    const rules = $('#opt-rules');
    for (let i = 0; i <= 6; i++) rules.add(new Option(String(i), String(i)));

    const saved = storageGet(OPTIONS_KEY, null);
    const form = formEl();
    if (saved) {
      ['mode', 'difficulty'].forEach((name) => {
        const radio = $(`input[name="${name}"][value="${saved[name]}"]`, form);
        if (radio) radio.checked = true;
      });
    }
    populateArchetypes(saved && saved.archetype);
    if (saved) {
      ['club', 'position', 'league', 'tier', 'seasons', 'ruleCount', 'ccCountry', 'ccLevel', 'ccTier'].forEach((name) => {
        const el = form.elements[name];
        if (saved[name] != null && $$('option', el).some((o) => o.value === String(saved[name]))) el.value = String(saved[name]);
      });
      ['ccName', 'ccLeague'].forEach((name) => { if (typeof saved[name] === 'string') form.elements[name].value = saved[name]; });
      form.elements.events.checked = saved.events !== false;
    }
  }

  function readOptions() {
    const f = formEl().elements;
    const custom = f.club.value === '__custom';
    const raw = {
      mode: currentMode(),
      difficulty: f.difficulty.value,
      archetype: f.archetype.value,
      position: f.position.value,
      club: f.club.value,
      league: f.league.value,
      tier: f.tier.value,
      seasons: f.seasons.value,
      ruleCount: f.ruleCount.value,
      events: f.events.checked,
      ccName: f.ccName.value,
      ccCountry: f.ccCountry.value,
      ccLevel: f.ccLevel.value,
      ccTier: f.ccTier.value,
      ccLeague: f.ccLeague.value,
    };
    storageSet(OPTIONS_KEY, raw);
    return {
      mode: raw.mode,
      difficulty: raw.difficulty,
      archetype: raw.archetype,
      position: raw.position,
      club: custom ? 'any' : raw.club,
      league: raw.league,
      tier: raw.tier,
      seasons: raw.seasons,
      ruleCount: raw.ruleCount,
      events: raw.events,
      customClub: custom ? { name: raw.ccName, country: raw.ccCountry, level: raw.ccLevel, tier: raw.ccTier, league: raw.ccLeague } : null,
    };
  }

  // League and size filters don't apply once a specific club is chosen.
  function syncClubFilters() {
    const value = $('#opt-club').value;
    const specific = value !== 'any';
    $$('#club-filters select').forEach((el) => { el.disabled = specific; });
    $('#club-filters').classList.toggle('is-disabled', specific);
    $('#custom-club').hidden = value !== '__custom';
  }

  // A typed-in club needs a name before anything can be generated for it.
  function customClubMissing(opts) {
    if ($('#opt-club').value !== '__custom' || G.normalizeCustomClub(opts.customClub)) return false;
    toast('Type your club’s name first');
    formEl().elements.ccName.focus();
    return true;
  }

  // ---------- Generating ----------

  function resetLocks() {
    state.locks = { club: false, archetype: false, seasons: false, difficulty: false, position: false, rules: new Set() };
  }

  function currentLocks() {
    const ch = state.challenge;
    const { locks } = state;
    if (!ch) return {};
    return {
      club: locks.club ? { name: ch.club.name, leagueId: ch.club.leagueId } : null,
      archetypeId: locks.archetype ? ch.archetype.id : null,
      seasons: locks.seasons ? ch.seasons : null,
      difficulty: locks.difficulty ? ch.difficulty : null,
      ruleIds: ch.rules.filter((r) => locks.rules.has(r.id)).map((r) => r.id),
      position: locks.position && ch.position ? ch.position.id : null,
      startAge: locks.position && ch.startAge ? ch.startAge : null,
    };
  }

  function generate(seed, useLocks) {
    const opts = readOptions();
    if (customClubMissing(opts)) return;
    state.draft = null;
    const locks = useLocks ? currentLocks() : {};
    state.challenge = G.generateChallenge(opts, seed || G.randomSeed(), locks);
    if (!useLocks) resetLocks();
    // Drop rule locks for rules that didn't survive (e.g. blocked by a new archetype).
    const ids = new Set(state.challenge.rules.map((r) => r.id));
    state.locks.rules.forEach((id) => { if (!ids.has(id)) state.locks.rules.delete(id); });
    renderBuilder(true);
  }

  // ---------- Rendering ----------

  const diffClass = (d) => `diff-${d}`;

  function lockBtn(target, locked, id) {
    return `<button type="button" class="icon-btn lock ${locked ? 'is-locked' : ''}" data-action="lock" data-target="${target}"${id ? ` data-id="${esc(id)}"` : ''} title="${locked ? 'Unlock' : 'Lock'}" aria-pressed="${locked}">${locked ? '🔒' : '🔓'}</button>`;
  }

  function stars(tier) {
    return '★'.repeat(tier) + '<span class="star-off">' + '★'.repeat(5 - tier) + '</span>';
  }

  const CHECK_ICON = { ok: '✅', broken: '❌', warn: '⚠️', manual: '✋' };

  function ruleCheckSummary(checks, entry) {
    const t = Compliance.tally(checks);
    const tr = Compliance.normalizeTracker(entry.tracker);
    const empty = !tr.players.length && !tr.transfers.length && !tr.moves.length;
    const where = entry.challenge.mode === 'player' ? 'Career moves' : 'Squad and Transfers';
    return `
        <div class="check-summary">
          <span class="check-pills">
            <span title="Kept">✅ ${t.ok}</span><span title="Broken">❌ ${t.broken}</span>
            <span title="Needs attention or more data">⚠️ ${t.warn}</span><span title="Can't be checked automatically: check yourself">✋ ${t.manual}</span>
          </span>
          <span class="muted">${empty
    ? `Fill in the ${where} tabs and the rules check themselves.`
    : `Checked against your ${where.toLowerCase()} for season ${tr.season}. ✋ = check yourself.`}</span>
        </div>`;
  }

  /**
   * Render a challenge card.
   * mode 'builder' shows lock/reroll controls (not for edited challenges),
   * 'saved' shows progress checkboxes and the season diary, 'daily' its own actions.
   */
  function renderCard(ch, mode, entry) {
    const builder = mode === 'builder';
    const controls = builder && !ch.custom;
    const player = ch.mode === 'player';
    const progress = (entry && entry.progress) || {};
    const log = (entry && entry.log) || {};
    const L = state.locks;
    // Saved challenges: check each rule against the tracked squad and transfers.
    const checks = mode === 'saved' ? Compliance.checkChallenge(ch, entry.tracker) : null;
    const ruleCheck = (i) => {
      const r = checks && checks[i];
      if (!r) return '';
      const more = r.details.length > 4 ? ` · +${r.details.length - 4} more` : '';
      return `<small class="rule-check s-${r.status}"><span>${CHECK_ICON[r.status]} ${esc(r.summary)}</span>${r.details.length ? `<span class="rule-details">${r.details.slice(0, 4).map(esc).join(' · ')}${more}</span>` : ''}</small>`;
    };
    const ruleClass = (i) => (checks && checks[i] ? ` s-${checks[i].status}` : '');

    const check = (key) => (mode === 'saved'
      ? `<input type="checkbox" class="obj-check" data-action="toggle" data-key="${esc(key)}" ${progress[key] ? 'checked' : ''} aria-label="Mark done">`
      : '');

    const rulesHtml = ch.coreRules.map((r, i) => `
        <li class="rule core${ruleClass(i)}"><span class="rule-tag">Core</span><span class="rule-text">${esc(r.text)}${ruleCheck(i)}</span></li>`).join('')
      + ch.rules.map((r, i) => `
        <li class="rule ${controls && L.rules.has(r.id) ? 'is-locked' : ''}${ruleClass(ch.coreRules.length + i)}">
          <span class="rule-tag cat-${esc(r.cat.toLowerCase())}">${esc(r.cat)}</span>
          <span class="rule-text">${esc(r.text)}${ruleCheck(ch.coreRules.length + i)}</span>
          ${controls ? `<span class="rule-actions">
            <button type="button" class="icon-btn" data-action="reroll-rule" data-index="${i}" title="Swap this rule">🔄</button>
            ${lockBtn('rule', L.rules.has(r.id), r.id)}
          </span>` : ''}
        </li>`).join('');

    const roadmapHtml = ch.roadmap.map((s) => `
      <li class="season">
        <div class="season-num"><span>S${s.season}</span>${s.age ? `<small>age ${Number(s.age)}</small>` : ''}</div>
        <div class="season-body">
          ${s.objectives.map((o, i) => `
            <label class="objective ${o.type}">
              ${check(`s${s.season}-${i}`)}
              <span class="obj-icon">${o.type === 'main' ? '🎯' : '➕'}</span>
              <span>${esc(o.text)}</span>
            </label>`).join('')}
          ${s.events.map((e) => `<div class="event"><span class="obj-icon">⚡</span><span>${esc(e)}</span></div>`).join('')}
          ${mode === 'saved' ? diaryRow(s.season, log[s.season] || {}) : ''}
        </div>
      </li>`).join('');

    return `
    <article class="card panel ${diffClass(ch.difficulty)}">
      <header class="card-head">
        <div class="arch-icon">${esc(ch.archetype.icon)}</div>
        <div class="card-title">
          <div class="eyebrow">
            ${ch.archetype.history && ch.archetype.typeName !== ch.archetype.name ? `${esc(ch.archetype.typeName)} · ` : ''}${esc(ch.archetype.name)}
            ${controls ? lockBtn('archetype', L.archetype) : ''}
          </div>
          <h2>${esc(ch.club.name)}</h2>
          <p class="tagline">${esc(ch.archetype.tagline)}</p>
        </div>
        <div class="badges">
          <span class="badge-row">${controls ? lockBtn('difficulty', L.difficulty) : ''}<span class="badge diff">${esc(ch.difficultyName)}</span></span>
          ${ch.custom ? '<span class="badge seed" title="Written or edited by hand">✍️ Custom</span>' : `<span class="badge seed" title="Seed">#${esc(ch.seed)}</span>`}
        </div>
      </header>

      ${ch.notes && ch.notes.length ? `<div class="notes">${ch.notes.map((n) => `<p>ℹ️ ${esc(n)}</p>`).join('')}</div>` : ''}

      <div class="facts">
        <div class="fact">
          <span class="fact-label">${player ? 'Starting club' : 'Club'} ${controls ? lockBtn('club', L.club) : ''}</span>
          <span class="fact-value">${esc(ch.club.name)}</span>
          <span class="fact-sub">${[ch.club.league, ch.club.country].filter(Boolean).map(esc).join(' · ')}</span>
        </div>
        ${player && ch.position ? `<div class="fact">
          <span class="fact-label">Position ${controls ? lockBtn('position', L.position) : ''}</span>
          <span class="fact-value">${esc(ch.position.name)}</span>
          <span class="fact-sub">starting age ${Number(ch.startAge)}</span>
        </div>` : `<div class="fact">
          <span class="fact-label">Club size</span>
          <span class="fact-value stars" title="${esc(ch.club.tierName)}">${stars(ch.club.tier)}</span>
          <span class="fact-sub">${esc(ch.club.tierName)}</span>
        </div>`}
        <div class="fact">
          <span class="fact-label">Length ${controls ? lockBtn('seasons', L.seasons) : ''}</span>
          <span class="fact-value">${ch.seasons}</span>
          <span class="fact-sub">season${ch.seasons === 1 ? '' : 's'}</span>
        </div>
      </div>

      ${ch.archetype.history
    ? `<section class="history"><h3>📖 The history</h3><p>${esc(ch.archetype.history)}</p></section>`
    : ch.archetype.desc ? `<p class="desc">${esc(ch.archetype.desc)}</p>` : ''}

      <section class="block">
        <h3>📜 Rules</h3>
        ${checks ? ruleCheckSummary(checks, entry) : ''}
        <ul class="rules">${rulesHtml}</ul>
      </section>

      <section class="block">
        <h3>🗺️ ${player ? 'Career roadmap' : 'Season roadmap'}</h3>
        <ol class="roadmap">${roadmapHtml}</ol>
      </section>

      ${ch.finalGoal ? `<section class="block final">
        <h3>🏆 Final goal</h3>
        <label class="objective final-goal">${check('final')}<span>${esc(ch.finalGoal)}</span></label>
      </section>` : ''}

      <div class="grid-2">
        <section class="block">
          <h3>💀 Fail conditions</h3>
          <ul class="plain">${ch.failConditions.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
        </section>
        <section class="block">
          <h3>⚙️ Suggested settings</h3>
          <dl class="settings">${ch.settings.map((s) => `<dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd>`).join('')}</dl>
        </section>
      </div>

      ${mode === 'saved' ? renderScore(ch, entry) : `
      <section class="block">
        <h3>🧮 Scoring</h3>
        <ul class="scoring">${ch.scoring.map((s) => `<li><span>${esc(s.label)}</span><strong class="${s.points < 0 ? 'neg' : 'pos'}">${s.points > 0 ? '+' : ''}${s.points}</strong></li>`).join('')}</ul>
      </section>`}

      <footer class="card-actions">
        ${controls ? '<button type="button" class="btn btn-primary" data-action="reroll">🎲 Reroll unlocked</button>' : ''}
        ${builder || mode === 'daily' ? '<button type="button" class="btn" data-action="track" title="Save it and open its squad and transfer tracker">📒 Track it</button>' : ''}
        ${builder ? `
          <button type="button" class="btn${ch.custom ? ' btn-primary' : ''}" data-action="save">💾 Save</button>
          <button type="button" class="btn" data-action="edit" title="Change any text, add or remove rules and seasons">✏️ Edit</button>` : ''}
        ${mode === 'daily' ? `
          <button type="button" class="btn btn-primary" data-action="save">💾 Take it on</button>
          <button type="button" class="btn" data-action="customise" title="Open in the Builder to lock and reroll parts">🛠️ Customise</button>` : ''}
        <button type="button" class="btn" data-action="copy">📋 Copy text</button>
        <button type="button" class="btn" data-action="share">🔗 Share link</button>
        <button type="button" class="btn" data-action="image" title="Save the challenge as a picture to post">🖼️ Image</button>
        ${mode === 'saved' ? '<button type="button" class="btn" data-action="open-transfers" title="Log transfers for this challenge in the Transfers section">🔁 Transfers</button>' : ''}
        ${mode === 'saved' ? '<button type="button" class="btn btn-danger" data-action="delete">🗑️ Delete</button>' : ''}
      </footer>
    </article>`;
  }

  // ---------- Season diary ----------

  const trophiesOf = (entry) => Object.values(entry.log || {}).reduce((n, l) => n + (Number(l && l.trophies) || 0), 0);

  function diaryRow(season, l) {
    return `
          <div class="diary" data-season="${season}">
            <label class="diary-field"><span>Finish</span>
              <input type="text" data-log="finish" maxlength="24" placeholder="e.g. 3rd" value="${esc(l.finish || '')}"></label>
            <div class="diary-field"><span>Trophies</span>
              <div class="stepper">
                <button type="button" class="icon-btn" data-action="log-step" data-delta="-1" aria-label="One fewer trophy">−</button>
                <strong>${Number(l.trophies) || 0}</strong>
                <button type="button" class="icon-btn" data-action="log-step" data-delta="1" aria-label="One more trophy">+</button>
              </div></div>
            <label class="diary-field grow"><span>Notes</span>
              <input type="text" data-log="notes" maxlength="200" placeholder="Big signings, best moments…" value="${esc(l.notes || '')}"></label>
          </div>`;
  }

  // Seasons with a ticked main objective or a logged finish count as played.
  function currentSeason(entry) {
    const ch = entry.challenge;
    const played = ch.roadmap.filter((s) => (entry.progress || {})[`s${s.season}-0`] || ((entry.log || {})[s.season] || {}).finish).length;
    return played >= ch.seasons ? 'Finished' : `Season ${played + 1} of ${ch.seasons}`;
  }

  function diaryText(entry) {
    const lines = ['', 'MY PROGRESS'];
    entry.challenge.roadmap.forEach((s) => {
      const l = (entry.log || {})[s.season] || {};
      const bits = [l.finish, l.trophies ? `${l.trophies} troph${l.trophies === 1 ? 'y' : 'ies'}` : '', l.notes].filter(Boolean);
      if (bits.length) lines.push(`Season ${s.season}: ${bits.join(' · ')}`);
    });
    lines.push(`Score: ${scoreFor(entry.challenge, entry)} points (${currentSeason(entry)})`);
    const t = Compliance.tally(Compliance.checkChallenge(entry.challenge, entry.tracker));
    lines.push(`Rule check: ✅ ${t.ok} kept · ❌ ${t.broken} broken · ⚠️ ${t.warn} to watch · ✋ ${t.manual} self-checked`);
    return lines.join('\n');
  }

  function scoreFor(ch, entry) {
    const p = entry.progress || {};
    const pts = Object.fromEntries(ch.scoring.map((s) => [s.label, s.points]));
    let total = 0;
    ch.roadmap.forEach((s) => s.objectives.forEach((o, i) => {
      if (p[`s${s.season}-${i}`]) total += o.type === 'main' ? pts['Main season objective'] : pts['Side objective'];
    }));
    if (p.final) total += pts['Final goal achieved'];
    total += trophiesOf(entry) * pts['Major trophy won'];
    total += (entry.breaks || 0) * pts['Rule broken'];
    return total;
  }

  function renderScore(ch, entry) {
    const rulePts = ch.scoring.find((s) => s.label === 'Rule broken').points;
    return `
      <section class="block scoreboard">
        <h3>🧮 Scoreboard</h3>
        <div class="score-row">
          <div class="counter">
            <span>🏆 Trophies (+15 each)</span>
            <div><strong data-score="trophies">${trophiesOf(entry)}</strong><small class="muted">from the season diary</small></div>
          </div>
          <div class="counter">
            <span>🚫 Rules broken (${rulePts})</span>
            <div><button type="button" class="icon-btn" data-action="count" data-field="breaks" data-delta="-1">−</button>
            <strong>${entry.breaks || 0}</strong>
            <button type="button" class="icon-btn" data-action="count" data-field="breaks" data-delta="1">+</button></div>
          </div>
          <div class="counter total"><span>Total score</span><strong data-score="total">${scoreFor(ch, entry)}</strong></div>
        </div>
      </section>`;
  }

  // Grow a text box to fit its contents, so long objectives aren't clipped.
  function autosize(el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }

  function renderBuilder(scroll) {
    const el = $('#result');
    el.innerHTML = state.draft ? renderEditor(state.draft) : renderCard(state.challenge, 'builder');
    if (state.draft) $$('textarea', el).forEach(autosize);
    if (scroll && window.innerWidth < 900) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Editor ----------

  const clone = (x) => JSON.parse(JSON.stringify(x));

  function getParent(obj, path) {
    const parts = path.split('.');
    const last = parts.pop();
    return { parent: parts.reduce((o, k) => (o == null ? o : o[k]), obj), key: last };
  }

  function setPath(obj, path, value) {
    const { parent, key } = getParent(obj, path);
    if (parent != null) parent[key] = value;
  }

  function renderEditor(d) {
    const player = d.mode === 'player';
    const input = (path, value, placeholder, max = 120) => `<input type="text" data-path="${path}" maxlength="${max}" value="${esc(value || '')}" placeholder="${esc(placeholder)}">`;
    const area = (path, value, placeholder, max = 400, rows = 2) => `<textarea data-path="${path}" maxlength="${max}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(value || '')}</textarea>`;
    const row = (path, value, placeholder, removable = true) => `
          <div class="edit-row">${area(path, value, placeholder, 400, 1)}${removable ? `<button type="button" class="icon-btn" data-edit="remove" data-path="${path}" title="Remove" aria-label="Remove">✕</button>` : ''}</div>`;
    const ruleList = (key, label, addLabel, placeholder) => `
        <section class="edit-block">
          <h3>${label}</h3>
          ${d[key].map((r, i) => row(`${key}.${i}.text`, r.text, placeholder)).join('')}
          <button type="button" class="btn btn-small" data-edit="add-${key}">+ ${addLabel}</button>
        </section>`;

    const seasons = d.roadmap.map((s, si) => `
          <div class="edit-season">
            <div class="edit-season-head"><strong>Season ${si + 1}</strong>${s.age ? `<small class="muted">age ${Number(s.age)}</small>` : ''}</div>
            ${s.objectives.map((o, oi) => row(`roadmap.${si}.objectives.${oi}.text`, o.text, o.type === 'main' ? 'Main objective, e.g. Win promotion' : 'Side objective', oi > 0)).join('')}
            ${s.events.map((e, ei) => `<div class="edit-row event-row"><span class="obj-icon">⚡</span>${area(`roadmap.${si}.events.${ei}`, e, 'Random event', 300, 1)}<button type="button" class="icon-btn" data-edit="remove" data-path="roadmap.${si}.events.${ei}" title="Remove" aria-label="Remove">✕</button></div>`).join('')}
            <div class="edit-inline">
              <button type="button" class="btn btn-small" data-edit="add-side" data-season="${si}">+ Side objective</button>
              <button type="button" class="btn btn-small" data-edit="add-event" data-season="${si}">+ Event</button>
            </div>
          </div>`).join('');

    return `
    <article class="card panel editor diff-${Number(d.difficulty) || 2}">
      <header class="editor-head">
        <h2>✏️ ${d.archetype.id === 'custom' && !d.archetype.history && !d.finalGoal ? 'Write your own challenge' : 'Edit challenge'}</h2>
        <p class="muted">Change any text, add or remove rules and seasons, then press <strong>Done</strong>. Edited challenges share as a link that carries everything.</p>
      </header>

      <div class="edit-grid">
        <label class="edit-field"><span>Challenge name</span>${input('archetype.name', d.archetype.name, 'e.g. The Long Climb', 60)}</label>
        <label class="edit-field icon-field"><span>Icon</span>${input('archetype.icon', d.archetype.icon, '✍️', 8)}</label>
        <label class="edit-field"><span>${player ? 'Starting club' : 'Club'}</span>${input('club.name', d.club.name, 'Club name', 40)}</label>
        <label class="edit-field"><span>Difficulty</span>
          <select data-path="difficulty">${data.difficulties.map((x) => `<option value="${x.level}" ${Number(d.difficulty) === x.level ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
        ${player ? `
        <label class="edit-field"><span>Position</span>
          <select data-path="position.id">${modes.player.positions.map((pos) => `<option value="${pos.id}" ${d.position && d.position.id === pos.id ? 'selected' : ''}>${esc(pos.name)}</option>`).join('')}</select></label>
        <label class="edit-field"><span>Starting age</span><input type="number" min="15" max="40" data-path="startAge" value="${Number(d.startAge) || 17}"></label>` : ''}
        <label class="edit-field wide"><span>Tagline</span>${input('archetype.tagline', d.archetype.tagline, 'A one-line hook', 160)}</label>
        <label class="edit-field wide"><span>Story or club history <small>(optional)</small></span>${area('archetype.history', d.archetype.history, 'Why this challenge? Real club history makes the best ones.', 1200, 3)}</label>
      </div>

      ${ruleList('coreRules', '📜 Core rules', 'Core rule', 'e.g. Only sign players from your own country.')}
      ${ruleList('rules', '➕ Extra rules', 'Extra rule', 'e.g. No loan signings.')}

      <section class="edit-block">
        <h3>🗺️ ${player ? 'Career roadmap' : 'Season roadmap'}</h3>
        ${seasons}
        <div class="edit-inline">
          <button type="button" class="btn btn-small" data-edit="add-season">+ Add season</button>
          ${d.roadmap.length > 1 ? '<button type="button" class="btn btn-small" data-edit="remove-season">− Remove last season</button>' : ''}
        </div>
      </section>

      <section class="edit-block">
        <h3>🏆 Final goal</h3>
        ${area('finalGoal', d.finalGoal, 'e.g. Win the league with an all-academy XI.', 400, 2)}
      </section>

      <footer class="card-actions">
        <button type="button" class="btn btn-primary" data-edit="done">✅ Done</button>
        <button type="button" class="btn" data-edit="cancel">Cancel</button>
      </footer>
    </article>`;
  }

  function startEdit(ch) {
    state.draft = clone(ch);
    renderBuilder(true);
  }

  function blankChallenge() {
    const opts = readOptions();
    const player = opts.mode === 'player';
    const custom = G.normalizeCustomClub(opts.customClub);
    const picked = opts.club !== 'any' && G.CLUBS.find((c) => `${c.leagueId}|${c.name}` === opts.club);
    const club = custom ? G.buildCustomClub(custom) : picked || null;
    const d = opts.difficulty === 'random' ? 2 : Number(opts.difficulty);
    const startAge = 17;
    const ch = {
      mode: opts.mode,
      custom: true,
      seed: 'custom',
      options: opts,
      difficulty: d,
      archetype: { id: 'custom', name: 'My Challenge', icon: '✍️', tagline: '', desc: '', history: '' },
      club: club
        ? { name: club.name, league: club.league, leagueId: club.leagueId, country: club.country, nationality: club.nationality, tier: club.tier }
        : { name: '', league: '', country: '', tier: 3 },
      coreRules: [{ text: '' }],
      rules: [],
      roadmap: [1, 2, 3].map((s) => Object.assign({ season: s, objectives: [{ text: '', type: 'main' }], events: [] }, player ? { age: startAge + s - 1 } : {})),
      finalGoal: '',
    };
    if (player) {
      const pos = modes.player.positions.find((x) => x.id === opts.position) || modes.player.positions[5];
      Object.assign(ch, { position: { id: pos.id, name: pos.name }, startAge });
    }
    return ch;
  }

  function finishEdit() {
    const d = state.draft;
    if (d.mode === 'player') {
      const age = Number(d.startAge) || 17;
      d.roadmap.forEach((s, i) => { s.age = age + i; });
      const pos = modes.player.positions.find((x) => x.id === (d.position && d.position.id));
      if (pos) d.position = { id: pos.id, name: pos.name };
    }
    const name = (d.archetype.name || '').trim() || 'My Challenge';
    const club = (d.club.name || '').trim() || 'Your club';
    d.title = d.mode === 'player' && d.position ? `${name}: ${d.position.name} at ${club}` : `${name}: ${club}`;
    d.archetype.typeName = name;
    const ch = G.sanitizeChallenge(d);
    if (!ch.coreRules.length && !ch.rules.length && !ch.finalGoal) {
      toast('Add at least one rule or a final goal first');
      return;
    }
    state.challenge = ch;
    state.draft = null;
    resetLocks();
    renderBuilder();
    toast('Challenge updated ✍️');
  }

  function onEditorInput(e) {
    const el = e.target.closest('[data-path]');
    if (!el || !state.draft) return;
    setPath(state.draft, el.dataset.path, el.value);
    if (el.tagName === 'TEXTAREA') autosize(el);
  }

  function onEditorClick(btn) {
    const d = state.draft;
    const act = btn.dataset.edit;
    const si = Number(btn.dataset.season);
    if (act === 'done') return finishEdit();
    if (act === 'cancel') {
      state.draft = null;
      if (state.challenge) renderBuilder();
      else $('#result').innerHTML = EMPTY_RESULT;
      return undefined;
    }
    if (act === 'add-coreRules') d.coreRules.push({ text: '' });
    else if (act === 'add-rules') d.rules.push({ id: `custom-${Date.now().toString(36)}`, cat: 'Custom', text: '' });
    else if (act === 'add-side') d.roadmap[si].objectives.push({ text: '', type: 'side' });
    else if (act === 'add-event') d.roadmap[si].events.push('');
    else if (act === 'add-season') {
      const last = d.roadmap[d.roadmap.length - 1];
      if (d.roadmap.length >= 15) return toast('15 seasons is the maximum');
      d.roadmap.push(Object.assign({ season: d.roadmap.length + 1, objectives: [{ text: '', type: 'main' }], events: [] }, last && last.age ? { age: last.age + 1 } : {}));
    } else if (act === 'remove-season') d.roadmap.pop();
    else if (act === 'remove') {
      // "rules.2.text" removes rules[2]; "roadmap.0.events.1" removes that event.
      const path = btn.dataset.path.replace(/\.text$/, '');
      const { parent, key } = getParent(d, path);
      if (Array.isArray(parent)) parent.splice(Number(key), 1);
    }
    renderBuilder();
    return undefined;
  }

  // ---------- Image export ----------

  // Where the challenge came from, printed at the bottom of the image.
  function siteLabel() {
    if (!/^https?:$/.test(window.location.protocol)) return '';
    return (window.location.host + window.location.pathname).replace(/\/index\.html$/, '').replace(/\/$/, '');
  }

  async function exportImage(ch) {
    try {
      const result = await shareImage.exportImage(ch, siteLabel());
      if (result === 'downloaded') toast('Image saved 🖼️');
    } catch (e) {
      toast("Couldn't create the image in this browser");
    }
  }

  // ---------- Saved challenges ----------

  // Older saves kept one trophy counter for the whole challenge; it now lives in season 1 of the diary.
  function migrateEntry(e) {
    if (e.trophies > 0) {
      e.log = e.log || {};
      e.log[1] = Object.assign({}, e.log[1], { trophies: (Number((e.log[1] || {}).trophies) || 0) + e.trophies });
    }
    delete e.trophies;
    e.tracker = Compliance.normalizeTracker(e.tracker);
    return e;
  }

  const loadSaved = () => {
    const list = storageGet(STORE_KEY, []);
    return (Array.isArray(list) ? list : []).filter((e) => e && e.challenge && e.id).map(migrateEntry);
  };
  const writeSaved = (list) => storageSet(STORE_KEY, list);

  function progressOf(entry) {
    const ch = entry.challenge;
    const total = ch.roadmap.reduce((n, s) => n + s.objectives.length, 0) + 1;
    const done = Object.values(entry.progress || {}).filter(Boolean).length;
    return { done: Math.min(done, total), total };
  }

  function renderSaved(openId) {
    const list = loadSaved();
    $('#saved-count').textContent = list.length;
    const el = $('#saved-list');
    if (!list.length) {
      el.innerHTML = '<div class="panel empty"><div class="empty-ball">📂</div><h2>No saved challenges yet</h2><p>Generate one in the Builder and hit 💾 Save.</p></div>';
      return;
    }
    el.innerHTML = list.map((entry) => {
      const ch = entry.challenge;
      const { done, total } = progressOf(entry);
      const pct = Math.round((done / total) * 100);
      return `
      <details class="saved-item panel" data-id="${esc(entry.id)}" data-club="${esc(ch.club.name)}" ${entry.id === openId ? 'open' : ''}>
        <summary>${savedSummary(entry)}</summary>
        <div class="saved-body">${Tracker.renderTracker(entry, renderCard(ch, 'saved', entry))}</div>
      </details>`;
    }).join('');
  }

  function savedSummary(entry) {
    const ch = entry.challenge;
    const { done, total } = progressOf(entry);
    const pct = Math.round((done / total) * 100);
    const broken = Compliance.tally(Compliance.checkChallenge(ch, entry.tracker)).broken;
    const tags = [
      broken ? `<span class="neg">❌ ${broken} rule${broken === 1 ? '' : 's'} broken</span>` : '',
      ch.daily ? `📅 Daily #${Number(ch.daily.number) || ''}` : '',
      ch.mode === 'player' ? '⚽ Player' : '',
      ch.custom ? '✍️ Custom' : '',
      esc(ch.difficultyName),
      `saved ${esc(new Date(entry.savedAt).toLocaleDateString())}`,
    ].filter(Boolean).join(' · ');
    return `
          <span class="arch-icon small">${esc(ch.archetype.icon)}</span>
          <span class="saved-title">
            <strong>${esc(ch.title)}</strong>
            <small>${tags}</small>
          </span>
          <span class="progress" title="${done}/${total} objectives">
            <span class="progress-bar"><span style="width:${pct}%"></span></span>
            <small>${esc(currentSeason(entry))} · ${scoreFor(ch, entry)} pts</small>
          </span>`;
  }

  function findEntry(id) {
    return loadSaved().find((x) => x.id === id) || null;
  }

  function mutateEntry(id, fn) {
    const list = loadSaved();
    const entry = list.find((x) => x.id === id);
    if (!entry) return null;
    fn(entry);
    writeSaved(list);
    return entry;
  }

  // After a tracker change: re-check the rules (Challenge tab) and the summary row, leaving the edited panel alone.
  function refreshSavedItem(item, entry) {
    if (item.id === 'tc-body') {
      refreshTransfersHeader(entry);
      return;
    }
    const panel = $('[data-panel="challenge"]', item);
    if (panel) panel.innerHTML = renderCard(entry.challenge, 'saved', entry);
    $('summary', item).innerHTML = savedSummary(entry);
  }

  // Diary text fields save without re-rendering, so typing isn't interrupted.
  function onSavedChange(e) {
    const tItem = e.target.closest('.saved-item');
    if (tItem && Tracker.onChange(e, tItem)) return;
    const input = e.target.closest('[data-log]');
    const item = input && input.closest('.saved-item');
    if (!item) return;
    const season = Number(input.closest('.diary').dataset.season);
    const list = loadSaved();
    const entry = list.find((x) => x.id === item.dataset.id);
    if (!entry) return;
    entry.log = entry.log || {};
    entry.log[season] = Object.assign({}, entry.log[season], { [input.dataset.log]: input.value.trim().slice(0, 200) });
    writeSaved(list);
    $('summary', item).innerHTML = savedSummary(entry);
  }

  /** Save a challenge (unless it's already saved). Returns its id, or null if storage failed. */
  function saveChallenge(ch, quiet) {
    const list = loadSaved();
    const key = challengeKey(ch);
    const existing = list.find((e) => challengeKey(e.challenge) === key);
    if (existing) {
      if (!quiet) toast('Already in My Challenges');
      return existing.id;
    }
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    list.unshift({ id, savedAt: Date.now(), challenge: ch, progress: {}, log: {}, breaks: 0, tracker: Compliance.emptyTracker() });
    if (writeSaved(list)) {
      $('#saved-count').textContent = list.length;
      if (!quiet) toast('Saved to My Challenges 💾');
      return id;
    }
    toast("Couldn't save — browser storage is unavailable");
    return null;
  }

  // Save (if needed) and open the challenge's tracker on its Squad / Career moves tab.
  function trackChallenge(ch) {
    const id = saveChallenge(ch, true);
    if (!id) return;
    // Start from the club's real squad if we have it and nothing's been entered yet.
    let loaded = 0;
    if (ch.mode !== 'player') {
      mutateEntry(id, (e) => {
        e.tracker = Compliance.normalizeTracker(e.tracker);
        if (!e.tracker.players.length) {
          // Only auto-load lists that look like a real squad; thinner ones stay a button press away.
          e.tracker.players = Tracker.realSquadPlayers(ch.club.name, e.tracker.season, 11);
          loaded = e.tracker.players.filter((p) => !p.loanedOut).length;
        }
      });
    }
    Tracker.setTab(id, ch.mode === 'player' ? 'moves' : 'squad');
    storageSet(TC_KEY, id);
    showView('saved', id);
    const item = $(`.saved-item[data-id="${CSS.escape(id)}"]`);
    if (item) item.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast(loaded ? `Tracking this challenge 📒 Loaded ${loaded} real players: add their OVRs as you go.` : 'Tracking this challenge 📒');
  }

  // ---------- Transfers section ----------

  function renderTransfersView() {
    const list = loadSaved();
    const picker = $('#tc-challenge');
    const body = $('#tc-body');
    if (!list.length) {
      picker.innerHTML = '';
      picker.disabled = true;
      body.removeAttribute('data-id');
      body.innerHTML = `<div class="empty"><div class="empty-ball">🔁</div><h2>No challenge to log for yet</h2><p>Transfers belong to a challenge. Generate one in the Builder and press 📒 Track it.</p>
        <button type="button" class="btn btn-primary" data-goto="builder">Go to the Builder</button></div>`;
      return;
    }
    let id = storageGet(TC_KEY, null);
    if (!list.some((e) => e.id === id)) id = list[0].id;
    picker.disabled = false;
    picker.innerHTML = list.map((e) => `<option value="${esc(e.id)}" ${e.id === id ? 'selected' : ''}>${esc(e.challenge.archetype.icon)} ${esc(e.challenge.title)}${e.challenge.mode === 'player' ? ' (Player Career)' : ''}</option>`).join('');
    const entry = list.find((e) => e.id === id);
    body.dataset.id = id;
    body.dataset.club = entry.challenge.club.name;
    body.innerHTML = Tracker.renderTransferCentre(entry);
    refreshTransfersHeader(entry);
  }

  function refreshTransfersHeader(entry) {
    const t = Compliance.tally(Compliance.checkChallenge(entry.challenge, entry.tracker));
    $('#tc-status').innerHTML = `${esc(entry.challenge.difficultyName)} · ${entry.challenge.seasons} seasons ·
      <span class="check-pills"><span title="Kept">✅ ${t.ok}</span><span title="Broken">❌ ${t.broken}</span><span title="Needs attention">⚠️ ${t.warn}</span><span title="Check yourself">✋ ${t.manual}</span></span>`;
  }

  function rememberKnown(name, nat, pos) {
    PlayerDB.addKnown(name, nat, pos);
    const list = storageGet(KNOWN_KEY, []);
    if (!Array.isArray(list) || list.some((x) => x && x.name === name)) return;
    list.push({ name, nat: nat || '', pos: pos || '' });
    storageSet(KNOWN_KEY, list.slice(-500));
  }

  function updateEntry(id, fn) {
    const list = loadSaved();
    const entry = list.find((e) => e.id === id);
    if (!entry) return;
    fn(entry);
    writeSaved(list);
    renderSaved(id);
  }

  // ---------- Events ----------

  function showView(view, openId) {
    $$('.tab').forEach((t) => {
      const active = t.dataset.view === view;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
    $('#view-builder').hidden = view !== 'builder';
    $('#view-daily').hidden = view !== 'daily';
    $('#view-saved').hidden = view !== 'saved';
    $('#view-transfers').hidden = view !== 'transfers';
    if (view === 'saved') renderSaved(openId);
    if (view === 'transfers') renderTransfersView();
    if (view === 'daily') renderDaily(state.dailyKey || Daily.dateKey());
    // Keep #daily in the address bar so the tab can be bookmarked or linked.
    const hash = window.location.hash;
    if (view === 'daily' && hash !== '#daily') history.replaceState(null, '', '#daily');
    if (view !== 'daily' && hash === '#daily') history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  // ---------- Daily challenge ----------

  const loadCheckins = () => {
    const stored = storageGet(DAILY_KEY, null);
    return stored && Array.isArray(stored.days) ? stored.days.filter(Daily.isKey) : [];
  };

  function checkIn(key) {
    const days = loadCheckins();
    if (days.includes(key)) return;
    days.push(key);
    storageSet(DAILY_KEY, { days: days.sort().slice(-400) });
  }

  function formatDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function formatCountdown(ms) {
    const mins = Math.max(1, Math.ceil(ms / 60000));
    const h = Math.floor(mins / 60);
    return h ? `${h}h ${mins % 60}m` : `${mins}m`;
  }

  function syncDailyDot() {
    const { checkedInToday } = Daily.streak(loadCheckins(), Daily.dateKey());
    $('#daily-dot').hidden = checkedInToday;
  }

  function renderDaily(key) {
    const today = Daily.dateKey();
    if (!Daily.isKey(key) || key > today || Daily.number(key) < 1) key = today;
    const isToday = key === today;
    if (isToday) checkIn(today);
    if (!state.dailyChallenge || state.dailyKey !== key) state.dailyChallenge = Daily.challenge(key);
    state.dailyKey = key;

    const days = loadCheckins();
    const { current, best } = Daily.streak(days, today);
    const set = new Set(days);
    const week = Array.from({ length: 7 }, (_, i) => Daily.shiftKey(today, i - 6)).map((k) => {
      const [y, m, d] = k.split('-').map(Number);
      const label = new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'narrow' });
      return `<span class="day ${set.has(k) ? 'is-done' : ''} ${k === today ? 'is-today' : ''}" title="${esc(formatDate(k))}">${esc(label)}</span>`;
    }).join('');

    $('#daily-head').innerHTML = `
      <div class="daily-title">
        <span class="eyebrow-plain">📅 Daily Challenge #${Daily.number(key)}</span>
        <h2>${esc(formatDate(key))}</h2>
        <p class="muted">${isToday
    ? `Same challenge for everyone today. Next one in <strong id="daily-countdown">${formatCountdown(Daily.msUntilTomorrow())}</strong>.`
    : 'A past daily challenge. Browse back, or jump to today.'}</p>
        <div class="daily-nav">
          <button type="button" class="btn" data-day="-1" ${Daily.number(key) <= 1 ? 'disabled' : ''} aria-label="Previous day">‹ Previous</button>
          <button type="button" class="btn" data-day="today" ${isToday ? 'disabled' : ''}>Today</button>
          <button type="button" class="btn" data-day="1" ${isToday ? 'disabled' : ''} aria-label="Next day">Next ›</button>
        </div>
      </div>
      <div class="streak" title="Days in a row you've checked the daily challenge">
        <div class="streak-num"><span class="flame">🔥</span><strong>${current}</strong></div>
        <div class="streak-label">day streak<br><small>best ${best}</small></div>
        <div class="week">${week}</div>
      </div>`;
    $('#daily-card').innerHTML = renderCard(state.dailyChallenge, 'daily');
    syncDailyDot();
  }

  function onDailyClick(e) {
    const nav = e.target.closest('[data-day]');
    if (nav) {
      const step = nav.dataset.day;
      renderDaily(step === 'today' ? Daily.dateKey() : Daily.shiftKey(state.dailyKey, Number(step)));
      return;
    }
    const btn = e.target.closest('[data-action]');
    const ch = state.dailyChallenge;
    if (!btn || !ch) return;
    const { action } = btn.dataset;
    if (action === 'save') {
      saveChallenge(ch);
    } else if (action === 'track') {
      trackChallenge(ch);
    } else if (action === 'customise') {
      // Open in the Builder with everything locked, so the player can unlock and reroll parts.
      state.challenge = ch;
      state.draft = null;
      state.locks = { club: true, archetype: true, seasons: true, difficulty: true, position: true, rules: new Set(ch.rules.map((r) => r.id)) };
      showView('builder');
      renderBuilder(true);
      toast('Everything is locked. Unlock the parts you want to change, then reroll.');
    } else if (action === 'image') {
      exportImage(ch);
    } else if (action === 'copy') {
      copyText(G.challengeToText(ch)).then((ok) => toast(ok ? 'Copied to clipboard 📋' : 'Copy failed'));
    } else if (action === 'share') {
      shareChallenge(ch);
    }
  }

  // Refresh the countdown, and roll over to the new challenge at midnight.
  function tickDaily() {
    if ($('#view-daily').hidden) {
      syncDailyDot();
      return;
    }
    const today = Daily.dateKey();
    if (state.dailyKey && state.dailyKey === Daily.shiftKey(today, -1)) {
      renderDaily(today);
      return;
    }
    const el = $('#daily-countdown');
    if (el) el.textContent = formatCountdown(Daily.msUntilTomorrow());
  }

  async function shareChallenge(ch) {
    // A link to a file on this device is useless to anyone else.
    if (window.location.protocol === 'file:') {
      const ok = await copyText(G.challengeToText(ch));
      toast(ok ? 'Share links need the hosted version, so the challenge text was copied instead 📋' : 'Share links need the hosted version');
      return;
    }
    const url = await shareUrl(ch);
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: ch.title, text: `FC 26 career challenge: ${ch.title}`, url });
        return;
      } catch (e) { /* fall back to copying */ }
    }
    toast((await copyText(url)) ? 'Share link copied 🔗' : url);
  }

  function onBuilderClick(e) {
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn && state.draft) {
      onEditorClick(editBtn);
      return;
    }
    const btn = e.target.closest('[data-action]');
    if (!btn || !state.challenge) return;
    const { action } = btn.dataset;
    const L = state.locks;
    if (action === 'lock') {
      const t = btn.dataset.target;
      if (t === 'rule') {
        if (L.rules.has(btn.dataset.id)) L.rules.delete(btn.dataset.id);
        else L.rules.add(btn.dataset.id);
      } else {
        L[t] = !L[t];
      }
      renderBuilder();
    } else if (action === 'reroll') {
      generate(G.randomSeed(), true);
    } else if (action === 'reroll-rule') {
      const i = Number(btn.dataset.index);
      const oldId = state.challenge.rules[i].id;
      const next = G.rerollRule(state.challenge, i);
      if (next.rules[i].id === oldId) {
        toast('No other rule fits here');
        return;
      }
      L.rules.delete(oldId);
      state.challenge = next;
      renderBuilder();
    } else if (action === 'save') {
      saveChallenge(state.challenge);
    } else if (action === 'track') {
      trackChallenge(state.challenge);
    } else if (action === 'edit') {
      startEdit(state.challenge);
    } else if (action === 'image') {
      exportImage(state.challenge);
    } else if (action === 'copy') {
      copyText(G.challengeToText(state.challenge)).then((ok) => toast(ok ? 'Copied to clipboard 📋' : 'Copy failed'));
    } else if (action === 'share') {
      shareChallenge(state.challenge);
    }
  }

  function onSavedClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const item = btn.closest('.saved-item');
    if (!item) return;
    if (Tracker.onClick(e, item)) return;
    const { id } = item.dataset;
    const entry = loadSaved().find((x) => x.id === id);
    if (!entry) return;
    const { action } = btn.dataset;
    if (action === 'toggle') {
      updateEntry(id, (en) => {
        en.progress = en.progress || {};
        en.progress[btn.dataset.key] = btn.checked;
      });
    } else if (action === 'count') {
      updateEntry(id, (en) => {
        const f = btn.dataset.field;
        en[f] = Math.max(0, (en[f] || 0) + Number(btn.dataset.delta));
      });
    } else if (action === 'log-step') {
      const season = Number(btn.closest('.diary').dataset.season);
      updateEntry(id, (en) => {
        en.log = en.log || {};
        const l = Object.assign({}, en.log[season]);
        l.trophies = Math.min(20, Math.max(0, (Number(l.trophies) || 0) + Number(btn.dataset.delta)));
        en.log[season] = l;
      });
    } else if (action === 'image') {
      exportImage(entry.challenge);
    } else if (action === 'open-transfers') {
      storageSet(TC_KEY, id);
      showView('transfers');
    } else if (action === 'delete') {
      if (window.confirm(`Delete "${entry.challenge.title}"?`)) {
        writeSaved(loadSaved().filter((x) => x.id !== id));
        renderSaved();
        toast('Challenge deleted');
      }
    } else if (action === 'copy') {
      copyText(G.challengeToText(entry.challenge) + '\n' + diaryText(entry)).then((ok) => toast(ok ? 'Copied with your progress 📋' : 'Copy failed'));
    } else if (action === 'share') {
      shareChallenge(entry.challenge);
    }
  }

  async function loadFromHash() {
    const m = window.location.hash.match(/^#([cx])=([A-Za-z0-9_-]+)$/);
    if (!m) return false;
    let ch = null;
    if (m[1] === 'c') {
      const key = decodeKey(m[2]);
      ch = key && G.fromShareKey(key);
    } else {
      ch = await unpackCustom(m[2]);
    }
    if (!ch) {
      toast("That share link couldn't be read");
      return false;
    }
    state.challenge = ch;
    state.draft = null;
    resetLocks();
    showView('builder');
    renderBuilder();
    toast('Loaded shared challenge');
    return true;
  }

  function init() {
    EMPTY_RESULT = $('#result').innerHTML;
    populateOptions();
    syncMode();
    syncClubFilters();
    $('#opt-club').addEventListener('change', syncClubFilters);
    $$('input[name="mode"]').forEach((el) => el.addEventListener('change', syncMode));
    $('#write-own').addEventListener('click', () => {
      const opts = readOptions();
      if (customClubMissing(opts)) return;
      startEdit(blankChallenge());
    });
    $('#result').addEventListener('input', onEditorInput);
    $('#result').addEventListener('change', onEditorInput);
    $('#saved-list').addEventListener('change', onSavedChange);
    $('#saved-list').addEventListener('submit', (e) => {
      const item = e.target.closest('.saved-item');
      if (item) Tracker.onSubmit(e, item);
    });
    Tracker.init({ esc, toast, mutateEntry, findEntry, refresh: refreshSavedItem, rememberKnown });
    const known = storageGet(KNOWN_KEY, []);
    if (Array.isArray(known)) known.forEach((x) => x && x.name && PlayerDB.addKnown(x.name, x.nat, x.pos));
    $('#saved-list').addEventListener('input', (e) => {
      const item = e.target.closest('.saved-item');
      if (item) Tracker.onInput(e, item);
    });
    // The Transfers section uses the same tracker handlers as a saved challenge.
    const tc = $('#tc-body');
    tc.addEventListener('click', (e) => {
      const go = e.target.closest('[data-goto]');
      if (go) return showView(go.dataset.goto);
      if (tc.dataset.id) Tracker.onClick(e, tc);
      return undefined;
    });
    tc.addEventListener('change', (e) => { if (tc.dataset.id) Tracker.onChange(e, tc); });
    tc.addEventListener('input', (e) => { if (tc.dataset.id) Tracker.onInput(e, tc); });
    tc.addEventListener('submit', (e) => { if (tc.dataset.id) Tracker.onSubmit(e, tc); });
    $('#tc-challenge').addEventListener('change', (e) => {
      storageSet(TC_KEY, e.target.value);
      renderTransfersView();
    });
    const natList = $('#nat-list');
    Compliance.NATIONALITIES.forEach((nat) => natList.appendChild(new Option(nat)));
    $('#options').addEventListener('submit', (e) => {
      e.preventDefault();
      const seed = $('#opt-seed').value.trim();
      generate(seed || null, false);
      if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
    });
    $('#result').addEventListener('click', onBuilderClick);
    $('#saved-list').addEventListener('click', onSavedClick);
    $('#view-daily').addEventListener('click', onDailyClick);
    $$('.tab').forEach((t) => t.addEventListener('click', () => showView(t.dataset.view)));
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#daily') showView('daily');
      else loadFromHash();
    });
    $('#saved-count').textContent = loadSaved().length;
    syncDailyDot();
    setInterval(tickDaily, 30000);
    if (window.location.hash === '#daily') showView('daily');
    else loadFromHash();
  }

  init();
})();
