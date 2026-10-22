/*
 * Club Heritage challenges: England (all four EFL/PL divisions).
 * Keyed by the club name used in data.js. Field reference: see the
 * 'club-heritage' archetype in rules.js.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  Object.assign((FC26.heritage = FC26.heritage || {}), {
    // ---------- Premier League ----------
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
    'Everton': {
      name: "Dixie Dean's 60", icon: '🍬',
      tagline: 'Nil satis nisi optimum.',
      history: 'Dixie Dean scored 60 league goals for Everton in 1927–28, a top-flight record that still stands. The Toffees’ last major trophy was the 1995 FA Cup, and in 2025 they left Goodison Park for a new stadium at Bramley-Moore Dock.',
      seasons: [3, 6],
      core: (c) => [
        `Your main striker must score ${c.byD([20, 25, 30, 35])}+ league goals every season, or be sold.`,
        'Never sign a player from Liverpool.',
      ],
      finalGoal: (c) => (c.d >= 3
        ? 'Have a player score 60 league goals in a season and win a major trophy.'
        : `Win Everton's first major trophy since 1995, with a ${c.byD([25, 30, 35, 40])}-goal striker.`),
    },
    'Aston Villa': {
      name: 'Fourteen Men', icon: '🟣',
      tagline: 'Prepared.',
      history: 'Aston Villa won the 1980–81 league title using just 14 players all season, then beat Bayern Munich to win the European Cup in 1982.',
      seasons: [3, 5],
      blockTags: ['rotation', 'squad-size'],
      core: (c) => [
        `No more than ${c.byD([20, 18, 16, 14])} different players may appear in league matches each season.`,
        'No signings in the January window.',
      ],
      finalGoal: () => 'Win the Premier League, then the Champions League the following season.',
    },
    'West Ham United': {
      name: 'Academy of Football', icon: '⚒️',
      tagline: "I'm Forever Blowing Bubbles.",
      history: "West Ham's youth system earned the nickname 'the Academy of Football': Bobby Moore, Geoff Hurst and Martin Peters won the 1966 World Cup, and later graduates include Frank Lampard, Rio Ferdinand, Joe Cole and Michael Carrick. They won the Conference League in 2023.",
      seasons: [4, 7],
      blockTags: ['academy', 'quota'],
      core: (c) => [
        `At least ${c.byD([2, 3, 4, 5])} academy graduates in every matchday squad.`,
        `At least ${c.byD([3, 4, 5, 6])} English players in every starting XI.`,
      ],
      finalGoal: (c) => (c.d >= 3
        ? `Win the Premier League, something West Ham have never done, with ${c.byD([3, 4, 5, 6])}+ academy graduates in the XI.`
        : `Win a major trophy with ${c.byD([3, 4, 5, 6])}+ academy graduates in the starting XI.`),
    },
    'Crystal Palace': {
      name: 'Glad All Over', icon: '🦅',
      tagline: 'South London and proud.',
      history: 'Crystal Palace won the first major trophy in their history in 2025, beating Manchester City 1–0 in the FA Cup final. Their recruitment has leaned on talent from the EFL, with Eberechi Eze arriving from QPR and Michael Olise from Reading.',
      seasons: [3, 6],
      blockTags: ['academy-promote'],
      core: () => [
        'At least half of your signings each window must come from Championship, League One or League Two clubs.',
        'Promote at least one academy player every season.',
      ],
      finalGoal: () => 'Win the FA Cup again and qualify for the Champions League.',
    },
    'Wolverhampton Wanderers': {
      name: 'The Portuguese Pack', icon: '🟠',
      tagline: 'Out of darkness cometh light.',
      history: "Stan Cullis's Wolves won three league titles in the 1950s, the last in 1959, and their floodlit wins over sides like Honvéd helped inspire the European Cup. Under Nuno Espírito Santo from 2017 they built a team around Portuguese players such as Rúben Neves, João Moutinho and Diogo Jota.",
      seasons: [4, 6],
      blockTags: ['origin'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 6])} Portuguese players in every starting XI.`,
        'Sign at least one Portuguese player every summer.',
      ],
      finalGoal: () => 'Win the league for the first time since 1959 with a Portuguese core.',
    },
    'Brentford': {
      name: 'The B Team', icon: '📊',
      tagline: 'Moneyball in west London.',
      history: 'In 2016 Brentford scrapped their academy and replaced it with a B team of players released by other clubs. Using data-led recruitment they reached the top flight in 2021 for the first time since 1947.',
      seasons: [4, 6],
      blockTags: ['academy', 'academy-promote', 'fee'],
      noAcademy: true,
      core: (c) => [
        'No academy promotions: sell or release every youth player.',
        'Every player you sign aged 21 or under must be a free agent.',
        `No single transfer fee above ${c.feeCap()}.`,
      ],
      finalGoal: (c) => `Qualify for Europe and sell a player for ${c.money(c.byD([40, 60, 80, 100]))}+.`,
    },
    'Leeds United': {
      name: 'Bielsa Ball', icon: '⚪',
      tagline: 'Marching On Together.',
      history: "Marcelo Bielsa's relentless pressing and 'murderball' training sessions ended Leeds' 16-year exile from the top flight in 2020. Don Revie's Leeds were champions in 1969 and 1974, and the club's last title came in 1992.",
      seasons: [3, 6],
      blockTags: ['formation', 'squad-size'],
      core: (c) => [
        'Play 4-1-4-1 in every match.',
        `Senior squad capped at ${c.byD([24, 22, 21, 20])} players.`,
      ],
      finalGoal: () => 'Win the league for the first time since 1992.',
    },
    'Sunderland': {
      name: "Sunderland 'Til I Die", icon: '🐈',
      tagline: "Ha'way the Lads.",
      history: 'In 1973 second-tier Sunderland beat the mighty Leeds in the FA Cup final, one of the great shocks. After back-to-back relegations down to League One, they returned to the Premier League through the 2025 play-offs.',
      seasons: [3, 6],
      blockTags: ['avg-age'],
      core: (c) => [
        'Never lose to Newcastle United: every derby defeat counts as a broken rule.',
        `Your starting XI must average ${c.byD([27, 26, 25, 24])} or younger.`,
      ],
      finalGoal: () => 'Win the FA Cup, like the 1973 underdogs, and finish above Newcastle that season.',
    },
    'AFC Bournemouth': {
      name: 'Minus 17', icon: '🍒',
      tagline: 'From the brink to the big time.',
      history: 'Bournemouth began the 2008–09 League Two season on minus 17 points and nearly dropped out of the Football League. Eddie Howe kept them up, then led them all the way to the Premier League in 2015.',
      seasons: [3, 5],
      blockTags: ['fee'],
      core: (c) => [
        'Every season starts on a virtual −17 points: your targets must still be met after taking 17 points off your total.',
        `No single transfer fee above ${c.feeCap()}.`,
      ],
      finalGoal: () => 'Qualify for the Champions League, even with the −17 handicap.',
    },

    // ---------- Championship ----------
    'Leicester City': {
      name: '5000-1', icon: '🦊',
      tagline: 'Dilly ding, dilly dong.',
      history: 'In 2015–16 Leicester City, 5000-1 outsiders, won the Premier League with a cheap, counter-attacking 4-4-2 built around Vardy, Mahrez and Kanté.',
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
    'Ipswich Town': {
      name: "Ramsey's Miracle", icon: '🚜',
      tagline: 'Up and champions at the first attempt.',
      history: 'Alf Ramsey took Ipswich up as Second Division champions in 1961, then won the First Division in 1961–62, their first ever top-flight season. Bobby Robson later won the 1981 UEFA Cup with them.',
      seasons: [2, 4],
      forcePromotion: true,
      blockTags: ['origin', 'count'],
      seasonGoal: (c, s) => (s === 2 ? 'Win the Premier League in your first season up, as Ramsey did in 1962.' : null),
      core: (c) => [
        'Only sign players from England, Scotland, Wales or Ireland.',
        `No more than ${c.byD([5, 4, 3, 2])} signings per window.`,
      ],
      finalGoal: () => 'Win promotion, then the Premier League at the first attempt.',
    },
    'Southampton': {
      name: 'Staplewood Academy', icon: '😇',
      tagline: 'Made in Southampton.',
      history: "Southampton's academy produced Gareth Bale, Theo Walcott, Alex Oxlade-Chamberlain, Adam Lallana, Luke Shaw and James Ward-Prowse. In 1976, as a Second Division side, they beat Manchester United to win the FA Cup.",
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['academy'],
      core: (c) => [
        `At least ${c.byD([3, 4, 5, 6])} academy graduates in every matchday squad.`,
        `Sell an academy graduate for ${c.money(c.byD([20, 30, 40, 50]))}+ at least once every three seasons.`,
      ],
      finalGoal: () => 'Win promotion and the FA Cup, with academy graduates making up half your starting XI.',
    },
    'Watford': {
      name: 'Taylor & Elton', icon: '🎹',
      tagline: 'From the Fourth Division to the First.',
      history: 'With Elton John as chairman, Graham Taylor took Watford from the Fourth Division in 1977 to second place in the First Division in 1982–83, their first top-flight season, and on to the 1984 FA Cup final.',
      seasons: [2, 4],
      forcePromotion: true,
      blockTags: ['formation', 'quota'],
      seasonGoal: (c, s) => (s === 2 ? "Finish in the top two of the Premier League in your first season up, like Taylor's 1983 side." : null),
      core: (c) => [
        'Play 4-4-2 (Flat) in every match.',
        `At least ${c.byD([3, 4, 5, 6])} English players in every starting XI.`,
      ],
      finalGoal: () => 'Win promotion, finish in the top two in your first top-flight season, then reach the FA Cup final.',
    },
    'Blackburn Rovers': {
      name: "Uncle Jack's Millions", icon: '🌹',
      tagline: 'Arte et labore.',
      history: "Steel magnate Jack Walker bankrolled Blackburn's rise, breaking the British transfer record for Alan Shearer in 1992. Shearer and Chris Sutton, the 'SAS', fired Rovers to the 1994–95 Premier League title.",
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['formation'],
      core: (c) => [
        'Play with two strikers in every match.',
        `Break your club's transfer record for a striker at least once every ${c.byD([3, 2, 2, 1])} season(s).`,
      ],
      finalGoal: () => 'Win promotion, then the Premier League with a strike pair scoring 40+ league goals between them.',
    },
    'Preston North End': {
      name: 'The Original Invincibles', icon: '🐑',
      tagline: 'The first champions of England.',
      history: 'In 1888–89 Preston won the first ever Football League title without losing a match, and the FA Cup without conceding a goal: the first double and the original Invincibles.',
      seasons: [3, 6],
      blockTags: ['sim'],
      core: (c) => [
        'Play every league match: no simming.',
        `Lose no more than ${c.byD([6, 5, 4, 3])} league matches in any season.`,
      ],
      finalGoal: () => 'Go a whole league season unbeaten and win the FA Cup in the same season.',
    },
    'Birmingham City': {
      name: 'The 111 Club', icon: '📈',
      tagline: 'Keep right on.',
      history: 'Backed by new owners and NFL legend Tom Brady, Birmingham won League One in 2024–25 with 111 points, a record for English professional football.',
      seasons: [2, 4],
      forcePromotion: true,
      core: (c) => [
        `Earn at least ${c.byD([1.7, 1.9, 2.0, 2.1])} points per league game every season.`,
        `Score ${c.byD([60, 70, 80, 90])}+ league goals every season.`,
      ],
      finalGoal: () => 'Win the Championship with 100+ points, then finish in the top half of the Premier League.',
    },
    'Swansea City': {
      name: 'Swansealona', icon: '🦢',
      tagline: 'Pass, pass, pass.',
      history: 'Swansea avoided dropping out of the Football League on the final day of the 2002–03 season. Eight years later, playing patient passing football, they became the first Welsh club in the Premier League, and in 2013 they won the League Cup.',
      seasons: [3, 5],
      forcePromotion: true,
      core: (c) => [
        `Average ${c.byD([55, 58, 60, 62])}%+ possession over every league season.`,
        `At least ${c.byD([1, 2, 2, 3])} Welsh player(s) in every matchday squad.`,
      ],
      finalGoal: () => 'Reach the Premier League and win the League Cup.',
    },
    'Portsmouth': {
      name: 'Play Up Pompey', icon: '⚓',
      tagline: 'From FA Cup winners to the fourth tier and back.',
      history: 'Portsmouth won the FA Cup in 2008, then became the first Premier League club to go into administration in 2010. They fell to League Two, were rescued by their own fans in 2013, and returned to the Championship in 2024.',
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['wage', 'profit'],
      core: (c) => [
        `No player may earn more than ${c.wageCap()}/week.`,
        'Finish every season with a positive net transfer spend.',
      ],
      finalGoal: () => 'Reach the Premier League and win the FA Cup without ever posting a negative net spend.',
    },

    // ---------- League One ----------
    'Cardiff City': {
      name: 'The Cup Leaves England', icon: '🐦',
      tagline: 'The only FA Cup to leave England.',
      history: 'In 1927 Cardiff City beat Arsenal to become the only club from outside England ever to win the FA Cup.',
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['quota'],
      core: (c) => [
        `At least ${c.byD([2, 3, 4, 5])} Welsh players in every starting XI.`,
        'Sign at least one Welsh player every summer.',
      ],
      finalGoal: () => 'Reach the Premier League and win the FA Cup with a Welsh-majority starting XI.',
    },
    'Bolton Wanderers': {
      name: "Big Sam's Bolton", icon: '🧓',
      tagline: 'Experience is everything.',
      history: 'Sam Allardyce built a Bolton side full of veteran stars on cheap deals, including Jay-Jay Okocha, Youri Djorkaeff, Fernando Hierro and Iván Campo, and took them into the UEFA Cup in 2005.',
      seasons: [4, 6],
      forcePromotion: true,
      blockTags: ['age', 'fee', 'avg-age'],
      core: (c) => [
        `Every signing must be aged ${c.byD([29, 30, 31, 32])} or older.`,
        'Free transfers and loans only: no transfer fees.',
      ],
      finalGoal: () => 'Reach the Premier League and qualify for Europe with a starting XI averaging 30+.',
    },
    'Huddersfield Town': {
      name: "Chapman's Three in a Row", icon: '🐶',
      tagline: 'The first to win three titles in a row.',
      history: 'Under Herbert Chapman, Huddersfield became the first English club to win three consecutive league titles, in 1924, 1925 and 1926.',
      seasons: [5, 7],
      forcePromotion: true,
      blockTags: ['squad-size', 'loans'],
      seasonGoal: (c, s) => {
        const first = c.seasons - 2;
        return s >= first && s >= c.club.level ? `Win the Premier League (${s - first + 1} of 3 in a row).` : null;
      },
      core: (c) => [
        `Senior squad capped at ${c.byD([24, 22, 21, 20])} players.`,
        'No loan signings.',
      ],
      finalGoal: () => 'Reach the Premier League and win three titles in a row.',
    },
    'Wigan Athletic': {
      name: 'Cup Kings', icon: '🏆',
      tagline: 'They did it in 2013.',
      history: 'Wigan only joined the Football League in 1978. In 2013 they beat Manchester City to win the FA Cup and were relegated from the Premier League days later, the only club to win the Cup and go down in the same season.',
      seasons: [3, 6],
      blockTags: ['sim'],
      core: () => [
        'Play your strongest XI in every FA Cup match.',
        'Play every FA Cup match yourself: no simming.',
      ],
      finalGoal: () => 'Win the FA Cup as a club outside the Premier League.',
    },
    'Barnsley': {
      name: 'Just Like Watching Brazil', icon: '🎶',
      tagline: "It's just like watching Brazil!",
      history: "During Barnsley's only Premier League season, 1997–98, their fans famously sang 'It's just like watching Brazil'.",
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['origin'],
      core: (c) => [
        `At least ${c.byD([2, 2, 3, 3])} Brazilian players in every starting XI.`,
        `Score ${c.byD([60, 70, 75, 80])}+ league goals every season.`,
      ],
      finalGoal: () => 'Reach the Premier League and finish in the top half with Brazilian flair.',
    },
    'Bradford City': {
      name: 'Giant-killers', icon: '⚔️',
      tagline: 'Fourth tier, Wembley final.',
      history: 'In 2013 Bradford became the first fourth-tier club to reach a major final at Wembley, knocking Arsenal and Aston Villa out of the League Cup on the way.',
      seasons: [3, 5],
      blockTags: ['fee'],
      core: (c) => [
        'Play your strongest XI in every League Cup and FA Cup match.',
        `No single transfer fee above ${c.feeCap()}.`,
      ],
      finalGoal: () => 'Win the League Cup while still outside the Premier League.',
    },
    'Blackpool': {
      name: 'The Matthews Final', icon: '🎡',
      tagline: 'Age is just a number.',
      history: "In the 1953 'Matthews Final', 38-year-old Stanley Matthews inspired Blackpool's comeback from 3–1 down to beat Bolton 4–3 in the FA Cup. Matthews kept playing top-flight football until he was 50.",
      seasons: [3, 6],
      forcePromotion: true,
      core: (c) => [
        `A player aged ${c.byD([33, 34, 35, 36])}+ must start every league match.`,
        'Your oldest outfield player takes every free kick and corner.',
      ],
      finalGoal: () => 'Reach the Premier League and win the FA Cup with a 35+ player in your starting XI.',
    },
    'AFC Wimbledon': {
      name: 'The Crazy Gang', icon: '🤪',
      tagline: 'Founded by fans, for fans.',
      history: "When Wimbledon FC were allowed to relocate to Milton Keynes in 2002, fans founded AFC Wimbledon in the ninth tier. They reached the Football League in 2011 and League One in 2025. The original 'Crazy Gang' beat Liverpool in the 1988 FA Cup final.",
      seasons: [4, 7],
      forcePromotion: true,
      blockTags: ['formation', 'wage'],
      core: (c) => [
        'Play 4-4-2 (Flat) in every match.',
        `No player may earn more than ${c.wageCap()}/week.`,
      ],
      finalGoal: () => 'Reach the Premier League and win the FA Cup, like the 1988 Crazy Gang.',
    },
    'Luton Town': {
      name: 'Kenilworth Road', icon: '🎩',
      tagline: 'Non-league to the Premier League.',
      history: 'Luton spent five seasons in non-league football from 2009 before climbing all the way to the Premier League in 2023, still playing at tiny Kenilworth Road. Back-to-back relegations followed in 2024 and 2025.',
      seasons: [3, 6],
      forcePromotion: true,
      blockTags: ['wage', 'sim'],
      core: (c) => [
        `No player may earn more than ${c.wageCap()}/week.`,
        'Play every home league match yourself: no simming at Kenilworth Road.',
      ],
      finalGoal: () => 'Get back to the Premier League and stay this time: finish in the top half.',
    },
    'Exeter City': {
      name: "Brazil's First Opponent", icon: '🌴',
      tagline: 'Fan-owned and proud.',
      history: "In 1914 Exeter City, on tour in South America, played the Brazil national team's first ever match. Today the club is owned by its supporters' trust.",
      seasons: [3, 6],
      blockTags: ['wage'],
      core: (c) => [
        'Sign at least one Brazilian player every season.',
        `No player may earn more than ${c.wageCap()}/week.`,
      ],
      finalGoal: (c) => (c.d >= 3
        ? 'Reach the Premier League with a Brazilian as your top scorer.'
        : 'Reach the Championship with a Brazilian as your top scorer.'),
    },

    // ---------- League Two ----------
    'Notts County': {
      name: 'The Oldest of Them All', icon: '🕰️',
      tagline: 'Founded 1862.',
      history: 'Notts County, founded in 1862, are the oldest professional football club in the world. In 1903 Juventus borrowed their black-and-white striped shirts and still wear them today.',
      seasons: [4, 7],
      forcePromotion: true,
      blockTags: ['academy-promote'],
      core: () => [
        'Sign at least one Italian player every season.',
        'Promote at least one academy player every season.',
      ],
      finalGoal: () => 'Reach the Premier League and sign a player from Juventus.',
    },
    'Accrington Stanley': {
      name: 'Who Are They?', icon: '🥛',
      tagline: 'Accrington Stanley? Who are they? Exactly.',
      history: "The original Accrington Stanley resigned from the Football League in 1962 and later folded. The reformed club worked its way back into the League in 2006, and is still remembered for a 1980s milk advert: 'Accrington Stanley? Who are they?' 'Exactly.'",
      seasons: [4, 7],
      blockTags: ['wage', 'squad-size'],
      core: (c) => [
        `No player may earn more than ${c.wageCap()}/week.`,
        `Senior squad capped at ${c.byD([24, 22, 21, 20])} players.`,
      ],
      finalGoal: (c) => (c.d >= 3
        ? 'Reach the Premier League.'
        : 'Reach the Championship and knock a Premier League club out of the FA Cup.'),
    },
    'Salford City': {
      name: "The Class of '92 Club", icon: '🤝',
      tagline: "Owned by the Class of '92.",
      history: 'Gary Neville, Ryan Giggs, Paul Scholes, Nicky Butt and Phil Neville bought non-league Salford City in 2014, with David Beckham joining later. The club reached the Football League for the first time in 2019.',
      seasons: [5, 8],
      forcePromotion: true,
      blockTags: ['academy-promote'],
      core: (c) => [
        'Sign at least one current or former Manchester United player every season (loans count).',
        `Promote at least ${c.byD([1, 2, 2, 3])} academy player(s) every season.`,
      ],
      finalGoal: () => 'Reach the Premier League and beat Manchester United.',
    },
    'Crewe Alexandra': {
      name: "Gradi's Academy", icon: '🚂',
      tagline: "Develop, don't buy.",
      history: 'Dario Gradi managed Crewe for 24 years from 1983, turning a tiny club into one of England’s best talent factories and producing players such as Danny Murphy and Dean Ashton.',
      seasons: [4, 7],
      blockTags: ['fee', 'academy'],
      core: (c) => [
        'No transfer fees: free agents, loans and academy players only.',
        `At least ${c.byD([3, 4, 5, 6])} academy graduates in every matchday squad.`,
      ],
      finalGoal: (c) => `Reach the Championship and sell an academy graduate for ${c.money(c.byD([5, 10, 15, 20]))}+.`,
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
