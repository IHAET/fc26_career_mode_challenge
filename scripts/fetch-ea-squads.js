#!/usr/bin/env node
/*
 * Line js/squads.js up with the squads in the game: every club's players as
 * EA's own FC 26 database has them (the one behind ea.com's ratings pages),
 * with the in-game names, positions, nationalities and dates of birth.
 *
 *   node scripts/fetch-ea-squads.js          # download (cached) + rebuild squads
 *   node scripts/fetch-ea-squads.js --fresh  # download again
 *
 * Behind a proxy, run with NODE_USE_ENV_PROXY=1 (Node 22.21+).
 *
 * How it works:
 *   1. Every men's player in the database is downloaded (100 a request) into
 *      scripts/.ea-cache.
 *   2. Each club in js/data.js is matched to its team in the game by the
 *      players they share with the club's Wikipedia squad (same date of birth
 *      and a shared name), so renamed teams ("Bergamo Calcio" is Atalanta in
 *      FC 26) still match. Clubs with no squad list fall back to their name.
 *   3. The club's squad becomes the game's. Loans come from the Wikipedia
 *      lists, since the database lists a loanee at the club he plays for:
 *      he's flagged "in" there and listed "out" at his parent club.
 *   4. The likely starting XI is the best-rated 4-3-3 in the game's squad.
 * Ratings are only used to pick that XI: they're EA's, so they aren't stored.
 * Clubs the game doesn't have keep their Wikipedia squad.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CACHE_DIR = path.join(__dirname, '.ea-cache');
const CACHE = path.join(CACHE_DIR, 'fc26-men.json');
const TEAMS_CACHE = path.join(CACHE_DIR, 'fc26-teams.json');
const API = 'https://drop-api.ea.com/rating/ea-sports-fc';
const RATINGS_PAGE = 'https://www.ea.com/games/ea-sports-fc/ratings';
const PAGE = 100;
const WIKI = require('./wiki-squads.json');
const WIKI_EXTRA = require('./wiki-squads-extra.json');

require(path.join(ROOT, 'js', 'data.js'));
const { leagues } = globalThis.FC26.data;

// The game's name for each challenge league.
const EA_LEAGUE = {
  eng1: 'Premier League', eng2: 'EFL Championship', eng3: 'EFL League One', eng4: 'EFL League Two', esp1: 'LALIGA EA SPORTS',
  esp2: 'LALIGA HYPERMOTION', ita1: 'Serie A Enilive', ita2: 'Serie BKT', ger1: 'Bundesliga', ger2: 'Bundesliga 2',
  fra1: "Ligue 1 McDonald's", fra2: 'Ligue 2 BKT', ned1: 'Eredivisie', por1: 'Liga Portugal', sco1: 'Scottish Prem', usa1: 'MLS',
  ksa1: 'ROSHN Saudi League', bel1: '1A Pro League', tur1: 'Trendyol Süper Lig', nor1: 'Eliteserien', den1: '3F Superliga',
  aut1: 'Ö. Bundesliga', rou1: 'SUPERLIGA',
};
// The game's other leagues: the extra league they belong to, or a new one.
const EA_EXTRA = {
  '3. Liga': '3. Liga', 'Brack Super League': 'Swiss Super League', Allsvenskan: 'Allsvenskan', 'PKO BP Ekstraklasa': 'Ekstraklasa',
  LPF: 'Liga Profesional', 'K League 1': 'K League 1', 'A-League': 'A-League Men', 'SSE Airtricity PD': 'League of Ireland',
  'Hellas Liga': 'Super League Greece', 'Česká Liga': 'Czech First League', 'Liga Hrvatska': 'Croatian HNL',
  'Ukrayina Liha': 'Ukrainian Premier League', 'Magyar Liga': 'NB I', 'Liga Cyprus': 'Cypriot First Division',
  'United Emirates League': 'UAE Pro League', CSL: 'Chinese Super League', 'Liga Chile': 'Chilean Primera División',
};
const NEW_LEAGUES = {
  ISL: ['Indian Super League', 'India'], Finnliiga: ['Veikkausliiga', 'Finland'], 'Liga Azerbaijan': ['Azerbaijan Premier League', 'Azerbaijan'],
  Libertadores: ['South American clubs', 'CONMEBOL'], Sudamericana: ['South American clubs', 'CONMEBOL'],
};
// The game's nationality names that differ from the squad lists'.
const NAT = {
  Holland: 'Netherlands', 'Korea Republic': 'South Korea', 'Korea DPR': 'North Korea', 'China PR': 'China', "Côte d'Ivoire": 'Ivory Coast',
  'Cape Verde Islands': 'Cape Verde', 'Congo DR': 'DR Congo', 'Republic of Ireland': 'Ireland', 'St. Kitts and Nevis': 'Saint Kitts and Nevis',
  'St. Lucia': 'Saint Lucia', 'St. Vincent and the Grenadines': 'Saint Vincent and the Grenadines', 'Chinese Taipei': 'Taiwan',
  'FYR Macedonia': 'North Macedonia',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download() {
  if (fs.existsSync(CACHE) && !process.argv.includes('--fresh')) return JSON.parse(fs.readFileSync(CACHE, 'utf8'));
  const all = [];
  for (let offset = 0, total = Infinity; offset < total; offset += PAGE) {
    let j = null;
    for (let attempt = 0; attempt < 5 && !j; attempt++) {
      try {
        const r = await fetch(`${API}?locale=en&gender=0&limit=${PAGE}&offset=${offset}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        j = await r.json();
      } catch (e) {
        console.warn(`offset ${offset}: ${e.message}, retrying`);
        await sleep(2000 * (attempt + 1));
      }
    }
    if (!j) throw new Error(`Gave up at offset ${offset}`);
    total = j.totalItems;
    // Keep what the squads need, plus the rating for picking the XI.
    j.items.forEach((p) => all.push({
      id: p.id, first: p.firstName, last: p.lastName, common: p.commonName, dob: p.birthdate,
      nat: p.nationality && p.nationality.label, team: p.team && p.team.id, teamName: p.team && p.team.label,
      league: p.leagueName, pos: p.position && p.position.shortLabel,
      alt: (p.alternatePositions || []).map((a) => a.shortLabel), ovr: p.overallRating,
    }));
    if (offset % 2000 === 0) console.log(`  ${all.length} / ${total}`);
    await sleep(250);
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(all));
  console.log(`Downloaded ${all.length} players`);
  return all;
}

/**
 * Some teams come back without a name or id (every Eredivisie club, and clubs
 * the newer game dropped). The ratings page lists the teams it knows with their
 * ids, and asking for a team by id still works, so those teams are filled in.
 * Returns { teamId: { label, league, ids: [player ids] } }.
 */
async function teamsWithoutNames(players) {
  if (fs.existsSync(TEAMS_CACHE) && !process.argv.includes('--fresh')) return JSON.parse(fs.readFileSync(TEAMS_CACHE, 'utf8'));
  const html = await (await fetch(RATINGS_PAGE, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
  const next = JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
  const named = new Set(players.filter((p) => p.team != null).map((p) => p.team));
  const want = new Map();
  next.props.pageProps.ratingsFilters.teamGroups.filter((g) => g.gender.id === 0).forEach((g) => g.teams.forEach((t) => {
    if (!named.has(t.id)) want.set(t.id, { label: t.label, league: g.label });
  }));
  const out = {};
  for (const [id, t] of want) {
    const j = await (await fetch(`${API}?locale=en&gender=0&limit=${PAGE}&offset=0&team=${id}`)).json();
    if ((j.items || []).length) out[id] = Object.assign(t, { ids: j.items.map((p) => p.id) });
    await sleep(200);
  }
  // Teams the page doesn't list (clubs the newer game dropped): look for them among the
  // usual id ranges, 500 ids a request (the filter takes a list), halving any batch that has players.
  const known = new Set([...named, ...Object.keys(out).map(Number)]);
  const count = async (ids) => {
    await sleep(150);
    const j = await (await fetch(`${API}?locale=en&gender=0&limit=1&offset=0&team=${ids.join(',')}`)).json();
    return j.totalItems || 0;
  };
  const found = [];
  const bisect = async (ids) => {
    if (!(await count(ids))) return;
    if (ids.length === 1) { found.push(ids[0]); return; }
    const half = Math.ceil(ids.length / 2);
    await bisect(ids.slice(0, half));
    await bisect(ids.slice(half));
  };
  for (const [from, to] of [[1, 3000], [10000, 16000], [100000, 102000], [110000, 117000], [131000, 133500]]) {
    for (let start = from; start < to; start += 500) {
      const ids = [];
      for (let id = start; id < Math.min(start + 500, to); id++) if (!known.has(id)) ids.push(id);
      await bisect(ids);
    }
  }
  for (const id of found) {
    const j = await (await fetch(`${API}?locale=en&gender=0&limit=${PAGE}&offset=0&team=${id}`)).json();
    out[id] = { label: '', league: (j.items[0] || {}).leagueName || '', ids: j.items.map((p) => p.id) };
    await sleep(200);
  }
  console.log(`Teams without a name: ${Object.keys(out).length} (${found.length} found by id)`);
  fs.writeFileSync(TEAMS_CACHE, JSON.stringify(out));
  return out;
}

// ---------- Matching the game's players to the squad lists ----------

const key = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ø/g, 'o').replace(/ß/g, 'ss').replace(/[łŁ]/g, 'l')
  .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (s) => key(s).split(' ').filter((t) => t.length >= 3);
const isoDate = (s) => { const m = String(s || '').match(/^(\d+)\/(\d+)\/(\d{4})/); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : ''; };

function prepare(raw, unnamed) {
  const teamOf = new Map();
  Object.entries(unnamed).forEach(([id, t]) => t.ids.forEach((pid) => teamOf.set(pid, Number(id))));
  const teams = new Map();
  const players = raw.map((p) => {
    const name = (p.common || `${p.first} ${p.last}`).replace(/\s+/g, ' ').trim();
    const full = `${p.first} ${p.last}`.replace(/\s+/g, ' ').trim();
    const team = p.team != null ? p.team : teamOf.has(p.id) ? teamOf.get(p.id) : null;
    const e = { id: p.id, name, full, dob: isoDate(p.dob), nat: NAT[p.nat] || p.nat || '', pos: p.pos, alt: p.alt || [], ovr: p.ovr || 0, league: p.league, team };
    if (team != null) {
      if (!teams.has(team)) teams.set(team, { id: team, label: p.teamName || (unnamed[team] || {}).label || '', league: p.league, players: [] });
      teams.get(team).players.push(e);
    }
    return e;
  });
  const byDob = new Map();
  const byName = new Map();
  const add = (map, k, e) => { if (!k) return; if (!map.has(k)) map.set(k, []); if (!map.get(k).includes(e)) map.get(k).push(e); };
  players.forEach((e) => { add(byDob, e.dob, e); add(byName, key(e.name), e); add(byName, key(e.full), e); });
  return { players, teams, byDob, byName };
}

/** The game's players who could be a squad-list row: same date of birth and a shared name, or the same name. */
function candidates(db, row) {
  const [name, , dob] = row;
  if (dob) {
    const w = tokens(name);
    return (db.byDob.get(dob) || []).filter((e) => { const t = new Set(tokens(`${e.name} ${e.full}`)); return w.some((x) => t.has(x)); });
  }
  return db.byName.get(key(name)) || [];
}

/** The game's player for a squad-list row, when exactly one fits. */
function findPlayer(db, row) {
  const hits = candidates(db, row);
  return hits.length === 1 ? hits[0] : null;
}

/**
 * Does the game's name for a club differ from ours by more than a short form?
 * "Spurs", "QPR", "OM" and "M'gladbach" are short forms; "Bergamo Calcio" for Atalanta isn't.
 */
function renamed(ours, theirs) {
  const generic = new Set(['club', 'calcio', 'football', 'the', 'de', 'fc', 'cf', 'ac', 'sc']);
  const words = (s) => key(s).split(' ').filter((t) => t.length >= 2 && !generic.has(t));
  const a = words(ours);
  const b = words(theirs);
  const stem = (t) => t.replace(/s$/, '');
  const same = (x, y) => x === y || (Math.min(x.length, y.length) >= 3 && (x.startsWith(y) || y.startsWith(x)))
    || x.slice(0, 4) === y.slice(0, 4) || (stem(y).length >= 4 && x.includes(stem(y))) || (stem(x).length >= 4 && y.includes(stem(x)));
  if (a.some((x) => b.some((y) => same(x, y)))) return false;
  // Initials: "QPR", "OM", "STVV", "OB".
  const initials = (s) => key(s).split(' ').filter((t) => t && t !== 'de').map((t) => t[0]).join('');
  const short = (s) => key(s).replace(/ /g, '');
  const pairs = [[short(theirs), initials(ours)], [short(ours), initials(theirs)]];
  return !pairs.some(([abbr, ini]) => abbr.length <= 5 && ini.length >= 2 && (abbr.startsWith(ini) || ini.startsWith(abbr)));
}

// ---------- Building the squads ----------

const GROUP = { GK: 0, CB: 1, LB: 1, RB: 1, LWB: 1, RWB: 1, CDM: 2, CM: 2, CAM: 2, LM: 2, RM: 2, LW: 3, RW: 3, ST: 3, CF: 3 };

/** The best-rated 4-3-3: indexes into the squad's rows. */
function bestXI(list) {
  const ranked = list.filter((x) => x.loan !== 'out').sort((a, b) => b.ovr - a.ovr || a.i - b.i);
  const picked = new Set();
  const take = (positions, count) => {
    let got = 0;
    [(x) => positions.includes(x.pos), (x) => x.pos !== 'GK' && x.alt.some((p) => positions.includes(p))].forEach((fits) => ranked.forEach((x) => {
      if (got < count && !picked.has(x.i) && fits(x)) { picked.add(x.i); got++; }
    }));
    return got;
  };
  take(['GK'], 1);
  let def = take(['LB', 'LWB'], 1) + take(['RB', 'RWB'], 1) + take(['CB'], 2);
  def += take(['CB', 'LB', 'RB', 'LWB', 'RWB'], 4 - def);
  let mid = take(['CDM', 'CM', 'CAM'], 3);
  mid += take(['LM', 'RM'], 3 - mid);
  take(['LW', 'LM'], 1);
  take(['RW', 'RM'], 1);
  take(['ST', 'CF'], 1);
  ranked.filter((x) => x.pos !== 'GK' && !picked.has(x.i)).slice(0, Math.max(0, 11 - picked.size)).forEach((x) => picked.add(x.i));
  return Array.from(picked).sort((a, b) => a - b);
}

/**
 * One club's rows from the game: [name, position, date of birth, nationality, loan, alias],
 * goalkeepers first and the best players of each line first, loanees out last.
 * The alias is the name people know when the game uses a shorter one ("Alejandro Balde" for "Balde").
 */
function clubRows(db, club, squad, wikiRows, loanedFrom) {
  const known = new Map(); // game id → { row, loan }
  wikiRows.forEach((r) => { const e = findPlayer(db, r); if (e) known.set(e.id, r); });
  const inSquad = new Set(squad.map((e) => e.id));
  const list = squad.map((e) => {
    const w = known.get(e.id);
    const loan = (w && w[4] === 'in') || (loanedFrom.has(e.id) && loanedFrom.get(e.id) !== club) ? 'in' : '';
    return { e, loan, wiki: w && w[0] };
  });
  // Loanees out: on this club's list as loaned out, and somewhere else in the game.
  wikiRows.filter((r) => r[4] === 'out').forEach((r) => {
    const e = findPlayer(db, r);
    if (e && !inSquad.has(e.id) && e.team != null) list.push({ e, loan: 'out', wiki: r[0] });
  });
  // The database misses a few players (youth goalkeepers, some late signings). When a squad has
  // no goalkeeper or fewer than 18 players, the club's listed players the game has nowhere else join
  // it: ones with a date of birth (so a different spelling can't hide them), and keepers if it has none.
  let filled = 0;
  const active = list.filter((x) => x.loan !== 'out');
  const noKeeper = !active.some((x) => x.e.pos === 'GK');
  if (active.length < 18 || noKeeper) {
    const names = new Set(list.flatMap((x) => [key(x.e.name), key(x.e.full), key(x.wiki)]));
    wikiRows.filter((r) => r[4] !== 'out' && (r[2] || (noKeeper && r[1] === 'GK')) && !candidates(db, r).length && !names.has(key(r[0]))).forEach((r) => {
      list.push({ e: { name: r[0], full: r[0], pos: r[1], dob: r[2], nat: r[3], alt: [], ovr: 0 }, loan: r[4] || '', wiki: r[0] });
      filled++;
    });
  }
  list.sort((a, b) => (a.loan === 'out') - (b.loan === 'out') || (GROUP[a.e.pos] || 0) - (GROUP[b.e.pos] || 0) || b.e.ovr - a.e.ovr);
  const rows = list.map(({ e, loan, wiki }) => {
    const alias = wiki ? (key(wiki) !== key(e.name) ? wiki : '') : key(e.full) !== key(e.name) ? e.full : '';
    const row = [e.name, e.pos, e.dob, e.nat];
    if (loan || alias) row.push(loan);
    if (alias) row.push(alias);
    return row;
  });
  const xi = bestXI(list.map(({ e, loan }, i) => ({ i, pos: e.pos, alt: e.alt, ovr: e.ovr, loan })));
  return { rows, xi, filled };
}


/**
 * Which of the game's teams is this squad list? The one sharing the most players.
 * Returns { team, shared } or null.
 */
function matchTeam(db, wikiRows, taken) {
  const counts = new Map();
  wikiRows.filter((r) => r[4] !== 'out').forEach((r) => {
    const e = findPlayer(db, r);
    if (e && e.team != null && !taken.has(e.team)) counts.set(e.team, (counts.get(e.team) || 0) + 1);
  });
  const [team, shared] = Array.from(counts).sort((a, b) => b[1] - a[1])[0] || [];
  return shared >= 3 ? { team: db.teams.get(team), shared } : null;
}

/** Players the game lists without a team, found in this squad list (same league only). */
function unnamedPlayers(db, wikiRows, league, used) {
  return wikiRows.filter((r) => r[4] !== 'out').map((r) => findPlayer(db, r))
    .filter((e) => e && e.team == null && e.league === league && !used.has(e.id));
}

function build(raw, unnamed) {
  const db = prepare(raw, unnamed);
  const taken = new Set();
  const used = new Set(); // teamless players already placed
  // A loanee's parent club, from every "out on loan" list.
  const loanedFrom = new Map();
  const allWiki = Object.entries(WIKI.clubs).concat(WIKI_EXTRA.leagues.flatMap((lg) => Object.entries(lg.clubs)));
  allWiki.forEach(([club, rows]) => rows.filter((r) => r[4] === 'out').forEach((r) => { const e = findPlayer(db, r); if (e) loanedFrom.set(e.id, club); }));

  // 1. The challenge clubs: strongest matches first, so a team goes to the club it fits best.
  const ours = leagues.flatMap((lg) => lg.clubs.map(([club]) => ({ club, lg, wiki: WIKI.clubs[club] || [] })));
  ours.forEach((c) => { c.match = matchTeam(db, c.wiki, new Set()); });
  ours.sort((a, b) => ((b.match && b.match.shared) || 0) - ((a.match && a.match.shared) || 0));
  const clubs = {};
  const xi = {};
  const gameNames = {};
  const notInGame = [];
  const partial = [];
  const filled = {};
  ours.forEach((c) => {
    const m = matchTeam(db, c.wiki, taken);
    if (m && (m.team.league === EA_LEAGUE[c.lg.id] || m.shared >= 8)) {
      taken.add(m.team.id);
      const built = clubRows(db, c.club, m.team.players, c.wiki, loanedFrom);
      clubs[c.club] = built.rows;
      xi[c.club] = built.xi;
      if (built.filled) filled[c.club] = built.filled;
      if (m.team.label && renamed(c.club, m.team.label)) gameNames[c.club] = m.team.label;
      return;
    }
    // A squad list that doesn't match at all (it can be the wrong article): the same league's team of that name.
    const byName = !m && Array.from(db.teams.values()).find((t) => !taken.has(t.id) && t.league === EA_LEAGUE[c.lg.id] && t.label && !renamed(c.club, t.label));
    if (byName) {
      taken.add(byName.id);
      const built = clubRows(db, c.club, byName.players, [], loanedFrom);
      clubs[c.club] = built.rows;
      xi[c.club] = built.xi;
      if (renamed(c.club, byName.label)) gameNames[c.club] = byName.label;
      return;
    }
    const found = unnamedPlayers(db, c.wiki, EA_LEAGUE[c.lg.id], used);
    if (found.length >= 8) {
      found.forEach((e) => used.add(e.id));
      const built = clubRows(db, c.club, found, c.wiki, loanedFrom);
      clubs[c.club] = built.rows;
      xi[c.club] = built.xi;
      partial.push(c.club);
      return;
    }
    // Not in the game (or not found): keep the squad list.
    if (c.wiki.length) {
      clubs[c.club] = c.wiki;
      xi[c.club] = WIKI.xi[c.club] || [];
    }
    notInGame.push(c.club);
  });

  // 2. The extra leagues' clubs, the same way.
  const extra = WIKI_EXTRA.leagues.map((lg) => Object.assign({}, lg, { clubs: {} }));
  const inGame = [];
  const eaLeagueOf = Object.fromEntries(Object.entries(EA_EXTRA).map(([ea, ours]) => [ours, ea]));
  WIKI_EXTRA.leagues.forEach((lg, li) => Object.entries(lg.clubs).forEach(([club, rows]) => {
    const m = matchTeam(db, rows, taken);
    const found = m ? null : unnamedPlayers(db, rows, eaLeagueOf[lg.name], used);
    if (m) {
      taken.add(m.team.id);
      extra[li].clubs[club] = clubRows(db, club, m.team.players, rows, loanedFrom).rows;
      inGame.push(club);
    } else if (found.length >= 8) {
      found.forEach((e) => used.add(e.id));
      extra[li].clubs[club] = clubRows(db, club, found, rows, loanedFrom).rows;
      inGame.push(club);
    } else extra[li].clubs[club] = rows;
  }));

  // 3. The game's teams nobody matched join the extra leagues, so every player in the game is known.
  const leftovers = [];
  db.teams.forEach((t) => {
    if (taken.has(t.id)) return;
    const into = EA_EXTRA[t.league] ? extra.find((lg) => lg.name === EA_EXTRA[t.league]) : null;
    const fresh = NEW_LEAGUES[t.league];
    let lg = into;
    if (!lg && fresh) {
      lg = extra.find((x) => x.name === fresh[0]);
      if (!lg) extra.push(lg = { name: fresh[0], country: fresh[1], level: 1, strength: 1, clubs: {} });
    }
    if (!lg) { leftovers.push(`${t.label} [${t.league}]`); return; }
    const name = lg.clubs[t.label] ? `${t.label} (${t.league})` : t.label;
    lg.clubs[name] = clubRows(db, name, t.players, [], loanedFrom).rows;
    inGame.push(name);
    taken.add(t.id);
  });
  const placed = new Set([...used]);
  db.teams.forEach((t) => { if (taken.has(t.id)) t.players.forEach((e) => placed.add(e.id)); });
  const missing = db.players.filter((e) => !placed.has(e.id));
  return { clubs, xi, gameNames, notInGame, partial, filled, extra, inGame, leftovers, missing, db };
}

const lit = (v) => JSON.stringify(v);

function write(r) {
  const today = new Date().toISOString().slice(0, 10);
  const players = Object.values(r.clubs).reduce((n, rows) => n + rows.length, 0);
  fs.writeFileSync(path.join(ROOT, 'js', 'squads.js'), `/*
 * Generated by scripts/fetch-ea-squads.js on ${today}. Do not edit by hand.
 * Every club's squad as it is in EA SPORTS FC 26 at launch: the players and their in-game
 * names, positions, nationalities and dates of birth, from EA's own FC 26 database (the one
 * behind ea.com's ratings pages). Loans come from each club's Wikipedia squad list (${WIKI.asOf}).
 * Each player: [name, position, date of birth, nationality, loan?, also known as?] where loan
 * is "in" (on loan at this club) or "out" (this club's player, loaned elsewhere), and the last
 * entry is the name people know when the game uses a shorter one ("Alejandro Balde" for "Balde").
 * Ratings aren't included: they're EA's.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  FC26.squads = {
    source: 'EA SPORTS FC 26 database',
    asOf: ${lit(WIKI.asOf)},
    fetched: ${lit(today)},
    seasonStart: ${lit(WIKI.seasonStart)},
    clubs: ${JSON.stringify(r.clubs)},
    // The likely starting XI per club (row indexes): the best-rated 4-3-3 in the game's squad.
    xi: ${JSON.stringify(r.xi)},
    // What the game calls clubs it has no licence for.
    gameNames: ${JSON.stringify(r.gameNames)},
    // Clubs whose squad couldn't be found in the game, so it's the Wikipedia list.
    notInGame: ${JSON.stringify(r.notInGame)},
    // Players added from the club's Wikipedia list where the game's database has too few.
    filled: ${JSON.stringify(r.filled)},
  };
})(typeof window !== 'undefined' ? window : globalThis);
`);
  const extra = r.extra.filter((lg) => Object.keys(lg.clubs).length);
  const extraPlayers = extra.reduce((n, lg) => n + Object.values(lg.clubs).reduce((m, rows) => m + rows.length, 0), 0);
  fs.writeFileSync(path.join(ROOT, 'js', 'squads-extra.js'), `/*
 * Generated by scripts/fetch-ea-squads.js on ${today}. Do not edit by hand.
 * Squads for leagues outside the challenge club list, used to recognise real players and
 * for the wonderkid scout (these clubs aren't playable). Clubs that are in FC 26 have the
 * game's squad (see js/squads.js); the rest have their Wikipedia squad list (${WIKI_EXTRA.asOf}).
 * Each player: [name, position, date of birth, nationality, loan?, also known as?] as in squads.js.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  FC26.extraSquads = {
    asOf: ${lit(WIKI_EXTRA.asOf)},
    fetched: ${lit(today)},
    leagues: ${JSON.stringify(extra)},
    // Clubs whose squad is the game's.
    inGame: ${JSON.stringify(r.inGame.slice().sort())},
  };
})(typeof window !== 'undefined' ? window : globalThis);
`);
  console.log(`Wrote js/squads.js: ${Object.keys(r.clubs).length} clubs, ${players} players`);
  console.log(`Wrote js/squads-extra.js: ${extra.length} leagues, ${extra.reduce((n, lg) => n + Object.keys(lg.clubs).length, 0)} clubs (${r.inGame.length} from the game), ${extraPlayers} players`);
}

module.exports = { build, download, teamsWithoutNames, renamed, findPlayer, bestXI };

if (require.main === module) {
  (async () => {
    const raw = await download();
    const unnamed = await teamsWithoutNames(raw);
    const r = build(raw, unnamed);
    console.log(`Challenge clubs: ${Object.keys(r.clubs).length - r.notInGame.length} from the game (${r.partial.length} partly), ${r.notInGame.length} kept from Wikipedia`);
    console.log('Not in the game:', r.notInGame.join(', ') || 'none');
    console.log('Partly (teamless in the database):', r.partial.join(', ') || 'none');
    console.log('Renamed in the game:', JSON.stringify(r.gameNames));
    console.log('Filled from Wikipedia:', JSON.stringify(r.filled));
    console.log('Extra clubs from the game:', r.inGame.length, '| unplaced teams:', r.leftovers.join(', ') || 'none');
    const by = {};
    r.missing.forEach((e) => { by[e.league] = (by[e.league] || 0) + 1; });
    console.log('Players not placed:', r.missing.length, JSON.stringify(by));
    write(r);
  })().catch((e) => {
    console.error(e.stack || e.message);
    process.exit(1);
  });
}
