'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

// Load scripts in the same order as index.html.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
[...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
  .map((m) => m[1])
  .filter((src) => !src.endsWith('app.js'))
  .forEach((src) => require(path.join(ROOT, src)));

const { generator: G, content, data, heritage, daily: Daily } = globalThis.FC26;

const SEEDS = Array.from({ length: 300 }, (_, i) => `seed-${i}`);

test('same seed and options give the same challenge', () => {
  const a = G.generateChallenge({ difficulty: 3 }, 'HELLO1');
  const b = G.generateChallenge({ difficulty: 3 }, 'HELLO1');
  assert.deepEqual(a, b);
});

test('different seeds vary club, archetype and nation draws', () => {
  const clubs = new Set(SEEDS.map((s) => G.generateChallenge({}, s).club.name));
  const archetypes = new Set(SEEDS.map((s) => G.generateChallenge({}, s).archetype.id));
  assert.ok(clubs.size > 100, `only ${clubs.size} distinct clubs`);
  assert.equal(archetypes.size, content.archetypes.length);
});

test('every archetype and difficulty generates a complete challenge', () => {
  for (const a of content.archetypes) {
    for (let d = 1; d <= 4; d++) {
      for (const s of SEEDS.slice(0, 25)) {
        const ch = G.generateChallenge({ archetype: a.id, difficulty: d }, s);
        assert.equal(ch.archetype.id, a.id);
        assert.equal(ch.difficulty, d);
        assert.equal(ch.roadmap.length, ch.seasons);
        assert.ok(ch.finalGoal.length > 0);
        ch.roadmap.forEach((season) => assert.equal(season.objectives[0].type, 'main'));
        const texts = [...ch.coreRules, ...ch.rules].map((r) => r.text)
          .concat(ch.roadmap.flatMap((x) => x.objectives.map((o) => o.text).concat(x.events)));
        texts.forEach((t) => assert.doesNotMatch(t, /undefined|NaN|\[object/, `${a.id}: ${t}`));
      }
    }
  }
});

test('extra rules never repeat or share a tag, and respect archetype blocks', () => {
  const tagsOf = Object.fromEntries(content.rules.map((r) => [r.id, r.tags]));
  for (const s of SEEDS) {
    const ch = G.generateChallenge({ ruleCount: 6 }, s);
    const arch = content.archetypes.find((a) => a.id === ch.archetype.id);
    const seen = new Set(arch.blockTags || []);
    const ids = new Set();
    for (const r of ch.rules) {
      assert.ok(!ids.has(r.id), `duplicate rule ${r.id}`);
      ids.add(r.id);
      for (const t of tagsOf[r.id]) {
        assert.ok(!seen.has(t), `${ch.archetype.id} has clashing tag ${t} (${r.id})`);
        seen.add(t);
      }
    }
  }
});

test('club filters are honoured when compatible', () => {
  for (const s of SEEDS.slice(0, 50)) {
    const ch = G.generateChallenge({ league: 'ger1', tier: 3 }, s);
    assert.equal(ch.club.leagueId, 'ger1');
    assert.equal(ch.club.tier, 3);
    assert.equal(ch.notes.length, 0);
  }
});

test('incompatible filters are loosened with a note', () => {
  // Road to Glory needs a lower-league club, and LALIGA is a top flight.
  const ch = G.generateChallenge({ archetype: 'road-to-glory', league: 'esp1' }, 'X');
  assert.equal(ch.archetype.id, 'road-to-glory');
  assert.notEqual(ch.club.leagueId, 'esp1');
  assert.ok(ch.notes.length > 0);
});

test('Road to Glory climbs the pyramid one division per season', () => {
  for (const s of SEEDS.slice(0, 50)) {
    const ch = G.generateChallenge({ archetype: 'road-to-glory' }, s);
    const startLevel = data.leagues.find((l) => l.id === ch.club.leagueId).level;
    const promotions = ch.roadmap.filter((x) => /Win promotion/.test(x.objectives[0].text)).length;
    assert.equal(promotions, Math.min(startLevel - 1, ch.seasons));
    const top = data.leagues.find((l) => l.country === ch.club.country && l.level === 1);
    assert.ok(ch.roadmap.at(-1).objectives[0].text.includes(`Win ${top.noArticle ? '' : 'the '}${top.name}`));
  }
});

test('locked parts survive a reroll', () => {
  const first = G.generateChallenge({ ruleCount: 3 }, 'LOCK1');
  const locks = {
    club: { name: first.club.name, leagueId: first.club.leagueId },
    archetypeId: first.archetype.id,
    seasons: first.seasons,
    difficulty: first.difficulty,
    ruleIds: [first.rules[0].id],
  };
  for (const s of SEEDS.slice(0, 30)) {
    const next = G.generateChallenge({ ruleCount: 3 }, s, locks);
    assert.equal(next.club.name, first.club.name);
    assert.equal(next.archetype.id, first.archetype.id);
    assert.equal(next.seasons, first.seasons);
    assert.equal(next.difficulty, first.difficulty);
    assert.deepEqual(next.rules[0], first.rules[0]);
  }
});

test('share keys rebuild the exact challenge, including swapped rules', () => {
  for (const s of SEEDS.slice(0, 60)) {
    let ch = G.generateChallenge({ ruleCount: 3 }, s);
    if (ch.rules.length) ch = G.rerollRule(ch, 0, `swap-${s}`);
    const key = JSON.parse(JSON.stringify(G.toShareKey(ch)));
    const rebuilt = G.fromShareKey(key);
    assert.deepEqual(rebuilt.rules, ch.rules);
    assert.deepEqual(rebuilt.roadmap, ch.roadmap);
    assert.equal(rebuilt.club.name, ch.club.name);
    assert.equal(rebuilt.finalGoal, ch.finalGoal);
  }
});

test('fromShareKey rejects junk', () => {
  assert.equal(G.fromShareKey(null), null);
  assert.equal(G.fromShareKey({ v: 2 }), null);
  assert.equal(G.fromShareKey({ v: 1, s: 'a', r: 'nope', c: [] }), null);
});

test('money formatting', () => {
  assert.equal(G.money(120), '€120M');
  assert.equal(G.money(7.4), '€7M');
  assert.equal(G.money(0.32), '€300K');
});

test('challengeToText includes the key sections', () => {
  const text = G.challengeToText(G.generateChallenge({}, 'TEXT1'));
  for (const part of ['RULES', 'ROADMAP', 'FINAL GOAL', 'Season 1:']) assert.ok(text.includes(part));
});

test('every heritage entry belongs to a real club and generates cleanly', () => {
  const names = new Set(G.CLUBS.map((c) => c.name));
  for (const [name, h] of Object.entries(heritage)) {
    assert.ok(names.has(name), `unknown heritage club ${name}`);
    const club = G.CLUBS.find((c) => c.name === name);
    for (let d = 1; d <= 4; d++) {
      const ch = G.generateChallenge({ archetype: 'club-heritage', club: `${club.leagueId}|${name}`, difficulty: d }, `h-${d}`);
      assert.equal(ch.club.name, name);
      assert.equal(ch.archetype.name, h.name);
      assert.equal(ch.title, `${h.name}: ${name}`);
      assert.ok(ch.archetype.history.length > 0);
      assert.ok(ch.coreRules.length > 0 && ch.finalGoal.length > 0);
      [...ch.coreRules, ...ch.rules].forEach((r) => assert.doesNotMatch(r.text, /undefined|NaN/, `${name}: ${r.text}`));
    }
  }
});

test('Athletic Club heritage enforces the Basque signing policy', () => {
  const ch = G.generateChallenge({ archetype: 'club-heritage', club: 'esp1|Athletic Club', ruleCount: 6 }, 'BILBAO');
  assert.match(ch.coreRules[0].text, /Basque Country or Navarre/);
  // Rules that would clash with the regional policy are kept out.
  ch.rules.forEach((r) => assert.ok(!['nation-only', 'region-only', 'home-quota', 'no-league-rivals'].includes(r.id), r.id));
});

test('heritage challenges come up for heritage clubs and survive share links', () => {
  const ch = G.generateChallenge({ archetype: 'club-heritage' }, 'HERITAGE1');
  assert.ok(heritage[ch.club.name]);
  const rebuilt = G.fromShareKey(JSON.parse(JSON.stringify(G.toShareKey(ch))));
  assert.equal(rebuilt.title, ch.title);
  assert.deepEqual(rebuilt.coreRules, ch.coreRules);
  assert.deepEqual(rebuilt.roadmap, ch.roadmap);
});

test('locking a club without heritage and asking for heritage picks a heritage club', () => {
  const ch = G.generateChallenge({ archetype: 'club-heritage' }, 'X', { club: { name: 'Burnley', leagueId: 'eng1' } });
  assert.ok(heritage[ch.club.name]);
  assert.ok(ch.notes.some((n) => /Burnley/.test(n)));
});

test('a specific club option is honoured', () => {
  for (const s of SEEDS.slice(0, 40)) {
    assert.equal(G.generateChallenge({ club: 'ita1|Napoli' }, s).club.name, 'Napoli');
  }
});

test('heritage core rules block the extra rules they overlap with', () => {
  // If a core rule covers one of these topics, the matching tag must be
  // blocked so a random extra rule can't repeat or contradict it.
  const checks = [
    [/squad capped/i, 'squad-size'],
    [/^Promote at least/i, 'academy-promote'],
    [/academy graduates (in every|must start)|graduates in every matchday/i, 'academy'],
    [/No single transfer fee|no transfer fees/i, 'fee'],
    [/earn more than .*\/week/i, 'wage'],
    [/positive net transfer spend/i, 'profit'],
    [/Only sign players aged|Every signing must be aged|No signing players under/i, 'age'],
    [/average .* or younger/i, 'avg-age'],
    [/ in every match\b|back three/i, 'formation'],
    [/rated above .* OVR/i, 'ovr'],
    [/Sell your highest-(rated|valued) player every summer/i, 'sell-star'],
    [/no simming/i, 'sim'],
    [/signings per (summer )?window/i, 'count'],
    [/No loan signings/i, 'loans'],
    [/^Only sign \w+ players\.$|^Every signing must be [A-Z]/, 'origin'],
  ];
  const problems = [];
  for (const [name, h] of Object.entries(heritage)) {
    const club = G.CLUBS.find((c) => c.name === name);
    const ch = G.generateChallenge({ archetype: 'club-heritage', club: `${club.leagueId}|${name}`, difficulty: 2 }, 'lint');
    const blocked = new Set(h.blockTags || []);
    for (const { text } of ch.coreRules) {
      for (const [re, tag] of checks) {
        if (re.test(text) && !blocked.has(tag)) problems.push(`${name}: "${text}" needs blockTags '${tag}'`);
      }
      if (text.includes(`${club.nationality} players in every starting XI`) && !blocked.has('quota')) {
        problems.push(`${name}: "${text}" needs blockTags 'quota'`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test('a veterans-only signing rule never appears with a young-XI rule', () => {
  for (const s of SEEDS) {
    const ids = G.generateChallenge({ ruleCount: 8, difficulty: 4 }, s).rules.map((r) => r.id);
    assert.ok(!(ids.includes('age-floor') && ids.includes('young-xi')), `${s}: ${ids}`);
  }
});

test('daily challenge is the same for everyone on a date and changes daily', () => {
  const a = Daily.challenge('2026-10-22');
  assert.deepEqual(a, Daily.challenge('2026-10-22'));
  assert.deepEqual(a.daily, { date: '2026-10-22', number: 1 });
  assert.equal(Daily.challenge('2026-12-25').daily.number, 65);
  const titles = new Set(Array.from({ length: 30 }, (_, i) => Daily.challenge(Daily.shiftKey('2026-10-22', i)).title));
  assert.ok(titles.size >= 28, `only ${titles.size} distinct dailies in 30 days`);
});

test('daily challenge ignores the player options and survives share links', () => {
  const ch = Daily.challenge('2027-01-01');
  assert.equal(ch.options.club, 'any');
  const rebuilt = G.fromShareKey(JSON.parse(JSON.stringify(G.toShareKey(ch))));
  assert.equal(rebuilt.title, ch.title);
  assert.deepEqual(rebuilt.roadmap, ch.roadmap);
  assert.match(G.challengeToText(ch), /^📅 FC 26 Daily Challenge #72 \(2027-01-01\)/);
});

test('date keys shift across month, year and leap-day boundaries', () => {
  assert.equal(Daily.shiftKey('2026-12-31', 1), '2027-01-01');
  assert.equal(Daily.shiftKey('2028-03-01', -1), '2028-02-29');
  assert.equal(Daily.shiftKey('2026-10-22', -22), '2026-09-30');
  assert.equal(Daily.dateKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('streaks count consecutive check-ins', () => {
  const t = '2026-11-10';
  assert.deepEqual(Daily.streak([], t), { current: 0, best: 0, checkedInToday: false });
  // Checked in yesterday and the two days before: still alive today.
  assert.deepEqual(Daily.streak(['2026-11-07', '2026-11-08', '2026-11-09'], t), { current: 3, best: 3, checkedInToday: false });
  assert.deepEqual(Daily.streak(['2026-11-08', '2026-11-09', t], t), { current: 3, best: 3, checkedInToday: true });
  // A missed day breaks it, but best remembers the longer run.
  const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-08', t, 'junk', t];
  assert.deepEqual(Daily.streak(days, t), { current: 1, best: 4, checkedInToday: true });
});

test('msUntilTomorrow counts to local midnight', () => {
  assert.equal(Daily.msUntilTomorrow(new Date(2026, 9, 22, 23, 30)), 30 * 60000);
});

// ---------- Player Career ----------

test('player mode generates complete challenges for every archetype and difficulty', () => {
  const mode = globalThis.FC26.modes.player;
  for (const a of mode.archetypes) {
    for (let d = 1; d <= 4; d++) {
      for (const s of SEEDS.slice(0, 15)) {
        const ch = G.generateChallenge({ mode: 'player', archetype: a.id, difficulty: d }, s);
        assert.equal(ch.mode, 'player');
        assert.equal(ch.archetype.id, a.id);
        assert.ok(mode.positions.some((p) => p.id === ch.position.id));
        if (a.position) assert.equal(ch.position.id, a.position);
        assert.equal(ch.roadmap.length, ch.seasons);
        ch.roadmap.forEach((season, i) => assert.equal(season.age, ch.startAge + i));
        assert.ok(ch.title.includes(ch.position.name) && ch.title.includes(ch.club.name));
        const texts = [...ch.coreRules, ...ch.rules].map((r) => r.text)
          .concat(ch.roadmap.flatMap((x) => x.objectives.map((o) => o.text).concat(x.events)), ch.finalGoal);
        texts.forEach((t) => assert.doesNotMatch(t, /undefined|NaN|\[object/, `${a.id}: ${t}`));
      }
    }
  }
});

test('player mode honours the position option and keeps keeper-only wording right', () => {
  for (const s of SEEDS.slice(0, 40)) {
    const ch = G.generateChallenge({ mode: 'player', position: 'GK', archetype: 'wildcard-career', ruleCount: 8 }, s);
    assert.equal(ch.position.id, 'GK');
    assert.ok(!ch.rules.some((r) => r.id === 'one-celebration'), 'keeper got the celebration rule');
    ch.roadmap.forEach((x) => x.objectives.forEach((o) => assert.doesNotMatch(o.text, /hat-trick|Score for your national/)));
  }
});

test('player share links rebuild the same career, including position and age', () => {
  for (const s of SEEDS.slice(0, 40)) {
    let ch = G.generateChallenge({ mode: 'player' }, s);
    if (ch.rules.length) ch = G.rerollRule(ch, 0, `swap-${s}`);
    const rebuilt = G.fromShareKey(JSON.parse(JSON.stringify(G.toShareKey(ch))));
    assert.equal(rebuilt.mode, 'player');
    assert.deepEqual(rebuilt.position, ch.position);
    assert.equal(rebuilt.startAge, ch.startAge);
    assert.deepEqual(rebuilt.rules, ch.rules);
    assert.deepEqual(rebuilt.roadmap, ch.roadmap);
  }
});

// ---------- Custom clubs ----------

test('a custom club in a known league slots into that league', () => {
  const opts = { customClub: { name: 'Dulwich Hamlet', country: 'England', level: 4, tier: 1 } };
  for (const s of SEEDS.slice(0, 20)) {
    const ch = G.generateChallenge(opts, s);
    assert.equal(ch.club.name, 'Dulwich Hamlet');
    assert.equal(ch.club.leagueId, 'eng4');
    assert.ok(ch.club.custom);
    assert.notEqual(ch.archetype.id, 'club-heritage');
  }
});

test('a custom club from a country without leagues still gets sensible text', () => {
  const opts = { customClub: { name: 'Flamengo', country: 'Brazil', level: 1, tier: 4, league: 'Brasileirão' } };
  for (const s of SEEDS.slice(0, 40)) {
    for (const mode of ['manager', 'player']) {
      const ch = G.generateChallenge(Object.assign({ mode }, opts), s);
      assert.equal(ch.club.name, 'Flamengo');
      assert.equal(ch.club.nationality, 'Brazilian');
      const texts = [...ch.coreRules, ...ch.rules].map((r) => r.text)
        .concat(ch.roadmap.flatMap((x) => x.objectives.map((o) => o.text).concat(x.events)), ch.finalGoal);
      texts.forEach((t) => assert.doesNotMatch(t, /undefined|NaN|\[object/, t));
      const rebuilt = G.fromShareKey(JSON.parse(JSON.stringify(G.toShareKey(ch))));
      assert.equal(rebuilt.club.name, 'Flamengo');
      assert.deepEqual(rebuilt.roadmap, ch.roadmap);
      if (ch.rules.length) assert.equal(G.rerollRule(ch, 0, 'x').club.name, 'Flamengo');
    }
  }
  // Lower divisions abroad fall back to generic names.
  const lower = G.generateChallenge({ customClub: { name: 'Santos', country: 'Brazil', level: 2, tier: 2 }, archetype: 'road-to-glory' }, 'S');
  assert.match(lower.roadmap[0].objectives[0].text, /next division|top flight/);
});

test('custom club input is cleaned up', () => {
  assert.equal(G.normalizeCustomClub({ name: '   ', country: 'England' }), null);
  assert.equal(G.normalizeCustomClub({ name: 'X', country: 'Narnia' }), null);
  const cc = G.normalizeCustomClub({ name: '  A   very  long name '.repeat(5), country: 'Spain', level: 9, tier: -3 });
  assert.ok(cc.name.length <= 40 && !/\s{2}/.test(cc.name));
  assert.equal(cc.level, 4);
  assert.equal(cc.tier, 1);
});

// ---------- Edited challenges ----------

test('sanitizeChallenge keeps edits but strips junk from untrusted input', () => {
  const ch = G.generateChallenge({}, 'EDIT1');
  ch.rules.push({ id: 'my-rule', cat: 'Custom', text: 'Only sign left-footed players.' });
  ch.finalGoal = 'Win it all.';
  const clean = G.sanitizeChallenge(JSON.parse(JSON.stringify(ch)));
  assert.ok(clean.custom);
  assert.equal(clean.finalGoal, 'Win it all.');
  assert.equal(clean.rules.at(-1).text, 'Only sign left-footed players.');
  assert.deepEqual(clean.roadmap.map((s) => s.objectives), ch.roadmap.map((s) => s.objectives));

  const evil = G.sanitizeChallenge({
    difficulty: '99', seasons: 1e9, club: { name: { toString: 1 }, tier: 'lots' },
    roadmap: Array(100).fill({ objectives: [{ text: 'x'.repeat(5000) }, null, 7], events: 'nope' }),
    rules: [{ text: '<img src=x onerror=alert(1)>' }], scoring: [{ label: 'Hack', points: 1e9 }], mode: 'other',
  });
  assert.equal(evil.difficulty, 4);
  assert.equal(evil.seasons, 15);
  assert.equal(evil.roadmap.length, 15);
  assert.equal(evil.club.tier, 3);
  assert.ok(evil.roadmap[0].objectives[0].text.length <= 400);
  assert.equal(evil.mode, 'manager');
  assert.ok(!evil.scoring.some((s) => s.label === 'Hack'));
  assert.equal(G.sanitizeChallenge(null), null);
  assert.equal(G.sanitizeChallenge('string'), null);
});
