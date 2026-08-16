# FPL Insights

A static, GitHub-hostable Fantasy Premier League stats dashboard: sortable
advanced stats for every player, fixture-difficulty tracking, and a
recommendation engine that scores "who to pick next" onto a formation-shaped
pitch view.

**Live example layout:** open `index.html` after the data files are
populated (see below), or host it on GitHub Pages.

## About the data — and about Opta

There is no public, free-to-call "Opta API" that a personal site can hit
directly — Opta / Stats Perform data is commercially licensed. What *is*
public is the **official FPL API**, and the Premier League's own advanced
metrics on it (Expected Goals, Expected Assists, Expected Goal Involvements,
Expected Goals Conceded, and the ICT Index) are built from Opta's underlying
match-tracking and event data. This project pulls that data directly, which
is the most complete legitimately-open source of Opta-derived FPL stats
available.

If you have your own licensed Opta / Stats Perform API credentials, you can
extend `scripts/fetch_data.py` to pull additional feeds and merge them into
`data/players.json` using the player's team and name/ID as the join key.

## How it works

- `scripts/fetch_data.py` calls the FPL API (`bootstrap-static` and
  `fixtures`), computes a per-player **recommendation score** from form,
  expected-goal involvement per 90, ICT Index, upcoming fixture difficulty,
  and points-per-£1m value, and writes plain JSON files into `data/`.
- `.github/workflows/update-data.yml` runs that script on a schedule (every
  3 hours) and on every push to `main`, committing refreshed JSON straight
  into the repo.
- `index.html` / `assets/js/app.js` is a plain static site (no build step,
  no framework) that fetches those JSON files client-side. Because the data
  is pre-fetched by the Action rather than called live from the browser, it
  sidesteps the FPL API's lack of CORS support for browser requests.

## Recommendation score

For each player with 90+ minutes played and no significant injury flag:

```
score = 0.30 × form
      + 0.25 × (expected goal involvements per 90)
      + 0.20 × ICT Index
      + 0.15 × fixture ease (inverse of next-5 difficulty)
      + 0.10 × value (points per £1m)
```

Each component is min-max normalised across eligible players before
weighting, then scaled to 0–100. Adjust the weights in `fetch_data.py` (see
the `# --- Recommendation scoring ---` block) to match your own priorities —
e.g. weight fixtures more heavily early in a run of good/bad matches.

## Local setup

```bash
git clone <your-fork-url>
cd fpl-insights
python scripts/fetch_data.py     # populates data/*.json from the live API
python -m http.server 8000       # serve the static site locally
# open http://localhost:8000
```

## Hosting on GitHub Pages

1. Push this repo to GitHub.
2. In **Settings → Pages**, set the source to the `main` branch, root
   folder.
3. In **Settings → Actions → General**, make sure Actions have
   "Read and write permissions" (needed for the workflow to commit refreshed
   data).
4. The `update-data` workflow runs automatically on push and every 3 hours
   after — no further setup needed. You can also trigger it manually from
   the **Actions** tab (`workflow_dispatch`).

## Customising

- **Recommendation weights / eligibility threshold** — `scripts/fetch_data.py`.
- **Refresh frequency** — the `cron` schedule in
  `.github/workflows/update-data.yml`.
- **Colours, type, layout** — CSS custom properties at the top of
  `assets/css/style.css`.
- **Formations shown in the pitch view** — the `FORMATIONS` object in
  `assets/js/app.js`.

## Disclaimer

Not affiliated with the Premier League, Fantasy Premier League, or
Opta/Stats Perform. Built against the public, unauthenticated FPL endpoints;
if those endpoints change shape, `scripts/fetch_data.py` may need updating.
