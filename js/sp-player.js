/*
 * The soundtrack player: a save's Spotify playlist playing inside the app, in a
 * bar along the bottom that stays put while you move between tabs. It uses
 * Spotify's own embed player (no sign-in needed here; people signed in to
 * Spotify in this browser hear full tracks, others 30-second previews).
 *
 * With auto-play on, opening a save that has a soundtrack starts it. Browsers
 * only let sound start after a click, so it starts from the click that opens
 * the save; if the browser still holds it back, one press of ▶ does it.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const AUTO_KEY = 'fc26-sp-autoplay-v1';
  const API = 'https://open.spotify.com/embed/iframe-api/v1';

  let bar = null;
  let controller = null;
  let current = ''; // playlist id in the bar
  let apiReady = null; // Promise of Spotify's IFrame API (null until first use)

  const autoPlay = () => { try { return root.localStorage.getItem(AUTO_KEY) !== 'off'; } catch (e) { return true; } };
  const setAutoPlay = (on) => { try { root.localStorage.setItem(AUTO_KEY, on ? 'on' : 'off'); } catch (e) { /* stays on */ } };

  /** The playlist id in a Spotify address ("https://open.spotify.com/playlist/ID?si=…"), or ''. */
  function playlistId(url) {
    const m = String(url || '').match(/playlist[/:]([A-Za-z0-9]{10,40})/);
    return m ? m[1] : '';
  }

  function loadApi() {
    if (apiReady) return apiReady;
    apiReady = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), 8000);
      root.onSpotifyIframeApiReady = (IFrameAPI) => { clearTimeout(timer); resolve(IFrameAPI); };
      const s = document.createElement('script');
      s.src = API;
      s.async = true;
      s.onerror = () => { clearTimeout(timer); reject(new Error('blocked')); };
      document.head.appendChild(s);
    });
    apiReady.catch(() => { apiReady = null; });
    return apiReady;
  }

  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'sp-dock';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Soundtrack player');
    bar.innerHTML = `
      <div class="sp-dock-head">
        <span class="sp-dock-title">🎧 <strong></strong></span>
        <label class="sp-dock-auto" title="Start a save's soundtrack when you open it"><input type="checkbox" data-dock="auto"> Auto-play</label>
        <button type="button" class="icon-btn" data-dock="close" aria-label="Close the player">✕</button>
      </div>
      <div class="sp-dock-frame"><div></div></div>`;
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-dock="close"]');
      if (b) close();
    });
    bar.addEventListener('change', (e) => {
      if (e.target.dataset.dock === 'auto') setAutoPlay(e.target.checked);
    });
    document.body.appendChild(bar);
    return bar;
  }

  /** Play a playlist in the bar. `start`: begin playing (from a click). */
  async function play(url, name, start) {
    const id = playlistId(url);
    if (!id) return false;
    ensureBar();
    bar.hidden = false;
    document.body.classList.add('has-dock');
    bar.querySelector('.sp-dock-title strong').textContent = name || 'Soundtrack';
    bar.querySelector('[data-dock="auto"]').checked = autoPlay();
    if (current === id && controller) {
      if (start) controller.resume ? controller.resume() : controller.play();
      return true;
    }
    current = id;
    const frame = bar.querySelector('.sp-dock-frame');
    try {
      const IFrameAPI = await loadApi();
      if (controller) { controller.loadUri(`spotify:playlist:${id}`); if (start) controller.play(); return true; }
      frame.innerHTML = '<div></div>';
      IFrameAPI.createController(frame.firstChild, { uri: `spotify:playlist:${id}`, width: '100%', height: 80 }, (c) => {
        controller = c;
        if (start) c.addListener('ready', () => c.play());
      });
    } catch (e) {
      // No IFrame API (blocked, offline): the plain embed still plays with one press.
      controller = null;
      frame.innerHTML = `<iframe title="Spotify player" src="https://open.spotify.com/embed/playlist/${id}?utm_source=generator" width="100%" height="80" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
    }
    return true;
  }

  function close() {
    if (controller && controller.pause) controller.pause();
    if (bar) bar.hidden = true;
    document.body.classList.remove('has-dock');
  }

  /** A save was opened: play its soundtrack if auto-play is on (and it isn't already playing). */
  function saveOpened(entry) {
    if (!autoPlay() || !entry || !entry.soundtrack || !entry.soundtrack.url) return false;
    if (playlistId(entry.soundtrack.url) === current && bar && !bar.hidden) return false;
    return play(entry.soundtrack.url, entry.soundtrack.name, true);
  }

  FC26.spPlayer = { play, close, saveOpened, autoPlay, setAutoPlay, playlistId };
})(typeof window !== 'undefined' ? window : globalThis);
