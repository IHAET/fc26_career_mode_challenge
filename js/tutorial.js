/*
 * The tour: a few steps that point at each part of the app, shown on a first
 * visit and again from the ❓ button. Each step can switch to a view first and
 * highlights its target; steps whose target isn't on screen are skipped.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const DONE_KEY = 'fc26-tour-v1';

  const STEPS = [
    { title: 'Welcome to the FC 26 Career Challenge Builder 👋', text: "Here's a quick tour of what it does. Skip it if you like: ❓ at the top brings it back any time." },
    { view: 'builder', target: '#options', title: '⚙️ Set it up', text: 'Pick Manager or Player Career, a difficulty, a challenge type or a club. Or leave everything on 🎲 and be surprised.' },
    { view: 'builder', target: '#options button[type=submit]', title: '⚽ Generate a challenge', text: 'You get rules, a season-by-season roadmap and mid-season dramas. Lock 🔒 the parts you like, Reroll the rest, then 💾 Save it.' },
    { target: '.tab[data-view=daily]', title: '📅 The daily challenge', text: 'The same challenge for everyone, every day. Compare with friends, or subscribe to get it in your calendar.' },
    { target: '.tab[data-view=transfers]', title: '🔁 Transfers', text: "Log signings, sales and 🔄 swaps. The assistant reads moves you describe in your own words and checks them against your challenge's rules." },
    { target: '.tab[data-view=saved]', title: '📂 My Challenges', text: "📒 Track it loads your club's squad straight from FC 26. Then tick off objectives, keep a diary, scout wonderkids and make a 🎧 Spotify soundtrack." },
    { target: '.tab[data-view=community]', title: '💬 Community', text: 'Chat in the forum, share and upvote player tips, and watch creators play career modes in a little window while you carry on.' },
    { target: '#subs-btn', title: '🔔 Subscriptions', text: 'Get the daily challenge in your calendar, turn on reminders, follow friends, or go ⭐ Pro.' },
    { target: '#account-btn', title: '👤 Your account', text: 'Sign in to keep your challenges on every device and to follow friends.' },
    { target: '#help-btn', title: "That's the tour!", text: 'Bring it back from here whenever you like. Good luck with the save ⚽' },
  ];

  const store = {
    get: (k) => { try { return root.localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { root.localStorage.setItem(k, v); } catch (e) { /* private mode: the tour just shows again */ } },
  };

  let deps = { showView: () => {} };
  let el = null; // the open tour
  let steps = [];
  let at = 0;
  let returnFocus = null;

  const visible = (node) => {
    if (!node) return false;
    const r = node.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(node).visibility !== 'hidden';
  };
  const targetOf = (step) => (step.target ? document.querySelector(step.target) : null);

  function render() {
    const step = steps[at];
    el.querySelector('.tour-step').textContent = `${at + 1} / ${steps.length}`;
    el.querySelector('#tour-title').textContent = step.title;
    el.querySelector('.tour-text').textContent = step.text;
    el.querySelector('[data-tour=back]').hidden = at === 0;
    el.querySelector('[data-tour=next]').textContent = at === steps.length - 1 ? 'Done' : at === 0 ? 'Start the tour' : 'Next';
    el.querySelector('.tour-dots').innerHTML = steps.map((_, i) => `<span class="${i === at ? 'is-on' : ''}"></span>`).join('');
    const target = targetOf(step);
    if (target) target.scrollIntoView({ block: 'center', inline: 'nearest' });
    place();
    el.querySelector('.tour-card').focus({ preventScroll: true });
  }

  /** Put the highlight on the target and the card next to it, inside the screen. */
  function place() {
    if (!el) return;
    const target = targetOf(steps[at]);
    const spot = el.querySelector('.tour-spot');
    const card = el.querySelector('.tour-card');
    const W = root.innerWidth;
    const H = root.innerHeight;
    const narrow = W < 640;
    card.style.width = narrow ? `${W - 24}px` : '';
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    el.classList.toggle('is-centered', !target);
    if (!target) {
      spot.hidden = true;
      card.style.left = `${Math.max(12, (W - cw) / 2)}px`;
      card.style.top = `${Math.max(12, (H - ch) / 2)}px`;
      return;
    }
    const r = target.getBoundingClientRect();
    const pad = 6;
    // On phones the tab bar sits along the bottom: keep the card above it (unless it's the target).
    const tabs = document.querySelector('.tabs');
    const tr = tabs && tabs.getBoundingClientRect();
    const floor = tr && tr.top > H / 2 && !tabs.contains(target) ? tr.top : H;
    // ...and the header along the top, which stays put while the page scrolls under it.
    const header = document.querySelector('.topbar');
    const hr = header && !header.contains(target) && /sticky|fixed/.test(getComputedStyle(header).position) ? header.getBoundingClientRect() : null;
    const ceiling = hr && hr.top <= 0 ? hr.bottom : 0;
    spot.hidden = false;
    const spotTop = Math.max(4, ceiling + 4, r.top - pad);
    const spotBottom = Math.min(H - 4, r.bottom + pad);
    Object.assign(spot.style, { left: `${r.left - pad}px`, top: `${spotTop}px`, width: `${r.width + pad * 2}px`, height: `${Math.max(0, spotBottom - spotTop)}px` });
    const clampY = (y) => Math.max(12, Math.min(floor - ch - 12, y));
    const below = r.bottom + pad + 12;
    const above = r.top - pad - 12 - ch;
    let left = narrow ? 12 : Math.max(12, Math.min(W - cw - 12, r.left + r.width / 2 - cw / 2));
    let top;
    if (below + ch <= floor - 12) top = below;
    else if (above >= 12) top = above;
    // Too tall to go above or below: beside it on a wide screen, at the bottom on a phone.
    else if (!narrow && r.right + 24 + cw <= W) { left = r.right + 12; top = clampY(r.top); }
    else if (!narrow && r.left - 24 - cw >= 0) { left = r.left - 12 - cw; top = clampY(r.top); }
    else top = clampY(floor - ch - 12);
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function go(i) {
    if (i < 0) return;
    if (i >= steps.length) { finish(); return; }
    at = i;
    const step = steps[at];
    if (step.view) deps.showView(step.view);
    // The view may have changed what's on screen: skip steps whose target isn't there.
    if (step.target && !visible(targetOf(step))) {
      steps.splice(at, 1);
      go(at);
      return;
    }
    render();
  }

  function onKey(e) {
    if (!el) return;
    if (e.key === 'Escape') { e.preventDefault(); finish(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(at - 1); }
  }

  function finish() {
    store.set(DONE_KEY, 'done');
    if (!el) return;
    el.remove();
    el = null;
    document.body.classList.remove('touring');
    root.removeEventListener('resize', place);
    root.removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey);
    if (returnFocus && returnFocus.focus) returnFocus.focus();
  }

  function start() {
    if (el) return;
    returnFocus = document.activeElement;
    steps = STEPS.filter((step) => !step.target || document.querySelector(step.target));
    el = document.createElement('div');
    el.className = 'tour';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'tour-title');
    el.innerHTML = `
      <div class="tour-spot" hidden></div>
      <div class="tour-card" tabindex="-1">
        <div class="tour-step muted"></div>
        <h3 id="tour-title"></h3>
        <p class="tour-text" aria-live="polite"></p>
        <div class="tour-dots" aria-hidden="true"></div>
        <div class="tour-actions">
          <button type="button" class="link-btn tour-skip" data-tour="skip">Skip the tour</button>
          <button type="button" class="btn btn-small" data-tour="back">Back</button>
          <button type="button" class="btn btn-small btn-primary" data-tour="next">Next</button>
        </div>
      </div>`;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tour]');
      if (!b) return;
      if (b.dataset.tour === 'skip') finish();
      else go(at + (b.dataset.tour === 'next' ? 1 : -1));
    });
    document.body.appendChild(el);
    document.body.classList.add('touring');
    root.addEventListener('resize', place);
    root.addEventListener('scroll', place, true);
    document.addEventListener('keydown', onKey);
    go(0);
  }

  /** Set up the ❓ button, and start the tour on a first visit (not when opening a shared challenge). */
  function init(d) {
    deps = Object.assign(deps, d);
    const btn = document.getElementById('help-btn');
    if (btn) btn.addEventListener('click', start);
    const shared = /^#[cx]=/.test(root.location.hash);
    // Wait for any open dialog (the sign-in offer on a first visit) to close first.
    const later = () => {
      if (store.get(DONE_KEY)) return;
      if (document.querySelector('.modal:not([hidden])')) setTimeout(later, 600);
      else start();
    };
    if (!store.get(DONE_KEY) && !shared) setTimeout(later, 700);
  }

  FC26.tutorial = { init, start, finish, STEPS, DONE_KEY, isOpen: () => Boolean(el) };
})(typeof window !== 'undefined' ? window : globalThis);
