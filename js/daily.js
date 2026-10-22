/*
 * Daily challenge: everyone gets the same challenge on a given date, seeded
 * from the date itself, plus a check-in streak. Pure logic, no DOM.
 *
 * Dates are "YYYY-MM-DD" keys in the player's local time zone, so the
 * daily challenge changes at their midnight.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const G = FC26.generator;

  const DAY_MS = 86400000;
  const EPOCH = Date.UTC(2026, 9, 22); // Daily #1

  // Fixed here (not taken from the user's options) so everyone gets the same challenge.
  const OPTIONS = Object.freeze({
    difficulty: 'random', archetype: 'any', club: 'any', league: 'any', tier: 'any',
    seasons: 'auto', ruleCount: 'auto', events: true,
  });

  const pad = (n) => String(n).padStart(2, '0');

  function dateKey(date) {
    const d = date || new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function isKey(key) {
    return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key);
  }

  function keyToUtc(key) {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  }

  function shiftKey(key, days) {
    const d = new Date(keyToUtc(key) + days * DAY_MS);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }

  function number(key) {
    return Math.round((keyToUtc(key) - EPOCH) / DAY_MS) + 1;
  }

  function challenge(key) {
    const ch = G.generateChallenge(OPTIONS, `daily-${key}`);
    ch.daily = { date: key, number: number(key) };
    return ch;
  }

  /**
   * Streaks from a list of check-in date keys. The current streak still
   * counts if the last check-in was yesterday (today isn't over yet).
   */
  function streak(days, today) {
    const set = new Set((days || []).filter(isKey));
    let current = 0;
    let k = set.has(today) ? today : shiftKey(today, -1);
    while (set.has(k)) {
      current += 1;
      k = shiftKey(k, -1);
    }
    let best = 0;
    let run = 0;
    let prev = null;
    Array.from(set).sort().forEach((key) => {
      run = prev && shiftKey(prev, 1) === key ? run + 1 : 1;
      best = Math.max(best, run);
      prev = key;
    });
    return { current, best, checkedInToday: set.has(today) };
  }

  /** Milliseconds until the next local midnight. */
  function msUntilTomorrow(now) {
    const d = now || new Date();
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    return next - d;
  }

  FC26.daily = { OPTIONS, EPOCH, dateKey, isKey, shiftKey, number, challenge, streak, msUntilTomorrow };
})(typeof window !== 'undefined' ? window : globalThis);
