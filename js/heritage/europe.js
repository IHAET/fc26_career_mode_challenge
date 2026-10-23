/*
 * Club Heritage challenges: the rest of Europe (Netherlands, Portugal,
 * Scotland, Belgium, Türkiye, Norway, Denmark, Austria, Romania).
 * Keyed by the club name used in data.js. Field reference: see the
 * 'club-heritage' archetype in rules.js.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  Object.assign((FC26.heritage = FC26.heritage || {}), {
    // ---------- Netherlands ----------
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
    'PSV': {
      name: 'Brazilian Nines', icon: '💡',
      tagline: "Romário, Ronaldo… who's next?",
      history: 'PSV won the European Cup as part of a treble in 1988, then signed Brazilian strikers Romário and Ronaldo before they became world stars.',
      seasons: [4, 6],
      blockTags: ['age'],
      core: (c) => [
        'Your first-choice striker must be Brazilian.',
        `Only sign players aged ${c.byD([23, 22, 22, 21])} or younger.`,
      ],
      finalGoal: () => 'Win the Eredivisie, KNVB Cup and Champions League treble, like 1988.',
    },
    'Feyenoord': {
      name: 'Geen woorden maar daden', icon: '🚢',
      tagline: 'No words, but deeds.',
      history: 'Feyenoord became the first Dutch club to win the European Cup in 1970, and won the UEFA Cup in 1974 and 2002.',
      seasons: [4, 7],
      blockTags: ['quota', 'academy-promote'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 6])} Dutch players in every starting XI.`,
        'Promote at least one academy player every season.',
      ],
      finalGoal: () => 'Win the Champions League.',
    },
    'AZ Alkmaar': {
      name: "Van Gaal's Upset", icon: '🧀',
      tagline: 'Breaking the big three.',
      history: "Louis van Gaal's AZ won the 2008–09 Eredivisie, breaking the grip of Ajax, PSV and Feyenoord, and the club's academy is one of the best in the Netherlands.",
      seasons: [4, 7],
      blockTags: ['academy'],
      core: (c) => [
        `At least ${c.byD([2, 3, 4, 5])} academy graduates in every matchday squad.`,
        'Never sign a player from Ajax, PSV or Feyenoord.',
      ],
      finalGoal: () => 'Win the Eredivisie twice, finishing above Ajax, PSV and Feyenoord both times.',
    },

    // ---------- Portugal ----------
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
      history: 'Legend says coach Béla Guttmann left Benfica in 1962 after a pay dispute and declared they would not win a European trophy for 100 years. Since their 1961 and 1962 European Cups they have lost eight European finals.',
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
    'SC Braga': {
      name: 'Break the Big Three', icon: '🔱',
      tagline: 'Arsenalistas.',
      history: 'Only Belenenses (1946) and Boavista (2001) have won the Portuguese league outside Benfica, Porto and Sporting. Braga, Europa League finalists in 2011, are still chasing their first title.',
      seasons: [4, 7],
      blockTags: ['fee'],
      core: (c) => [
        'Never sign a player from Benfica, Porto or Sporting CP.',
        `No single transfer fee above ${c.feeCap()}.`,
      ],
      finalGoal: () => 'Win Liga Portugal for the first time in club history.',
    },

    // ---------- Scotland ----------
    'Celtic': {
      name: 'The Lisbon Lions', icon: '🍀',
      tagline: '30 miles from Parkhead.',
      history: "In 1967 Celtic became the first British club to win the European Cup. Every player in Jock Stein's Lisbon Lions was born within 30 miles of Celtic Park.",
      seasons: [5, 9],
      blockTags: ['origin', 'quota'],
      seasonGoal: (c) => `Win ${c.topLeagueRef}.`,
      core: () => [
        'Only sign Scottish players.',
        'Win the Scottish Premiership every season.',
      ],
      finalGoal: () => 'Win the Champions League with an all-Scottish starting XI.',
    },
    'Rangers': {
      name: 'From the Bottom', icon: '🦁',
      tagline: 'Ready.',
      history: "After the club's liquidation in 2012, Rangers restarted in Scotland's fourth tier and climbed back. In 2020–21, under Steven Gerrard, they won the league unbeaten to stop Celtic's bid for ten in a row.",
      seasons: [3, 6],
      blockTags: ['quota'],
      core: (c) => [
        `At least ${c.byD([2, 3, 4, 5])} Scottish players in every starting XI.`,
        'Finish above Celtic every season.',
      ],
      finalGoal: () => 'Win the Scottish Premiership unbeaten and reach the Champions League knockout stage.',
    },
    'Aberdeen': {
      name: "Fergie's Dons", icon: '🐟',
      tagline: 'Gothenburg 1983.',
      history: "Alex Ferguson's Aberdeen broke the Old Firm's grip to win three league titles in the 1980s and beat Real Madrid in the 1983 Cup Winners' Cup final in Gothenburg.",
      seasons: [4, 7],
      blockTags: ['quota'],
      core: (c) => [
        `At least ${c.byD([4, 5, 6, 7])} Scottish players in every starting XI.`,
        'Never sign a player from Celtic or Rangers.',
      ],
      finalGoal: () => 'Win the league ahead of Celtic and Rangers, and win a European trophy.',
    },
    'Dundee United': {
      name: "McLean's Terrors", icon: '🍊',
      tagline: 'Champions, semi-finalists, finalists.',
      history: "Jim McLean's Dundee United won the Scottish title in 1983, reached the European Cup semi-finals in 1984 and the UEFA Cup final in 1987.",
      seasons: [4, 7],
      blockTags: ['quota', 'academy-promote'],
      core: (c) => [
        `At least ${c.byD([4, 5, 6, 7])} Scottish players in every starting XI.`,
        'Promote at least one academy player every season.',
      ],
      finalGoal: () => 'Win the Scottish Premiership and reach a European semi-final.',
    },
    'Hibernian': {
      name: 'Sunshine on Leith', icon: '☀️',
      tagline: '114 years in the making.',
      history: 'In 2016 Hibernian won the Scottish Cup for the first time since 1902, ending a 114-year wait. Their last league title came in 1952.',
      seasons: [4, 7],
      blockTags: ['quota'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 6])} Scottish players in every starting XI.`,
        'Finish above Hearts every season.',
      ],
      finalGoal: () => 'Win the Scottish Premiership for the first time since 1952.',
    },

    // ---------- Belgium ----------
    'Union Saint-Gilloise': {
      name: 'Union Revival', icon: '💛',
      tagline: 'Champions again after 90 years.',
      history: 'Union dominated Belgian football in the 1930s, including a 60-match unbeaten run, then spent 48 years outside the top flight. Under Brighton owner Tony Bloom they returned in 2021 and won the 2024–25 title, their first since 1935.',
      seasons: [3, 6],
      blockTags: ['fee', 'sell-star'],
      core: (c) => [
        `No single transfer fee above ${c.feeCap()}.`,
        'Sell your highest-valued player every summer.',
      ],
      finalGoal: () => 'Win the league and reach the Champions League knockout stage.',
    },
    'RSC Anderlecht': {
      name: 'Neerpede', icon: '🟣',
      tagline: "Belgium's talent factory.",
      history: "Anderlecht are Belgium's most successful club, and their Neerpede academy produced Vincent Kompany, Romelu Lukaku, Youri Tielemans and Jérémy Doku.",
      seasons: [4, 7],
      blockTags: ['academy', 'academy-promote'],
      core: (c) => [
        `Promote at least ${c.byD([1, 2, 2, 3])} academy player(s) every season.`,
        `At least ${c.byD([3, 4, 5, 6])} academy graduates in every matchday squad.`,
      ],
      finalGoal: () => 'Win the Belgian league with 6+ academy graduates in the starting XI.',
    },
    'KRC Genk': {
      name: 'Talent Factory', icon: '⛏️',
      tagline: 'Where De Bruyne and Courtois began.',
      history: "Genk's academy produced Kevin De Bruyne and Thibaut Courtois, and the club from the old mining region of Limburg has won the Belgian league four times.",
      seasons: [4, 7],
      blockTags: ['age'],
      core: (c) => [
        `Only sign players aged ${c.byD([22, 21, 20, 20])} or younger.`,
        `Sell an academy graduate for ${c.money(c.byD([10, 15, 20, 25]))}+ at least once every ${c.byD([3, 3, 2, 2])} seasons.`,
      ],
      finalGoal: (c) => `Win the Belgian league and sell an academy graduate for ${c.money(c.byD([30, 40, 50, 60]))}+.`,
    },
    'Royal Antwerp': {
      name: 'The Great Old', icon: '1️⃣',
      tagline: 'Matricule No. 1.',
      history: "Founded in 1880, Antwerp are Belgium's oldest club and hold the federation's registration number 1. In 2023 they won the league for the first time since 1957.",
      seasons: [4, 6],
      blockTags: ['quota'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 6])} Belgian players in every starting XI.`,
        'Never sign a player from Club Brugge or Anderlecht.',
      ],
      finalGoal: () => 'Win the Belgian league and reach the Champions League knockout stage.',
    },

    // ---------- Türkiye ----------
    'Galatasaray': {
      name: 'Istanbul 2000', icon: '🦁',
      tagline: 'The first Turkish European champions.',
      history: 'Galatasaray won the 2000 UEFA Cup, beating Arsenal on penalties, then the UEFA Super Cup against Real Madrid: the first European trophies won by a Turkish club.',
      seasons: [3, 6],
      blockTags: ['quota'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 5])} Turkish players in every starting XI.`,
        'Finish above Fenerbahçe every season.',
      ],
      finalGoal: () => 'Win the Champions League.',
    },
    'Trabzonspor': {
      name: 'Anatolian Storm', icon: '⛈️',
      tagline: "Breaking Istanbul's grip.",
      history: 'In 1976 Trabzonspor became the first club from outside Istanbul to win the Turkish league, and won six titles in their first ten top-flight seasons.',
      seasons: [4, 7],
      blockTags: ['quota'],
      core: (c) => [
        `At least ${c.byD([4, 5, 6, 7])} Turkish players in every starting XI.`,
        'Never sign a player from Galatasaray, Fenerbahçe or Beşiktaş.',
      ],
      finalGoal: () => 'Win the Süper Lig ahead of all three Istanbul giants.',
    },

    // ---------- Norway ----------
    'Bodø/Glimt': {
      name: 'Arctic Miracle', icon: '❄️',
      tagline: 'Football north of the Arctic Circle.',
      history: "Bodø/Glimt, from a town of around 50,000 north of the Arctic Circle, won their first league title in 2020, beat José Mourinho's Roma 6–1 in 2021, and in 2025 became the first Norwegian club to reach a European semi-final.",
      seasons: [4, 7],
      blockTags: ['quota', 'fee'],
      core: (c) => [
        `At least ${c.byD([4, 5, 6, 7])} Norwegian players in every starting XI.`,
        `No single transfer fee above ${c.feeCap()}.`,
      ],
      finalGoal: (c) => (c.d <= 2 ? 'Reach a European final.' : 'Win a European trophy.'),
    },
    'Rosenborg': {
      name: 'Thirteen in a Row', icon: '♟️',
      tagline: "Norway's kings of the 1990s.",
      history: 'Rosenborg won 13 straight Norwegian titles from 1992 to 2004 and were Champions League regulars, famously beating AC Milan at San Siro in 1996.',
      seasons: (d) => [[3, 5, 7, 9][d - 1], [3, 5, 7, 9][d - 1] + 1],
      blockTags: ['quota'],
      seasonGoal: (c) => `Win ${c.topLeagueRef}.`,
      core: (c) => [
        `At least ${c.byD([4, 5, 6, 7])} Norwegian players in every starting XI.`,
      ],
      finalGoal: (c) => `Win ${c.byD([3, 5, 7, 9])} league titles in a row and reach the Champions League knockout stage.`,
    },

    // ---------- Denmark ----------
    'FC Midtjylland': {
      name: 'Moneyball Denmark', icon: '📐',
      tagline: 'Data wins titles.',
      history: 'Bought in 2014 by Matthew Benham, also the owner of Brentford, Midtjylland used statistical analysis and specialist set-piece coaching to win their first Danish title in 2015.',
      seasons: [4, 6],
      blockTags: ['fee', 'profit'],
      core: (c) => [
        `No single transfer fee above ${c.feeCap()}.`,
        'Finish every season with a positive net transfer spend.',
      ],
      finalGoal: () => 'Win the Danish Superliga and reach the Champions League league phase.',
    },
    'FC Nordsjælland': {
      name: 'Right to Dream', icon: '🌍',
      tagline: "One of Europe's youngest teams.",
      history: "Owned since 2016 by the Right to Dream academy from Ghana, Nordsjælland field one of Europe's youngest teams, mixing Danish and West African talent such as Mohammed Kudus.",
      seasons: [4, 7],
      blockTags: ['age', 'origin'],
      core: (c) => [
        `Only sign players aged ${c.byD([21, 20, 19, 19])} or younger.`,
        'Every signing must be Danish or African.',
      ],
      finalGoal: () => 'Win the Danish Superliga with a starting XI averaging under 23.',
    },

    // ---------- Austria ----------
    'Red Bull Salzburg': {
      name: 'The Stepping Stone', icon: '🎢',
      tagline: 'Next stop: the big leagues.',
      history: 'Salzburg won ten straight Austrian titles from 2014 to 2023 while developing future stars such as Erling Haaland, Sadio Mané and Dominik Szoboszlai, then selling them on.',
      seasons: [4, 7],
      blockTags: ['age', 'sell-star'],
      core: (c) => [
        `Only sign players aged ${c.byD([21, 20, 20, 19])} or younger.`,
        'Sell your highest-valued player every summer.',
      ],
      finalGoal: (c) => `Win ${c.byD([3, 4, 5, 6])} league titles in a row and sell a player for ${c.money(c.byD([40, 50, 60, 80]))}+.`,
    },
    'Rapid Wien': {
      name: 'Rapid-Viertelstunde', icon: '⏰',
      tagline: 'The Rapid quarter-hour.',
      history: "For over a century Rapid fans have clapped in the 75th minute to start the 'Rapid-Viertelstunde', the quarter-hour in which the team is expected to turn games around. Rapid are Austria's record champions and reached Cup Winners' Cup finals in 1985 and 1996.",
      seasons: [4, 6],
      blockTags: ['subs', 'quota'],
      core: (c) => [
        'Make all your substitutions in the 75th minute or later (injuries excepted).',
        `At least ${c.byD([4, 5, 6, 7])} Austrian players in every starting XI.`,
      ],
      finalGoal: () => 'Win the Austrian Bundesliga for the first time since 2008.',
    },

    // ---------- Romania ----------
    'FCSB': {
      name: "The Owner's Club", icon: '👑',
      tagline: 'The patron always has the final say.',
      history: "FCSB, formerly Steaua București, are the most successful Romanian club of the modern era and won the SuperLiga in 2024 and 2025. Their owner is famous for having the final say on transfers and team selection. (Who owns the history of Steaua's 1986 European Cup win is the subject of a long legal dispute.)",
      seasons: [3, 5],
      blockTags: ['quota', 'sell-star'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 6])} Romanian players in every starting XI.`,
        `The owner always cashes in: accept any bid of ${c.byD(['€15M', '€10M', '€8M', '€6M'])} or more for one of your players.`,
      ],
      finalGoal: () => 'Win the SuperLiga and reach the Europa League quarter-finals in the same season.',
    },
    'Universitatea Craiova': {
      name: 'Craiova Maxima', icon: '🦁',
      tagline: 'Bring back the golden team.',
      history: "In the early 1980s Universitatea Craiova's side, nicknamed 'Craiova Maxima', won back-to-back league titles and in 1983 became the first Romanian team to reach a European semi-final, losing the UEFA Cup tie to Benfica on away goals.",
      seasons: [4, 6],
      blockTags: ['quota', 'age'],
      core: (c) => [
        `At least ${c.byD([4, 5, 6, 6])} Romanian players in every starting XI.`,
        `Only sign players aged ${c.byD([26, 25, 24, 23])} or younger.`,
      ],
      finalGoal: () => 'Reach a European semi-final, like the Craiova Maxima of 1983.',
    },
    'Rapid București': {
      name: 'The Railwaymen of Giulești', icon: '🚂',
      tagline: "The fans' club, back for the title.",
      history: "Rapid were founded in 1923 by workers at Bucharest's Grivița railway workshops and play at Giulești in front of some of Romania's loudest fans. Their last league title came in 2003.",
      seasons: [3, 6],
      blockTags: ['academy-promote', 'rivals'],
      core: (c) => [
        `Promote at least ${c.byD([1, 2, 2, 3])} academy players to the first team every season.`,
        'Never sign a player from FCSB or Dinamo București.',
      ],
      finalGoal: () => "Win the SuperLiga, Rapid's first league title since 2003.",
    },
    'Dinamo București': {
      name: 'Back from the Brink', icon: '🐕',
      tagline: 'The Red Dogs rebuild on a shoestring.',
      history: "Dinamo have won 18 Romanian titles, the last in 2007, but money trouble and insolvency led to relegation in 2022. They won their way back to the top flight a year later and are rebuilding.",
      seasons: [4, 6],
      blockTags: ['wage', 'fee'],
      core: (c) => [
        `No player may earn more than ${c.wageCap()}/week.`,
        'In your first season, sign only free agents and loans.',
      ],
      finalGoal: () => "Win the SuperLiga, Dinamo's first title since 2007.",
    },
    'CFR Cluj': {
      name: "The Railwaymen's Dynasty", icon: '🚆',
      tagline: 'Experience wins titles.',
      history: 'CFR Cluj won their first league title in 2008, more than a century after they were founded, and then won five in a row from 2018 to 2022 with squads built on experienced players.',
      seasons: [5, 6],
      blockTags: ['avg-age', 'age'],
      core: () => [
        'Your starting XI must average 28 years old or older.',
        'Sign at least one player aged 30 or over every summer.',
      ],
      seasonGoal: (c, s) => (s === 1 ? 'Win the SuperLiga.' : null),
      finalGoal: () => 'Win five SuperLiga titles in a row, like 2018 to 2022.',
    },
    'Farul Constanța': {
      name: "Hagi's Academy", icon: '🌊',
      tagline: 'Built by the King of the Carpathians.',
      history: 'Gheorghe Hagi founded Viitorul Constanța and its academy in 2009 and won the league with them in 2017. Viitorul merged into Farul in 2021, and with Hagi as coach Farul were champions in 2023, mostly with young Romanian players.',
      seasons: [4, 6],
      blockTags: ['origin', 'age', 'academy'],
      core: (c) => [
        `Only sign Romanian players aged ${c.byD([24, 23, 22, 21])} or younger.`,
        `At least ${c.byD([2, 3, 4, 5])} academy graduates in every matchday squad.`,
      ],
      finalGoal: () => 'Win the SuperLiga with a starting XI averaging under 24.',
    },
    'Csíkszereda': {
      name: "Szeklerland's Club", icon: '🌲',
      tagline: 'From the Carpathian valleys to the top flight.',
      history: "FK Csíkszereda play in Miercurea Ciuc, in the mainly Hungarian-speaking Szeklerland region, and are known for their youth academy. In 2025 they reached Romania's top flight for the first time.",
      seasons: [3, 5],
      blockTags: ['origin', 'academy'],
      core: (c) => [
        'Every signing must be Hungarian or Romanian.',
        `At least ${c.byD([2, 3, 4, 4])} academy graduates in every matchday squad.`,
      ],
      seasonGoal: (c, s) => (s === 1 ? 'Avoid relegation from the SuperLiga.' : null),
      finalGoal: () => 'Qualify for European football.',
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
