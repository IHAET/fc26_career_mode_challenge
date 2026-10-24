/*
 * 📰 Matches: an optional match log on a saved challenge, and a newspaper
 * front page written from it.
 *
 * Each match is { id, season, comp, venue ('H'|'A'), opp, gf, ga, scorers,
 * note, photo, at } in entry.matches (newest last). Photos are shrunk and kept
 * on this device with the proof photos (proofs.local); the save only holds
 * their ids, so it stays small enough to sync.
 *
 * The paper is worked out from the log: a headline and story for the match
 * you pick (the latest by default), the season so far, form, top scorers,
 * other results and the latest transfer. It can be saved as a picture.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const MAX = 400;
  const COMPS = [['league', 'League'], ['cup', 'Cup'], ['europe', 'Europe'], ['final', 'Cup final'], ['friendly', 'Friendly']];
  const compName = (c) => (COMPS.find(([id]) => id === c) || COMPS[0])[1];

  let deps = null; // { esc, toast, mutateEntry, findEntry, storageGet }
  const views = {}; // entry id → { paper: bool, match: id }
  const esc = (v) => deps.esc(v == null ? '' : v);
  const uid = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  // ---------- Working things out (no DOM) ----------

  const result = (m) => (m.gf > m.ga ? 'W' : m.gf < m.ga ? 'L' : 'D');

  /** P W D L GF GA Pts for a list of matches. */
  function record(list) {
    const r = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    list.forEach((m) => {
      r.p += 1;
      r.gf += m.gf;
      r.ga += m.ga;
      const x = result(m);
      if (x === 'W') { r.w += 1; r.pts += 3; } else if (x === 'D') { r.d += 1; r.pts += 1; } else r.l += 1;
    });
    return r;
  }

  /**
   * Goals per player from the scorers boxes: "Haaland 2, Saka", "Kane (pen), Kane",
   * "Mbappé x3" all count. Returns [[name, goals]], most first.
   */
  function scorers(list) {
    const goals = new Map();
    list.forEach((m) => String(m.scorers || '').split(/[,;\n]+/).forEach((part) => {
      const t = part.replace(/\(.*?\)|\d+['’]/g, ' ').trim();
      if (!t) return;
      const n = t.match(/(?:x|×)\s*(\d+)$|\s(\d+)$/i);
      const count = n ? Number(n[1] || n[2]) : 1;
      const name = (n ? t.slice(0, n.index) : t).trim();
      if (!name || count < 1 || count > 15) return;
      const key = name.toLowerCase();
      const had = goals.get(key) || [name, 0];
      goals.set(key, [had[0], had[1] + count]);
    }));
    return Array.from(goals.values()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  /** The run going into and including match i: { kind: 'W'|'D'|'L'|'unbeaten', n }. */
  function streak(list, i) {
    const last = result(list[i]);
    let n = 0;
    for (let k = i; k >= 0 && result(list[k]) === last; k--) n += 1;
    let unbeaten = 0;
    for (let k = i; k >= 0 && result(list[k]) !== 'L'; k--) unbeaten += 1;
    return { last, n, unbeaten };
  }

  // A steady choice from a list, so a match's headline doesn't change every time.
  function pick(list, seed) {
    let h = 0;
    for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return list[h % list.length];
  }
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] == null ? '' : v[k]));

  /** Headline, sub-headline and story for match i of the list. */
  function story(list, i, club, manager) {
    const m = list[i];
    const res = result(m);
    const margin = Math.abs(m.gf - m.ga);
    const goals = scorers([m]);
    const hero = goals[0] ? goals[0][0] : '';
    const hat = goals.find((g) => g[1] >= 3);
    const s = streak(list, i);
    const v = {
      club, opp: m.opp || 'their opponents', score: `${m.gf}-${m.ga}`, hero, comp: compName(m.comp), CLUB: club.toUpperCase(),
      OPP: (m.opp || 'rivals').toUpperCase(), HERO: hero.toUpperCase(), where: m.venue === 'A' ? 'away from home' : 'in front of their own fans', manager,
    };
    let heads;
    if (m.comp === 'final' && res === 'W') heads = ['CUP GLORY!', '{CLUB} LIFT THE CUP', 'SILVERWARE! {CLUB} DO IT'];
    else if (m.comp === 'final') heads = ['FINAL HEARTBREAK', 'SO CLOSE FOR {CLUB}', 'TEARS AT THE FINAL'];
    else if (hat && res !== 'L') heads = ['{HERO} HAT-TRICK HERO', 'TAKE A BOW, {HERO}', 'MATCH BALL FOR {HERO}'];
    else if (res === 'W' && margin >= 3) heads = ['{CLUB} RUN RIOT', '{OPP} HUMBLED', '{score}! WHAT A PERFORMANCE', 'ROUT AT {CLUB}'];
    else if (res === 'W' && margin === 1 && hero) heads = ['{HERO} SEALS IT', '{HERO} THE MATCH-WINNER', 'NERVES OF STEEL', '{CLUB} EDGE PAST {OPP}'];
    else if (res === 'W') heads = ['{CLUB} SEE OFF {OPP}', 'JOB DONE', 'THREE POINTS, NO FUSS', '{CLUB} TOO GOOD FOR {OPP}'];
    else if (res === 'D' && m.gf === 0) heads = ['BORE DRAW', 'NOTHING TO SEPARATE THEM', 'GOALLESS GRIND'];
    else if (res === 'D') heads = ['HONOURS EVEN', 'SPOILS SHARED WITH {OPP}', 'ALL SQUARE', 'A POINT APIECE'];
    else if (margin >= 3) heads = ['HUMILIATION', 'CRISIS AT {CLUB}?', '{OPP} RUN RIOT', 'NIGHT TO FORGET'];
    else heads = ['{OPP} SPOIL THE PARTY', 'HEARTBREAK FOR {CLUB}', 'SO NEAR, SO FAR', 'BEATEN BY {OPP}'];
    if (m.comp === 'friendly') heads = heads.map((h) => h.replace('CRISIS AT {CLUB}?', 'ONLY A FRIENDLY…'));

    let deck;
    if (res === 'W') deck = `${club} beat ${v.opp} ${m.gf}-${m.ga} ${v.where} in the ${v.comp.toLowerCase()}`;
    else if (res === 'D') deck = `${club} held to a ${m.gf}-${m.ga} draw by ${v.opp} ${v.where}`;
    else deck = `${club} lose ${m.gf}-${m.ga} to ${v.opp} ${v.where}`;

    const body = [];
    const open = {
      W: ['{club} picked up a {score} win over {opp} in the {comp}.', 'It finished {score} to {club} against {opp}.', '{club} got the job done against {opp}, winning {score}.'],
      D: ['{club} and {opp} could not be separated, finishing {score}.', 'A {score} draw with {opp} left {club} with a point.'],
      L: ['{club} went down {score} against {opp}.', '{opp} came out on top, beating {club} {score}.'],
    }[res];
    body.push(fill(pick(open, m.id), v));
    if (goals.length) {
      const list2 = goals.map(([name, n]) => (n > 1 ? `${name} (${n})` : name));
      body.push(`${list2.length > 1 ? `${list2.slice(0, -1).join(', ')} and ${list2[list2.length - 1]} were` : `${list2[0]} was`} on the scoresheet for ${club}.`);
    } else if (m.gf > 0) body.push(`${club} found the net ${m.gf === 1 ? 'once' : `${m.gf} times`}.`);
    if (s.last === 'W' && s.n >= 3) body.push(`That's ${s.n} wins in a row, and the fans are starting to dream.`);
    else if (s.unbeaten >= 5) body.push(`The side are now unbeaten in ${s.unbeaten}.`);
    else if (s.last === 'L' && s.n >= 3) body.push(`It's ${s.n} defeats on the bounce, and questions are being asked.`);
    if (m.note) body.push(`${manager ? `${manager} said` : 'The manager said'} afterwards: “${m.note}”`);
    return { head: fill(pick(heads, m.id), v), deck, body };
  }

  /** Everything the front page shows for one save: { club, edition, lead, others, table, form, top, transfer, ... }. */
  function paper(entry, matchId, manager) {
    const list = (entry.matches || []).slice();
    if (!list.length) return null;
    const i = Math.max(0, list.findIndex((m) => m.id === matchId) >= 0 ? list.findIndex((m) => m.id === matchId) : list.length - 1);
    const m = list[i];
    const club = entry.challenge.club.name;
    const seasonList = list.filter((x) => x.season === m.season).filter((x) => list.indexOf(x) <= i);
    const lead = story(list, i, club, manager);
    const others = list.slice(0, i).reverse().slice(0, 3).map((x) => ({ m: x, line: `${result(x) === 'W' ? 'Win' : result(x) === 'D' ? 'Draw' : 'Defeat'}: ${x.venue === 'A' ? `${x.opp} ${x.ga}-${x.gf} ${club}` : `${club} ${x.gf}-${x.ga} ${x.opp}`}`, comp: compName(x.comp), head: story(list, list.indexOf(x), club, manager).head }));
    const transfers = ((entry.tracker && entry.tracker.transfers) || []).filter((t) => t.dir === 'in' && t.name);
    const t = transfers[transfers.length - 1];
    const ticked = Object.values(entry.progress || {}).filter(Boolean).length;
    const total = entry.challenge.roadmap.reduce((n, r) => n + r.objectives.length, 0) + 1;
    return {
      club, match: m, number: i + 1, season: m.season, matchday: seasonList.length, lead,
      table: record(list.filter((x) => x.season === m.season && list.indexOf(x) <= i && x.comp !== 'friendly')),
      form: list.slice(Math.max(0, i - 4), i + 1).map(result),
      top: scorers(list.filter((x) => x.season === m.season && list.indexOf(x) <= i)).slice(0, 5),
      others,
      transfer: t ? `${t.name} has joined ${club}${t.fee ? ` for €${t.fee}M` : t.type === 'free' ? ' on a free' : t.type === 'loan' ? ' on loan' : ''}${t.from ? ` from ${t.from}` : ''}.` : '',
      challenge: { title: entry.challenge.title, ticked, total },
    };
  }

  const paperName = (club) => {
    const short = String(club).replace(/^(FC|AFC|SC|SV|AS|AC|SS|US|RC|CF|CD|UD|SL|VfB|VfL|TSG|1\.\s?FC)\s+/i, '').replace(/\s+(FC|AFC|CF|SC)$/i, '');
    return pick(['The {c} Gazette', 'The {c} Chronicle', 'The {c} Herald', 'The Daily {c}', 'The {c} Echo'], club).replace('{c}', short);
  };

  // ---------- Drawing ----------

  const opts = (list, value) => list.map(([v, label]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(label)}</option>`).join('');

  function logView(entry) {
    const list = entry.matches || [];
    const season = (entry.tracker && entry.tracker.season) || 1;
    const seasons = Math.max(entry.challenge.seasons, season);
    const r = record(list.filter((m) => m.season === season && m.comp !== 'friendly'));
    return `
      <div class="mt-head">
        <div><strong>📰 Match log</strong> <span class="muted small">Optional: log the results you want, and get a newspaper written about them.</span></div>
        ${list.length ? '<button type="button" class="btn btn-small btn-primary" data-action="mt-paper">📰 Read the paper</button>' : ''}
      </div>
      <form class="mt-form" data-mt-form autocomplete="off">
        <select name="season" aria-label="Season">${opts(Array.from({ length: seasons }, (_, k) => [k + 1, `Season ${k + 1}`]), season)}</select>
        <select name="comp" aria-label="Competition">${opts(COMPS, 'league')}</select>
        <select name="venue" aria-label="Home or away">${opts([['H', '🏠 Home'], ['A', '🚌 Away']], 'H')}</select>
        <input type="text" name="opp" list="mt-clubs" maxlength="60" placeholder="Opponent" aria-label="Opponent" required>
        <span class="mt-score"><input type="number" name="gf" min="0" max="30" value="" placeholder="${esc(entry.challenge.club.name.slice(0, 12))}" aria-label="Your goals" required>
          <span>–</span><input type="number" name="ga" min="0" max="30" value="" placeholder="Them" aria-label="Their goals" required></span>
        <input type="text" name="scorers" maxlength="200" placeholder="Your scorers (e.g. Haaland 2, Saka)" aria-label="Your scorers">
        <input type="text" name="note" maxlength="200" placeholder="Quote for the paper (optional)" aria-label="A quote for the paper">
        <label class="btn btn-small mt-photo">📷 <span data-mt-photo-label>Add a photo</span><input type="file" name="photo" accept="image/*" hidden></label>
        <button type="submit" class="btn btn-small btn-primary">＋ Log match</button>
      </form>
      ${list.length ? `
        <p class="muted small">Season ${season}: ${r.p} played · ${r.w}W ${r.d}D ${r.l}L · ${r.gf}-${r.ga} goals${r.p ? ` · ${r.pts} pts` : ''}</p>
        <ul class="mt-list">${list.slice().reverse().map((m) => `
          <li class="mt-row" data-mid="${esc(m.id)}">
            <span class="mt-res mt-${result(m)}">${result(m)}</span>
            <span class="mt-main"><strong>${m.venue === 'A' ? '@' : 'vs'} ${esc(m.opp)} ${m.gf}–${m.ga}</strong>
              <small class="muted">S${m.season} · ${esc(compName(m.comp))}${m.scorers ? ` · ⚽ ${esc(m.scorers)}` : ''}</small></span>
            ${m.photo ? `<img class="mt-thumb" data-mt-img="${esc(m.photo)}" alt="Match photo">` : `<label class="icon-btn" title="Add a photo">📷<input type="file" accept="image/*" data-mt-addphoto hidden></label>`}
            <button type="button" class="icon-btn" data-action="mt-read" title="Read this match's paper">📰</button>
            <button type="button" class="icon-btn" data-action="mt-del" title="Delete this match" aria-label="Delete this match">🗑️</button>
          </li>`).join('')}</ul>` : '<p class="muted">No matches logged yet. Add a result above and the paper will write itself.</p>'}`;
  }

  function paperView(entry) {
    const v = views[entry.id] || {};
    const p = paper(entry, v.match, manager());
    if (!p) return logView(entry);
    const list = entry.matches || [];
    return `
      <div class="mt-head">
        <button type="button" class="btn btn-small" data-action="mt-log">← Match log</button>
        <label class="mt-edition">Edition <select data-mt-edition aria-label="Which match">${opts(list.slice().reverse().map((m) => [m.id, `S${m.season} · ${m.venue === 'A' ? '@' : 'vs'} ${m.opp} ${m.gf}–${m.ga}`]), p.match.id)}</select></label>
        <button type="button" class="btn btn-small" data-action="mt-image">🖼️ Save as image</button>
      </div>
      <article class="paper">
        <header class="paper-mast">
          <div class="paper-name">${esc(paperName(p.club))}</div>
          <div class="paper-meta"><span>Season ${p.season} · Matchday ${p.matchday}</span><span>No. ${p.number}</span><span>FREE</span></div>
        </header>
        <div class="paper-grid">
          <div class="paper-lead">
            <span class="paper-kicker">${esc(compName(p.match.comp))} · ${p.match.venue === 'A' ? 'Away' : 'Home'}</span>
            <h3 class="paper-head">${esc(p.lead.head)}</h3>
            <p class="paper-deck">${esc(p.lead.deck)}</p>
            ${p.match.photo ? `<figure class="paper-photo"><img data-mt-img="${esc(p.match.photo)}" data-mt-full alt="Match photo">${p.match.note ? '' : ''}</figure>`
    : '<label class="paper-photo paper-photo-empty">📷 Add a photo of this match<input type="file" accept="image/*" data-mt-addphoto hidden></label>'}
            <div class="paper-score"><span>${esc(p.club)}</span><strong>${p.match.venue === 'A' ? `${p.match.ga} – ${p.match.gf}` : `${p.match.gf} – ${p.match.ga}`}</strong><span>${esc(p.match.opp)}</span></div>
            ${p.lead.body.map((t) => `<p>${esc(t)}</p>`).join('')}
          </div>
          <aside class="paper-side">
            <section><h4>Season ${p.season} so far</h4>
              <table class="paper-table"><tr><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
              <tr><td>${p.table.p}</td><td>${p.table.w}</td><td>${p.table.d}</td><td>${p.table.l}</td><td>${p.table.gf - p.table.ga > 0 ? '+' : ''}${p.table.gf - p.table.ga}</td><td>${p.table.pts}</td></tr></table>
              <p class="paper-form">Form: ${p.form.map((x) => `<span class="mt-res mt-${x}">${x}</span>`).join('')}</p></section>
            ${p.top.length ? `<section><h4>Top scorers</h4><ol class="paper-top">${p.top.map(([n, g]) => `<li><span>${esc(n)}</span><strong>${g}</strong></li>`).join('')}</ol></section>` : ''}
            ${p.transfer ? `<section><h4>Transfer news</h4><p>${esc(p.transfer)}</p></section>` : ''}
            <section><h4>Challenge watch</h4><p>“${esc(p.challenge.title)}”: ${p.challenge.ticked} of ${p.challenge.total} objectives done.</p></section>
          </aside>
        </div>
        ${p.others.length ? `<div class="paper-others">${p.others.map((o) => `<div><span class="paper-kicker">${esc(o.comp)}</span><strong>${esc(o.head)}</strong><small>${esc(o.line)}</small></div>`).join('')}</div>` : ''}
      </article>`;
  }

  const manager = () => {
    const p = FC26.subscriptions && FC26.subscriptions.profile && FC26.subscriptions.profile();
    return p && (p.name || (p.handle ? `@${p.handle}` : '')) ? (p.name || `@${p.handle}`) : '';
  };

  /** The Matches tab's contents. */
  function render(entry) {
    ensureClubList();
    setTimeout(hydrate, 0);
    return (views[entry.id] || {}).paper ? paperView(entry) : logView(entry);
  }

  // Photos come from on-device storage after the panel is drawn.
  async function hydrate() {
    const imgs = Array.from(document.querySelectorAll('img[data-mt-img]:not([src])'));
    await Promise.all(imgs.map(async (img) => {
      const ph = await FC26.proofs.local.get(img.dataset.mtImg).catch(() => null);
      if (ph) img.src = img.hasAttribute('data-mt-full') ? ph.image : ph.thumb;
      else img.replaceWith(Object.assign(document.createElement('span'), { className: 'muted small', textContent: '📷 (on another device)' }));
    }));
  }

  function ensureClubList() {
    if (typeof document === 'undefined' || document.getElementById('mt-clubs')) return;
    const dl = document.createElement('datalist');
    dl.id = 'mt-clubs';
    dl.innerHTML = Array.from(new Set(((FC26.generator && FC26.generator.CLUBS) || []).map((c) => c.name))).sort().map((n) => `<option value="${esc(n)}">`).join('');
    document.body.appendChild(dl);
  }

  // ---------- Events (called from the tracker) ----------

  function redraw(item, entry) {
    const panel = item.querySelector('[data-panel="matches"]');
    if (panel) panel.innerHTML = render(entry);
    const c = item.querySelector('.ttab[data-tab="matches"] .count');
    if (c) c.textContent = (entry.matches || []).length;
  }

  async function savePhoto(file) {
    const [image, thumb] = await Promise.all([FC26.proofs.shrink(file, 1600, 0.82), FC26.proofs.shrink(file, 360, 0.7)]);
    const id = `match_${uid()}`;
    await FC26.proofs.local.put(id, { image, thumb });
    return id;
  }

  function onClick(e, item) {
    const btn = e.target.closest('[data-action^="mt-"]');
    if (!btn) return false;
    const id = item.dataset.id;
    const entry = deps.findEntry(id);
    if (!entry) return true;
    const v = (views[id] = views[id] || {});
    const action = btn.dataset.action;
    if (action === 'mt-paper') { v.paper = true; v.match = null; }
    if (action === 'mt-log') v.paper = false;
    if (action === 'mt-read') { v.paper = true; v.match = btn.closest('[data-mid]').dataset.mid; }
    if (action === 'mt-del') {
      const mid = btn.closest('[data-mid]').dataset.mid;
      if (!root.confirm('Delete this match?')) return true;
      let gone = null;
      deps.mutateEntry(id, (en) => { gone = (en.matches || []).find((m) => m.id === mid); en.matches = (en.matches || []).filter((m) => m.id !== mid); });
      if (gone && gone.photo) FC26.proofs.local.del(gone.photo).catch(() => {});
    }
    if (action === 'mt-image') { exportImage(entry); return true; }
    redraw(item, deps.findEntry(id));
    if (action === 'mt-paper' || action === 'mt-read') item.querySelector('[data-panel="matches"]').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  async function onSubmit(e, item) {
    const form = e.target;
    if (!form.matches('[data-mt-form]')) return false;
    e.preventDefault();
    const f = form.elements;
    const gf = Math.round(Number(f.gf.value));
    const ga = Math.round(Number(f.ga.value));
    const opp = String(f.opp.value || '').trim().slice(0, 60);
    if (!opp || f.gf.value === '' || f.ga.value === '' || !(gf >= 0) || !(ga >= 0)) { deps.toast('Add the opponent and the score'); return true; }
    let photo = null;
    const file = f.photo.files && f.photo.files[0];
    if (file) {
      try { photo = await savePhoto(file); } catch (err) { deps.toast(err.message || 'That photo couldn’t be saved'); }
    }
    const clean = FC26.community ? FC26.community.clean : (s, n) => String(s || '').trim().slice(0, n);
    const m = {
      id: uid(), season: Number(f.season.value) || 1, comp: f.comp.value, venue: f.venue.value === 'A' ? 'A' : 'H', opp,
      gf: Math.min(30, gf), ga: Math.min(30, ga), scorers: clean(f.scorers.value, 200), note: clean(f.note.value, 200), photo, at: Date.now(),
    };
    const entry = deps.mutateEntry(item.dataset.id, (en) => { en.matches = (en.matches || []).concat(m).slice(-MAX); });
    redraw(item, entry);
    const r = result(m);
    deps.toast(r === 'W' ? `✅ Win logged: ${m.gf}-${m.ga} 📰` : r === 'D' ? `Draw logged: ${m.gf}-${m.ga} 📰` : `Defeat logged: ${m.gf}-${m.ga} 📰`);
    return true;
  }

  async function onChange(e, item) {
    const el = e.target;
    if (el.matches('[data-mt-edition]')) {
      const v = (views[item.dataset.id] = views[item.dataset.id] || {});
      v.match = el.value;
      redraw(item, deps.findEntry(item.dataset.id));
      return true;
    }
    if (el.matches('.mt-form input[name=photo]')) {
      const label = item.querySelector('[data-mt-photo-label]');
      if (label) label.textContent = el.files && el.files[0] ? 'Photo added ✓' : 'Add a photo';
      return true;
    }
    if (el.matches('[data-mt-addphoto]')) {
      const file = el.files && el.files[0];
      if (!file) return true;
      const v = views[item.dataset.id] || {};
      const row = el.closest('[data-mid]');
      const entry0 = deps.findEntry(item.dataset.id);
      const list = (entry0 && entry0.matches) || [];
      const mid = row ? row.dataset.mid : (list.find((m) => m.id === v.match) || list[list.length - 1] || {}).id;
      try {
        const photo = await savePhoto(file);
        const entry = deps.mutateEntry(item.dataset.id, (en) => { (en.matches || []).forEach((m) => { if (m.id === mid) m.photo = photo; }); });
        redraw(item, entry);
        deps.toast('Photo added 📷');
      } catch (err) { deps.toast(err.message || 'That photo couldn’t be saved'); }
      return true;
    }
    return false;
  }

  // ---------- The paper as a picture ----------

  function wrap(ctx, text, width) {
    const lines = [];
    let line = '';
    String(text).split(/\s+/).forEach((w) => {
      const test = line ? `${line} ${w}` : w;
      if (line && ctx.measureText(test).width > width) { lines.push(line); line = w; } else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  async function exportImage(entry) {
    const v = views[entry.id] || {};
    const p = paper(entry, v.match, manager());
    if (!p) return;
    const W = 1080;
    const H = 1350;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d');
    const INK = '#1b1a17';
    const PAPER = '#f4efe3';
    const SERIF = 'Georgia, "Times New Roman", serif';
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    let size = 92;
    ctx.font = `900 ${size}px ${SERIF}`;
    const name = paperName(p.club);
    while (ctx.measureText(name).width > W - 100 && size > 40) { size -= 4; ctx.font = `900 ${size}px ${SERIF}`; }
    ctx.fillText(name, W / 2, 120);
    ctx.fillRect(50, 150, W - 100, 4);
    ctx.font = `600 22px ${SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillText(`SEASON ${p.season} · MATCHDAY ${p.matchday}`, 50, 182);
    ctx.textAlign = 'right';
    ctx.fillText(`No. ${p.number} · FREE`, W - 50, 182);
    ctx.fillRect(50, 196, W - 100, 1.5);
    ctx.textAlign = 'left';
    // Headline
    let y = 290;
    size = 96;
    ctx.font = `900 ${size}px ${SERIF}`;
    let lines = wrap(ctx, p.lead.head, W - 100);
    while (lines.length > 2 && size > 54) { size -= 6; ctx.font = `900 ${size}px ${SERIF}`; lines = wrap(ctx, p.lead.head, W - 100); }
    lines.slice(0, 2).forEach((l) => { ctx.fillText(l, 50, y); y += size * 1.02; });
    ctx.font = `italic 400 32px ${SERIF}`;
    wrap(ctx, p.lead.deck, W - 100).slice(0, 2).forEach((l) => { ctx.fillText(l, 50, y); y += 40; });
    y += 10;
    // Photo (or a big score)
    const ph = p.match.photo ? await FC26.proofs.local.get(p.match.photo).catch(() => null) : null;
    const boxH = 470;
    if (ph) {
      const img = await new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = ph.image; });
      if (img) {
        const scale = Math.max((W - 100) / img.width, boxH / img.height);
        const sw = (W - 100) / scale;
        const sh = boxH / scale;
        ctx.save();
        ctx.filter = 'grayscale(0.35) contrast(1.05)';
        ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 50, y, W - 100, boxH);
        ctx.restore();
      }
    } else {
      ctx.fillStyle = '#e6dfcf';
      ctx.fillRect(50, y, W - 100, boxH);
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.font = `900 180px ${SERIF}`;
      ctx.fillText(p.match.venue === 'A' ? `${p.match.ga}–${p.match.gf}` : `${p.match.gf}–${p.match.ga}`, W / 2, y + boxH / 2 + 40);
      ctx.font = `700 34px ${SERIF}`;
      ctx.fillText(p.match.venue === 'A' ? `${p.match.opp} v ${p.club}` : `${p.club} v ${p.match.opp}`, W / 2, y + boxH / 2 + 110);
      ctx.textAlign = 'left';
    }
    y += boxH + 44;
    // Two columns: story | season
    const colW = 620;
    ctx.font = `400 25px ${SERIF}`;
    const text = p.lead.body.join(' ');
    let ty = y;
    wrap(ctx, text, colW).forEach((l) => { if (ty < H - 70) { ctx.fillText(l, 50, ty); ty += 34; } });
    const sx = 50 + colW + 30;
    ctx.fillRect(sx - 16, y - 28, 1.5, H - y - 30);
    ctx.font = `900 24px ${SERIF}`;
    ctx.fillText(`SEASON ${p.season} SO FAR`, sx, y);
    ctx.font = `400 24px ${SERIF}`;
    const t = p.table;
    [`P${t.p}  W${t.w}  D${t.d}  L${t.l}`, `Goals ${t.gf}-${t.ga} · ${t.pts} pts`, `Form ${p.form.join(' ')}`].forEach((l, k) => ctx.fillText(l, sx, y + 36 + k * 32));
    let sy = y + 150;
    if (p.top.length) {
      ctx.font = `900 24px ${SERIF}`;
      ctx.fillText('TOP SCORERS', sx, sy);
      ctx.font = `400 24px ${SERIF}`;
      p.top.slice(0, 3).forEach(([n, g], k) => ctx.fillText(`${g}  ${n}`.slice(0, 26), sx, sy + 34 + k * 30));
      sy += 140;
    }
    const site = String((root.location && /^https?:$/.test(root.location.protocol) ? root.location.host + root.location.pathname.replace(/index\.html$/, '') : (FC26.config && FC26.config.siteUrl) || '')).replace(/^https?:\/\//, '').replace(/\/$/, '');
    ctx.font = `italic 400 20px ${SERIF}`;
    if (site && sy < H - 60) wrap(ctx, `Made with ${site}`, W - 50 - sx).forEach((l, k) => ctx.fillText(l, sx, H - 70 + k * 24));
    const slug = String(p.club).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      const res = FC26.shareImage && FC26.shareImage.deliver
        ? await FC26.shareImage.deliver(c, `fc26-paper-${slug}.png`, name)
        : null;
      if (res === 'downloaded') deps.toast('Newspaper saved 🖼️');
    } catch (err) { deps.toast("Couldn't create the image in this browser"); }
  }

  function init(d) { deps = d; }

  FC26.matches = { init, render, onClick, onSubmit, onChange, record, scorers, story, paper, paperName, result, COMPS };
})(typeof window !== 'undefined' ? window : globalThis);
