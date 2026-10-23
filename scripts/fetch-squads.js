#!/usr/bin/env node
/*
 * Build js/squads.js: current squads (name, position, date of birth,
 * nationality) for every club in js/data.js, from Wikidata (CC0).
 *
 *   node scripts/fetch-squads.js            # resolve clubs (cached) + fetch squads
 *   node scripts/fetch-squads.js --resolve  # only find each club's Wikidata item
 *
 * Behind a proxy, run with NODE_USE_ENV_PROXY=1 (Node 22.21+).
 *
 * How it decides who is "in the squad", in two passes:
 *   1. Candidates: male footballers born 1985 or later with a spell at the
 *      club that has a start date (2015 or later) and no end date.
 *   2. For each candidate, all their club spells are fetched; they're kept
 *      only at the club whose open spell started most recently (national
 *      teams ignored), so players who moved on, or are out on loan, show
 *      up at their current club only.
 * Old spells that were never closed on Wikidata are the main source of
 * noise this guards against. Lower divisions can still be incomplete.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(__dirname, 'club-qids.json');
const OUT = path.join(ROOT, 'js', 'squads.js');
const UA = 'FC26ChallengeBuilder/1.0 (https://github.com/IHAET/fc26_career_mode_challenge)';
const SEASON_START = '2025-07-01';

require(path.join(ROOT, 'js', 'data.js'));
const { leagues } = globalThis.FC26.data;

// Countries a club item may carry (English-pyramid clubs can be England, UK or Wales).
const COUNTRY_QIDS = {
  England: ['Q21', 'Q145', 'Q25'], Scotland: ['Q22', 'Q145'], Spain: ['Q29', 'Q228'], Italy: ['Q38'], Germany: ['Q183'],
  France: ['Q142', 'Q235'], Netherlands: ['Q55', 'Q29999'], Portugal: ['Q45'], USA: ['Q30', 'Q16'], 'Saudi Arabia': ['Q851'],
  Belgium: ['Q31'], 'Türkiye': ['Q43'], Norway: ['Q20'], Denmark: ['Q35'], Austria: ['Q40'],
};

// Search terms for names that are too short or ambiguous to find on their own.
const SEARCH_AS = {
  OB: 'Odense Boldklub', AGF: 'AGF Aarhus', PSV: 'PSV Eindhoven', HamKam: 'Hamarkameratene', LAFC: 'Los Angeles FC',
  Roma: 'AS Roma', Como: 'Como 1907', Genoa: 'Genoa CFC', Pisa: 'Pisa SC', Parma: 'Parma Calcio 1913', Torino: 'Torino FC',
  Bologna: 'Bologna FC 1909', Lazio: 'SS Lazio', Napoli: 'SSC Napoli', Juventus: 'Juventus FC', Lecce: 'US Lecce',
  Udinese: 'Udinese Calcio', Cagliari: 'Cagliari Calcio', Sassuolo: 'US Sassuolo Calcio', Cremonese: 'US Cremonese',
  Fiorentina: 'ACF Fiorentina', Atalanta: 'Atalanta BC', Venezia: 'Venezia FC', Empoli: 'Empoli FC', Monza: 'AC Monza',
  Palermo: 'Palermo FC', Sampdoria: 'UC Sampdoria', Bari: 'SSC Bari', Spezia: 'Spezia Calcio', Modena: 'Modena FC',
  Cesena: 'Cesena FC', Catanzaro: 'US Catanzaro 1929', 'Juve Stabia': 'SS Juve Stabia', 'Südtirol': 'FC Südtirol',
  Carrarese: 'Carrarese Calcio', Reggiana: 'AC Reggiana 1919', Mantova: 'Mantova 1911', Frosinone: 'Frosinone Calcio',
  Padova: 'Calcio Padova', Avellino: 'US Avellino 1912', Pescara: 'Delfino Pescara 1936', Brann: 'SK Brann',
  Viking: 'Viking FK', Rosenborg: 'Rosenborg BK', Molde: 'Molde FK', Fredrikstad: 'Fredrikstad FK', 'Vålerenga': 'Vålerenga Fotball',
  'Tromsø': 'Tromsø IL', Sandefjord: 'Sandefjord Fotball', 'Strømsgodset': 'Strømsgodset IF', Kristiansund: 'Kristiansund BK',
  Haugesund: 'FK Haugesund', Bryne: 'Bryne FK', Rangers: 'Rangers F.C.', Celtic: 'Celtic F.C.', Aberdeen: 'Aberdeen F.C.',
  Hibernian: 'Hibernian F.C.', Motherwell: 'Motherwell F.C.', Dundee: 'Dundee F.C.', Kilmarnock: 'Kilmarnock F.C.',
  Falkirk: 'Falkirk F.C.', Livingston: 'Livingston F.C.', Liverpool: 'Liverpool F.C.', Chelsea: 'Chelsea F.C.',
  Everton: 'Everton F.C.', Fulham: 'Fulham F.C.', Brentford: 'Brentford F.C.', Burnley: 'Burnley F.C.', Sunderland: 'Sunderland A.F.C.',
  Southampton: 'Southampton F.C.', Watford: 'Watford F.C.', Millwall: 'Millwall F.C.', Portsmouth: 'Portsmouth F.C.',
  Barnsley: 'Barnsley F.C.', Blackpool: 'Blackpool F.C.', Reading: 'Reading F.C.', Stevenage: 'Stevenage F.C.',
  Chesterfield: 'Chesterfield F.C.', Walsall: 'Walsall F.C.', Gillingham: 'Gillingham F.C.', Barrow: 'Barrow A.F.C.',
  Bromley: 'Bromley F.C.', Barnet: 'Barnet F.C.', 'Celta Vigo': 'RC Celta de Vigo', Osasuna: 'CA Osasuna', Getafe: 'Getafe CF',
  Espanyol: 'RCD Espanyol', Levante: 'Levante UD', Elche: 'Elche CF', Sevilla: 'Sevilla FC', Valencia: 'Valencia CF',
  Villarreal: 'Villarreal CF', Girona: 'Girona FC', Albacete: 'Albacete Balompié', Toulouse: 'Toulouse FC', 'Le Havre': 'Le Havre AC',
  Ajax: 'AFC Ajax', Excelsior: 'Excelsior Rotterdam', Telstar: 'SC Telstar', Galatasaray: 'Galatasaray S.K.',
  'Fenerbahçe': 'Fenerbahçe S.K.', 'Beşiktaş': 'Beşiktaş J.K.', 'Başakşehir': 'İstanbul Başakşehir F.K.', 'Göztepe': 'Göztepe S.K.',
  'Kasımpaşa': 'Kasımpaşa S.K.', 'Gençlerbirliği': 'Gençlerbirliği S.K.', Damac: 'Damac FC', 'Al Hilal': 'Al Hilal SFC',
  'Al Nassr': 'Al Nassr FC', 'Al Ittihad': 'Ittihad FC', 'Al Ahli': 'Al-Ahli Saudi FC', 'Al Qadsiah': 'Al-Qadsiah FC',
  'Al Ettifaq': 'Ettifaq FC', 'Al Shabab': 'Al-Shabab FC', 'Al Taawoun': 'Al-Taawoun FC', 'Al Fateh': 'Al-Fateh SC',
  'Al Khaleej': 'Khaleej FC', 'Al Riyadh': 'Al-Riyadh SC', 'Al Fayha': 'Al-Fayha FC', 'Al Kholood': 'Al-Kholood Club',
  'Al Okhdood': 'Al-Okhdood Club', 'Al Hazem': 'Al-Hazem F.C.', 'Al Najma': 'Al-Najma SC', 'Chicago Fire': 'Chicago Fire FC',
  'Houston Dynamo': 'Houston Dynamo FC', 'St. Louis CITY SC': 'St. Louis City SC', 'Minnesota United': 'Minnesota United FC',
  'Vancouver Whitecaps': 'Vancouver Whitecaps FC', 'Atlanta United': 'Atlanta United FC', 'Orlando City': 'Orlando City SC',
  'Club Brugge': 'Club Brugge KV', 'Cercle Brugge': 'Cercle Brugge K.S.V.', 'Sporting Charleroi': 'R. Charleroi S.C.',
  'OH Leuven': 'Oud-Heverlee Leuven', 'Royal Antwerp': 'Royal Antwerp F.C.', 'Vejle BK': 'Vejle Boldklub',
  'Sønderjyske': 'SønderjyskE Fodbold', 'Sturm Graz': 'SK Sturm Graz', 'Rapid Wien': 'SK Rapid Wien', 'Austria Wien': 'FK Austria Wien',
  'Blau-Weiß Linz': 'FC Blau-Weiß Linz', 'Red Bull Salzburg': 'FC Red Bull Salzburg', Moreirense: 'Moreirense F.C.',
  'Estoril Praia': 'G.D. Estoril Praia', 'Rio Ave': 'Rio Ave F.C.', 'Santa Clara': 'C.D. Santa Clara', 'Casa Pia': 'Casa Pia A.C.',
  AVS: 'AVS Futebol SAD', 'Gil Vicente': 'Gil Vicente F.C.', 'Vitória SC': 'Vitória S.C.', Inter: 'Inter Milan',
};

const POSITION = [
  [/goalkeeper/i, 'GK'], [/left[- ]back/i, 'LB'], [/right[- ]back/i, 'RB'], [/wing[- ]back/i, 'RWB'], [/full[- ]back/i, 'RB'],
  [/cent(re|er)[- ]back|sweeper|defender/i, 'CB'], [/defensive midfield/i, 'CDM'], [/attacking midfield/i, 'CAM'],
  [/left wing/i, 'LW'], [/right wing/i, 'RW'], [/winger|wide midfield/i, 'RW'], [/midfield/i, 'CM'],
  [/second striker/i, 'CF'], [/forward|striker/i, 'ST'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function sparql(query) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch('https://query.wikidata.org/sparql', {
      method: 'POST',
      headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `query=${encodeURIComponent(query)}`,
    });
    if (r.status === 429 || r.status >= 500) {
      await sleep(4000 * (attempt + 1));
      continue;
    }
    if (!r.ok) throw new Error(`SPARQL ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return (await r.json()).results.bindings;
  }
  throw new Error('Wikidata kept refusing the query');
}

const qid = (uri) => uri.split('/').pop();
const lit = (s) => JSON.stringify(String(s));

// ---------- 1. Find each club's Wikidata item ----------

async function resolveClubs() {
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  const todo = leagues.flatMap((l) => l.clubs.map(([name]) => ({ name, country: l.country, league: l.name })))
    .filter((c) => !cache[c.name]);
  for (let i = 0; i < todo.length; i += 12) {
    const batch = todo.slice(i, i + 12);
    const terms = new Map(batch.map((c) => [SEARCH_AS[c.name] || c.name, c]));
    const rows = await sparql(`SELECT ?term ?item ?itemLabel ?country ?num WHERE {
      VALUES ?term { ${Array.from(terms.keys()).map(lit).join(' ')} }
      SERVICE wikibase:mwapi { bd:serviceParam wikibase:api "EntitySearch"; wikibase:endpoint "www.wikidata.org";
        mwapi:search ?term; mwapi:language "en". ?item wikibase:apiOutputItem mwapi:item. ?num wikibase:apiOrdinal true. }
      ?item wdt:P31/wdt:P279* wd:Q476028.
      OPTIONAL { ?item wdt:P17 ?country }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`);
    terms.forEach((club, term) => {
      const hits = rows.filter((r) => r.term.value === term).sort((a, b) => Number(a.num.value) - Number(b.num.value));
      const allowed = COUNTRY_QIDS[club.country] || [];
      const best = hits.find((r) => r.country && allowed.includes(qid(r.country.value)));
      if (best) cache[club.name] = { qid: qid(best.item.value), label: best.itemLabel.value };
      else console.warn(`  ? ${club.name} (${club.league}): ${hits.length ? `only found ${[...new Set(hits.map((h) => h.itemLabel.value))].slice(0, 3).join(', ')}` : 'no football club found'}`);
    });
    fs.writeFileSync(CACHE, `${JSON.stringify(cache, null, 1)}\n`);
    process.stdout.write(`\rResolved ${Object.keys(cache).length} clubs`);
    await sleep(800);
  }
  console.log('');
  return cache;
}

// ---------- 2. Fetch squads ----------

function candidateQuery(qids) {
  return `SELECT ?club ?p ?pLabel ?dob ?start ?posLabel ?natLabel WHERE {
    VALUES ?club { ${qids.map((q) => `wd:${q}`).join(' ')} }
    ?p p:P54 ?st. ?st ps:P54 ?club; pq:P580 ?start.
    FILTER(?start >= "2015-01-01T00:00:00Z"^^xsd:dateTime)
    FILTER NOT EXISTS { ?st pq:P582 ?end }
    ?st wikibase:rank ?rank. FILTER(?rank != wikibase:DeprecatedRank)
    ?p wdt:P106 wd:Q937857; wdt:P21 wd:Q6581097; wdt:P569 ?dob.
    FILTER(YEAR(?dob) >= 1985)
    OPTIONAL { ?p wdt:P413 ?pos }
    OPTIONAL { ?p wdt:P1532 ?nat1 }
    OPTIONAL { ?p wdt:P27 ?nat2 }
    BIND(COALESCE(?nat1, ?nat2) AS ?nat)
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`;
}

function spellsQuery(players) {
  return `SELECT ?p ?team ?teamLabel ?start ?end WHERE {
    VALUES ?p { ${players.map((q) => `wd:${q}`).join(' ')} }
    ?p p:P54 ?st. ?st ps:P54 ?team.
    ?st wikibase:rank ?rank. FILTER(?rank != wikibase:DeprecatedRank)
    OPTIONAL { ?st pq:P580 ?start }
    OPTIONAL { ?st pq:P582 ?end }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  }`;
}

const NATIONAL = /national|olympic|\bunder[- ]?\d{2}\b|\bU-?\d{2}\b/i;

function ageOn(dob, day) {
  const [y, m, d] = dob.slice(0, 10).split('-').map(Number);
  const [Y, M, D] = day.split('-').map(Number);
  return Y - y - (M < m || (M === m && D < d) ? 1 : 0);
}

function posCode(label) {
  const hit = POSITION.find(([re]) => re.test(label || ''));
  return hit ? hit[1] : '';
}

async function fetchSquads(clubs) {
  const byQid = new Map(Object.entries(clubs).map(([name, v]) => [v.qid, name]));
  const qids = Array.from(byQid.keys());
  // Pass 1: candidates per club.
  const candidates = new Map(); // player qid → { name, dob, pos, nat, at: Map(clubQid → start) }
  for (let i = 0; i < qids.length; i += 6) {
    const rows = await sparql(candidateQuery(qids.slice(i, i + 6)));
    rows.forEach((r) => {
      const id = qid(r.p.value);
      const name = r.pLabel.value;
      if (/^Q\d+$/.test(name)) return; // no English label
      const c = candidates.get(id) || { name, dob: r.dob.value.slice(0, 10), pos: '', nat: '', at: new Map() };
      c.at.set(qid(r.club.value), r.start.value);
      if (!c.pos && r.posLabel) c.pos = posCode(r.posLabel.value);
      // The country's name (the app turns it into "Brazilian" etc.); demonyms are unreliable ("Spaniard").
      if (!c.nat && r.natLabel && !/^Q\d+$/.test(r.natLabel.value)) c.nat = r.natLabel.value;
      candidates.set(id, c);
    });
    process.stdout.write(`\rPass 1: ${Math.min(i + 6, qids.length)}/${qids.length} clubs, ${candidates.size} candidates`);
    await sleep(600);
  }
  console.log('');

  // Pass 2: each candidate's other open spells decide where they play now.
  const ids = Array.from(candidates.keys());
  const latestOpen = new Map(); // player → latest start among open, non-national spells
  for (let i = 0; i < ids.length; i += 150) {
    const rows = await sparql(spellsQuery(ids.slice(i, i + 150)));
    rows.forEach((r) => {
      if (r.end && r.end.value.slice(0, 10) <= SEASON_START) return; // finished before the season
      if (!r.start || NATIONAL.test(r.teamLabel ? r.teamLabel.value : '')) return;
      const id = qid(r.p.value);
      if (!latestOpen.has(id) || r.start.value > latestOpen.get(id)) latestOpen.set(id, r.start.value);
    });
    process.stdout.write(`\rPass 2: ${Math.min(i + 150, ids.length)}/${ids.length} players`);
    await sleep(600);
  }
  console.log('');

  const squads = {};
  candidates.forEach((c, id) => {
    const latest = latestOpen.get(id);
    c.at.forEach((start, clubQid) => {
      if (latest && start < latest) return; // he's moved on (or is on loan) since
      const club = byQid.get(clubQid);
      if (!club) return;
      squads[club] = squads[club] || new Map();
      squads[club].set(id, { name: c.name, dob: c.dob, pos: c.pos, nat: c.nat });
    });
  });
  return squads;
}

function writeSquads(squads, clubs) {
  const out = {};
  let players = 0;
  Object.keys(clubs).sort().forEach((club) => {
    const list = Array.from((squads[club] || new Map()).values())
      .filter((p) => ageOn(p.dob, SEASON_START) <= 40)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!list.length) return;
    out[club] = list.map((p) => [p.name, p.pos, p.dob, p.nat]);
    players += list.length;
  });
  const header = `/*
 * Generated by scripts/fetch-squads.js on ${new Date().toISOString().slice(0, 10)}. Do not edit by hand.
 * Squad lists from Wikidata (https://www.wikidata.org), released under CC0.
 * Wikidata is community-edited: lower divisions can be incomplete or out of date.
 * Each player: [name, position, date of birth, nationality].
 */
`;
  const body = `(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  FC26.squads = {
    source: 'Wikidata (CC0)',
    fetched: ${lit(new Date().toISOString().slice(0, 10))},
    seasonStart: ${lit(SEASON_START)},
    clubs: ${JSON.stringify(out)},
  };
})(typeof window !== 'undefined' ? window : globalThis);
`;
  fs.writeFileSync(OUT, header + body);
  console.log(`Wrote ${path.relative(ROOT, OUT)}: ${Object.keys(out).length} clubs, ${players} players`);
}

(async () => {
  const clubs = await resolveClubs();
  if (process.argv.includes('--resolve')) return;
  const squads = await fetchSquads(clubs);
  writeSquads(squads, clubs);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
