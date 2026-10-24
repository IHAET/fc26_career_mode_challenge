/*
 * 🆕 What's new: tells returning players about updates. It pops up once
 * after each new release (not on a first visit, which starts on the intro
 * page and has nothing to catch up on), and "🆕 What's new" in the footer
 * opens it any time.
 *
 * To announce an update, add it to the top of UPDATES with a new id.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const SEEN_KEY = 'fc26-news-seen-v1';

  // Newest first. go: a tab the "Try it" button opens.
  const UPDATES = [
    {
      id: '2026-10-24c', date: '24 October 2026', title: '💻 A Mac app',
      items: ['Download FC26 Challenges for Mac (.dmg) from the footer or 🔔 → Get the app. It has its own window and Dock icon, and opens a built-in copy when you\'re offline.'],
    },
    {
      id: '2026-10-24b', date: '24 October 2026', title: '📰 Match log and your own newspaper',
      items: [
        'Log the score of any match on a save (📰 Matches tab): opponent, home or away, competition, scorers and a quote. It\'s optional, log as many or as few as you like.',
        'Every result gets a newspaper front page written about it: headline, match report, season table, form, top scorers and transfer news.',
        'Add a photo to a match and it becomes the front-page picture. Save the paper as an image to share.',
        'This "What\'s new" notice, so you never miss an update.',
      ],
      go: 'saved',
    },
    {
      id: '2026-10-24a', date: '24 October 2026', title: '👋 A proper welcome page',
      items: ['New players start on an intro page with sign in and sign up, and can look around without an account.'],
    },
    {
      id: '2026-10-23', date: '23 October 2026', title: '🏆 Weekly challenge, ⚔️ head-to-head and more',
      items: [
        'Challenge of the week: same challenge for everyone, a 👑 badge for the winner.',
        'Head-to-head: send a save to a friend and race them side by side.',
        '📸 Season cards for TikTok and Instagram, 🎖️ badges next to usernames.',
        '📲 Install the app on your phone (works offline) and 🔔 alerts for replies, upvotes and challenges.',
      ],
      go: 'community',
    },
    {
      id: '2026-10-22', date: '22 October 2026', title: '🌐 Eight languages',
      items: ['English, Español, Português, Français, Deutsch, Italiano, Română and 中文 from the 🌐 button.'],
    },
    {
      id: '2026-10-21', date: '21 October 2026', title: '💬 Community, 🏆 leaderboards and 📸 proof',
      items: [
        'A forum, player picks with upvotes and a creator video library.',
        'Prove objectives with screenshots and climb the player and country leaderboards.',
        'Read a transfer screenshot to fill in the transfer form, and watch creators in a floating player.',
      ],
    },
  ];

  let deps = null; // { esc, showView, storageGet, storageSet }
  let modal = null;

  const latest = () => UPDATES[0].id;
  const unseen = () => {
    const seen = deps.storageGet(SEEN_KEY, '');
    const at = UPDATES.findIndex((u) => u.id === seen);
    return at < 0 ? UPDATES.slice(0, 1) : UPDATES.slice(0, at);
  };

  function render(showAll) {
    const esc = deps.esc;
    const fresh = unseen();
    const top = showAll || !fresh.length ? UPDATES.slice(0, 1) : fresh;
    const rest = UPDATES.filter((u) => !top.includes(u));
    const block = (u, open) => `
      <details class="news-item" ${open ? 'open' : ''}>
        <summary><strong>${esc(u.title)}</strong><small class="muted">${esc(u.date)}</small></summary>
        <ul>${u.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${u.go ? `<button type="button" class="btn btn-small btn-primary" data-news-go="${esc(u.go)}">Try it →</button>` : ''}
      </details>`;
    modal.querySelector('.news-card').innerHTML = `
      <button type="button" class="icon-btn subs-close" data-news="close" aria-label="Close">✕</button>
      <h2 id="news-title">🆕 What's new</h2>
      ${top.map((u) => block(u, true)).join('')}
      ${rest.length ? `<details class="news-older"><summary class="muted">Earlier updates</summary>${rest.map((u) => block(u, false)).join('')}</details>` : ''}
      <button type="button" class="btn btn-primary news-ok" data-news="close">Got it</button>`;
  }

  function open(showAll) {
    render(showAll);
    modal.hidden = false;
    document.body.classList.add('modal-open');
    const ok = modal.querySelector('.news-ok');
    if (ok) ok.focus();
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    deps.storageSet(SEEN_KEY, latest());
  }

  /** Pop up once the intro, the tour and any dialog are out of the way. */
  function whenClear(fn) {
    const busy = () => document.documentElement.classList.contains('intro-on') || document.querySelector('.tour')
      || document.querySelector('.modal:not([hidden])');
    const tick = () => (busy() ? setTimeout(tick, 1000) : fn());
    setTimeout(tick, 1500);
  }

  function init(d) {
    deps = d;
    modal = document.getElementById('news');
    if (!modal) return;
    // A first visit has nothing to catch up on.
    const brandNew = !deps.storageGet(SEEN_KEY, '') && !deps.storageGet('fc26-challenges-v1', []).length
      && !deps.storageGet('fc26-guest-v1', false) && !deps.storageGet('fc26-signed-in-before-v1', false);
    if (document.documentElement.classList.contains('intro-on') || brandNew) {
      deps.storageSet(SEEN_KEY, latest());
    }
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-news=close]')) close();
      const go = e.target.closest('[data-news-go]');
      if (go) { close(); deps.showView(go.dataset.newsGo); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });
    const link = document.getElementById('news-link');
    if (link) link.addEventListener('click', () => open(true));
    if (unseen().length && deps.storageGet(SEEN_KEY, '') !== latest()) whenClear(() => open(false));
  }

  FC26.whatsNew = { init, open, UPDATES, SEEN_KEY };
})(typeof window !== 'undefined' ? window : globalThis);
