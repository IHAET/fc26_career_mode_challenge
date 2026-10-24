/*
 * 🔔 Subscriptions: the daily challenge in your calendar or feed reader,
 * reminders, following friends, and ⭐ Pro.
 *
 * - The feeds are static files CI rebuilds every day (scripts/build-feeds.js).
 * - Reminders are browser notifications, shown while the site is open in a tab
 *   (through sw.js, which phones need for notifications; it caches nothing).
 * - Following uses the account backend: profiles/{uid} (readable by signed-in
 *   users), handles/{handle} → { uid } (unique usernames) and follows/{uid}
 *   (who you follow, private). Sharing your challenges is opt-in.
 * - Pro runs on Stripe through Firebase's "Run Payments with Stripe" extension:
 *   checkouts in customers/{uid}/checkout_sessions, plans in
 *   customers/{uid}/subscriptions. Off until FC26.config.pro.price is set.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  const REMIND_KEY = 'fc26-reminders-v1';
  const PRO_KEY = 'fc26-pro-v1'; // last known Pro state, so the colours don't flash on load
  const ACCENT_KEY = 'fc26-accent-v1';
  const SEEN_KEY = 'fc26-friends-seen-v1'; // uid → newest savedAt already seen
  const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
  const MAX_FOLLOWS = 50;
  const MAX_SHARED = 30;
  const ACCENTS = [['', '🟢 Pitch green'], ['gold', '🟡 Gold'], ['blue', '🔵 Ocean'], ['purple', '🟣 Royal'], ['red', '🔴 Derby red']];
  const PERKS = ['⭐ A Pro badge on your profile', '🎨 Five colour themes for the app', '🎧 Spotify soundtracks of 75 or 100 tracks', '❤️ Keeps the app going'];

  let deps = null; // { esc, toast, storageGet, storageSet, entries(), dailySeen(key), shareHash(ch) }
  let account = { status: 'off', user: null };
  let uid = null;
  const st = { profile: null, following: [], feed: [], pro: false, busy: '', error: '', newCount: 0, editing: false };
  let stopPro = null;
  let reminderTimer = null;
  let publishTimer = null;
  let modal = null;
  let worker = null; // service worker registration, for notifications on phones

  const esc = (v) => deps.esc(v == null ? '' : v);
  const data = () => (FC26.account && FC26.account.data && FC26.account.data()) || null;
  const proConfig = () => (FC26.config && FC26.config.pro) || {};
  const proOn = () => Boolean(proConfig().price);
  const isPro = () => st.pro;
  /** Pro-only features are locked: Pro is on sale and this person hasn't got it. */
  const locked = () => proOn() && !st.pro;
  const proListeners = [];
  const proChanged = () => proListeners.forEach((fn) => fn(st.pro));
  // A coupon typed in the Pro section, checked against the configured codes.
  let coupon = null; // { code, promo, says }
  function findCoupon(raw) {
    const code = String(raw || '').trim().toUpperCase();
    const hit = (proConfig().coupons || {})[code];
    return hit ? { code, promo: hit.promo || '', says: hit.says || '' } : null;
  }

  // ---------- Daily challenge feed ----------

  /** Feed addresses: this site's when it's hosted, the configured one otherwise (a downloaded file, localhost). */
  function feedUrls() {
    const hosted = /^https?:$/.test(root.location.protocol) && !/^(localhost|127\.|\[::1\])/.test(root.location.hostname);
    const base = hosted ? `${root.location.origin}${root.location.pathname.replace(/[^/]*$/, '')}` : String((FC26.config && FC26.config.siteUrl) || '').replace(/\/?$/, '/');
    const ics = `${base}feeds/daily.ics`;
    const webcal = ics.replace(/^https?:/, 'webcal:');
    return { ics, webcal, rss: `${base}feeds/daily.xml`, google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}` };
  }

  // ---------- Reminders ----------

  const reminders = () => Object.assign({ daily: false, time: '09:00', friends: false, last: '' }, deps.storageGet(REMIND_KEY, {}));
  const setReminders = (change) => deps.storageSet(REMIND_KEY, Object.assign(reminders(), change));
  const canNotify = () => 'Notification' in root;

  async function registerWorker() {
    if (worker || !('serviceWorker' in navigator) || !/^https?:$/.test(root.location.protocol)) return worker;
    try { worker = await navigator.serviceWorker.register('sw.js'); } catch (e) { worker = null; }
    return worker;
  }

  /** Show a notification; clicking it opens `hash` on the site. False if it couldn't be shown. */
  async function notify(title, body, tag, hash) {
    if (!canNotify() || Notification.permission !== 'granted') return false;
    const url = `${root.location.pathname}${root.location.search}${hash || ''}`;
    try {
      const reg = await registerWorker();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, { body, tag, data: { url } });
        return true;
      }
      const n = new Notification(title, { body, tag });
      n.onclick = () => { root.focus(); if (hash) root.location.hash = hash; n.close(); };
      return true;
    } catch (e) {
      return false;
    }
  }

  /** Remind at the chosen time each day, unless today's challenge was already opened. */
  function scheduleReminder() {
    clearTimeout(reminderTimer);
    const r = reminders();
    if (!r.daily || !FC26.daily) return;
    const [h, m] = String(r.time || '09:00').split(':').map(Number);
    const now = new Date();
    const at = new Date(now);
    at.setHours(h || 0, m || 0, 0, 0);
    if (at <= now) at.setDate(at.getDate() + 1);
    reminderTimer = setTimeout(async () => {
      const key = FC26.daily.dateKey(new Date());
      const again = reminders();
      if (again.daily && again.last !== key && !deps.dailySeen(key)) {
        const ch = FC26.daily.challenge(key);
        if (await notify("📅 Today's FC 26 challenge is ready", `Daily #${ch.daily.number}: ${ch.title}`, 'fc26-daily', '#daily')) setReminders({ last: key });
      }
      scheduleReminder();
    }, Math.min(at - now, 2147000000));
  }

  async function askPermission() {
    if (!canNotify()) return 'unsupported';
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) { /* old Safari: callback form only */ }
    }
    return Notification.permission;
  }

  // ---------- Following ----------

  async function loadMine() {
    const d = data();
    if (!d || !uid) return;
    try {
      const [profile, follows] = await Promise.all([d.get(`profiles/${uid}`), d.get(`follows/${uid}`)]);
      st.profile = profile;
      st.following = follows && Array.isArray(follows.uids) ? follows.uids.slice(0, MAX_FOLLOWS) : [];
      st.error = '';
    } catch (e) {
      st.error = friendlyError(e);
    }
  }

  function friendlyError(e) {
    const code = (e && e.code) || '';
    if (/permission-denied/.test(code) || /insufficient permissions/i.test(String(e && e.message))) {
      return "The database refused that. If you run this copy of the app, publish the latest firestore.rules in Firebase (see the README).";
    }
    if (/unavailable|network/i.test(code)) return 'No connection. Check your internet and try again.';
    return (e && e.message) || 'Something went wrong. Try again.';
  }

  /** What a follower sees of one saved challenge. */
  async function summary(e) {
    const ch = e.challenge;
    const total = ch.roadmap.reduce((n, s) => n + s.objectives.length, 0) + 1;
    let link = '';
    try { link = await deps.shareHash(ch); } catch (err) { link = ''; }
    return {
      id: String(e.id), title: String(ch.title).slice(0, 120), club: String(ch.club.name).slice(0, 60), mode: ch.mode === 'player' ? 'player' : 'manager',
      difficulty: String(ch.difficultyName || ''), icon: String(ch.archetype.icon || '⚽'), seasons: Number(ch.seasons) || 0,
      done: Object.values(e.progress || {}).filter(Boolean).length, total, savedAt: Number(e.savedAt) || 0,
      link: link.length <= 3000 ? link : '',
    };
  }

  async function publish() {
    const d = data();
    if (!d || !uid || !st.profile) return;
    const shared = Boolean(st.profile.shared);
    const challenges = shared ? await Promise.all(deps.entries().slice(0, MAX_SHARED).map(summary)) : [];
    st.profile = Object.assign({}, st.profile, { challenges, pro: st.pro, updated: Date.now() });
    await d.set(`profiles/${uid}`, st.profile);
  }

  async function claimHandle(raw, name) {
    const d = data();
    const handle = String(raw || '').trim().toLowerCase().replace(/^@/, '');
    if (!HANDLE_RE.test(handle)) throw new Error('Usernames are 3 to 20 letters, numbers or _.');
    const mine = st.profile && st.profile.handle;
    if (handle !== mine) {
      const taken = await d.get(`handles/${handle}`);
      if (taken && taken.uid !== uid) throw new Error(`@${handle} is taken. Try another.`);
      try {
        if (!taken) await d.set(`handles/${handle}`, { uid });
      } catch (e) {
        throw new Error(/permission/i.test(String(e.code || e.message)) ? `@${handle} is taken. Try another.` : friendlyError(e));
      }
      if (mine) await d.remove(`handles/${mine}`).catch(() => {});
    }
    st.profile = Object.assign({ shared: false, challenges: [] }, st.profile, { handle, name: String(name || '').trim().slice(0, 40), pro: st.pro, updated: Date.now() });
    await d.set(`profiles/${uid}`, st.profile);
  }

  async function follow(raw) {
    const d = data();
    const handle = String(raw || '').trim().toLowerCase().replace(/^@/, '');
    if (!HANDLE_RE.test(handle)) throw new Error('Type their username, e.g. @gaffer99.');
    const hit = await d.get(`handles/${handle}`);
    if (!hit || !hit.uid) throw new Error(`Nobody is called @${handle}.`);
    if (hit.uid === uid) throw new Error("That's you!");
    if (st.following.includes(hit.uid)) throw new Error(`You already follow @${handle}.`);
    if (st.following.length >= MAX_FOLLOWS) throw new Error(`You can follow up to ${MAX_FOLLOWS} people.`);
    st.following = st.following.concat(hit.uid);
    await d.set(`follows/${uid}`, { uids: st.following });
    return handle;
  }

  async function unfollow(who) {
    const d = data();
    st.following = st.following.filter((x) => x !== who);
    st.feed = st.feed.filter((f) => f.uid !== who);
    await d.set(`follows/${uid}`, { uids: st.following });
  }

  /** Everyone you follow with their shared challenges; counts (and announces) new ones. */
  async function refreshFeed(announce) {
    const d = data();
    if (!d || !uid) return;
    const profiles = await Promise.all(st.following.map((who) => d.get(`profiles/${who}`).then((p) => p && Object.assign({ uid: who }, p)).catch(() => null)));
    st.feed = profiles.filter(Boolean);
    const seen = deps.storageGet(SEEN_KEY, {});
    const fresh = [];
    st.feed.forEach((f) => {
      const newest = Math.max(0, ...(f.challenges || []).map((c) => Number(c.savedAt) || 0));
      if (seen[f.uid] && newest > seen[f.uid]) fresh.push(...(f.challenges || []).filter((c) => c.savedAt > seen[f.uid]).map((c) => [f, c]));
      if (!seen[f.uid] || announce === 'seen') seen[f.uid] = newest || 1;
    });
    st.newCount = fresh.length;
    if (announce === 'seen') st.newCount = 0;
    deps.storageSet(SEEN_KEY, seen);
    syncDot();
    if (announce === true && fresh.length && reminders().friends) {
      const [f, c] = fresh[0];
      notify(`👥 @${f.handle} saved a new challenge`, `${c.icon} ${c.title}${fresh.length > 1 ? ` (+${fresh.length - 1} more)` : ''}`, 'fc26-friends', '');
    }
  }

  // ---------- Pro ----------

  function applyAccent() {
    proChanged();
    const accent = st.pro ? deps.storageGet(ACCENT_KEY, '') : '';
    if (accent) document.documentElement.dataset.accent = accent;
    else delete document.documentElement.dataset.accent;
  }

  function watchPro() {
    if (stopPro) stopPro();
    stopPro = null;
    const d = data();
    if (!d || !uid || !proOn()) return;
    stopPro = d.watchAll(`customers/${uid}/subscriptions`, (subs) => {
      const was = st.pro;
      st.pro = subs.some((s) => s.status === 'active' || s.status === 'trialing');
      deps.storageSet(PRO_KEY, st.pro);
      applyAccent();
      if (was !== st.pro && st.profile) publish().catch(() => {});
      render();
    });
  }

  /** Start a Stripe Checkout for the Pro price (the extension writes back its address). */
  async function checkout() {
    const d = data();
    const here = `${root.location.origin}${root.location.pathname}`;
    // A coupon from the app is applied up front; otherwise Stripe's page has a box for one.
    const session = { price: proConfig().price, mode: 'subscription', success_url: `${here}#pro=welcome`, cancel_url: here };
    if (coupon && coupon.promo) session.promotion_code = coupon.promo;
    else session.allow_promotion_codes = true;
    const id = await d.add(`customers/${uid}/checkout_sessions`, session);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { stop(); reject(new Error("Checkout didn't start. If you run this copy of the app, check the Stripe extension in Firebase.")); }, 25000);
      const stop = d.watch(`customers/${uid}/checkout_sessions/${id}`, (s) => {
        if (s && s.url) { clearTimeout(timer); stop(); root.location.assign(s.url); resolve(); }
        if (s && s.error) { clearTimeout(timer); stop(); reject(new Error(s.error.message || 'Checkout failed.')); }
      });
    });
  }

  async function portal() {
    const res = await data().call('ext-firestore-stripe-payments-createPortalLink', { returnUrl: `${root.location.origin}${root.location.pathname}`, locale: 'auto' }, proConfig().region);
    root.location.assign(res.url);
  }

  // ---------- The panel ----------

  function syncDot() {
    const dot = document.getElementById('subs-dot');
    if (dot) dot.hidden = !st.newCount;
  }

  function feedSection() {
    const u = feedUrls();
    return `
      <section class="subs-sec">
        <h3>📅 Daily challenge feed</h3>
        <p class="muted">Every day's new challenge, straight into your calendar or feed reader. Free, no account needed.</p>
        <div class="subs-actions">
          <a class="btn btn-small btn-primary" href="${esc(u.google)}" target="_blank" rel="noopener">📆 Google Calendar</a>
          <a class="btn btn-small" href="${esc(u.webcal)}">🍎 Apple / Outlook</a>
          <a class="btn btn-small" href="${esc(u.rss)}" target="_blank" rel="noopener">📰 RSS feed</a>
          <button type="button" class="btn btn-small" data-subs="copy">🔗 Copy calendar link</button>
        </div>
      </section>`;
  }

  function remindSection() {
    const r = reminders();
    const perm = canNotify() ? Notification.permission : 'unsupported';
    const note = perm === 'unsupported' ? "This browser can't show notifications. On an iPhone, add the site to your Home Screen first."
      : perm === 'denied' ? 'Notifications are blocked for this site: allow them in your browser’s site settings, then come back.'
        : 'They come as notifications while the site is open in a tab (it can be in the background).';
    return `
      <section class="subs-sec">
        <h3>🔔 Reminders</h3>
        <label class="toggle"><input type="checkbox" data-subs-field="daily" ${r.daily ? 'checked' : ''} ${perm === 'unsupported' ? 'disabled' : ''}>
          Remind me about the daily challenge at <input type="time" class="subs-time" data-subs-field="time" value="${esc(r.time)}" aria-label="Reminder time"></label>
        <label class="toggle"><input type="checkbox" data-subs-field="friends" ${r.friends ? 'checked' : ''} ${perm === 'unsupported' ? 'disabled' : ''}>
          Tell me when someone I follow saves a challenge</label>
        <p class="muted small">${esc(note)}</p>
        ${perm === 'granted' ? '<button type="button" class="btn btn-small" data-subs="test">Send a test</button>' : ''}
      </section>`;
  }

  function friendCard(f) {
    const list = (f.challenges || []).slice(0, 3);
    return `
      <li class="friend">
        <div class="friend-head">
          <span class="avatar">${esc(String(f.name || f.handle || '?').slice(0, 1).toUpperCase())}</span>
          <span class="friend-name"><span><strong>@${esc(f.handle)}</strong>${f.pro ? ' <span class="pro-badge">⭐ PRO</span>' : ''}</span>
            <small class="muted">${esc(f.name || '')}${f.shared ? ` · ${(f.challenges || []).length} challenge${(f.challenges || []).length === 1 ? '' : 's'}` : ' · not sharing yet'}</small></span>
          <button type="button" class="btn btn-small" data-subs="unfollow" data-uid="${esc(f.uid)}">Unfollow</button>
        </div>
        ${list.length ? `<ul class="friend-list">${list.map((c) => `
          <li><span class="fc-icon">${esc(c.icon)}</span><span class="fc-main"><strong>${esc(c.title)}</strong>
            <small class="muted">${esc([c.difficulty, c.mode === 'player' ? 'Player Career' : '', `${c.done}/${c.total} ✅`].filter(Boolean).join(' · '))}</small></span>
            ${c.link ? `<button type="button" class="btn btn-small" data-subs="open" data-link="${esc(c.link)}">Open</button>` : ''}</li>`).join('')}</ul>` : ''}
      </li>`;
  }

  function followSection() {
    let body;
    if (account.status === 'off') body = '<p class="muted">Following needs accounts, which aren’t switched on for this copy of the app.</p>';
    else if (account.status === 'loading') body = '<p class="muted">Connecting…</p>';
    else if (account.status !== 'signed-in') body = '<p class="muted">Follow friends to see the challenges they save, and share yours.</p><button type="button" class="btn btn-small btn-primary" data-subs="signin">👤 Sign in</button>';
    else if (!st.profile || !st.profile.handle || st.editing) {
      body = `
        <p class="muted">${st.profile && st.profile.handle ? 'Change your username.' : 'Pick a username so friends can find you.'}</p>
        <form class="subs-form" data-subs-form="handle">
          <label class="field"><span>Username</span><input name="handle" maxlength="21" placeholder="@gaffer99" value="${esc(st.profile && st.profile.handle ? `@${st.profile.handle}` : '')}" autocomplete="off" required></label>
          <label class="field"><span>Name (optional)</span><input name="name" maxlength="40" placeholder="What friends see" value="${esc((st.profile && st.profile.name) || (account.user && account.user.name) || '')}"></label>
          <button type="submit" class="btn btn-small btn-primary">Save</button>
        </form>`;
    } else {
      body = `
        <div class="me-row"><span>You're <strong>@${esc(st.profile.handle)}</strong>${st.pro ? ' <span class="pro-badge">⭐ PRO</span>' : ''}</span>
          <button type="button" class="login-link" data-subs="edit">Change</button></div>
        <label class="toggle"><input type="checkbox" data-subs-field="shared" ${st.profile.shared ? 'checked' : ''}> Share my saved challenges with people who follow me</label>
        <form class="subs-form subs-inline" data-subs-form="follow">
          <input name="handle" maxlength="21" placeholder="Follow someone: @username" aria-label="Username to follow" autocomplete="off">
          <button type="submit" class="btn btn-small btn-primary">Follow</button>
        </form>
        ${st.feed.length ? `<ul class="friends">${st.feed.map(friendCard).join('')}</ul>`
    : `<p class="muted small">${st.following.length ? 'Loading…' : 'You don’t follow anyone yet.'}</p>`}`;
    }
    return `<section class="subs-sec"><h3>👥 Following</h3>${body}</section>`;
  }

  function proSection() {
    let body;
    if (!proOn()) body = '<p class="muted small">Pro isn’t switched on for this copy of the app yet.</p>';
    else if (account.status !== 'signed-in') body = '<button type="button" class="btn btn-small btn-primary" data-subs="signin">👤 Sign in to go Pro</button>';
    else if (st.pro) {
      const accent = deps.storageGet(ACCENT_KEY, '');
      body = `
        <p><strong>You're Pro ⭐ Thank you!</strong></p>
        <div class="accents" role="radiogroup" aria-label="Colour theme">${ACCENTS.map(([id, label]) => `
          <button type="button" class="accent-chip${accent === id ? ' is-on' : ''}" data-subs="accent" data-accent="${id}" role="radio" aria-checked="${accent === id}">${esc(label)}</button>`).join('')}</div>
        <button type="button" class="btn btn-small" data-subs="portal">Manage or cancel</button>`;
    } else {
      body = `
        <form class="subs-form subs-inline" data-subs-form="coupon">
          <input type="text" name="code" maxlength="30" placeholder="Coupon code" aria-label="Coupon code" value="${esc(coupon ? coupon.code : '')}" autocomplete="off">
          <button type="submit" class="btn btn-small">Apply</button>
        </form>
        ${coupon ? `<p class="coupon-ok">🎟️ <strong>${esc(coupon.code)}</strong>: ${esc(coupon.says)}</p>` : ''}
        <button type="button" class="btn btn-small btn-pro" data-subs="checkout">⭐ Go Pro${proConfig().label ? ` · ${esc(proConfig().label)}` : ''}${coupon ? ` (${esc(coupon.says)})` : ''}</button>
        <p class="muted small">Paid monthly through Stripe. Cancel any time.</p>`;
    }
    return `
      <section class="subs-sec subs-pro">
        <h3>⭐ Pro</h3>
        <ul class="perks">${PERKS.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        ${body}
      </section>`;
  }

  function render() {
    if (!modal || modal.hidden) return;
    modal.querySelector('.subs-card').innerHTML = `
      <button type="button" class="icon-btn subs-close" data-subs="close" aria-label="Close">✕</button>
      <h2 id="subs-title">🔔 Subscriptions</h2>
      ${st.error ? `<p class="login-error">${esc(st.error)}</p>` : ''}
      ${st.busy ? `<p class="muted small">${esc(st.busy)}</p>` : ''}
      ${feedSection()}${remindSection()}${followSection()}${proSection()}`;
  }

  async function act(label, fn) {
    st.busy = label;
    st.error = '';
    render();
    try {
      await fn();
    } catch (e) {
      st.error = e && e.message ? e.message : friendlyError(e);
    }
    st.busy = '';
    render();
  }

  function open() {
    modal.hidden = false;
    document.body.classList.add('modal-open');
    render();
    modal.querySelector('.subs-close').focus();
    if (account.status === 'signed-in') act('', async () => { await loadMine(); await refreshFeed('seen'); });
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    st.editing = false;
    const btn = document.getElementById('subs-btn');
    if (btn) btn.focus();
  }

  function onClick(e) {
    if (e.target === modal) return close();
    const b = e.target.closest('[data-subs]');
    if (!b) return undefined;
    switch (b.dataset.subs) {
      case 'close': return close();
      case 'signin': close(); return document.getElementById('account-btn').click();
      case 'copy':
        return navigator.clipboard.writeText(feedUrls().ics).then(() => deps.toast('Calendar link copied 🔗'), () => deps.toast(feedUrls().ics));
      case 'test':
        return notify('🔔 Reminders are on', "This is what a reminder looks like. See you for today's challenge!", 'fc26-test', '#daily')
          .then((ok) => deps.toast(ok ? 'Sent a test notification' : "Couldn't show a notification in this browser"));
      case 'edit': st.editing = true; return render();
      case 'open':
        close();
        root.location.hash = b.dataset.link;
        return undefined;
      case 'unfollow': return act('', () => unfollow(b.dataset.uid));
      case 'accent':
        deps.storageSet(ACCENT_KEY, b.dataset.accent);
        applyAccent();
        return render();
      case 'checkout': return act('Opening Stripe checkout…', checkout);
      case 'portal': return act('Opening your subscription…', portal);
      default: return undefined;
    }
  }

  async function onChange(e) {
    const field = e.target.dataset.subsField;
    if (!field) return;
    if (field === 'daily' || field === 'friends') {
      const on = e.target.checked;
      if (on && (await askPermission()) !== 'granted') {
        e.target.checked = false;
        render();
        deps.toast('Allow notifications for this site to get reminders');
        return;
      }
      setReminders({ [field]: on });
      if (on) registerWorker();
      scheduleReminder();
      deps.toast(on ? (field === 'daily' ? `I'll remind you at ${reminders().time} 🔔` : "I'll tell you when friends save a challenge 👥") : 'Reminder off');
      render();
    } else if (field === 'time') {
      setReminders({ time: e.target.value || '09:00' });
      scheduleReminder();
    } else if (field === 'shared') {
      const on = e.target.checked;
      act(on ? 'Sharing your challenges…' : '', async () => {
        st.profile = Object.assign({}, st.profile, { shared: on });
        await publish();
        deps.toast(on ? 'Your followers can now see your challenges 👥' : 'Your challenges are private again');
      });
    }
  }

  function onSubmit(e) {
    const kind = e.target.dataset.subsForm;
    if (!kind) return;
    e.preventDefault();
    const f = e.target.elements;
    if (kind === 'handle') {
      act('Saving…', async () => {
        await claimHandle(f.handle.value, f.name.value);
        st.editing = false;
        deps.toast(`You're @${st.profile.handle} 👋`);
      });
    } else if (kind === 'coupon') {
      const hit = findCoupon(f.code.value);
      if (!f.code.value.trim()) { coupon = null; render(); return; }
      if (!hit) { st.error = `"${f.code.value.trim()}" isn't a valid code.`; coupon = null; render(); return; }
      if (!hit.promo) { st.error = `${hit.code} isn't active yet.`; coupon = null; render(); return; }
      st.error = '';
      coupon = hit;
      deps.toast(`🎟️ ${hit.code}: ${hit.says}`);
      render();
    } else if (kind === 'follow') {
      act('Looking them up…', async () => {
        const handle = await follow(f.handle.value);
        await refreshFeed('seen');
        deps.toast(`Following @${handle} 👥`);
      });
    }
  }

  // ---------- Wiring ----------

  /** The app calls this when the account state changes. */
  function onAccount(state) {
    account = state || { status: 'off', user: null };
    const next = account.status === 'signed-in' && account.user ? account.user.uid : null;
    // The remembered Pro state only bridges the moment the account takes to load.
    if (!next && account.status !== 'loading' && st.pro) {
      st.pro = false;
      deps.storageSet(PRO_KEY, false);
      applyAccent();
    }
    if (next !== uid) {
      uid = next;
      st.profile = null;
      st.following = [];
      st.feed = [];
      st.newCount = 0;
      if (!uid) {
        st.pro = false;
        if (stopPro) stopPro();
        stopPro = null;
        deps.storageSet(PRO_KEY, false);
        applyAccent();
        syncDot();
      } else {
        watchPro();
        loadMine().then(() => refreshFeed(false)).then(render).catch(() => {});
      }
    }
    render();
  }

  /** The app calls this after every save: shared challenges follow along. */
  function savesChanged() {
    if (!st.profile || !st.profile.shared) return;
    clearTimeout(publishTimer);
    publishTimer = setTimeout(() => publish().catch(() => {}), 3000);
  }

  function init(d) {
    deps = d;
    modal = document.getElementById('subs');
    const btn = document.getElementById('subs-btn');
    if (!modal || !btn) return;
    btn.addEventListener('click', open);
    modal.addEventListener('click', onClick);
    modal.addEventListener('change', onChange);
    modal.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });
    // The last known Pro state, until the account says otherwise.
    st.pro = proOn() && deps.storageGet(PRO_KEY, false) === true;
    applyAccent();
    scheduleReminder();
    if (reminders().daily || reminders().friends) registerWorker();
    // Back from Stripe Checkout.
    if (root.location.hash === '#pro=welcome') {
      root.history.replaceState(null, '', root.location.pathname + root.location.search);
      deps.toast('Welcome to Pro ⭐ It can take a few seconds to show.');
    }
    // New challenges from people you follow, every 10 minutes while the site is open.
    setInterval(() => { if (uid && st.following.length) refreshFeed(true).catch(() => {}); }, 600000);
  }

  FC26.subscriptions = {
    init, onAccount, savesChanged, isPro, locked, feedUrls, open, findCoupon, ACCENTS, HANDLE_RE,
    /** Your profile (username, name), once loaded, or null. */
    profile: () => st.profile,
    /** Call fn(isPro) whenever Pro starts or stops. */
    onProChange: (fn) => proListeners.push(fn),
  };
})(typeof window !== 'undefined' ? window : globalThis);
