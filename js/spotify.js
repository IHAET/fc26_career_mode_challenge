/*
 * Spotify soundtracks: make a playlist for a saved challenge from the genres
 * you listen to most plus genres that fit the save (the club's country, the
 * challenge's mood and the biggest nationalities in your tracked squad).
 *
 * Runs entirely in the browser with Spotify's PKCE sign-in, switched on by
 * FC26.config.spotifyClientId. It uses only endpoints open to apps in
 * development mode since Spotify's February 2026 changes: your top artists
 * (for genres), search by genre (10 results a call) and playlist creation.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  const AUTH = 'https://accounts.spotify.com';
  const API = 'https://api.spotify.com/v1';
  const TOKEN_KEY = 'fc26-spotify-v1';
  const PENDING_KEY = 'fc26-spotify-pending';
  const SCOPES = 'user-top-read user-read-private playlist-read-private playlist-modify-private playlist-modify-public';
  const SEARCH_PAGE = 10; // the most a development-mode app gets per search

  // ---------- Genres that fit a save ----------

  const COUNTRY_GENRES = {
    England: ['britpop', 'uk garage'], Scotland: ['scottish indie', 'celtic'], Wales: ['welsh indie'], Spain: ['flamenco', 'spanish pop'],
    Italy: ['italian pop', 'italian hip hop'], Germany: ['german hip hop', 'german techno'], France: ['french pop', 'french hip hop'],
    Netherlands: ['dutch house', 'nederpop'], Portugal: ['fado', 'pimba'], USA: ['hip hop', 'country'], 'Saudi Arabia': ['khaleeji', 'arabic pop'],
    Belgium: ['belgian techno', 'new beat'], 'Türkiye': ['turkish pop', 'arabesk'], Norway: ['norwegian pop'], Denmark: ['danish pop'],
    Austria: ['austropop'], Brazil: ['sertanejo', 'funk carioca'], Argentina: ['cumbia', 'tango'], Mexico: ['regional mexican'],
    Japan: ['j-pop'], 'South Korea': ['k-pop'], Ireland: ['irish folk'], Greece: ['greek pop'], Poland: ['polish hip hop'],
    Romania: ['manele', 'romanian pop'],
  };
  const NATIONALITY_GENRES = {
    English: 'grime', Spanish: 'reggaeton', Brazilian: 'funk carioca', Argentine: 'cumbia', French: 'french hip hop', German: 'german hip hop',
    Nigerian: 'afrobeats', Ghanaian: 'afrobeats', Senegalese: 'mbalax', Ivorian: 'coupe-decale', Cameroonian: 'makossa', Moroccan: 'rai',
    Algerian: 'rai', Portuguese: 'fado', Dutch: 'dutch house', Italian: 'italian pop', Colombian: 'reggaeton', Mexican: 'regional mexican',
    Jamaican: 'dancehall', Japanese: 'j-pop', 'South Korean': 'k-pop', Norwegian: 'norwegian pop', Swedish: 'swedish pop', Danish: 'danish pop',
    Turkish: 'turkish pop', Scottish: 'scottish indie', Irish: 'irish folk', American: 'hip hop', Serbian: 'turbo folk', Greek: 'greek pop',
    Polish: 'polish hip hop', Austrian: 'austropop', Romanian: 'manele', Congolese: 'soukous', 'South African': 'amapiano', Malian: 'desert blues', Egyptian: 'mahraganat',
  };
  const MOOD_GENRES = {
    'road-to-glory': 'rock', 'youth-revolution': 'indie', moneyball: 'lo-fi', 'fallen-giant': 'soundtrack', homegrown: 'folk',
    'loan-army': 'house', journeyman: 'world', galacticos: 'pop', 'underdog-europe': 'punk', 'one-nation': 'anthem',
    veterans: 'classic rock', 'wonderkid-factory': 'hyperpop', 'club-heritage': 'folk', chaos: 'drum and bass',
    'one-club-legend': 'stadium rock', wonderkid: 'hyperpop', 'hometown-hero': 'indie', 'dream-move': 'pop', globetrotter: 'world',
    'last-line': 'metal', 'goal-machine': 'drill', 'goalscoring-defender': 'hard rock', 'wildcard-career': 'electronic',
  };
  // Genres to pick from when Spotify has none on file for you.
  const STARTER_GENRES = ['pop', 'hip hop', 'rock', 'indie', 'afrobeats', 'latin', 'house', 'drill', 'r&b', 'reggaeton', 'metal', 'k-pop'];

  /** Genres that fit this save, each with why: [{ genre, why }], best first. */
  function saveGenres(entry) {
    const ch = entry.challenge;
    const out = [];
    const add = (genre, why) => { if (genre && !out.some((g) => g.genre === genre)) out.push({ genre, why }); };
    (COUNTRY_GENRES[ch.club.country] || []).slice(0, ch.archetype.id === 'club-heritage' ? 2 : 1)
      .forEach((g) => add(g, `${ch.club.name} play in ${ch.club.country}`));
    add(MOOD_GENRES[ch.archetype.id], `${ch.archetype.name} mood`);
    const counts = {};
    ((entry.tracker && entry.tracker.players) || []).filter((p) => !p.loanedOut && p.nat)
      .forEach((p) => { counts[p.nat] = (counts[p.nat] || 0) + 1; });
    Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4)
      .forEach(([nat, n]) => add(NATIONALITY_GENRES[nat], `${n} ${nat} player${n === 1 ? '' : 's'} in your squad`));
    return out.slice(0, 5);
  }

  // ---------- Sign-in (PKCE) ----------

  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
    set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage off */ } },
    del(key) { try { localStorage.removeItem(key); } catch (e) { /* storage off */ } },
  };
  const clientId = () => (FC26.config && FC26.config.spotifyClientId) || '';
  const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  function randomString(n) {
    const bytes = new Uint8Array(n);
    crypto.getRandomValues(bytes);
    return b64url(bytes).slice(0, n);
  }

  /** Where Spotify sends you back: this page without query, hash or "index.html". */
  function redirectUri() {
    const u = new URL(root.location.href);
    u.hash = '';
    u.search = '';
    u.pathname = u.pathname.replace(/index\.html$/, '');
    return u.toString();
  }

  /** Why Spotify can't be used here, or '' when it can. */
  function unavailableReason() {
    if (!clientId()) return 'setup';
    if (!/^https:$/.test(root.location.protocol) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(root.location.origin)) return 'hosted';
    return '';
  }

  const connected = () => Boolean(store.get(TOKEN_KEY));

  async function connect(entryId) {
    const verifier = randomString(64);
    const state = randomString(16);
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    store.set(PENDING_KEY, { verifier, state, entryId, clientId: clientId(), redirect: redirectUri() });
    root.location.assign(`${AUTH}/authorize?${new URLSearchParams({
      response_type: 'code', client_id: clientId(), scope: SCOPES, redirect_uri: redirectUri(),
      code_challenge_method: 'S256', code_challenge: challenge, state,
      // Always ask, so a connection made before a new permission was added gets it too.
      show_dialog: 'true',
    })}`);
  }

  async function tokenRequest(params) {
    const r = await fetch(`${AUTH}/api/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.error || `Spotify sign-in failed (${r.status})`);
    return j;
  }

  function saveToken(j, id) {
    const old = store.get(TOKEN_KEY) || {};
    store.set(TOKEN_KEY, {
      access: j.access_token, refresh: j.refresh_token || old.refresh, clientId: id || old.clientId, scope: j.scope || old.scope || '',
      expires: Date.now() + ((Number(j.expires_in) || 3600) - 60) * 1000,
    });
  }

  /**
   * On page load: finish a sign-in Spotify just sent us back from.
   * Returns null (nothing to do), { ok, entryId } or { error, entryId }.
   */
  async function handleRedirect() {
    const q = new URLSearchParams(root.location.search);
    if (!q.has('code') && !q.has('error')) return null;
    const pending = store.get(PENDING_KEY);
    store.del(PENDING_KEY);
    root.history.replaceState(null, '', root.location.pathname + root.location.hash);
    const entryId = pending && pending.entryId;
    if (q.get('error')) return { error: q.get('error') === 'access_denied' ? 'Spotify wasn’t connected: you said no on Spotify’s page.' : `Spotify said: ${q.get('error')}`, entryId };
    if (!pending || pending.state !== q.get('state')) return { error: 'That Spotify sign-in had expired. Press Connect Spotify again.', entryId };
    try {
      saveToken(await tokenRequest({
        grant_type: 'authorization_code', code: q.get('code'), redirect_uri: pending.redirect,
        client_id: pending.clientId, code_verifier: pending.verifier,
      }), pending.clientId);
      return { ok: true, entryId };
    } catch (err) {
      return { error: err.message, entryId };
    }
  }

  async function accessToken() {
    const t = store.get(TOKEN_KEY);
    if (!t) throw new Error('Connect Spotify first.');
    if (Date.now() < t.expires) return t.access;
    try {
      saveToken(await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh, client_id: t.clientId || clientId() }));
    } catch (err) {
      store.del(TOKEN_KEY);
      throw new Error('Your Spotify connection expired. Connect again.');
    }
    return store.get(TOKEN_KEY).access;
  }

  async function api(pathname, options) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(`${API}${pathname}`, Object.assign({}, options, {
        headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
      }));
      if (r.status === 401 && attempt === 0) {
        const t = store.get(TOKEN_KEY);
        if (t) store.set(TOKEN_KEY, Object.assign(t, { expires: 0 }));
        continue;
      }
      if (r.status === 429) {
        await new Promise((res) => setTimeout(res, (Number(r.headers.get('retry-after')) || 2) * 1000));
        continue;
      }
      if (r.status === 403) {
        // Say what Spotify said, with the fix for the usual causes.
        const said = await r.text().then((body) => { try { return (JSON.parse(body).error || {}).message || body; } catch (e) { return body; } }).catch(() => '');
        const why = String(said || '').trim().slice(0, 160);
        if (/premium/i.test(why)) throw new Error(`Spotify refused (“${why}”). Spotify only lets apps in development mode work while the app's owner has Spotify Premium.`);
        if (/regist/i.test(why)) throw new Error(`Spotify refused (“${why}”). This Spotify account isn't on the app's user list yet: in the Spotify dashboard open the app, go to Settings → User Management, add the email this account logs in with, then press Disconnect Spotify below and connect again.`);
        throw new Error(`Spotify refused${why ? ` (“${why}”)` : ''}. Press Disconnect Spotify below, connect again and allow everything Spotify asks. If it still happens, check the app's owner has Spotify Premium: Spotify needs that for apps in development mode.`);
      }
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error((j.error && j.error.message) || `Spotify error ${r.status}`);
      }
      return r.status === 204 ? null : r.json();
    }
    throw new Error('Spotify is busy. Try again in a minute.');
  }

  // ---------- Building a playlist ----------

  let topCache = null;

  /** Your most common genres across your top artists, most common first. */
  async function topGenres() {
    if (topCache) return topCache;
    const counts = {};
    for (const range of ['medium_term', 'short_term']) {
      const j = await api(`/me/top/artists?limit=50&time_range=${range}`);
      (j.items || []).forEach((a) => (a.genres || []).forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
      if (Object.keys(counts).length) break;
    }
    topCache = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([g]) => g).slice(0, 10);
    return topCache;
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Create the playlist on the user's account. Returns { url, name, count }. */
  async function buildPlaylist(entry, genres, size) {
    const ch = entry.challenge;
    // A connection without the playlist permissions can't work: start it again.
    const granted = String((store.get(TOKEN_KEY) || {}).scope || '');
    if (granted && !['playlist-modify-private', 'playlist-modify-public'].every((x) => granted.split(' ').includes(x))) {
      store.del(TOKEN_KEY);
      throw new Error('Spotify gave this app fewer permissions than it needs. Connect Spotify again and allow everything it asks.');
    }
    // Say which step Spotify refused.
    const step = (label, p) => p.catch((err) => { throw new Error(`${label}: ${err.message}`); });
    const per = Math.ceil(size / genres.length) + 2;
    const seen = new Set();
    const byArtist = {};
    const lists = [];
    for (const g of genres) {
      const start = Math.floor(Math.random() * 30);
      const picks = [];
      // Search hands out 10 tracks a call, so page on until the genre has its share.
      for (let page = 0; page < Math.min(10, Math.ceil(per / SEARCH_PAGE) + 3) && picks.length < per; page++) {
        const res = await step('Searching for tracks', api(`/search?${new URLSearchParams({ q: `genre:"${g}"`, type: 'track', limit: SEARCH_PAGE, offset: start + page * SEARCH_PAGE })}`));
        const items = (res.tracks && res.tracks.items) || [];
        shuffle(items).forEach((t) => {
          if (!t || !t.uri || seen.has(t.id) || picks.length >= per) return;
          const artist = (t.artists && t.artists[0] && t.artists[0].id) || t.id;
          if ((byArtist[artist] || 0) >= 2) return;
          byArtist[artist] = (byArtist[artist] || 0) + 1;
          seen.add(t.id);
          picks.push(t.uri);
        });
        if (items.length < SEARCH_PAGE) break;
      }
      lists.push(picks);
    }
    // Deal the genres out in turn so the playlist mixes them.
    const uris = [];
    for (let i = 0; uris.length < size && lists.some((l) => l.length > i); i++) lists.forEach((l) => { if (l[i] && uris.length < size) uris.push(l[i]); });
    if (!uris.length) throw new Error('Spotify found no tracks for those genres. Try some others.');
    const name = `FC 26 · ${ch.club.name} · ${ch.archetype.name}`.slice(0, 100);
    const description = `Soundtrack for "${ch.title}" (${ch.difficultyName}). Genres: ${genres.join(', ')}. Made with the FC 26 Career Challenge Builder.`
      .replace(/[\r\n<>]/g, ' ').slice(0, 300);
    const playlist = await step('Creating the playlist', api('/me/playlists', { method: 'POST', body: JSON.stringify({ name, description, public: false }) }));
    for (let i = 0; i < uris.length; i += 100) {
      await step('Adding the tracks', api(`/playlists/${encodeURIComponent(playlist.id)}/items`, { method: 'POST', body: JSON.stringify({ uris: uris.slice(i, i + 100) }) }));
    }
    return { url: (playlist.external_urls && playlist.external_urls.spotify) || `https://open.spotify.com/playlist/${playlist.id}`, name, count: uris.length };
  }

  function disconnect() {
    store.del(TOKEN_KEY);
    topCache = null;
  }

  // ---------- The soundtrack panel on a saved challenge ----------

  const picked = {}; // entry id → Set of chosen genres (kept while the page is open)

  function panelHTML(entry, esc, view) {
    // A playlist already made plays here whatever the connection's state.
    const ready = entry.soundtrack && entry.soundtrack.url
      ? `<div class="sp-ready"><button type="button" class="btn btn-spotify" data-sp="play">▶ Play “${esc(entry.soundtrack.name)}” here</button></div>` : '';
    return ready + panelBody(entry, esc, view);
  }

  function panelBody(entry, esc, view) {
    const why = unavailableReason();
    if (why === 'setup') {
      return `<p class="muted">🎧 Make a Spotify playlist for this save from your favourite genres and ones that fit the club. Spotify isn't set up on this copy of the app yet: whoever hosts it needs to add a Spotify Client ID (see "Accounts and Spotify" in the README).</p>`;
    }
    if (why === 'hosted') return '<p class="muted">🎧 Spotify can only connect from the hosted page (an address starting with https), not from a downloaded file.</p>';
    if (!connected()) {
      return `<p class="muted">Connect Spotify and we'll make a playlist for this save, mixing the genres you play most with ones that fit ${esc(entry.challenge.club.name)} and your squad. It goes into your Spotify library as a private playlist.</p>
        <button type="button" class="btn btn-spotify" data-sp="connect">Connect Spotify</button>`;
    }
    const v = view || {};
    const fromSave = saveGenres(entry);
    const yours = v.top || [];
    // Start with the save's top three and your top two (once they've loaded).
    let chosen = picked[entry.id];
    if (!chosen) {
      chosen = new Set(fromSave.slice(0, 3).map((g) => g.genre).concat(yours.slice(0, 2)));
      if (!v.loading) picked[entry.id] = chosen;
    }
    const chip = (genre, title) => `<button type="button" class="genre-chip${chosen.has(genre) ? ' is-on' : ''}" data-sp="genre" data-genre="${esc(genre)}" aria-pressed="${chosen.has(genre)}"${title ? ` title="${esc(title)}"` : ''}>${esc(genre)}</button>`;
    const extra = Array.from(chosen).filter((g) => !fromSave.some((x) => x.genre === g) && !yours.includes(g));
    const last = entry.soundtrack;
    return `
      <div class="sp-row"><span class="sp-label">From this save</span><div class="chips">${fromSave.map((g) => chip(g.genre, g.why)).join('') || '<span class="muted">Track your squad to add its nationalities.</span>'}</div></div>
      <div class="sp-row"><span class="sp-label">From your listening</span><div class="chips">${v.loading ? '<span class="muted">Loading your top genres…</span>'
        : (yours.length ? yours : STARTER_GENRES).map((g) => chip(g)).join('')}</div></div>
      ${extra.length ? `<div class="sp-row"><span class="sp-label">Yours</span><div class="chips">${extra.map((g) => chip(g)).join('')}</div></div>` : ''}
      <form class="sp-add" data-sp-form>
        <input type="text" name="genre" maxlength="40" placeholder="Add a genre, e.g. jersey club" aria-label="Add a genre">
        <button type="submit" class="btn btn-small">Add</button>
        <label class="sp-size">Tracks <select name="size">${(FC26.subscriptions && FC26.subscriptions.isPro() ? [20, 30, 50, 75, 100] : [20, 30, 50]).map((n) => `<option ${n === (v.size || 30) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      </form>
      ${v.error ? `<p class="neg">${esc(v.error)}</p>` : ''}
      <div class="sp-actions">
        <button type="button" class="btn btn-spotify" data-sp="build" ${chosen.size ? '' : 'disabled'}>${v.building ? 'Making your playlist…' : `🎧 Make the playlist (${chosen.size} genre${chosen.size === 1 ? '' : 's'})`}</button>
        ${last && last.url ? `<a class="btn" href="${esc(last.url)}" target="_blank" rel="noopener">Open “${esc(last.name)}” in Spotify</a>` : ''}
        <button type="button" class="link-btn sp-disconnect" data-sp="disconnect">Disconnect Spotify</button>
      </div>`;
  }

  /**
   * Wire a panel: deps = { esc, toast, findEntry(id), mutateEntry(id, fn) }.
   * Call render(item) to (re)draw the panel inside a saved challenge.
   */
  function createPanel(deps) {
    const views = {}; // entry id → { top, loading, error, building, size }

    function render(item) {
      const box = item.querySelector('[data-soundtrack]');
      const entry = deps.findEntry(item.dataset.id);
      if (!box || !entry) return;
      const v = views[entry.id] || (views[entry.id] = {});
      const fetchTop = !unavailableReason() && connected() && !v.top && !v.loading && !v.failed;
      if (fetchTop) v.loading = true;
      box.innerHTML = panelHTML(entry, deps.esc, v);
      if (fetchTop) {
        topGenres().then((top) => { v.top = top; }).catch((err) => { v.failed = true; v.error = err.message; })
          .then(() => { v.loading = false; render(item); });
      }
    }

    async function onClick(e, item) {
      const el = e.target.closest('[data-sp]');
      if (!el || el.disabled) return false;
      const id = item.dataset.id;
      const v = views[id] || (views[id] = {});
      const action = el.dataset.sp;
      if (action === 'connect') {
        await connect(id);
      } else if (action === 'genre') {
        const set = picked[id] || (picked[id] = new Set());
        if (set.has(el.dataset.genre)) set.delete(el.dataset.genre);
        else if (set.size >= 6) deps.toast('Six genres at most: untick one first');
        else set.add(el.dataset.genre);
        render(item);
      } else if (action === 'play') {
        const entry = deps.findEntry(id);
        if (entry && entry.soundtrack && FC26.spPlayer) FC26.spPlayer.play(entry.soundtrack.url, entry.soundtrack.name, true);
      } else if (action === 'disconnect') {
        disconnect();
        Object.keys(views).forEach((k) => delete views[k]);
        render(item);
        deps.toast('Spotify disconnected');
      } else if (action === 'build') {
        const entry = deps.findEntry(id);
        const size = Number(item.querySelector('[data-sp-form] select').value) || 30;
        Object.assign(v, { building: true, error: '', size });
        render(item);
        try {
          const made = await buildPlaylist(entry, Array.from(picked[id] || []), size);
          deps.mutateEntry(id, (en) => { en.soundtrack = { url: made.url, name: made.name, at: Date.now() }; });
          deps.toast(`🎧 Made "${made.name}" with ${made.count} tracks`);
          if (FC26.spPlayer) FC26.spPlayer.play(made.url, made.name, true);
        } catch (err) {
          v.error = err.message;
        }
        v.building = false;
        render(item);
      }
      return true;
    }

    function onSubmit(e, item) {
      if (!e.target.matches('[data-sp-form]')) return false;
      e.preventDefault();
      const input = e.target.elements.genre;
      const genre = input.value.trim().toLowerCase().replace(/["<>]/g, '');
      const set = picked[item.dataset.id] || (picked[item.dataset.id] = new Set());
      if (genre && set.size < 6) set.add(genre);
      else if (genre) deps.toast('Six genres at most: untick one first');
      render(item);
      const again = item.querySelector('[data-sp-form] input');
      if (again) again.focus();
      return true;
    }

    return { render, onClick, onSubmit };
  }

  FC26.spotify = { saveGenres, redirectUri, unavailableReason, connected, connect, handleRedirect, topGenres, buildPlaylist, disconnect, createPanel, STARTER_GENRES };
})(typeof window !== 'undefined' ? window : globalThis);
