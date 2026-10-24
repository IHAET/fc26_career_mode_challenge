/*
 * 💬 Community: a players' forum, ⭐ player picks (players recommending real
 * players to sign, with upvotes), 🏆 the challenge of the week (weekly.js),
 * ⚔️ head-to-heads with friends (duels.js) and 📺 every creator video by
 * challenge type. 🔔 Replies to your threads, upvotes on your picks and new
 * head-to-head challenges show as a dot on the tab, a list at the top, and
 * (if you turned it on in 🔔 Subscriptions) a notification.
 *
 * Firestore: forum/{id} (threads) with forum/{id}/replies/{id}, picks/{id}
 * with picks/{id}/votes/{uid}, and reports/{id}. Reading needs a signed-in
 * account; posting needs a username (🔔 → Following). You can delete what you
 * posted and report what others posted.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  const CATS = [['general', '💬 General'], ['challenges', '🏆 Challenge talk'], ['transfers', '🔁 Transfers'], ['tactics', '🧠 Tactics'], ['ideas', '💡 Ideas & bugs']];
  const TAGS = [['wonderkid', '🌟 Wonderkid'], ['bargain', '💰 Bargain'], ['gem', '💎 Hidden gem'], ['free', '🆓 Free agent'], ['star', '⭐ Superstar'], ['loan', '🔁 Loan']];
  const LIMITS = { title: 100, body: 2000, reply: 1000, note: 300 };
  // Words hidden from posts (people can read the forum at any age).
  const BLOCK = /\b(fuck\w*|shit\w*|cunt\w*|bitch\w*|bastard\w*|wank\w*|twat\w*|dick(head)?s?|pussy|slut\w*|whore\w*|nigg\w*|fag\w*|retard\w*)\b/gi;
  const SEEN_KEY = 'fc26-cm-seen-v1'; // what you've already seen: { threads: {id: replies}, picks: {id: votes}, duels: [ids] }
  const CHECK_EVERY = 5 * 60000;
  const SECTIONS = [['forum', '💬 Forum'], ['picks', '⭐ Player picks'], ['weekly', '🏆 Weekly'], ['h2h', '⚔️ Head-to-head'], ['videos', '📺 Videos']];
  const clean = (s, max) => String(s || '').replace(/\s+\n/g, '\n').trim().slice(0, max).replace(BLOCK, (w) => '★'.repeat(w.length));

  let deps = null; // { esc, toast, showView, storageGet, storageSet }
  let el = null;
  const st = { section: 'forum', cat: 'all', threads: null, thread: null, replies: null, picks: null, pickSort: 'top', pickTag: '', myVotes: new Set(), error: '', busy: false, videoType: '', activity: [] };

  const esc = (v) => deps.esc(v == null ? '' : v);
  const data = () => (FC26.account && FC26.account.data && FC26.account.data()) || null;
  const account = () => (FC26.account && FC26.account.state()) || { status: 'off' };
  const me = () => (account().user || {}).uid;
  const handle = () => { const p = FC26.subscriptions && FC26.subscriptions.profile && FC26.subscriptions.profile(); return p && p.handle; };
  const ago = (t) => {
    const s = Math.max(1, Math.round((Date.now() - (Number(t) || 0)) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)}m ago`;
    if (s < 86400) return `${Math.round(s / 3600)}h ago`;
    return `${Math.round(s / 86400)}d ago`;
  };
  const refused = (e) => /permission/i.test(String((e && (e.code || e.message)) || ''));
  const fail = (e) => {
    if (refused(e)) console.warn('Community: the database refused. Publish the latest firestore.rules in Firebase.');
    return refused(e) ? 'The community isn’t open yet. Check back soon!' : 'Couldn’t reach the community. Check your connection and try again.';
  };
  const para = (s) => esc(s).replace(/\n/g, '<br>');
  const badge = (uid) => (FC26.badges ? FC26.badges.chips(uid) : '');

  // ---------- Loading ----------

  async function loadThreads() {
    st.error = '';
    try { st.threads = await data().top('forum', 'lastAt', 100); } catch (e) { st.error = fail(e); st.threads = []; }
    render();
  }
  async function openThread(id) {
    st.thread = (st.threads || []).find((t) => t.id === id) || { id };
    st.replies = null;
    render();
    try {
      const [t, replies] = await Promise.all([data().get(`forum/${id}`), data().list(`forum/${id}/replies`)]);
      if (t) st.thread = Object.assign({ id }, t);
      st.replies = replies.sort((a, b) => (a.at || 0) - (b.at || 0));
    } catch (e) { st.error = fail(e); st.replies = []; }
    render();
  }
  async function loadPicks() {
    st.error = '';
    try {
      st.picks = await data().top('picks', st.pickSort === 'top' ? 'votes' : 'at', 150);
      // Which ones you've upvoted.
      const uid = me();
      const mine = await Promise.all(st.picks.map((p) => data().get(`picks/${p.id}/votes/${uid}`).then((v) => (v ? p.id : null)).catch(() => null)));
      st.myVotes = new Set(mine.filter(Boolean));
    } catch (e) { st.error = fail(e); st.picks = []; }
    render();
  }

  // ---------- Drawing ----------

  function gate() {
    const s = account();
    if (s.status === 'off') return '<p class="muted">The community needs accounts, which aren’t switched on for this copy of the app.</p>';
    if (s.status === 'loading') return '<p class="muted">Connecting…</p>';
    if (s.status !== 'signed-in') return '<div class="cm-gate"><p>Sign in to read the forum and players’ picks, and to post your own.</p><button type="button" class="btn btn-primary" data-cm="signin">👤 Sign in</button></div>';
    return '';
  }
  const needHandle = () => (handle() ? '' : '<p class="cm-note">✍️ To post, pick a username first: <button type="button" class="login-link" data-cm="username">🔔 Subscriptions → Following</button></p>');

  function forumView() {
    if (st.thread) {
      const t = st.thread;
      return `
        <button type="button" class="btn btn-small" data-cm="back">← All threads</button>
        <article class="cm-thread">
          <div class="cm-meta"><span class="cm-cat">${esc((CATS.find(([c]) => c === t.cat) || ['', '💬'])[1])}</span> @${esc(t.handle)} ${badge(t.uid)} · ${ago(t.at)}</div>
          <h3>${esc(t.title)}</h3>
          <p>${para(t.body)}</p>
          ${postTools('thread', t)}
        </article>
        <h4 class="cm-sub">${st.replies ? `${st.replies.length} repl${st.replies.length === 1 ? 'y' : 'ies'}` : 'Replies'}</h4>
        ${st.replies == null ? '<p class="muted">Loading…</p>' : st.replies.map((r) => `
          <div class="cm-reply"><div class="cm-meta">@${esc(r.handle)} ${badge(r.uid)} · ${ago(r.at)}</div><p>${para(r.body)}</p>${postTools('reply', r)}</div>`).join('')}
        ${handle() ? `<form class="cm-form" data-cm-form="reply"><textarea name="body" maxlength="${LIMITS.reply}" rows="3" placeholder="Write a reply" required></textarea><button type="submit" class="btn btn-small btn-primary">Reply</button></form>` : needHandle()}`;
    }
    const list = (st.threads || []).filter((t) => st.cat === 'all' || t.cat === st.cat);
    return `
      <div class="cm-chips">${[['all', 'All']].concat(CATS).map(([c, label]) => `<button type="button" class="genre-chip${st.cat === c ? ' is-on' : ''}" data-cm="cat" data-cat="${c}">${esc(label)}</button>`).join('')}</div>
      ${handle() ? `<details class="cm-new"><summary class="btn btn-small btn-primary">✍️ New thread</summary>
        <form class="cm-form" data-cm-form="thread">
          <select name="cat" aria-label="Category">${CATS.map(([c, label]) => `<option value="${c}" ${st.cat === c ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>
          <input type="text" name="title" maxlength="${LIMITS.title}" placeholder="Title" required>
          <textarea name="body" maxlength="${LIMITS.body}" rows="4" placeholder="What do you want to say?" required></textarea>
          <button type="submit" class="btn btn-small btn-primary">Post</button>
        </form></details>` : needHandle()}
      ${st.threads == null ? '<p class="muted">Loading…</p>' : list.length ? `<ul class="cm-list">${list.map((t) => `
        <li><button type="button" class="cm-row" data-cm="open" data-id="${esc(t.id)}">
          <span class="cm-main"><strong>${esc(t.title)}</strong><small class="muted">${esc((CATS.find(([c]) => c === t.cat) || ['', ''])[1])} · @${esc(t.handle)} ${badge(t.uid)} · ${ago(t.lastAt || t.at)}</small></span>
          <span class="cm-count" title="Replies">💬 ${Number(t.replies) || 0}</span></button></li>`).join('')}</ul>`
    : '<p class="muted">No threads here yet. Start one!</p>'}`;
  }

  function postTools(kind, p) {
    const own = p.uid && p.uid === me();
    return `<div class="cm-tools">${own ? `<button type="button" class="login-link" data-cm="delete" data-kind="${kind}" data-id="${esc(p.id)}">🗑️ Delete</button>`
      : `<button type="button" class="login-link cm-report" data-cm="report" data-kind="${kind}" data-id="${esc(p.id)}">🚩 Report</button>`}</div>`;
  }

  function picksView() {
    const ovrBand = (v) => (!v ? '' : v >= 85 ? 'ovr-elite' : v >= 78 ? 'ovr-gold' : v >= 70 ? 'ovr-silver' : 'ovr-bronze');
    const list = (st.picks || []).filter((p) => !st.pickTag || p.tag === st.pickTag);
    return `
      <p class="muted">Players recommend real FC 26 players worth signing. Upvote the best tips.</p>
      ${handle() ? `<details class="cm-new"><summary class="btn btn-small btn-primary">⭐ Share a player</summary>
        <form class="cm-form cm-pick-form" data-cm-form="pick" autocomplete="off">
          <input type="text" name="player" list="known-players" maxlength="40" placeholder="Player (e.g. Kees Smit)" required data-cm-player>
          <div class="cm-pick-facts muted small" data-cm-facts></div>
          <div class="cm-row2">
            <select name="tag" aria-label="What kind of pick">${TAGS.map(([t, label]) => `<option value="${t}">${esc(label)}</option>`).join('')}</select>
            <input type="number" name="price" min="0" step="0.1" placeholder="Price you paid (€M)" aria-label="Price in millions of euros">
          </div>
          <textarea name="note" maxlength="${LIMITS.note}" rows="2" placeholder="Why sign him? (potential, cheap release clause, great at CAM…)" required></textarea>
          <button type="submit" class="btn btn-small btn-primary">Share</button>
        </form></details>` : needHandle()}
      <div class="cm-bar">
        <div class="cm-chips">${[['', 'All']].concat(TAGS).map(([t, label]) => `<button type="button" class="genre-chip${st.pickTag === t ? ' is-on' : ''}" data-cm="tag" data-tag="${t}">${esc(label)}</button>`).join('')}</div>
        <label class="squad-sort">Sort <select data-cm-sort aria-label="Sort picks"><option value="top" ${st.pickSort === 'top' ? 'selected' : ''}>Top</option><option value="new" ${st.pickSort === 'new' ? 'selected' : ''}>New</option></select></label>
      </div>
      ${st.picks == null ? '<p class="muted">Loading…</p>' : list.length ? `<ul class="cm-picks">${list.map((p) => `
        <li class="cm-pick">
          <button type="button" class="cm-vote${st.myVotes.has(p.id) ? ' is-on' : ''}" data-cm="vote" data-id="${esc(p.id)}" aria-pressed="${st.myVotes.has(p.id)}" title="Upvote">▲<span>${Number(p.votes) || 0}</span></button>
          <span class="cm-pick-main">
            <span class="cm-pick-head">${p.ovr ? `<span class="sr-ovr ${ovrBand(p.ovr)}">${esc(p.ovr)}</span>` : ''}<strong>${esc(p.player)}</strong>
              <span class="cm-tag">${esc((TAGS.find(([t]) => t === p.tag) || ['', ''])[1])}</span></span>
            <small class="muted">${esc([p.pos, p.age ? `${p.age} yrs` : '', p.nat, p.club, p.price ? `paid €${p.price}M` : ''].filter(Boolean).join(' · '))}</small>
            <span class="cm-note-text">“${esc(p.note)}”</span>
            <small class="muted">@${esc(p.handle)} ${badge(p.uid)} · ${ago(p.at)}</small>
          </span>
          ${postTools('pick', p)}
        </li>`).join('')}</ul>` : '<p class="muted">No picks yet. Share the first one!</p>'}`;
  }

  function videosView() {
    const V = (FC26.videos && FC26.videos.byType) || {};
    const types = (FC26.modes ? ['manager', 'player'].flatMap((m) => FC26.modes[m].archetypes) : []).filter((a) => (V[a.id] || []).length);
    const type = st.videoType || (types[0] && types[0].id) || 'general';
    const list = V[type] || V.general || [];
    return `
      <p class="muted">Creators playing FC 26 career modes, by challenge type. Videos play in a small window you can keep watching while you use the app.</p>
      <div class="cm-chips">${types.map((a) => `<button type="button" class="genre-chip${type === a.id ? ' is-on' : ''}" data-cm="vtype" data-type="${a.id}">${esc(a.icon)} ${esc(a.name)}</button>`).join('')}</div>
      <div class="yt-list">${list.map((v) => `
        <button type="button" class="yt-card" data-yt="${esc(v.id)}" data-yt-title="${esc(v.title)}">
          <span class="yt-thumb"><img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="yt-len">${esc(v.length)}</span><span class="yt-play" aria-hidden="true">▶</span></span>
          <span class="yt-meta"><strong>${esc(v.title)}</strong><small class="muted">${esc(v.channel)}</small></span>
        </button>`).join('')}</div>`;
  }

  function render() {
    if (!el) return;
    const count = (s) => st.activity.filter((a) => a.section === s).length;
    const tabs = `<div class="seg cm-tabs" role="tablist">${SECTIONS.map(([s, label]) => `<button type="button" role="tab" aria-selected="${st.section === s}" class="${st.section === s ? 'is-on' : ''}" data-cm="section" data-section="${s}">${label}${count(s) ? ` <span class="count">${count(s)}</span>` : ''}</button>`).join('')}</div>`;
    // The weekly challenge and head-to-head explain signing in themselves.
    const blocked = (st.section === 'forum' || st.section === 'picks') && gate();
    let body = blocked || (st.error ? `<p class="login-error">${esc(st.error)}</p>` : '');
    if (!blocked) {
      if (st.section === 'forum') body += forumView();
      else if (st.section === 'picks') body += picksView();
      else if (st.section === 'weekly') body += FC26.weekly.view();
      else if (st.section === 'h2h') body += FC26.duels.view();
      else body += videosView();
    }
    el.innerHTML = `
      <div class="cm-head"><h2>💬 Community</h2><p class="muted">Talk career mode with other players, swap player tips and watch creators.</p></div>
      ${activityView()}
      ${tabs}
      <div class="cm-body panel">${body}</div>`;
    syncDot();
  }

  /** The tab was opened (or the account changed): load what's needed. */
  function show() {
    if (st.section === 'picks' || st.section === 'h2h') markSeen(st.section);
    render();
    if (account().status !== 'signed-in' || !data()) return;
    if (st.section === 'forum' && st.threads == null) loadThreads();
    if (st.section === 'picks' && st.picks == null) loadPicks();
    if (st.section === 'weekly') FC26.weekly.show();
    if (st.section === 'h2h') FC26.duels.show();
  }

  // ---------- 🔔 Activity: replies, upvotes, head-to-head challenges ----------

  const seenGet = () => Object.assign({ threads: {}, picks: {}, duels: [] }, deps.storageGet(SEEN_KEY, {}));
  const seenSet = (v) => deps.storageSet(SEEN_KEY, v);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  let checking = false;

  /** Look for new replies, upvotes and challenges; announce=true notifies about new ones. */
  async function checkActivity(announce) {
    const d = data();
    const uid = me();
    if (!d || !uid || !d.where || checking) return;
    checking = true;
    try {
      const seen = seenGet();
      const first = !seen.init;
      const [threads, picks] = await Promise.all([d.where('forum', 'uid', '==', uid, 50), d.where('picks', 'uid', '==', uid, 100)]);
      if (FC26.duels) await FC26.duels.load();
      const items = [];
      threads.forEach((t) => {
        const n = Number(t.replies) || 0;
        const was = seen.threads[t.id];
        if (was == null || first) seen.threads[t.id] = n;
        else if (n > was) items.push({ key: `t:${t.id}:${n}`, icon: '💬', text: `${plural(n - was, 'new reply', 'new replies')} on “${t.title}”`, section: 'forum', id: t.id });
      });
      picks.forEach((p) => {
        const n = Number(p.votes) || 0;
        const was = seen.picks[p.id];
        if (was == null || first) seen.picks[p.id] = n;
        else if (n > was) items.push({ key: `p:${p.id}:${n}`, icon: '▲', text: `${plural(n - was, 'new upvote', 'new upvotes')} on your ${p.player} pick`, section: 'picks', id: p.id });
      });
      (FC26.duels ? FC26.duels.pending() : []).forEach((x) => {
        if (!seen.duels.includes(x.id)) items.push({ key: `d:${x.id}`, icon: '⚔️', text: `@${x.a.handle} challenged you: ${x.title}`, section: 'h2h', id: x.id });
      });
      seen.init = true;
      seenSet(seen);
      const before = new Set(st.activity.map((a) => a.key));
      const fresh = items.filter((a) => !before.has(a.key));
      st.activity = items;
      if (announce && fresh.length && FC26.subscriptions && FC26.subscriptions.wants('community')) {
        const a = fresh[0];
        FC26.subscriptions.notify(`${a.icon} FC 26 Community`, `${a.text}${fresh.length > 1 ? ` (+${fresh.length - 1} more)` : ''}`, 'fc26-community', '#community');
      }
      if (el && !el.hidden) renderKeepingForms(); else syncDot();
    } catch (e) { /* rules not published yet, or offline: try again later */ }
    checking = false;
  }

  /** Mark what's in a section (or one thread) as seen. */
  function markSeen(section, id) {
    if (!st.activity.length) return;
    const seen = seenGet();
    const done = st.activity.filter((a) => (!section || a.section === section) && (!id || a.id === id));
    if (!done.length) return;
    done.forEach((a) => {
      const n = Number(a.key.split(':')[2]);
      if (a.section === 'forum') seen.threads[a.id] = n;
      if (a.section === 'picks') seen.picks[a.id] = n;
      if (a.section === 'h2h') seen.duels = seen.duels.concat(a.id).slice(-200);
    });
    seenSet(seen);
    st.activity = st.activity.filter((a) => !done.includes(a));
    syncDot();
  }

  function activityView() {
    if (!st.activity.length) return '';
    return `
      <div class="cm-activity panel">
        <div class="cm-activity-head"><strong>🔔 ${plural(st.activity.length, 'new thing', 'new things')} for you</strong>
          <button type="button" class="login-link" data-cm="seen-all">Mark all read</button></div>
        <ul>${st.activity.map((a) => `<li><button type="button" class="cm-act" data-cm="act" data-section="${a.section}" data-id="${esc(a.id)}"><span>${esc(a.icon)}</span> ${esc(a.text)}</button></li>`).join('')}</ul>
      </div>`;
  }

  function syncDot() {
    const dot = document.getElementById('cm-dot');
    if (dot) dot.hidden = !st.activity.length;
  }

  /** Redraw unless someone is typing in a form here. */
  function renderKeepingForms() {
    const typing = el && el.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (typing) syncDot(); else render();
  }

  // ---------- Posting ----------

  async function post(kind, f) {
    const d = data();
    const h = handle();
    const uid = me();
    if (!d || !h) return;
    const now = Date.now();
    if (kind === 'thread') {
      const title = clean(f.title.value, LIMITS.title);
      const body = clean(f.body.value, LIMITS.body);
      if (!title || !body) return;
      const id = await d.add('forum', { title, body, cat: f.cat.value, uid, handle: h, at: now, lastAt: now, replies: 0 });
      const seen = seenGet(); seen.threads[id] = 0; seenSet(seen);
      st.cat = f.cat.value;
      deps.toast('Posted 💬');
      await loadThreads();
    } else if (kind === 'reply') {
      const body = clean(f.body.value, LIMITS.reply);
      if (!body || !st.thread) return;
      await d.add(`forum/${st.thread.id}/replies`, { body, uid, handle: h, at: now });
      await d.set(`forum/${st.thread.id}`, { replies: (Number(st.thread.replies) || 0) + 1, lastAt: now }, true);
      st.thread.replies = (Number(st.thread.replies) || 0) + 1;
      // Your own reply on your own thread isn't news.
      if (st.thread.uid === uid) { const seen = seenGet(); seen.threads[st.thread.id] = st.thread.replies; seenSet(seen); }
      await openThread(st.thread.id);
    } else if (kind === 'pick') {
      const name = clean(f.player.value, 40);
      const note = clean(f.note.value, LIMITS.note);
      if (!name || !note) return;
      const hit = FC26.playerDB && FC26.playerDB.recognise(name);
      const p = hit && hit.player;
      const age = p && p.dob ? FC26.playerDB.ageOn(p.dob, '2025-07-01') : '';
      await d.add('picks', {
        player: p ? p.name : name, pos: (p && p.pos) || '', ovr: (p && p.ovr) || 0, age: age || 0, nat: (p && p.nat) || '', club: (p && p.club) || '',
        tag: f.tag.value, price: Math.max(0, Number(f.price.value) || 0), note, uid, handle: h, at: now, votes: 0,
      }).then((id) => { const seen = seenGet(); seen.picks[id] = 0; seenSet(seen); });
      deps.toast(`Shared ${p ? p.name : name} ⭐`);
      st.pickSort = 'new';
      await loadPicks();
    }
  }

  async function vote(id) {
    const d = data();
    const uid = me();
    const pick = (st.picks || []).find((p) => p.id === id);
    if (!d || !pick) return;
    const on = st.myVotes.has(id);
    // Show it straight away, then save it.
    pick.votes = (Number(pick.votes) || 0) + (on ? -1 : 1);
    if (on) st.myVotes.delete(id); else st.myVotes.add(id);
    render();
    try {
      if (on) await d.remove(`picks/${id}/votes/${uid}`);
      else await d.set(`picks/${id}/votes/${uid}`, { at: Date.now() });
      await d.set(`picks/${id}`, { votes: pick.votes }, true);
    } catch (e) { st.error = fail(e); render(); }
  }

  async function remove(kind, id) {
    const d = data();
    if (!window.confirm('Delete this for everyone?')) return;
    if (kind === 'thread') { await d.remove(`forum/${id}`); st.thread = null; await loadThreads(); }
    if (kind === 'reply') { await d.remove(`forum/${st.thread.id}/replies/${id}`); await openThread(st.thread.id); }
    if (kind === 'pick') { await d.remove(`picks/${id}`); await loadPicks(); }
    deps.toast('Deleted');
  }

  async function report(kind, id) {
    const reason = window.prompt('What’s wrong with it? (rude, spam, not about FC…)');
    if (reason == null) return;
    await data().add('reports', { kind, ref: kind === 'reply' ? `forum/${st.thread.id}/replies/${id}` : `${kind === 'pick' ? 'picks' : 'forum'}/${id}`, reason: clean(reason, 200), uid: me(), at: Date.now() });
    deps.toast('Thanks: reported 🚩');
  }

  // ---------- Events ----------

  async function onClick(e) {
    const b = e.target.closest('[data-cm]');
    if (!b) return;
    const what = b.dataset.cm;
    try {
      if (FC26.weekly.onClick(what)) return;
      if (await FC26.duels.onClick(what, b)) { render(); return; }
      if (what === 'section') { st.section = b.dataset.section; st.error = ''; show(); }
      else if (what === 'seen-all') { markSeen(); render(); }
      else if (what === 'act') {
        st.section = b.dataset.section;
        st.error = '';
        if (st.section === 'forum') { markSeen('forum', b.dataset.id); if (st.threads == null) await loadThreads(); await openThread(b.dataset.id); } else show();
      }
      else if (what === 'signin') document.getElementById('account-btn').click();
      else if (what === 'username') { if (FC26.subscriptions) FC26.subscriptions.open(); }
      else if (what === 'cat') { st.cat = b.dataset.cat; render(); }
      else if (what === 'open') { markSeen('forum', b.dataset.id); await openThread(b.dataset.id); }
      else if (what === 'back') { st.thread = null; st.replies = null; await loadThreads(); }
      else if (what === 'tag') { st.pickTag = b.dataset.tag; render(); }
      else if (what === 'vote') await vote(b.dataset.id);
      else if (what === 'delete') await remove(b.dataset.kind, b.dataset.id);
      else if (what === 'report') await report(b.dataset.kind, b.dataset.id);
      else if (what === 'vtype') { st.videoType = b.dataset.type; render(); }
    } catch (err) { st.error = fail(err); render(); }
  }

  async function onSubmit(e) {
    const f = e.target.closest('[data-cm-form]');
    if (!f) return;
    e.preventDefault();
    if (st.busy) return;
    st.busy = true;
    if (f.dataset.cmForm === 'h2h') await FC26.duels.onSubmit(f.elements);
    else try { await post(f.dataset.cmForm, f.elements); } catch (err) { st.error = fail(err); render(); }
    st.busy = false;
  }

  function onInput(e) {
    // What we know about the player being shared.
    if (!e.target.matches('[data-cm-player]')) return;
    const box = el.querySelector('[data-cm-facts]');
    const hit = FC26.playerDB && FC26.playerDB.recognise(e.target.value);
    const p = hit && hit.player;
    box.textContent = p ? `👤 ${[p.name, p.ovr ? `${p.ovr} OVR` : '', p.pos, p.nat, p.club].filter(Boolean).join(' · ')}` : '';
  }

  function init(d) {
    deps = d;
    el = document.getElementById('view-community');
    if (!el) return;
    el.addEventListener('click', onClick);
    el.addEventListener('submit', onSubmit);
    el.addEventListener('input', onInput);
    el.addEventListener('change', (e) => { if (e.target.matches('[data-cm-sort]')) { st.pickSort = e.target.value; st.picks = null; show(); } });
    // While the site is open, look for replies, upvotes and challenges every few minutes.
    setInterval(() => { if (account().status === 'signed-in') checkActivity(true); }, CHECK_EVERY);
  }

  /** The account changed: forget what was loaded for the old one. */
  let lastUser;
  function onAccount() {
    // Only when who's signed in changes (not on every sync).
    const who = `${account().status}:${me() || ''}`;
    if (who === lastUser) return;
    lastUser = who;
    st.threads = null;
    st.picks = null;
    st.thread = null;
    st.activity = [];
    if (FC26.badges) FC26.badges.reset();
    if (FC26.weekly) FC26.weekly.onAccount();
    if (FC26.duels) FC26.duels.onAccount();
    syncDot();
    if (account().status === 'signed-in') checkActivity(false);
    if (el && !el.hidden) show();
  }

  /** Open a section (e.g. ⚔️ head-to-head from a save). */
  function open(section) {
    st.section = section;
    st.error = '';
    deps.showView('community');
  }

  FC26.community = {
    init, show, onAccount, open, render, clean,
    /** Redraw if the tab is showing (and nobody's typing in it). */
    refresh: () => { if (el && !el.hidden) renderKeepingForms(); },
    checkActivity, CATS, TAGS, SECTIONS };
})(typeof window !== 'undefined' ? window : globalThis);
