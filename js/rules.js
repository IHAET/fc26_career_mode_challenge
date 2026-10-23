/*
 * Challenge content: archetypes (the theme of a save), the pool of extra
 * rules, side objectives and random season events.
 *
 * Text builders receive a context `c` (see generator.js `makeContext`) with
 * the club, difficulty `c.d` (1-4) and helpers such as `c.byD([...])`, which
 * picks the value for the current difficulty.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  const heritage = FC26.heritage || {};
  const european = (club) => !club.continental;
  const tierIn = (club, min, max) => club.tier >= min && club.tier <= max;

  const archetypes = [
    {
      id: 'road-to-glory', name: 'Road to Glory', icon: '🪜',
      tagline: 'From the bottom of the pyramid to the top of Europe.',
      desc: 'Take a lower-league club and drag them all the way to the top-flight title.',
      clubFilter: (club) => club.level >= 3 || (club.level === 2 && club.tier === 1),
      seasonRange: (club) => [club.level + 1, club.level + 3],
      forcePromotion: true,
      finalTitle: true,
      // Fixed caps make no sense for a club that changes division every year.
      blockTags: ['ovr', 'fee', 'wage'],
      core: (c) => [
        `Stay at ${c.club.name} for the whole save — no job switching.`,
        `Spend only the board's budget: no custom starting budget.`,
      ],
      finalGoal: (c) => (c.d >= 3
        ? `Win ${c.topLeagueRef} and the ${c.continental} with ${c.club.name}.`
        : `Win ${c.topLeagueRef} with ${c.club.name}.`),
    },
    {
      id: 'youth-revolution', name: 'Youth Revolution', icon: '🌱',
      tagline: 'Your academy is your transfer market.',
      desc: 'Build a team of teenagers and academy graduates and grow them into champions.',
      clubFilter: (club) => tierIn(club, 2, 4) && club.level <= 2,
      seasonRange: () => [4, 7],
      blockTags: ['age', 'academy', 'academy-promote', 'avg-age'],
      core: (c) => [
        `No signing anyone older than ${c.byD([22, 21, 20, 19])}.`,
        `Promote at least ${c.byD([2, 3, 3, 4])} youth academy players to the first team every season.`,
        `From season 2, at least ${c.byD([2, 3, 4, 5])} academy graduates must start every league match.`,
      ],
      finalGoal: (c) => `Win ${c.topLeagueRef} with ${c.byD([4, 5, 6, 7])}+ academy graduates in the starting XI.`,
    },
    {
      id: 'moneyball', name: 'Moneyball', icon: '💰',
      tagline: 'Buy low, sell high, win anyway.',
      desc: 'Ignore the board budget and run the club purely on the money you make from player trading.',
      clubFilter: (club) => tierIn(club, 1, 3) && club.level <= 2,
      seasonRange: () => [4, 6],
      blockTags: ['fee', 'profit'],
      core: (c) => [
        'Your only spending money is what you raise from player sales — the starting budget is off-limits.',
        `No single transfer fee above ${c.feeCap()}.`,
        'Sell (or release) every player in the summer after they turn 30.',
      ],
      finalGoal: (c) => (c.club.level > 1
        ? `Reach ${c.topLeagueRef} and qualify for the ${c.continental} with a positive all-time net spend.`
        : `Qualify for the ${c.continental} with a positive all-time net spend.`),
    },
    {
      id: 'fallen-giant', name: 'Fallen Giant', icon: '🏚️',
      tagline: 'Tear it down. Build it back.',
      desc: 'A giant has lost its stars. Gut the squad on day one and rebuild it into a champion.',
      clubFilter: (club) => club.tier >= 4 && club.level === 1,
      seasonRange: () => [3, 6],
      blockTags: ['sell-star'],
      core: (c) => [
        `Before your first competitive match, sell or release your ${c.byD([3, 4, 5, 6])} highest-rated players.`,
        'Each window you may only spend money raised from sales.',
        'Never re-sign a player you sold.',
      ],
      finalGoal: (c) => `Win ${c.topLeagueRef} within ${c.seasons} seasons.`,
    },
    {
      id: 'homegrown', name: 'Homegrown Heroes', icon: '🏠',
      tagline: 'Local lads only.',
      desc: "Every signing must share your club's nationality. Win it all with home-grown talent.",
      clubFilter: (club) => club.level <= 2 && european(club) && club.tier >= 2,
      seasonRange: () => [4, 8],
      blockTags: ['origin', 'quota'],
      core: (c) => [
        `Only sign ${c.club.nationality} players.`,
        `Non-${c.club.nationality} players already at the club may stay, but you can't renew their contracts.`,
      ],
      finalGoal: (c) => `Win ${c.topLeagueRef} with an all-${c.club.nationality} starting XI.`,
    },
    {
      id: 'loan-army', name: 'Loan Army', icon: '🔁',
      tagline: "Borrowed boots, real trophies.",
      desc: 'No transfer fees, ever. Build the squad from loans and free agents.',
      clubFilter: (club) => tierIn(club, 1, 3),
      seasonRange: () => [3, 5],
      blockTags: ['fee', 'loans', 'profit'],
      core: (c) => [
        'No transfer fees — loans and free agents only.',
        'You may sell players, but the money can only be spent on wages.',
        `At least ${c.byD([1, 2, 3, 4])} loanees must start every league match.`,
      ],
      finalGoal: (c) => (c.club.level > 1
        ? `Win promotion to ${c.topLeagueRef} with a loan-built squad.`
        : `Qualify for the ${c.continental} with a squad built on loans and free agents.`),
    },
    {
      id: 'journeyman', name: 'Journeyman', icon: '🧳',
      tagline: 'New country, new club, same hunger.',
      desc: 'Hop between countries every few seasons and collect league titles around the world.',
      clubFilter: (club) => tierIn(club, 1, 3) && club.level <= 2,
      seasonRange: () => [6, 9],
      core: (c) => [
        `Every ${c.moveEvery} seasons, take a job at a club in a different country.`,
        'Your next club must be one that offers you a job or accepts your application.',
        'Never return to a club you have already managed.',
      ],
      finalGoal: (c) => `Win league titles in ${c.byD([2, 3, 3, 4])} different countries.`,
    },
    {
      id: 'galacticos', name: 'Galácticos', icon: '⭐',
      tagline: 'Stars, stars and more stars.',
      desc: 'Spend big, sign the best and settle for nothing less than everything.',
      clubFilter: (club) => club.tier >= 4 && club.level === 1,
      seasonRange: () => [3, 5],
      blockTags: ['ovr', 'fee', 'age'],
      core: (c) => [
        `Sign at least one player rated ${c.byD([84, 85, 86, 87])}+ OVR every summer.`,
        `Break your club's transfer record at least once every ${c.byD([3, 2, 2, 1])} season(s).`,
        `Every first-team player must be ${c.byD([76, 78, 80, 82])}+ OVR — sell anyone below by the end of each summer window.`,
      ],
      finalGoal: (c) => `Win the treble: ${c.topLeague.name}, ${c.cup} and ${c.continental}.`,
    },
    {
      id: 'underdog-europe', name: 'Underdog in Europe', icon: '🦊',
      tagline: 'Nobody gave them a chance.',
      desc: 'Take a mid-sized club and win a European trophy with a modest squad.',
      clubFilter: (club) => tierIn(club, 2, 3) && club.level === 1 && european(club),
      seasonRange: () => [3, 6],
      blockTags: ['ovr'],
      core: (c) => [
        `No signing anyone rated above ${c.ovrCap() + 2} OVR.`,
        `At least ${c.byD([3, 4, 5, 6])} of your season-1 starters must still be at the club when you lift the trophy.`,
      ],
      finalGoal: (c) => (c.d <= 2 ? `Win the Europa League with ${c.club.name}.` : `Win the Champions League with ${c.club.name}.`),
    },
    {
      id: 'one-nation', name: 'One Nation', icon: '🧩',
      tagline: 'One passport, one dream.',
      desc: 'Every signing comes from a single, randomly drawn country.',
      clubFilter: (club) => club.tier >= 2 && club.level === 1,
      seasonRange: () => [4, 7],
      blockTags: ['origin'],
      core: (c) => [
        `Every signing must be ${c.nation.adj}.`,
        `By the final season at least ${c.byD([5, 6, 7, 8])} ${c.nation.adj} players must start every league match.`,
      ],
      finalGoal: (c) => `Win ${c.topLeagueRef} with ${c.byD([6, 7, 8, 9])}+ ${c.nation.adj} starters.`,
    },
    {
      id: 'veterans', name: "Dad's Army", icon: '👴',
      tagline: 'Experience wins titles.',
      desc: 'Sign only thirty-somethings and prove that old legs still have it.',
      clubFilter: (club) => tierIn(club, 1, 4) && club.level <= 2,
      seasonRange: () => [3, 5],
      blockTags: ['age', 'avg-age', 'academy', 'academy-promote'],
      noAcademy: true,
      core: (c) => [
        `Only sign players aged ${c.byD([29, 30, 31, 32])} or older.`,
        'No academy promotions — youth players must be sold or released.',
      ],
      finalGoal: () => 'Win a major trophy with a starting XI averaging 30+ years old.',
    },
    {
      id: 'wonderkid-factory', name: 'Wonderkid Factory', icon: '🏭',
      tagline: 'Develop. Sell. Repeat.',
      desc: 'Sign teenagers, turn them into stars and cash in at their peak.',
      clubFilter: (club) => tierIn(club, 2, 4) && club.level === 1,
      seasonRange: () => [5, 8],
      blockTags: ['age', 'flip'],
      core: (c) => [
        `Only sign players aged ${c.byD([21, 20, 19, 19])} or younger.`,
        `Sell every player in the summer after they turn ${c.byD([26, 25, 24, 23])}.`,
      ],
      finalGoal: (c) => `Sell a player you signed as a teenager for ${c.money(c.byD([60, 80, 100, 120]))} or more, and win a trophy.`,
    },
    {
      // Placeholder: the generator swaps in the club's entry from js/heritage/.
      // Entries take the same fields as an archetype, plus `history`, an
      // optional `seasons` ([min, max] or a function of difficulty) and an
      // optional `seasonGoal(c, season)` that replaces a season's main target.
      id: 'club-heritage', name: 'Club Heritage', icon: '🏛️',
      tagline: "Play it the club's way.",
      desc: "A challenge built on the club's real history and identity.",
      clubFilter: (club) => Boolean(heritage[club.name]),
      perClub: true,
      seasonRange: () => [4, 6],
      core: () => [],
      finalGoal: () => '',
    },
    {
      id: 'chaos', name: 'Pure Chaos', icon: '🎲',
      tagline: 'Let the dice decide.',
      desc: 'No theme, just a pile of random rules and a season full of surprises.',
      clubFilter: () => true,
      seasonRange: () => [3, 6],
      bonusRules: 2,
      eventBoost: 2,
      core: () => [],
      finalGoal: (c) => (c.d >= 3
        ? `Win ${c.topLeagueRef} at least once without getting sacked.`
        : 'Win at least one trophy without getting sacked.'),
    },
  ];

  // Extra rules layered on top of an archetype. Rules sharing a tag never
  // appear together, and archetypes block tags they already cover.
  const rules = [
    { id: 'fee-cap', cat: 'Transfers', tags: ['fee'], text: (c) => `No single transfer fee above ${c.feeCap()}.` },
    { id: 'max-signings', cat: 'Transfers', tags: ['count'], text: (c) => `Maximum ${c.byD([5, 4, 3, 2])} permanent signings per window.` },
    { id: 'age-cap', cat: 'Transfers', tags: ['age'], text: (c) => `Only sign players aged ${c.byD([25, 24, 23, 22])} or younger.` },
    // Also tagged avg-age: a 30+ signing policy can't coexist with a young-XI rule.
    { id: 'age-floor', cat: 'Transfers', tags: ['age', 'avg-age'], minD: 2, text: (c) => `Only sign players aged ${c.byD([27, 28, 29, 30])} or older.` },
    { id: 'ovr-cap', cat: 'Transfers', tags: ['ovr'], text: (c) => `No signing anyone rated above ${c.ovrCap()} OVR.` },
    { id: 'nation-only', cat: 'Transfers', tags: ['origin'], minD: 2, text: (c) => `Every signing must be ${c.nation.adj}.` },
    { id: 'region-only', cat: 'Transfers', tags: ['origin'], text: (c) => `Signings must come from ${c.rng.pick(c.data.regions)}.` },
    { id: 'no-loans', cat: 'Transfers', tags: ['loans'], text: () => 'No loan signings — permanent deals only.' },
    { id: 'one-in-one-out', cat: 'Transfers', tags: ['count'], text: () => 'One in, one out: sell or release a player before every signing.' },
    { id: 'deadline-day', cat: 'Transfers', tags: ['deadline'], minD: 2, text: () => 'Incoming transfers only on the final day of each window.' },
    { id: 'no-league-rivals', cat: 'Transfers', tags: ['rivals'], text: () => 'No signing players from clubs in your own league.' },
    { id: 'scout-only', cat: 'Transfers', tags: ['scouting'], text: () => 'Only sign players your scouts have found — no using the player search.' },
    { id: 'no-flip', cat: 'Transfers', tags: ['flip'], text: () => 'No selling a player in the same season you signed them.' },
    { id: 'wage-cap', cat: 'Finance', tags: ['wage'], text: (c) => `No player may earn more than ${c.wageCap()}/week.` },
    { id: 'profit-window', cat: 'Finance', tags: ['profit'], text: () => 'Finish every transfer window with zero or positive net spend.' },
    { id: 'sell-star', cat: 'Finance', tags: ['sell-star'], minD: 2, text: () => 'Sell your highest-rated player every summer.' },
    { id: 'squad-size', cat: 'Squad', tags: ['squad-size'], text: (c) => `Senior squad capped at ${c.byD([26, 24, 23, 21])} players.` },
    { id: 'academy-matchday', cat: 'Squad', tags: ['academy'], text: (c) => `At least ${c.byD([1, 2, 3, 4])} academy graduate(s) in every matchday squad.` },
    { id: 'youth-promote', cat: 'Squad', tags: ['academy-promote'], text: (c) => `Promote at least ${c.byD([1, 2, 2, 3])} youth academy player(s) to the first team every season.` },
    { id: 'home-quota', cat: 'Squad', tags: ['quota'], text: (c) => `At least ${c.byD([2, 3, 4, 5])} ${c.club.nationality} players in every starting XI.` },
    { id: 'rotation', cat: 'Squad', tags: ['rotation'], text: (c) => `No outfield player may start more than ${c.byD([85, 80, 75, 70])}% of league matches.` },
    { id: 'young-xi', cat: 'Squad', tags: ['avg-age'], minD: 2, text: (c) => `Your starting XI must average ${c.byD([27, 26, 25, 24])} years old or younger.` },
    { id: 'captain-loyalty', cat: 'Squad', tags: ['captain'], text: () => 'Your captain can never be sold, loaned or dropped while fit.' },
    { id: 'no-retraining', cat: 'Squad', tags: ['training'], text: () => 'No retraining players into new positions.' },
    { id: 'formation-lock', cat: 'Tactics', tags: ['formation'], text: (c) => `Play ${c.formation} in every match — no formation changes.` },
    { id: 'late-subs', cat: 'Tactics', tags: ['subs'], text: (c) => `No substitutions before the ${c.byD([55, 60, 65, 70])}th minute (injuries excepted).` },
    { id: 'no-sim', cat: 'Tactics', tags: ['sim'], text: (c) => (c.d >= 3 ? 'Play every competitive match — no simming.' : 'Play every league match — cup games may be simmed.') },
  ];

  // Optional extra targets sprinkled into seasons. Each is used at most once.
  const sideObjectives = [
    { id: 'cup-semi', when: (c) => c.club.level <= 2, text: (c) => `Reach the ${c.cup} semi-finals.` },
    { id: 'cup-win', minD: 3, when: (c) => c.club.level === 1 && c.club.tier >= 3, text: (c) => `Win the ${c.cup}.` },
    { id: 'academy-apps', when: (c) => !c.archetype.noAcademy, text: (c) => `Give ${c.byD([2, 3, 3, 4])} academy graduates 10+ appearances.` },
    { id: 'develop', text: (c) => `Develop a player to ${c.byD([74, 77, 80, 83]) + (c.club.tier - 3) * 2}+ OVR.` },
    { id: 'scorer', text: (c) => `Have a player score ${c.byD([15, 18, 22, 25])}+ league goals.` },
    { id: 'clean-sheets', text: (c) => `Keep ${c.byD([10, 12, 14, 16])}+ league clean sheets.` },
    { id: 'net-spend', when: (c) => !(c.archetype.blockTags || []).includes('profit'), text: () => 'Finish the season with a positive net transfer spend.' },
    { id: 'home-unbeaten', minD: 3, text: () => 'Go unbeaten at home in the league.' },
    { id: 'fast-start', text: (c) => `Stay unbeaten in your first ${c.byD([4, 6, 8, 10])} league matches.` },
    { id: 'continental-ko', when: (c) => c.club.level === 1 && c.club.tier >= 3, text: (c) => `Reach the knockout stage of the ${c.continental}.` },
  ];

  const events = [
    { id: 'budget-cut', text: () => 'Board crisis: your transfer budget is halved this summer.' },
    { id: 'unsettled-star', text: () => 'Unsettled star: sell your highest-rated player before the summer window closes.' },
    { id: 'january-freeze', blocks: ['jan-buy'], text: () => 'January freeze: no incoming transfers in the winter window.' },
    { id: 'youth-push', when: (c) => !c.archetype.noAcademy, text: (c) => `Youth push: hand debuts to ${c.byD([1, 2, 2, 3])} academy player(s).` },
    { id: 'fire-sale', text: (c) => `Fire sale: sell ${c.byD([2, 2, 3, 4])} first-team players this summer.` },
    { id: 'tactical-reset', blocks: ['formation'], text: (c) => `Tactical reset: play ${c.rng.pick(c.data.formations)} for the whole season (overrides any formation rule).` },
    { id: 'armband', blocks: ['captain'], text: () => 'Armband shake-up: your youngest regular starter is captain for the season.' },
    { id: 'wildcard', text: () => 'Wildcard: you may break one rule, once, this season.' },
    { id: 'marquee', text: () => 'Marquee moment: one signing this season may ignore your fee and rating limits.' },
    { id: 'old-legend', text: () => 'Old legend: sign a free agent aged 32+ and give them 10+ appearances.' },
    { id: 'cup-fever', text: (c) => `Cup fever: the board demands at least a ${c.cup} semi-final.` },
    { id: 'fast-start-or-sell', text: () => 'Fast start: stay unbeaten in your first 6 league matches or sell your most expensive player.' },
    { id: 'striker-benched', blocks: ['top-scorer'], minSeason: 2, text: () => "Striker slump: last season's top scorer can't start the first 5 league matches." },
    { id: 'keeper-swap', blocks: ['keeper'], text: () => 'Goalkeeper shake-up: your current No.1 must lose the starting spot for the season.' },
    { id: 'rival-raid', text: () => 'Rival raid: sign at least one player from a club in your own league.' },
  ];

  // Mid-season dramas: a moment in the season (January, a bad run, the halfway
  // point) and what you must do about it. A drama is left out when one of its
  // tags is taken by the challenge type or an extra rule (c.takenTags), or by
  // that season's event ("blocks" above: no January buys in a January freeze).
  const blocked = (c, tags) => tags.some((t) => (c.takenTags ? c.takenTags.has(t) : (c.archetype.blockTags || []).includes(t)));
  const midSeason = [
    { id: 'too-poor', tags: ['sell-star', 'jan-buy'], text: (c) => `Mid-season (January): Your highest-rated player says ${c.club.tier >= 4 ? 'the project has stalled and the club lacks ambition' : 'the club is too small and too poor for him'}, and hands in a transfer request. Sell him in the January window and sign a replacement who plays his position in the same window.` },
    { id: 'agent-wages', text: () => "Mid-season (January): Your top scorer's agent demands a pay rise. Renew his contract on higher wages before the window shuts, or sell him." },
    { id: 'rival-bid', tags: ['sell-star'], text: (c) => `Mid-season (January): A rival is circling. Accept the first bid of ${c.feeCap()} or more for your best player aged 23 or under that arrives before the window shuts. If none comes, he stays.` },
    { id: 'homesick', tags: ['origin', 'jan-buy'], text: (c) => `Mid-season (January): Your most expensive signing is homesick. Sell or loan him out in January and replace him with a ${c.club.nationality || 'home-grown'} player.` },
    { id: 'keeper-howler', tags: ['keeper'], text: () => 'Mid-season (after your first league defeat by 3+ goals): Your No.1 keeper is dropped. The back-up starts every league match for the rest of the season.' },
    { id: 'captain-revolt', tags: ['captain'], text: () => 'Mid-season (after 3 league defeats in a row, if it happens): The dressing room turns on your captain. Take the armband off him and sell or loan him out in the next window.' },
    { id: 'board-ultimatum', text: (c) => `Mid-season (halfway point): Board ultimatum. If you're in the bottom half of the table, win ${c.byD([3, 4, 4, 5])} of your next 6 league matches, or ${c.byD(['you get no transfer budget next summer', 'you get no transfer budget next summer', 'the challenge is failed', 'the challenge is failed'])}.` },
    { id: 'owner-gift', tags: ['fee', 'profit', 'jan-buy'], text: (c) => `Mid-season (January): The owner backs you with one marquee signing of up to ${c.feeCap()}. He starts every league match he's fit for until May.` },
    { id: 'wonderkid', tags: ['age', 'jan-buy'], text: (c) => `Mid-season (January): Your scouts find a wonderkid. Sign a player aged 18 or under in January and give him ${c.byD([3, 5, 6, 8])}+ league appearances by May.` },
    { id: 'ffp-warning', tags: ['profit'], text: (c) => `Mid-season (January): Financial fair play warning. Raise at least ${c.feeCap()} from sales in January and make no permanent signings in the window.` },
    { id: 'bust-up', tags: ['sell-star'], text: () => 'Mid-season (training-ground bust-up): Your two highest-rated players have fallen out. One of them must go: sell him in January.' },
    { id: 'winter-tournament', tags: ['origin'], text: () => 'Mid-season (winter tournament): The Africa Cup of Nations and the Asian Cup take their players. No African or Asian player may start a league match in January.' },
    { id: 'goal-drought', tags: ['jan-buy'], text: () => 'Mid-season (goal drought): Your strikers have gone cold. Sign a striker in January and start him in every league match until the end of February.' },
    { id: 'fan-protest', when: (c) => !c.archetype.noAcademy, tags: ['academy'], text: (c) => `Mid-season (fan protest): Supporters chant for the academy. Promote ${c.byD([1, 1, 2, 2])} academy player(s) in January and give each 5+ league starts by May.` },
    { id: 'veteran-leader', tags: ['age', 'jan-buy', 'captain'], text: () => 'Mid-season (January): The young dressing room needs a leader. Sign a player aged 30 or over in January and make him captain until May.' },
    { id: 'found-out', tags: ['formation'], text: () => "Mid-season (halfway point): Opponents have worked out your tactics. Switch to a formation you haven't used this season and keep it until May (overrides any formation rule)." },
    { id: 'deadline-day', tags: ['jan-buy'], text: (c) => `Mid-season (January deadline day): Panic buy! Sim to the last day of the January window and make ${c.byD([1, 1, 2, 2])} signing(s) that day, and none earlier in the window.` },
    { id: 'injury-crisis', text: () => 'Mid-season (injury crisis): Treat your two most-used defenders as injured until March. Neither may play, so sign or promote cover in January.' },
    { id: 'recall', tags: ['loans', 'jan-buy'], text: () => "Mid-season (January): Recall a player you've loaned out (or sign one on loan if you have none) and give him 5+ league starts by May." },
    { id: 'wage-freeze', tags: ['wage'], text: () => 'Mid-season (takeover collapse): The owner pulls out and wages are frozen. Nobody you sign in January may earn more than your lowest-paid starter, and no contract renewals until the summer.' },
    { id: 'cup-kids', tags: ['age'], text: (c) => `Mid-season (cup run): The board wants the kids to play the ${c.cup}. Start ${c.byD([3, 4, 5, 6])}+ players aged 21 or under in every ${c.cup} match until you go out.` },
    { id: 'form-slump', tags: ['top-scorer'], minSeason: 2, text: (c) => `Mid-season (form slump): Last season's top scorer has gone cold. Bench him for the next ${c.byD([3, 4, 5, 6])} league matches.` },
    { id: 'loyalty-test', tags: ['sell-star'], text: () => 'Mid-season (January): Your longest-serving player gets a big offer. If any club bids for him in January, you must accept.' },
  ].map((ev) => Object.assign({}, ev, { when: (c) => !blocked(c, ev.tags || []) && (!ev.when || ev.when(c)) }));

  FC26.content = { archetypes, rules, sideObjectives, events, midSeason };
})(typeof window !== 'undefined' ? window : globalThis);
