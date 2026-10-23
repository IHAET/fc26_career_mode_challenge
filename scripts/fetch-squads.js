#!/usr/bin/env node
/*
 * Build js/squads.js: every club's squad as FC 26 launched (name, position,
 * date of birth, nationality, loans), from Wikipedia and Wikidata.
 *
 *   node scripts/fetch-squads.js            # resolve clubs (cached) + build squads
 *   node scripts/fetch-squads.js --resolve  # only find each club's Wikidata item
 *
 * Behind a proxy, run with NODE_USE_ENV_PROXY=1 (Node 22.21+).
 *
 * How it works:
 *   1. Each club's English Wikipedia article is read as it stood on CUTOFF
 *      (summer windows shut, deadline-day deals in), and the players in its
 *      first-team and out-on-loan squad lists are taken, academies left out.
 *   2. Each linked player's Wikidata item adds a date of birth and a precise
 *      position (left-back rather than "DF"). Players without an article keep
 *      the list's broad position and have no date of birth.
 * Downloaded pages are cached in scripts/.wiki-cache so re-runs are quick.
 * The api.php endpoints rate-limit hard, so pages come through index.php and
 * only redirect lookups (50 titles a request) use the API.
 * Squad lists are facts, not creative text; Wikidata is CC0.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CACHE = path.join(__dirname, 'club-qids.json');
const PAGES = path.join(__dirname, '.wiki-cache');
const OUT = path.join(ROOT, 'js', 'squads.js');
const UA = 'FC26ChallengeBuilder/1.0 (https://github.com/IHAET/fc26_career_mode_challenge)';
const CUTOFF = '2025-09-15'; // squads as FC 26 launched
const SEASON_START = '2025-07-01'; // career mode's first day, for ages

require(path.join(ROOT, 'js', 'data.js'));
const { leagues } = globalThis.FC26.data;

// Countries a club item may carry (English-pyramid clubs can be England, UK or Wales).
const COUNTRY_QIDS = {
  England: ['Q21', 'Q145', 'Q25'], Scotland: ['Q22', 'Q145'], Spain: ['Q29', 'Q228'], Italy: ['Q38'], Germany: ['Q183'],
  France: ['Q142', 'Q235'], Netherlands: ['Q55', 'Q29999'], Portugal: ['Q45'], USA: ['Q30', 'Q16'], 'Saudi Arabia': ['Q851'],
  Belgium: ['Q31'], 'Türkiye': ['Q43'], Norway: ['Q20'], Denmark: ['Q35'], Austria: ['Q40'], Romania: ['Q218'],
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
  FCSB: 'FCSB', 'Rapid București': 'FC Rapid București', 'Dinamo București': 'FC Dinamo București',
  'Universitatea Craiova': 'CS Universitatea Craiova', 'Universitatea Cluj': 'FC Universitatea Cluj', 'Farul Constanța': 'FCV Farul Constanța',
  'Petrolul Ploiești': 'FC Petrolul Ploiești', 'UTA Arad': 'FC UTA Arad', 'Oțelul Galați': 'ASC Oțelul Galați', Hermannstadt: 'FC Hermannstadt',
  'Unirea Slobozia': 'AFC Unirea Slobozia', 'Csíkszereda': 'FK Csíkszereda Miercurea Ciuc', 'Metaloglobus București': 'FC Metaloglobus București',
  'FC Argeș': 'FC Argeș Pitești', 'CFR Cluj': 'CFR Cluj',
};

// Wikidata position labels → FC positions. Specific roles first; the bare
// "defender"/"midfielder"/"forward" only count when nothing better is listed.
const POSITION = [
  [/goalkeeper/i, 'GK'], [/left wing[- ]back/i, 'LWB'], [/right wing[- ]back/i, 'RWB'], [/wing[- ]back/i, 'RWB'],
  [/left[- ]back/i, 'LB'], [/right[- ]back/i, 'RB'], [/cent(re|er)[- ]back|sweeper|libero/i, 'CB'], [/full[- ]back/i, 'RB'],
  [/defensive midfield/i, 'CDM'], [/attacking midfield/i, 'CAM'], [/left midfield/i, 'LM'], [/right midfield/i, 'RM'],
  [/wide midfield/i, 'RM'], [/left wing/i, 'LW'], [/right wing/i, 'RW'], [/winger/i, 'RW'], [/central midfield/i, 'CM'],
  [/second striker|false nine/i, 'CF'], [/cent(re|er)[- ]forward|striker/i, 'ST'],
];
const BROAD = [[/defender/i, 'CB'], [/midfielder/i, 'CM'], [/forward/i, 'ST']];
// Positions that fit each squad-list group, and the fallback when Wikidata has nothing.
const GROUP = {
  GK: ['GK'], DF: ['CB', 'LB', 'RB', 'LWB', 'RWB'], MF: ['CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW'], FW: ['ST', 'CF', 'LW', 'RW'],
};
const GROUP_DEFAULT = { GK: 'GK', DF: 'CB', MF: 'CM', FW: 'ST' };

// Squad-list nationality codes (FIFA, plus the ISO ones some pages use) → country.
const NAT_CODES = Object.fromEntries(`AFG Afghanistan|ALB Albania|ALG Algeria|DZA Algeria|AND Andorra|ANG Angola|AGO Angola|ATG Antigua and Barbuda
|ARG Argentina|ARM Armenia|ARU Aruba|AUS Australia|AUT Austria|AZE Azerbaijan|BAH Bahamas|BHR Bahrain|BAN Bangladesh|BRB Barbados
|BLR Belarus|BEL Belgium|BLZ Belize|BEN Benin|BER Bermuda|BOL Bolivia|BIH Bosnia and Herzegovina|BOT Botswana|BRA Brazil|BUL Bulgaria
|BGR Bulgaria|BFA Burkina Faso|BKF Burkina Faso|BDI Burundi|CMR Cameroon|CAN Canada|CPV Cape Verde|CTA Central African Republic|CAR Central African Republic|CAF Central African Republic
|CHA Chad|TCD Chad|CHI Chile|CHL Chile|CHN China|COL Colombia|COM Comoros|CGO Congo|COG Congo|COD DR Congo|DRC DR Congo|ZAI DR Congo|CRC Costa Rica
|CRI Costa Rica|CRO Croatia|HRV Croatia|CUB Cuba|CUW Curaçao|CUR Curaçao|CYP Cyprus|CZE Czech Republic|DEN Denmark|DNK Denmark|DJI Djibouti
|DOM Dominican Republic|ECU Ecuador|EGY Egypt|SLV El Salvador|ENG England|EQG Equatorial Guinea|GNQ Equatorial Guinea|ERI Eritrea
|EST Estonia|SWZ Eswatini|ESW Eswatini|ETH Ethiopia|FRO Faroe Islands|FAR Faroe Islands|FIJ Fiji|FIN Finland|FRA France|GUF French Guiana|GAB Gabon
|GAM Gambia|GMB Gambia|GEO Georgia|GER Germany|DEU Germany|GHA Ghana|GIB Gibraltar|GRE Greece|GRC Greece|GRN Grenada|GRD Grenada|GLP Guadeloupe
|GUA Guatemala|GTM Guatemala|GUI Guinea|GIN Guinea|GNB Guinea-Bissau|GUY Guyana|HAI Haiti|HTI Haiti|HON Honduras|HND Honduras
|HKG Hong Kong|HUN Hungary|ISL Iceland|IND India|IDN Indonesia|INA Indonesia|IRN Iran|IRI Iran|IRQ Iraq|IRL Ireland|ISR Israel|JER Jersey|ITA Italy
|CIV Ivory Coast|JAM Jamaica|JPN Japan|JAP Japan|JOR Jordan|KAZ Kazakhstan|KEN Kenya|KOS Kosovo|KVX Kosovo|XKX Kosovo|KUW Kuwait|KWT Kuwait
|KGZ Kyrgyzstan|LVA Latvia|LAT Latvia|LIB Lebanon|LBN Lebanon|LES Lesotho|LBR Liberia|LBY Libya|LIE Liechtenstein|LTU Lithuania|LIT Lithuania
|LUX Luxembourg|MAD Madagascar|MDG Madagascar|MWI Malawi|MAS Malaysia|MYS Malaysia|MLI Mali|MLT Malta|MTQ Martinique|MTN Mauritania
|MRT Mauritania|MRI Mauritius|MUS Mauritius|MYT Mayotte|MEX Mexico|MDA Moldova|MNE Montenegro|MSR Montserrat|MAR Morocco|MOZ Mozambique
|NAM Namibia|NED Netherlands|HOL Netherlands|NLD Netherlands|NCL New Caledonia|NZL New Zealand|NCA Nicaragua|NIC Nicaragua|NIG Niger|NER Niger
|NGA Nigeria|NGR Nigeria|NIR Northern Ireland|PRK North Korea|MKD North Macedonia|NOR Norway|OMA Oman|OMN Oman|PAK Pakistan|PLE Palestine
|PSE Palestine|PAN Panama|PAR Paraguay|PRY Paraguay|PER Peru|PHI Philippines|PHL Philippines|POL Poland|POR Portugal|PRT Portugal
|PUR Puerto Rico|PRI Puerto Rico|QAT Qatar|REU Réunion|ROU Romania|ROM Romania|RUS Russia|RWA Rwanda|SKN Saint Kitts and Nevis|KNA Saint Kitts and Nevis
|LCA Saint Lucia|VIN Saint Vincent and the Grenadines|SMR San Marino|STP São Tomé and Príncipe|KSA Saudi Arabia|SAU Saudi Arabia
|SCO Scotland|SEN Senegal|SRB Serbia|SER Serbia|SEY Seychelles|SYC Seychelles|SLE Sierra Leone|SGP Singapore|SIN Singapore|SXM Sint Maarten
|SVK Slovakia|SVN Slovenia|SLO Slovenia|SOM Somalia|RSA South Africa|ZAF South Africa|KOR South Korea|ROK South Korea|SSD South Sudan|ESP Spain|SPA Spain
|SRI Sri Lanka|LKA Sri Lanka|SDN Sudan|SUD Sudan|SUR Suriname|SWE Sweden|SUI Switzerland|SWI Switzerland|CHE Switzerland|SYR Syria|TAH Tahiti
|TPE Taiwan|TJK Tajikistan|TAN Tanzania|TZA Tanzania|THA Thailand|TOG Togo|TGO Togo|TRI Trinidad and Tobago|TTO Trinidad and Tobago
|TUN Tunisia|TUR Turkey|TKM Turkmenistan|UGA Uganda|UKR Ukraine|UAE United Arab Emirates|ARE United Arab Emirates|USA United States
|URU Uruguay|URY Uruguay|UZB Uzbekistan|VEN Venezuela|VIE Vietnam|VNM Vietnam|WAL Wales|YEM Yemen|ZAM Zambia|ZMB Zambia|ZIM Zimbabwe
|ZWE Zimbabwe`.split('|').map((pair) => { const [code, ...name] = pair.trim().split(' '); return [code, name.join(' ')]; }));

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

// ---------- 2. Read each club's squad list on Wikipedia ----------

/** A page through index.php, waiting out rate limits. Returns '' for a missing page. */
async function wiki(params) {
  const url = `https://en.wikipedia.org/w/index.php?${new URLSearchParams(params)}`;
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 404) return '';
    if (r.ok) return r.text();
    await r.text().catch(() => {});
    await sleep(((Number(r.headers.get('retry-after')) || 5) + 1) * 1000 * (attempt + 1));
  }
  throw new Error(`Wikipedia kept refusing ${url}`);
}

/** The article's wikitext as it stood on CUTOFF (cached), following one redirect. */
async function articleAt(title, depth = 0) {
  const file = path.join(PAGES, `${title.replace(/[^\p{L}\p{N}._-]+/gu, '_')}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const history = await wiki({ title, action: 'history', offset: `${CUTOFF.replace(/-/g, '')}000000`, limit: 1 });
  const rev = (history.match(/data-mw-revid="(\d+)"/) || [])[1];
  let page = null;
  // Renamed since the cutoff? The old revisions now live under the new title.
  if (!rev && depth < 1) {
    const now = await wiki({ title, action: 'raw' });
    const moved = now.match(/^#REDIRECT\s*\[\[([^\]|#]+)/i);
    if (moved) return articleAt(moved[1].trim(), depth + 1);
  }
  if (rev) {
    const text = await wiki({ oldid: rev, action: 'raw' });
    const redirect = text.match(/^#REDIRECT\s*\[\[([^\]|#]+)/i);
    if (redirect && depth < 1) return articleAt(redirect[1].trim(), depth + 1);
    page = { title, rev: Number(rev), text };
  }
  fs.mkdirSync(PAGES, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(page));
  await sleep(250);
  return page;
}

/** Each {{name ...}} template in the text whose name matches, with its offset. */
function templates(text, nameRe) {
  const out = [];
  const re = /\{\{\s*([^|{}]+?)\s*\|/g;
  let m;
  while ((m = re.exec(text))) {
    if (!nameRe.test(m[1])) continue;
    let depth = 0;
    let i = m.index;
    for (; i < text.length - 1; i++) {
      if (text[i] === '{' && text[i + 1] === '{') { depth++; i++; } else if (text[i] === '}' && text[i + 1] === '}') { depth--; i++; if (!depth) break; }
    }
    out.push({ at: m.index, body: text.slice(m.index + 2, i - 1) });
    re.lastIndex = i;
  }
  return out;
}

/** A template's named parameters, splitting on | outside links and nested templates. */
function params(body) {
  const out = {};
  let depth = 0;
  let cur = '';
  const parts = [];
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; } else if (two === '}}' || two === ']]') { depth--; cur += two; i++; } else if (body[i] === '|' && !depth) { parts.push(cur); cur = ''; } else cur += body[i];
  }
  parts.push(cur);
  parts.slice(1).forEach((p) => {
    const eq = p.indexOf('=');
    if (eq > 0) out[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
  });
  return out;
}

const plain = (s) => s
  .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>|<!--[\s\S]*?-->/g, '')
  .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
  .replace(/\{\{[^{}]*\}\}|<[^>]+>|'{2,}/g, '')
  .replace(/\s+/g, ' ').trim();

/** name= value → { name, link } (link is the article title, or '' for a plain name). */
function playerName(value) {
  const v = value.replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>|<!--[\s\S]*?-->/g, '');
  const link = v.match(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/);
  if (link) return { name: plain(link[2] || link[1].replace(/\s*\([^)]*\)$/, '')), link: link[1].trim() };
  const sort = v.match(/\{\{\s*sortname\s*\|([^|}]*)\|([^|}]*)(?:\|([^|}]*))?/i);
  if (sort) {
    const name = `${sort[1].trim()} ${sort[2].trim()}`.trim();
    return { name, link: sort[3] && !/^nolink|^dab=/i.test(sort[3].trim()) ? sort[3].trim() : name };
  }
  return { name: plain(v), link: '' };
}

/**
 * Players in the article's first-team and out-on-loan lists. Each:
 * { name, link, group (GK/DF/MF/FW), nat, loan: 'in' | 'out' | '' }.
 */
function squadFromArticle(text) {
  const headings = [];
  const hre = /^(={2,5})\s*(.+?)\s*\1\s*$/gm;
  let h;
  while ((h = hre.exec(text))) headings.push({ at: h.index, text: plain(h[2]).toLowerCase() });
  const kindAt = (at) => {
    const head = headings.filter((x) => x.at < at).pop();
    const t = head ? head.text : '';
    if (/academy|under[-–— ]?\d|\bu-?\d\d|\beds\b|(^|\s)b(\s|$)|reserve|youth|development|women|\bii\b|retired|former|notable|captain|record|international|staff|kit|histor|century|all[- ]time|hall of fame|greatest|legend|award|of the (year|season)|\bjong\b|primavera|juvenil|castilla|atl[eè]tic\b|next ?gen|\bnxt\b|sub[- ]?\d|filial|amateur|promesas|bilbao athletic|sanse\b/.test(t)) return '';
    if (/loan/.test(t)) return 'out';
    // The first squad list is the first team; later ones only count if they say so
    // (reserve sides go by all sorts of names: "Young Reds", "Zebra Elites", "SL16").
    if (first === null) first = t;
    return t === first || /other players|under contract|first[- ]team|senior/.test(t) ? 'squad' : '';
  };
  let first = null;
  const seen = new Set();
  const out = [];
  templates(text, /^(fs|football squad) ?2? player$/i).forEach(({ at, body }) => {
    const kind = kindAt(at);
    if (!kind) return;
    const p = params(body);
    // The newer squad template splits the name: first= / last= (and link= for the article).
    if (!p.name && (p.first || p.last)) {
      const full = `${plain(p.first || '')} ${plain(p.last || '')}`.trim();
      p.name = `[[${plain(p.link || '') || full}|${full}]]`;
    }
    if (!p.name) return;
    const { name, link } = playerName(p.name);
    if (!name || seen.has(name)) return;
    seen.add(name);
    const other = plain(p.other || '').toLowerCase();
    const loan = kind === 'out' || /^(at|on loan (to|at))\b/.test(other) ? 'out' : /^on loan from\b/.test(other) ? 'in' : '';
    const code = plain(p.nat || '').toUpperCase();
    const num = Number(plain(p.no || '').replace(/\D/g, '')) || null;
    out.push({ name, link, group: plain(p.pos || '').toUpperCase(), nat: NAT_CODES[code] || plain(p.nat || ''), loan, num });
  });
  return out;
}

// ---------- 3. Dates of birth and positions from Wikidata ----------

/** Article title → { dob, positions[] } for every title Wikidata links to an English article. */
async function playerFacts(titles) {
  const facts = new Map();
  const list = Array.from(titles);
  for (let i = 0; i < list.length; i += 200) {
    const rows = await sparql(`SELECT ?title ?dob ?posLabel WHERE {
      VALUES ?title { ${list.slice(i, i + 200).map((t) => `${lit(t)}@en`).join(' ')} }
      ?a schema:name ?title; schema:isPartOf <https://en.wikipedia.org/>; schema:about ?p.
      OPTIONAL { ?p wdt:P569 ?dob }
      OPTIONAL { ?p wdt:P413 ?pos }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`);
    rows.forEach((r) => {
      const f = facts.get(r.title.value) || { dob: '', positions: new Set() };
      if (!f.dob && r.dob && /^\d{4}-\d\d-\d\d/.test(r.dob.value)) f.dob = r.dob.value.slice(0, 10);
      if (r.posLabel) f.positions.add(r.posLabel.value);
      facts.set(r.title.value, f);
    });
    process.stdout.write(`\rWikidata: ${Math.min(i + 200, list.length)}/${list.length} players`);
    await sleep(500);
  }
  console.log('');
  return facts;
}

/**
 * Wikidata items for article titles Wikidata doesn't list under that name
 * (redirects such as "Rodri (footballer, born 1996)"), via the Wikipedia API,
 * 50 titles a request. Cached, since the API rate-limits hard.
 */
async function itemsForTitles(titles) {
  const file = path.join(PAGES, 'items.json');
  const cache = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const todo = titles.filter((t) => !(t in cache));
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
      action: 'query', titles: batch.join('|'), redirects: 1, prop: 'pageprops', ppprop: 'wikibase_item', format: 'json', formatversion: 2,
    })}`;
    let json = null;
    for (let attempt = 0; attempt < 10 && !json; attempt++) {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) json = await r.json();
      else {
        await r.text().catch(() => {});
        await sleep(((Number(r.headers.get('retry-after')) || 10) + 2) * 1000);
      }
    }
    if (!json) throw new Error('The Wikipedia API kept refusing');
    const q = json.query || {};
    const hop = new Map([...(q.normalized || []), ...(q.redirects || [])].map((x) => [x.from, x.to]));
    const item = new Map((q.pages || []).map((pg) => [pg.title, pg.pageprops && pg.pageprops.wikibase_item]));
    batch.forEach((t) => {
      let title = t;
      for (let k = 0; k < 3 && hop.has(title); k++) title = hop.get(title);
      cache[t] = item.get(title) || null;
    });
    fs.writeFileSync(file, JSON.stringify(cache));
    process.stdout.write(`\rWikipedia redirects: ${Math.min(i + 50, todo.length)}/${todo.length} titles`);
    await sleep(1500);
  }
  if (todo.length) console.log('');
  return new Map(titles.filter((t) => cache[t]).map((t) => [t, cache[t]]));
}

/** Item QID → { dob, positions } from Wikidata. */
async function factsForItems(qids) {
  const facts = new Map();
  for (let i = 0; i < qids.length; i += 200) {
    const rows = await sparql(`SELECT ?p ?dob ?posLabel WHERE {
      VALUES ?p { ${qids.slice(i, i + 200).map((q) => `wd:${q}`).join(' ')} }
      OPTIONAL { ?p wdt:P569 ?dob }
      OPTIONAL { ?p wdt:P413 ?pos }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`);
    rows.forEach((r) => {
      const id = qid(r.p.value);
      const f = facts.get(id) || { dob: '', positions: new Set() };
      if (!f.dob && r.dob && /^\d{4}-\d\d-\d\d/.test(r.dob.value)) f.dob = r.dob.value.slice(0, 10);
      if (r.posLabel) f.positions.add(r.posLabel.value);
      facts.set(id, f);
    });
    await sleep(500);
  }
  return facts;
}

/**
 * Facts for players the title lookup missed (their link is a redirect, or
 * there's no link): matched on English name or alias plus a spell at the club.
 * Keys are "name|club QID".
 */
async function playerFactsByClub(pairs) {
  const facts = new Map();
  for (let i = 0; i < pairs.length; i += 150) {
    const batch = pairs.slice(i, i + 150);
    const rows = await sparql(`SELECT ?name ?club ?dob ?posLabel WHERE {
      VALUES (?name ?club) { ${batch.map(([name, club]) => `(${lit(name)}@en wd:${club})`).join(' ')} }
      { ?p rdfs:label ?name } UNION { ?p skos:altLabel ?name }
      ?p wdt:P54 ?club; wdt:P106 wd:Q937857.
      OPTIONAL { ?p wdt:P569 ?dob }
      OPTIONAL { ?p wdt:P413 ?pos }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`);
    rows.forEach((r) => {
      const k = `${r.name.value}|${qid(r.club.value)}`;
      const f = facts.get(k) || { dob: '', positions: new Set() };
      if (!f.dob && r.dob && /^\d{4}-\d\d-\d\d/.test(r.dob.value)) f.dob = r.dob.value.slice(0, 10);
      if (r.posLabel) f.positions.add(r.posLabel.value);
      facts.set(k, f);
    });
    process.stdout.write(`\rWikidata by club: ${Math.min(i + 150, pairs.length)}/${pairs.length} players`);
    await sleep(500);
  }
  console.log('');
  return facts;
}

/** The most specific Wikidata position that fits the squad list's group. */
function bestPosition(labels, group) {
  const fits = (code) => !GROUP[group] || GROUP[group].includes(code);
  for (const table of [POSITION, BROAD]) {
    for (const [re, code] of table) {
      if (labels.some((l) => re.test(l)) && fits(code)) return code;
    }
  }
  return GROUP_DEFAULT[group] || '';
}

async function fetchSquads(clubs) {
  const titles = await clubTitles(clubs);
  const lists = {};
  const names = Object.keys(clubs);
  for (let i = 0; i < names.length; i++) {
    const page = titles[names[i]] && (await articleAt(titles[names[i]]));
    lists[names[i]] = page ? squadFromArticle(page.text) : [];
    process.stdout.write(`\rWikipedia: ${i + 1}/${names.length} clubs`);
  }
  console.log('');
  const links = new Set(Object.values(lists).flat().map((p) => p.link).filter(Boolean));
  const facts = await playerFacts(links);
  // Redirected titles: find their items through Wikipedia, then their facts.
  const redirected = await itemsForTitles(Array.from(links).filter((t) => !(facts.get(t) || {}).dob));
  const byItem = await factsForItems(Array.from(new Set(redirected.values())));
  redirected.forEach((item, title) => { if (byItem.has(item)) facts.set(title, byItem.get(item)); });
  const missing = Object.entries(lists).flatMap(([club, list]) => list
    .filter((p) => !(facts.get(p.link) || {}).dob).map((p) => [p.name, clubs[club].qid]));
  const byClub = await playerFactsByClub(missing);
  const squads = {};
  Object.entries(lists).forEach(([club, list]) => {
    squads[club] = list.map((p) => {
      const byTitle = facts.get(p.link);
      const f = (byTitle && byTitle.dob ? byTitle : byClub.get(`${p.name}|${clubs[club].qid}`) || byTitle) || { dob: '', positions: new Set() };
      // A name match can find the wrong person: drop dates that make no sense for a player.
      const age = f.dob ? ageOn(f.dob, SEASON_START) : 0;
      return { name: p.name, pos: bestPosition(Array.from(f.positions), p.group), dob: age >= 15 && age <= 43 ? f.dob : '', nat: p.nat, loan: p.loan, num: p.num };
    });
  });
  return squads;
}

/** Each club's English Wikipedia title, from its Wikidata item (cached with the item). */
async function clubTitles(clubs) {
  const todo = Object.entries(clubs).filter(([, v]) => !v.wiki);
  for (let i = 0; i < todo.length; i += 100) {
    const batch = todo.slice(i, i + 100);
    const rows = await sparql(`SELECT ?item ?title WHERE { VALUES ?item { ${batch.map(([, v]) => `wd:${v.qid}`).join(' ')} }
      ?a schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?title. }`);
    const byItem = new Map(rows.map((r) => [qid(r.item.value), r.title.value]));
    batch.forEach(([, v]) => { if (byItem.has(v.qid)) v.wiki = byItem.get(v.qid); });
  }
  if (todo.length) fs.writeFileSync(CACHE, `${JSON.stringify(clubs, null, 1)}\n`);
  return Object.fromEntries(Object.entries(clubs).map(([name, v]) => [name, v.wiki || '']));
}

function ageOn(dob, day) {
  const [y, m, d] = dob.slice(0, 10).split('-').map(Number);
  const [Y, M, D] = day.split('-').map(Number);
  return Y - y - (M < m || (M === m && D < d) ? 1 : 0);
}

/**
 * A likely starting XI in a 4-3-3 (indexes into the club's rows). There are no
 * ratings, so players are ranked by what hints at a regular starter: a shirt
 * number from 1 to 11, being one of the well-known players in js/players.js,
 * and an age in the prime years. Loanees out never start.
 */
function defaultXI(rows) {
  const ranked = rows.map((r, i) => {
    const [name, pos, dob, , loan] = r;
    if (loan === 'out') return null;
    const age = dob ? ageOn(dob, SEASON_START) : 25;
    const num = r.num;
    const known = CURATED.get(dbKey(name));
    let score = num >= 1 && num <= 11 ? 40 - num : num >= 12 && num <= 30 ? 14 - (num - 12) * 0.4 : 0;
    if (known) score += 28;
    if (age >= 21 && age <= 33) score += 6;
    if (age <= 18) score -= 12;
    return { i, pos: (known && known.pos) || pos, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.i - b.i);
  const picked = new Set();
  const take = (positions, count) => {
    const got = ranked.filter((x) => positions.includes(x.pos) && !picked.has(x.i)).slice(0, Math.max(0, count));
    got.forEach((x) => picked.add(x.i));
    return got.length;
  };
  take(['GK'], 1);
  let def = take(['LB', 'LWB'], 1) + take(['RB', 'RWB'], 1) + take(['CB'], 2);
  def += take(['CB', 'LB', 'RB', 'LWB', 'RWB'], 4 - def);
  let mid = take(['CDM', 'CM', 'CAM'], 3);
  mid += take(['LM', 'RM'], 3 - mid);
  let att = take(['LW'], 1) + take(['RW'], 1) + take(['ST', 'CF'], 1);
  att += take(['ST', 'CF', 'LW', 'RW', 'LM', 'RM'], 3 - att);
  ranked.filter((x) => x.pos !== 'GK' && !picked.has(x.i)).slice(0, Math.max(0, 11 - picked.size)).forEach((x) => picked.add(x.i));
  return Array.from(picked).sort((a, b) => a - b);
}

// The hand-written list of well-known players (name → { pos }), for the default XI.
const dbKey = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const CURATED = (() => {
  const prev = globalThis.FC26;
  globalThis.FC26 = {};
  require(path.join(ROOT, 'js', 'players.js'));
  const map = new Map(globalThis.FC26.playerDB.curated.map((p) => [dbKey(p.name), p]));
  globalThis.FC26 = prev;
  return map;
})();

function writeSquads(squads) {
  const out = {};
  const xi = {};
  let players = 0;
  const thin = [];
  Object.keys(squads).sort().forEach((club) => {
    const list = squads[club].slice();
    if (list.length < 11) thin.push(`${club} (${list.length})`);
    if (!list.length) return;
    // Loanees out are listed last, flagged "out"; loanees in are flagged "in".
    list.sort((a, b) => (a.loan === 'out') - (b.loan === 'out'));
    out[club] = list.map((p) => (p.loan ? [p.name, p.pos, p.dob, p.nat, p.loan] : [p.name, p.pos, p.dob, p.nat]));
    xi[club] = defaultXI(list.map((p, i) => Object.assign(out[club][i].slice(), { num: p.num })));
    players += list.length;
  });
  const today = new Date().toISOString().slice(0, 10);
  const header = `/*
 * Generated by scripts/fetch-squads.js on ${today}. Do not edit by hand.
 * Squads as FC 26 launched (${CUTOFF}): first-team and out-on-loan lists from each club's
 * English Wikipedia article as it stood then, with dates of birth and positions from
 * Wikidata (CC0). Players without a Wikipedia article have no date of birth.
 * Each player: [name, position, date of birth, nationality, loan?] where loan is
 * "in" (on loan at this club) or "out" (this club's player, loaned elsewhere).
 */
`;
  const body = `(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  FC26.squads = {
    source: 'Wikipedia squad lists and Wikidata',
    asOf: ${lit(CUTOFF)},
    fetched: ${lit(today)},
    seasonStart: ${lit(SEASON_START)},
    clubs: ${JSON.stringify(out)},
    // A likely starting XI per club (row indexes), from shirt numbers and well-known players.
    xi: ${JSON.stringify(xi)},
  };
})(typeof window !== 'undefined' ? window : globalThis);
`;
  fs.writeFileSync(OUT, header + body);
  console.log(`Wrote ${path.relative(ROOT, OUT)}: ${Object.keys(out).length} clubs, ${players} players`);
  if (thin.length) console.log(`Fewer than 11 players: ${thin.join(', ')}`);
}

if (require.main !== module) {
  module.exports = {
    squadFromArticle, playerName, bestPosition, articleAt, wiki, sparql, playerFacts, itemsForTitles, factsForItems,
    playerFactsByClub, ageOn, lit, qid, sleep, PAGES, CUTOFF, SEASON_START,
  };
} else (async () => {
  const clubs = await resolveClubs();
  if (process.argv.includes('--resolve')) return;
  const squads = await fetchSquads(clubs);
  writeSquads(squads);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
