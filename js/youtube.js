/*
 * 📺 Watch: YouTube videos of creators playing career modes like a challenge
 * (js/videos.js, one search per challenge type), played in YouTube's embedded
 * player without leaving the app, plus a YouTube search for more.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  const videosFor = (ch) => ((FC26.videos && FC26.videos.byType) || {})[ch && ch.archetype && ch.archetype.id] || [];

  /** A YouTube search for this challenge, for "More on YouTube". */
  function searchUrl(ch) {
    const q = (FC26.videos && FC26.videos.queries && FC26.videos.queries[ch.archetype.id]) || `FC 26 career mode ${ch.archetype.name}`;
    return `https://www.youtube.com/results?${new URLSearchParams({ search_query: q })}`;
  }

  /** The Watch section for a challenge card (HTML), or '' when there's nothing to show. */
  function section(ch, esc) {
    const list = videosFor(ch);
    if (!list.length) return '';
    return `
      <details class="block yt-block">
        <summary><h3>📺 Watch creators play it</h3><span class="muted small">${list.length} videos like ${esc(ch.archetype.name)}</span></summary>
        <div class="yt-player" data-yt-player hidden></div>
        <div class="yt-list">${list.map((v) => `
          <button type="button" class="yt-card" data-yt="${esc(v.id)}" data-yt-title="${esc(v.title)}">
            <span class="yt-thumb"><img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer"><span class="yt-len">${esc(v.length)}</span><span class="yt-play" aria-hidden="true">▶</span></span>
            <span class="yt-meta"><strong>${esc(v.title)}</strong><small class="muted">${esc(v.channel)}</small></span>
          </button>`).join('')}</div>
        <a class="btn btn-small yt-more" href="${esc(searchUrl(ch))}" target="_blank" rel="noopener">🔎 More on YouTube</a>
      </details>`;
  }

  /** Clicks inside a Watch section: play the video in its player. Returns true if handled. */
  function onClick(e) {
    const card = e.target.closest('[data-yt]');
    if (card) {
      const block = card.closest('.yt-block');
      const player = block.querySelector('[data-yt-player]');
      player.hidden = false;
      player.innerHTML = `
        <div class="yt-frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(card.dataset.yt)}?autoplay=1&rel=0" title="${card.dataset.ytTitle.replace(/"/g, '&quot;')}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
        <button type="button" class="btn btn-small" data-yt-close>✕ Close video</button>`;
      block.querySelectorAll('.yt-card').forEach((c) => c.classList.toggle('is-playing', c === card));
      // Stop the soundtrack so the two don't play over each other.
      if (FC26.spPlayer) FC26.spPlayer.close();
      player.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return true;
    }
    const close = e.target.closest('[data-yt-close]');
    if (close) {
      const player = close.closest('[data-yt-player]');
      player.innerHTML = '';
      player.hidden = true;
      player.closest('.yt-block').querySelectorAll('.yt-card').forEach((c) => c.classList.remove('is-playing'));
      return true;
    }
    return false;
  }

  FC26.youtube = { section, onClick, videosFor, searchUrl };
})(typeof window !== 'undefined' ? window : globalThis);
