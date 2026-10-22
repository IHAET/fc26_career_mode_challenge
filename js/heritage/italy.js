/*
 * Club Heritage challenges: Italy (Serie A and Serie B).
 * Keyed by the club name used in data.js. Field reference: see the
 * 'club-heritage' archetype in rules.js.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  Object.assign((FC26.heritage = FC26.heritage || {}), {
    // ---------- Serie A ----------
    'Juventus': {
      name: 'Nove di fila', icon: '🦓',
      tagline: 'Fino alla fine.',
      history: 'Juventus won nine Serie A titles in a row from 2012 to 2020, built on an Italian core of Buffon, Chiellini and Bonucci.',
      seasons: (d) => [[4, 5, 6, 9][d - 1], [4, 5, 6, 9][d - 1] + 1],
      blockTags: ['quota'],
      seasonGoal: (c) => `Win ${c.topLeagueRef}.`,
      core: (c) => [
        `At least ${c.byD([4, 5, 5, 6])} Italian players in every starting XI.`,
        'Any season you fail to win Serie A counts as a broken rule.',
      ],
      finalGoal: (c) => `Win ${c.byD([4, 5, 6, 9])} Serie A titles in a row.`,
    },
    'AC Milan': {
      name: 'Dutch Masters', icon: '🌷',
      tagline: "Sacchi's Milan.",
      history: "Arrigo Sacchi's Milan, led by the Dutch trio of Gullit, van Basten and Rijkaard, pressed high in a 4-4-2 and won back-to-back European Cups in 1989 and 1990.",
      seasons: [3, 5],
      blockTags: ['formation'],
      core: (c) => [
        'Play 4-4-2 (Flat) in every match.',
        `Sign ${c.byD([2, 3, 3, 3])} Dutch players and make them regular starters.`,
      ],
      finalGoal: () => 'Win back-to-back Champions Leagues.',
    },
    'Inter': {
      name: 'Triplete', icon: '🐍',
      tagline: "Mourinho's 2010.",
      history: "José Mourinho's Inter won Serie A, the Coppa Italia and the Champions League in 2010, the only treble in Italian football history, without a single Italian in the starting XI for the final.",
      seasons: [3, 5],
      blockTags: ['age', 'quota'],
      core: (c) => [
        'No Italian players in your starting XI, ever.',
        `No signing players under ${c.byD([24, 25, 26, 27])}: experience wins trebles.`,
      ],
      finalGoal: () => 'Win the treble: Serie A, Coppa Italia and Champions League in one season.',
    },
    'Napoli': {
      name: "Diego's Heir", icon: '💙',
      tagline: 'One genius can carry a city.',
      history: 'Diego Maradona carried Napoli to their first two Scudetti in 1987 and 1990 and the 1989 UEFA Cup, and the club retired his No.10. Napoli won the title again in 2023 and 2025.',
      seasons: [3, 6],
      core: () => [
        'Sign an Argentine attacking midfielder or forward and build around them: they start every league match when fit.',
        'No other player may earn more than your Argentine star.',
      ],
      finalGoal: () => 'Win Serie A and a European trophy, with your Argentine star as top scorer.',
    },
    'Roma': {
      name: 'Er Capitano', icon: '🐺',
      tagline: 'One club, one city.',
      history: 'Francesco Totti spent his whole 25-year career at Roma and captained them to the 2001 Scudetto. Roma won the first UEFA Conference League in 2022.',
      seasons: [4, 8],
      blockTags: ['captain'],
      core: () => [
        'Before your first match, make your best academy graduate captain. They can never be sold or loaned.',
        'Never sell a player to another Serie A club.',
      ],
      finalGoal: () => 'Win Serie A with your academy captain still leading the team.',
    },
    'Atalanta': {
      name: 'La Dea', icon: '🏹',
      tagline: 'Zingonia makes them, the back three makes them fly.',
      history: "Atalanta's Zingonia academy has produced players like Alessandro Bastoni and Dejan Kulusevski. With Gian Piero Gasperini's man-marking back three they won the 2024 Europa League, ending Leverkusen's unbeaten season in the final.",
      seasons: [4, 7],
      blockTags: ['formation', 'academy'],
      core: (c) => [
        'Play a back three (3-4-2-1, 3-4-3 or 3-5-2) in every match.',
        `At least ${c.byD([2, 3, 4, 5])} academy graduates in every matchday squad.`,
      ],
      finalGoal: () => 'Win Serie A for the first time in club history.',
    },
    'Torino': {
      name: 'Il Grande Torino', icon: '🐂',
      tagline: 'Five titles in a row.',
      history: "Il Grande Torino, captained by Valentino Mazzola, won five consecutive Serie A titles in the 1940s before the 1949 Superga air disaster killed almost the entire team. Torino's last title came in 1976.",
      seasons: [4, 8],
      blockTags: ['quota', 'academy-promote'],
      core: (c) => [
        `At least ${c.byD([4, 5, 6, 7])} Italian players in every starting XI.`,
        'Promote at least one academy player every season.',
      ],
      finalGoal: (c) => `Win ${c.byD([2, 3, 4, 5])} Serie A titles in a row.`,
    },
    'Hellas Verona': {
      name: 'The Miracle of 1985', icon: '🟨',
      tagline: "Bagnoli's Scudetto.",
      history: "Osvaldo Bagnoli's unfancied Hellas Verona won Serie A in 1984–85, one of the biggest shocks in Italian football history.",
      seasons: [4, 7],
      blockTags: ['ovr', 'fee'],
      core: (c) => [
        `No signing anyone rated above ${c.ovrCap()} OVR.`,
        `No single transfer fee above ${c.feeCap()}.`,
      ],
      finalGoal: () => 'Win Serie A.',
    },
    'Cagliari': {
      name: "Riva's Island", icon: '🏝️',
      tagline: "Sardinia's only Scudetto.",
      history: 'Gigi Riva fired Cagliari to the 1970 Serie A title, still the only Scudetto won by a Sardinian club. He turned down repeated offers from Juventus to stay on the island.',
      seasons: [4, 7],
      blockTags: ['sell-star'],
      core: () => [
        'Never sell your highest-rated player.',
        'Never sell a player to Juventus, Inter or AC Milan.',
      ],
      finalGoal: () => 'Win Serie A with a star who has spent the whole save at the club.',
    },
    'Parma': {
      name: 'The Phoenix', icon: '🔥',
      tagline: 'From Serie D to Serie A in three years.',
      history: "Parma's golden era brought UEFA Cups in 1995 and 1999. After bankruptcy in 2015 the club restarted in Serie D, and three straight promotions took them back to Serie A by 2018.",
      seasons: [4, 7],
      blockTags: ['profit', 'wage'],
      core: (c) => [
        'Finish every season with a positive net transfer spend.',
        `No player may earn more than ${c.wageCap()}/week.`,
      ],
      finalGoal: () => 'Win a European trophy, like the 1990s side.',
    },
    'Genoa': {
      name: 'English Roots', icon: '🫖',
      tagline: "Italy's oldest club.",
      history: 'Genoa Cricket and Football Club was founded by Englishmen in 1893 and is the oldest active football club in Italy. They won nine league titles, the last in 1924.',
      seasons: [4, 7],
      core: (c) => [
        `At least ${c.byD([1, 2, 2, 3])} English player(s) in every starting XI.`,
        'Never sign a player from Sampdoria.',
      ],
      finalGoal: () => 'Win Serie A for the first time since 1924.',
    },
    'Bologna': {
      name: 'Lo Squadrone', icon: '🗼',
      tagline: 'The team that makes the world tremble.',
      history: "In the 1930s Bologna were 'lo squadrone che tremare il mondo fa', the team that makes the world tremble. Their last Scudetto came in 1964, and the 2025 Coppa Italia was their first major trophy in 51 years.",
      seasons: [4, 7],
      blockTags: ['fee'],
      core: (c) => [
        `No single transfer fee above ${c.feeCap()}.`,
        `At least ${c.byD([3, 4, 5, 6])} Italian players in every matchday squad.`,
      ],
      finalGoal: () => 'Win Serie A for the first time since 1964.',
    },
    'Como': {
      name: 'Lake Como Project', icon: '⛵',
      tagline: 'Serie D to Serie A.',
      history: 'Como went bankrupt and dropped into Serie D in 2017. Bought by the Hartono brothers and later coached by Cesc Fàbregas, they reached Serie A in 2024 for the first time in 21 years.',
      seasons: [4, 6],
      blockTags: ['age'],
      core: (c) => [
        `Only sign players aged ${c.byD([25, 24, 23, 22])} or younger.`,
        `Average ${c.byD([55, 57, 59, 61])}%+ possession over every league season.`,
      ],
      finalGoal: () => 'Qualify for the Champions League with a squad averaging under 25.',
    },

    // ---------- Serie B ----------
    'Sampdoria': {
      name: 'I Gemelli del Gol', icon: '👯',
      tagline: 'The goal twins.',
      history: "Gianluca Vialli and Roberto Mancini, 'the goal twins', led Sampdoria to the 1990 Cup Winners' Cup, their only Serie A title in 1991 and the European Cup final in 1992.",
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['formation'],
      core: (c) => [
        'Play with two strikers in every match.',
        `Your two main strikers must score ${c.byD([20, 25, 30, 35])}+ league goals between them every season.`,
      ],
      finalGoal: () => 'Return to Serie A and win it again.',
    },
    'Palermo': {
      name: 'City in Sicily', icon: '🌋',
      tagline: 'Rosanero reborn.',
      history: 'Palermo were refounded in Serie D in 2019 after bankruptcy, and City Football Group, owners of Manchester City, bought the club in 2022.',
      seasons: [3, 5],
      forcePromotion: true,
      blockTags: ['loans', 'academy-promote'],
      core: () => [
        'Take at least one loan from Manchester City, Girona or New York City FC every season.',
        'Promote at least one academy player every season.',
      ],
      finalGoal: () => 'Reach Serie A and qualify for Europe.',
    },
    'Monza': {
      name: "Berlusconi's Monza", icon: '🏎️',
      tagline: "The men behind Milan's golden era.",
      history: "Silvio Berlusconi and Adriano Galliani, the duo behind AC Milan's golden era, bought Monza in 2018 and took them into Serie A in 2022 for the first time in the club's 110-year history.",
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['quota'],
      core: (c) => [
        `At least ${c.byD([5, 6, 7, 8])} Italian players in every starting XI.`,
        'Sign at least one current or former AC Milan player every season.',
      ],
      finalGoal: () => 'Return to Serie A and qualify for the Champions League.',
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
