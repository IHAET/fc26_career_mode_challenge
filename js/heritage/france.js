/*
 * Club Heritage challenges: France (Ligue 1 and Ligue 2).
 * Keyed by the club name used in data.js. Field reference: see the
 * 'club-heritage' archetype in rules.js.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  Object.assign((FC26.heritage = FC26.heritage || {}), {
    // ---------- Ligue 1 ----------
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
    'Paris Saint-Germain': {
      name: 'No More Galácticos', icon: '🏙️',
      tagline: 'The team is the star.',
      history: "After years of chasing the Champions League with superstars like Neymar, Messi and Mbappé, PSG finally won it in 2025 with Luis Enrique's young, hard-pressing team, beating Inter 5–0 in the final.",
      seasons: [3, 5],
      blockTags: ['age'],
      core: (c) => [
        'No player may earn more than twice your second-highest earner.',
        `Only sign players aged ${c.byD([25, 24, 23, 23])} or younger.`,
      ],
      finalGoal: () => 'Win the Champions League in back-to-back seasons.',
    },
    'Olympique Lyonnais': {
      name: 'Sept à la suite', icon: '7️⃣',
      tagline: 'Seven in a row.',
      history: "Lyon won seven consecutive Ligue 1 titles from 2002 to 2008, driven by Juninho Pernambucano's free kicks and an academy that produced Karim Benzema.",
      seasons: (d) => [[3, 4, 5, 7][d - 1], [3, 4, 5, 7][d - 1] + 1],
      blockTags: ['academy', 'origin'],
      seasonGoal: (c) => `Win ${c.topLeagueRef}.`,
      core: (c) => [
        `At least ${c.byD([2, 3, 4, 5])} academy graduates in every matchday squad.`,
        'Sign at least one Brazilian player every season.',
      ],
      finalGoal: (c) => `Win ${c.byD([3, 4, 5, 7])} Ligue 1 titles in a row.`,
    },
    'AS Monaco': {
      name: 'La Turbie Talent', icon: '💎',
      tagline: 'Develop the next Mbappé.',
      history: "Monaco's academy has produced Thierry Henry, David Trezeguet and Kylian Mbappé. In 2017 a young side starring Mbappé won Ligue 1 and reached the Champions League semi-finals.",
      seasons: [4, 7],
      blockTags: ['age', 'sell-star'],
      core: (c) => [
        `Only sign players aged ${c.byD([22, 21, 20, 20])} or younger.`,
        'Sell your highest-valued player every summer.',
      ],
      finalGoal: (c) => `Win Ligue 1 and sell an academy graduate for ${c.money(c.byD([60, 80, 100, 120]))}+.`,
    },
    'AJ Auxerre': {
      name: "Guy Roux's Auxerre", icon: '🧣',
      tagline: 'One manager, four decades.',
      history: 'Guy Roux coached Auxerre for over four decades, taking a small-town club from the amateur leagues to the 1996 league and cup double while developing players like Eric Cantona and Djibril Cissé.',
      seasons: [5, 9],
      blockTags: ['academy'],
      core: (c) => [
        'Stay at Auxerre for the whole save: no job switching.',
        `At least ${c.byD([3, 4, 5, 6])} academy graduates in every matchday squad.`,
      ],
      finalGoal: () => 'Win the Ligue 1 and Coupe de France double, like 1996.',
    },
    'LOSC Lille': {
      name: 'Sell to Win', icon: '🐕',
      tagline: 'Develop stars, beat PSG.',
      history: 'Lille sell big, from Eden Hazard to Victor Osimhen and Rafael Leão, yet in 2021 they beat PSG’s superstars to the Ligue 1 title.',
      seasons: [4, 6],
      blockTags: ['sell-star', 'profit'],
      core: () => [
        'Sell your highest-valued player every summer.',
        'Finish every season with a positive net transfer spend.',
      ],
      finalGoal: () => 'Win Ligue 1 ahead of PSG with a positive all-time net spend.',
    },

    // ---------- Ligue 2 ----------
    'AS Saint-Étienne': {
      name: 'Les Verts', icon: '🟩',
      tagline: 'Square posts and broken hearts.',
      history: "Saint-Étienne have won ten French titles. In the 1976 European Cup final they hit Hampden Park's square goalposts twice and lost 1–0 to Bayern Munich. Their last league title came in 1981.",
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['quota', 'academy'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 6])} French players in every starting XI.`,
        `At least ${c.byD([2, 3, 3, 4])} academy graduates in every matchday squad.`,
      ],
      finalGoal: () => 'Return to Ligue 1, win it again, and reach a European final.',
    },
    'Stade de Reims': {
      name: 'Kopa & Fontaine', icon: '🥂',
      tagline: 'Champagne football.',
      history: "Raymond Kopa's Reims reached the first European Cup final in 1956, and Just Fontaine's side the 1959 final, losing both to Real Madrid. Reims won six French titles between 1949 and 1962.",
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['quota'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 6])} French players in every starting XI.`,
        `Your two main attackers must score ${c.byD([25, 30, 35, 40])}+ league goals between them every season.`,
      ],
      finalGoal: () => 'Return to Ligue 1 and reach the Champions League final.',
    },
    'Red Star FC': {
      name: "Jules Rimet's Club", icon: '✴️',
      tagline: 'Founded by the father of the World Cup.',
      history: 'Red Star were founded in 1897 by Jules Rimet, who later created the FIFA World Cup. The club from Saint-Ouen, just outside Paris, have won five Coupes de France.',
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['academy-promote'],
      core: (c) => [
        `Your squad must include players from at least ${c.byD([3, 4, 5, 5])} different continents.`,
        'Promote at least one academy player every season.',
      ],
      finalGoal: () => 'Reach Ligue 1 and win the Coupe de France.',
    },
    'EA Guingamp': {
      name: 'The Smallest Big Club', icon: '🥖',
      tagline: 'A town of 7,000, two Coupes de France.',
      history: 'Guingamp, from a Breton town of about 7,000 people, won the Coupe de France in 2009 as a second-division side, and again in 2014.',
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['wage', 'origin'],
      core: (c) => [
        `No player may earn more than ${c.wageCap()}/week.`,
        'Only sign French players.',
      ],
      finalGoal: () => 'Reach Ligue 1 and win the Coupe de France.',
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
