# FC 26 Career Challenge Builder

A web app that generates random **EA SPORTS FC 26 Career Mode** challenges, each with a club, a theme, rules, a season-by-season roadmap, random events, a final goal and a scoring system.

## Features

- **Two game modes**: Manager Career and **Player Career**. Player Career has nine challenge types (One-Club Legend, Wonderkid, Hometown Hero, The Dream Move, Globetrotter, Last Line, Goal Machine, Goalscoring Defender, Wildcard Career), plus a position picker, age-based season milestones and its own rules and events.
- **14 Manager challenge types**: Road to Glory, Youth Revolution, Moneyball, Fallen Giant, Homegrown Heroes, Loan Army, Journeyman, Galácticos, Underdog in Europe, One Nation, Dad's Army, Wonderkid Factory, Pure Chaos and Club Heritage.
- **Club Heritage**: hand-written challenges for 140 clubs, based on their real history, from giants to League Two. Examples: Athletic Club's Basque-only *La Cantera*, Celtic's all-Scottish *Lisbon Lions*, Ipswich's *Ramsey's Miracle* (up and champions at the first attempt), Notts County, whose stripes Juventus copied, Kaiserslautern's *Rehhagel Miracle*, Bodø/Glimt's *Arctic Miracle*, Bournemouth's *Minus 17* and Farul's *Hagi's Academy*. Clubs that have one are marked 🏛️ in the club picker.
- **432 clubs** from 23 leagues (2025/26 season): Premier League down to League Two; the top two divisions in Spain, Italy, Germany and France; plus the Netherlands, Portugal, Scotland, Belgium, Türkiye, Norway, Denmark, Austria, Romania's SuperLiga, MLS and the Saudi league.
- **Pick a specific club** or filter by league and club size. **Other club…** lets you type in any club in FC 26: set its country, division and size, and every challenge type adapts to it.
- **🔥 Mid-season drama**: on top of the summer ⚡ events, seasons can throw a specific mid-season crisis with a moment and a task, e.g. *"Mid-season (January): Your highest-rated player says the club is too small and too poor for him. Sell him in the January window and sign a replacement who plays his position in the same window."* There are 23 for managers (injury crises, board ultimatums, FFP warnings, AFCON call-ups, deadline-day panic buys…) and 9 for Player Career (dropped after a dry spell, a January rival for your shirt, a contract stand-off…). They never contradict the challenge's type, its extra rules or that season's event, and the ⚡ events switch covers them too.
- **4 difficulties** (Casual → Legendary) that scale fee caps, wage caps, rating limits, number of rules, season targets, events and fail conditions to the club's size and division.
- **Daily challenge**: everyone gets the same challenge each day, seeded by the date and changing at local midnight. It shows a check-in streak (🔥 days in a row), the last 7 days, a countdown to the next one, and past days. *Take it on* saves it to My Challenges. *Customise* opens it in the Builder with everything locked, so you can unlock and reroll parts. Link straight to it with `#daily`.
- **Lock & reroll**: lock the club, challenge type, length, difficulty or any rule, then reroll everything else. You can also swap a single rule.
- **Seeds**: the same seed and options always give the same challenge.
- **Share links**: a short URL rebuilds the exact challenge, including locks and swapped rules.
- **Edit anything**: ✏️ Edit any challenge (rules, objectives, seasons, final goal, club, story), or ✍️ **Write your own** from scratch. Edited challenges share as a link that carries the whole challenge, compressed.
- **Export as an image**: 🖼️ Image draws the challenge as a tall PNG card to post on Reddit, Discord or Instagram. On phones it opens the share sheet.
- **Copy as text** for Reddit or Discord.
- **Season tracker with automatic rule checks**: every saved challenge has **👥 Squad** and **🔁 Transfers** tabs (**🧳 Career moves** in Player Career). Type in or paste your squad (name, position, age, nationality, OVR, wage, plus starting XI, academy and loan flags), and log signings, sales, loans, academy promotions and 🔄 swap deals (a player out, one back, cash either way) by season and window. Each rule then shows ✅ kept, ❌ broken (with the reason, e.g. "Big Buy cost €40M, the cap is €800K"), ⚠️ more to do or needs data, or ✋ check yourself (formations, simming and other things a squad list can't show). The checker reads the rule sentences themselves, so it also covers heritage rules and rules you write in the editor.
- **🔁 Transfers section**: its own tab, linked to a challenge you pick. It shows the challenge's signing rules as chips (e.g. "Fee ≤ €800K", "Sales money only: €5M to spend", "Only South American") and a "what to do next" list. **📒 Track it** on any generated or daily challenge saves it and opens its tracker.
- **🤖 Transfer assistant** (built in, works offline): describe a move in your own words, e.g. *"Signed Florian Wirtz from Leverkusen for €60m in January"* or *"Swapped Vlahović for Osimhen with Galatasaray, we pay €5m"*, and it fills in the transfer. Before you log anything it simulates the move against the challenge's rules and tells you what it would break or complete.
- **Real squads, straight from FC 26**: all 432 clubs' squads exactly as they are in the game at launch, from EA's own FC 26 database: 11,800 players with their in-game names, positions, nationalities and ages, plus loans, so players out on loan load as ✈️ loaned out and loanees as 🔁 on loan. They load into the Squad tab with **⬇️ Load real squad**, or automatically when you press 📒 Track it. Ages are worked out for the career's first day (1 July 2025). Unlicensed clubs show the game's name too ("Called Bergamo Calcio in FC 26"). OVRs aren't included because they're EA's ratings: add them as you go or paste them in.
- **🌍 Players from 40 more leagues**: on top of the 432 playable clubs, the player database has 17,600 players from 595 clubs elsewhere: every other team in FC 26 (Argentina, Germany's 3. Liga, Switzerland, Sweden, Poland, Korea, Australia, China, India, Ireland, the Copa Libertadores and Sudamericana clubs and more) with the game's squads, plus leagues the game doesn't have (Brazil, Liga MX, Japan, Serbia, Egypt, Morocco, second divisions in Scotland, the Netherlands, Portugal, Belgium, Türkiye, Norway, Sweden and Denmark…) from Wikipedia. About 29,400 real players in all. They're recognised in the transfer form and the assistant ("Signed Neymar from Santos" fills in LW, 33, Brazilian) and appear in the wonderkid scout under "Other leagues". Those clubs aren't playable in the Builder.
- **🧬 Regens**: signings are matched against every squad player plus a hand-written list of well-known players. A known player's club, age, nationality and position are filled in as you type. Anyone it doesn't recognise is marked as a regen, as are academy promotions. Untick it for a real player it doesn't know and it remembers them.
- **🎧 Spotify soundtracks (optional)**: make a playlist for a save from your favourite genres plus ones that fit the club, the challenge and your squad.
- **👤 Accounts (optional)**: sign in with email and password or Google, and your saved challenges, trackers, diaries and confirmed players sync across your devices. Without an account (or before accounts are set up) everything stays on the device as before. See "Accounts and Spotify" below.
- **🎓 Tour**: a short walkthrough of the app on your first visit (Skip, Back, Next, arrow keys, Esc). ❓ in the top bar shows it again.
- **🔔 Subscriptions** (🔔 in the top bar): the daily challenge as a calendar you subscribe to (Google Calendar, Apple Calendar, Outlook) or an RSS feed; reminder notifications for the daily challenge and for friends' new challenges; **following** friends by username to see the challenges they share and open them; and **⭐ Pro**, a paid monthly plan with coupon codes (unlimited saves, choosing seasons, rules and seed, writing your own challenges, a Pro badge, five colour themes, 75 and 100-track soundtracks). See "Subscriptions, following and Pro" below.
- **Quick start**: one-click cards on the Builder (Surprise me, Club Heritage, Road to Glory, Player Career, Legendary, today's daily), and a short club reel while a challenge is drawn.
- **Light and dark themes** (☀️/🌙 in the top bar; follows your system until you pick), and a bottom tab bar on phones.
- **🔭 Wonderkid scout**: a Scout tab on every tracked Manager Career challenge (and in the Transfers section) suggests young players from all 432 squads, best prospects first. A hand-picked list of widely rated talents (⭐, e.g. Lamine Yamal, Franco Mastantuono, Estêvão) comes first, then youth and the level of the club. Every suggestion is checked against the challenge's rules (✅ fits / ❌ which rule it breaks); filter by position, age, league or name, keep a 🎯 shortlist on the save, and **Sign** fills in the transfer form. Ratings and potential aren't included (they're EA's), so confirm them with your scouts in the game.
- **⚽ Starting XI pitch**: the Squad tab draws your ⭐ starters on a pitch with their shape, average OVR and age, and **Pick my best XI** fills a 4-3-3 from your ratings. Every club also comes with a likely starting XI, a best guess from shirt numbers and star players: it shows on the challenge card in the Builder, and its players arrive ticked ⭐ when the real squad loads.
- **📊 Dashboard and 🏅 achievements**: My Challenges shows your totals (challenges, finished, objectives, trophies, transfers, best score), 19 achievements to unlock (Romanian rhapsody, Treble, By the book, Regen hunter…), and search, filters and sorting for your saves.
- **💾 Back up and restore**: download all your saves (with trackers, diaries and confirmed players) as one file, and load it on any device or browser. Restoring merges with what's there.
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

## Accounts and Spotify

Both are optional and off until you add your own keys to `js/config.js`. The app has no server of its own, so accounts run on [Firebase](https://firebase.google.com) (free tier) and Spotify talks to the browser directly.

### Accounts (Firebase)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com) and add a **Web app** to it. Copy the `firebaseConfig` it shows into `firebase:` in `js/config.js` (`apiKey`, `authDomain`, `projectId`, `appId`). These values identify the project and are meant to be public; the security rules below protect the data.
2. **Authentication → Sign-in method**: turn on **Email/Password** and **Google**.
3. **Authentication → Settings → Authorized domains**: add the domain the app runs on, e.g. `<your-username>.github.io` (`localhost` is there already).
4. **Firestore Database → Create database**, then paste `firestore.rules` from this repo into its **Rules** tab and publish, so each user can only read and write their own data.
5. Rebuild the single file (`npm run build`) and push.

**Auto sync** (on by default) can be switched off under ⚙️ Settings in the account panel; then nothing syncs until you press **Sync now**. Each user's saves are one Firestore document (`users/<uid>`). When a device signs in or changes something, the copies are merged per challenge: the most recently changed copy wins, and deleting a challenge removes it everywhere. Google sign-in only works on an authorised domain, so not from the downloaded single file (email sign-in does).

### Spotify soundtracks

**🎧 Soundtrack** on a saved challenge makes a private Spotify playlist for that save. It mixes the genres you play most (from your top artists) with genres that fit the save: the club's country (britpop for an English club, flamenco for a Spanish one), the challenge's mood (punk for Underdog in Europe, classic rock for Dad's Army) and the biggest nationalities in your tracked squad (afrobeats for a Nigerian core). Tick or untick genres, add your own, and pick 20, 30 or 50 tracks (75 or 100 with Pro). To switch it on:

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard) (choose **Web API**).
2. Add the app's address as a **Redirect URI**, exactly: `https://<your-username>.github.io/fc26_career_mode_challenge/` (for local testing, `http://127.0.0.1:8080/`).
3. Copy the **Client ID** into `spotifyClientId` in `js/config.js`, rebuild and push. No client secret is needed: sign-in uses PKCE in the browser.
4. New Spotify apps start in development mode, where only accounts you add under **User Management** (up to 5) can connect, and only while the app's owner has Spotify Premium. That's fine for you and a few friends; opening it to everyone needs Spotify's approval.

It only uses what Spotify still opens to apps in development mode after its February 2026 changes (your top artists, search, `POST /me/playlists` and `POST /playlists/{id}/items`), and it needs the hosted page: Spotify can't send you back to a downloaded file.

## Subscriptions, following and Pro

**Daily challenge feeds** need nothing set up: CI builds `feeds/daily.ics` (a week back, two months ahead) and `feeds/daily.xml` (RSS, the last two weeks) with `scripts/build-feeds.js` on every deploy and once a day. Each entry links to that day's challenge.

**Reminders** are browser notifications shown while the site is open in a tab (it can be in the background). `sw.js` is only there so phones can show them; it caches nothing. On an iPhone, notifications need the site added to the Home Screen.

**Following** uses the Firebase account. After updating, paste the latest `firestore.rules` into **Firestore Database → Rules** and press **Publish**: it adds `profiles` (readable by signed-in users, written only by their owner), `handles` (unique usernames) and `follows` (private). Sharing your challenges with followers is off until you tick it.

**⭐ Pro** is off until you set it up, and it involves real money, so it needs an adult's Stripe account:

1. Create a [Stripe](https://stripe.com) account (you must be 18 or over) and, under **Product catalogue**, a product with a monthly price. Copy the price id (`price_…`).
2. In Firebase, upgrade the project to the **Blaze** (pay as you go) plan, which extensions need; small projects stay within the free allowance.
3. Install the **Run Payments with Stripe** extension (`invertase/firestore-stripe-payments`) with the default collection names (`customers`, `products`), give it your Stripe secret key, and add the webhook it shows in Stripe (**Developers → Webhooks**) with the events it lists. Turn on Stripe's customer portal (**Settings → Billing → Customer portal**) so people can cancel.
4. Fill in `pro` in `js/config.js`: `{ price: 'price_…', label: '€2.99 a month', region: '<the extension's region>' }`, publish the latest `firestore.rules`, rebuild and push.
5. Coupons: in Stripe (**Product catalogue → Coupons**) create a coupon of 50% off for 1 month with a promotion code `MARSEILLE`, and one of 100% off for 1 month with the code `LIVERPOOL4EVR`. Paste each promotion code's id (`promo_…`) into `pro.coupons` in `js/config.js`. People type the code in the Pro section (or on Stripe's checkout page), and Stripe applies the discount.

Once Pro is on sale, free users are limited: they keep up to 5 saved challenges, and choosing the number of seasons or extra rules, typing a seed, and writing your own challenge are Pro. Until then nothing is locked, since nobody could buy Pro.

Payment is real (Stripe takes it), but the app has no server of its own, so the Pro limits are checked in the browser; someone determined could get around them.

## Squad data

The squads are the game's own. `js/squads.js` holds every challenge club's squad as it is in EA SPORTS FC 26 at launch, built in two steps:

1. `scripts/fetch-squads.js` reads each club's English Wikipedia article as it stood on 15 September 2025 (first-team and out-on-loan lists; academies and reserve sides left out), adds dates of birth and positions from [Wikidata](https://www.wikidata.org) (CC0), and writes `scripts/wiki-squads.json`. `scripts/fetch-extra-squads.js` does the same for the leagues outside the club list (`scripts/wiki-squads-extra.json`); each league's clubs come from its season article, cached in `scripts/extra-leagues.json`.
2. `scripts/fetch-ea-squads.js` downloads EA's FC 26 player database (the one behind ea.com's ratings pages, about 16,000 men), matches each club to its team in the game by the players they share, and writes `js/squads.js` and `js/squads-extra.js` with the game's players, names ("Vini Jr.", "Balde"), positions, nationalities and dates of birth. Loans come from the Wikipedia lists, since the database lists a loanee only at the club he plays for. The likely starting XI is the best-rated 4-3-3 in the game's squad.

Notes:

- Ratings are only used to pick that XI. They're EA's, so they aren't stored: add OVRs as you go or paste them in.
- Clubs FC 26 has no licence for keep their real name in the app, and the challenge card says what the game calls them (Inter is "Lombardia FC", Atalanta "Bergamo Calcio").
- The public database is missing a few players at a handful of smaller clubs (Trabzonspor's youth goalkeepers, for example). Where a club has no goalkeeper or fewer than 18 players, its listed players who aren't anywhere in the game's database fill the gap; `filled` in `js/squads.js` says how many, per club.
- Every player in the database is in the app: teams from leagues outside the club list (Argentina, Switzerland, India, the Copa Libertadores clubs and more) join `js/squads-extra.js`, so they're recognised and scouted.

To rebuild (add `NODE_USE_ENV_PROXY=1` if you're behind a proxy):

```sh
node scripts/fetch-squads.js         # optional: only to refresh the Wikipedia lists (scripts/.wiki-cache/, not committed)
node scripts/fetch-extra-squads.js   # optional, the same for the other leagues
node scripts/fetch-ea-squads.js      # the game's database (scripts/.ea-cache/, not committed; --fresh to download again)
npm run build
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
| `js/rules.js` | Challenge types, the extra-rule pool, side objectives, season events, mid-season dramas |
| `js/player.js` | Player Career mode: challenge types, rules, positions, career milestones |
| `js/share-image.js` | Draws a challenge as a PNG card (canvas, no dependencies) |
| `js/compliance.js` | Rule checker: reads rule sentences and tests them against the tracked squad, transfers and career moves |
| `js/squads.js` | Generated: every club's squad as it is in FC 26 at launch (see "Squad data") |
| `scripts/fetch-squads.js` | Builds `scripts/wiki-squads.json` from Wikipedia squad lists and Wikidata |
| `scripts/fetch-ea-squads.js` | Lines the squads up with EA's FC 26 database and writes `js/squads.js` and `js/squads-extra.js` |
| `js/squads-extra.js` | Generated: squads for 40 more leagues, for recognition and scouting (see "Squad data") |
| `scripts/fetch-extra-squads.js` | Builds `scripts/wiki-squads-extra.json`; club lists cached in `scripts/extra-leagues.json` |
| `js/players.js` | Known real players (names, nationalities, positions) for spotting regens |
| `js/assistant.js` | Transfer assistant: reads transfer sentences, pre-checks moves, signing-rule chips, next steps |
| `js/tracker-ui.js` | Squad, Transfers and Career moves tabs, including the paste importer |
| `js/daily.js` | Daily challenge: date-based seed, numbering and streaks |
| `js/generator.js` | Seeded generator (no DOM, runs in Node too), share keys, text export |
| `js/app.js` | UI: options form, challenge card, locks, saving, sharing |
| `js/config.js` | Keys for the optional online features (Firebase accounts, Spotify) |
| `js/account.js` | Accounts: sign-in through a swappable backend (Firebase by default) and merging saves between devices |
| `js/login.js` | The sign-in screen and the account button |
| `js/achievements.js` | Achievements worked out from your saves |
| `js/scout.js` | Wonderkid scout: young players from the squad data, ranked, with the hand-picked talent list |
| `js/spotify.js` | Spotify soundtracks: PKCE sign-in, genres for a save, playlist building and the panel on saved challenges |
| `firestore.rules` | Firestore security rules: own saves only, public profiles and usernames, private follows, the Stripe extension's collections |
| `js/tutorial.js` | The first-visit tour and the ❓ button |
| `js/subscriptions.js` | 🔔 Subscriptions: feed links, reminders, following, Pro |
| `sw.js` | Service worker for reminder notifications on phones (no caching) |
| `scripts/build-feeds.js` | Builds the daily challenge calendar and RSS feeds (run by CI) |
| `styles.css` | Styling (responsive down to phone width) |
| `scripts/build-single.js` | Bundles everything into the single-file version |
| `.github/workflows/pages.yml` | CI: tests, checks the single file is fresh, builds the feeds, deploys to GitHub Pages (also daily) |

To add a heritage challenge, add an entry to the right file in `js/heritage/`, keyed by the club's name as written in `js/data.js`. List any rule topics it covers in `blockTags`. The tests flag a core rule that overlaps an extra rule without blocking it. To pin one season's target (e.g. "win the league in your first season up"), use `seasonGoal`.

To add a rule, append an entry to `rules` in `js/rules.js`. Rules that share a `tag` never appear together, and a challenge type's `blockTags` keeps out rules that would clash with its core rules.

---

Fan-made, not affiliated with EA SPORTS. Club sizes are approximate.
