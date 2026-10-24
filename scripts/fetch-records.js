#!/usr/bin/env node
/*
 * Build js/records.js: each club's record signing (fee, player, the club he
 * came from, year) as FC 26 launched, for rules such as "Break your club's
 * transfer record". Read from English Wikipedia as it stood on the squads'
 * cutoff: the club's "records and statistics" list when it has one, else the
 * club's own article. Clubs where no record is written down are left out.
 *
 *   node scripts/fetch-records.js     # add NODE_USE_ENV_PROXY=1 behind a proxy
 *
 * Pages are cached in scripts/.wiki-cache, like scripts/fetch-squads.js.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const F = require('./fetch-squads.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'js', 'records.js');
const CLUBS = require('./club-qids.json');

// Rough rates for the summer of 2025, only to compare fees in one currency (€).
const TO_EUR = { '£': 1.17, '€': 1, $: 0.88 };

const clubTitles = new Set(Object.values(CLUBS).map((c) => c.wiki).filter(Boolean));
const CLUBBY = /\b(F\.?C\.?|A\.?F\.?C\.?|C\.?F\.?|S\.?C\.?|S\.?V\.?|A\.?C\.?|S\.?S\.?C?|club|calcio|association football|transfer|league|cup|record|national|football|stadium|S\.?K\.?|I\.?F\.?|B\.?K\.?)\b/i;

/** Wikitext with references, notes and most templates taken out. */
function clean(text) {
  return text
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\{\{(?:sfn|efn|refn|citation needed|cn|clarify|when|nbsp|·)[^{}]*\}\}/gi, '')
    .replace(/\{\{(?:circa|c\.)\}\}/gi, 'c.')
    .replace(/\{\{sortname\|([^|}]+)\|([^|}]+)(?:\|([^|}]+))?[^}]*\}\}/gi, (m, a, b, link) => `[[${link || `${a} ${b}`}|${a} ${b}]]`)
    .replace(/'''?/g, '')
    .replace(/&nbsp;/g, ' ');
}

/** A fee in a piece of text: { text: "£105m", eur: 122.9 } (millions), or null. */
function fee(seg) {
  // {{£|45 million}}, {{GBP|45m}}, {{€|80 million}}
  const s = seg.replace(/\{\{\s*(£|€|GBP|EUR|US\$|USD)\s*\|\s*([^}|]+)[^}]*\}\}/gi, (m, c, v) => `${{ GBP: '£', EUR: '€', USD: '$', 'US$': '$' }[c.toUpperCase()] || c}${v}`);
  for (const m of s.matchAll(/(£|€|US\$|\$)\s?(\d{1,3}(?:[,.]\d{3})+|\d+(?:\.\d+)?)\s*(m\b|million|mn\b|bn\b|billion|k\b|thousand)?/gi)) {
    const got = money(m);
    if (got) return got;
  }
  return null;
}

function money(m) {
  const cur = m[1] === 'US$' ? '$' : m[1];
  let n = Number(m[2].replace(/,/g, '').replace(/\.(?=\d{3}\b)/g, ''));
  const unit = (m[3] || '').toLowerCase();
  if (/^(m|million|mn)$/.test(unit)) n *= 1e6;
  else if (/^(bn|billion)$/.test(unit)) n *= 1e9;
  else if (/^(k|thousand)$/.test(unit)) n *= 1e3;
  if (!(n >= 1e5) || n > 3e8) return null; // too small for a modern record, or misread
  const millions = n / 1e6;
  const shown = millions >= 1 ? `${cur}${+millions.toFixed(millions < 10 ? 1 : 0)}m` : `${cur}${Math.round(n / 1e3)}k`;
  return { text: shown, eur: Math.round(millions * TO_EUR[cur] * 10) / 10 };
}

/** The wikilinks in a piece of text: [{ target, label }]. */
const links = (seg) => Array.from(seg.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g)).map((m) => ({ target: m[1].trim(), label: (m[2] || m[1]).trim() }));
// Clubs the app knows by name, so "West Ham" isn't taken for a player.
const clubNames = new Set(Object.keys(CLUBS).concat(require('./wiki-squads-extra.json').leagues.flatMap((lg) => Object.keys(lg.clubs))).map((n) => n.toLowerCase()));
// A link to a club (for the selling club): a known club, or a football-club article.
const isClub = (l) => clubTitles.has(l.target) || /\b(F\.?C\.?|A\.?F\.?C\.?|C\.?F\.?|S\.?C\.?|S\.?V\.?|A\.?C\.?|S\.?K\.?|K\.?V\.?|B\.?K\.?|I\.?F\.?|calcio|club|\(football club\)|\(soccer\))\b/i.test(l.target)
  || clubNames.has(l.label.toLowerCase()) || clubNames.has(l.target.toLowerCase())
  || Array.from(clubNames).some((n) => n.split(' ').includes(l.label.toLowerCase()) && l.label.length >= 4 && /^[A-Z]/.test(l.label) && !l.label.includes(' ') && n.split(' ').length > 1);
// Not a player: clubs, and articles about leagues, cups, transfers, records and so on.
const notPlayer = (l) => isClub(l) || CLUBBY.test(l.target);

const PAID = /(record|highest|biggest|largest|most expensive)[^.;\n]{0,50}?(fee|signing|transfer|purchase|buy)[^.;\n]{0,40}?(paid|spent|by the club|in (?:the )?club(?:'s)? history|ever)|club[- ]record (?:fee|signing|transfer)|record (?:signing|purchase|buy)|(?:incoming|club's|club) (?:transfer|fee) record|record transfer fee paid|paid a (?:club[- ])?record|transfer record\b[^.;\n]{0,30}\bpaid/i;
const RECEIVED = /received|\bsold\b|\bsale\b|selling|departure|outgoing|incoming fee/i;

/** One clause's record: fee, player and selling club all inside it. */
function fromClause(clause, clubTitle) {
  const f = fee(clause);
  const ls = links(clause).filter((l) => l.target !== clubTitle && !/^(File|Image|Category):/i.test(l.target));
  const player = ls.find((l) => !notPlayer(l) && /^\p{Lu}/u.test(l.label) && l.label.split(' ').length >= 1 && l.label.split(' ').length <= 5 && !/\d/.test(l.label));
  if (!f || !player) return null;
  const at = ls.indexOf(player);
  const from = ls.slice(at + 1).find(isClub) || ls.slice(0, at).reverse().find(isClub);
  const dated = clause.match(/\{\{dts[^}]*?\b((?:19|20)\d\d)\b/) || null;
  const years = Array.from(clause.matchAll(/\b(19[5-9]\d|20[0-2]\d)\b/g)).map((m) => Number(m[1])).filter((y) => y <= 2025);
  return {
    fee: f.text, eur: f.eur, player: player.label.replace(/\s*\(.*\)$/, ''),
    from: from ? from.label.replace(/\s*\(.*\)$/, '') : '', year: dated ? Number(dated[1]) : years.length ? Math.max(...years) : null,
  };
}

/** The club's record signing from an article's text, or null. */
function findRecord(text, clubTitle) {
  const t = clean(text).replace(/\[\[(?:File|Image):[^|\]]*\|(?:[^|\]]*\|)*/gi, '');
  // 1. A "highest transfer fees paid" table, under a caption or a heading: its dearest row.
  const titled = /(record|highest|most expensive|biggest)[^\n]*(paid|signings|purchases|bought|incoming|arrivals)|record paid|transfer fees paid/i;
  const tables = [];
  for (const m of t.matchAll(/\|\+([^\n]*)\n([\s\S]*?)\n\|\}/g)) tables.push([m[1], m[2]]);
  for (const h of t.matchAll(/^(={2,5})\s*([^=\n]+?)\s*\1\s*$/gm)) {
    const after = t.slice(h.index + h[0].length, h.index + h[0].length + 6000);
    const next = after.search(/^={2,5}[^=\n]/m);
    const body = (next >= 0 ? after.slice(0, next) : after).match(/\{\|([\s\S]*?)\n\|\}/);
    if (body) tables.push([h[2], body[1]]);
  }
  for (const [title, body] of tables) {
    if (!titled.test(title) || RECEIVED.test(title)) continue;
    // A column of plain numbers under a "£ million" heading.
    const unit = (body.match(/(£|€|\$)\s*(?:m\b|million|mn\b)/i) || [])[1];
    const rows = body.split(/\n\|-/).map((r) => {
      let row = r.replace(/\n/g, ' ');
      if (unit && !fee(row)) {
        const cell = row.split(/\|\||\s\|(?=[^|])/).map((c) => c.replace(/^[^|]*\|(?!\|)/, '').trim()).find((c) => /^(£|€|\$)?\d{1,3}(\.\d+)?$/.test(c) && Number(c.replace(/^\D/, '')) >= 0.1);
        if (cell) row += ` ${unit}${cell.replace(/^\D/, '')}m`;
      }
      return fromClause(row, clubTitle);
    }).filter(Boolean);
    rows.sort((a, b) => b.eur - a.eur);
    if (rows[0]) return rows[0];
  }
  // 2. A sentence (one clause of it) that says what the record fee paid is.
  const clauses = t.split(/\n|;|(?<=[a-z0-9)\]]\.)\s+(?=[A-Z[])/);
  for (const c of clauses) {
    if (!PAID.test(c) || RECEIVED.test(c)) continue;
    const r = fromClause(c, clubTitle);
    if (r) return r;
  }
  return null;
}

// Checked by hand where Wikipedia's wording misleads the reader above (a stale sentence, a
// table it can't read). null: leave the club out rather than show a doubtful figure.
const CHECKED = {
  Chelsea: { fee: '£106.8m', eur: 125, player: 'Enzo Fernández', from: 'Benfica', year: 2023 },
  Juventus: { fee: '€100m', eur: 100, player: 'Cristiano Ronaldo', from: 'Real Madrid', year: 2018 },
  Napoli: { fee: '€70m', eur: 70, player: 'Victor Osimhen', from: 'Lille', year: 2020 },
  'FC Bayern München': { fee: '€100m', eur: 100, player: 'Harry Kane', from: 'Tottenham Hotspur', year: 2023 },
  'Atlético de Madrid': { fee: '€126m', eur: 126, player: 'João Félix', from: 'Benfica', year: 2019 },
  'AS Monaco': { fee: '€60m', eur: 60, player: 'Radamel Falcao', from: 'Atlético Madrid', year: 2013 },
  'Hull City': { fee: '£13m', eur: 15.2, player: 'Ryan Mason', from: 'Tottenham Hotspur', year: 2016 },
  'FC Barcelona': { fee: '€120m', eur: 120, player: 'Philippe Coutinho', from: 'Liverpool', year: 2018 },
  'FC Schalke 04': { fee: '€27m', eur: 26.5, player: 'Breel Embolo', from: 'Basel', year: 2016 },
  'St Mirren': null, Barnsley: null,
  'Real Madrid': null, 'SL Benfica': null, 'FC Porto': null, 'Stade Rennais': null, 'SC Freiburg': null, Sunderland: null, 'RC Strasbourg': null,
};

async function main() {
  const out = {};
  const sources = {};
  const names = Object.keys(CLUBS);
  for (const club of names) {
    const title = CLUBS[club].wiki;
    if (!title) continue;
    const lists = [`List of ${title} records and statistics`, `${title.replace(/ F\.C\.$| A\.F\.C\.$/, '')} records and statistics`];
    let rec = null;
    let src = '';
    for (const t of lists.concat(title)) {
      const page = await F.articleAt(t);
      if (!page || !page.text) continue;
      rec = findRecord(page.text, title);
      if (rec) { src = page.title; break; }
    }
    if (club in CHECKED) {
      rec = CHECKED[club];
      src = rec ? 'checked by hand' : '';
    }
    if (rec) {
      out[club] = rec;
      sources[club] = src;
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(OUT, `/*
 * Generated by scripts/fetch-records.js on ${today}. Do not edit by hand.
 * Each club's record signing as of ${F.CUTOFF} (when FC 26 launched), from English Wikipedia:
 * { fee (as reported), eur (millions of euros, converted at rough 2025 rates for comparing),
 *   player, from (the selling club), year, source (the article) }.
 * Clubs where Wikipedia doesn't name a record signing are missing.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  FC26.records = ${JSON.stringify(Object.fromEntries(Object.entries(out).map(([c, r]) => [c, Object.assign(r, { source: sources[c] })])))};
})(typeof window !== 'undefined' ? window : globalThis);
`);
  console.log(`Wrote ${path.relative(ROOT, OUT)}: ${Object.keys(out).length} of ${names.length} clubs`);
}

module.exports = { findRecord, fee, clean };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
