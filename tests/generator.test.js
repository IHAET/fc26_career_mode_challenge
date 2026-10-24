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

test('mid-season dramas: one per season at most, never repeated, never clashing with the challenge', () => {
  const midTags = Object.fromEntries(content.midSeason.map((m) => [m.id, m.tags || []]));
  const isMid = (e) => G.splitEvent(e).when !== '';
  let seen = 0;
  for (const mode of ['manager', 'player']) {
    for (const s of SEEDS) {
      const ch = G.generateChallenge({ mode, difficulty: 4, seasons: 8, ruleCount: mode === 'manager' ? 6 : 'auto' }, s);
      const mids = ch.roadmap.map((x) => x.events.filter(isMid));
      mids.forEach((m) => assert.ok(m.length <= 1));
      const all = mids.flat();
      assert.equal(new Set(all).size, all.length, 'a drama repeated');
      all.forEach((e) => assert.match(e, /^Mid-season \([^)]+\): \S/));
      seen += all.length;
      // Dramas never contradict the extra rules or the season's own event.
      const ruleIds = new Set(ch.rules.map((r) => r.id));
      if (ruleIds.has('age-cap') || ruleIds.has('age-floor')) all.forEach((e) => assert.doesNotMatch(e, /aged (30 or over|18 or under|21 or under)/, s));
      if (ruleIds.has('captain-loyalty')) all.forEach((e) => assert.doesNotMatch(e, /armband off/, s));
      if (ruleIds.has('no-loans')) all.forEach((e) => assert.doesNotMatch(e, /sign one on loan/, s));
      ch.roadmap.filter((x) => x.events.some((e) => /^January freeze/.test(e)))
        .forEach((x) => x.events.filter(isMid).forEach((e) => assert.doesNotMatch(e, /\b[Ss]ign (a|one)\b|signing\(s\)|marquee signing|replace(ment| him)/, s)));
      // The events switch covers the dramas too.
      const off = G.generateChallenge({ mode, difficulty: 4, seasons: 8, events: false }, s);
      assert.ok(off.roadmap.every((x) => x.events.length === 0));
    }
  }
  assert.ok(seen > SEEDS.length, `only ${seen} mid-season dramas across ${SEEDS.length * 2} long careers`);
  // The user's example: the unhappy star, replaced in the same position in the same window.
  const star = content.midSeason.find((m) => m.id === 'too-poor');
  assert.match(star.text({ club: { tier: 2 }, archetype: {} }), /too small and too poor.*same window/);
  // Youth Revolution blocks age-based dramas; Athletic Club blocks nationality ones.
  const youth = content.archetypes.find((a) => a.id === 'youth-revolution');
  assert.ok(!content.midSeason.find((m) => m.id === 'veteran-leader').when({ archetype: youth }));
  for (const s of SEEDS.slice(0, 60)) {
    const athletic = G.generateChallenge({ archetype: 'club-heritage', club: 'esp1|Athletic Club', difficulty: 4, seasons: 10 }, s);
    athletic.roadmap.flatMap((x) => x.events).forEach((e) => assert.doesNotMatch(e, /homesick|Africa Cup/, s));
  }
  assert.deepEqual(G.splitEvent('Board crisis: budget halved.'), { icon: '⚡', when: '', text: 'Board crisis: budget halved.' });
  assert.equal(G.splitEvent('Mid-season (January): Sell him.').when, 'Mid-season (January)');
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

test('heritage rules that demand particular signings never meet an "every signing must be X" rule', () => {
  const demands = /Sign at least one|Sign \d+ [A-Z]|sign a new [A-Z]|current or former|must have played in|big-five/;
  for (const [club, h] of Object.entries(heritage)) {
    const c = G.CLUBS.find((x) => x.name === club);
    if (!c) continue;
    for (const s of SEEDS.slice(0, 20)) {
      const ch = G.generateChallenge({ archetype: 'club-heritage', club: `${c.leagueId}|${club}`, ruleCount: 6 }, s);
      if (!ch.coreRules.some((r) => demands.test(r.text))) break;
      const clash = ch.rules.find((r) => r.id === 'nation-only' || r.id === 'region-only');
      assert.ok(!clash, `${club}: "${ch.coreRules.map((r) => r.text).join(' ')}" with "${clash && clash.text}" (add 'origin' to its blockTags)`);
    }
    assert.ok(h.core);
  }
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

// ---------- Season tracker rule checks ----------

const { compliance: C } = globalThis.FC26;

// A tracker builder for readable tests.
function tracker(extra) {
  return Object.assign(C.emptyTracker(), extra);
}
const sign = (name, more) => Object.assign({ dir: 'in', type: 'permanent', season: 1, window: 'summer', name, fee: 0 }, more);
const sell = (name, more) => Object.assign({ dir: 'out', type: 'sale', season: 1, window: 'summer', name, fee: 0 }, more);
const player = (name, more) => Object.assign({ name }, more);
const ch0 = { club: { name: 'Test FC', leagueId: 'eng1', country: 'England' }, coreRules: [], rules: [] };
const check = (text, t, ch) => C.evaluateRule(text, t, ch || ch0);

test('rule sentences are recognised, numbers included', () => {
  const cases = [
    ['No single transfer fee above €12M.', { kind: 'maxFee', max: 12 }],
    ['No single transfer fee above €300K.', { kind: 'maxFee', max: 0.3 }],
    ['Only sign players aged 21 or younger.', { kind: 'maxSignAge', max: 21 }],
    ['No signing anyone older than 19.', { kind: 'maxSignAge', max: 19 }],
    ['No signing players under 25: experience wins trebles.', { kind: 'minSignAge', min: 25 }],
    ['No player may earn more than €8K/week.', { kind: 'wageCap', max: 8 }],
    ['No player may earn more than €500/week.', { kind: 'wageCap', max: 0.5 }],
    ['Senior squad capped at 23 players.', { kind: 'squadSize', max: 23 }],
    ['Promote at least one Knappenschmiede academy player every season.', { kind: 'promotions', min: 1, onlySeason: null }],
    ['Promote at least 4 academy players to the first team during season 1.', { kind: 'promotions', min: 4, onlySeason: 1 }],
    ['From season 2, at least 3 academy graduates must start every league match.', { kind: 'academyStarters', min: 3, fromSeason: 2 }],
    ['At least 1 Welsh player(s) in every matchday squad.', { kind: 'natQuota', min: 1, nat: 'Welsh', xi: false }],
  ];
  cases.forEach(([text, want]) => assert.deepEqual(C.interpret(text), want, text));
  assert.deepEqual(C.interpret('Only sign players from England, Scotland, Wales or Ireland.').allowed, ['English', 'Scottish', 'Welsh', 'Irish']);
  assert.ok(C.interpret('Every signing must be Danish or African.').allowed.includes('Nigerian'));
  assert.equal(C.interpret('Every signing must be South American and aged 23 or younger.').kind, 'all');
  // Things a squad list can't show stay manual.
  ['Play 4-3-3 in every match.', 'Only sign players your scouts have found — no using the player search.',
    'Only sign players from leagues outside England, Spain, Italy, Germany and France.',
    'Only sign players born in the Basque Country or Navarre, or who came through a Basque academy (check the real player if unsure).',
    'Sign at least one current or former Barcelona player every season.', 'Every signing must be from South London.',
  ].forEach((text) => assert.equal(C.interpret(text), null, text));
});

test('every generated and heritage rule can be evaluated, and checkable rule types are always recognised', () => {
  const t = tracker({ season: 2, window: 'winter', players: [player('A', { age: 30, nat: 'English', ovr: 80, wage: 50, starter: true, academy: true })], transfers: [sign('B', { fee: 5, age: 22, nat: 'Brazilian', ovr: 75 }), sell('A2', { fee: 10 })] });
  // Extra rules a squad list and transfer log can judge. The rest (formations,
  // simming, captaincy…) are meant to stay "check yourself".
  const CHECKABLE = new Set(['fee-cap', 'max-signings', 'age-cap', 'age-floor', 'ovr-cap', 'nation-only', 'region-only', 'no-loans',
    'one-in-one-out', 'no-league-rivals', 'no-flip', 'wage-cap', 'profit-window', 'sell-star', 'squad-size', 'academy-matchday',
    'youth-promote', 'home-quota', 'young-xi', 'stay-min', 'avoid-country', 'no-loan-out']);
  const seenIds = new Set();
  for (const mode of ['manager', 'player']) {
    for (const s of SEEDS) {
      const ch = G.generateChallenge({ mode, ruleCount: 6 }, s);
      ch.rules.forEach((r) => {
        seenIds.add(r.id);
        assert.equal(CHECKABLE.has(r.id), Boolean(C.interpret(r.text)), `${r.id}: ${r.text}`);
      });
      C.checkChallenge(ch, t).forEach((r) => {
        assert.ok(['ok', 'broken', 'warn', 'manual'].includes(r.status));
        assert.ok(typeof r.summary === 'string' && r.summary.length);
      });
    }
  }
  CHECKABLE.forEach((id) => assert.ok(seenIds.has(id), `never generated: ${id}`));
  for (const name of Object.keys(heritage)) {
    const club = G.CLUBS.find((c) => c.name === name);
    const ch = G.generateChallenge({ archetype: 'club-heritage', club: `${club.leagueId}|${name}` }, 'h');
    C.checkChallenge(ch, t).forEach((r) => assert.ok(r.summary));
  }
});

test('club-list rules: never sign from, never sell to, sign from every season', () => {
  const t = tracker({ season: 2, transfers: [sign('A', { club: 'Celtic FC' }), sell('B', { club: 'Juventus' }), sign('C', { club: 'Red Bull Salzburg', type: 'loan' })] });
  assert.deepEqual(check('Never sign a player from Celtic or Rangers.', t).details, ['A came from Celtic FC']);
  assert.equal(check('Never sell a player to Juventus, Inter or AC Milan.', t).status, 'broken');
  const serieA = Object.assign({}, ch0, { club: { name: 'Roma', leagueId: 'ita1', country: 'Italy' } });
  assert.deepEqual(check('Never sell a player to another Serie A club.', t, serieA).details, ['B to Juventus']);
  assert.equal(check('Sign at least one player from Red Bull Salzburg every season.', t).status, 'warn'); // S2 still to do
  assert.equal(check('Take at least one loan from Manchester City, Girona or New York City FC every season.', t).status, 'broken');
  const final = Object.assign({}, ch0, { seasons: 4 });
  const xi = tracker({ season: 2, players: [player('P', { nat: 'Brazilian', starter: true })] });
  assert.equal(check('By the final season at least 5 Brazilian players must start every league match.', xi, final).status, 'warn');
  xi.season = 4;
  assert.equal(check('By the final season at least 5 Brazilian players must start every league match.', xi, final).status, 'broken');
  assert.equal(check('Before your first competitive match, sell or release your 3 highest-rated players.', tracker({ window: 'winter', transfers: [sell('X'), sell('Y')] })).status, 'broken');
});

test('fee, age and nationality rules catch the right signings', () => {
  const t = tracker({ transfers: [sign('Cheap', { fee: 4, age: 20, nat: 'brazil', ovr: 70 }), sign('Pricey', { fee: 30, age: 27, nat: 'French', ovr: 82 })] });
  const fee = check('No single transfer fee above €12M.', t);
  assert.equal(fee.status, 'broken');
  assert.deepEqual(fee.details, ['Pricey cost €30M, the cap is €12M']);
  assert.equal(check('Only sign players aged 21 or younger.', t).details[0], 'Pricey was 27 when signed (max 21)');
  const nat = check('Every signing must be Brazilian.', t);
  assert.equal(nat.status, 'broken');
  assert.deepEqual(nat.details, ['Pricey is French']); // "brazil" counts as Brazilian
  assert.equal(check('No transfer fees — loans and free agents only.', t).status, 'broken');
  assert.equal(check('No single transfer fee above €50M.', t).status, 'ok');
  assert.equal(check('Signings must come from South America.', tracker({ transfers: [sign('X', { nat: 'Uruguayan' })] })).status, 'ok');
  assert.equal(check('Every signing must be Brazilian.', tracker({ transfers: [sign('NoNat')] })).status, 'warn');
});

test('window rules: counts, one-in-one-out and net spend', () => {
  const t = tracker({
    season: 1, window: 'winter',
    transfers: [sign('A', { fee: 10 }), sell('B', { fee: 4 }), sign('C', { fee: 1 }), sign('D', { window: 'winter', type: 'loan' })],
  });
  assert.equal(check('Maximum 1 permanent signings per window.', t).status, 'broken');
  assert.equal(check('Maximum 2 permanent signings per window.', t).status, 'ok');
  const oioo = check('One in, one out: sell or release a player before every signing.', t);
  assert.equal(oioo.status, 'broken');
  assert.equal(oioo.details.length, 2); // A signed first; D in January with nobody out
  assert.equal(check('Finish every transfer window with zero or positive net spend.', t).status, 'broken');
  assert.equal(check('No loan signings — permanent deals only.', t).details[0], 'D joined on loan (S1 January)');
  // Moneyball: spend only what sales bring in, across the whole save.
  const mb = tracker({ transfers: [sell('Star', { fee: 20 }), sign('A', { fee: 12 }), sign('B', { fee: 6 })] });
  assert.equal(check('Your only spending money is what you raise from player sales — the starting budget is off-limits.', mb).status, 'ok');
  mb.transfers.push(sign('C', { fee: 5, season: 2 }));
  assert.equal(check('Your only spending money is what you raise from player sales.', mb).status, 'broken');
});

test('squad rules: size, wages, academy, quotas and the starting XI', () => {
  const players = [
    player('A', { age: 19, nat: 'English', wage: 5, academy: true, starter: true }),
    player('B', { age: 24, nat: 'English', wage: 12, starter: true }),
    player('C', { age: 33, nat: 'Spanish', wage: 30, starter: true, loanIn: true }),
    player('D', { age: 22, nat: 'English', wage: 3, loanedOut: true }),
  ];
  const t = tracker({ players });
  assert.equal(check('Senior squad capped at 3 players.', t).status, 'ok'); // D is out on loan
  assert.equal(check('Senior squad capped at 2 players.', t).status, 'broken');
  assert.deepEqual(check('No player may earn more than €10K/week.', t).details, ['B: €12K/week', 'C: €30K/week']);
  assert.equal(check('At least 2 English players in every starting XI.', t).status, 'ok');
  assert.equal(check('At least 3 English players in every starting XI.', t).summary, 'Only 2 of 3 English players in your XI');
  assert.equal(check('At least 1 academy graduate(s) in every matchday squad.', t).status, 'ok');
  assert.equal(check('At least 2 academy graduates must start every league match.', t).status, 'broken');
  assert.equal(check('Your starting XI must average 25 years old or younger.', t).summary, 'XI averages 25.3 (max 25)');
  assert.equal(check('At least 1 loanees must start every league match.', t).status, 'ok');
  assert.equal(check('Sell (or release) every player in the summer after they turn 30.', t).details[0], 'C: 33');
  assert.equal(check('Keep at least 2 players out on loan during every season.', t).status, 'warn');
  assert.equal(check('No Italian players in your starting XI, ever.', t).status, 'ok');
  // XI checks need the XI marked.
  assert.equal(check('At least 2 English players in every starting XI.', tracker({ players: [player('X', { nat: 'English' })] })).status, 'warn');
});

test('every-season rules: past seasons must be done, the current one can still be pending', () => {
  const promos = (n, season) => Array.from({ length: n }, (_, i) => sign(`Kid${season}-${i}`, { type: 'promotion', season }));
  const rule = 'Promote at least 2 youth academy player(s) to the first team every season.';
  assert.equal(check(rule, tracker({ season: 1, transfers: promos(1, 1) })).status, 'warn');
  assert.equal(check(rule, tracker({ season: 2, transfers: promos(1, 1) })).status, 'broken');
  assert.equal(check(rule, tracker({ season: 2, transfers: [...promos(2, 1), ...promos(2, 2)] })).status, 'ok');
  const summer = 'Sign at least one player rated 85+ OVR every summer.';
  assert.equal(check(summer, tracker({ season: 1, window: 'summer' })).status, 'warn');
  assert.equal(check(summer, tracker({ season: 1, window: 'winter' })).status, 'broken');
  assert.equal(check(summer, tracker({ season: 1, window: 'winter', transfers: [sign('Star', { ovr: 87 })] })).status, 'ok');
  assert.equal(check('Sign at least one Welsh player every summer.', tracker({ season: 2, transfers: [sign('W', { nat: 'Wales' })] })).status, 'warn');
  assert.equal(check('Sell your highest-rated player every summer.', tracker({ season: 2, transfers: [sell('Best')] })).status, 'warn');
});

test('league rivals, flipping and re-signing', () => {
  const t = tracker({ transfers: [sign('R', { club: 'Arsenal' }), sign('F', { club: 'Ajax' }), sell('F'), sell('Old'), sign('Old', { season: 2 })], season: 2 });
  assert.deepEqual(check('No signing players from clubs in your own league.', t).details, ['R came from Arsenal, a league rival']);
  assert.deepEqual(check('No selling a player in the same season you signed them.', t).details, ['F (season 1)']);
  assert.deepEqual(check('Never re-sign a player you sold.', t).details, ['Old']);
});

test('player career moves: loans, stays and countries', () => {
  const ch = Object.assign({}, ch0, { startAge: 18 });
  const t = tracker({ season: 5, moves: [{ season: 2, type: 'loan', club: 'Lille', country: 'France' }, { season: 3, type: 'permanent', club: 'Porto', country: 'Portugal' }] });
  assert.equal(check('Never go out on loan.', t, ch).status, 'broken');
  assert.equal(check('Loans are only allowed before you turn 20.', t, ch).status, 'ok'); // loaned at 19
  assert.equal(check('Loans are only allowed before you turn 19.', t, ch).status, 'broken');
  assert.equal(check('Spend your whole career at Test FC: never accept a permanent transfer.', t, ch).status, 'broken');
  assert.deepEqual(check('Stay at least 2 season(s) at every club.', t, ch).details, ['Test FC: 1 season', 'Lille: 1 season']);
  assert.equal(check('Never play for a club in England.', t, ch).status, 'broken'); // started in England
  assert.equal(check('Never play for a club in Spain.', t, ch).status, 'ok');
  assert.equal(check('Move to a club in a new country every 3 seasons.', t, ch).status, 'ok');
  assert.equal(check('Move to a club in a new country every 2 seasons.', t, ch).details[0], 'Portugal: 3 seasons');
});

test('tally and tracker normalisation', () => {
  assert.deepEqual(C.tally([{ status: 'ok' }, { status: 'broken' }, { status: 'ok' }, { status: 'manual' }]), { ok: 2, broken: 1, warn: 0, manual: 1 });
  const t = C.normalizeTracker({ season: '0', window: 'nope', players: 'x' });
  assert.deepEqual(t, { season: 1, window: 'summer', players: [], transfers: [], moves: [] });
  assert.equal(C.normNat(' brazil '), 'Brazilian');
  assert.equal(C.normNat('Martian'), 'Martian');
});

test('pasting a squad understands common formats', () => {
  const { parseSquad } = globalThis.FC26.trackerUI;
  const rows = parseSquad([
    'Bukayo Saka, RW, 24, English, 87',
    'Son Heung-min ST 33 South Korean 84 €190K',
    'Kobbie Mainoo\tCM\t20\tEngland\t79',
    '87  Rodri  CDM  Spain  29',
    'Just A Name',
    '',
    '12345',
  ].join('\n'));
  assert.equal(rows.length, 5);
  const pick = ({ name, pos, age, nat, ovr, wage }) => ({ name, pos, age, nat, ovr, wage });
  assert.deepEqual(pick(rows[0]), { name: 'Bukayo Saka', pos: 'RW', age: 24, nat: 'English', ovr: 87, wage: '' });
  assert.deepEqual(pick(rows[1]), { name: 'Son Heung-min', pos: 'ST', age: 33, nat: 'South Korean', ovr: 84, wage: 190 });
  assert.deepEqual(pick(rows[2]), { name: 'Kobbie Mainoo', pos: 'CM', age: 20, nat: 'English', ovr: 79, wage: '' });
  assert.deepEqual(pick(rows[3]), { name: 'Rodri', pos: 'CDM', age: 29, nat: 'Spanish', ovr: 87, wage: '' });
  assert.deepEqual(pick(rows[4]), { name: 'Just A Name', pos: '', age: '', nat: '', ovr: '', wage: '' });
  assert.ok(rows.every((r) => r.id));
});

// ---------- Player recognition and the assistant ----------

const { playerDB: DB, assistant: A } = globalThis.FC26;

test('the known-player list is clean', () => {
  assert.ok(DB.curated.length > 600, `only ${DB.curated.length} players`);
  const positions = new Set(globalThis.FC26.trackerUI.POSITIONS);
  const seen = new Set();
  DB.curated.forEach((p) => {
    assert.ok(C.NATIONALITIES.includes(p.nat), `${p.name}: unknown nationality ${p.nat}`);
    assert.ok(positions.has(p.pos), `${p.name}: unknown position ${p.pos}`);
    assert.ok(!seen.has(DB.key(p.name)), `duplicate ${p.name}`);
    seen.add(DB.key(p.name));
  });
});

test('recognising players: accents, surnames, aliases, ambiguity and regens', () => {
  assert.equal(DB.recognise('Kylian Mbappe').player.name, 'Kylian Mbappé');
  assert.equal(DB.recognise('martin odegaard').player.name, 'Martin Ødegaard');
  assert.equal(DB.recognise('Gvardiol').player.name, 'Joško Gvardiol');
  // The game's name wins; the names people know still find the player.
  assert.equal(DB.recognise('Vini Jr').player.name, 'Vini Jr.');
  assert.equal(DB.recognise('Vinícius Júnior').player.name, 'Vini Jr.');
  assert.equal(DB.recognise('Alejandro Balde').player.name, 'Balde');
  assert.equal(DB.recognise('Alejandro Balde').player.club, 'FC Barcelona');
  assert.ok(DB.search('alejandro b', 5).some((p) => p.name === 'Balde'));
  assert.equal(DB.recognise('Rodri').player.nat, 'Spanish');
  const both = DB.recognise('Bellingham');
  assert.ok(both.candidates && both.candidates.map((p) => p.name).includes('Jobe Bellingham'));
  assert.equal(DB.recognise('Jude Bellingham').player.pos, 'CAM');
  assert.equal(DB.recognise('Zé Regenovic'), null);
  DB.addKnown('Zé Regenovic', 'Portuguese', 'ST');
  assert.equal(DB.recognise('Ze Regenovic').player.nat, 'Portuguese');
});

test('the assistant reads transfer sentences', () => {
  const p1 = A.parseTransfer('Signed Florian Wirtz from Bayer Leverkusen for €60m in January');
  assert.deepEqual([p1.dir, p1.type, p1.name, p1.club, p1.fee, p1.window, p1.nat, p1.pos], ['in', 'permanent', 'Florian Wirtz', 'Bayer Leverkusen', 60, 'winter', 'German', 'CAM']);
  assert.ok(p1.known);
  const p2 = A.parseTransfer('Sold Young Yaw to Stoke City for 6.5m', { squad: [{ name: 'Young Yaw' }] });
  assert.deepEqual([p2.dir, p2.type, p2.name, p2.club, p2.fee], ['out', 'sale', 'Young Yaw', 'Stoke City', 6.5]);
  const p3 = A.parseTransfer('Brought in Brazilian winger Lucas Moraes on loan from Santos, aged 19, rated 71');
  assert.deepEqual([p3.dir, p3.type, p3.name, p3.club, p3.age, p3.ovr, p3.nat, p3.pos], ['in', 'loan', 'Lucas Moraes', 'Santos', 19, 71, 'Brazilian', 'RW']);
  assert.equal(p3.known, null); // not a known player: a regen candidate
  const p4 = A.parseTransfer('Released Old Timer', { squad: [{ name: 'Old Timer' }] });
  assert.deepEqual([p4.dir, p4.type, p4.name], ['out', 'release', 'Old Timer']);
  const p5 = A.parseTransfer('Promoted Kid Talent from the academy');
  assert.deepEqual([p5.dir, p5.type, p5.name], ['in', 'promotion', 'Kid Talent']);
  const p6 = A.parseTransfer('Signed Saka for £120 million season 2');
  assert.deepEqual([p6.name, p6.fee, p6.season], ['Bukayo Saka', 120, 2]);
  assert.equal(A.parseTransfer('Free transfer: Joe Bloggs, 33yo').type, 'free');
  assert.equal(A.parseTransfer('Free transfer: Joe Bloggs, 33yo').age, 33);
  assert.equal(A.parseTransfer('').name, '');
});

test('precheck says what a move would break or complete, ignoring old problems', () => {
  const ch = Object.assign({}, ch0, {
    coreRules: [{ text: 'No single transfer fee above €12M.' }, { text: 'Sign at least one Welsh player every summer.' }],
    rules: [{ text: 'Play 4-3-3 in every match.' }],
  });
  const t = tracker({ transfers: [sign('Old Expensive', { fee: 20 })] }); // already broke the cap
  const cheapWelsh = A.precheck(ch, t, { dir: 'in', type: 'permanent', name: 'Taff', nat: 'Welsh', fee: 3, season: 1, window: 'summer' });
  assert.equal(cheapWelsh.ok, true);
  assert.deepEqual(cheapWelsh.fixes.map((f) => f.text), ['Sign at least one Welsh player every summer.']);
  assert.equal(cheapWelsh.manual, 1);
  const pricey = A.precheck(ch, t, { dir: 'in', type: 'permanent', name: 'Big Buy', nat: 'French', fee: 30, season: 1, window: 'summer' });
  assert.equal(pricey.ok, false);
  assert.deepEqual(pricey.breaks[0].details, ['Big Buy cost €30M, the cap is €12M']);
  // The tracker itself is untouched.
  assert.equal(t.transfers.length, 1);
});

test('signing-rule chips and next steps reflect the challenge', () => {
  const ch = Object.assign({}, ch0, {
    coreRules: [{ text: 'Your only spending money is what you raise from player sales.' }, { text: 'Every signing must be South American and aged 23 or younger.' }],
    rules: [{ text: 'Senior squad capped at 22 players.' }, { text: 'Play 4-3-3 in every match.' }],
  });
  const t = tracker({ players: [player('A')], transfers: [sell('S', { fee: 15 }), sign('X', { fee: 5, nat: 'French', age: 20 })] });
  assert.deepEqual(A.signingRules(ch, t), ['Sales money only: €10M to spend', 'Only South American', 'Age ≤ 23', 'Squad ≤ 22 (now 1)']);
  const steps = A.nextSteps(ch, t);
  assert.equal(steps[0].status, 'broken');
  assert.match(steps[0].summary, /signing/);
});

// ---------- Real squads (js/squads.js, from Wikipedia and Wikidata) ----------

// [name, position, date of birth, nationality, loan?, also known as?]
const goodRow = (p) => p.length === 4 || (p.length === 5 && ['in', 'out'].includes(p[4]))
  || (p.length === 6 && ['', 'in', 'out'].includes(p[4]) && typeof p[5] === 'string' && p[5].trim() !== '' && p[5] !== p[0])
  || (p.length === 7 && ['', 'in', 'out'].includes(p[4]) && typeof p[5] === 'string' && p[5] !== p[0] && Number.isInteger(p[6]) && p[6] >= 30 && p[6] <= 99);

test('squad data is well-formed and realistic', () => {
  const S = globalThis.FC26.squads;
  assert.ok(S && S.clubs, 'squads.js not loaded');
  const clubNames = new Set(G.CLUBS.map((c) => c.name));
  const positions = new Set(['', ...globalThis.FC26.trackerUI.POSITIONS]);
  let dated = 0;
  let total = 0;
  Object.entries(S.clubs).forEach(([club, players]) => {
    assert.ok(clubNames.has(club), `unknown club ${club}`);
    players.forEach((p) => {
      assert.ok(goodRow(p), `${club}: bad row ${JSON.stringify(p)}`);
      assert.ok(p[0].trim(), `${club}: empty name`);
      assert.ok(positions.has(p[1]), `${club}: bad position ${p[1]}`);
      assert.match(p[2], /^(\d{4}-\d{2}-\d{2})?$/, `${club}: bad date of birth ${p[2]}`);
      if (p[4] === 'out') return;
      total++;
      if (p[2]) dated++;
    });
  });
  assert.ok(dated / total > 0.85, `only ${dated} of ${total} first-team players have a date of birth`);
  const inSquad = (club) => (S.clubs[club] || []).filter((p) => p[4] !== 'out').length;
  const covered = G.CLUBS.filter((c) => inSquad(c.name) >= 16).length;
  assert.ok(covered >= 350, `only ${covered} clubs have 16+ players`);
  // A first-team squad, not a club's whole history.
  const pl = G.CLUBS.filter((c) => c.leagueId === 'eng1').map((c) => inSquad(c.name)).sort((a, b) => a - b);
  const median = pl[Math.floor(pl.length / 2)];
  assert.ok(median >= 20 && median <= 40, `Premier League median squad is ${median}`);
});

test('loading a real squad gives tracker players with ages and loans for the season', () => {
  const T = globalThis.FC26.trackerUI;
  const S = globalThis.FC26.squads.clubs;
  const club = G.CLUBS.find((c) => (S[c.name] || []).some((p) => p[4] === 'out') && (S[c.name] || []).some((p) => p[4] === 'in')).name;
  const s1 = T.realSquadPlayers(club, 1);
  const s3 = T.realSquadPlayers(club, 3);
  assert.equal(s1.length, S[club].length);
  const aged = s1.filter((p) => p.age !== '');
  assert.ok(aged.length && aged.every((p) => p.id && p.name && Number.isInteger(p.age) && p.age >= 14 && p.age <= 45));
  const i = s1.findIndex((p) => p.age !== '');
  assert.equal(s3[i].age - s1[i].age, 2);
  assert.equal(s1.filter((p) => p.loanedOut).length, S[club].filter((p) => p[4] === 'out').length);
  assert.equal(s1.filter((p) => p.loanIn).length, S[club].filter((p) => p[4] === 'in').length);
  assert.deepEqual(T.realSquadPlayers('Not A Real Club', 1), []);
  assert.deepEqual(T.realSquadPlayers(club, 1, 500), []); // under the minimum
  // Squad players are recognised, with their club; a loanee belongs to the club he plays for.
  const someone = S[club][0];
  const hit = DB.recognise(someone[0]);
  assert.ok(hit && (hit.player || hit.candidates));
  const loanee = S[club].find((p) => p[4] === 'in');
  const who = DB.recognise(loanee[0]);
  if (who && who.player) assert.equal(who.player.club, club);
});

// ---------- Accounts: merging saves between devices ----------

test('syncing merges saves: newest copy wins, deletions stick, nothing else is lost', () => {
  const Acc = globalThis.FC26.account;
  const e = (id, savedAt, updatedAt, note) => ({ id, savedAt, updatedAt, challenge: { title: id }, note });
  const phone = { entries: [e('a', 1, 50, 'phone'), e('b', 2, 20), e('c', 3, 3)], deleted: { d: 40 }, known: [{ name: 'Zé', nat: 'Portuguese', pos: 'ST' }] };
  const laptop = { entries: [e('a', 1, 30, 'laptop'), e('d', 4, 10), e('c', 3, 3), e('e', 5, 5)], deleted: { b: 60 }, known: [{ name: 'Zé', nat: 'Portuguese', pos: 'ST' }, { name: 'Kid', nat: '', pos: '' }] };
  const m = Acc.mergeSaves(phone, laptop);
  assert.deepEqual(m.entries.map((x) => x.id), ['e', 'c', 'a']); // newest saved first; b and d deleted
  assert.equal(m.entries.find((x) => x.id === 'a').note, 'phone'); // changed more recently on the phone
  assert.deepEqual(m.deleted, { d: 40, b: 60 });
  assert.equal(m.known.length, 2);
  // A challenge edited after it was deleted elsewhere comes back.
  const revived = Acc.mergeSaves({ entries: [e('b', 2, 70)], deleted: {} }, { entries: [], deleted: { b: 60 } });
  assert.deepEqual(revived.entries.map((x) => x.id), ['b']);
  // Merging is symmetric and repeatable.
  assert.deepEqual(Acc.mergeSaves(laptop, phone).entries.map((x) => x.id), ['e', 'c', 'a']);
  assert.deepEqual(Acc.mergeSaves(m, m).entries, m.entries);
});

test('local writes stamp what changed and remember deletions', () => {
  const Acc = globalThis.FC26.account;
  const before = [{ id: 'a', savedAt: 1, x: 1 }, { id: 'b', savedAt: 2, x: 1 }, { id: 'c', savedAt: 3, x: 1, updatedAt: 5 }];
  const after = [{ id: 'a', savedAt: 1, x: 2 }, { id: 'c', savedAt: 3, x: 1, updatedAt: 5 }, { id: 'n', savedAt: 9 }];
  const deleted = {};
  Acc.stampChanges(before, after, deleted, 100);
  assert.equal(after[0].updatedAt, 100); // edited
  assert.equal(after[1].updatedAt, 5); // untouched
  assert.equal(after[2].updatedAt, 100); // new
  assert.deepEqual(deleted, { b: 100 });
  // Documents round-trip, and junk documents read as empty.
  const doc = Acc.toDoc({ entries: after, deleted, known: [] });
  assert.deepEqual(Acc.fromDoc(doc).entries, after);
  assert.deepEqual(Acc.fromDoc({ challenges: 'nope', deleted: '[]' }), { entries: [], deleted: [], known: [] });
  assert.deepEqual(Acc.fromDoc(null), { entries: [], deleted: {}, known: [] });
});

// ---------- Spotify soundtracks ----------

test('soundtrack genres come from the club, the challenge and the tracked squad', () => {
  const S = globalThis.FC26.spotify;
  const ch = G.generateChallenge({ club: 'eng1|Arsenal' }, 'SPOT1');
  assert.equal(ch.club.name, 'Arsenal');
  const players = [
    { name: 'A', nat: 'Nigerian' }, { name: 'B', nat: 'Nigerian' }, { name: 'C', nat: 'Brazilian' },
    { name: 'D', nat: 'Nigerian', loanedOut: true }, { name: 'E', nat: 'Martian' },
  ];
  const genres = S.saveGenres({ challenge: ch, tracker: { players } });
  assert.equal(genres.length, 4);
  assert.deepEqual([genres[0].genre, genres[2].genre, genres[3].genre], ['britpop', 'afrobeats', 'funk carioca']);
  assert.match(genres[1].why, new RegExp(`${ch.archetype.name} mood`));
  assert.match(genres[0].why, /Arsenal play in England/);
  assert.equal(genres[2].why, '2 Nigerian players in your squad'); // the loanee doesn't count
  // Heritage saves lean harder on the club's country; nothing breaks without a tracker.
  const her = G.generateChallenge({ archetype: 'club-heritage', club: 'esp1|Athletic Club' }, 'SPOT2');
  assert.deepEqual(S.saveGenres({ challenge: her }).map((g) => g.genre), ['flamenco', 'spanish pop', 'folk']);
  const custom = G.generateChallenge({ customClub: { name: 'Dulwich Hamlet', country: 'Iceland', level: 4, tier: 1 } }, 'SPOT3');
  assert.ok(S.saveGenres({ challenge: custom }).length >= 1);
});

// ---------- Achievements and the best XI ----------

test('achievements unlock from what the saves contain', () => {
  const A = globalThis.FC26.achievements;
  const ch = G.generateChallenge({ archetype: 'club-heritage', club: 'rou1|Farul Constanța', difficulty: 4 }, 'ACH1');
  const none = A.evaluate([], {});
  assert.equal(none.filter((a) => a.unlocked).length, 0);
  assert.deepEqual(none.find((a) => a.id === 'market').progress, { have: 0, need: 10 });
  const squad = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const transfers = Array.from({ length: 6 }, (_, i) => ({ dir: 'in', name: `T${i}`, regen: i === 0 }));
  const entry = { id: 'e1', savedAt: 1, challenge: ch, progress: { 's1-0': true, 's1-1': true }, log: { 1: { finish: '1st', trophies: 3 } }, tracker: { players: squad, transfers }, soundtrack: { url: 'https://open.spotify.com/playlist/x', name: 'x' } };
  const got = Object.fromEntries(A.evaluate([entry], { broken: () => 0, dailyBest: 4 }).map((a) => [a.id, a]));
  ['first-save', 'heritage', 'legendary', 'romania', 'tracked', 'regen', 'diary', 'trophy', 'treble', 'clean', 'daily', 'soundtrack']
    .forEach((id) => assert.ok(got[id].unlocked, id));
  ['player', 'leagues', 'market', 'objectives', 'complete', 'cabinet'].forEach((id) => assert.ok(!got[id].unlocked, id));
  assert.deepEqual(got.market.progress, { have: 6, need: 10 });
  // A broken rule spoils "By the book"; junk entries are ignored.
  assert.ok(!A.evaluate([entry, null, { challenge: {} }], { broken: () => 2 }).find((a) => a.id === 'clean').unlocked);
});

test('picking the best XI fills a 4-3-3 by OVR and skips loanees', () => {
  const T = globalThis.FC26.trackerUI;
  const mk = (id, pos, ovr, extra) => Object.assign({ id, name: id, pos, ovr }, extra);
  const players = [
    mk('gk1', 'GK', 80), mk('gk2', 'GK', 70), mk('lb', 'LB', 75), mk('rb', 'RB', 74), mk('cb1', 'CB', 82), mk('cb2', 'CB', 79), mk('cb3', 'CB', 60),
    mk('cdm', 'CDM', 77), mk('cm1', 'CM', 81), mk('cam', 'CAM', 84), mk('cm2', 'CM', 65), mk('lw', 'LW', 83), mk('rw', 'RW', 78),
    mk('st1', 'ST', 86), mk('st2', 'ST', 88, { loanedOut: true }),
  ];
  const xi = T.bestXI(players);
  assert.equal(xi.size, 11);
  assert.deepEqual([...xi].sort(), ['cam', 'cb1', 'cb2', 'cdm', 'cm1', 'gk1', 'lb', 'lw', 'rb', 'rw', 'st1']);
  // Without a keeper or ratings it still names eleven outfield players in list order.
  const xi2 = T.bestXI(Array.from({ length: 14 }, (_, i) => mk(`x${i}`, i % 2 ? 'CM' : 'CB', '')));
  assert.equal(xi2.size, 11);
});

// ---------- Wonderkid scout ----------

test('the scout lists young players best first, filtered, skipping your own squad', () => {
  const S = globalThis.FC26.scout;
  const day = '2025-07-01';
  const all = S.prospects(day, { maxAge: 21 });
  assert.ok(all.length > 1000, `only ${all.length} prospects`);
  assert.ok(all.every((p) => p.age >= 15 && p.age <= 21));
  assert.ok(all[0].known, 'hand-picked talents come first');
  for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].score >= all[i].score);
  assert.ok(all.some((p) => p.name === 'Lamine Yamal' && p.club === 'FC Barcelona'));
  // A loanee shows up where he's playing, once.
  assert.equal(all.filter((p) => p.name === 'Rio Ngumoha').length, 1);
  const gk = S.prospects(day, { maxAge: 19, group: 'GK', leagueId: 'rou1' });
  assert.ok(gk.length && gk.every((p) => p.pos === 'GK' && p.leagueId === 'rou1' && p.age <= 19));
  assert.ok(!S.prospects(day, { query: 'yamal', exclude: new Set([globalThis.FC26.playerDB.key('Lamine Yamal')]) }).some((p) => p.name === 'Lamine Yamal'));
  // A season later everyone is a year older.
  const later = S.prospects('2026-07-01', { maxAge: 21, query: 'lamine yamal' });
  assert.equal(later[0].age, 18);
});

// ---------- Squads from other leagues (js/squads-extra.js) ----------

test('extra-league squads are well-formed, recognised and scouted', () => {
  const X = globalThis.FC26.extraSquads;
  assert.ok(X && Array.isArray(X.leagues) && X.leagues.length >= 25, 'squads-extra.js missing or thin');
  const positions = new Set(['', ...globalThis.FC26.trackerUI.POSITIONS]);
  const mainClubs = new Set(G.CLUBS.map((c) => c.name));
  let players = 0;
  X.leagues.forEach((lg) => {
    assert.ok(lg.name && lg.country && [1, 2, 3].includes(lg.level) && [1, 2, 3].includes(lg.strength), JSON.stringify(lg).slice(0, 80));
    Object.entries(lg.clubs).forEach(([club, rows]) => {
      assert.ok(club.trim() && !/&nbsp;|\[\[|\{\{/.test(club), `odd club name ${club}`);
      rows.forEach((p) => {
        assert.ok(goodRow(p), `${club}: bad row ${JSON.stringify(p)}`);
        assert.ok(p[0].trim() && positions.has(p[1]) && /^(\d{4}-\d{2}-\d{2})?$/.test(p[2]), `${club}: bad row ${JSON.stringify(p)}`);
        players += 1;
      });
    });
  });
  assert.ok(players > 10000, `only ${players} extra players`);
  // Recognised with their club, and listed in the scout under their league.
  const flamengo = X.leagues.flatMap((lg) => Object.entries(lg.clubs)).find(([club]) => club === 'Flamengo');
  assert.ok(flamengo && flamengo[1].length >= 18, 'Flamengo squad');
  const someone = flamengo[1].find((p) => p[2] && p[4] !== 'out' && !mainClubs.has(p[0]));
  const hit = DB.recognise(someone[0]);
  assert.ok(hit && (hit.player || hit.candidates), `${someone[0]} not recognised`);
  const br = globalThis.FC26.scout.prospects('2025-07-01', { maxAge: 23, leagueId: 'x:Brasileirão Série A' });
  assert.ok(br.length > 20 && br.every((p) => p.league === 'Brasileirão Série A'));
  // Main-list players keep their main club.
  assert.equal(DB.recognise('Lamine Yamal').player.club, 'FC Barcelona');
});

// ---------- Default starting XI and swap deals ----------

test("squads are the game's: in-game names, renamed clubs, and the right teams", () => {
  const S = globalThis.FC26.squads;
  assert.equal(S.source, 'EA SPORTS FC 26 database');
  assert.equal(S.gameNames.Atalanta, 'Bergamo Calcio');
  assert.deepEqual(S.notInGame, []);
  // Roma's men's squad (the Wikipedia article picked up was the women's team).
  assert.ok(S.clubs.Roma.some((p) => p[0] === 'Paulo Dybala'));
  // Loans: Rashford plays for Barcelona and is Manchester United's player out on loan.
  assert.ok(S.clubs['FC Barcelona'].some((p) => p[0] === 'Marcus Rashford' && p[4] === 'in'));
  assert.ok(S.clubs['Manchester United'].some((p) => p[0] === 'Marcus Rashford' && p[4] === 'out'));
  // Ratings from the game: Saliba is 87 at launch, and loading the squad fills them in.
  assert.equal(S.clubs.Arsenal.find((p) => p[0] === 'William Saliba')[6], 87);
  assert.equal(globalThis.FC26.trackerUI.realSquadPlayers('Arsenal', 1).find((p) => p.name === 'William Saliba').ovr, 87);
  assert.equal(DB.recognise('Saliba').player.ovr, 87);
  const players = Object.values(globalThis.FC26.extraSquads.leagues).reduce((n, lg) => n + Object.values(lg.clubs).reduce((m, r) => m + r.length, 0), 0)
    + Object.values(S.clubs).reduce((n, r) => n + r.length, 0);
  assert.ok(players > 28000, `${players} players`);
});

test('every club has a likely starting XI: eleven players, one keeper, no loanees out', () => {
  const S = globalThis.FC26.squads;
  const T = globalThis.FC26.trackerUI;
  G.CLUBS.forEach((c) => {
    const xi = S.xi[c.name];
    assert.ok(Array.isArray(xi) && xi.length === 11, `${c.name}: ${xi && xi.length} starters`);
    const rows = xi.map((i) => S.clubs[c.name][i]);
    assert.ok(rows.every((r) => r && r[4] !== 'out'), `${c.name}: a loanee out starts`);
    assert.ok(rows.filter((r) => r[1] === 'GK').length <= 1, `${c.name}: two keepers start`);
  });
  const loaded = T.realSquadPlayers('FC Barcelona', 1);
  assert.equal(loaded.filter((p) => p.starter).length, 11);
  assert.ok(loaded.find((p) => p.name === 'Lamine Yamal').starter);
  T.init({ esc: (v) => String(v).replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`) });
  assert.match(T.defaultXIPitch('FC Barcelona'), /Yamal/);
  assert.equal(T.defaultXIPitch('Not A Club'), '');
});

test('a swap is read from a sentence, checked as two moves and logged as both', () => {
  const squad = [{ name: 'Dušan Vlahović' }, { name: 'Young Yaw' }];
  const p = A.parseTransfer('Swapped Dušan Vlahović for Victor Osimhen with Galatasaray, we pay €5m in January', { squad });
  assert.deepEqual([p.dir, p.give, p.name, p.club, p.fee, p.window], ['swap', 'Dušan Vlahović', 'Victor Osimhen', 'Galatasaray', 5, 'winter']);
  assert.equal(A.parseTransfer('Swap Young Yaw for Kid Talent, we receive 2m', { squad }).fee, -2);
  const read = (text) => { const r = A.parseTransfer(text, { squad }); return [r.give, r.name, r.club, r.fee]; };
  assert.deepEqual(read('swapped Vlahović with Manuel Locatelli at Juventus'), ['Dušan Vlahović', 'Manuel Locatelli', 'Juventus', '']);
  assert.deepEqual(read('Got Osimhen from Galatasaray in a swap for Vlahović'), ['Dušan Vlahović', 'Victor Osimhen', 'Galatasaray', '']);
  assert.deepEqual(read('swap Yaw for Jadon Sancho with Man United plus 3m'), ['Young Yaw', 'Jadon Sancho', 'Man United', 3]);
  const ch = Object.assign({}, ch0, { coreRules: [{ text: 'Only sign players aged 31 or older.' }], rules: [{ text: 'Sell your highest-rated player every summer.' }] });
  const t = tracker({ players: [player('Dušan Vlahović', { ovr: 84, age: 25 }), player('Young Yaw', { ovr: 70, age: 19 })] });
  const moves = [
    { dir: 'out', type: 'swap', name: 'Dušan Vlahović', season: 1, window: 'summer', swapId: 'x', swapWith: 'Victor Osimhen' },
    { dir: 'in', type: 'swap', name: 'Victor Osimhen', age: 26, season: 1, window: 'summer', swapId: 'x', swapWith: 'Dušan Vlahović' },
  ];
  const res = A.precheck(ch, t, moves);
  assert.equal(res.ok, false);
  assert.match(res.breaks[0].details[0], /Victor Osimhen was 26/);
  assert.deepEqual(res.fixes.map((f) => f.text), ['Sell your highest-rated player every summer.']); // the swap counts as his sale
  const after = moves.reduce((tr, m) => C.applyTransfer(tr, Object.assign({ id: m.dir }, m)), C.normalizeTracker(JSON.parse(JSON.stringify(t))));
  assert.deepEqual(after.players.map((x) => x.name).sort(), ['Victor Osimhen', 'Young Yaw']);
  assert.equal(after.transfers.length, 2);
});

// ---------- Subscriptions: daily challenge feeds ----------

test('the daily feeds hold each day\'s challenge, as a valid calendar and RSS', () => {
  const F = require('../scripts/build-feeds.js');
  const D = globalThis.FC26.daily;
  const days = ['2026-10-22', '2026-10-23', '2026-10-24'];
  const ics = F.calendar(days);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
  assert.match(ics, /DTSTART;VALUE=DATE:20261023\r\nDTEND;VALUE=DATE:20261024/);
  // Lines fold at 75 bytes, never inside a character.
  assert.ok(ics.split('\r\n').every((l) => Buffer.byteLength(l) <= 75), 'a line is over 75 bytes');
  const unfolded = ics.replace(/\r\n /g, '');
  assert.ok(unfolded.includes(`SUMMARY:⚽ FC 26 Daily #2: ${F.icsText(D.challenge('2026-10-23').title)}`));
  // The link opens that day's challenge.
  const url = unfolded.match(/URL:(\S+)/)[1];
  const key = JSON.parse(Buffer.from(url.split('#c=')[1], 'base64url').toString());
  assert.equal(G.fromShareKey(key).title, D.challenge('2026-10-22').title);
  const rss = F.rss(days);
  assert.equal((rss.match(/<item>/g) || []).length, 3);
  assert.ok(rss.indexOf('fc26-daily-2026-10-24') < rss.indexOf('fc26-daily-2026-10-22'), 'newest first');
  assert.ok(!/<item>[\s\S]*<script/i.test(rss));
  assert.equal(F.icsText('a, b; c\\d\ne'), 'a\\, b\\; c\\\\d\\ne');
});

test('usernames for following are short, lower-case and safe', () => {
  const S = globalThis.FC26.subscriptions;
  ['gaffer_99', 'abc', 'a_b_c_d_e_f_g_h_i_jk'].forEach((h) => assert.ok(S.HANDLE_RE.test(h), h));
  ['ab', 'Gaffer', 'has space', 'x'.repeat(21), 'dot.name', '<b>'].forEach((h) => assert.ok(!S.HANDLE_RE.test(h), h));
});

// ---------- Transfer records ----------

test("the transfer-record rule starts from the club's real record and moves it up", () => {
  const saved = globalThis.FC26.records;
  globalThis.FC26.records = { 'Test FC': { fee: '£100m', eur: 117, player: 'Big Signing', from: 'Other FC', year: 2023, source: 'List of Test F.C. records and statistics' } };
  try {
    const rule = "Break your club's transfer record at least once every 2 season(s).";
    const ch = Object.assign({}, ch0, { coreRules: [{ text: rule }], rules: [] });
    const info = C.ruleInfo(rule, ch);
    assert.match(info.text, /record signing: £100m \(about €117M\), Big Signing from Other FC in 2023/);
    assert.match(info.source, /Wikipedia/);
    const sign = (name, f, season) => ({ id: name, dir: 'in', type: 'permanent', name, fee: f, season, window: 'summer' });
    // Season 1: €110M doesn't beat €117M; season 2: €120M does.
    let res = C.evaluateRule(rule, tracker({ season: 2, transfers: [sign('A', 110, 1), sign('B', 120, 2)] }), ch);
    assert.equal(res.status, 'ok', res.summary);
    assert.ok(res.details.includes('Season 2: B for €120M'));
    // Seasons 3–4 without beating €120M: broken.
    res = C.evaluateRule(rule, tracker({ season: 5, transfers: [sign('B', 120, 2), sign('C', 119, 3)] }), ch);
    assert.equal(res.status, 'broken');
    // Due this season: a warning that names the fee to beat.
    res = C.evaluateRule(rule, tracker({ season: 2, transfers: [] }), ch);
    assert.equal(res.status, 'warn');
    assert.match(res.summary, /more than €117M/);
    // A record typed on the save wins.
    res = C.evaluateRule(rule, tracker({ season: 2, record: 50, transfers: [sign('A', 60, 1)] }), ch);
    assert.equal(res.status, 'ok');
    // Unknown club: asks for the record.
    const other = Object.assign({}, ch, { club: Object.assign({}, ch.club, { name: 'Nobody FC' }) });
    assert.equal(C.evaluateRule(rule, tracker({}), other).status, 'manual');
    assert.match(C.ruleInfo(rule, other).text, /isn't known/);
    // League rivals are listed for the no-rivals rule.
    assert.match(C.ruleInfo('No signing players from clubs in your own league.', Object.assign({}, ch, { club: { name: 'Arsenal', leagueId: 'eng1' } })).text, /Your league rivals \(19\): .*Chelsea/);
  } finally {
    globalThis.FC26.records = saved;
  }
});

test('club records are well-formed', () => {
  const R = globalThis.FC26.records || {};
  const clubs = new Set(G.CLUBS.map((c) => c.name));
  Object.entries(R).forEach(([club, r]) => {
    assert.ok(clubs.has(club), `unknown club ${club}`);
    assert.ok(/^[£€$]\d/.test(r.fee) && r.eur > 0 && r.player && (!r.year || (r.year >= 1950 && r.year <= 2025)), `${club}: ${JSON.stringify(r)}`);
  });
});

test('proven objectives score points, more on harder difficulties', () => {
  const P = globalThis.FC26.proofs;
  const ch = { difficulty: 4, roadmap: [{ season: 1, objectives: [{ type: 'main' }, { type: 'side' }] }, { season: 2, objectives: [{ type: 'main' }] }] };
  const proof = [{ id: 'p', at: 1 }];
  assert.equal(P.points({ challenge: ch, proofs: {} }), 0);
  assert.equal(P.points({ challenge: ch, proofs: { 's1-0': proof, 's1-1': proof } }), 30); // (10 + 5) × 2 on Legendary
  assert.equal(P.points({ challenge: Object.assign({}, ch, { difficulty: 1 }), proofs: { 's2-0': proof, final: proof } }), 40);
  assert.equal(P.proofCount({ proofs: { a: [1, 2], b: [3] } }), 3);
  const C = globalThis.FC26.leaderboard.countries([{ country: 'English', points: 10, handle: 'a' }, { country: 'English', points: 30, handle: 'b' }, { country: 'Welsh', points: 25, handle: 'c' }, { points: 99, handle: 'd' }]);
  assert.deepEqual(C.map((c) => [c.country, c.points, c.players, c.best.handle]), [['English', 40, 2, 'b'], ['Welsh', 25, 1, 'c']]);
});

test('a transfer screenshot\'s text gives the player, rating, fee, wage and club', () => {
  const O = globalThis.FC26.ocr;
  const shot = `TRANSFER COMPLETE\nFlorian Wirtz\nCAM  OVR 90  Age 22\nFrom: Bayer 04 Leverkusen\nTransfer Fee  €117.5M\nWage €350K / week`;
  const r = O.parseShot(shot);
  assert.equal(r.name, 'Florian Wirtz');
  assert.equal(r.dir, 'in');
  assert.equal(r.ovr, 90);
  assert.equal(r.fee, 117.5);
  assert.equal(r.wage, 350);
  assert.equal(r.age, 22);
  assert.match(r.club, /Leverkusen/);
  // A sale of someone in your squad, with a fee written out in full.
  const sale = O.parseShot('Player sold\nYoung Yaw has left the club\nFee received: £12,500,000', { squad: [{ name: 'Young Yaw' }] });
  assert.deepEqual([sale.name, sale.dir, sale.type, sale.fee], ['Young Yaw', 'out', 'sale', 12.5]);
  // Nothing to read.
  const none = O.parseShot('Main menu\nPress any button');
  assert.equal(none.name, '');
  assert.equal(none.found.length, 0);
  assert.deepEqual(O.amounts('€45.000.000 and £3.5m and $800k').map((a) => a.value), [45e6, 3.5e6, 8e5]);
});
