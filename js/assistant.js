/*
 * The transfer assistant: a small rule-based "AI" that runs in the browser
 * with no internet connection.
 *
 * - parseTransfer() reads a sentence like "Signed Florian Wirtz from
 *   Leverkusen for €60m in January" and turns it into a transfer.
 * - precheck() simulates a transfer against the challenge's rules and says
 *   what it would break or complete.
 * - nextSteps() turns broken / pending rules into a to-do list.
 * - signingRules() summarises the rules that apply to signings as chips.
 * Pure logic, no DOM.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const C = FC26.compliance;
  const DB = FC26.playerDB;

  const clone = (x) => JSON.parse(JSON.stringify(x));

  // ---------- Reading a sentence ----------

  const POS_WORDS = [
    [/\b(goal ?keeper|keeper|gk)\b/i, 'GK'],
    [/\b(cent(?:re|er)[- ]?backs?|cb)\b/i, 'CB'],
    [/\b(left[- ]?back|lb)\b/i, 'LB'],
    [/\b(right[- ]?back|rb|full[- ]?back)\b/i, 'RB'],
    [/\b(defensive midfielder|holding midfielder|cdm|dm)\b/i, 'CDM'],
    [/\b(attacking midfielder|playmaker|number ?10|cam)\b/i, 'CAM'],
    [/\b(left[- ]?winger|left wing|lw)\b/i, 'LW'],
    [/\b(right[- ]?winger|right wing|rw|winger)\b/i, 'RW'],
    [/\b(midfielder|cm)\b/i, 'CM'],
    [/\b(striker|cent(?:re|er)[- ]?forward|forward|st|cf)\b/i, 'ST'],
    [/\b(defender)\b/i, 'CB'],
  ];

  const DIRECTIONS = [
    [/\b(loan(?:ed)? out|on loan to|loan(?:ed)? (?:\w+ )?to|sent (?:\w+ )?on loan)\b/i, 'out', 'loan'],
    [/\b(on loan from|loan(?:ed)? in|loan from|borrow(?:ed)?|loan signing|loaned from)\b/i, 'in', 'loan'],
    [/\b(releas(?:e|ed|ing)|let (?:\w+ )?go|terminat(?:e|ed)|mutual consent)\b/i, 'out', 'release'],
    [/\b(promot(?:e|ed|ing)|youth (?:team|intake|graduate)|graduat(?:e|ed)|from the academy)\b/i, 'in', 'promotion'],
    [/\b(sold|sell(?:ing)?|sale|transferr?(?:ed)? to|departed|left for|moved to|cashed in)\b/i, 'out', 'sale'],
  ];
  const IN_WORDS = /\b(sign(?:ed|ing|s)?|bought|buy|brought in|bring in|acquired?|added|landed|captured|snapped up)\b/i;
  const FREE_WORDS = /\b(free transfer|free agent|on a free|for free|for nothing)\b/i;
  const VERBS = /\b(?:signed|signs|sign|bought|buy|sold|sell|released|release|promoted|promote|loaned|loan|brought in|let go of|added|landed|captured)\s+(?:in\s+|out\s+|back\s+)?/i;
  const PARTICLES = new Set(['de', 'da', 'di', 'van', 'von', 'der', 'den', 'ter', 'el', 'al', 'le', 'la', 'dos', 'del', 'mac', 'bin']);
  const STOP = /\s+(?:from|to|for|on|in|at|aged|age|who|with|rated|as|back|out|after)\b|[,.;!?()]|$/;
  const CAPS = /^\p{Lu}/u;

  function parseMoney(numText, unit, hasCurrency) {
    let s = String(numText);
    s = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    const v = parseFloat(s);
    if (!Number.isFinite(v)) return null;
    const u = String(unit || '').toLowerCase();
    if (u.startsWith('b')) return v * 1000;
    if (u.startsWith('m')) return v;
    if (u.startsWith('k') || u.startsWith('t')) return v / 1000;
    if (hasCurrency) return v >= 1000 ? v / 1e6 : v; // "€25" means millions; "€2500000" is euros
    return null;
  }

  function findNationality(text) {
    const words = text.split(/[^\p{L}'’-]+/u).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      const pair = words[i + 1] ? `${words[i]} ${words[i + 1]}` : '';
      if (pair && C.NATIONALITIES.includes(C.normNat(pair)) && CAPS.test(words[i])) return C.normNat(pair);
      if (CAPS.test(words[i]) && C.NATIONALITIES.includes(words[i])) return words[i];
    }
    return '';
  }

  // Longest run of words that names a known player ("Kevin De Bruyne", "Saka").
  function findKnownPlayer(text, skip) {
    const tokens = text.split(/\s+/).map((t) => t.replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, '')).filter(Boolean);
    for (let size = 4; size >= 1; size--) {
      for (let i = 0; i + size <= tokens.length; i++) {
        const words = tokens.slice(i, i + size);
        if (!CAPS.test(words[0]) || !words.every((w) => CAPS.test(w) || PARTICLES.has(w.toLowerCase()))) continue;
        const phrase = words.join(' ');
        if (skip && skip.some((s) => s && s.toLowerCase().includes(phrase.toLowerCase()))) continue;
        const hit = DB.recognise(phrase);
        if (hit && hit.player) return hit.player;
      }
    }
    return null;
  }

  /**
   * Read a transfer sentence. Returns the fields it understood plus `notes`
   * (what it picked up) for the UI. Fields it couldn't find are left empty.
   */
  function parseTransfer(text, options) {
    const opts = options || {};
    const raw = String(text || '').trim();
    const out = { dir: 'in', type: 'permanent', name: '', fee: '', club: '', age: '', ovr: '', nat: '', pos: '', wage: '', window: '', season: '', known: null };
    if (!raw) return out;

    let matched = DIRECTIONS.find(([re]) => re.test(raw));
    if (matched) [, out.dir, out.type] = matched;
    else if (FREE_WORDS.test(raw)) out.type = 'free';
    else if (!IN_WORDS.test(raw) && opts.defaultDir) out.dir = opts.defaultDir;
    if (out.dir === 'out' && out.type === 'permanent') out.type = 'sale';
    if (out.dir === 'in' && out.type === 'permanent' && FREE_WORDS.test(raw)) out.type = 'free';

    const fee = raw.match(/(€|£|\$|eur(?:os?)?\s)\s*([\d.,]+)\s*(m|mil|mill?ions?|bn|billion|k|thousand)?\b/i)
      || raw.match(/\b([\d.,]+)\s*(m|mil|mill?ions?|bn|k|thousand)\b(?!\s*(?:ovr|a week|\/w|per week|pw))/i);
    if (fee) {
      const value = fee.length === 4 ? parseMoney(fee[2], fee[3], true) : parseMoney(fee[1], fee[2], false);
      if (value != null) out.fee = Math.round(value * 100) / 100;
    }
    if (FREE_WORDS.test(raw) && out.fee === '') out.fee = 0;

    const wage = raw.match(/\b(?:on|wages? of|earning|paid)\s*(?:€|£|\$)?\s*([\d.]+)\s*k\s*(?:a|per|\/)?\s*(?:w|wk|week)\b/i);
    if (wage) out.wage = Number(wage[1]);

    const club = out.dir === 'in'
      ? raw.match(new RegExp(`\\bfrom\\s+(\\p{Lu}[\\p{L}\\p{N}.'’&\\- ]*?)(?=${STOP.source})`, 'u'))
      : raw.match(new RegExp(`\\bto\\s+(\\p{Lu}[\\p{L}\\p{N}.'’&\\- ]*?)(?=${STOP.source})`, 'u'));
    if (club) out.club = club[1].trim();

    const age = raw.match(/\b(?:aged|age)\s*(\d{2})\b|\b(\d{2})\s*(?:yo|y\/o|y\.o\.|years? old|-year-old)\b/i);
    if (age) out.age = Number(age[1] || age[2]);
    const ovr = raw.match(/\b(\d{2})\s*(?:ovr|overall|rated)\b|\b(?:rated|ovr)\s*(\d{2})\b/i);
    if (ovr) out.ovr = Number(ovr[1] || ovr[2]);
    if (/\b(january|winter)\b/i.test(raw)) out.window = 'winter';
    else if (/\bsummer\b/i.test(raw)) out.window = 'summer';
    const season = raw.match(/\b(?:season|s)\s?(\d{1,2})\b/i);
    if (season) out.season = Number(season[1]);

    // The player: someone in your squad (for departures), then a known player, then the words after the verb.
    const squad = (opts.squad || []).filter((p) => p && p.name && p.name.trim().length > 1);
    const inSquad = squad.find((p) => raw.toLowerCase().includes(p.name.trim().toLowerCase()));
    const known = findKnownPlayer(raw, [out.club]);
    if (out.dir === 'out' && inSquad) out.name = inSquad.name.trim();
    else if (known) out.name = known.name;
    else if (inSquad) out.name = inSquad.name.trim();
    else {
      const after = raw.split(VERBS)[1] || raw;
      const words = after.split(STOP)[0].split(/\s+/).filter(Boolean);
      // Drop leading descriptions: "Brazilian winger X", "the 19-year-old X".
      while (words.length > 1 && (!CAPS.test(words[0]) || C.NATIONALITIES.includes(C.normNat(words[0])) || POS_WORDS.some(([re]) => re.test(words[0])))) words.shift();
      out.name = words.filter((w) => CAPS.test(w) || PARTICLES.has(w.toLowerCase())).join(' ').slice(0, 40);
    }

    if (known && known.name === out.name) {
      out.known = known;
      out.nat = known.nat;
      out.pos = known.pos;
    }
    const nat = findNationality(raw.replace(out.club, ''));
    if (nat && !out.nat) out.nat = nat;
    if (!out.pos) {
      const pos = POS_WORDS.find(([re]) => re.test(raw.replace(out.name, '')));
      if (pos) [, out.pos] = pos;
    }
    return out;
  }

  // ---------- Checking a move before logging it ----------

  /**
   * What would this transfer do to the challenge? Compares every rule before
   * and after a simulated move. Rules that were already broken only count if
   * the move adds a new problem. Checking many moves against the same
   * tracker? Pass the same `cache` object each time and the "before" is
   * worked out once.
   */
  function precheck(ch, tracker, rec, cache) {
    const c = cache || {};
    if (!c.before) c.before = C.checkChallenge(ch, C.normalizeTracker(clone(tracker)));
    const { before } = c;
    const sim = C.applyTransfer(C.normalizeTracker(clone(tracker)), Object.assign({ id: 'preview' }, rec));
    const after = C.checkChallenge(ch, sim);
    const breaks = [];
    const fixes = [];
    after.forEach((a, i) => {
      const b = before[i];
      if (a.status === 'broken') {
        const fresh = a.details.filter((d) => !b.details.includes(d));
        if (b.status !== 'broken' || fresh.length) breaks.push({ text: a.text, summary: a.summary, details: fresh.length ? fresh : a.details });
      } else if (a.status === 'ok' && (b.status === 'broken' || b.status === 'warn')) {
        fixes.push({ text: a.text, summary: a.summary });
      }
    });
    const manual = after.filter((a) => a.status === 'manual').length;
    return { ok: breaks.length === 0, breaks, fixes, checked: after.length - manual, manual };
  }

  /** Broken rules first, then things still to do, as short to-do items. */
  function nextSteps(ch, tracker) {
    return C.checkChallenge(ch, tracker)
      .filter((r) => r.status === 'broken' || r.status === 'warn')
      .sort((a, b) => (a.status === 'broken' ? 0 : 1) - (b.status === 'broken' ? 0 : 1))
      .map((r) => ({ status: r.status, rule: r.text, summary: r.summary, details: r.details }));
  }

  // ---------- The challenge's rules for signings ----------

  function chipFor(c, t) {
    const m = C.money;
    switch (c.kind) {
      case 'maxFee': return `Fee ≤ ${m(c.max)}`;
      case 'noFees': return 'Frees and loans only';
      case 'maxSignAge': return `Age ≤ ${c.max}`;
      case 'minSignAge': return `Age ≥ ${c.min}`;
      case 'maxSignOvr': return `OVR ≤ ${c.max}`;
      case 'signNat': return `Only ${c.label}`;
      case 'maxSignings': return `Max ${c.max} signing${c.max === 1 ? '' : 's'} per ${c.summerOnly ? 'summer ' : ''}window`;
      case 'noLoansIn': return 'No loan signings';
      case 'oneInOneOut': return 'One in, one out';
      case 'profitWindow': return 'Break even every window';
      case 'profitSeason': return 'Profit every season';
      case 'spendFromSales': {
        const balance = t.transfers.reduce((n, x) => n + (x.dir === 'out' ? 1 : -1) * (Number(x.fee) || 0), 0);
        return `Sales money only: ${m(Math.max(0, balance))} to spend`;
      }
      case 'noLeagueRivals': return 'No signings from league rivals';
      case 'noSignFrom': return `Not from ${c.clubs.join(', ')}`;
      case 'noResign': return 'No re-signing sold players';
      case 'signNatEvery': return `A ${c.nat} signing every ${c.summer ? 'summer' : 'season'}`;
      case 'signOvrEverySummer': return `A ${c.min}+ OVR signing every summer`;
      case 'signFromEvery': return `A ${c.loan ? 'loan' : 'signing'} from ${c.clubs.join(' or ')} every season`;
      case 'wageCap': return `Wages ≤ ${c.max >= 1 ? `€${c.max}K` : `€${Math.round(c.max * 1000)}`}/week`;
      case 'squadSize': return `Squad ≤ ${c.max} (now ${t.players.filter((p) => !p.loanedOut).length})`;
      default: return null;
    }
  }

  /** Short chips for every rule that limits signings, e.g. "Fee ≤ €12M", "Age ≤ 21". */
  function signingRules(ch, tracker) {
    const t = C.normalizeTracker(tracker);
    const chips = [];
    ch.coreRules.concat(ch.rules).forEach((r) => {
      const c = C.interpret(r.text);
      if (!c) return;
      (c.kind === 'all' ? c.checks : [c]).forEach((sub) => {
        const chip = chipFor(sub, t);
        if (chip && !chips.includes(chip)) chips.push(chip);
      });
    });
    return chips;
  }

  FC26.assistant = { parseTransfer, precheck, nextSteps, signingRules };
})(typeof window !== 'undefined' ? window : globalThis);
