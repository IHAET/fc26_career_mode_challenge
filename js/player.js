/*
 * Player Career mode: challenges for a single player's career rather than
 * a manager's save. Registers FC26.modes.player for the shared generator.
 *
 * Seasons carry an age, objectives are milestones for the player (debut,
 * ratings, caps, trophies, awards) and targets depend on the position.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const { withRng, failConditions: managerFail, scoring, settings } = FC26.generator.internal;

  const positions = [
    { id: 'GK', name: 'Goalkeeper' },
    { id: 'CB', name: 'Centre-back' },
    { id: 'FB', name: 'Full-back' },
    { id: 'CDM', name: 'Defensive midfielder' },
    { id: 'CM', name: 'Central midfielder' },
    { id: 'CAM', name: 'Attacking midfielder' },
    { id: 'W', name: 'Winger' },
    { id: 'ST', name: 'Striker' },
  ];
  const positionById = Object.fromEntries(positions.map((p) => [p.id, p]));

  const GIANTS = 'Real Madrid, Barcelona, Bayern, Manchester City, Liverpool, Arsenal, PSG or Inter';

  // A season's headline number for the position. `scale` raises it later in a career.
  function statTarget(c, scale) {
    const n = (arr) => Math.round(c.byD(arr) * (scale || 1));
    switch (c.position.id) {
      case 'GK': return `Keep ${n([10, 12, 15, 18])}+ clean sheets in all competitions.`;
      case 'CB': return `Keep ${n([8, 10, 12, 14])}+ clean sheets and score ${n([2, 3, 4, 5])}+ goals.`;
      case 'FB': return `Get ${n([4, 6, 8, 10])}+ assists in all competitions.`;
      case 'CDM': return `Average a ${(c.byD([6.8, 7.0, 7.2, 7.4]) + (scale > 1 ? 0.2 : 0)).toFixed(1)}+ match rating.`;
      case 'CM': return `Get ${n([6, 10, 14, 18])}+ goals and assists combined.`;
      case 'ST': return `Score ${n([15, 20, 25, 30])}+ goals in all competitions.`;
      default: return `Get ${n([12, 16, 20, 25])}+ goals and assists combined.`;
    }
  }

  const isKeeper = (c) => c.position.id === 'GK';

  const archetypes = [
    {
      id: 'one-club-legend', name: 'One-Club Legend', icon: '🏟️',
      tagline: 'One badge, one career.',
      desc: 'Come through at one club and never leave. Become captain, lift trophies, retire a legend.',
      clubFilter: () => true,
      startAge: [17, 18],
      seasonRange: () => [8, 12],
      blockTags: ['moves', 'loans'],
      core: (c) => [
        `Spend your whole career at ${c.club.name}: never accept a permanent transfer.`,
        `Loans are only allowed before you turn ${c.byD([21, 20, 19, 19])}.`,
        `Become club captain by age ${c.byD([28, 27, 26, 25])}.`,
      ],
      finalGoal: (c) => (c.club.level > 1
        ? `Take ${c.club.name} up to the top flight and win ${c.topLeagueRef} with them.`
        : `Win ${c.topLeagueRef} and the ${c.continental} with ${c.club.name}, and make ${c.byD([300, 350, 400, 450])}+ appearances for them.`),
    },
    {
      id: 'wonderkid', name: 'Wonderkid', icon: '🌟',
      tagline: 'Seventeen and fearless.',
      desc: 'Start at a small club at 17 and become one of the best players in the world before 24.',
      clubFilter: (club) => club.tier <= 2,
      startAge: [17, 17],
      seasonRange: () => [5, 7],
      core: (c) => [
        `Start at ${c.club.name} and stay for at least ${c.byD([1, 2, 2, 3])} season(s).`,
        `Turn down every transfer offer until you are ${c.byD([75, 78, 80, 82])}+ OVR.`,
      ],
      finalGoal: (c) => `Win an end-of-season individual award (player of the year or top scorer) before you turn ${c.byD([24, 23, 22, 21])}.`,
    },
    {
      id: 'hometown-hero', name: 'Hometown Hero', icon: '🏘️',
      tagline: 'Carry your club to the top.',
      desc: 'Start at a lower-league club and refuse to leave until you have dragged them to the top flight.',
      clubFilter: (club) => club.level >= 2 || club.tier === 1,
      startAge: [17, 19],
      seasonRange: () => [6, 10],
      blockTags: ['moves'],
      core: (c) => [
        `Never leave ${c.club.name} until they reach the top flight.`,
        'Turn down every offer from a bigger club until then.',
      ],
      finalGoal: (c) => `Captain ${c.club.name} to a ${c.topLeague.name} title.`,
    },
    {
      id: 'dream-move', name: 'The Dream Move', icon: '💫',
      tagline: 'Step by step to the very top.',
      desc: 'Climb the ladder one club at a time until a European giant comes calling.',
      clubFilter: (club) => club.tier <= 3,
      startAge: [17, 19],
      seasonRange: () => [5, 8],
      blockTags: ['moves'],
      core: (c) => [
        'Only accept a transfer to a bigger club than the one you are at.',
        `Earn a move to a European giant (${GIANTS}) by age ${c.byD([25, 24, 23, 22])}.`,
      ],
      finalGoal: (c) => `Win the Champions League with a European giant before you turn ${c.byD([28, 27, 26, 25])}.`,
    },
    {
      id: 'globetrotter', name: 'Globetrotter', icon: '🌍',
      tagline: 'Have boots, will travel.',
      desc: 'Play in a new country every few seasons and win the league wherever you go.',
      clubFilter: () => true,
      startAge: [18, 20],
      seasonRange: () => [7, 10],
      blockTags: ['moves', 'leagues'],
      core: (c) => [
        `Move to a club in a new country every ${c.byD([3, 3, 2, 2])} seasons.`,
        'Never return to a league you have already played in.',
      ],
      finalGoal: (c) => `Win league titles in ${c.byD([2, 3, 3, 4])} different countries.`,
    },
    {
      id: 'last-line', name: 'Last Line', icon: '🧤',
      tagline: 'Keep it out. Every time.',
      desc: 'A goalkeeper career: become number one, then the best keeper in Europe.',
      position: 'GK',
      clubFilter: () => true,
      startAge: [17, 19],
      seasonRange: () => [5, 8],
      blockTags: ['position'],
      core: (c) => [
        'Play in goal for your whole career.',
        `Become your club's first-choice goalkeeper by age ${c.byD([22, 21, 20, 19])}.`,
      ],
      finalGoal: (c) => `Keep ${c.byD([15, 18, 20, 22])}+ league clean sheets in one season and win the ${c.continental}.`,
    },
    {
      id: 'goal-machine', name: 'Goal Machine', icon: '⚽',
      tagline: 'Goals, goals, goals.',
      desc: 'A striker career measured in one number: goals.',
      position: 'ST',
      clubFilter: () => true,
      startAge: [17, 18],
      seasonRange: () => [8, 12],
      blockTags: ['position'],
      seasonGoal: (c, s) => (s >= 3 ? statTarget(c, s >= 6 ? 1.3 : 1) : null),
      core: (c) => [
        'Play as a striker for your whole career.',
        `Score ${c.byD([10, 15, 18, 20])}+ goals in every full season, or move clubs that summer.`,
      ],
      finalGoal: (c) => `Score ${c.byD([200, 250, 300, 400])} career goals.`,
    },
    {
      id: 'goalscoring-defender', name: 'Goalscoring Defender', icon: '🧱',
      tagline: 'Defend first, then score anyway.',
      desc: 'A centre-back who keeps clean sheets and pops up with goals at set pieces.',
      position: 'CB',
      clubFilter: () => true,
      startAge: [17, 19],
      seasonRange: () => [5, 8],
      blockTags: ['position'],
      core: (c) => [
        'Play as a centre-back for your whole career.',
        `Score ${c.byD([2, 3, 4, 5])}+ goals in every full season.`,
      ],
      finalGoal: (c) => `Score ${c.byD([8, 10, 12, 15])}+ league goals in a single season as a centre-back.`,
    },
    {
      id: 'wildcard-career', name: 'Wildcard Career', icon: '🎲',
      tagline: 'Let the dice decide.',
      desc: 'No theme, just a pile of random rules and a career full of surprises.',
      clubFilter: () => true,
      startAge: [17, 20],
      seasonRange: () => [4, 7],
      bonusRules: 2,
      eventBoost: 2,
      core: () => [],
      finalGoal: (c) => `Win a major trophy and reach ${c.byD([82, 84, 86, 88])}+ OVR.`,
    },
  ];

  const rules = [
    { id: 'no-request', cat: 'Moves', tags: ['request'], text: () => 'Never hand in a transfer request.' },
    { id: 'first-offer', cat: 'Moves', tags: ['moves'], minD: 2, text: () => 'Accept the first permanent transfer offer you receive each summer.' },
    { id: 'stay-min', cat: 'Moves', tags: ['moves'], text: (c) => `Stay at least ${c.byD([1, 2, 2, 3])} season(s) at every club.` },
    { id: 'no-bigger', cat: 'Moves', tags: ['moves'], minD: 2, text: () => 'Never join a club bigger than the one you are leaving.' },
    { id: 'avoid-country', cat: 'Moves', tags: ['leagues'], text: (c) => `Never play for a club in ${c.rng.pick(['England', 'Spain', 'Italy', 'Germany', 'France'])}.` },
    { id: 'no-loan-out', cat: 'Moves', tags: ['loans'], text: () => 'Never go out on loan.' },
    { id: 'position-lock', cat: 'Playing', tags: ['position'], text: () => 'Never change position, even if your manager asks.' },
    { id: 'no-sim', cat: 'Playing', tags: ['sim'], text: () => 'Play every match you are picked for: no simming.' },
    { id: 'rating-floor', cat: 'Playing', tags: ['rating'], text: (c) => `Average a ${c.byD([6.6, 6.8, 7.0, 7.2]).toFixed(1)}+ match rating every season, or move clubs that summer.` },
    { id: 'no-skill', cat: 'Playing', tags: ['style'], text: () => 'No skill moves, ever.' },
    { id: 'one-celebration', cat: 'Playing', tags: ['celebrate'], when: (c) => !isKeeper(c), text: () => 'Use the same goal celebration for your whole career.' },
    { id: 'retire-at', cat: 'Career', tags: ['retire'], text: (c) => `Retire at ${c.byD([36, 35, 34, 33])}, whatever your rating.` },
    { id: 'first-contract', cat: 'Career', tags: ['contract'], text: () => "Always accept a club's first contract offer: no negotiating." },
    { id: 'intl-early', cat: 'Career', tags: ['intl'], text: (c) => `Earn a senior international cap by age ${c.byD([24, 23, 22, 21])}.` },
    { id: 'captain-by', cat: 'Career', tags: ['captain'], text: (c) => `Captain a club by age ${c.byD([30, 28, 27, 26])}.` },
  ];
  const ruleById = Object.fromEntries(rules.map((r) => [r.id, r]));

  const sideObjectives = [
    { id: 'potm', text: () => 'Win a Player of the Month award.' },
    { id: 'big-moment', text: (c) => (isKeeper(c) ? 'Save a penalty in a competitive match.' : 'Score a hat-trick.') },
    { id: 'cup', text: (c) => `Win the ${c.cup}.` },
    { id: 'apps', text: (c) => `Play ${c.byD([35, 40, 45, 50])}+ matches in all competitions.` },
    { id: 'motm', text: (c) => `Win ${c.byD([3, 5, 7, 10])}+ player of the match awards.` },
    { id: 'growth', text: (c) => `Gain ${c.byD([4, 5, 6, 8])}+ OVR this season.` },
    { id: 'intl-moment', text: (c) => (isKeeper(c) ? 'Keep a clean sheet for your national team.' : 'Score for your national team.') },
    { id: 'derby', text: (c) => (isKeeper(c) ? 'Keep a clean sheet in a derby.' : 'Score or assist in a derby.') },
  ];

  const events = [
    { id: 'rival-signing', text: () => 'Rival signing: your club buys a star in your position. Win your place back with 20+ starts.' },
    { id: 'new-manager', text: () => 'New manager: average a 7.0+ match rating until the winter break to win them over.' },
    { id: 'big-offer', text: () => 'Big offer: accept the biggest transfer offer you receive this summer.' },
    { id: 'loan-spell', text: () => 'Loan spell: if a loan offer comes in January, take it.' },
    { id: 'injury-setback', text: () => 'Injury setback: no transfers this season. Focus on getting back to your best.' },
    { id: 'media-storm', when: (c) => !isKeeper(c), text: () => 'Media storm: no goal celebrations this season.' },
    { id: 'leadership', text: () => 'Leadership test: be named captain in at least one match this season.' },
    { id: 'tactical-switch', when: (c) => !isKeeper(c), text: () => 'Tactical switch: if your manager asks you to play a new position this season, say yes (overrides any position rule).' },
    { id: 'national-duty', text: () => 'National duty: earn a call-up this season.' },
  ];

  // Career milestones, roughly in order. Difficulty decides where you start
  // on the ladder and how fast you climb it.
  const ladder = [
    () => 'Make your debut and play 15+ matches in all competitions.',
    () => 'Become a regular starter: 25+ league starts.',
    (c) => `Reach ${c.byD([72, 75, 78, 80])}+ OVR.`,
    (c) => statTarget(c, 1),
    () => 'Earn your first senior international cap.',
    () => 'Win a league title.',
    (c) => `Reach ${c.byD([80, 83, 85, 87])}+ OVR.`,
    (c) => statTarget(c, 1.3),
    (c) => `Win the ${c.continental}.`,
    () => 'Win an end-of-season individual award (player of the year or top scorer).',
  ];

  function buildRoadmap(ctx, rng) {
    const { d, seasons, archetype } = ctx;
    const startStep = [0, 0, 1, 2][d - 1];
    const pace = [0.8, 1, 1, 1.2][d - 1];
    const sideChance = [0.35, 0.5, 0.65, 0.8][d - 1];
    const eventChance = Math.min(0.9, [0.2, 0.3, 0.45, 0.6][d - 1] * (archetype.eventBoost || 1));
    const usedSide = new Set();
    const usedEvents = new Set();
    const roadmap = [];

    for (let s = 1; s <= seasons; s++) {
      let step = Math.floor(startStep + (s - 1) * pace);
      // Past the top of the ladder, alternate the last two milestones.
      if (step >= ladder.length) step = ladder.length - 1 - ((step - ladder.length) % 2);
      const main = (archetype.seasonGoal && archetype.seasonGoal(ctx, s)) || ladder[step](ctx);
      const objectives = [{ text: main, type: 'main' }];

      if (rng.chance(sideChance)) {
        const pool = sideObjectives.filter((o) => !usedSide.has(o.id) && (!o.when || o.when(ctx)));
        if (pool.length) {
          const pick = rng.pick(pool);
          usedSide.add(pick.id);
          objectives.push({ text: pick.text(withRng(ctx, rng)), type: 'side' });
        }
      }

      const evs = [];
      if (ctx.eventsOn && s > 1 && rng.chance(eventChance)) {
        const pool = events.filter((ev) => !usedEvents.has(ev.id) && (!ev.when || ev.when(ctx)));
        if (pool.length) {
          const pick = rng.pick(pool);
          usedEvents.add(pick.id);
          evs.push(pick.text(withRng(ctx, rng)));
        }
      }

      roadmap.push({ season: s, age: ctx.startAge + s - 1, objectives, events: evs });
    }
    return roadmap;
  }

  function failConditions(d) {
    const lines = managerFail(d).slice(1);
    return ['Ending up without a club ends the challenge.', ...lines];
  }

  const archetypeById = Object.fromEntries(archetypes.map((a) => [a.id, a]));

  FC26.modes = FC26.modes || {};
  FC26.modes.player = {
    id: 'player',
    name: 'Player Career',
    archetypes,
    archetypeById,
    rules,
    ruleById,
    positions,
    ruleCount: (d) => [1, 2, 2, 3][d - 1],
    normalizeOptions(o) {
      if (o.position !== 'any' && !positionById[o.position]) o.position = 'any';
    },
    // Don't pick a fixed-position archetype (e.g. Goal Machine) for a different position.
    archetypeFilter(a, locks, opts) {
      const wanted = locks.position || (opts.position !== 'any' ? opts.position : null);
      return !a.position || !wanted || a.position === wanted;
    },
    // Position and starting age, from the archetype, locks, the options or the seed.
    prepare(ctx, r, locks, opts) {
      const a = ctx.archetype;
      const posId = a.position
        || (locks.position && positionById[locks.position] && locks.position)
        || (opts.position && opts.position !== 'any' ? opts.position : r('position').pick(positions).id);
      ctx.position = positionById[posId];
      const [minAge, maxAge] = a.startAge || [17, 19];
      const lockedAge = Number(locks.startAge);
      ctx.startAge = lockedAge >= 15 && lockedAge <= 40 ? lockedAge : r('age').int(minAge, maxAge);
    },
    locksOf: (ch) => ({ position: ch.position && ch.position.id, startAge: ch.startAge }),
    title: (ctx) => `${ctx.archetype.name}: ${ctx.position.name} at ${ctx.club.name}`,
    extraOutput: (ctx) => ({ position: { id: ctx.position.id, name: ctx.position.name }, startAge: ctx.startAge }),
    sanitizeExtra(raw) {
      const pos = raw.position && positionById[raw.position.id];
      const age = Math.round(Number(raw.startAge));
      return {
        position: pos ? { id: pos.id, name: pos.name } : { id: 'CM', name: 'Central midfielder' },
        startAge: age >= 15 && age <= 40 ? age : 17,
      };
    },
    buildRoadmap,
    failConditions,
    scoring,
    settings,
  };

  FC26.player = { positions, statTarget };
})(typeof window !== 'undefined' ? window : globalThis);
