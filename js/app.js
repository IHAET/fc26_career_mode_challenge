/* UI for the FC 26 Career Challenge Builder. */
(function () {
  'use strict';
  const { data, content, generator: G, daily: Daily } = window.FC26;

  const STORE_KEY = 'fc26-challenges-v1';
  const OPTIONS_KEY = 'fc26-options-v1';
  const DAILY_KEY = 'fc26-daily-v1';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const state = {
    challenge: null,
    dailyKey: null, // date being viewed on the Daily tab
    dailyChallenge: null,
    locks: { club: false, archetype: false, seasons: false, difficulty: false, rules: new Set() },
  };

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

  function encodeKey(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeKey(str) {
    try {
      const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
      const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      return null;
    }
  }

  function shareUrl(ch) {
    const url = new URL(window.location.href);
    url.hash = 'c=' + encodeKey(G.toShareKey(ch));
    return url.toString();
  }

  // ---------- Options form ----------

  function populateOptions() {
    const arch = $('#opt-archetype');
    content.archetypes.forEach((a) => arch.add(new Option(`${a.icon} ${a.name}`, a.id)));

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
    if (saved) {
      const form = $('#options');
      ['archetype', 'club', 'league', 'tier', 'seasons', 'ruleCount'].forEach((name) => {
        const el = form.elements[name];
        if (saved[name] != null && $$('option', el).some((o) => o.value === String(saved[name]))) el.value = String(saved[name]);
      });
      const radio = $(`input[name="difficulty"][value="${saved.difficulty}"]`, form);
      if (radio) radio.checked = true;
      form.elements.events.checked = saved.events !== false;
    }
  }

  function readOptions() {
    const form = $('#options');
    const opts = {
      difficulty: form.elements.difficulty.value,
      archetype: form.elements.archetype.value,
      club: form.elements.club.value,
      league: form.elements.league.value,
      tier: form.elements.tier.value,
      seasons: form.elements.seasons.value,
      ruleCount: form.elements.ruleCount.value,
      events: form.elements.events.checked,
    };
    storageSet(OPTIONS_KEY, opts);
    return opts;
  }

  // League and size filters don't apply once a specific club is chosen.
  function syncClubFilters() {
    const specific = $('#opt-club').value !== 'any';
    $$('#club-filters select').forEach((el) => { el.disabled = specific; });
    $('#club-filters').classList.toggle('is-disabled', specific);
  }

  // ---------- Generating ----------

  function resetLocks() {
    state.locks = { club: false, archetype: false, seasons: false, difficulty: false, rules: new Set() };
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
    };
  }

  function generate(seed, useLocks) {
    const opts = readOptions();
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

  /**
   * Render a challenge card.
   * mode 'builder' shows lock/reroll controls; mode 'saved' shows progress checkboxes.
   */
  function renderCard(ch, mode, entry) {
    const builder = mode === 'builder';
    const progress = (entry && entry.progress) || {};
    const L = state.locks;

    const check = (key) => (mode === 'saved'
      ? `<input type="checkbox" class="obj-check" data-action="toggle" data-key="${esc(key)}" ${progress[key] ? 'checked' : ''} aria-label="Mark done">`
      : '');

    const rulesHtml = ch.coreRules.map((r) => `
        <li class="rule core"><span class="rule-tag">Core</span><span class="rule-text">${esc(r.text)}</span></li>`).join('')
      + ch.rules.map((r, i) => `
        <li class="rule ${builder && L.rules.has(r.id) ? 'is-locked' : ''}">
          <span class="rule-tag cat-${esc(r.cat.toLowerCase())}">${esc(r.cat)}</span>
          <span class="rule-text">${esc(r.text)}</span>
          ${builder ? `<span class="rule-actions">
            <button type="button" class="icon-btn" data-action="reroll-rule" data-index="${i}" title="Swap this rule">🔄</button>
            ${lockBtn('rule', L.rules.has(r.id), r.id)}
          </span>` : ''}
        </li>`).join('');

    const roadmapHtml = ch.roadmap.map((s) => `
      <li class="season">
        <div class="season-num"><span>S${s.season}</span></div>
        <div class="season-body">
          ${s.objectives.map((o, i) => `
            <label class="objective ${o.type}">
              ${check(`s${s.season}-${i}`)}
              <span class="obj-icon">${o.type === 'main' ? '🎯' : '➕'}</span>
              <span>${esc(o.text)}</span>
            </label>`).join('')}
          ${s.events.map((e) => `<div class="event"><span class="obj-icon">⚡</span><span>${esc(e)}</span></div>`).join('')}
        </div>
      </li>`).join('');

    return `
    <article class="card panel ${diffClass(ch.difficulty)}">
      <header class="card-head">
        <div class="arch-icon">${esc(ch.archetype.icon)}</div>
        <div class="card-title">
          <div class="eyebrow">
            ${ch.archetype.history ? `${esc(ch.archetype.typeName)} · ` : ''}${esc(ch.archetype.name)}
            ${builder ? lockBtn('archetype', L.archetype) : ''}
          </div>
          <h2>${esc(ch.club.name)}</h2>
          <p class="tagline">${esc(ch.archetype.tagline)}</p>
        </div>
        <div class="badges">
          <span class="badge-row">${builder ? lockBtn('difficulty', L.difficulty) : ''}<span class="badge diff">${esc(ch.difficultyName)}</span></span>
          <span class="badge seed" title="Seed">#${esc(ch.seed)}</span>
        </div>
      </header>

      ${ch.notes && ch.notes.length ? `<div class="notes">${ch.notes.map((n) => `<p>ℹ️ ${esc(n)}</p>`).join('')}</div>` : ''}

      <div class="facts">
        <div class="fact">
          <span class="fact-label">Club ${builder ? lockBtn('club', L.club) : ''}</span>
          <span class="fact-value">${esc(ch.club.name)}</span>
          <span class="fact-sub">${esc(ch.club.league)} · ${esc(ch.club.country)}</span>
        </div>
        <div class="fact">
          <span class="fact-label">Club size</span>
          <span class="fact-value stars" title="${esc(ch.club.tierName)}">${stars(ch.club.tier)}</span>
          <span class="fact-sub">${esc(ch.club.tierName)}</span>
        </div>
        <div class="fact">
          <span class="fact-label">Length ${builder ? lockBtn('seasons', L.seasons) : ''}</span>
          <span class="fact-value">${ch.seasons}</span>
          <span class="fact-sub">season${ch.seasons === 1 ? '' : 's'}</span>
        </div>
      </div>

      ${ch.archetype.history
    ? `<section class="history"><h3>📖 The history</h3><p>${esc(ch.archetype.history)}</p></section>`
    : `<p class="desc">${esc(ch.archetype.desc)}</p>`}

      <section class="block">
        <h3>📜 Rules</h3>
        <ul class="rules">${rulesHtml}</ul>
      </section>

      <section class="block">
        <h3>🗺️ Season roadmap</h3>
        <ol class="roadmap">${roadmapHtml}</ol>
      </section>

      <section class="block final">
        <h3>🏆 Final goal</h3>
        <label class="objective final-goal">${check('final')}<span>${esc(ch.finalGoal)}</span></label>
      </section>

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
        ${builder ? `
          <button type="button" class="btn btn-primary" data-action="reroll">🎲 Reroll unlocked</button>
          <button type="button" class="btn" data-action="save">💾 Save</button>` : ''}
        ${mode === 'daily' ? `
          <button type="button" class="btn btn-primary" data-action="save">💾 Take it on</button>
          <button type="button" class="btn" data-action="customise" title="Open in the Builder to lock and reroll parts">🛠️ Customise</button>` : ''}
        <button type="button" class="btn" data-action="copy">📋 Copy text</button>
        <button type="button" class="btn" data-action="share">🔗 Share link</button>
        ${mode === 'saved' ? '<button type="button" class="btn btn-danger" data-action="delete">🗑️ Delete</button>' : ''}
      </footer>
    </article>`;
  }

  function scoreFor(ch, entry) {
    const p = entry.progress || {};
    const pts = Object.fromEntries(ch.scoring.map((s) => [s.label, s.points]));
    let total = 0;
    ch.roadmap.forEach((s) => s.objectives.forEach((o, i) => {
      if (p[`s${s.season}-${i}`]) total += o.type === 'main' ? pts['Main season objective'] : pts['Side objective'];
    }));
    if (p.final) total += pts['Final goal achieved'];
    total += (entry.trophies || 0) * pts['Major trophy won'];
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
            <span>🏆 Trophies (+15)</span>
            <div><button type="button" class="icon-btn" data-action="count" data-field="trophies" data-delta="-1">−</button>
            <strong>${entry.trophies || 0}</strong>
            <button type="button" class="icon-btn" data-action="count" data-field="trophies" data-delta="1">+</button></div>
          </div>
          <div class="counter">
            <span>🚫 Rules broken (${rulePts})</span>
            <div><button type="button" class="icon-btn" data-action="count" data-field="breaks" data-delta="-1">−</button>
            <strong>${entry.breaks || 0}</strong>
            <button type="button" class="icon-btn" data-action="count" data-field="breaks" data-delta="1">+</button></div>
          </div>
          <div class="counter total"><span>Total score</span><strong>${scoreFor(ch, entry)}</strong></div>
        </div>
      </section>`;
  }

  function renderBuilder(scroll) {
    const el = $('#result');
    el.innerHTML = renderCard(state.challenge, 'builder');
    if (scroll && window.innerWidth < 900) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Saved challenges ----------

  const loadSaved = () => storageGet(STORE_KEY, []).filter((e) => e && e.challenge && e.id);
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
      <details class="saved-item panel" data-id="${esc(entry.id)}" ${entry.id === openId ? 'open' : ''}>
        <summary>
          <span class="arch-icon small">${esc(ch.archetype.icon)}</span>
          <span class="saved-title">
            <strong>${esc(ch.title)}</strong>
            <small>${ch.daily ? `📅 Daily #${Number(ch.daily.number) || ''} · ` : ''}${esc(ch.difficultyName)} · ${ch.seasons} seasons · saved ${esc(new Date(entry.savedAt).toLocaleDateString())}</small>
          </span>
          <span class="progress" title="${done}/${total} objectives">
            <span class="progress-bar"><span style="width:${pct}%"></span></span>
            <small>${done}/${total} · ${scoreFor(ch, entry)} pts</small>
          </span>
        </summary>
        <div class="saved-body">${renderCard(ch, 'saved', entry)}</div>
      </details>`;
    }).join('');
  }

  function saveChallenge(ch) {
    const list = loadSaved();
    const key = JSON.stringify(G.toShareKey(ch));
    if (list.some((e) => JSON.stringify(G.toShareKey(e.challenge)) === key)) {
      toast('Already in My Challenges');
      return;
    }
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    list.unshift({ id, savedAt: Date.now(), challenge: ch, progress: {}, trophies: 0, breaks: 0 });
    if (writeSaved(list)) {
      $('#saved-count').textContent = list.length;
      toast('Saved to My Challenges 💾');
    } else {
      toast("Couldn't save — browser storage is unavailable");
    }
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

  function showView(view) {
    $$('.tab').forEach((t) => {
      const active = t.dataset.view === view;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
    $('#view-builder').hidden = view !== 'builder';
    $('#view-daily').hidden = view !== 'daily';
    $('#view-saved').hidden = view !== 'saved';
    if (view === 'saved') renderSaved();
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
    } else if (action === 'customise') {
      // Open in the Builder with everything locked, so the player can unlock and reroll parts.
      state.challenge = ch;
      state.locks = { club: true, archetype: true, seasons: true, difficulty: true, rules: new Set(ch.rules.map((r) => r.id)) };
      showView('builder');
      renderBuilder(true);
      toast('Everything is locked. Unlock the parts you want to change, then reroll.');
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
    const url = shareUrl(ch);
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: ch.title, text: `FC 26 career challenge: ${ch.title}`, url });
        return;
      } catch (e) { /* fall back to copying */ }
    }
    toast((await copyText(url)) ? 'Share link copied 🔗' : url);
  }

  function onBuilderClick(e) {
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
    } else if (action === 'delete') {
      if (window.confirm(`Delete "${entry.challenge.title}"?`)) {
        writeSaved(loadSaved().filter((x) => x.id !== id));
        renderSaved();
        toast('Challenge deleted');
      }
    } else if (action === 'copy') {
      copyText(G.challengeToText(entry.challenge)).then((ok) => toast(ok ? 'Copied to clipboard 📋' : 'Copy failed'));
    } else if (action === 'share') {
      shareChallenge(entry.challenge);
    }
  }

  function loadFromHash() {
    const m = window.location.hash.match(/^#c=([A-Za-z0-9_-]+)$/);
    if (!m) return false;
    const key = decodeKey(m[1]);
    const ch = key && G.fromShareKey(key);
    if (!ch) {
      toast("That share link couldn't be read");
      return false;
    }
    state.challenge = ch;
    resetLocks();
    showView('builder');
    renderBuilder();
    toast('Loaded shared challenge');
    return true;
  }

  function init() {
    populateOptions();
    syncClubFilters();
    $('#opt-club').addEventListener('change', syncClubFilters);
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
    window.addEventListener('hashchange', loadFromHash);
    $('#saved-count').textContent = loadSaved().length;
    syncDailyDot();
    setInterval(tickDaily, 30000);
    if (window.location.hash === '#daily') showView('daily');
    else loadFromHash();
  }

  init();
})();
