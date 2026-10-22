/*
 * Challenge generator. Pure logic with no DOM access, so it runs in the
 * browser and under Node (see tests/).
 *
 * Every random choice draws from its own RNG stream derived from the seed
 * (e.g. "AB12CD:club"), so locking one part of a challenge and rerolling
 * the rest keeps the locked part stable and the result reproducible.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const { data, content } = FC26;

  // ---------- Random numbers ----------

  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    // murmur3 finaliser so similar seeds give unrelated streams
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  // mulberry32
  function createRng(seed) {
    let a = hashString(String(seed));
    const next = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      int: (min, max) => min + Math.floor(next() * (max - min + 1)),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      chance: (p) => next() < p,
      shuffle: (arr) => {
        const out = arr.slice();
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
      },
    };
  }

  const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function randomSeed() {
    let s = '';
    for (let i = 0; i < 6; i++) s += SEED_CHARS[Math.floor(Math.random() * SEED_CHARS.length)];
    return s;
  }

  // ---------- Lookups ----------

  const CLUBS = data.leagues.flatMap((l) => l.clubs.map(([name, tier]) => ({
    name,
    tier,
    leagueId: l.id,
    league: l.name,
    country: l.country,
    nationality: l.nationality,
    level: l.level,
    continental: l.continental || null,
  })));

  const leagueById = Object.fromEntries(data.leagues.map((l) => [l.id, l]));
  const archetypeById = Object.fromEntries(content.archetypes.map((a) => [a.id, a]));
  const ruleById = Object.fromEntries(content.rules.map((r) => [r.id, r]));
  const heritage = FC26.heritage || {};

  // Club Heritage is one archetype whose content comes from the club's entry.
  function resolveArchetype(arch, club) {
    const h = arch.perClub && club && heritage[club.name];
    if (!h) return arch;
    return Object.assign({}, arch, h, {
      id: arch.id,
      typeName: arch.name,
      seasonRange: (c, d) => (typeof h.seasons === 'function' ? h.seasons(d) : h.seasons || [4, 6]),
    });
  }

  function leagueAt(country, level) {
    return data.leagues.find((l) => l.country === country && l.level === level) || null;
  }

  // "the Premier League" but "Serie A".
  function leagueRef(league) {
    return league.noArticle ? league.name : `the ${league.name}`;
  }

  function findClub(name, leagueId) {
    return CLUBS.find((c) => c.name === name && (!leagueId || c.leagueId === leagueId)) || null;
  }

  // ---------- Scaling helpers ----------

  // Rough budget in €M by club tier, scaled down for lower divisions.
  const TIER_BUDGET = { 1: 4, 2: 12, 3: 30, 4: 65, 5: 120 };
  const LEVEL_FACTOR = { 1: 1, 2: 0.5, 3: 0.15, 4: 0.08 };
  const TIER_WAGE = { 1: 10, 2: 30, 3: 70, 4: 150, 5: 300 }; // €K/week
  const TIER_OVR = { 1: 68, 2: 75, 3: 79, 4: 84, 5: 88 };

  function money(millions) {
    if (millions >= 1) {
      const v = millions >= 20 ? Math.round(millions / 5) * 5 : Math.round(millions);
      return `€${v}M`;
    }
    return `€${Math.max(50, Math.round((millions * 1000) / 50) * 50)}K`;
  }

  function makeContext({ club, d, seasons, archetype, nation, formation }) {
    const topLeague = leagueAt(club.country, 1) || leagueById[club.leagueId];
    const league = leagueById[club.leagueId];
    const byD = (arr) => arr[d - 1];
    const budget = TIER_BUDGET[club.tier] * (LEVEL_FACTOR[club.level] || 1);
    return {
      data,
      club,
      d,
      seasons,
      archetype,
      nation,
      formation,
      topLeague,
      topLeagueRef: leagueRef(topLeague),
      cup: (league && league.cup) || 'domestic cup',
      continental: topLeague.continental || 'Champions League',
      moveEvery: byD([3, 3, 2, 2]),
      byD,
      money,
      feeCap: () => money(budget * byD([0.6, 0.4, 0.25, 0.15])),
      wageCap: () => {
        const k = TIER_WAGE[club.tier] * (LEVEL_FACTOR[club.level] || 1) * byD([1, 0.75, 0.55, 0.4]);
        return k >= 1 ? `€${Math.max(1, Math.round(k))}K` : `€${Math.max(100, Math.round((k * 1000) / 100) * 100)}`;
      },
      ovrCap: () => TIER_OVR[club.tier] - (club.level - 1) * 3 - byD([0, 2, 4, 6]),
      rng: null,
    };
  }

  const withRng = (ctx, rng) => Object.assign({}, ctx, { rng });

  // ---------- Options ----------

  const DEFAULT_OPTIONS = {
    difficulty: 'random', // 1-4 or 'random'
    archetype: 'any',
    club: 'any', // "leagueId|Club name"
    league: 'any',
    tier: 'any',
    seasons: 'auto',
    ruleCount: 'auto',
    events: true,
  };

  function normalizeOptions(options) {
    const o = Object.assign({}, DEFAULT_OPTIONS, options || {});
    if (o.difficulty !== 'random') o.difficulty = Math.min(4, Math.max(1, Number(o.difficulty) || 2));
    if (o.archetype !== 'any' && !archetypeById[o.archetype]) o.archetype = 'any';
    if (o.league !== 'any' && !leagueById[o.league]) o.league = 'any';
    if (o.club !== 'any') {
      const [leagueId, ...rest] = String(o.club).split('|');
      if (!findClub(rest.join('|'), leagueId)) o.club = 'any';
    }
    if (o.tier !== 'any') o.tier = Math.min(5, Math.max(1, Number(o.tier) || 3));
    if (o.seasons !== 'auto') o.seasons = Math.min(15, Math.max(1, Number(o.seasons) || 5));
    if (o.ruleCount !== 'auto') o.ruleCount = Math.min(8, Math.max(0, Number(o.ruleCount) || 0));
    o.events = o.events !== false;
    return o;
  }

  // ---------- Season goals ----------

  function topFlightGoal(league, cont, cup, eff) {
    const ref = leagueRef(league);
    const goals = league.goals || [
      `Avoid relegation from ${ref}`,
      `Finish in the top half of ${ref}`,
      'Qualify for European football',
      `Finish in the ${cont} places`,
      `Win ${ref}`,
      `Win ${ref} and reach the ${cont} semi-finals`,
      `Win the treble: ${league.name}, ${cup} and ${cont}`,
    ];
    let text = goals[Math.min(goals.length, Math.max(1, eff)) - 1];
    if (!league.goals && league.continental && eff === 3) text = `Qualify for the ${league.secondary || league.continental}`;
    return text + '.';
  }

  function buildRoadmap(ctx, rng) {
    const { club, d, seasons, archetype } = ctx;
    // "Effort" scale: 1 = survive ... 7 = treble. Starts from club strength
    // and difficulty, then climbs towards a difficulty-dependent finale.
    const start = club.tier - 1 + d * 0.5;
    const ceiling = [5, 5, 6, 7][d - 1];
    const finale = Math.max(start, Math.min(ceiling, club.tier + [1.5, 2.5, 3.5, 4.5][d - 1], start + seasons * 1.25));
    const effAt = (s) => (seasons <= 1 ? start + 0.5 : start + ((finale - start) * (s - 1)) / (seasons - 1));

    const sideChance = [0.35, 0.5, 0.65, 0.8][d - 1];
    const eventChance = Math.min(0.9, [0.15, 0.3, 0.45, 0.6][d - 1] * (archetype.eventBoost || 1));
    const usedSide = new Set();
    const usedEvents = new Set();
    const roadmap = [];

    let level = club.level;
    let topFlightFrom = club.level === 1 ? 1 : null;

    for (let s = 1; s <= seasons; s++) {
      const e = effAt(s);
      const objectives = [];
      let main;

      if (level > 1) {
        const here = leagueAt(club.country, level);
        const above = leagueAt(club.country, level - 1);
        const hereName = here ? leagueRef(here) : 'your division';
        if (archetype.forcePromotion || e >= 2.5) {
          main = `Win promotion to ${above ? leagueRef(above) : 'the next division'}.`;
          level -= 1;
          if (level === 1) topFlightFrom = s + 1;
        } else if (e >= 1.5) {
          main = `Finish in the play-off places in ${hereName}.`;
        } else {
          main = `Avoid relegation from ${hereName}.`;
        }
      } else {
        let eff = Math.round(e);
        if (club.level > 1) {
          // Newly promoted: start by surviving, then build up.
          eff = Math.min(eff, 1 + Math.floor((s - topFlightFrom) * (d >= 3 ? 1.5 : 1)));
          if (archetype.finalTitle && s === seasons) eff = Math.max(eff, 5);
        }
        main = topFlightGoal(ctx.topLeague, ctx.continental, ctx.cup, Math.min(7, Math.max(1, eff)));
      }
      const custom = archetype.seasonGoal && archetype.seasonGoal(ctx, s);
      if (custom) main = custom;
      objectives.push({ text: main, type: 'main' });

      if (archetype.id === 'journeyman' && s % ctx.moveEvery === 0 && s < seasons) {
        objectives.push({ text: 'End of season: move to a club in a different country.', type: 'side' });
      } else if (rng.chance(sideChance)) {
        const pool = content.sideObjectives.filter((o) => !usedSide.has(o.id)
          && (!o.minD || d >= o.minD) && (!o.when || o.when(ctx)));
        if (pool.length) {
          const pick = rng.pick(pool);
          usedSide.add(pick.id);
          objectives.push({ text: pick.text(withRng(ctx, rng)), type: 'side' });
        }
      }

      const events = [];
      if (ctx.eventsOn && rng.chance(eventChance)) {
        const pool = content.events.filter((ev) => !usedEvents.has(ev.id)
          && (!ev.minSeason || s >= ev.minSeason) && (!ev.when || ev.when(ctx)));
        if (pool.length) {
          const pick = rng.pick(pool);
          usedEvents.add(pick.id);
          events.push(pick.text(withRng(ctx, rng)));
        }
      }

      roadmap.push({ season: s, objectives, events });
    }
    return roadmap;
  }

  // ---------- Rules ----------

  function eligibleRule(def, ctx, blocked, used) {
    return !used.has(def.id)
      && (!def.minD || ctx.d >= def.minD)
      && !def.tags.some((t) => blocked.has(t));
  }

  function makeRule(def, ctx, seed) {
    return { id: def.id, cat: def.cat, text: def.text(withRng(ctx, createRng(`${seed}:rule:${def.id}`))) };
  }

  function pickRules(ctx, seed, count, lockedIds) {
    const blocked = new Set(ctx.archetype.blockTags || []);
    const used = new Set();
    const rules = [];
    for (const id of lockedIds || []) {
      const def = ruleById[id];
      if (!def || used.has(id)) continue;
      rules.push(makeRule(def, ctx, seed));
      used.add(id);
      def.tags.forEach((t) => blocked.add(t));
    }
    for (const def of createRng(`${seed}:rules`).shuffle(content.rules)) {
      if (rules.length >= count) break;
      if (!eligibleRule(def, ctx, blocked, used)) continue;
      rules.push(makeRule(def, ctx, seed));
      used.add(def.id);
      def.tags.forEach((t) => blocked.add(t));
    }
    return rules;
  }

  // ---------- Main entry point ----------

  /**
   * Build a challenge.
   * @param {object} options  see DEFAULT_OPTIONS
   * @param {string} seed     any string; same seed + options + locks = same challenge
   * @param {object} locks    { club: {name, leagueId}, archetypeId, seasons, difficulty, ruleIds: [] }
   */
  function generateChallenge(options, seed, locks) {
    seed = String(seed || randomSeed());
    locks = locks || {};
    const opts = normalizeOptions(options);
    const r = (label) => createRng(`${seed}:${label}`);
    const notes = [];

    let d = opts.difficulty === 'random' ? r('difficulty').int(1, 4) : opts.difficulty;
    if (locks.difficulty) d = Math.min(4, Math.max(1, Number(locks.difficulty) || d));
    const userFilter = (c) => (opts.club !== 'any'
      ? `${c.leagueId}|${c.name}` === opts.club
      : (opts.league === 'any' || c.leagueId === opts.league) && (opts.tier === 'any' || c.tier === opts.tier));

    let club = locks.club ? (findClub(locks.club.name, locks.club.leagueId) || null) : null;
    let archetype = locks.archetypeId ? archetypeById[locks.archetypeId] : null;

    if (!archetype) {
      const pool = opts.archetype !== 'any' ? [archetypeById[opts.archetype]] : content.archetypes;
      let candidates = pool.filter((a) => (club ? a.clubFilter(club) : CLUBS.some((c) => a.clubFilter(c) && userFilter(c))));
      if (!candidates.length) {
        candidates = pool;
        notes.push('That challenge type doesn\'t suit your club filters, so the filters were loosened.');
      }
      archetype = r('archetype').pick(candidates);
    }

    if (archetype.perClub && club && !archetype.clubFilter(club)) {
      notes.push(`${club.name} has no Club Heritage challenge yet, so another club was picked.`);
      club = null;
    }

    if (!club) {
      let pool = CLUBS.filter((c) => archetype.clubFilter(c) && userFilter(c));
      if (!pool.length) {
        pool = CLUBS.filter(archetype.clubFilter);
        if (!notes.length) notes.push(`No club matched both ${archetype.name} and your filters, so the filters were loosened.`);
      }
      club = r('club').pick(pool.length ? pool : CLUBS);
    }
    archetype = resolveArchetype(archetype, club);

    let seasons = locks.seasons ? Math.min(15, Math.max(1, Number(locks.seasons))) : null;
    seasons = seasons || (opts.seasons !== 'auto' ? opts.seasons : null);
    const [minS, maxS] = archetype.seasonRange(club, d);
    if (!seasons) seasons = r('seasons').int(minS, maxS);
    if (archetype.forcePromotion && seasons < club.level) {
      notes.push(`${seasons} season(s) is not enough to reach the top flight from ${leagueRef(leagueById[club.leagueId])} — try ${club.level + 1} or more.`);
    }

    const nation = r('nation').pick(data.nations.filter((n) => n.adj !== club.nationality));
    const formation = r('formation').pick(data.formations);
    const ctx = makeContext({ club, d, seasons, archetype, nation, formation });

    const ruleCount = opts.ruleCount === 'auto' ? [1, 2, 3, 4][d - 1] + (archetype.bonusRules || 0) : opts.ruleCount;
    const coreRules = archetype.core(withRng(ctx, r('core'))).map((text) => ({ text }));
    const rules = pickRules(ctx, seed, ruleCount, locks.ruleIds);
    ctx.eventsOn = opts.events;

    const roadmap = buildRoadmap(ctx, r('roadmap'));

    const difficulty = data.difficulties[d - 1];
    return {
      version: 1,
      seed,
      options: opts,
      difficulty: d,
      difficultyName: difficulty.name,
      title: `${archetype.name}: ${club.name}`,
      archetype: {
        id: archetype.id, name: archetype.name, icon: archetype.icon, tagline: archetype.tagline, desc: archetype.desc,
        typeName: archetype.typeName || archetype.name, history: archetype.history || null,
      },
      club: {
        name: club.name, league: club.league, leagueId: club.leagueId, country: club.country,
        nationality: club.nationality, tier: club.tier, tierName: data.tierNames[club.tier],
      },
      seasons,
      coreRules,
      rules,
      roadmap,
      finalGoal: archetype.finalGoal(withRng(ctx, r('final'))),
      failConditions: failConditions(d),
      scoring: scoring(d),
      settings: settings(d),
      notes,
    };
  }

  /** Swap one extra rule for a different eligible one. Returns a new challenge. */
  function rerollRule(challenge, index, seed) {
    const club = findClub(challenge.club.name, challenge.club.leagueId);
    const archetype = archetypeById[challenge.archetype.id] && resolveArchetype(archetypeById[challenge.archetype.id], club);
    if (!club || !archetype || !challenge.rules[index]) return challenge;
    const ctx = makeContext({
      club, d: challenge.difficulty, seasons: challenge.seasons, archetype,
      nation: createRng(`${challenge.seed}:nation`).pick(data.nations.filter((n) => n.adj !== club.nationality)),
      formation: createRng(`${challenge.seed}:formation`).pick(data.formations),
    });
    const blocked = new Set(archetype.blockTags || []);
    const used = new Set(challenge.rules.map((x) => x.id));
    challenge.rules.forEach((x, i) => {
      if (i !== index && ruleById[x.id]) ruleById[x.id].tags.forEach((t) => blocked.add(t));
    });
    const pool = content.rules.filter((def) => eligibleRule(def, ctx, blocked, used));
    if (!pool.length) return challenge;
    const def = createRng(`${seed || randomSeed()}:swap`).pick(pool);
    const rules = challenge.rules.slice();
    // Rule text uses the challenge seed so share links can rebuild it from the id.
    rules[index] = makeRule(def, ctx, challenge.seed);
    return Object.assign({}, challenge, { rules });
  }

  function failConditions(d) {
    return [
      'Getting sacked ends the challenge.',
      [
        'Breaking a rule costs 10 points — then carry on.',
        'Breaking a rule costs 20 points, and you must undo it where you can (e.g. sell the player).',
        'Breaking a rule twice ends the challenge.',
        'Break any rule and the challenge is over.',
      ][d - 1],
      ...(d >= 3 ? [d === 4
        ? 'Missing the main objective in any season ends the challenge.'
        : 'Missing the main objective in two seasons in a row ends the challenge.'] : []),
    ];
  }

  function scoring(d) {
    return [
      { label: 'Main season objective', points: 10 },
      { label: 'Side objective', points: 5 },
      { label: 'Major trophy won', points: 15 },
      { label: 'Final goal achieved', points: 50 },
      { label: 'Rule broken', points: -[10, 20, 30, 50][d - 1] },
    ];
  }

  function settings(d) {
    return [
      { label: 'Game difficulty', value: ['Professional', 'World Class', 'Legendary', 'Ultimate'][d - 1] },
      { label: 'Half length', value: ['6 minutes', '8 minutes', '10 minutes', '10+ minutes'][d - 1] },
      { label: 'Injuries', value: d >= 3 ? 'On, frequency high' : 'On' },
      { label: 'Saves', value: d === 4 ? 'Ironman: no reloading after bad results' : 'Reload only after crashes' },
    ];
  }

  /**
   * Compact description of a challenge: seed, options and every choice
   * pinned as a lock. `fromShareKey` rebuilds the identical challenge.
   */
  function toShareKey(ch) {
    return {
      v: 1,
      s: ch.seed,
      o: Object.assign({}, ch.options, { seasons: 'auto', ruleCount: 'auto' }),
      c: [ch.club.name, ch.club.leagueId],
      a: ch.archetype.id,
      n: ch.seasons,
      d: ch.difficulty,
      r: ch.rules.map((x) => x.id),
    };
  }

  function fromShareKey(key) {
    if (!key || key.v !== 1 || !key.s || !Array.isArray(key.r) || !Array.isArray(key.c)) return null;
    const options = Object.assign({}, key.o, { ruleCount: key.r.length });
    const ch = generateChallenge(options, key.s, {
      club: { name: String(key.c[0]), leagueId: String(key.c[1]) },
      archetypeId: archetypeById[key.a] ? key.a : null,
      seasons: Number(key.n) || null,
      difficulty: Number(key.d) || null,
      ruleIds: key.r.map(String),
    });
    ch.options = Object.assign({}, ch.options, { ruleCount: 'auto' });
    return ch;
  }

  /** Plain-text version for pasting into Reddit, Discord, etc. */
  function challengeToText(ch) {
    const lines = [];
    if (ch.daily) lines.push(`📅 FC 26 Daily Challenge #${ch.daily.number} (${ch.daily.date})`);
    lines.push(`${ch.archetype.icon} ${ch.title}`);
    lines.push(`${ch.difficultyName} · ${ch.seasons} season${ch.seasons === 1 ? '' : 's'} · ${ch.club.league} · Seed ${ch.seed}`);
    lines.push('', ch.archetype.history || ch.archetype.desc, '', 'RULES');
    ch.coreRules.concat(ch.rules).forEach((x) => lines.push(`- ${x.text}`));
    lines.push('', 'ROADMAP');
    ch.roadmap.forEach((s) => {
      lines.push(`Season ${s.season}:`);
      s.objectives.forEach((o) => lines.push(`  ${o.type === 'main' ? '•' : '+'} ${o.text}`));
      s.events.forEach((e) => lines.push(`  ⚡ ${e}`));
    });
    lines.push('', `FINAL GOAL: ${ch.finalGoal}`, '', 'FAIL CONDITIONS');
    ch.failConditions.forEach((f) => lines.push(`- ${f}`));
    return lines.join('\n');
  }

  FC26.generator = {
    createRng,
    randomSeed,
    generateChallenge,
    rerollRule,
    toShareKey,
    fromShareKey,
    challengeToText,
    normalizeOptions,
    money,
    CLUBS,
    DEFAULT_OPTIONS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
