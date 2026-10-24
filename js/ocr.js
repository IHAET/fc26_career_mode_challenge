/*
 * 📷 Read a transfer screenshot: text recognition (Tesseract.js, loaded from a
 * CDN the first time it's used) reads the picture in the browser, and
 * parseShot() picks out the player, his rating, the fee, the clubs and the
 * rest for the transfer form. Nothing leaves the device except the download
 * of the recogniser itself.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const LIB = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  const LANG = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int';
  const UI_WORDS = /^(main|menu|press|transfer|transfers|club|player|players|fee|sold|signed|offer|value|wage|age|position|overall|rating|contract|loan|free|done|confirm|back|next|squad|team|season|summer|january|winter|total|budget|scout|report|accept|reject|negotiate|complete|completed|news|inbox|home|away|league|cup|young|king|rice|gold|silver|star)$/i;
  const POSITIONS = ['GK', 'RB', 'LB', 'CB', 'RWB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'];

  // ---------- Reading the text ----------

  const money = (cur, num, unit) => {
    let n = Number(String(num).replace(/,/g, ''));
    if (/^\d{1,3}(\.\d{3})+$/.test(num)) n = Number(num.replace(/\./g, '')); // 45.000.000
    const u = String(unit || '').toLowerCase();
    if (/^(m|mil|million)/.test(u)) n *= 1e6;
    else if (/^(k|thousand)/.test(u)) n *= 1e3;
    else if (/^(b|bn)/.test(u)) n *= 1e9;
    return Number.isFinite(n) ? n : null;
  };

  /** Every amount of money in the text: [{ value (in units), index, line }]. */
  function amounts(text) {
    const out = [];
    const re = /(€|£|\$|eur|gbp)\s?(\d{1,3}(?:[,.]\d{3})+|\d+(?:\.\d+)?)\s?(m\b|mil|million|k\b|thousand|bn\b)?/gi;
    let m;
    while ((m = re.exec(text))) {
      const v = money(m[1], m[2], m[3]);
      if (v) out.push({ value: v, index: m.index, text: m[0] });
    }
    return out;
  }

  /**
   * Pick a transfer out of a screenshot's text.
   * opts: { squad: [{ name }] } (your squad, for departures).
   * Returns { dir, type, name, ovr, fee (€M), wage (€K/week), age, pos, club, nat, known, found: [what was read] }.
   */
  function parseShot(text, opts) {
    const DB = FC26.playerDB;
    const o = opts || {};
    const raw = String(text || '').replace(/[|_~`•·]+/g, ' ').replace(/[ \t]+/g, ' ');
    const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const out = { dir: 'in', type: 'permanent', name: '', ovr: '', fee: '', wage: '', age: '', pos: '', club: '', nat: '', known: null, found: [] };

    // The player: the longest run of words that's a known player (your squad first, for departures).
    const squad = (o.squad || []).filter((p) => p && p.name);
    const mine = squad.find((p) => raw.toLowerCase().includes(p.name.toLowerCase()));
    let best = null;
    lines.forEach((line, li) => {
      const words = line.split(/\s+/).map((w) => w.replace(/^[^\p{L}]+|[^\p{L}'’.-]+$/gu, '')).filter(Boolean);
      for (let size = Math.min(4, words.length); size >= 1; size--) {
        for (let i = 0; i + size <= words.length; i++) {
          const phrase = words.slice(i, i + size).join(' ');
          if (phrase.length < 3 || !/^\p{Lu}/u.test(phrase)) continue;
          const hit = DB && DB.recognise(phrase);
          if (!hit || !hit.player) continue;
          // One word alone ("Main", "Rice") only counts for a well-known player and never a screen word.
          if (size === 1 && (!hit.player.curated || UI_WORDS.test(phrase))) continue;
          // Longer names, curated players and names near the top (the heading) win.
          const score = size * 10 + (hit.player.curated ? 6 : 0) + Math.max(0, 6 - li);
          if (!best || score > best.score) best = { score, player: hit.player };
        }
      }
    });
    if (mine && (!best || !best.player.name.toLowerCase().includes(mine.name.toLowerCase().split(' ').pop()))) {
      out.name = mine.name;
      out.found.push(`player ${mine.name} (in your squad)`);
    } else if (best) {
      const p = best.player;
      Object.assign(out, { name: p.name, known: p, nat: p.nat || '', pos: p.pos || '', club: p.club || '', ovr: p.ovr || '' });
      out.found.push(`player ${p.name}`);
    }

    // Leaving or arriving.
    if (/\b(sold|sale|released|release|loaned out|loan out|leaves|departure|outgoing)\b/i.test(raw) || (mine && !/\b(signed|joins|arrival|purchase)\b/i.test(raw))) out.dir = 'out';
    if (/\bloan\b/i.test(raw)) out.type = 'loan';
    else if (/\bfree (transfer|agent)\b/i.test(raw)) out.type = 'free';
    else if (out.dir === 'out') out.type = /releas/i.test(raw) ? 'release' : 'sale';

    // Rating: "OVR 84", "84 OVR", "Overall: 84", or the player's rating in the game.
    const ovr = raw.match(/\b(?:ovr|overall|ova|rating)\s*[:.]?\s*(\d{2})\b/i) || raw.match(/\b(\d{2})\s*(?:ovr|overall|ova)\b/i);
    if (ovr && Number(ovr[1]) >= 40 && Number(ovr[1]) <= 99) { out.ovr = Number(ovr[1]); out.found.push(`OVR ${out.ovr}`); }
    else if (out.ovr) out.found.push(`OVR ${out.ovr} (from the game's ratings)`);

    // Fee: the amount next to "fee", "offer", "transfer", "price"; else the biggest one that isn't a wage.
    const all = amounts(raw);
    const wageAt = /(wage|salary|\/\s?w(?:ee)?k|per week|p\/w|a week)/i;
    // The words around an amount, on its own line.
    const near = (a, re) => {
      const start = raw.lastIndexOf('\n', a.index) + 1;
      const end = raw.indexOf('\n', a.index);
      return re.test(raw.slice(start, end < 0 ? raw.length : end));
    };
    const wages = all.filter((a) => near(a, wageAt));
    const fees = all.filter((a) => !wages.includes(a));
    const fee = fees.find((a) => near(a, /(fee|offer|transfer|price|bid|value|cost|paid|deal)/i)) || fees.sort((a, b) => b.value - a.value)[0];
    if (fee) { out.fee = Math.round((fee.value / 1e6) * 100) / 100; out.found.push(`fee ${fee.text.trim()}`); }
    if (wages[0]) { out.wage = Math.round((wages[0].value / 1e3) * 10) / 10; out.found.push(`wage ${wages[0].text.trim()}/week`); }

    // Age, position, club.
    const age = raw.match(/\bage\s*[:.]?\s*(\d{2})\b/i) || raw.match(/\b(\d{2})\s*(?:yrs|years old|y\/o|yo)\b/i);
    if (age && Number(age[1]) >= 15 && Number(age[1]) <= 45) { out.age = Number(age[1]); out.found.push(`age ${out.age}`); }
    const pos = POSITIONS.find((p) => new RegExp(`\\b${p}\\b`).test(raw));
    if (pos && !out.known) { out.pos = pos; out.found.push(pos); }
    const clubs = ((FC26.generator && FC26.generator.CLUBS) || []).map((c) => c.name)
      .concat(Object.keys((FC26.squads && FC26.squads.clubs) || {}))
      .filter((c, i, list) => c.length >= 4 && list.indexOf(c) === i && raw.toLowerCase().includes(c.toLowerCase()));
    // "From X" / "To X" beats any club mentioned.
    const dirClub = raw.match(new RegExp(`\\b(?:from|to|club)\\s*[:]?\\s*(${clubs.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') || '$^'})`, 'i'));
    const club = dirClub ? clubs.find((c) => c.toLowerCase() === dirClub[1].toLowerCase()) : clubs.sort((a, b) => b.length - a.length)[0];
    if (club) { out.club = club; out.found.push(`club ${club}`); }
    return out;
  }

  // ---------- Recognising the picture ----------

  let libReady = null;
  function loadLib() {
    if (root.Tesseract) return Promise.resolve(root.Tesseract);
    if (libReady) return libReady;
    libReady = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LIB;
      s.onload = () => resolve(root.Tesseract);
      s.onerror = () => { libReady = null; reject(new Error('Couldn’t load the text reader. Check your connection.')); };
      document.head.appendChild(s);
    });
    return libReady;
  }

  /** Bigger, grey and dark-on-light: game screens read much better that way. */
  function prepare(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(2.5, Math.max(1, 2000 / Math.max(img.width, img.height)));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const d = ctx.getImageData(0, 0, c.width, c.height);
        let sum = 0;
        for (let i = 0; i < d.data.length; i += 4) sum += 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
        const dark = sum / (d.data.length / 4) < 128;
        for (let i = 0; i < d.data.length; i += 4) {
          let y = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];
          if (dark) y = 255 - y;
          y = Math.max(0, Math.min(255, (y - 128) * 1.5 + 128));
          d.data[i] = d.data[i + 1] = d.data[i + 2] = y;
        }
        ctx.putImageData(d, 0, 0);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That picture couldn’t be opened.')); };
      img.src = url;
    });
  }

  /** Read a screenshot: { text, ...parseShot fields }. onProgress(0–100) while it works. */
  async function analyze(file, opts) {
    const o = opts || {};
    const T = await loadLib();
    const canvas = await prepare(file);
    const worker = await T.createWorker('eng', 1, {
      langPath: LANG,
      logger: (m) => { if (o.onProgress && m.status === 'recognizing text') o.onProgress(Math.round(m.progress * 100)); },
    });
    try {
      const { data } = await worker.recognize(canvas);
      return Object.assign({ text: data.text }, parseShot(data.text, o));
    } finally {
      worker.terminate();
    }
  }

  FC26.ocr = { analyze, parseShot, amounts };
})(typeof window !== 'undefined' ? window : globalThis);
