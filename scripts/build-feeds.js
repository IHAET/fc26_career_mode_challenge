#!/usr/bin/env node
/*
 * Build the daily challenge feeds people can subscribe to: a calendar
 * (daily.ics, for Google Calendar, Apple Calendar and Outlook) and an RSS
 * feed (daily.xml). The daily challenge is seeded from its date, so the feeds
 * hold the same challenges as the site. CI runs this on every deploy and once
 * a day, so the RSS feed gets each new day's challenge.
 *
 *   node scripts/build-feeds.js [out dir]    # default: _site/feeds
 *
 * SITE_URL overrides the address the feeds link to (FC26.config.siteUrl).
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, '_site', 'feeds'));
const DAYS_BACK = 7; // calendar: a week of past days
const DAYS_AHEAD = 60; // ...and two months ahead
const RSS_DAYS = 14;

// Load the app's scripts in index.html order (the page itself isn't needed).
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
[...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1])
  .filter((src) => !/^https?:/.test(src) && !/app\.js$/.test(src))
  .forEach((src) => require(path.join(ROOT, src)));
const { daily: Daily, generator: G, config } = globalThis.FC26;
const SITE = (process.env.SITE_URL || config.siteUrl).replace(/\/?$/, '/');

const today = new Date().toISOString().slice(0, 10); // UTC; the feeds are rebuilt daily
const link = (ch) => `${SITE}#c=${Buffer.from(JSON.stringify(G.toShareKey(ch))).toString('base64url')}`;

/** The challenge as plain text lines. */
function describe(ch) {
  const s1 = ch.roadmap[0] || { objectives: [] };
  return [
    `${ch.difficultyName} · ${ch.archetype.name} · ${ch.club.name} (${ch.club.league}) · ${ch.seasons} season${ch.seasons === 1 ? '' : 's'}`,
    '',
    'Core rules:',
    ...ch.coreRules.map((r) => `• ${r.text}`),
    ...(ch.rules.length ? ['', 'Rules:', ...ch.rules.map((r) => `• ${r.text}`)] : []),
    '',
    `Season 1: ${s1.objectives.map((o) => o.text).join(' ')}`,
    ...(ch.finalGoal ? [`Final goal: ${typeof ch.finalGoal === 'string' ? ch.finalGoal : ch.finalGoal.text}`] : []),
  ];
}

// ---------- Calendar (RFC 5545) ----------

const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 bytes are folded, without splitting a character. */
function fold(line) {
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch);
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

function calendar(days) {
  const stamp = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FC 26 Career Challenge Builder//Daily challenge//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:FC 26 Daily Challenge', 'X-WR-CALDESC:A new EA SPORTS FC 26 career mode challenge every day',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H',
  ];
  days.forEach((key) => {
    const ch = Daily.challenge(key);
    const url = link(ch);
    lines.push(
      'BEGIN:VEVENT',
      `UID:daily-${key}@fc26-challenge-builder`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${key.replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${Daily.shiftKey(key, 1).replace(/-/g, '')}`,
      `SUMMARY:${icsText(`⚽ FC 26 Daily #${ch.daily.number}: ${ch.title}`)}`,
      `DESCRIPTION:${icsText([...describe(ch), '', `Play it: ${url}`].join('\n'))}`,
      `URL:${url}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

// ---------- RSS 2.0 ----------

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function rss(days) {
  const items = days.slice().reverse().map((key) => {
    const ch = Daily.challenge(key);
    const [y, m, d] = key.split('-').map(Number);
    return `    <item>
      <title>${xml(`Daily #${ch.daily.number}: ${ch.title}`)}</title>
      <link>${xml(link(ch))}</link>
      <guid isPermaLink="false">fc26-daily-${key}</guid>
      <pubDate>${new Date(Date.UTC(y, m - 1, d)).toUTCString()}</pubDate>
      <description>${xml(describe(ch).join('\n').replace(/\n/g, '<br>'))}</description>
    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>FC 26 Daily Challenge</title>
    <link>${xml(SITE)}</link>
    <atom:link href="${xml(`${SITE}feeds/daily.xml`)}" rel="self" type="application/rss+xml"/>
    <description>A new EA SPORTS FC 26 career mode challenge every day.</description>
    <language>en</language>
    <ttl>720</ttl>
${items.join('\n')}
  </channel>
</rss>
`;
}

// Days from `from` to `to` (relative to today), from Daily #1 on.
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => Daily.shiftKey(today, from + i)).filter((key) => Daily.number(key) >= 1);

if (require.main === module) {
  fs.mkdirSync(OUT, { recursive: true });
  const cal = range(-DAYS_BACK, DAYS_AHEAD);
  const feed = range(-(RSS_DAYS - 1), 0);
  fs.writeFileSync(path.join(OUT, 'daily.ics'), calendar(cal));
  fs.writeFileSync(path.join(OUT, 'daily.xml'), rss(feed));
  console.log(`Wrote daily.ics (${cal.length} days) and daily.xml (${feed.length} days) to ${OUT}`);
}

module.exports = { calendar, rss, fold, icsText, link };
