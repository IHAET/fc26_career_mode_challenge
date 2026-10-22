/*
 * Club Heritage challenges: Spain (LALIGA EA SPORTS and LALIGA HYPERMOTION).
 * Keyed by the club name used in data.js. Field reference: see the
 * 'club-heritage' archetype in rules.js.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  Object.assign((FC26.heritage = FC26.heritage || {}), {
    // ---------- LALIGA EA SPORTS ----------
    'Athletic Club': {
      name: 'La Cantera', icon: '🦁',
      tagline: 'Con cantera y afición, no hace falta importación.',
      history: 'For over a century Athletic Club have only fielded players born or raised in the Basque Country, and they have never been relegated from LaLiga. Their eighth and last league title came in 1983–84, and winning the 2024 Copa del Rey ended a 40-year wait for that trophy.',
      seasons: [5, 8],
      blockTags: ['origin', 'quota', 'rivals', 'academy-promote'],
      core: (c) => [
        'Only sign players born in the Basque Country or Navarre, or who came through a Basque academy (check the real player if unsure).',
        `Promote at least ${c.byD([1, 2, 2, 3])} Lezama academy player(s) to the first team every season.`,
        'Never get relegated.',
      ],
      finalGoal: (c) => (c.d <= 2
        ? 'Win LaLiga for the first time since 1984 with an all-Basque squad.'
        : 'Win LaLiga and the Champions League with an all-Basque squad.'),
    },
    'Real Sociedad': {
      name: 'Txuri-urdin Roots', icon: '🔵',
      tagline: 'Back to the Basque way.',
      history: 'Real Sociedad fielded only Basque players until they signed John Aldridge in 1989. With that all-Basque team they won back-to-back LaLiga titles in 1980–81 and 1981–82, and the Zubieta academy still produces much of the first team.',
      seasons: [5, 8],
      blockTags: ['origin', 'quota', 'rivals', 'academy'],
      core: (c) => [
        'Only sign players born in the Basque Country or Navarre, or who came through a Basque academy.',
        `At least ${c.byD([3, 4, 5, 6])} Zubieta academy graduates in every starting XI.`,
      ],
      finalGoal: () => 'Win LaLiga with an all-Basque starting XI, as in 1981 and 1982.',
    },
    'FC Barcelona': {
      name: 'La Masia Dream Team', icon: '🎓',
      tagline: 'Més que un club.',
      history: "Johan Cruyff brought Total Football and the 4-3-3 to Barcelona, and La Masia produced Xavi, Iniesta and Messi. Pep Guardiola's 2009 side won all six trophies it competed for, and Barça won the treble again in 2015.",
      seasons: [4, 7],
      blockTags: ['formation', 'academy', 'age'],
      core: (c) => [
        'Play 4-3-3 in every match.',
        `At least ${c.byD([3, 4, 5, 6])} La Masia graduates must start every league match.`,
        `Only sign players aged ${c.byD([25, 24, 23, 23])} or younger: no ready-made superstars.`,
      ],
      finalGoal: (c) => `Win the treble (LaLiga, Copa del Rey, Champions League) with ${c.byD([4, 5, 6, 7])}+ La Masia graduates in the XI.`,
    },
    'Real Madrid': {
      name: 'Kings of Europe', icon: '👑',
      tagline: 'Fifteen European Cups and counting.',
      history: "Real Madrid have won the European Cup a record 15 times, including five in a row from 1956 to 1960 and three in a row from 2016 to 2018. Florentino Pérez's Galácticos era brought in a superstar almost every summer: Figo, Zidane, Ronaldo, Beckham.",
      seasons: [4, 6],
      blockTags: ['ovr', 'fee'],
      core: (c) => [
        `Sign one ${c.byD([86, 87, 88, 89])}+ OVR Galáctico every summer.`,
        'If you finish a season without a trophy, sell your three highest-paid players.',
      ],
      finalGoal: (c) => `Win the Champions League ${c.byD([2, 3, 3, 3])} seasons in a row.`,
    },
    'Atlético de Madrid': {
      name: 'Cholismo', icon: '🛡️',
      tagline: 'Partido a partido.',
      history: 'Under Diego Simeone, Atlético broke the Madrid–Barcelona duopoly to win LaLiga in 2014 and 2021 with ferocious defending. The European Cup still eludes them: they lost finals in 1974, 2014 and 2016.',
      seasons: [3, 6],
      blockTags: ['formation'],
      core: () => [
        'Play 4-4-2 (Flat) or 4-4-2 (Holding) in every match.',
        'Concede the fewest goals in the league every season.',
      ],
      finalGoal: () => 'Win the Champions League, the one trophy Atlético have never won.',
    },
    'Sevilla': {
      name: "Monchi's Method", icon: '💹',
      tagline: 'Buy low, sell high, win the Europa League.',
      history: 'Sevilla have won the UEFA Cup and Europa League a record seven times. Sporting director Monchi made his name finding cheap talent such as Dani Alves and Ivan Rakitić and selling them for huge profits.',
      seasons: [4, 6],
      blockTags: ['profit', 'sell-star'],
      core: () => [
        'Finish every season with a positive net transfer spend.',
        'Sell your highest-rated player every summer.',
      ],
      finalGoal: (c) => (c.byD([1, 2, 2, 3]) === 1 ? 'Win the Europa League.' : `Win the Europa League ${c.byD([1, 2, 2, 3])} times.`),
    },
    'Villarreal': {
      name: 'Yellow Submarine', icon: '🟡',
      tagline: 'A town of 50,000, a club for Europe.',
      history: 'Villarreal, from a town of around 50,000 people, reached the Champions League semi-finals in 2006 and 2022 and won the Europa League in 2021.',
      seasons: [4, 6],
      blockTags: ['fee', 'academy-promote'],
      core: (c) => [
        `No single transfer fee above ${c.feeCap()}.`,
        `Promote at least ${c.byD([1, 2, 2, 3])} academy player(s) every season.`,
      ],
      finalGoal: (c) => (c.d <= 2 ? 'Reach the Champions League final.' : 'Win the Champions League.'),
    },
    'Real Betis': {
      name: 'Manque Pierda', icon: '💚',
      tagline: '¡Viva el Betis manque pierda!',
      history: "Betis fans' famous motto means 'Long live Betis, even if they lose'. The club's only LaLiga title came in 1934–35, and they won the Copa del Rey in 2022.",
      seasons: [4, 7],
      blockTags: ['rivals'],
      core: (c) => [
        `Score ${c.byD([50, 55, 60, 65])}+ league goals every season.`,
        'Never sign a player from Sevilla.',
      ],
      finalGoal: () => 'Win LaLiga for the first time since 1935.',
    },
    'Real Oviedo': {
      name: "Cazorla's Homecoming", icon: '🏡',
      tagline: 'Back in LaLiga after 24 years.',
      history: 'Financial collapse sent Real Oviedo down to the fourth tier in 2003, and fans around the world bought shares to save the club in 2012. Academy graduate Santi Cazorla came home in 2023 on a minimum salary, and in 2025 Oviedo returned to LaLiga after 24 years away.',
      seasons: [3, 6],
      blockTags: ['wage', 'captain'],
      core: (c) => [
        'Your captain must be your oldest player, aged 34+. Sign one if you have to.',
        `No player may earn more than ${c.wageCap()}/week.`,
      ],
      finalGoal: () => 'Stay in LaLiga every season and qualify for Europe.',
    },
    'Deportivo Alavés': {
      name: 'Golden Goal', icon: '🥅',
      tagline: 'Debutants in a European final.',
      history: 'In their first ever European campaign, Alavés reached the 2001 UEFA Cup final and lost 5–4 to Liverpool to a golden goal, one of the great European finals.',
      seasons: [4, 6],
      blockTags: ['ovr', 'sim'],
      core: (c) => [
        `No signing anyone rated above ${c.ovrCap()} OVR.`,
        'Play every European match yourself: no simming.',
      ],
      finalGoal: () => 'Win a European trophy.',
    },
    'Rayo Vallecano': {
      name: 'Barrio Spirit', icon: '🌩️',
      tagline: 'The club of Vallecas.',
      history: 'Rayo Vallecano are the club of Vallecas, a working-class district of Madrid. In 2014 their players and fans paid the rent of an 85-year-old local woman who had been evicted from her home.',
      seasons: [3, 6],
      blockTags: ['wage'],
      core: (c) => [
        `No player may earn more than ${c.wageCap()}/week.`,
        'Never sign a player from Real Madrid or Atlético de Madrid.',
      ],
      finalGoal: () => 'Qualify for Europe and finish above both Real Madrid and Atlético in the same season.',
    },

    // ---------- LALIGA HYPERMOTION ----------
    'Deportivo de La Coruña': {
      name: 'Súper Depor', icon: '🌬️',
      tagline: 'Riazor will rise again.',
      history: "Super Depor won LaLiga in 2000, and in 2004 overturned a 4–1 first-leg defeat to beat Milan 4–0 in the Champions League quarter-finals. Debts later dragged them down to the third tier before they returned to the second division in 2024.",
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['academy', 'fee'],
      core: (c) => [
        `At least ${c.byD([2, 3, 4, 5])} academy graduates in every matchday squad.`,
        `No single transfer fee above ${c.feeCap()}.`,
      ],
      finalGoal: () => 'Return to LaLiga and win it again, like 2000.',
    },
    'Real Zaragoza': {
      name: "Nayim's Lob", icon: '🎯',
      tagline: 'From the halfway line.',
      history: "Zaragoza won the 1995 Cup Winners' Cup when Nayim lobbed Arsenal's David Seaman from near the halfway line in the last minute of extra time.",
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['fee', 'academy-promote'],
      core: (c) => [
        'Promote at least one academy player every season.',
        `No single transfer fee above ${c.feeCap()}.`,
      ],
      finalGoal: () => 'Return to LaLiga and win a European trophy.',
    },
    'Sporting Gijón': {
      name: 'Mareo', icon: '🧱',
      tagline: 'Where Villa and Luis Enrique began.',
      history: "Sporting's Mareo academy produced Luis Enrique, David Villa and Abelardo, among many others.",
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['academy', 'origin'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 6])} Mareo graduates in every matchday squad.`,
        'Only sign Spanish players.',
      ],
      finalGoal: () => 'Reach LaLiga and qualify for Europe with 5+ Mareo graduates in the starting XI.',
    },
    'SD Eibar': {
      name: 'Small Town, Big League', icon: '🏘️',
      tagline: 'A town of 27,000 in LaLiga.',
      history: 'Eibar, from a Basque town of around 27,000 people, reached LaLiga for the first time in 2014 and stayed for seven seasons on one of the smallest budgets in the division.',
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['wage', 'fee'],
      core: (c) => [
        `No player may earn more than ${c.wageCap()}/week.`,
        `No single transfer fee above ${c.feeCap()}.`,
      ],
      finalGoal: () => 'Return to LaLiga and qualify for Europe.',
    },
    'FC Andorra': {
      name: "Piqué's Project", icon: '🏔️',
      tagline: 'A club from the Pyrenees in Spain.',
      history: "Gerard Piqué's investment group bought FC Andorra in 2018, when the club was playing in Spain's regional leagues. They have since climbed into the second division, most recently winning promotion in 2025.",
      seasons: [2, 5],
      forcePromotion: true,
      blockTags: ['squad-size'],
      core: (c) => [
        'Sign at least one current or former Barcelona player every season.',
        `Senior squad capped at ${c.byD([25, 24, 23, 22])} players.`,
      ],
      finalGoal: (c) => (c.d >= 3
        ? 'Reach LaLiga for the first time in club history and stay up.'
        : 'Reach LaLiga for the first time in club history.'),
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
