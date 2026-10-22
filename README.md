# FC 26 Career Challenge Builder

A web app that generates random **EA SPORTS FC 26 Career Mode** challenges, each with a club, a theme, rules, a season-by-season roadmap, random events, a final goal and a scoring system.

## Features

- **14 challenge types**: Road to Glory, Youth Revolution, Moneyball, Fallen Giant, Homegrown Heroes, Loan Army, Journeyman, Galácticos, Underdog in Europe, One Nation, Dad's Army, Wonderkid Factory, Pure Chaos and Club Heritage.
- **Club Heritage**: hand-written challenges for 30 clubs, based on their real history. Examples: Athletic Club's Basque-only *La Cantera*, Celtic's all-Scottish *Lisbon Lions*, Arsenal's *Invincibles*, Leverkusen's *Neverlosen*, Benfica's *Guttmann's Curse* and Wrexham's fourth straight promotion. Clubs that have one are marked 🏛️ in the club picker.
- **264 clubs** from 13 leagues (2025/26 season): Premier League down to League Two, LALIGA, Serie A, Bundesliga, Ligue 1, Eredivisie, Liga Portugal, Scottish Premiership, MLS and the Saudi league.
- **Pick a specific club** or filter by league and club size.
- **4 difficulties** (Casual → Legendary) that scale fee caps, wage caps, rating limits, number of rules, season targets, events and fail conditions to the club's size and division.
- **Lock & reroll**: lock the club, challenge type, length, difficulty or any rule, then reroll everything else. You can also swap a single rule.
- **Seeds**: the same seed and options always give the same challenge.
- **Share links**: a short URL rebuilds the exact challenge, including locks and swapped rules.
- **Copy as text** for Reddit or Discord.
- **My Challenges**: save challenges in your browser, tick off objectives and track your score (trophies and rule breaks).

## Run it

No build step and no dependencies. Open `index.html` in a browser, or serve the folder:

```sh
npm start        # python3 -m http.server 8080 → http://localhost:8080
```

It also works on GitHub Pages as-is.

## Tests

```sh
npm test         # node --test (Node 18+)
```

## Project layout

| File | What's in it |
| --- | --- |
| `js/data.js` | Leagues, clubs (with a 1–5 size tier), nations, formations |
| `js/heritage.js` | Club Heritage challenges, one per club, with the club's history |
| `js/rules.js` | Challenge types, the extra-rule pool, side objectives, season events |
| `js/generator.js` | Seeded generator (no DOM, runs in Node too), share keys, text export |
| `js/app.js` | UI: options form, challenge card, locks, saving, sharing |
| `styles.css` | Styling (responsive down to phone width) |

To add a heritage challenge, add an entry to `js/heritage.js` keyed by the club's name as written in `js/data.js`.

To add a rule, append an entry to `rules` in `js/rules.js`. Rules that share a `tag` never appear together, and a challenge type's `blockTags` keeps out rules that would clash with its core rules.

---

Fan-made, not affiliated with EA SPORTS. Club sizes are approximate.
