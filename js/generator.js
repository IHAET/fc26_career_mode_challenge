/*
 * Challenge generator. Pure logic with no DOM access, so it runs in the
 * browser and under Node (see tests/).
 *
 * Every random choice draws from its own RNG stream derived from the seed
 * (e.g. "AB12CD:club"), so locking one part of a challenge and rerolling
 * the rest keeps the locked part stable and the result reproducible.
 *
 * The generator is shared by game modes (FC26.modes): Manager Career is
 * defined here, Player Career in player.js. A mode supplies its own
 * archetypes, rules, roadmap and scoring; club picking, rules and locks
 * are common.
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

  // ---------- Custom clubs ----------

  // Countries a custom club can come from, with their nationality adjective.
  const COUNTRIES = (() => {
    const map = new Map(data.leagues.map((l) => [l.country, l.nationality]));
    data.nations.forEach((n) => { if (!map.has(n.name)) map.set(n.name, n.adj); });
    return Array.from(map, ([name, adj]) => ({ name, adj })).sort((a, b) => a.name.localeCompare(b.name));
  })();

  function normalizeCustomClub(cc) {
    if (!cc || typeof cc !== 'object') return null;
    const name = String(cc.name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const country = COUNTRIES.find((c) => c.name === cc.country);
    if (!name || !country) return null;
    return {
      name,
      country: country.name,
      level: Math.min(4, Math.max(1, Math.round(Number(cc.level)) || 1)),
      tier: Math.min(5, Math.max(1, Math.round(Number(cc.tier)) || 3)),
      league: String(cc.league || '').replace(/\s+/g, ' ').trim().slice(0, 40),
    };
  }

  /**
   * A club the user typed in. It slots into a real league when one exists
   * for that country and division (e.g. an English fourth-tier club goes in
   * League Two); otherwise it gets a stand-in league.
   */
  function buildCustomClub(cc) {
    const known = leagueAt(cc.country, cc.level);
    const country = COUNTRIES.find((c) => c.name === cc.country);
    const fallbackName = cc.level === 1 ? 'top flight' : ['', '', 'second division', 'third division', 'fourth division'][cc.level];
    return {
      name: cc.name,
      tier: cc.tier,
      leagueId: known ? known.id : 'custom',
      league: known ? known.name : (cc.league || fallbackName),
      country: cc.country,
      nationality: country ? country.adj : 'local',
      level: cc.level,
      continental: known ? known.continental || null : null,
      custom: true,
    };
  }

  // The league object for a club, including stand-ins for custom clubs.
  function leagueOf(club) {
    return leagueById[club.leagueId] || { id: 'custom', name: club.league, level: club.level, cup: 'domestic cup' };
  }

  function topLeagueOf(club) {
    return leagueAt(club.country, 1) || (club.level === 1 ? leagueOf(club) : { id: 'custom-top', name: 'top flight', level: 1 });
  }

  /** The club behind a generated challenge, custom or not. */
  function clubOf(ch) {
    const custom = ch.options && normalizeCustomClub(ch.options.customClub);
    return custom ? buildCustomClub(custom) : findClub(ch.club.name, ch.club.leagueId);
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
    const topLeague = topLeagueOf(club);
    const league = leagueOf(club);
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
    mode: 'manager', // key of FC26.modes
    difficulty: 'random', // 1-4 or 'random'
    archetype: 'any',
    club: 'any', // "leagueId|Club name"
    league: 'any',
    tier: 'any',
    seasons: 'auto',
    ruleCount: 'auto',
    events: true,
    customClub: null, // { name, country, level, tier, league }
    position: 'any', // Player Career only
  };

  const modeOf = (mode) => FC26.modes[mode] || FC26.modes.manager;

  function normalizeOptions(options) {
    const o = Object.assign({}, DEFAULT_OPTIONS, options || {});
    if (!FC26.modes[o.mode]) o.mode = 'manager';
    const mode = modeOf(o.mode);
    if (o.difficulty !== 'random') o.difficulty = Math.min(4, Math.max(1, Number(o.difficulty) || 2));
    if (o.archetype !== 'any' && !mode.archetypeById[o.archetype]) o.archetype = 'any';
    if (o.league !== 'any' && !leagueById[o.league]) o.league = 'any';
    if (o.club !== 'any') {
      const [leagueId, ...rest] = String(o.club).split('|');
      if (!findClub(rest.join('|'), leagueId)) o.club = 'any';
    }
    if (o.tier !== 'any') o.tier = Math.min(5, Math.max(1, Number(o.tier) || 3));
    if (o.seasons !== 'auto') o.seasons = Math.min(15, Math.max(1, Number(o.seasons) || 5));
    if (o.ruleCount !== 'auto') o.ruleCount = Math.min(8, Math.max(0, Number(o.ruleCount) || 0));
    o.events = o.events !== false;
    o.customClub = normalizeCustomClub(o.customClub);
    if (mode.normalizeOptions) mode.normalizeOptions(o);
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
    const midChance = Math.min(0.9, [0.3, 0.45, 0.6, 0.75][d - 1] * (archetype.eventBoost || 1));
    const usedMid = new Set();
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
      let blocks = [];
      if (ctx.eventsOn && rng.chance(eventChance)) {
        const pool = content.events.filter((ev) => !usedEvents.has(ev.id)
          && (!ev.minSeason || s >= ev.minSeason) && (!ev.when || ev.when(ctx)));
        if (pool.length) {
          const pick = rng.pick(pool);
          usedEvents.add(pick.id);
          events.push(pick.text(withRng(ctx, rng)));
          blocks = pick.blocks || [];
        }
      }

      // Mid-season drama, from its own stream so it doesn't reshuffle the rest of the roadmap.
      const mid = ctx.eventsOn && ctx.midRng && pickMidSeason(ctx, content.midSeason, usedMid, s, midChance, blocks);
      if (mid) events.push(mid);

      roadmap.push({ season: s, objectives, events });
    }
    return roadmap;
  }

  /** One unused mid-season drama for season s (or null), drawn from ctx.midRng; `blocks` are tags that season's event rules out. */
  function pickMidSeason(ctx, pool, used, s, chance, blocks) {
    const rng = ctx.midRng;
    if (!rng.chance(chance)) return null;
    const fits = pool.filter((ev) => !used.has(ev.id) && (!ev.minSeason || s >= ev.minSeason) && (!ev.when || ev.when(ctx))
      && !(ev.tags || []).some((t) => (blocks || []).includes(t)));
    if (!fits.length) return null;
    const pick = rng.pick(fits);
    used.add(pick.id);
    return pick.text(withRng(ctx, rng));
  }

  // ---------- Rules ----------

  function eligibleRule(def, ctx, blocked, used) {
    return !used.has(def.id)
      && (!def.minD || ctx.d >= def.minD)
      && (!def.when || def.when(ctx))
      && !def.tags.some((t) => blocked.has(t));
  }

  function makeRule(def, ctx, seed) {
    return { id: def.id, cat: def.cat, text: def.text(withRng(ctx, createRng(`${seed}:rule:${def.id}`))) };
  }

  function pickRules(mode, ctx, seed, count, lockedIds) {
    const { ruleById } = mode;
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
    for (const def of createRng(`${seed}:rules`).shuffle(mode.rules)) {
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
   *                          plus any mode-specific locks (e.g. position)
   */
  function generateChallenge(options, seed, locks) {
    seed = String(seed || randomSeed());
    locks = locks || {};
    const opts = normalizeOptions(options);
    const mode = modeOf(opts.mode);
    const { archetypeById: archById } = mode;
    const r = (label) => createRng(`${seed}:${label}`);
    const notes = [];

    let d = opts.difficulty === 'random' ? r('difficulty').int(1, 4) : opts.difficulty;
    if (locks.difficulty) d = Math.min(4, Math.max(1, Number(locks.difficulty) || d));
    const userFilter = (c) => (opts.club !== 'any'
      ? `${c.leagueId}|${c.name}` === opts.club
      : (opts.league === 'any' || c.leagueId === opts.league) && (opts.tier === 'any' || c.tier === opts.tier));

    let club = opts.customClub ? buildCustomClub(opts.customClub)
      : locks.club ? (findClub(locks.club.name, locks.club.leagueId) || null) : null;
    let archetype = locks.archetypeId ? archById[locks.archetypeId] : null;

    if (!archetype) {
      const pool = opts.archetype !== 'any' ? [archById[opts.archetype]] : mode.archetypes;
      let candidates = pool.filter((a) => (!mode.archetypeFilter || mode.archetypeFilter(a, locks, opts))
        && (club ? a.clubFilter(club) : CLUBS.some((c) => a.clubFilter(c) && userFilter(c))));
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
    archetype = mode.resolveArchetype ? mode.resolveArchetype(archetype, club) : archetype;

    let seasons = locks.seasons ? Math.min(15, Math.max(1, Number(locks.seasons))) : null;
    seasons = seasons || (opts.seasons !== 'auto' ? opts.seasons : null);
    const [minS, maxS] = archetype.seasonRange(club, d);
    if (!seasons) seasons = r('seasons').int(minS, maxS);
    if (archetype.forcePromotion && seasons < club.level) {
      notes.push(`${seasons} season(s) is not enough to reach the top flight from ${leagueRef(leagueOf(club))} — try ${club.level + 1} or more.`);
    }

    const nation = r('nation').pick(data.nations.filter((n) => n.adj !== club.nationality));
    const formation = r('formation').pick(data.formations);
    const ctx = makeContext({ club, d, seasons, archetype, nation, formation });
    if (mode.prepare) mode.prepare(ctx, r, locks, opts);

    const ruleCount = opts.ruleCount === 'auto' ? mode.ruleCount(d) + (archetype.bonusRules || 0) : opts.ruleCount;
    const coreRules = archetype.core(withRng(ctx, r('core'))).map((text) => ({ text }));
    const rules = pickRules(mode, ctx, seed, ruleCount, locks.ruleIds);
    ctx.eventsOn = opts.events;
    ctx.midRng = r('midseason');
    // Tags the challenge already covers, so mid-season dramas don't contradict it.
    const tagsOf = (id) => (mode.rules.find((def) => def.id === id) || {}).tags || [];
    ctx.takenTags = new Set((archetype.blockTags || []).concat(rules.flatMap((rule) => tagsOf(rule.id))));

    const roadmap = mode.buildRoadmap(ctx, r('roadmap'));

    const difficulty = data.difficulties[d - 1];
    return Object.assign({
      version: 1,
      mode: mode.id,
      seed,
      options: opts,
      difficulty: d,
      difficultyName: difficulty.name,
      title: mode.title ? mode.title(ctx) : `${archetype.name}: ${club.name}`,
      archetype: {
        id: archetype.id, name: archetype.name, icon: archetype.icon, tagline: archetype.tagline, desc: archetype.desc,
        typeName: archetype.typeName || archetype.name, history: archetype.history || null,
      },
      club: {
        name: club.name, league: club.league, leagueId: club.leagueId, country: club.country,
        nationality: club.nationality, tier: club.tier, tierName: data.tierNames[club.tier],
        custom: Boolean(club.custom),
      },
      seasons,
      coreRules,
      rules,
      roadmap,
      finalGoal: archetype.finalGoal(withRng(ctx, r('final'))),
      failConditions: mode.failConditions(d),
      scoring: mode.scoring(d),
      settings: mode.settings(d),
      notes,
    }, mode.extraOutput ? mode.extraOutput(ctx) : {});
  }

  /** Swap one extra rule for a different eligible one. Returns a new challenge. */
  function rerollRule(challenge, index, seed) {
    const mode = modeOf(challenge.mode);
    const ruleDefs = mode.ruleById;
    const club = clubOf(challenge);
    const base = club && mode.archetypeById[challenge.archetype.id];
    const archetype = base && (mode.resolveArchetype ? mode.resolveArchetype(base, club) : base);
    if (!club || !archetype || !challenge.rules[index]) return challenge;
    const r = (label) => createRng(`${challenge.seed}:${label}`);
    const ctx = makeContext({
      club, d: challenge.difficulty, seasons: challenge.seasons, archetype,
      nation: r('nation').pick(data.nations.filter((n) => n.adj !== club.nationality)),
      formation: r('formation').pick(data.formations),
    });
    if (mode.prepare) mode.prepare(ctx, r, mode.locksOf ? mode.locksOf(challenge) : {}, challenge.options || {});
    const blocked = new Set(archetype.blockTags || []);
    const used = new Set(challenge.rules.map((x) => x.id));
    challenge.rules.forEach((x, i) => {
      if (i !== index && ruleDefs[x.id]) ruleDefs[x.id].tags.forEach((t) => blocked.add(t));
    });
    const pool = mode.rules.filter((def) => eligibleRule(def, ctx, blocked, used));
    if (!pool.length) return challenge;
    const def = createRng(`${seed || randomSeed()}:swap`).pick(pool);
    const rules = challenge.rules.slice();
    // Rule text uses the challenge seed so share links can rebuild it from the id.
    rules[index] = makeRule(def, ctx, challenge.seed);
    const next = Object.assign({}, challenge, { rules });
    // Mid-season dramas avoid the rules' tags, so they follow the new rule
    // exactly as a share link would rebuild them.
    const rebuilt = !challenge.custom && fromShareKey(JSON.parse(JSON.stringify(toShareKey(next))));
    if (rebuilt) next.roadmap = rebuilt.roadmap;
    return next;
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
    const mode = modeOf(ch.mode);
    return Object.assign({
      v: 1,
      s: ch.seed,
      o: Object.assign({}, ch.options, { seasons: 'auto', ruleCount: 'auto' }),
      c: [ch.club.name, ch.club.leagueId],
      a: ch.archetype.id,
      n: ch.seasons,
      d: ch.difficulty,
      r: ch.rules.map((x) => x.id),
    }, mode.locksOf ? { m: mode.locksOf(ch) } : {});
  }

  function fromShareKey(key) {
    if (!key || key.v !== 1 || !key.s || !Array.isArray(key.r) || !Array.isArray(key.c)) return null;
    const options = Object.assign({}, key.o, { ruleCount: key.r.length });
    const mode = modeOf(options.mode);
    const ch = generateChallenge(options, String(key.s), Object.assign({}, key.m && typeof key.m === 'object' ? key.m : {}, {
      club: { name: String(key.c[0]), leagueId: String(key.c[1]) },
      archetypeId: mode.archetypeById[key.a] ? key.a : null,
      seasons: Number(key.n) || null,
      difficulty: Number(key.d) || null,
      ruleIds: key.r.map(String),
    }));
    ch.options = Object.assign({}, ch.options, { ruleCount: 'auto' });
    return ch;
  }

  /**
   * Clean up a challenge from an untrusted source (an edited challenge in a
   * share link): keep only known fields, coerce types and cap lengths. The
   * result is safe to render and to store.
   */
  function sanitizeChallenge(raw) {
    if (!raw || typeof raw !== 'object') return null;
    // Only plain strings and numbers count as text: String() on an object can run its code or throw.
    const str = (v, max = 400) => (typeof v === 'string' ? v : Number.isFinite(v) ? String(v) : '').slice(0, max).trim();
    const int = (v, min, max, dflt) => {
      const n = Math.round(Number(v));
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
    };
    const list = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
    const obj = (v) => (v && typeof v === 'object' ? v : {});

    const options = normalizeOptions(obj(raw.options));
    const mode = modeOf(raw.mode === 'player' ? 'player' : 'manager');
    options.mode = mode.id;
    const d = int(raw.difficulty, 1, 4, 2);
    const a = obj(raw.archetype);
    const c = obj(raw.club);
    const tier = int(c.tier, 1, 5, 3);

    let roadmap = list(raw.roadmap, 15).map((s, i) => {
      const season = obj(s);
      const out = {
        season: i + 1,
        objectives: list(season.objectives, 8).map((o) => ({ text: str(obj(o).text), type: obj(o).type === 'side' ? 'side' : 'main' })).filter((o) => o.text),
        events: list(season.events, 6).map((e) => str(e)).filter(Boolean),
      };
      if (season.age != null) out.age = int(season.age, 14, 50, null);
      return out;
    });
    if (!roadmap.length) roadmap = [{ season: 1, objectives: [], events: [] }];

    const archName = str(a.name, 60) || 'Custom Challenge';
    const clubName = str(c.name, 40) || 'Your club';
    const out = {
      version: 1,
      mode: mode.id,
      custom: true,
      seed: str(raw.seed, 40) || 'custom',
      options,
      difficulty: d,
      difficultyName: data.difficulties[d - 1].name,
      title: str(raw.title, 120) || `${archName}: ${clubName}`,
      archetype: {
        id: str(a.id, 40) || 'custom',
        name: archName,
        icon: str(a.icon, 8) || '✍️',
        tagline: str(a.tagline, 160),
        desc: str(a.desc, 400),
        typeName: str(a.typeName, 60) || archName,
        history: str(a.history, 1200) || null,
      },
      club: {
        name: clubName,
        league: str(c.league, 60),
        leagueId: str(c.leagueId, 20),
        country: str(c.country, 40),
        nationality: str(c.nationality, 40),
        tier,
        tierName: data.tierNames[tier],
        custom: Boolean(c.custom),
      },
      seasons: roadmap.length,
      coreRules: list(raw.coreRules, 12).map((x) => ({ text: str(obj(x).text) })).filter((x) => x.text),
      rules: list(raw.rules, 12).map((x) => ({ id: str(obj(x).id, 40) || 'custom', cat: str(obj(x).cat, 20) || 'Custom', text: str(obj(x).text) })).filter((x) => x.text),
      roadmap,
      finalGoal: str(raw.finalGoal),
      failConditions: list(raw.failConditions, 6).map((f) => str(f)).filter(Boolean),
      scoring: mode.scoring(d),
      settings: mode.settings(d),
      notes: [],
    };
    if (!out.failConditions.length) out.failConditions = mode.failConditions(d);
    if (mode.sanitizeExtra) Object.assign(out, mode.sanitizeExtra(raw));
    return out;
  }

  /** A roadmap event → { icon, when, text }: mid-season dramas ("Mid-season (January): ...") get 🔥 and their moment split off. */
  function splitEvent(event) {
    const m = String(event).match(/^(Mid-season(?: \([^)]*\))?):\s*([\s\S]*)$/i);
    return m ? { icon: '🔥', when: m[1], text: m[2] } : { icon: '⚡', when: '', text: String(event) };
  }

  /** Plain-text version for pasting into Reddit, Discord, etc. */
  function challengeToText(ch) {
    const lines = [];
    if (ch.daily) lines.push(`📅 FC 26 Daily Challenge #${ch.daily.number} (${ch.daily.date})`);
    lines.push(`${ch.archetype.icon} ${ch.title}`);
    const meta = [ch.difficultyName, `${ch.seasons} season${ch.seasons === 1 ? '' : 's'}`];
    if (ch.position) meta.push(`${ch.position.name}, starting age ${ch.startAge}`);
    if (ch.club.league) meta.push(ch.club.league);
    meta.push(ch.custom ? 'Custom challenge' : `Seed ${ch.seed}`);
    lines.push(meta.join(' · '));
    lines.push('', ch.archetype.history || ch.archetype.desc, '', 'RULES');
    ch.coreRules.concat(ch.rules).forEach((x) => lines.push(`- ${x.text}`));
    lines.push('', 'ROADMAP');
    ch.roadmap.forEach((s) => {
      lines.push(`Season ${s.season}${s.age ? ` (age ${s.age})` : ''}:`);
      s.objectives.forEach((o) => lines.push(`  ${o.type === 'main' ? '•' : '+'} ${o.text}`));
      s.events.forEach((e) => lines.push(`  ${splitEvent(e).icon} ${e}`));
    });
    lines.push('', `FINAL GOAL: ${ch.finalGoal}`, '', 'FAIL CONDITIONS');
    ch.failConditions.forEach((f) => lines.push(`- ${f}`));
    return lines.join('\n');
  }

  // ---------- Manager Career mode ----------

  FC26.modes = FC26.modes || {};
  FC26.modes.manager = {
    id: 'manager',
    name: 'Manager Career',
    archetypes: content.archetypes,
    archetypeById,
    rules: content.rules,
    ruleById,
    resolveArchetype,
    ruleCount: (d) => [1, 2, 3, 4][d - 1],
    buildRoadmap,
    failConditions,
    scoring,
    settings,
  };

  FC26.generator = {
    createRng,
    randomSeed,
    generateChallenge,
    rerollRule,
    toShareKey,
    fromShareKey,
    sanitizeChallenge,
    challengeToText,
    normalizeOptions,
    buildCustomClub,
    normalizeCustomClub,
    money,
    CLUBS,
    COUNTRIES,
    DEFAULT_OPTIONS,
    // Building blocks for other modes (player.js).
    splitEvent,
    internal: { withRng, failConditions, scoring, settings, pickMidSeason },
  };
})(typeof window !== 'undefined' ? window : globalThis);
