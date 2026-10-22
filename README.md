# FC 26 Career Challenge Builder

A web app that generates random **EA SPORTS FC 26 Career Mode** challenges, each with a club, a theme, rules, a season-by-season roadmap, random events, a final goal and a scoring system.

## Features

- **14 challenge types**: Road to Glory, Youth Revolution, Moneyball, Fallen Giant, Homegrown Heroes, Loan Army, Journeyman, Galácticos, Underdog in Europe, One Nation, Dad's Army, Wonderkid Factory, Pure Chaos and Club Heritage.
- **Club Heritage**: hand-written challenges for 133 clubs, based on their real history, from giants to League Two. Examples: Athletic Club's Basque-only *La Cantera*, Celtic's all-Scottish *Lisbon Lions*, Ipswich's *Ramsey's Miracle* (up and champions at the first attempt), Notts County, whose stripes Juventus copied, Kaiserslautern's *Rehhagel Miracle*, Bodø/Glimt's *Arctic Miracle* and Bournemouth's *Minus 17*. Clubs that have one are marked 🏛️ in the club picker.
- **416 clubs** from 22 leagues (2025/26 season): Premier League down to League Two; the top two divisions in Spain, Italy, Germany and France; plus the Netherlands, Portugal, Scotland, Belgium, Türkiye, Norway, Denmark, Austria, MLS and the Saudi league.
- **Pick a specific club** or filter by league and club size.
- **4 difficulties** (Casual → Legendary) that scale fee caps, wage caps, rating limits, number of rules, season targets, events and fail conditions to the club's size and division.
- **Lock & reroll**: lock the club, challenge type, length, difficulty or any rule, then reroll everything else. You can also swap a single rule.
- **Seeds**: the same seed and options always give the same challenge.
- **Share links**: a short URL rebuilds the exact challenge, including locks and swapped rules.
- **Copy as text** for Reddit or Discord.
- **My Challenges**: save challenges in your browser, tick off objectives and track your score (trophies and rule breaks).

## Run it

No dependencies. Open `index.html` in a browser, or serve the folder:

```sh
npm start        # python3 -m http.server 8080 → http://localhost:8080
```

It also works on GitHub Pages as-is.

### Single-file version

`dist/fc26-challenge-builder.html` is the whole app in one file, with CSS and JavaScript inlined. Download it and open it in any browser, or send it to a friend; it works offline. Share links need the hosted version, so when you open the file directly the Share button copies the challenge text instead.

After changing anything, rebuild it with:

```sh
npm run build    # writes dist/fc26-challenge-builder.html
```

## Tests

```sh
npm test         # node --test (Node 18+)
```

## Project layout

| File | What's in it |
| --- | --- |
| `js/data.js` | Leagues, clubs (with a 1–5 size tier), nations, formations |
| `js/heritage/*.js` | Club Heritage challenges by region (England, Spain, Italy, Germany, France, rest of Europe, rest of the world) |
| `js/rules.js` | Challenge types, the extra-rule pool, side objectives, season events |
| `js/generator.js` | Seeded generator (no DOM, runs in Node too), share keys, text export |
| `js/app.js` | UI: options form, challenge card, locks, saving, sharing |
| `styles.css` | Styling (responsive down to phone width) |
| `scripts/build-single.js` | Bundles everything into the single-file version |

To add a heritage challenge, add an entry to the right file in `js/heritage/`, keyed by the club's name as written in `js/data.js`. List any rule topics it covers in `blockTags`. The tests flag a core rule that overlaps an extra rule without blocking it. To pin one season's target (e.g. "win the league in your first season up"), use `seasonGoal`.

To add a rule, append an entry to `rules` in `js/rules.js`. Rules that share a `tag` never appear together, and a challenge type's `blockTags` keeps out rules that would clash with its core rules.

---

Fan-made, not affiliated with EA SPORTS. Club sizes are approximate.
