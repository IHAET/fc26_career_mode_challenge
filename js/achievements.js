/*
 * Achievements: badges earned from your saved challenges, worked out fresh
 * from the saves each time (nothing extra is stored, so they sync for free).
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});

  const num = (v) => Number(v) || 0;
  const players = (e) => ((e.tracker && e.tracker.players) || []);
  const transfers = (e) => ((e.tracker && e.tracker.transfers) || []);
  const logs = (e) => Object.values(e.log || {}).filter((l) => l && typeof l === 'object');
  const ticked = (e) => Object.values(e.progress || {}).filter(Boolean).length;
  const objectiveCount = (e) => e.challenge.roadmap.reduce((n, s) => n + s.objectives.length, 0) + 1;
  const isMid = (text) => /^Mid-season\b/i.test(String(text));

  // Each: id, icon, name, what to do, and test(entries, ctx) → true, or [have, need] for progress.
  const DEFS = [
    { id: 'first-save', icon: '💾', name: 'Signed on', desc: 'Save your first challenge.', test: (es) => [es.length, 1] },
    { id: 'heritage', icon: '🏛️', name: 'History buff', desc: 'Save a Club Heritage challenge.', test: (es) => es.some((e) => e.challenge.archetype.id === 'club-heritage') },
    { id: 'player', icon: '🎽', name: 'Boots on', desc: 'Save a Player Career challenge.', test: (es) => es.some((e) => e.challenge.mode === 'player') },
    { id: 'legendary', icon: '💀', name: 'Glutton for punishment', desc: 'Save a Legendary challenge.', test: (es) => es.some((e) => num(e.challenge.difficulty) === 4) },
    { id: 'leagues', icon: '🌍', name: 'Globetrotter', desc: 'Save challenges in 5 different leagues.', test: (es) => [new Set(es.map((e) => e.challenge.club.leagueId || e.challenge.club.league).filter(Boolean)).size, 5] },
    { id: 'romania', icon: '🇷🇴', name: 'Romanian rhapsody', desc: 'Save a SuperLiga challenge.', test: (es) => es.some((e) => e.challenge.club.leagueId === 'rou1') },
    { id: 'drama', icon: '🔥', name: 'Drama magnet', desc: 'Save a challenge with 3 or more mid-season dramas.', test: (es) => es.some((e) => e.challenge.roadmap.flatMap((s) => s.events || []).filter(isMid).length >= 3) },
    { id: 'tracked', icon: '📒', name: 'Paperwork done', desc: 'Track a squad of 11 or more players.', test: (es) => es.some((e) => players(e).filter((p) => !p.loanedOut).length >= 11) },
    { id: 'market', icon: '🔁', name: 'Wheeler-dealer', desc: 'Log 10 transfers.', test: (es) => [es.reduce((n, e) => n + transfers(e).length, 0), 10] },
    { id: 'regen', icon: '🧬', name: 'Regen hunter', desc: 'Sign a regen.', test: (es) => es.some((e) => transfers(e).some((t) => t.dir === 'in' && t.regen)) },
    { id: 'objectives', icon: '✅', name: 'Box ticker', desc: 'Tick off 10 objectives.', test: (es) => [es.reduce((n, e) => n + ticked(e), 0), 10] },
    { id: 'complete', icon: '🎯', name: 'Mission accomplished', desc: 'Tick every objective in a challenge.', test: (es) => es.some((e) => ticked(e) >= objectiveCount(e)) },
    { id: 'diary', icon: '📓', name: 'Dear diary', desc: "Log a season's finish in the diary.", test: (es) => es.some((e) => logs(e).some((l) => String(l.finish || '').trim())) },
    { id: 'trophy', icon: '🏆', name: 'Silverware', desc: 'Log a trophy.', test: (es) => es.some((e) => logs(e).some((l) => num(l.trophies) > 0)) },
    { id: 'cabinet', icon: '🗄️', name: 'Trophy cabinet', desc: 'Log 10 trophies across your saves.', test: (es) => [es.reduce((n, e) => n + logs(e).reduce((m, l) => m + num(l.trophies), 0), 0), 10] },
    { id: 'treble', icon: '👑', name: 'Treble', desc: 'Log 3 trophies in one season.', test: (es) => es.some((e) => logs(e).some((l) => num(l.trophies) >= 3)) },
    { id: 'clean', icon: '✨', name: 'By the book', desc: 'Log 5+ transfers in a challenge without breaking a rule.', test: (es, ctx) => es.some((e) => transfers(e).length >= 5 && ctx.broken(e) === 0) },
    { id: 'daily', icon: '📅', name: 'Habit forming', desc: 'Check the daily challenge 3 days in a row.', test: (es, ctx) => [num(ctx.dailyBest), 3] },
    { id: 'soundtrack', icon: '🎧', name: 'Matchday playlist', desc: 'Make a Spotify soundtrack for a save.', test: (es) => es.some((e) => e.soundtrack && e.soundtrack.url) },
  ];

  /**
   * Every achievement with whether it's unlocked and, for counted ones, progress.
   * ctx: { broken(entry) → rules broken, dailyBest }
   */
  function evaluate(entries, ctx) {
    const es = (entries || []).filter((e) => e && e.challenge && Array.isArray(e.challenge.roadmap));
    const c = Object.assign({ broken: () => 0, dailyBest: 0 }, ctx);
    return DEFS.map((d) => {
      let r;
      try { r = d.test(es, c); } catch (err) { r = false; }
      const counted = Array.isArray(r);
      const have = counted ? Math.min(r[0], r[1]) : 0;
      return {
        id: d.id, icon: d.icon, name: d.name, desc: d.desc,
        unlocked: counted ? r[0] >= r[1] : Boolean(r),
        progress: counted && r[1] > 1 ? { have, need: r[1] } : null,
      };
    });
  }

  FC26.achievements = { evaluate, DEFS };
})(typeof window !== 'undefined' ? window : globalThis);
