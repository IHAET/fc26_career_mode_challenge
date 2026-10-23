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
      id: 'eng3', name: 'EFL League One', noArticle: true, country: 'England', nationality: 'English', level: 3, cup: 'FA Cup',
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
      id: 'eng4', name: 'EFL League Two', noArticle: true, country: 'England', nationality: 'English', level: 4, cup: 'FA Cup',
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
    {
      id: 'ger2', name: '2. Bundesliga', country: 'Germany', nationality: 'German', level: 2, cup: 'DFB-Pokal',
      clubs: [
        ['FC Schalke 04', 2], ['Hertha BSC', 2], ['Hannover 96', 1], ['1. FC Kaiserslautern', 1],
        ['Fortuna Düsseldorf', 1], ['1. FC Nürnberg', 1], ['Karlsruher SC', 1], ['SC Paderborn 07', 1],
        ['SV Darmstadt 98', 1], ['1. FC Magdeburg', 1], ['SV Elversberg', 1], ['Holstein Kiel', 1],
        ['VfL Bochum', 1], ['SpVgg Greuther Fürth', 1], ['Preußen Münster', 1], ['Eintracht Braunschweig', 1],
        ['Arminia Bielefeld', 1], ['Dynamo Dresden', 1],
      ],
    },
    {
      id: 'ita2', name: 'Serie B', noArticle: true, country: 'Italy', nationality: 'Italian', level: 2, cup: 'Coppa Italia',
      clubs: [
        ['Monza', 2], ['Palermo', 2], ['Venezia', 1], ['Empoli', 1], ['Sampdoria', 1], ['Bari', 1],
        ['Spezia', 1], ['Modena', 1], ['Cesena', 1], ['Catanzaro', 1], ['Juve Stabia', 1], ['Südtirol', 1],
        ['Carrarese', 1], ['Reggiana', 1], ['Mantova', 1], ['Frosinone', 1], ['Padova', 1],
        ['Virtus Entella', 1], ['Avellino', 1], ['Pescara', 1],
      ],
    },
    {
      id: 'esp2', name: 'LALIGA HYPERMOTION', noArticle: true, country: 'Spain', nationality: 'Spanish', level: 2, cup: 'Copa del Rey',
      clubs: [
        ['UD Las Palmas', 1], ['CD Leganés', 1], ['Real Valladolid', 1], ['Deportivo de La Coruña', 1],
        ['Sporting Gijón', 1], ['Racing Santander', 1], ['Málaga CF', 1], ['Real Zaragoza', 1],
        ['UD Almería', 1], ['Cádiz CF', 1], ['SD Eibar', 1], ['Granada CF', 1], ['SD Huesca', 1],
        ['CD Mirandés', 1], ['Albacete', 1], ['Burgos CF', 1], ['CD Castellón', 1], ['Córdoba CF', 1],
        ['FC Andorra', 1], ['AD Ceuta', 1], ['Cultural Leonesa', 1], ['Real Sociedad B', 1],
      ],
    },
    {
      id: 'fra2', name: 'Ligue 2', noArticle: true, country: 'France', nationality: 'French', level: 2, cup: 'Coupe de France',
      clubs: [
        ['AS Saint-Étienne', 2], ['Montpellier HSC', 1], ['Stade de Reims', 1], ['SC Bastia', 1],
        ['EA Guingamp', 1], ['Stade Lavallois', 1], ['FC Annecy', 1], ['Grenoble Foot 38', 1],
        ['Amiens SC', 1], ['Pau FC', 1], ['Rodez AF', 1], ['Red Star FC', 1], ['ES Troyes AC', 1],
        ['Clermont Foot', 1], ['USL Dunkerque', 1], ['Le Mans FC', 1], ['AS Nancy Lorraine', 1], ['US Boulogne', 1],
      ],
    },
    {
      id: 'bel1', name: 'Belgian Pro League', country: 'Belgium', nationality: 'Belgian', level: 1, cup: 'Belgian Cup',
      clubs: [
        ['Club Brugge', 3], ['Union Saint-Gilloise', 3], ['RSC Anderlecht', 3], ['KRC Genk', 3],
        ['Royal Antwerp', 2], ['KAA Gent', 2], ['Standard Liège', 2], ['KV Mechelen', 1], ['KVC Westerlo', 1],
        ['Cercle Brugge', 1], ['Sporting Charleroi', 1], ['OH Leuven', 1], ['Sint-Truidense VV', 1],
        ['FCV Dender EH', 1], ['RAAL La Louvière', 1], ['SV Zulte Waregem', 1],
      ],
    },
    {
      id: 'tur1', name: 'Süper Lig', country: 'Türkiye', nationality: 'Turkish', level: 1, cup: 'Turkish Cup',
      clubs: [
        ['Galatasaray', 4], ['Fenerbahçe', 4], ['Beşiktaş', 3], ['Trabzonspor', 3], ['Başakşehir', 2],
        ['Samsunspor', 2], ['Göztepe', 2], ['Eyüpspor', 1], ['Kasımpaşa', 1], ['Kocaelispor', 1],
        ['Gençlerbirliği', 1], ['Konyaspor', 1], ['Antalyaspor', 1], ['Alanyaspor', 1], ['Kayserispor', 1],
        ['Çaykur Rizespor', 1], ['Gaziantep FK', 1], ['Fatih Karagümrük', 1],
      ],
    },
    {
      id: 'nor1', name: 'Eliteserien', noArticle: true, country: 'Norway', nationality: 'Norwegian', level: 1, cup: 'Norwegian Cup',
      clubs: [
        ['Bodø/Glimt', 2], ['Brann', 1], ['Viking', 1], ['Rosenborg', 1], ['Molde', 1], ['Fredrikstad', 1],
        ['Sarpsborg 08', 1], ['Vålerenga', 1], ['Tromsø', 1], ['Sandefjord', 1], ['HamKam', 1],
        ['KFUM Oslo', 1], ['Strømsgodset', 1], ['Kristiansund', 1], ['Haugesund', 1], ['Bryne', 1],
      ],
    },
    {
      id: 'den1', name: 'Danish Superliga', country: 'Denmark', nationality: 'Danish', level: 1, cup: 'Danish Cup',
      clubs: [
        ['FC Copenhagen', 2], ['FC Midtjylland', 2], ['Brøndby IF', 2], ['AGF', 1], ['FC Nordsjælland', 1],
        ['Randers FC', 1], ['Silkeborg IF', 1], ['Viborg FF', 1], ['OB', 1], ['Vejle BK', 1],
        ['FC Fredericia', 1], ['Sønderjyske', 1],
      ],
    },
    {
      id: 'aut1', name: 'Austrian Bundesliga', country: 'Austria', nationality: 'Austrian', level: 1, cup: 'ÖFB Cup',
      clubs: [
        ['Red Bull Salzburg', 3], ['Sturm Graz', 2], ['Rapid Wien', 2], ['Austria Wien', 1], ['LASK', 1],
        ['Wolfsberger AC', 1], ['TSV Hartberg', 1], ['Blau-Weiß Linz', 1], ['SCR Altach', 1], ['SV Ried', 1],
        ['WSG Tirol', 1], ['Grazer AK', 1],
      ],
    },
    {
      id: 'rou1', name: 'SuperLiga', country: 'Romania', nationality: 'Romanian', level: 1, cup: 'Cupa României',
      clubs: [
        ['FCSB', 2], ['CFR Cluj', 2], ['Universitatea Craiova', 2], ['Rapid București', 1], ['Dinamo București', 1],
        ['Universitatea Cluj', 1], ['Farul Constanța', 1], ['Petrolul Ploiești', 1], ['UTA Arad', 1], ['Oțelul Galați', 1],
        ['Hermannstadt', 1], ['FC Botoșani', 1], ['Unirea Slobozia', 1], ['Csíkszereda', 1], ['Metaloglobus București', 1],
        ['FC Argeș', 1],
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
