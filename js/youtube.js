/*
 * 📺 Watch: YouTube videos of creators playing career modes like a challenge
 * (js/videos.js, one search per challenge type), played in a small floating
 * window (YouTube's embedded player) that stays on screen while you use the
 * rest of the app, plus a YouTube search for more.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  const videosFor = (ch) => {
    const by = (FC26.videos && FC26.videos.byType) || {};
    const own = by[ch && ch.archetype && ch.archetype.id];
    return own && own.length ? own : by.general || [];
  };

  /** A YouTube search for this challenge, for "More on YouTube". */
  function searchUrl(ch) {
    const q = (FC26.videos && FC26.videos.queries && FC26.videos.queries[ch.archetype.id]) || `FC 26 career mode ${ch.archetype.name}`;
    return `https://www.youtube.com/results?${new URLSearchParams({ search_query: q })}`;
  }

  /** The Watch section for a challenge card (HTML), or '' when there's nothing to show. */
  function section(ch, esc, open) {
    const list = videosFor(ch);
    if (!list.length) return '';
    return `
      <details class="block yt-block"${open ? ' open' : ''}>
        <summary><h3>📺 Watch creators play it</h3><span class="muted small">${list.length} videos like ${esc(ch.archetype.name)} · plays in a small window while you carry on</span></summary>
        <div class="yt-list">${list.map((v) => `
          <button type="button" class="yt-card" data-yt="${esc(v.id)}" data-yt-title="${esc(v.title)}">
            <span class="yt-thumb"><img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="yt-len">${esc(v.length)}</span><span class="yt-play" aria-hidden="true">▶</span></span>
            <span class="yt-meta"><strong>${esc(v.title)}</strong><small class="muted">${esc(v.channel)}</small></span>
          </button>`).join('')}</div>
        <a class="btn btn-small yt-more" href="${esc(searchUrl(ch))}" target="_blank" rel="noopener">🔎 More on YouTube</a>
      </details>`;
  }

  // ---------- The floating player: a small window that stays while you use the app ----------

  let float = null;
  let drag = null;

  function ensureFloat() {
    if (float) return float;
    float = document.createElement('div');
    float.className = 'yt-float';
    float.setAttribute('role', 'region');
    float.setAttribute('aria-label', 'Video player');
    float.innerHTML = `
      <div class="yt-float-bar" data-yt-drag title="Drag to move">
        <span class="yt-float-title"></span>
        <button type="button" class="icon-btn" data-yt-size aria-label="Bigger">⤢</button>
        <button type="button" class="icon-btn" data-yt-close aria-label="Close the video">✕</button>
      </div>
      <div class="yt-frame"></div>`;
    document.body.appendChild(float);
    // Drag by the bar (mouse or finger); the window stays inside the screen.
    const bar = float.querySelector('[data-yt-drag]');
    bar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const r = float.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      bar.setPointerCapture(e.pointerId);
      float.classList.add('is-dragging');
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const w = float.offsetWidth;
      const h = float.offsetHeight;
      const x = Math.max(4, Math.min(root.innerWidth - w - 4, e.clientX - drag.dx));
      const y = Math.max(4, Math.min(root.innerHeight - h - 4, e.clientY - drag.dy));
      Object.assign(float.style, { left: `${x}px`, top: `${y}px`, right: 'auto', bottom: 'auto' });
    });
    const stop = () => { drag = null; float.classList.remove('is-dragging'); };
    bar.addEventListener('pointerup', stop);
    bar.addEventListener('pointercancel', stop);
    return float;
  }

  /** Play a video in the floating window. */
  function play(id, title) {
    ensureFloat();
    float.hidden = false;
    document.body.classList.add('has-video');
    float.querySelector('.yt-float-title').textContent = title || 'Video';
    float.querySelector('.yt-frame').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1" title="${String(title || 'Video').replace(/"/g, '&quot;')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    document.querySelectorAll('.yt-card').forEach((c) => c.classList.toggle('is-playing', c.dataset.yt === id));
    // Stop the soundtrack so the two don't play over each other.
    if (FC26.spPlayer) FC26.spPlayer.close();
  }

  function close() {
    if (!float) return;
    float.querySelector('.yt-frame').innerHTML = '';
    float.hidden = true;
    document.body.classList.remove('has-video');
    document.querySelectorAll('.yt-card.is-playing').forEach((c) => c.classList.remove('is-playing'));
  }

  /** Clicks on video cards and the floating window's buttons. Returns true if handled. */
  function onClick(e) {
    const card = e.target.closest('[data-yt]');
    if (card) {
      play(card.dataset.yt, card.dataset.ytTitle);
      return true;
    }
    if (e.target.closest('[data-yt-close]')) { close(); return true; }
    if (e.target.closest('[data-yt-size]')) {
      float.classList.toggle('is-big');
      return true;
    }
    return false;
  }

  FC26.youtube = { section, onClick, play, close, videosFor, searchUrl };
})(typeof window !== 'undefined' ? window : globalThis);
