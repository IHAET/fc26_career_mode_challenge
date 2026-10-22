# FC 26 Career Challenge Builder

A web app that generates random **EA SPORTS FC 26 Career Mode** challenges, each with a club, a theme, rules, a season-by-season roadmap, random events, a final goal and a scoring system.

## Features

- **Two game modes**: Manager Career and **Player Career**. Player Career has nine challenge types (One-Club Legend, Wonderkid, Hometown Hero, The Dream Move, Globetrotter, Last Line, Goal Machine, Goalscoring Defender, Wildcard Career), plus a position picker, age-based season milestones and its own rules and events.
- **14 Manager challenge types**: Road to Glory, Youth Revolution, Moneyball, Fallen Giant, Homegrown Heroes, Loan Army, Journeyman, Galácticos, Underdog in Europe, One Nation, Dad's Army, Wonderkid Factory, Pure Chaos and Club Heritage.
- **Club Heritage**: hand-written challenges for 133 clubs, based on their real history, from giants to League Two. Examples: Athletic Club's Basque-only *La Cantera*, Celtic's all-Scottish *Lisbon Lions*, Ipswich's *Ramsey's Miracle* (up and champions at the first attempt), Notts County, whose stripes Juventus copied, Kaiserslautern's *Rehhagel Miracle*, Bodø/Glimt's *Arctic Miracle* and Bournemouth's *Minus 17*. Clubs that have one are marked 🏛️ in the club picker.
- **416 clubs** from 22 leagues (2025/26 season): Premier League down to League Two; the top two divisions in Spain, Italy, Germany and France; plus the Netherlands, Portugal, Scotland, Belgium, Türkiye, Norway, Denmark, Austria, MLS and the Saudi league.
- **Pick a specific club** or filter by league and club size. **Other club…** lets you type in any club in FC 26: set its country, division and size, and every challenge type adapts to it.
- **4 difficulties** (Casual → Legendary) that scale fee caps, wage caps, rating limits, number of rules, season targets, events and fail conditions to the club's size and division.
- **Daily challenge**: everyone gets the same challenge each day, seeded by the date and changing at local midnight. It shows a check-in streak (🔥 days in a row), the last 7 days, a countdown to the next one, and past days. *Take it on* saves it to My Challenges. *Customise* opens it in the Builder with everything locked, so you can unlock and reroll parts. Link straight to it with `#daily`.
- **Lock & reroll**: lock the club, challenge type, length, difficulty or any rule, then reroll everything else. You can also swap a single rule.
- **Seeds**: the same seed and options always give the same challenge.
- **Share links**: a short URL rebuilds the exact challenge, including locks and swapped rules.
- **Edit anything**: ✏️ Edit any challenge (rules, objectives, seasons, final goal, club, story), or ✍️ **Write your own** from scratch. Edited challenges share as a link that carries the whole challenge, compressed.
- **Export as an image**: 🖼️ Image draws the challenge as a tall PNG card to post on Reddit, Discord or Instagram. On phones it opens the share sheet.
- **Copy as text** for Reddit or Discord.
- **Season tracker with automatic rule checks**: every saved challenge has **👥 Squad** and **🔁 Transfers** tabs (**🧳 Career moves** in Player Career). Type in or paste your squad (name, position, age, nationality, OVR, wage, plus starting XI, academy and loan flags), and log signings, sales, loans and academy promotions by season and window. Each rule then shows ✅ kept, ❌ broken (with the reason, e.g. "Big Buy cost €40M, the cap is €800K"), ⚠️ more to do or needs data, or ✋ check yourself (formations, simming and other things a squad list can't show). The checker reads the rule sentences themselves, so it also covers heritage rules and rules you write in the editor.
- **My Challenges**: save challenges in your browser and tick off objectives. The **season diary** logs each season's finish, trophies and notes, and the score and "Season X of N" update as you go. Copy text includes your progress.

## Run it

No dependencies. Open `index.html` in a browser, or serve the folder:

```sh
npm start        # python3 -m http.server 8080 → http://localhost:8080
```

It also works on GitHub Pages as-is.

### Hosting on GitHub Pages

`.github/workflows/pages.yml` runs the tests on every push. On the default branch it also publishes the site to GitHub Pages, including the single-file download. One-time setup:

1. GitHub only serves Pages from **private** repos on a paid plan (Pro, Team or Enterprise). On the free plan, make the repo public first (Settings → General → Danger Zone → Change visibility).
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Re-run the latest "Test and deploy" workflow from the Actions tab, or push any commit.

The site appears at `https://<your-username>.github.io/fc26_career_mode_challenge/`, and the daily challenge at `…/#daily`.

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
| `js/player.js` | Player Career mode: challenge types, rules, positions, career milestones |
| `js/share-image.js` | Draws a challenge as a PNG card (canvas, no dependencies) |
| `js/compliance.js` | Rule checker: reads rule sentences and tests them against the tracked squad, transfers and career moves |
| `js/tracker-ui.js` | Squad, Transfers and Career moves tabs, including the paste importer |
| `js/daily.js` | Daily challenge: date-based seed, numbering and streaks |
| `js/generator.js` | Seeded generator (no DOM, runs in Node too), share keys, text export |
| `js/app.js` | UI: options form, challenge card, locks, saving, sharing |
| `styles.css` | Styling (responsive down to phone width) |
| `scripts/build-single.js` | Bundles everything into the single-file version |
| `.github/workflows/pages.yml` | CI: tests, checks the single file is fresh, deploys to GitHub Pages |

To add a heritage challenge, add an entry to the right file in `js/heritage/`, keyed by the club's name as written in `js/data.js`. List any rule topics it covers in `blockTags`. The tests flag a core rule that overlaps an extra rule without blocking it. To pin one season's target (e.g. "win the league in your first season up"), use `seasonGoal`.

To add a rule, append an entry to `rules` in `js/rules.js`. Rules that share a `tag` never appear together, and a challenge type's `blockTags` keeps out rules that would clash with its core rules.

---

Fan-made, not affiliated with EA SPORTS. Club sizes are approximate.
