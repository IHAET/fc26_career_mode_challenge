#!/usr/bin/env node
/*
 * Build scripts/wiki-squads-extra.json: squads for leagues outside the
 * challenge club list, so their players are recognised (not taken for regens)
 * and can be scouted. Same snapshot and sources as scripts/fetch-squads.js;
 * scripts/fetch-ea-squads.js lines them up with the game and writes
 * js/squads-extra.js.
 *
 *   node scripts/fetch-extra-squads.js             # find clubs (cached) + build squads
 *   node scripts/fetch-extra-squads.js --discover  # only find each league's clubs
 *
 * Each league's clubs come from its season article on English Wikipedia
 * (the links in its Teams section that Wikidata says are football clubs from
 * that country), cached in scripts/extra-leagues.json, which can be edited
 * by hand. Behind a proxy, run with NODE_USE_ENV_PROXY=1.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const F = require('./fetch-squads.js');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(__dirname, 'extra-leagues.json');
const OUT = path.join(__dirname, 'wiki-squads-extra.json');

// Season article, the name to show, the country's Wikidata item, roughly how many clubs, and a
// 1-3 strength used to rank scouting prospects (the challenge leagues use club sizes instead).
const LEAGUES = [
  ['2025–26 3. Liga', '3. Liga', 'Germany', 'Q183', 20, 1],
  ['2025–26 Swiss Super League', 'Swiss Super League', 'Switzerland', 'Q39', 12, 2],
  ['2025 Allsvenskan', 'Allsvenskan', 'Sweden', 'Q34', 16, 1],
  ['2025–26 Ekstraklasa', 'Ekstraklasa', 'Poland', 'Q36', 18, 1],
  ['2025 Argentine Primera División|Argentine Primera División', 'Liga Profesional', 'Argentina', 'Q414', 30, 2],
  ['2025 Campeonato Brasileiro Série A', 'Brasileirão Série A', 'Brazil', 'Q155', 20, 3],
  ['2025–26 Liga MX season', 'Liga MX', 'Mexico', 'Q96', 18, 2],
  ['2025 K League 1', 'K League 1', 'South Korea', 'Q884', 12, 1],
  ['2025 J1 League', 'J1 League', 'Japan', 'Q17', 20, 1],
  ['2025–26 A-League Men', 'A-League Men', 'Australia', 'Q408', 12, 1],
  ['2025 League of Ireland Premier Division', 'League of Ireland', 'Ireland', 'Q27', 10, 1],
  ['2025–26 Super League Greece', 'Super League Greece', 'Greece', 'Q41', 14, 2],
  ['2025–26 Czech First League', 'Czech First League', 'Czech Republic', 'Q213', 16, 1],
  ['2025–26 Croatian Football League', 'Croatian HNL', 'Croatia', 'Q224', 10, 1],
  ['2025–26 Serbian SuperLiga', 'Serbian SuperLiga', 'Serbia', 'Q403', 16, 1],
  ['2025–26 Ukrainian Premier League', 'Ukrainian Premier League', 'Ukraine', 'Q212', 16, 1],
  ['2025–26 Nemzeti Bajnokság I', 'NB I', 'Hungary', 'Q28', 12, 1],
  ['2025–26 Israeli Premier League', 'Israeli Premier League', 'Israel', 'Q801', 14, 1],
  ['2025–26 Cypriot First Division|Cypriot First Division', 'Cypriot First Division', 'Cyprus', 'Q229', 14, 1],
  ['2025–26 First Professional Football League (Bulgaria)|2025–26 Bulgarian First League', 'Bulgarian First League', 'Bulgaria', 'Q219', 16, 1],
  ['2025–26 Qatar Stars League|Qatar Stars League', 'Qatar Stars League', 'Qatar', 'Q846', 12, 1],
  ['2025–26 UAE Pro League|UAE Pro League', 'UAE Pro League', 'United Arab Emirates', 'Q878', 14, 1],
  ['2025–26 Egyptian Premier League', 'Egyptian Premier League', 'Egypt', 'Q79', 21, 1],
  ['2025–26 Botola Pro', 'Botola Pro', 'Morocco', 'Q1028', 16, 1],
  ['2025 Chinese Super League', 'Chinese Super League', 'China', 'Q148', 16, 1],
  ['2025 Chilean Primera División|Chilean Primera División', 'Chilean Primera División', 'Chile', 'Q298', 16, 1],
  ['2025 Categoría Primera A season|Categoría Primera A', 'Colombian Primera A', 'Colombia', 'Q739', 20, 1],
  ['2025 Uruguayan Primera División season|Uruguayan Primera División', 'Uruguayan Primera División', 'Uruguay', 'Q77', 16, 1],
  ['2025–26 Scottish Championship', 'Scottish Championship', 'Scotland', 'Q22', 10, 1],
  ['2025–26 Eerste Divisie', 'Eerste Divisie', 'Netherlands', 'Q55', 20, 1],
  ['2025–26 Liga Portugal 2', 'Liga Portugal 2', 'Portugal', 'Q45', 18, 1],
  ['2025–26 Challenger Pro League', 'Challenger Pro League', 'Belgium', 'Q31', 16, 1],
  ['2025–26 TFF 1. Lig', 'TFF 1. Lig', 'Türkiye', 'Q43', 20, 1],
  ['2025 Norwegian First Division', 'OBOS-ligaen', 'Norway', 'Q20', 16, 1],
  ['2025 Superettan', 'Superettan', 'Sweden', 'Q34', 16, 1],
  ['2025–26 Danish 1st Division', 'Danish 1st Division', 'Denmark', 'Q35', 12, 1],
].map(([titles, name, country, countryQid, expect, strength]) => {
  const [title, alt] = titles.split('|');
  return { title, alt, name, country, countryQid, expect, strength };
});

// Divisions below the top flight (the rest are top flights).
const LEVEL = {
  '3. Liga': 3, 'Scottish Championship': 2, 'Eerste Divisie': 2, 'Liga Portugal 2': 2, 'Challenger Pro League': 2,
  'TFF 1. Lig': 2, 'OBOS-ligaen': 2, Superettan: 2, 'Danish 1st Division': 2,
};

// Leagues whose clubs table leaves some out (Argentina shows its Buenos Aires clubs only on a map).
const ALL_LINKS = new Set(['2025 Argentine Primera División']);

// Clubs whose item names a different country than their league's (or none at all).
const EXTRA_COUNTRIES = { Scotland: ['Q145'], Netherlands: ['Q29999'], Ireland: ['Q145'], 'Czech Republic': ['Q33946'], Australia: ['Q664'] };

const decode = (s) => s.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&ndash;/g, '–');
const plain = (s) => decode(s.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/\{\{[^{}]*\}\}|<[^>]+>|'{2,}/g, '')).replace(/\s+/g, ' ').trim();

const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * A club's name to show, from every way the article writes its link: the
 * longest that's part of the club's own title ("1860 Munich", not the city
 * "Munich"; "VfB Stuttgart II", not "Stuttgart"), else the title itself.
 * Abbreviations ("IRT", "FAR") don't count.
 */
function clubName(texts, title) {
  const t = decode(title).replace(/\s*\([^)]*\)$/, '').replace(/\s+(F\.C\.|FC|S\.C\.|A\.F\.C\.|C\.F\.)$/, '');
  const reserve = (t.match(/\s(II|B|U2[13])$/) || [])[0] || '';
  const name = pickName(texts, t);
  return reserve && !name.endsWith(reserve) ? `${name}${reserve}` : name;
}

function pickName(texts, t) {
  const ok = Array.from(texts).map(plain).filter((x) => x.length > 4 && !(/^[A-Z0-9 .]+$/.test(x) && x.length <= 6));
  const inTitle = ok.filter((x) => fold(t).includes(fold(x).replace(/\s*\([^)]*\)$/, '')));
  if (inTitle.length) return inTitle.sort((a, b) => b.length - a.length)[0];
  return ok.length && !/\s(II|B|U2[13])$/.test(t) ? ok.sort((a, b) => a.length - b.length)[0] : t;
}

/**
 * Link groups in the season article's Teams section (leaving out its promoted/
 * relegated and managers parts): each table on its own, then the rest of the text.
 * Each group: [{ target, text }] in order.
 */
function teamGroups(text) {
  const heads = [];
  const re = /^(={2,4})\s*(.+?)\s*\1\s*$/gm;
  let m;
  while ((m = re.exec(text))) heads.push({ at: m.index, end: re.lastIndex, level: m[1].length, title: plain(m[2]).toLowerCase() });
  const start = heads.findIndex((h) => !/chang|promot|relegat/.test(h.title)
    && /^(teams?|clubs|participants|participating (teams|clubs)|(team|club) information|teams and (stadiums|locations|venues)|stadiums and locations|locations|venues|current (clubs|teams|members)|member clubs|\d{4}(–\d{2})? (clubs|teams|members|season))/.test(h.title));
  if (start < 0) return [];
  const top = heads[start];
  const next = heads.slice(start + 1).find((h) => h.level <= top.level);
  const groups = [];
  const linksIn = (body) => {
    const out = [];
    const lre = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;
    let l;
    while ((l = lre.exec(body))) out.push({ target: decode(l[1]).trim(), text: l[2] || l[1] });
    return out;
  };
  for (let i = start; i < heads.length && (!next || heads[i].at < next.at); i++) {
    const h = heads[i];
    if (i > start && /chang|promot|relegat|manag|coach|foreign|kit|sponsor|personnel/.test(h.title)) continue;
    const to = heads[i + 1] && (!next || heads[i + 1].at <= next.at) ? heads[i + 1].at : (next ? next.at : text.length);
    let body = text.slice(h.end, to);
    // Tables (not nested) as their own groups.
    body = body.replace(/\{\|[\s\S]*?\n\|\}/g, (table) => { groups.push(Object.assign(linksIn(table), { isTable: true })); return ''; });
    groups.push(linksIn(body));
  }
  return groups.filter((g) => g.length);
}

/** Each league's clubs: [{ name, title, qid }], cached so the list can be checked and edited. */
async function discover() {
  const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
  for (const lg of LEAGUES) {
    if (cache[lg.title]) continue;
    // No season article (or not yet on 15 September)? The league's own article lists its current clubs.
    const page = (await F.articleAt(lg.title)) || (lg.alt && (await F.articleAt(lg.alt)));
    if (!page) { console.warn(`  ? ${lg.title}: no article`); continue; }
    const groups = teamGroups(page.text);
    // Every way the article writes each link, to pick the best name from.
    const texts = new Map();
    for (const l of page.text.matchAll(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g)) {
      const k = decode(l[1]).trim();
      if (!texts.has(k)) texts.set(k, new Set());
      texts.get(k).add(l[2] || l[1]);
    }
    const titles = Array.from(new Set(groups.flat().map((l) => l.target)));
    const items = await F.itemsForTitles(titles);
    const qids = Array.from(new Set(items.values()));
    const ok = new Set();
    for (let i = 0; i < qids.length; i += 150) {
      const allowed = [lg.countryQid].concat(EXTRA_COUNTRIES[lg.country] || []);
      const rows = await F.sparql(`SELECT DISTINCT ?item WHERE {
        VALUES ?item { ${qids.slice(i, i + 150).map((q) => `wd:${q}`).join(' ')} }
        # Football clubs, or sports clubs (Boca Juniors and San Lorenzo are filed as those).
        VALUES ?kind { wd:Q476028 wd:Q847017 }
        ?item wdt:P31/wdt:P279* ?kind.
        OPTIONAL { ?item wdt:P17 ?country }
        FILTER(!BOUND(?country) || ?country IN (${allowed.map((q) => `wd:${q}`).join(', ')}))
      }`);
      rows.forEach((r) => ok.add(F.qid(r.item.value)));
    }
    const clubsOf = (group) => {
      const seen = new Set();
      const out = [];
      group.forEach((l) => {
        const q = items.get(l.target);
        if (!q || !ok.has(q) || seen.has(q)) return;
        seen.add(q);
        out.push({ name: clubName(texts.get(l.target) || [l.text], l.target), title: l.target, qid: q });
      });
      return out;
    };
    // The table whose clubs best match the league's size; otherwise every club link in the section.
    const near = (c) => Math.abs(c.length - lg.expect);
    const tables = groups.filter((g) => g.isTable).map(clubsOf);
    const best = tables.filter((c) => c.length >= Math.max(6, lg.expect * 0.6)).sort((a, b) => near(a) - near(b))[0];
    // Some articles split the clubs over several tables (six to a row).
    const allTables = clubsOf(groups.filter((g) => g.isTable).flat());
    // Whichever comes closest to the league's size: the best table, all tables together, or every
    // club link in the section (some list a few clubs only on a map). Ties go to the tables.
    const everything = clubsOf(groups.flat());
    const clubs = ALL_LINKS.has(lg.title) ? everything : [best, allTables, everything].filter((c) => c && c.length)
      .reduce((a, b) => (near(b) < near(a) ? b : a));
    cache[lg.title] = clubs;
    fs.writeFileSync(CACHE, `${JSON.stringify(cache, null, 1)}\n`);
    console.log(`${lg.name}: ${clubs.length} clubs (expected about ${lg.expect})${Math.abs(clubs.length - lg.expect) > 3 ? '  <-- check' : ''}`);
  }
  return cache;
}

async function build(cache) {
  const lists = []; // [{ league, club, players }]
  const all = LEAGUES.filter((lg) => cache[lg.title] && cache[lg.title].length);
  let n = 0;
  const total = all.reduce((sum, lg) => sum + cache[lg.title].length, 0);
  for (const lg of all) {
    for (const club of cache[lg.title]) {
      const page = await F.articleAt(club.title);
      let players = page ? F.squadFromArticle(page.text) : [];
      // Some clubs keep the squad in a template of its own ({{Colo-Colo squad}}): read that instead.
      const tpl = page && players.filter((x) => x.loan !== 'out').length < 11 && page.text.match(/\{\{\s*([^{}|\n]{3,60}? squad)\s*\}\}/i);
      if (tpl) {
        const t = await F.articleAt(`Template:${tpl[1].trim()}`);
        const more = t ? F.squadFromArticle(t.text) : [];
        if (more.length > players.length) players = more;
      }
      lists.push({ lg, club, players });
      process.stdout.write(`\rWikipedia: ${++n}/${total} clubs`);
    }
  }
  console.log('');
  const links = new Set(lists.flatMap((l) => l.players.map((p) => p.link)).filter(Boolean));
  const facts = await F.playerFacts(links);
  const redirected = await F.itemsForTitles(Array.from(links).filter((t) => !(facts.get(t) || {}).dob));
  const byItem = await F.factsForItems(Array.from(new Set(redirected.values())));
  redirected.forEach((item, title) => { if (byItem.has(item)) facts.set(title, byItem.get(item)); });
  const missing = lists.flatMap((l) => l.players.filter((p) => !(facts.get(p.link) || {}).dob).map((p) => [p.name, l.club.qid]));
  const byClub = await F.playerFactsByClub(missing);

  const leagues = all.map((lg) => ({ name: lg.name, country: lg.country, level: LEVEL[lg.name] || 1, strength: lg.strength, clubs: {} }));
  let players = 0;
  const thin = [];
  lists.forEach(({ lg, club, players: list }) => {
    const rows = list.map((p) => {
      const byTitle = facts.get(p.link);
      const f = (byTitle && byTitle.dob ? byTitle : byClub.get(`${p.name}|${club.qid}`) || byTitle) || { dob: '', positions: new Set() };
      const age = f.dob ? F.ageOn(f.dob, F.SEASON_START) : 0;
      const dob = age >= 15 && age <= 43 ? f.dob : '';
      const row = [p.name, F.bestPosition(Array.from(f.positions), p.group), dob, p.nat];
      return p.loan ? row.concat(p.loan) : row;
    }).sort((a, b) => (a[4] === 'out') - (b[4] === 'out'));
    if (rows.filter((r) => r[4] !== 'out').length < 11) thin.push(`${club.name} (${rows.length})`);
    if (!rows.length) return;
    leagues.find((x) => x.name === lg.name).clubs[club.name] = rows;
    players += rows.length;
  });
  const today = new Date().toISOString().slice(0, 10);
  const out = leagues.filter((lg) => Object.keys(lg.clubs).length);
  fs.writeFileSync(OUT, `${JSON.stringify({ asOf: F.CUTOFF, fetched: today, leagues: out })}\n`);
  console.log(`Wrote ${path.relative(ROOT, OUT)}: ${out.length} leagues, ${out.reduce((s, lg) => s + Object.keys(lg.clubs).length, 0)} clubs, ${players} players`);
  if (thin.length) console.log(`Fewer than 11 players: ${thin.join(', ')}`);
}

(async () => {
  const cache = await discover();
  if (process.argv.includes('--discover')) return;
  await build(cache);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
