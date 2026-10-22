/*
 * Static data for the FC 26 Career Challenge Builder.
 *
 * Club lists follow the 2025/26 season. Tiers are a rough guide to club
 * strength (5 = European giant, 1 = minnow) and only drive how hard the
 * generated targets and limits are, so they don't need to be exact.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  const leagues = [
    {
      id: 'eng1', name: 'Premier League', country: 'England', nationality: 'English', level: 1, cup: 'FA Cup',
      clubs: [
        ['Arsenal', 5], ['Liverpool', 5], ['Manchester City', 5], ['Chelsea', 5],
        ['Manchester United', 4], ['Tottenham Hotspur', 4], ['Newcastle United', 4], ['Aston Villa', 4],
        ['Brighton & Hove Albion', 3], ['Nottingham Forest', 3], ['Crystal Palace', 3], ['AFC Bournemouth', 3],
        ['Brentford', 3], ['Fulham', 3], ['West Ham United', 3], ['Everton', 3],
        ['Wolverhampton Wanderers', 2], ['Leeds United', 2], ['Burnley', 2], ['Sunderland', 2],
      ],
    },
    {
      id: 'eng2', name: 'EFL Championship', country: 'England', nationality: 'English', level: 2, cup: 'FA Cup',
      clubs: [
        ['Leicester City', 2], ['Southampton', 2], ['Ipswich Town', 2], ['Sheffield United', 2],
        ['Middlesbrough', 2], ['Coventry City', 2], ['West Bromwich Albion', 2], ['Norwich City', 2],
        ['Watford', 2], ['Wrexham', 2], ['Birmingham City', 2], ['Hull City', 1], ['Stoke City', 1],
        ['Swansea City', 1], ['Millwall', 1], ['Queens Park Rangers', 1], ['Preston North End', 1],
        ['Bristol City', 1], ['Blackburn Rovers', 1], ['Derby County', 1], ['Portsmouth', 1],
        ['Oxford United', 1], ['Sheffield Wednesday', 1], ['Charlton Athletic', 1],
      ],
    },
    {
      id: 'eng3', name: 'EFL League One', country: 'England', nationality: 'English', level: 3, cup: 'FA Cup',
      clubs: [
        ['Luton Town', 1], ['Plymouth Argyle', 1], ['Cardiff City', 1], ['Wigan Athletic', 1],
        ['Bolton Wanderers', 1], ['Huddersfield Town', 1], ['Stockport County', 1], ['Barnsley', 1],
        ['Blackpool', 1], ['Reading', 1], ['Rotherham United', 1], ['Peterborough United', 1],
        ['Lincoln City', 1], ['Wycombe Wanderers', 1], ['Stevenage', 1], ['Leyton Orient', 1],
        ['Mansfield Town', 1], ['Exeter City', 1], ['Burton Albion', 1], ['AFC Wimbledon', 1],
        ['Doncaster Rovers', 1], ['Port Vale', 1], ['Bradford City', 1], ['Northampton Town', 1],
      ],
    },
    {
      id: 'eng4', name: 'EFL League Two', country: 'England', nationality: 'English', level: 4, cup: 'FA Cup',
      clubs: [
        ['Bristol Rovers', 1], ['Shrewsbury Town', 1], ['Crawley Town', 1], ['Cambridge United', 1],
        ['MK Dons', 1], ['Notts County', 1], ['Chesterfield', 1], ['Walsall', 1], ['Grimsby Town', 1],
        ['Salford City', 1], ['Swindon Town', 1], ['Crewe Alexandra', 1], ['Gillingham', 1],
        ['Colchester United', 1], ['Cheltenham Town', 1], ['Tranmere Rovers', 1], ['Accrington Stanley', 1],
        ['Fleetwood Town', 1], ['Harrogate Town', 1], ['Newport County', 1], ['Barrow', 1],
        ['Bromley', 1], ['Oldham Athletic', 1], ['Barnet', 1],
      ],
    },
    {
      id: 'esp1', noArticle: true, name: 'LALIGA EA SPORTS', country: 'Spain', nationality: 'Spanish', level: 1, cup: 'Copa del Rey',
      clubs: [
        ['Real Madrid', 5], ['FC Barcelona', 5], ['Atlético de Madrid', 4], ['Athletic Club', 4],
        ['Villarreal', 4], ['Real Betis', 3], ['Real Sociedad', 3], ['Sevilla', 3], ['Valencia', 3],
        ['Celta Vigo', 3], ['Girona', 3], ['Osasuna', 2], ['Rayo Vallecano', 2], ['RCD Mallorca', 2],
        ['Getafe', 2], ['Espanyol', 2], ['Deportivo Alavés', 2], ['Levante', 1], ['Elche', 1], ['Real Oviedo', 1],
      ],
    },
    {
      id: 'ita1', noArticle: true, name: 'Serie A', country: 'Italy', nationality: 'Italian', level: 1, cup: 'Coppa Italia',
      clubs: [
        ['Inter', 5], ['Napoli', 4], ['Juventus', 4], ['AC Milan', 4], ['Atalanta', 4], ['Roma', 4],
        ['Lazio', 3], ['Fiorentina', 3], ['Bologna', 3], ['Como', 3], ['Torino', 2], ['Udinese', 2],
        ['Genoa', 2], ['Hellas Verona', 2], ['Cagliari', 2], ['Parma', 2], ['Sassuolo', 2],
        ['Lecce', 1], ['Pisa', 1], ['Cremonese', 1],
      ],
    },
    {
      id: 'ger1', name: 'Bundesliga', country: 'Germany', nationality: 'German', level: 1, cup: 'DFB-Pokal',
      clubs: [
        ['FC Bayern München', 5], ['Bayer 04 Leverkusen', 4], ['Borussia Dortmund', 4], ['RB Leipzig', 4],
        ['Eintracht Frankfurt', 4], ['VfB Stuttgart', 3], ['SC Freiburg', 3], ['VfL Wolfsburg', 3],
        ['1. FSV Mainz 05', 3], ['Borussia Mönchengladbach', 3], ['SV Werder Bremen', 3],
        ['TSG Hoffenheim', 3], ['1. FC Union Berlin', 2], ['FC Augsburg', 2], ['FC St. Pauli', 2],
        ['1. FC Köln', 2], ['Hamburger SV', 2], ['1. FC Heidenheim', 1],
      ],
    },
    {
      id: 'fra1', noArticle: true, name: 'Ligue 1', country: 'France', nationality: 'French', level: 1, cup: 'Coupe de France',
      clubs: [
        ['Paris Saint-Germain', 5], ['Olympique de Marseille', 4], ['AS Monaco', 4], ['LOSC Lille', 4],
        ['Olympique Lyonnais', 4], ['OGC Nice', 3], ['RC Lens', 3], ['Stade Rennais', 3],
        ['RC Strasbourg', 3], ['Stade Brestois', 2], ['Toulouse', 2], ['FC Nantes', 2], ['AJ Auxerre', 2],
        ['Paris FC', 2], ['Angers SCO', 1], ['Le Havre', 1], ['FC Lorient', 1], ['FC Metz', 1],
      ],
    },
    {
      id: 'ned1', name: 'Eredivisie', country: 'Netherlands', nationality: 'Dutch', level: 1, cup: 'KNVB Cup',
      clubs: [
        ['PSV', 4], ['Ajax', 4], ['Feyenoord', 4], ['AZ Alkmaar', 3], ['FC Twente', 3], ['FC Utrecht', 3],
        ['NEC Nijmegen', 2], ['Go Ahead Eagles', 2], ['SC Heerenveen', 2], ['Sparta Rotterdam', 2],
        ['Fortuna Sittard', 2], ['FC Groningen', 2], ['PEC Zwolle', 1], ['Heracles Almelo', 1],
        ['NAC Breda', 1], ['Excelsior', 1], ['Telstar', 1], ['FC Volendam', 1],
      ],
    },
    {
      id: 'por1', noArticle: true, name: 'Liga Portugal', country: 'Portugal', nationality: 'Portuguese', level: 1, cup: 'Taça de Portugal',
      clubs: [
        ['SL Benfica', 4], ['FC Porto', 4], ['Sporting CP', 4], ['SC Braga', 3], ['Vitória SC', 2],
        ['FC Famalicão', 2], ['Gil Vicente', 2], ['Moreirense', 1], ['Estoril Praia', 1], ['Rio Ave', 1],
        ['Santa Clara', 1], ['Casa Pia', 1], ['FC Arouca', 1], ['CD Nacional', 1], ['Estrela Amadora', 1],
        ['AVS', 1], ['CD Tondela', 1], ['FC Alverca', 1],
      ],
    },
    {
      id: 'sco1', name: 'Scottish Premiership', country: 'Scotland', nationality: 'Scottish', level: 1, cup: 'Scottish Cup',
      clubs: [
        ['Celtic', 3], ['Rangers', 3], ['Heart of Midlothian', 2], ['Aberdeen', 2], ['Hibernian', 2],
        ['Motherwell', 1], ['Dundee United', 1], ['St Mirren', 1], ['Kilmarnock', 1], ['Dundee', 1],
        ['Falkirk', 1], ['Livingston', 1],
      ],
    },
    {
      id: 'usa1', name: 'MLS', country: 'USA', nationality: 'American', level: 1, cup: 'U.S. Open Cup',
      continental: 'CONCACAF Champions Cup', continentalShort: 'CONCACAF Champions Cup', secondary: 'Leagues Cup',
      // MLS has no relegation, so its season targets read differently.
      goals: [
        'Make the MLS Cup Playoffs',
        'Finish in the top 4 of your conference',
        'Reach the conference final',
        'Win your conference',
        'Win the MLS Cup',
        "Win the MLS Cup and the Supporters' Shield",
        "Win the MLS Cup, the Supporters' Shield and the CONCACAF Champions Cup",
      ],
      clubs: [
        ['Inter Miami CF', 3], ['LAFC', 3], ['LA Galaxy', 2], ['Columbus Crew', 2], ['FC Cincinnati', 2],
        ['Seattle Sounders FC', 2], ['Philadelphia Union', 2], ['Orlando City', 2], ['Atlanta United', 2],
        ['New York City FC', 2], ['New York Red Bulls', 2], ['Vancouver Whitecaps', 2], ['Nashville SC', 2],
        ['Minnesota United', 2], ['Austin FC', 1], ['Charlotte FC', 1], ['Chicago Fire', 1], ['Toronto FC', 1],
        ['CF Montréal', 1], ['D.C. United', 1], ['Houston Dynamo', 1], ['FC Dallas', 1], ['Colorado Rapids', 1],
        ['Portland Timbers', 1], ['Real Salt Lake', 1], ['San Jose Earthquakes', 1], ['Sporting Kansas City', 1],
        ['St. Louis CITY SC', 1], ['New England Revolution', 1], ['San Diego FC', 1],
      ],
    },
    {
      id: 'ksa1', name: 'ROSHN Saudi League', country: 'Saudi Arabia', nationality: 'Saudi', level: 1, cup: "King's Cup",
      continental: 'AFC Champions League Elite', continentalShort: 'AFC Champions League Elite', secondary: 'AFC Champions League Two',
      clubs: [
        ['Al Hilal', 4], ['Al Nassr', 4], ['Al Ittihad', 4], ['Al Ahli', 4], ['Al Qadsiah', 3], ['Al Ettifaq', 2],
        ['Al Shabab', 2], ['Al Taawoun', 2], ['Al Fateh', 1], ['Al Khaleej', 1], ['Al Riyadh', 1], ['Al Fayha', 1],
        ['Al Kholood', 1], ['Al Okhdood', 1], ['Damac', 1], ['Al Hazem', 1], ['Al Najma', 1], ['NEOM SC', 1],
      ],
    },
  ];

  const nations = [
    ['Brazil', 'Brazilian'], ['Argentina', 'Argentine'], ['France', 'French'], ['Spain', 'Spanish'],
    ['Portugal', 'Portuguese'], ['Netherlands', 'Dutch'], ['Germany', 'German'], ['Italy', 'Italian'],
    ['England', 'English'], ['Belgium', 'Belgian'], ['Norway', 'Norwegian'], ['Denmark', 'Danish'],
    ['Sweden', 'Swedish'], ['Japan', 'Japanese'], ['South Korea', 'South Korean'], ['USA', 'American'],
    ['Nigeria', 'Nigerian'], ['Senegal', 'Senegalese'], ['Morocco', 'Moroccan'], ['Ghana', 'Ghanaian'],
    ['Ivory Coast', 'Ivorian'], ['Cameroon', 'Cameroonian'], ['Croatia', 'Croatian'], ['Serbia', 'Serbian'],
    ['Uruguay', 'Uruguayan'], ['Colombia', 'Colombian'], ['Ecuador', 'Ecuadorian'], ['Mexico', 'Mexican'],
    ['Canada', 'Canadian'], ['Scotland', 'Scottish'], ['Wales', 'Welsh'], ['Republic of Ireland', 'Irish'],
    ['Austria', 'Austrian'], ['Switzerland', 'Swiss'], ['Poland', 'Polish'], ['Türkiye', 'Turkish'],
    ['Algeria', 'Algerian'], ['Egypt', 'Egyptian'],
  ].map(([name, adj]) => ({ name, adj }));

  const formations = [
    '4-3-3 (Attack)', '4-3-3 (Holding)', '4-2-3-1 (Wide)', '4-4-2 (Flat)', '4-4-2 (Holding)',
    '4-1-2-1-2 (Narrow)', '4-2-2-2', '4-3-2-1', '4-5-1 (Flat)', '3-5-2', '3-4-3', '3-4-2-1',
    '5-3-2', '5-2-1-2', '4-1-4-1', '3-1-4-2',
  ];

  const regions = [
    'South America', 'Africa', 'Asia or Oceania', 'the Nordic countries', 'Eastern Europe',
    'North & Central America', 'the British Isles', 'the Balkans',
  ];

  const difficulties = [
    { level: 1, name: 'Casual', blurb: 'Relaxed rules, generous targets.' },
    { level: 2, name: 'Pro', blurb: 'A proper test without being cruel.' },
    { level: 3, name: 'World Class', blurb: 'Tight limits, real consequences.' },
    { level: 4, name: 'Legendary', blurb: 'One slip and the save is over.' },
  ];

  const tierNames = { 5: 'Giant', 4: 'Strong', 3: 'Mid-table', 2: 'Underdog', 1: 'Minnow' };

  FC26.data = { leagues, nations, formations, regions, difficulties, tierNames };
})(typeof window !== 'undefined' ? window : globalThis);
