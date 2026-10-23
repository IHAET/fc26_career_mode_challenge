/*
 * Club Heritage challenges: Germany (Bundesliga and 2. Bundesliga).
 * Keyed by the club name used in data.js. Field reference: see the
 * 'club-heritage' archetype in rules.js.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  Object.assign((FC26.heritage = FC26.heritage || {}), {
    // ---------- Bundesliga ----------
    'FC Bayern München': {
      name: 'Mia san mia', icon: '🏰',
      tagline: 'Rekordmeister.',
      history: 'Bayern have won a record 34 German titles, including 11 in a row from 2013 to 2023, often by signing the best players from their Bundesliga rivals: Götze, Lewandowski, Hummels and Neuer among them.',
      seasons: (d) => [[3, 4, 5, 5][d - 1], [3, 4, 5, 5][d - 1] + 2],
      blockTags: ['rivals'],
      seasonGoal: (c) => `Win ${c.topLeagueRef}.`,
      core: () => [
        'Every summer, sign the highest-rated player you can from a Bundesliga rival.',
        'Win the Bundesliga every season. Second place counts as a broken rule.',
      ],
      finalGoal: (c) => `Win ${c.byD([3, 4, 5, 5])} Bundesliga titles in a row and the Champions League.`,
    },
    'Borussia Dortmund': {
      name: 'Develop & Sell', icon: '🐝',
      tagline: 'Echte Liebe.',
      history: "Dortmund are Europe's finishing school, developing young stars like Sancho, Haaland and Bellingham and selling them for huge fees. They won the Champions League in 1997.",
      seasons: [5, 7],
      blockTags: ['age', 'sell-star'],
      core: (c) => [
        `Only sign players aged ${c.byD([21, 20, 20, 19])} or younger.`,
        `Every summer, sell your most valuable player aged ${c.byD([23, 22, 22, 21])} or over.`,
      ],
      finalGoal: (c) => `Win the Champions League and sell a player for ${c.money(c.byD([80, 100, 110, 120]))}+.`,
    },
    'Bayer 04 Leverkusen': {
      name: 'Neverlosen', icon: '🧪',
      tagline: 'From Neverkusen to Neverlosen.',
      history: "Once mocked as 'Neverkusen' for finishing second so often, Leverkusen went the entire 2023–24 Bundesliga season unbeaten under Xabi Alonso and won the double.",
      seasons: [2, 4],
      blockTags: ['formation'],
      core: () => [
        'Play a back three (3-4-2-1, 3-4-3, 3-5-2 or 3-1-4-2) in every match.',
      ],
      finalGoal: (c) => (c.d >= 3
        ? 'Go a whole Bundesliga season unbeaten and win the DFB-Pokal and the Champions League.'
        : 'Go a whole Bundesliga season unbeaten and win the DFB-Pokal.'),
    },
    'Eintracht Frankfurt': {
      name: 'Europapokal Nights', icon: '🦅',
      tagline: 'Frankfurt goes on tour.',
      history: "Around 30,000 Frankfurt fans took over Barcelona's Camp Nou on the way to winning the 2022 Europa League. The club keeps selling star strikers, from Luka Jović to Randal Kolo Muani and Omar Marmoush, for big fees.",
      seasons: [4, 6],
      blockTags: ['sim'],
      core: () => [
        "Every summer, sell last season's top league scorer.",
        'Play every European match yourself: no simming.',
      ],
      finalGoal: () => 'Win the Bundesliga for the first time since 1959.',
    },
    '1. FC Union Berlin': {
      name: 'Eisern Union', icon: '🔨',
      tagline: 'Built by its fans.',
      history: "Union fans gave blood to raise money for the club in 2004 ('Bleed for Union'), and volunteers rebuilt the Stadion An der Alten Försterei in 2008–09. The club then rose from the third tier to the Champions League in 2023.",
      seasons: [3, 6],
      blockTags: ['wage', 'sim'],
      core: (c) => [
        `No player may earn more than ${c.wageCap()}/week.`,
        'Play every home match yourself: no simming at the Alte Försterei.',
      ],
      finalGoal: () => 'Qualify for the Champions League again and reach the knockout stage.',
    },
    'FC St. Pauli': {
      name: 'Kult', icon: '☠️',
      tagline: 'Not like the others.',
      history: "St. Pauli, from Hamburg's harbour district, are famous for their skull-and-crossbones flag and politically active fans. In 2024 they began selling shares to supporters through a fan-owned cooperative.",
      seasons: [3, 6],
      core: () => [
        'No player may earn more than three times your lowest-paid first-team player.',
        'Never sign a player from Hamburger SV.',
      ],
      finalGoal: () => 'Finish above Hamburger SV every season and qualify for Europe.',
    },
    '1. FC Heidenheim': {
      name: "Schmidt's Heidenheim", icon: '🪨',
      tagline: 'One coach since 2007.',
      history: 'Frank Schmidt has coached Heidenheim since 2007, the longest-serving coach in German professional football. He took them from the fifth tier to the Bundesliga in 2023 and into the Conference League in 2024–25.',
      seasons: [4, 8],
      blockTags: ['count'],
      core: (c) => [
        'Stay at Heidenheim for the whole save: no job switching.',
        `No more than ${c.byD([5, 4, 3, 2])} signings per summer window.`,
      ],
      finalGoal: () => 'Qualify for the Champions League.',
    },
    'SC Freiburg': {
      name: 'The Long Game', icon: '🌲',
      tagline: 'Patience is a tactic.',
      history: 'Freiburg are known for patience: Volker Finke coached them for 16 years and Christian Streich for over 12. They reached their first DFB-Pokal final in 2022 but have never won a major trophy.',
      seasons: [4, 8],
      blockTags: ['academy'],
      core: (c) => [
        'Stay at Freiburg for the whole save: no job switching.',
        `At least ${c.byD([2, 3, 4, 5])} academy graduates in every matchday squad.`,
      ],
      finalGoal: () => "Win Freiburg's first major trophy, then qualify for the Champions League.",
    },
    'VfB Stuttgart': {
      name: 'Junge Wilde', icon: '🐎',
      tagline: 'The young wild ones.',
      history: "Stuttgart's 'Junge Wilde' (young wild ones) generation won the Bundesliga in 2007. In 2023 they survived a relegation play-off, then finished second in 2023–24 and won the 2025 DFB-Pokal.",
      seasons: [4, 6],
      blockTags: ['age', 'avg-age'],
      core: (c) => [
        `Only sign players aged ${c.byD([23, 22, 21, 21])} or younger.`,
        `Your starting XI must average ${c.byD([26, 25, 25, 24])} or younger.`,
      ],
      finalGoal: () => 'Win the Bundesliga with a starting XI averaging under 25.',
    },
    'Hamburger SV': {
      name: 'The Clock', icon: '⏱️',
      tagline: 'Never relegated, until 2018.',
      history: 'Hamburg were the only club to have played in every Bundesliga season, with a stadium clock counting their time in the top flight, until relegation in 2018. They won the European Cup in 1983 and returned to the Bundesliga in 2025.',
      seasons: [4, 7],
      core: () => [
        'Never get relegated: it ends the challenge.',
        'Never sign a player from St. Pauli or Werder Bremen.',
      ],
      finalGoal: () => 'Win the Bundesliga for the first time since 1983.',
    },
    'RB Leipzig': {
      name: 'Red Bull Pipeline', icon: '🥤',
      tagline: 'Young, fast, for sale.',
      history: 'Founded in 2009 with Red Bull backing, Leipzig rose from the fifth tier to the Bundesliga by 2016, recruiting young players, many of them via Red Bull Salzburg. They won the DFB-Pokal in 2022 and 2023.',
      seasons: [4, 6],
      blockTags: ['age', 'origin'],
      core: (c) => [
        `Only sign players aged ${c.byD([23, 22, 21, 21])} or younger.`,
        'Sign at least one player from Red Bull Salzburg every season.',
      ],
      finalGoal: () => 'Win the Bundesliga for the first time.',
    },

    // ---------- 2. Bundesliga ----------
    'FC Schalke 04': {
      name: 'Meister der Herzen', icon: '⛏️',
      tagline: 'Champions of hearts.',
      history: "Schalke, the miners' club from Gelsenkirchen, won the 1997 UEFA Cup with their 'Eurofighters'. In 2001 they were Bundesliga champions for four minutes until Bayern's late equaliser elsewhere, and their last German title came in 1958.",
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['quota', 'academy-promote'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 6])} German players in every starting XI.`,
        'Promote at least one Knappenschmiede academy player every season.',
      ],
      finalGoal: () => 'Return to the Bundesliga and win it for the first time.',
    },
    '1. FC Kaiserslautern': {
      name: 'The Rehhagel Miracle', icon: '😈',
      tagline: 'Promoted and champions.',
      history: "Otto Rehhagel's Kaiserslautern won the Bundesliga in 1997–98 straight after promotion, the only newly promoted side ever to do it. Fritz Walter, captain of West Germany's 1954 World Cup winners, is their greatest legend.",
      seasons: [2, 4],
      forcePromotion: true,
      blockTags: ['quota'],
      seasonGoal: (c, s) => (s === 2 ? 'Win the Bundesliga as a newly promoted side, like 1998.' : null),
      core: (c) => [
        `At least ${c.byD([4, 5, 5, 6])} German players in every starting XI.`,
      ],
      finalGoal: () => 'Win promotion, then the Bundesliga at the first attempt.',
    },
    '1. FC Nürnberg': {
      name: 'Der Club', icon: '🏯',
      tagline: "Don't do a Nürnberg.",
      history: 'Nürnberg, nine-time German champions, are the only club ever relegated from the Bundesliga as reigning champions, in 1969.',
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['academy-promote'],
      core: () => [
        'Promote at least one academy player every season.',
        'Never sell a player to Bayern Munich.',
      ],
      finalGoal: () => 'Return to the Bundesliga, win it, and finish in the top half the season after.',
    },
    '1. FC Magdeburg': {
      name: 'Europapokal 1974', icon: '🎖️',
      tagline: "East Germany's European champions.",
      history: "Magdeburg beat holders AC Milan in the 1974 Cup Winners' Cup final, the only European trophy ever won by an East German club.",
      seasons: [4, 7],
      forcePromotion: true,
      blockTags: ['quota', 'fee'],
      core: (c) => [
        `At least ${c.byD([4, 5, 6, 7])} German players in every starting XI.`,
        `No single transfer fee above ${c.feeCap()}.`,
      ],
      finalGoal: () => 'Reach the Bundesliga and win a European trophy.',
    },
    'Arminia Bielefeld': {
      name: 'Cup Run', icon: '🏃',
      tagline: 'Third tier to the cup final.',
      history: 'In 2025 third-tier Arminia Bielefeld knocked out four Bundesliga clubs, including holders Leverkusen, to reach the DFB-Pokal final, and won promotion to the 2. Bundesliga the same season.',
      seasons: [3, 6],
      blockTags: ['fee'],
      core: (c) => [
        'Play your strongest XI in every DFB-Pokal match.',
        `No single transfer fee above ${c.feeCap()}.`,
      ],
      finalGoal: () => 'Win the DFB-Pokal, then reach the Bundesliga.',
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
