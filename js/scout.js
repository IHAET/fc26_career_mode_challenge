/*
 * Wonderkid scout: young players from every club's real squad (squads.js),
 * best prospects first. There are no ratings or potentials here (those are
 * EA's), so prospects are ranked by a few honest signals: a hand-picked list
 * of widely rated young talents, how young they are, and the level of the
 * club that has them in its first team.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  // Young players widely rated among the best of their age as FC 26 launched (summer 2025).
  const KNOWN = [
    'Lamine Yamal', 'Pau Cubarsí', 'Gavi', 'Marc Bernal', 'Endrick', 'Franco Mastantuono', 'Arda Güler', 'Dean Huijsen',
    'Kenan Yıldız', 'Warren Zaïre-Emery', 'Désiré Doué', 'Senny Mayulu', 'Ibrahim Mbaye', 'Estêvão', 'Ethan Nwaneri',
    'Myles Lewis-Skelly', 'Max Dowman', 'Kobbie Mainoo', 'Leny Yoro', 'Chido Obi', 'Alejandro Garnacho', 'Jobe Bellingham',
    'Rodrigo Mora', 'Geovany Quenda', 'Lennart Karl', 'Aleksandar Pavlović', 'Tom Bischof', 'Paris Brunner', 'Assan Ouédraogo',
    'Nico Paz', 'Claudio Echeverri', 'Eli Junior Kroupi', 'Ayyoub Bouaddi', 'Mikey Moore', 'Lucas Bergvall', 'Archie Gray',
    'Rio Ngumoha', 'Trey Nyoni', 'Tyler Dibling', 'Kendry Páez', 'Vitor Roque', 'Mathys Tel', 'Jorrel Hato', 'Kees Smit',
    'Antonio Nusa', 'Christos Mouzakitis', 'Konstantinos Karetsas', 'Mamadou Sarr', 'Yan Diomande', 'Cavan Sullivan',
    'Benjamin Cremaschi', 'Julio Enciso', 'Valentín Barco', 'João Neves', 'Samu Aghehowa', 'Savinho', 'Jamie Gittens',
    'Rico Lewis', 'Adam Wharton', 'Wilson Odobert', 'Cristhian Mosquera', 'Ayman Kari',
  ];

  const GROUPS = {
    GK: ['GK'], DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB'], MID: ['CDM', 'CM', 'CAM', 'LM', 'RM'], ATT: ['LW', 'RW', 'ST', 'CF'],
  };

  let pool = null; // built on first use

  function buildPool() {
    const DB = FC26.playerDB;
    const C = FC26.compliance;
    const clubs = (FC26.squads && FC26.squads.clubs) || {};
    const meta = new Map(((FC26.generator && FC26.generator.CLUBS) || []).map((c) => [c.name, c]));
    const known = new Set(KNOWN.map((n) => DB.key(n)));
    const byKey = new Map();
    Object.entries(clubs).forEach(([club, rows]) => {
      const m = meta.get(club) || {};
      rows.forEach(([name, pos, dob, nat, loan]) => {
        if (!dob) return; // no age, no way to call them young
        const k = DB.key(name);
        const id = `${k}|${dob}`;
        const have = byKey.get(id);
        // A loanee is listed at both clubs: scout him where he's playing.
        if (have && (loan === 'out' || have.loan !== 'out')) return;
        byKey.set(id, {
          key: k, name, pos, dob, nat: C ? C.normNat(nat) : nat, club, loan: loan || '',
          tier: m.tier || 1, level: m.level || 1, league: m.league || '', leagueId: m.leagueId || '', known: known.has(k),
        });
      });
    });
    return Array.from(byKey.values());
  }

  /**
   * Prospects for a day ("YYYY-MM-DD"), best first. Options:
   *   maxAge (21), group ('GK' | 'DEF' | 'MID' | 'ATT' | ''), leagueId, query (name, club or nationality),
   *   exclude (Set of name keys, e.g. your squad).
   * Each: { name, pos, age, nat, club, league, leagueId, known, loan, score }.
   */
  function prospects(day, options) {
    const DB = FC26.playerDB;
    const o = Object.assign({ maxAge: 21, group: '', leagueId: '', query: '', exclude: new Set() }, options);
    if (!pool) pool = buildPool();
    const q = DB.key(o.query || '');
    const allowed = o.group && GROUPS[o.group];
    const out = [];
    pool.forEach((p) => {
      const age = DB.ageOn(p.dob, day);
      if (!(age >= 15 && age <= o.maxAge)) return;
      if (allowed && !allowed.includes(p.pos)) return;
      if (o.leagueId && p.leagueId !== o.leagueId) return;
      if (o.exclude.has(p.key)) return;
      if (q && !DB.key(`${p.name} ${p.club} ${p.nat} ${p.league}`).includes(q)) return;
      // Hand-picked talents first, then youth, then the level of the club that has him.
      const score = (p.known ? 100 : 0) + (22 - age) * 3 + p.tier * 8 + (p.level === 1 ? 6 : 0) + (p.loan === 'out' ? -2 : 0);
      out.push({ name: p.name, pos: p.pos, age, nat: p.nat, club: p.club, league: p.league, leagueId: p.leagueId, known: p.known, loan: p.loan, score });
    });
    return out.sort((a, b) => b.score - a.score || a.age - b.age || a.name.localeCompare(b.name));
  }

  FC26.scout = { prospects, KNOWN, GROUPS };
})(typeof window !== 'undefined' ? window : globalThis);
