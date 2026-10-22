/*
 * Rule checker for the season tracker. Pure logic, no DOM.
 *
 * Rules are plain sentences (generated, heritage or typed by the player),
 * so the checker reads the sentence: each matcher below recognises one kind
 * of rule and pulls out its numbers ("No single transfer fee above €12M" →
 * fee cap 12). The matching evaluator then tests the tracked squad and
 * transfers. Rules nothing recognises (formations, substitutions…) are
 * reported as "check yourself".
 *
 * Tracker shape (stored with a saved challenge):
 *   { season, window: 'summer'|'winter', players: [...], transfers: [...], moves: [...] }
 *   player:   { id, name, pos, age, nat, ovr, wage (€K/week), academy, starter, loanIn, loanedOut }
 *   transfer: { id, season, window, dir: 'in'|'out', type, name, age, nat, ovr, fee (€M), club }
 *             in-types: permanent, loan, free, promotion; out-types: sale, loan, release
 *   move:     { id, season, type: 'permanent'|'loan'|'free', club, country }   (Player Career)
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const G = FC26.generator;

  // ---------- Nationalities and regions ----------

  const REGIONS = {
    'south america': ['Argentine', 'Bolivian', 'Brazilian', 'Chilean', 'Colombian', 'Ecuadorian', 'Paraguayan', 'Peruvian', 'Uruguayan', 'Venezuelan'],
    africa: ['Algerian', 'Angolan', 'Burkinabé', 'Cameroonian', 'Cape Verdean', 'Congolese', 'Egyptian', 'Gabonese', 'Gambian', 'Ghanaian', 'Guinean', 'Ivorian', 'Malian', 'Moroccan', 'Nigerian', 'Senegalese', 'South African', 'Tunisian', 'Zambian', 'Zimbabwean'],
    'asia or oceania': ['Australian', 'Chinese', 'Indonesian', 'Iranian', 'Iraqi', 'Japanese', 'New Zealander', 'Qatari', 'Saudi', 'South Korean', 'Emirati', 'Uzbek'],
    'the nordic countries': ['Danish', 'Finnish', 'Icelandic', 'Norwegian', 'Swedish', 'Faroese'],
    'eastern europe': ['Belarusian', 'Bulgarian', 'Czech', 'Estonian', 'Georgian', 'Hungarian', 'Latvian', 'Lithuanian', 'Moldovan', 'Polish', 'Romanian', 'Russian', 'Slovak', 'Ukrainian'],
    'north & central america': ['American', 'Canadian', 'Costa Rican', 'Guatemalan', 'Haitian', 'Honduran', 'Jamaican', 'Mexican', 'Panamanian', 'Salvadoran'],
    'the british isles': ['English', 'Irish', 'Northern Irish', 'Scottish', 'Welsh'],
    'the balkans': ['Albanian', 'Bosnian', 'Croatian', 'Greek', 'Kosovan', 'Macedonian', 'Montenegrin', 'Serbian', 'Slovenian'],
  };
  // How regions are written as adjectives inside rules ("Every signing must be South American").
  const REGION_ADJ = { 'south american': 'south america', african: 'africa', asian: 'asia or oceania', nordic: 'the nordic countries', 'eastern european': 'eastern europe', balkan: 'the balkans', british: 'the british isles' };

  const NAT = new Map();
  const addNat = (key, adj) => { if (key && !NAT.has(key.toLowerCase())) NAT.set(key.toLowerCase(), adj); };
  G.COUNTRIES.forEach((c) => { addNat(c.adj, c.adj); addNat(c.name, c.adj); });
  Object.values(REGIONS).flat().forEach((adj) => addNat(adj, adj));
  [['ireland', 'Irish'], ['northern ireland', 'Northern Irish'], ['united states', 'American'], ['us', 'American'],
    ['holland', 'Dutch'], ['turkey', 'Turkish'], ['korea', 'South Korean'], ['korean', 'South Korean'],
    ['ivory coast', 'Ivorian'], ["côte d'ivoire", 'Ivorian'], ['dr congo', 'Congolese'], ['czechia', 'Czech'],
    ['argentinian', 'Argentine'], ['saudi arabia', 'Saudi']].forEach(([k, v]) => addNat(k, v));

  const NATIONALITIES = Array.from(new Set(NAT.values())).sort((a, b) => a.localeCompare(b));

  /** "brazil", "Brazilian " → "Brazilian". Unknown values are kept as typed. */
  function normNat(value) {
    const s = String(value || '').trim();
    return NAT.get(s.toLowerCase()) || s;
  }
  const natIs = (value, adj) => normNat(value).toLowerCase() === String(adj).toLowerCase();

  // ---------- Small helpers ----------

  const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const num = (s) => (WORDS[String(s).toLowerCase()] || Number(s));
  const toMillions = (n, unit) => (String(unit).toUpperCase() === 'K' ? Number(n) / 1000 : Number(n));
  const toThousands = (n, unit) => (String(unit).toUpperCase() === 'K' ? Number(n) : Number(n) / 1000);
  const money = (m) => (m >= 1 ? `€${+m.toFixed(1)}M` : `€${Math.round(m * 1000)}K`);
  const wage = (k) => (k >= 1 ? `€${+k.toFixed(1)}K` : `€${Math.round(k * 1000)}`);
  const plural = (n, word, many) => `${n} ${n === 1 ? word : many || `${word}s`}`;
  const winLabel = (t) => `S${t.season} ${t.window === 'winter' ? 'January' : 'summer'}`;
  const fee = (t) => Number(t.fee) || 0;
  const nameOf = (x) => (x.name || 'Unnamed').trim() || 'Unnamed';

  function emptyTracker() {
    return { season: 1, window: 'summer', players: [], transfers: [], moves: [] };
  }

  /** Fill in missing fields so old or hand-edited data can't break the checks. */
  function normalizeTracker(t) {
    const out = Object.assign(emptyTracker(), t && typeof t === 'object' ? t : {});
    ['players', 'transfers', 'moves'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = []; });
    out.season = Math.max(1, Math.round(Number(out.season)) || 1);
    out.window = out.window === 'winter' ? 'winter' : 'summer';
    return out;
  }

  // Loose club-name match, so "Bayern" matches "Bayern Munich" and "FC Porto" matches "Porto".
  const clubKey = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(fc|cf|afc|sc|ac|ssc|sl|cd|ud|rcd|sv|vfb|vfl|tsg|bv|1\.)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  const clubMatches = (typed, names) => {
    const k = clubKey(typed);
    return Boolean(k) && names.some((n) => {
      const nk = clubKey(n);
      return nk && (nk === k || nk.includes(k) || k.includes(nk));
    });
  };
  const clubList = (text) => text.split(/,\s*|\s+or\s+/).map((x) => x.trim()).filter(Boolean);

  const signings = (t) => t.transfers.filter((x) => x.dir === 'in' && x.type !== 'promotion');
  const promotions = (t) => t.transfers.filter((x) => x.dir === 'in' && x.type === 'promotion');
  const outs = (t) => t.transfers.filter((x) => x.dir === 'out');
  const inSquad = (t) => t.players.filter((p) => !p.loanedOut);
  const starters = (t) => inSquad(t).filter((p) => p.starter);

  // Windows that have happened so far, in order: S1 summer, S1 January, S2 summer…
  function windowsSoFar(ctx) {
    const list = [];
    for (let s = 1; s <= ctx.season; s++) {
      list.push({ season: s, window: 'summer' });
      if (s < ctx.season || ctx.window === 'winter') list.push({ season: s, window: 'winter' });
    }
    return list;
  }
  const inWindow = (w) => (t) => t.season === w.season && (t.window === 'winter' ? 'winter' : 'summer') === w.window;
  // A season's summer window is over once the tracker has moved past it.
  const summerDone = (s, ctx) => s < ctx.season || (s === ctx.season && ctx.window === 'winter');

  // ---------- Results ----------

  const ok = (summary, details) => ({ status: 'ok', summary, details: details || [] });
  const broken = (summary, details) => ({ status: 'broken', summary, details: details || [] });
  const warn = (summary, details) => ({ status: 'warn', summary, details: details || [] });
  const manual = () => ({ status: 'manual', summary: 'Check this one yourself', details: [] });
  const RANK = { broken: 3, warn: 2, ok: 1, manual: 0 };

  function needStarters(t) {
    const n = starters(t).length;
    return n ? null : warn('Tick ⭐ on your starting XI in the squad to check this');
  }

  // Per-signing test: lists every signing that fails it.
  function eachSigning(t, test, describe, okText) {
    const bad = signings(t).filter((x) => !test(x));
    if (bad.length) return broken(plural(bad.length, 'signing') + ' break this', bad.map(describe));
    const n = signings(t).length;
    return n ? ok(okText || `All ${plural(n, 'signing')} fit`) : ok('No signings yet');
  }

  // ---------- Matchers ----------
  // Each: [regex, (match, text) => check object | null]. More specific first.

  const MATCHERS = [
    // Transfers and money
    [/no transfer fees|loans and free agents only|free transfers and loans only|free agents, loans and academy players only/i, () => ({ kind: 'noFees' })],
    [/No single transfer fee above €\s?([\d.]+)\s*([MK])/i, (m) => ({ kind: 'maxFee', max: toMillions(m[1], m[2]) })],
    [/^Every signing must be (.+?) and aged (\d+) or younger/i, (m) => {
      const nat = natCheck(m[1]);
      return nat && { kind: 'all', checks: [nat, { kind: 'maxSignAge', max: num(m[2]) }] };
    }],
    [/(?:Only sign players aged|Every signing must be aged) (\d+) or younger|No signing anyone older than (\d+)/i, (m) => ({ kind: 'maxSignAge', max: num(m[1] || m[2]) })],
    [/(?:Only sign players aged|Every signing must be aged) (\d+) or older|No signing players under (\d+)/i, (m) => ({ kind: 'minSignAge', min: num(m[1] || m[2]) })],
    [/No signing anyone rated above (\d+) OVR/i, (m) => ({ kind: 'maxSignOvr', max: num(m[1]) })],
    [/^Only sign players from (?!leagues)(.+?)\.$/i, (m) => natCheck(m[1])],
    [/^(?:Only sign|Every signing must be) ([A-Z][^.]*?)(?: players)?\.$/, (m) => natCheck(m[1])],
    [/^Signings must come from (.+?)\.$/i, (m) => (REGIONS[m[1].toLowerCase()] ? { kind: 'signNat', allowed: REGIONS[m[1].toLowerCase()], label: m[1] } : null)],
    [/Maximum (\d+) permanent signings per window/i, (m) => ({ kind: 'maxSignings', max: num(m[1]), permanentOnly: true })],
    [/No more than (\d+) signings per (summer )?window/i, (m) => ({ kind: 'maxSignings', max: num(m[1]), summerOnly: Boolean(m[2]) })],
    [/No loan signings/i, () => ({ kind: 'noLoansIn' })],
    [/One in, one out/i, () => ({ kind: 'oneInOneOut' })],
    [/Finish every transfer window with zero or positive net spend|Each window you may only spend money raised from sales/i, () => ({ kind: 'profitWindow' })],
    [/only spending money is what you raise from player sales|only spend money raised from sales/i, () => ({ kind: 'spendFromSales' })],
    [/Finish every season with a positive net transfer spend/i, () => ({ kind: 'profitSeason' })],
    [/No signing players from clubs in your own league/i, () => ({ kind: 'noLeagueRivals' })],
    [/No selling a player in the same season you signed them/i, () => ({ kind: 'noFlip' })],
    [/Never re-sign a player you sold/i, () => ({ kind: 'noResign' })],
    [/^Never sign a player from (.+?)\.$/i, (m) => ({ kind: 'noSignFrom', clubs: clubList(m[1]) })],
    [/^Never sell a player to another .+ club/i, () => ({ kind: 'noSellToLeague' })],
    [/^Never sell a player to (.+?)\.$/i, (m) => ({ kind: 'noSellTo', clubs: clubList(m[1]) })],
    [/Sign at least one player from (.+?) every season/i, (m) => ({ kind: 'signFromEvery', clubs: clubList(m[1]), loan: false })],
    [/Take at least one loan from (.+?) every season/i, (m) => ({ kind: 'signFromEvery', clubs: clubList(m[1]), loan: true })],
    [/Before your first (?:competitive )?match, sell or release your (\d+) highest-rated players/i, (m) => ({ kind: 'clearOut', min: num(m[1]) })],
    [/Sign at least one player rated (\d+)\+ OVR every summer/i, (m) => ({ kind: 'signOvrEverySummer', min: num(m[1]) })],
    [/Sign at least one (?:current or former )?([A-Z][a-zé]+(?: [A-Z][a-z]+)?) player every (summer|season)/, (m) => (NAT.has(m[1].toLowerCase())
      ? { kind: 'signNatEvery', nat: normNat(m[1]), summer: m[2] === 'summer' } : null)],
    [/Sell your highest-(?:rated|valued) player every summer/i, () => ({ kind: 'sellEverySummer' })],

    // Squad and wages
    [/squad capped at (\d+) players/i, (m) => ({ kind: 'squadSize', max: num(m[1]) })],
    [/Only (\w+) players may earn more than €\s?([\d.]+)\s*(K?)\/week/i, (m) => ({ kind: 'wageCount', count: num(m[1]), max: toThousands(m[2], m[3] || '') })],
    [/No player may earn more than three times your lowest-paid/i, () => ({ kind: 'wageRatio', ratio: 3 })],
    [/No player may earn more than twice your second-highest earner/i, () => ({ kind: 'wageTopTwice' })],
    [/No player may earn more than €\s?([\d.]+)\s*(K?)\/week/i, (m) => ({ kind: 'wageCap', max: toThousands(m[1], m[2] || '') })],
    [/Every first-team player must be (\d+)\+ OVR/i, (m) => ({ kind: 'squadOvrMin', min: num(m[1]) })],
    [/Sell (?:\(or release\) )?every player in the summer after they turn (\d+)/i, (m) => ({ kind: 'maxSquadAge', max: num(m[1]) })],
    [/Keep at least (\d+) players out on loan/i, (m) => ({ kind: 'loansOut', min: num(m[1]) })],
    [/No academy promotions/i, () => ({ kind: 'noPromotions' })],
    [/^Promote at least (\w+) [\w\s]*?(?:academy|youth)[\w\s]*?players?(?:\(s\))?(?: to the first team)? (every season|during season (\d+))/i, (m) => ({
      kind: 'promotions', min: num(m[1]), onlySeason: m[3] ? num(m[3]) : null,
    })],
    [/[Aa]t least (\d+) [\w\s]*?graduates?(?:\(s\))? (?:must start every league match|in every starting XI)/, (m, text) => {
      const from = text.match(/From season (\d+)/i);
      return { kind: 'academyStarters', min: num(m[1]), fromSeason: from ? num(from[1]) : 1 };
    }],
    [/[Aa]t least (\d+) [\w\s]*?graduates?(?:\(s\))? in every matchday squad/, (m) => ({ kind: 'academySquad', min: num(m[1]) })],
    [/[Aa]t least (\d+) loanees must start/, (m) => ({ kind: 'loaneeStarters', min: num(m[1]) })],
    [/[Aa]t least (\d+) ([A-Z][a-z]+(?: [A-Z][a-z]+)?) players?(?:\(s\))? in every (starting XI|matchday squad)/, (m) => (NAT.has(m[2].toLowerCase())
      ? { kind: 'natQuota', min: num(m[1]), nat: normNat(m[2]), xi: m[3] === 'starting XI' } : null)],
    [/By the final season at least (\d+) ([A-Z][a-z]+(?: [A-Z][a-z]+)?) players must start every league match/, (m) => (NAT.has(m[2].toLowerCase())
      ? { kind: 'natQuota', min: num(m[1]), nat: normNat(m[2]), xi: true, finalOnly: true } : null)],
    [/No ([A-Z][a-z]+) players in your starting XI/, (m) => (NAT.has(m[1].toLowerCase()) ? { kind: 'noNatXi', nat: normNat(m[1]) } : null)],
    [/starting XI must average (\d+)(?: years old)? or younger/i, (m) => ({ kind: 'avgAgeXi', max: num(m[1]) })],

    // Player Career moves
    [/Never go out on loan/i, () => ({ kind: 'noLoanMoves' })],
    [/^Start at .+? and stay for at least (\d+) season/i, (m) => ({ kind: 'firstStay', min: num(m[1]) })],
    [/Loans are only allowed before you turn (\d+)/i, (m) => ({ kind: 'loanAgeMax', max: num(m[1]) })],
    [/whole career at .+?: never accept a permanent transfer/i, () => ({ kind: 'noPermanentMoves' })],
    [/Stay at least (\d+) seasons?(?:\(s\))? at every club/i, (m) => ({ kind: 'stayMin', min: num(m[1]) })],
    [/Never play for a club in ([A-Z][\w ]+?)\./, (m) => ({ kind: 'avoidCountry', country: m[1] })],
    [/Never return to a league you have already played in/i, () => ({ kind: 'noRepeatCountry' })],
    [/Move to a club in a new country every (\d+) seasons/i, (m) => ({ kind: 'moveCountryEvery', every: num(m[1]) })],
  ];

  // "Brazilian", "Danish or African", "England, Scotland, Wales or Ireland" → an allowed-nationality check.
  function natCheck(list) {
    const parts = list.split(/,\s*|\s+or\s+/).map((x) => x.trim()).filter(Boolean);
    const allowed = [];
    for (const part of parts) {
      const region = REGION_ADJ[part.toLowerCase()] || (REGIONS[part.toLowerCase()] && part.toLowerCase());
      if (region) allowed.push(...REGIONS[region]);
      else if (NAT.has(part.toLowerCase())) allowed.push(normNat(part));
      else return null; // something we can't check, e.g. "born in the Basque Country"
    }
    return allowed.length ? { kind: 'signNat', allowed, label: list } : null;
  }

  function interpret(text) {
    const t = String(text || '').trim();
    for (const [re, make] of MATCHERS) {
      const m = t.match(re);
      if (m) {
        const check = make(m, t);
        if (check) return check;
      }
    }
    return null;
  }

  // ---------- Evaluators ----------

  const EVAL = {
    all(c, t, ctx) {
      const results = c.checks.map((sub) => EVAL[sub.kind](sub, t, ctx));
      const worst = results.reduce((a, b) => (RANK[b.status] > RANK[a.status] ? b : a));
      return Object.assign({}, worst, { details: results.flatMap((r) => r.details) });
    },
    noFees(c, t) {
      return eachSigning(t, (x) => fee(x) === 0, (x) => `${nameOf(x)} cost ${money(fee(x))} (${winLabel(x)})`, 'No fees paid');
    },
    maxFee(c, t) {
      return eachSigning(t, (x) => fee(x) <= c.max + 1e-9, (x) => `${nameOf(x)} cost ${money(fee(x))}, the cap is ${money(c.max)}`, `Every fee is ${money(c.max)} or less`);
    },
    maxSignAge(c, t) {
      return eachSigning(t, (x) => !(Number(x.age) > c.max), (x) => `${nameOf(x)} was ${x.age} when signed (max ${c.max})`);
    },
    minSignAge(c, t) {
      return eachSigning(t, (x) => !(Number(x.age) > 0 && Number(x.age) < c.min), (x) => `${nameOf(x)} was ${x.age} when signed (min ${c.min})`);
    },
    maxSignOvr(c, t) {
      return eachSigning(t, (x) => !(Number(x.ovr) > c.max), (x) => `${nameOf(x)} was ${x.ovr} OVR when signed (max ${c.max})`);
    },
    signNat(c, t) {
      const missing = signings(t).filter((x) => !String(x.nat || '').trim());
      const res = eachSigning(t, (x) => !String(x.nat || '').trim() || c.allowed.some((a) => natIs(x.nat, a)),
        (x) => `${nameOf(x)} is ${normNat(x.nat)}`, `Every signing is ${c.label}`);
      if (res.status === 'ok' && missing.length) return warn(`Add a nationality for ${plural(missing.length, 'signing')}`, missing.map(nameOf));
      return res;
    },
    maxSignings(c, t, ctx) {
      const details = windowsSoFar(ctx).filter((w) => !c.summerOnly || w.window === 'summer').map((w) => {
        const n = signings(t).filter(inWindow(w)).filter((x) => !c.permanentOnly || x.type === 'permanent' || x.type === 'free').length;
        return n > c.max ? `${n} signings in ${winLabel(w)} (max ${c.max})` : null;
      }).filter(Boolean);
      return details.length ? broken('Too many signings in a window', details) : ok(`No window over ${c.max}`);
    },
    noLoansIn(c, t) {
      return eachSigning(t, (x) => x.type !== 'loan', (x) => `${nameOf(x)} joined on loan (${winLabel(x)})`, 'No loan signings');
    },
    oneInOneOut(c, t, ctx) {
      const details = [];
      windowsSoFar(ctx).forEach((w) => {
        // In the order they were logged: every signing needs a departure before it.
        let balance = 0;
        t.transfers.filter(inWindow(w)).forEach((x) => {
          if (x.dir === 'out') balance += 1;
          else if (x.type !== 'promotion') {
            balance -= 1;
            if (balance < 0) {
              details.push(`${nameOf(x)} signed before anyone left (${winLabel(x)})`);
              balance = 0;
            }
          }
        });
      });
      return details.length ? broken('Signed without a departure first', details) : ok('Every signing followed a departure');
    },
    profitWindow(c, t, ctx) {
      const details = windowsSoFar(ctx).map((w) => {
        const list = t.transfers.filter(inWindow(w));
        const net = list.filter((x) => x.dir === 'out').reduce((n, x) => n + fee(x), 0) - list.filter((x) => x.dir === 'in').reduce((n, x) => n + fee(x), 0);
        return net < -1e-9 ? `${winLabel(w)}: spent ${money(-net)} more than you made` : null;
      }).filter(Boolean);
      return details.length ? broken('A window lost money', details) : ok('No window lost money');
    },
    spendFromSales(c, t) {
      let balance = 0;
      const details = [];
      t.transfers.slice().sort((a, b) => a.season - b.season || (a.window === 'winter') - (b.window === 'winter')).forEach((x) => {
        balance += x.dir === 'out' ? fee(x) : -fee(x);
        if (balance < -1e-9 && x.dir === 'in') details.push(`${nameOf(x)} (${money(fee(x))}) took you ${money(-balance)} past your sales income`);
      });
      return details.length ? broken('Spent more than sales brought in', details) : ok(`Sales cover all spending (${money(Math.max(0, balance))} left)`);
    },
    profitSeason(c, t, ctx) {
      const details = [];
      for (let s = 1; s <= ctx.season; s++) {
        const list = t.transfers.filter((x) => x.season === s);
        const net = list.filter((x) => x.dir === 'out').reduce((n, x) => n + fee(x), 0) - list.filter((x) => x.dir === 'in').reduce((n, x) => n + fee(x), 0);
        if (net < -1e-9) details.push(`Season ${s}: net spend ${money(-net)}${s === ctx.season ? ' (season still going)' : ''}`);
      }
      if (!details.length) return ok('Every season in profit so far');
      const onlyCurrent = details.length === 1 && details[0].includes('still going');
      return onlyCurrent ? warn('This season is in the red so far', details) : broken('A season finished in the red', details);
    },
    noLeagueRivals(c, t, ctx) {
      const rivals = ctx.leagueClubs;
      if (!rivals.size) return manual();
      return eachSigning(t, (x) => !rivals.has(String(x.club || '').trim().toLowerCase()), (x) => `${nameOf(x)} came from ${x.club}, a league rival`);
    },
    noFlip(c, t) {
      const signedIn = new Map(signings(t).map((x) => [nameOf(x).toLowerCase(), x.season]));
      const bad = outs(t).filter((x) => x.type !== 'loan' && signedIn.get(nameOf(x).toLowerCase()) === x.season);
      return bad.length ? broken('Sold in the season they arrived', bad.map((x) => `${nameOf(x)} (season ${x.season})`)) : ok('Nobody sold in their first season');
    },
    noResign(c, t) {
      const sold = outs(t).filter((x) => x.type !== 'loan');
      const bad = signings(t).filter((x) => sold.some((o) => nameOf(o).toLowerCase() === nameOf(x).toLowerCase() && (o.season < x.season || (o.season === x.season && o.window === 'summer' && x.window === 'winter'))));
      return bad.length ? broken('Re-signed a player you sold', bad.map(nameOf)) : ok('No re-signings');
    },
    noSignFrom(c, t) {
      return eachSigning(t, (x) => !clubMatches(x.club, c.clubs), (x) => `${nameOf(x)} came from ${x.club}`, 'No signings from those clubs');
    },
    noSellToLeague(c, t, ctx) {
      if (!ctx.leagueClubs.size) return manual();
      const rivals = Array.from(ctx.leagueClubs);
      const bad = outs(t).filter((x) => x.type !== 'release' && clubMatches(x.club, rivals));
      return bad.length ? broken('Sold to a league rival', bad.map((x) => `${nameOf(x)} to ${x.club}`)) : ok('No sales to league rivals');
    },
    noSellTo(c, t) {
      const bad = outs(t).filter((x) => clubMatches(x.club, c.clubs));
      return bad.length ? broken('Sold to a club on the list', bad.map((x) => `${nameOf(x)} to ${x.club}`)) : ok('No sales to those clubs');
    },
    signFromEvery(c, t, ctx) {
      const what = c.loan ? `a loan from ${c.clubs.join(' or ')}` : `a signing from ${c.clubs.join(' or ')}`;
      return everySeason(ctx, false, (s) => signings(t).some((x) => x.season === s && (!c.loan || x.type === 'loan') && clubMatches(x.club, c.clubs)), what);
    },
    clearOut(c, t, ctx) {
      const n = outs(t).filter((x) => x.season === 1 && x.window !== 'winter' && x.type !== 'loan').length;
      if (n >= c.min) return ok(`${n} players moved on in your first window`, ['Make sure they were your highest-rated players.']);
      return summerDone(1, ctx) ? broken(`Only ${n} of ${c.min} players sold or released before the season`) : warn(`${n} of ${c.min} sold or released so far`);
    },
    signOvrEverySummer(c, t, ctx) {
      return everySeason(ctx, true, (s) => signings(t).some((x) => x.season === s && x.window !== 'winter' && Number(x.ovr) >= c.min), `a ${c.min}+ OVR signing`);
    },
    signNatEvery(c, t, ctx) {
      return everySeason(ctx, c.summer, (s) => signings(t).some((x) => x.season === s && (!c.summer || x.window !== 'winter') && natIs(x.nat, c.nat)), `a ${c.nat} signing`);
    },
    sellEverySummer(c, t, ctx) {
      const res = everySeason(ctx, true, (s) => outs(t).some((x) => x.season === s && x.window !== 'winter' && x.type === 'sale'), 'a summer sale');
      if (res.status === 'ok' && res.summary !== 'Nothing due yet') res.details.push('Make sure it was your best player each time.');
      return res;
    },
    squadSize(c, t) {
      const n = inSquad(t).length;
      return n > c.max ? broken(`${n} players in the squad, the cap is ${c.max}`) : ok(`${n} of ${c.max} squad places used`);
    },
    wageCount(c, t) {
      const high = inSquad(t).filter((p) => Number(p.wage) > c.max);
      const details = high.map((p) => `${nameOf(p)}: ${wage(Number(p.wage))}/week`);
      return high.length > c.count ? broken(`${high.length} players earn over ${wage(c.max)}/week (max ${c.count})`, details) : ok(`${high.length} of ${c.count} big earners`, details);
    },
    wageRatio(c, t) {
      const paid = inSquad(t).filter((p) => Number(p.wage) > 0);
      if (paid.length < 2) return warn('Add wages to check this');
      const low = Math.min(...paid.map((p) => Number(p.wage)));
      const bad = paid.filter((p) => Number(p.wage) > low * c.ratio + 1e-9);
      return bad.length ? broken(`Top wages are more than ${c.ratio}× the lowest (${wage(low)})`, bad.map((p) => `${nameOf(p)}: ${wage(Number(p.wage))}`)) : ok(`Everyone within ${c.ratio}× the lowest wage`);
    },
    wageTopTwice(c, t) {
      const w = inSquad(t).map((p) => Number(p.wage) || 0).sort((a, b) => b - a);
      if (w.length < 2 || !w[1]) return warn('Add wages to check this');
      return w[0] > w[1] * 2 + 1e-9 ? broken(`Top wage ${wage(w[0])} is more than twice the next (${wage(w[1])})`) : ok('Top wage is within twice the next');
    },
    wageCap(c, t) {
      const bad = inSquad(t).filter((p) => Number(p.wage) > c.max + 1e-9);
      if (bad.length) return broken(plural(bad.length, 'player') + ` earn over ${wage(c.max)}/week`, bad.map((p) => `${nameOf(p)}: ${wage(Number(p.wage))}/week`));
      const missing = inSquad(t).filter((p) => !(Number(p.wage) > 0)).length;
      return missing && inSquad(t).length ? warn(`Add wages for ${plural(missing, 'player')} to check this fully`) : ok(`Nobody earns over ${wage(c.max)}/week`);
    },
    squadOvrMin(c, t) {
      const bad = inSquad(t).filter((p) => Number(p.ovr) > 0 && Number(p.ovr) < c.min);
      return bad.length ? broken(`${plural(bad.length, 'player')} below ${c.min} OVR`, bad.map((p) => `${nameOf(p)}: ${p.ovr}`)) : ok(`Everyone is ${c.min}+ OVR`);
    },
    maxSquadAge(c, t) {
      const bad = inSquad(t).filter((p) => Number(p.age) > c.max);
      return bad.length ? broken(`${plural(bad.length, 'player')} past ${c.max} still at the club`, bad.map((p) => `${nameOf(p)}: ${p.age}`)) : ok(`Nobody over ${c.max}`);
    },
    loansOut(c, t) {
      const n = t.players.filter((p) => p.loanedOut).length;
      return n >= c.min ? ok(`${n} players out on loan`) : warn(`${n} of ${c.min} players out on loan`);
    },
    noPromotions(c, t) {
      const list = promotions(t);
      return list.length ? broken('Academy players promoted', list.map((x) => `${nameOf(x)} (${winLabel(x)})`)) : ok('No academy promotions');
    },
    promotions(c, t, ctx) {
      const count = (s) => promotions(t).filter((x) => x.season === s).length;
      if (c.onlySeason) {
        const n = count(c.onlySeason);
        if (n >= c.min) return ok(`${n} promoted in season ${c.onlySeason}`);
        return ctx.season > c.onlySeason ? broken(`Only ${n} of ${c.min} promoted in season ${c.onlySeason}`) : warn(`${n} of ${c.min} promoted so far`);
      }
      const details = [];
      for (let s = 1; s < ctx.season; s++) if (count(s) < c.min) details.push(`Season ${s}: ${count(s)} of ${c.min}`);
      const now = count(ctx.season);
      if (details.length) return broken('Not enough academy promotions', details);
      return now >= c.min ? ok(`${now} promoted this season`) : warn(`${now} of ${c.min} promoted this season`);
    },
    academyStarters(c, t, ctx) {
      if (ctx.season < c.fromSeason) return ok(`Starts in season ${c.fromSeason}`);
      const need = needStarters(t);
      if (need) return need;
      const n = starters(t).filter((p) => p.academy).length;
      return n >= c.min ? ok(`${n} academy graduates in your XI`) : broken(`Only ${n} of ${c.min} academy graduates in your XI`);
    },
    academySquad(c, t) {
      const n = inSquad(t).filter((p) => p.academy).length;
      return n >= c.min ? ok(`${n} academy graduates available`) : broken(`Only ${n} academy graduates in the squad, you need ${c.min} for every matchday squad`);
    },
    loaneeStarters(c, t) {
      const need = needStarters(t);
      if (need) return need;
      const n = starters(t).filter((p) => p.loanIn).length;
      return n >= c.min ? ok(`${n} loanees in your XI`) : broken(`Only ${n} of ${c.min} loanees in your XI`);
    },
    natQuota(c, t, ctx) {
      const pool = c.xi ? starters(t) : inSquad(t);
      if (c.xi) {
        const need = needStarters(t);
        if (need) return need;
      }
      const n = pool.filter((p) => natIs(p.nat, c.nat)).length;
      const where = c.xi ? 'your XI' : 'the squad';
      if (n >= c.min) return ok(`${n} ${c.nat} players in ${where}`);
      // "By the final season…": a target to build towards until then.
      if (c.finalOnly && ctx.season < ctx.finalSeason) return warn(`${n} of ${c.min} ${c.nat} starters, needed by season ${ctx.finalSeason}`);
      return broken(`Only ${n} of ${c.min} ${c.nat} players in ${where}`);
    },
    noNatXi(c, t) {
      const need = needStarters(t);
      if (need) return need;
      const bad = starters(t).filter((p) => natIs(p.nat, c.nat));
      return bad.length ? broken(`${c.nat} players in your XI`, bad.map(nameOf)) : ok(`No ${c.nat} starters`);
    },
    avgAgeXi(c, t) {
      const need = needStarters(t);
      if (need) return need;
      const ages = starters(t).map((p) => Number(p.age)).filter((a) => a > 0);
      if (!ages.length) return warn('Add ages for your XI');
      const avg = ages.reduce((a, b) => a + b, 0) / ages.length;
      return avg <= c.max + 1e-9 ? ok(`XI averages ${avg.toFixed(1)}`) : broken(`XI averages ${avg.toFixed(1)} (max ${c.max})`);
    },

    // Player Career
    firstStay(c, t, ctx) {
      const first = careerStints(t, ctx)[0];
      const left = t.moves.length > 0;
      if (first.length >= c.min) return ok(`${plural(first.length, 'season')} at ${first.club}`);
      return left ? broken(`Left ${first.club} after ${plural(first.length, 'season')} (needed ${c.min})`) : ok(`${plural(first.length, 'season')} at ${first.club} so far`);
    },
    noLoanMoves(c, t) {
      const bad = t.moves.filter((m) => m.type === 'loan');
      return bad.length ? broken('Went out on loan', bad.map((m) => `${m.club || 'Loan'} (season ${m.season})`)) : ok('No loans');
    },
    loanAgeMax(c, t, ctx) {
      const bad = t.moves.filter((m) => m.type === 'loan' && ctx.ageAt(m.season) >= c.max);
      return bad.length ? broken(`Loaned out at ${c.max} or older`, bad.map((m) => `${m.club || 'Loan'} at age ${ctx.ageAt(m.season)}`)) : ok(`No loans after ${c.max - 1}`);
    },
    noPermanentMoves(c, t) {
      const bad = t.moves.filter((m) => m.type !== 'loan');
      return bad.length ? broken('Left the club', bad.map((m) => `${m.club || 'New club'} (season ${m.season})`)) : ok('Still a one-club player');
    },
    stayMin(c, t, ctx) {
      const stints = careerStints(t, ctx);
      const bad = stints.slice(0, -1).filter((s) => s.length < c.min);
      return bad.length ? broken(`Left a club before ${plural(c.min, 'season')}`, bad.map((s) => `${s.club}: ${plural(s.length, 'season')}`)) : ok('Every stay long enough');
    },
    avoidCountry(c, t, ctx) {
      const bad = careerStints(t, ctx).filter((s) => natIs(s.country, normNat(c.country)) || String(s.country).toLowerCase() === c.country.toLowerCase());
      return bad.length ? broken(`Played in ${c.country}`, bad.map((s) => s.club)) : ok(`Never played in ${c.country}`);
    },
    noRepeatCountry(c, t, ctx) {
      const seen = new Set();
      const bad = [];
      let prev = null;
      careerStints(t, ctx).forEach((s) => {
        const k = String(s.country || '').toLowerCase();
        if (k && k !== prev && seen.has(k)) bad.push(`${s.club} (${s.country})`);
        if (k) seen.add(k);
        prev = k;
      });
      return bad.length ? broken('Went back to a country you had left', bad) : ok('No country twice');
    },
    moveCountryEvery(c, t, ctx) {
      const spells = [];
      careerStints(t, ctx).forEach((s) => {
        const last = spells[spells.length - 1];
        if (last && last.country === s.country) last.length += s.length;
        else spells.push({ country: s.country, length: s.length });
      });
      const bad = spells.filter((s) => s.length > c.every);
      return bad.length ? broken(`Stayed in a country more than ${plural(c.every, 'season')}`, bad.map((s) => `${s.country || 'Unknown'}: ${plural(s.length, 'season')}`)) : ok(`Moving on every ${plural(c.every, 'season')} or sooner`);
    },
  };

  // Requirement that repeats every season (or every summer): past seasons must
  // have it; the current one is "still to do" until its window closes.
  function everySeason(ctx, summer, has, what) {
    const missed = [];
    let pending = false;
    for (let s = 1; s <= ctx.season; s++) {
      if (has(s)) continue;
      const due = summer ? summerDone(s, ctx) : s < ctx.season;
      if (due) missed.push(`Season ${s}: no ${what}`);
      else pending = true;
    }
    if (missed.length) return broken(`Missed ${what}`, missed);
    if (pending) return warn(`Still need ${what} this ${summer ? 'summer' : 'season'}`);
    return ok(ctx.season ? `Done every ${summer ? 'summer' : 'season'} so far` : 'Nothing due yet');
  }

  // Player Career: clubs in order with how many seasons at each, starting at the challenge club.
  function careerStints(t, ctx) {
    const moves = t.moves.slice().sort((a, b) => a.season - b.season);
    const stints = [{ club: ctx.startClub, country: ctx.startCountry, from: 1 }];
    moves.forEach((m) => stints.push({ club: m.club || 'New club', country: m.country || '', from: Math.max(1, Number(m.season) || 1), loan: m.type === 'loan' }));
    return stints.map((s, i) => {
      const end = i + 1 < stints.length ? stints[i + 1].from : ctx.season + 1;
      return Object.assign(s, { length: Math.max(0, end - s.from) });
    });
  }

  // ---------- Public API ----------

  function contextFor(ch, tracker) {
    const leagueClubs = new Set(G.CLUBS.filter((c) => c.leagueId === ch.club.leagueId && c.name !== ch.club.name).map((c) => c.name.toLowerCase()));
    return {
      season: tracker.season,
      window: tracker.window,
      leagueClubs,
      finalSeason: Number(ch.seasons) || 1,
      startClub: ch.club.name,
      startCountry: ch.club.country || '',
      ageAt: (s) => (Number(ch.startAge) || 17) + s - 1,
    };
  }

  /** Check one rule sentence against a tracker. */
  function evaluateRule(text, tracker, ch) {
    const check = interpret(text);
    if (!check || !EVAL[check.kind]) return manual();
    const t = normalizeTracker(tracker);
    return Object.assign({ kind: check.kind }, EVAL[check.kind](check, t, contextFor(ch, t)));
  }

  /** Results for every rule of a challenge, core rules first. */
  function checkChallenge(ch, tracker) {
    const t = normalizeTracker(tracker);
    return ch.coreRules.map((r) => Object.assign({ core: true, text: r.text }, evaluateRule(r.text, t, ch)))
      .concat(ch.rules.map((r) => Object.assign({ core: false, text: r.text }, evaluateRule(r.text, t, ch))));
  }

  function tally(results) {
    return results.reduce((n, r) => Object.assign(n, { [r.status]: n[r.status] + 1 }), { ok: 0, broken: 0, warn: 0, manual: 0 });
  }

  FC26.compliance = { interpret, evaluateRule, checkChallenge, tally, normNat, normalizeTracker, emptyTracker, NATIONALITIES, REGIONS };
})(typeof window !== 'undefined' ? window : globalThis);
