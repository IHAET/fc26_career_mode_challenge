/*
 * Club Heritage challenges: outside Europe (MLS, ROSHN Saudi League).
 * Keyed by the club name used in data.js. Field reference: see the
 * 'club-heritage' archetype in rules.js.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  Object.assign((FC26.heritage = FC26.heritage || {}), {
    // ---------- MLS ----------
    'LA Galaxy': {
      name: 'Designated Players', icon: '🌌',
      tagline: 'Beckham started it.',
      history: "David Beckham's move to the Galaxy in 2007 led MLS to create the Designated Player rule, letting clubs pay a few stars above the salary cap. The Galaxy have won a record six MLS Cups, the latest in 2024.",
      seasons: [3, 6],
      blockTags: ['wage'],
      core: (c) => [
        `Only three players may earn more than ${c.wageCap()}/week: your Designated Players.`,
        'Every summer, sign one Designated Player aged 29 or older.',
      ],
      finalGoal: () => 'Win a seventh MLS Cup.',
    },
    'Inter Miami CF': {
      name: 'Barça Reunion', icon: '🦩',
      tagline: 'Messi and friends.',
      history: "Co-owned by David Beckham, Inter Miami signed Lionel Messi in 2023 and reunited him with former Barcelona teammates Sergio Busquets, Jordi Alba and Luis Suárez. They won the Leagues Cup in 2023 and the Supporters' Shield in 2024.",
      seasons: [3, 5],
      blockTags: ['origin'],
      core: (c) => [
        'Every signing aged 30 or over must have played in LaLiga.',
        `At least ${c.byD([2, 3, 3, 4])} players aged 33+ in every starting XI.`,
      ],
      finalGoal: () => 'Win the MLS Cup and the CONCACAF Champions Cup.',
    },
    'Toronto FC': {
      name: 'Treble North', icon: '🍁',
      tagline: 'The first MLS treble.',
      history: "In 2017 Toronto FC won the Supporters' Shield, the Canadian Championship and the MLS Cup, the first domestic treble in MLS history.",
      seasons: [3, 6],
      blockTags: ['quota', 'origin'],
      core: (c) => [
        `At least ${c.byD([2, 3, 4, 5])} Canadian players in every starting XI.`,
        'Sign at least one Canadian player every season.',
      ],
      finalGoal: () => "Win the MLS Cup and the Supporters' Shield in the same season with a Canadian core.",
    },
    'New York Red Bulls': {
      name: 'Finally', icon: '🗽',
      tagline: 'An MLS Cup at last?',
      history: "Founded as the NY/NJ MetroStars for MLS's first season in 1996, the Red Bulls have won three Supporters' Shields but never the MLS Cup, losing the 2024 final to LA Galaxy.",
      seasons: [3, 6],
      blockTags: ['age', 'origin'],
      core: (c) => [
        `Only sign players aged ${c.byD([25, 24, 23, 23])} or younger.`,
        'Sign at least one player from RB Leipzig or Red Bull Salzburg every season.',
      ],
      finalGoal: () => 'Win the MLS Cup for the first time in club history.',
    },
    'Seattle Sounders FC': {
      name: 'Kings of CONCACAF', icon: '☕',
      tagline: 'The first MLS club to rule CONCACAF.',
      history: 'In 2022 Seattle became the first MLS club to win the CONCACAF Champions League in its modern format, beating Pumas in the final. They have also won the MLS Cup twice, in 2016 and 2019.',
      seasons: [3, 6],
      blockTags: ['quota', 'sim'],
      core: (c) => [
        `At least ${c.byD([2, 3, 4, 5])} American players in every starting XI.`,
        'Play every CONCACAF Champions Cup match yourself: no simming.',
      ],
      finalGoal: () => 'Win the CONCACAF Champions Cup and the MLS Cup.',
    },
    'St. Louis CITY SC': {
      name: 'Expansion Shock', icon: '🌁',
      tagline: 'Top of the West in year one.',
      history: 'St. Louis CITY joined MLS in 2023 and finished top of the Western Conference in their first season, one of the best expansion debuts in league history.',
      seasons: [3, 5],
      blockTags: ['wage'],
      seasonGoal: (c, s) => (s === 1 ? 'Win your conference in your first season.' : null),
      core: (c) => [
        `No player may earn more than ${c.wageCap()}/week.`,
      ],
      finalGoal: () => 'Win your conference in season 1, then win the MLS Cup.',
    },

    // ---------- ROSHN Saudi League ----------
    'Al Hilal': {
      name: '34 in a Row', icon: '🌙',
      tagline: 'A world-record winning streak.',
      history: "Al Hilal won 34 consecutive matches in 2023–24, a world record, and have won Asia's top club competition a record four times.",
      seasons: [3, 5],
      blockTags: ['sim'],
      core: (c) => [
        `Lose no more than ${c.byD([4, 3, 2, 1])} league match(es) per season.`,
        'Play every league match yourself: no simming.',
      ],
      finalGoal: () => 'Win 34+ matches in a row in all competitions.',
    },
    'Al Nassr': {
      name: 'The Ronaldo Project', icon: '🐐',
      tagline: 'Build around a legend.',
      history: "Cristiano Ronaldo joined Al Nassr in January 2023, kicking off the Saudi league's wave of star signings.",
      seasons: [3, 5],
      blockTags: ['origin'],
      core: () => [
        'Your oldest outfield player must start every league match when fit.',
        'Every summer, sign at least one 30+ star from a big-five European league.',
      ],
      finalGoal: () => 'Win the ROSHN Saudi League and the AFC Champions League Elite.',
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
