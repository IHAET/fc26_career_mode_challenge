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

const { generator: G, content, data, heritage } = globalThis.FC26;

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
