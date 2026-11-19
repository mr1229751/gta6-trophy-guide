# Leonida Legend — GTA VI Trophy Guide & Tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/mr1229751/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/mr1229751/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline web app that guides and tracks all 55 Grand Theft Auto VI
PlayStation trophies, from the opening mission to the platinum.

**Leonida Legend** carries the complete official trophy list — every
name, description and grade exactly as published — and adds what a bare
list cannot give you:

- **A working tracker.** Tick trophies off as you earn them; the header
  keeps score (trophies earned, percentage, PSN points out of the 1,350
  on the list). Progress persists in the browser, and Export / Import
  moves it between machines as a small JSON file.
- **A guide for every trophy.** Each entry pairs the official
  description with a walkthrough written for this app and a short step
  list — and cites its sources (the official list, PSNProfiles,
  PowerPyx) right beside the trophy, as links.
- **Missable warnings with reasoning.** Three trophies are worded in a
  way that ties them to moments that can pass — a departure during the
  VCIA Takedown mission, a cocktail at the game's beginning, and the
  story's choices. Each is flagged, and its guide explains *why* it is
  flagged and what the deadline is, instead of asking for blind trust.
- **A four-stage roadmap.** Story first, collectibles second, activities
  and grinds third, cleanup and the platinum last — with a dedicated
  Missables section generated from the same data.
- **A spoiler shield.** Switch it on and unearned story trophies show a
  placeholder instead of their names and descriptions, so a first
  playthrough stays a first playthrough.
- **Filters that match how you play.** Kind chips (Story, Missable,
  Collectibles, Activities, Online), a grade filter and full-text
  search across names and descriptions.

The look is its own: a Leonida sunset — deep violet dusk melting into
amber — with postcard serif display type, drawn entirely in CSS. No
game artwork, no logos, no external fonts or images; the app is fully
self-contained and works offline.

## Run

The entry program copies the app and its screenshots into an output
directory and writes the dossier that describes them:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

To use the guide itself, serve the `app/` folder with any static file
server and open it in a browser, for example:

```sh
python3 -m http.server 8000 --directory app
# then visit localhost:8000 in a browser
```

## Layout

- `main.ts` — the handoff program (Node, standard library only).
- `app/index.html`, `app/styles.css` — the page and its sunset styling.
- `app/src/` — one job per file: `data.js` (loads the list),
  `tracker.js` (saved progress, export/import), `filters.js` (kind,
  grade, search, spoiler shield), `render.js` (checklist and detail
  panel), `roadmap.js` (stages and missables), `main.js` (boot and
  wiring).
- `app/data/trophies.json` — the 55 trophies with their guides.
- `screenshots/` — the guide in action: checklist with a guide open,
  the roadmap, the spoiler shield, and the missable filter.
- `vendor/makefun-frontend.ts` — the competition's dossier builder,
  vendored unchanged.

## License

MIT — see `LICENSE`.
