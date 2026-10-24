/*
 * The intro page: what someone sees on their first visit, before the app.
 * It explains the app, shows today's daily challenge as a taste, and holds the
 * sign-in / create-account card (drawn by login.js). Signing in or choosing to
 * look around without an account opens the app.
 *
 * Whether it shows is decided before the page paints (a script in index.html
 * adds `intro-on` to <html> unless this device has signed in or looked around
 * before), so the app never flashes up first.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const html = () => document.documentElement;

  let deps = null; // { esc }
  const listeners = [];

  const isOn = () => html().classList.contains('intro-on');

  function teaser() {
    const box = document.querySelector('[data-intro-teaser]');
    if (!box || !FC26.daily) return;
    const ch = FC26.daily.challenge(FC26.daily.dateKey());
    const rules = ch.coreRules.concat(ch.rules).slice(0, 3);
    box.innerHTML = `
      <span class="eyebrow-plain">📅 Today's daily challenge #${ch.daily.number}</span>
      <strong class="intro-teaser-title">${deps.esc(ch.archetype.icon)} ${deps.esc(ch.title)}</strong>
      <small class="muted">${deps.esc(ch.club.name)} · ${deps.esc(ch.difficultyName)} · ${ch.seasons} season${ch.seasons === 1 ? '' : 's'}</small>
      <ul>${rules.map((r) => `<li>${deps.esc(r.text)}</li>`).join('')}</ul>`;
  }

  /** Close the intro and open the app. */
  function hide() {
    if (!isOn()) return;
    html().classList.remove('intro-on');
    root.scrollTo(0, 0);
    listeners.forEach((fn) => fn());
  }

  /** Show the intro again (e.g. from the account menu). */
  function show() {
    teaser();
    html().classList.add('intro-on');
    const el = document.getElementById('intro');
    if (el) el.scrollTop = 0;
  }

  function init(d) {
    deps = d;
    if (isOn()) teaser();
    // The shortcut at the top does what the card's "look around" button does.
    const skip = document.querySelector('[data-intro-skip]');
    if (skip) {
      skip.addEventListener('click', () => {
        const guest = document.querySelector('#intro [data-login=guest]');
        if (guest) guest.click(); else hide();
      });
    }
  }

  FC26.intro = {
    init, isOn, hide, show,
    /** Call fn when the intro closes. */
    onHide: (fn) => listeners.push(fn),
  };
})(typeof window !== 'undefined' ? window : globalThis);
