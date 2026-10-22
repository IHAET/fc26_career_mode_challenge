/*
 * Club Heritage challenges: one hand-written challenge per club, built on
 * that club's real history and identity. Keyed by the club name used in
 * data.js. Fields mirror an archetype (see rules.js) plus `history`.
 *
 * `seasons` is [min, max] or a function of difficulty returning one.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  const heritage = {
    // ---------- Spain ----------
    'Athletic Club': {
      name: 'La Cantera', icon: '🦁',
      tagline: 'Con cantera y afición, no hace falta importación.',
      history: 'For over a century Athletic Club have only fielded players born or raised in the Basque Country, and they have never been relegated from LaLiga. Their eighth and last league title came in 1983–84, and winning the 2024 Copa del Rey ended a 40-year wait for that trophy.',
      seasons: [5, 8],
      blockTags: ['origin', 'quota', 'rivals'],
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
      history: "Under Diego Simeone, Atlético broke the Madrid–Barcelona duopoly to win LaLiga in 2014 and 2021 with ferocious defending. The European Cup still eludes them: they lost finals in 1974, 2014 and 2016.",
      seasons: [3, 6],
      blockTags: ['formation'],
      core: () => [
        'Play 4-4-2 (Flat) or 4-4-2 (Holding) in every match.',
        'Concede the fewest goals in the league every season.',
      ],
      finalGoal: () => 'Win the Champions League, the one trophy Atlético have never won.',
    },

    // ---------- England ----------
    'Arsenal': {
      name: 'The Invincibles', icon: '🏅',
      tagline: 'Played 38, won 26, drawn 12, lost 0.',
      history: "Arsène Wenger's Arsenal went the entire 2003–04 Premier League season unbeaten, built around French stars like Henry, Vieira and Pirès. They have never won the Champions League, losing the 2006 final.",
      seasons: [3, 5],
      blockTags: ['sim'],
      core: (c) => [
        `At least ${c.byD([2, 3, 3, 4])} French players in every matchday squad.`,
        'Play every league match: no simming.',
      ],
      finalGoal: (c) => (c.d >= 3
        ? 'Go a whole Premier League season unbeaten and win the Champions League.'
        : 'Go a whole Premier League season unbeaten.'),
    },
    'Manchester United': {
      name: "Class of '92", icon: '👶',
      tagline: "You can't win anything with kids.",
      history: "Beckham, Giggs, Scholes, Butt and the Neville brothers won the 1992 FA Youth Cup together, then formed the core of Sir Alex Ferguson's 1999 treble winners. In 1995 Alan Hansen said 'you can't win anything with kids', and they won the double that season.",
      seasons: [4, 7],
      blockTags: ['academy', 'academy-promote'],
      core: (c) => [
        `Promote at least ${c.byD([4, 5, 6, 6])} academy players to the first team during season 1.`,
        `At least ${c.byD([3, 4, 5, 6])} academy graduates in every matchday squad.`,
      ],
      finalGoal: (c) => `Win the treble (Premier League, FA Cup, Champions League) with ${c.byD([3, 4, 5, 6])}+ academy graduates in the starting XI.`,
    },
    'Liverpool': {
      name: 'Number Seven', icon: '🔴',
      tagline: 'This Is Anfield.',
      history: "Liverpool's Boot Room dynasty under Shankly, Paisley and Fagan won four European Cups between 1977 and 1984. The miracle of Istanbul in 2005 and the 2019 win in Madrid took the total to six.",
      seasons: [3, 6],
      blockTags: ['rivals'],
      core: () => [
        'Go unbeaten at Anfield in the league every season.',
        'Never sign a player from Everton or Manchester United.',
      ],
      finalGoal: (c) => (c.d >= 3
        ? 'Win a seventh European Cup and the Premier League in the same season.'
        : 'Win a seventh European Cup.'),
    },
    'Chelsea': {
      name: 'Cobham Loan Empire', icon: '🌐',
      tagline: 'Buy them, loan them, sell them.',
      history: "Chelsea became famous for their 'loan army', with more than 30 players out on loan in some seasons. Cobham graduates such as Mason Mount and Reece James came through that system, and Chelsea won the Champions League in 2012 and 2021.",
      seasons: [4, 7],
      core: (c) => [
        `Keep at least ${c.byD([6, 8, 10, 12])} players out on loan during every season.`,
        'Every summer, sell at least one player returning from a loan.',
      ],
      finalGoal: (c) => `Win the Champions League with ${c.byD([2, 3, 4, 5])}+ starters you previously sent out on loan.`,
    },
    'Manchester City': {
      name: 'The Centurions', icon: '💯',
      tagline: '100 points.',
      history: "Pep Guardiola's 2017–18 Manchester City were the first Premier League side to reach 100 points. In 2022–23 they won the club's first Champions League as part of a treble.",
      seasons: [3, 5],
      core: (c) => [
        `Average ${c.byD([55, 58, 60, 62])}%+ possession over every league season.`,
        'Never play with fewer than four midfielders.',
      ],
      finalGoal: (c) => (c.d >= 3
        ? 'Reach 100+ league points and win the treble in the same season.'
        : 'Reach 100+ league points in a season.'),
    },
    'Tottenham Hotspur': {
      name: 'To Dare Is To Do', icon: '🐓',
      tagline: 'Audere est facere.',
      history: 'In 1960–61 Spurs were the first club of the 20th century to win the English league and FA Cup double. They have not won the league since, though the 2025 Europa League ended a 17-year wait for a trophy.',
      seasons: [3, 6],
      blockTags: ['formation'],
      core: (c) => [
        'Attack-minded only: no five-at-the-back formations.',
        `Score ${c.byD([60, 70, 80, 90])}+ league goals every season.`,
      ],
      finalGoal: () => 'Win the league and FA Cup double, like the 1961 side.',
    },
    'Newcastle United': {
      name: 'Number Nine', icon: '9️⃣',
      tagline: 'Wor Jackie, Supermac, Shearer…',
      history: "Newcastle's No.9 shirt is legendary: Jackie Milburn, Malcolm Macdonald and Alan Shearer, the Premier League's all-time top scorer, all wore it. The club's last league title came in 1927.",
      seasons: [4, 7],
      blockTags: ['quota'],
      core: (c) => [
        'Your No.9 must be English and your top league scorer every season. If not, sell them and sign a new English No.9.',
        `At least ${c.byD([2, 3, 4, 5])} English players in every starting XI.`,
      ],
      finalGoal: () => 'Win the Premier League for the first time since 1927, with your English No.9 as top scorer.',
    },
    'Leicester City': {
      name: '5000-1', icon: '🦊',
      tagline: 'Dilly ding, dilly dong.',
      history: "In 2015–16 Leicester City, 5000-1 outsiders, won the Premier League with a cheap, counter-attacking 4-4-2 built around Vardy, Mahrez and Kanté.",
      seasons: [3, 5],
      forcePromotion: true,
      finalTitle: true,
      blockTags: ['formation', 'fee'],
      core: (c) => [
        'Play 4-4-2 (Flat) in every match.',
        `No single transfer fee above ${c.feeCap()}.`,
      ],
      finalGoal: (c) => `Win promotion, then win the Premier League within ${c.seasons} seasons.`,
    },
    'Nottingham Forest': {
      name: "Old Big 'Ead", icon: '🌳',
      tagline: 'Promoted, champions, kings of Europe.',
      history: 'Brian Clough took Forest up in 1977, won the league as a newly promoted side in 1978, then won back-to-back European Cups in 1979 and 1980 with a small, tight squad.',
      seasons: [3, 6],
      blockTags: ['squad-size', 'count'],
      core: (c) => [
        `Senior squad capped at ${c.byD([22, 21, 20, 19])} players.`,
        `No more than ${c.byD([3, 3, 2, 2])} signings per summer window.`,
      ],
      finalGoal: () => 'Win the Premier League, then back-to-back Champions Leagues.',
    },
    'Wrexham': {
      name: 'Welcome to Wrexham', icon: '🐉',
      tagline: 'Four promotions in a row?',
      history: 'After Ryan Reynolds and Rob McElhenney bought the club in 2021, Wrexham became the first club to win three straight promotions from the fifth tier, reaching the Championship in 2025.',
      seasons: [3, 6],
      forcePromotion: true,
      core: (c) => [
        'Sign at least one Welsh player every summer.',
        `Keep at least ${c.byD([2, 2, 3, 3])} Welsh players in every matchday squad.`,
      ],
      finalGoal: () => 'Win promotion to the Premier League in season 1 (a fourth straight promotion), then qualify for Europe.',
    },
    'Brighton & Hove Albion': {
      name: 'The Brighton Model', icon: '🔍',
      tagline: 'Scout smarter, sell bigger.',
      history: 'Brighton rose from near-bankruptcy to European football with data-led scouting, signing players like Moisés Caicedo and Alexis Mac Allister cheaply and selling them for huge profits.',
      seasons: [4, 6],
      blockTags: ['fee', 'profit', 'rivals', 'origin'],
      core: (c) => [
        'Only sign players from leagues outside England, Spain, Italy, Germany and France.',
        `No single transfer fee above ${c.feeCap()}.`,
        'Finish every season with a positive net transfer spend.',
      ],
      finalGoal: (c) => `Qualify for the Champions League and sell a player for ${c.money(c.byD([60, 80, 100, 120]))}+.`,
    },

    // ---------- Germany ----------
    'FC Bayern München': {
      name: 'Mia san mia', icon: '🏰',
      tagline: 'Rekordmeister.',
      history: 'Bayern have won a record 34 German titles, including 11 in a row from 2013 to 2023, often by signing the best players from their Bundesliga rivals: Götze, Lewandowski, Hummels and Neuer among them.',
      seasons: (d) => [[3, 4, 5, 5][d - 1], [3, 4, 5, 5][d - 1] + 2],
      blockTags: ['rivals'],
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

    // ---------- Italy ----------
    'Juventus': {
      name: 'Nove di fila', icon: '🦓',
      tagline: 'Fino alla fine.',
      history: 'Juventus won nine Serie A titles in a row from 2012 to 2020, built on an Italian core of Buffon, Chiellini and Bonucci.',
      seasons: (d) => [[4, 5, 6, 9][d - 1], [4, 5, 6, 9][d - 1] + 1],
      blockTags: ['quota'],
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

    // ---------- Rest of Europe ----------
    'Ajax': {
      name: 'Total Football', icon: '🌀',
      tagline: 'De Toekomst is the future.',
      history: "Ajax pioneered Total Football under Rinus Michels and Johan Cruyff and won three straight European Cups from 1971 to 1973. In 1995 Louis van Gaal's young side, built largely from the academy, won the Champions League.",
      seasons: [5, 8],
      blockTags: ['formation', 'academy'],
      core: (c) => [
        'Play 4-3-3 in every match.',
        `At least ${c.byD([4, 5, 6, 7])} academy graduates in every matchday squad.`,
      ],
      finalGoal: () => 'Win the Champions League with a starting XI averaging under 25.',
    },
    'Celtic': {
      name: 'The Lisbon Lions', icon: '🍀',
      tagline: '30 miles from Parkhead.',
      history: "In 1967 Celtic became the first British club to win the European Cup. Every player in Jock Stein's Lisbon Lions was born within 30 miles of Celtic Park.",
      seasons: [5, 9],
      blockTags: ['origin', 'quota'],
      core: () => [
        'Only sign Scottish players.',
        'Win the Scottish Premiership every season.',
      ],
      finalGoal: () => 'Win the Champions League with an all-Scottish starting XI.',
    },
    'Olympique de Marseille': {
      name: 'À jamais les premiers', icon: '🌊',
      tagline: 'Forever the first.',
      history: "In 1993 Marseille became the first French club to win the Champions League, hence the motto 'À jamais les premiers'. PSG only matched them in 2025.",
      seasons: [3, 6],
      blockTags: ['quota'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 5])} French players in every starting XI.`,
        'Finish above Paris Saint-Germain every season.',
      ],
      finalGoal: () => 'Win Ligue 1 and the Champions League.',
    },
    'FC Porto': {
      name: 'Dragão Trading', icon: '🔷',
      tagline: 'Buy in South America, sell to the world.',
      history: "Porto have made a fortune scouting South America, from Hulk and Falcao to James Rodríguez, and selling on. José Mourinho's Porto won the Champions League in 2004.",
      seasons: [4, 7],
      blockTags: ['origin', 'age', 'profit'],
      core: (c) => [
        `Every signing must be South American and aged ${c.byD([24, 23, 22, 21])} or younger.`,
        'Finish every season with a positive net transfer spend.',
      ],
      finalGoal: () => 'Win the Champions League with a positive all-time net spend.',
    },
    'SL Benfica': {
      name: "Guttmann's Curse", icon: '🦅',
      tagline: 'A hundred years without a European trophy?',
      history: "Legend says coach Béla Guttmann left Benfica in 1962 after a pay dispute and declared they would not win a European trophy for 100 years. Since their 1961 and 1962 European Cups they have lost eight European finals.",
      seasons: [3, 6],
      blockTags: ['quota', 'academy-promote'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 6])} Portuguese players in every starting XI.`,
        `Promote at least ${c.byD([1, 2, 2, 3])} Seixal academy player(s) every season.`,
      ],
      finalGoal: (c) => `Break the curse: win the ${c.d <= 2 ? 'Europa League' : 'Champions League'}.`,
    },
    'Sporting CP': {
      name: 'Alcochete Academy', icon: '🌟',
      tagline: 'Where Figo and Ronaldo began.',
      history: "Sporting's academy produced Luís Figo, Cristiano Ronaldo, Nani and João Moutinho, and it is still the backbone of the club.",
      seasons: [5, 8],
      blockTags: ['age', 'academy'],
      core: (c) => [
        `Only sign players aged ${c.byD([20, 19, 19, 18])} or younger.`,
        `At least ${c.byD([3, 4, 5, 6])} academy graduates must start every league match.`,
      ],
      finalGoal: (c) => `Win Liga Portugal and develop an academy graduate into a ${c.byD([85, 87, 88, 90])}+ OVR player.`,
    },
  };

  FC26.heritage = heritage;
})(typeof window !== 'undefined' ? window : globalThis);
