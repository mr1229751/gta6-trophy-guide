# Leonida trophy run

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/mr1229751/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/mr1229751/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida trophy run is an offline trophy guide and progress tracker for the PlayStation 5 list of Grand Theft Auto VI: 55 trophies, one platinum, and a written route for each of them.

The app has three screens. Checklist is the whole list in the order you should chase it, with a filter bar for grade, type, roadmap stage, missable-only and hide-earned, plus a search box that reads names, descriptions, mission names and walkthrough text. Roadmap collapses the same list into six stages, from the opening strand in the Leonida Keys through Vice City, the finale, the missable cleanup, the free-roam grind and the platinum, showing per-stage progress. Missables shows only the ten trophies that close for good, in the order they lock. Hidden trophies stay masked, with their walkthrough text behind a reveal control, until you either tick them or turn spoilers on. Keys 1, 2 and 3 switch views and `/` jumps to search.

There is no build step, no package install and no dependency tree. The whole frontend is the static `app/` folder: one HTML page, one stylesheet, four small script files that register slices of a single global namespace, and the trophy data as JSON. It makes no network requests at run time and has no accounts, analytics or backend.

## Running it locally

`serve.ts` is a throwaway static file server built on the Node standard library alone, so all you need is Node itself.

Prerequisite: Node 22.18 or newer. The server is a TypeScript file and relies on Node's built-in type stripping, which is on by default from 22.18 (on 22.6 to 22.17 you would have to pass `--experimental-strip-types` yourself). There is nothing to `npm install`.

```sh
node serve.ts
# app/ is on http://localhost:8080
```

Open http://localhost:8080. Pass `--port <n>` to serve on another port; anything that is not a valid port falls back to 8080. The server binds to 127.0.0.1 only and refuses any path that resolves outside `app/`, so it is a development convenience, not something to expose to the internet.

Do open it through the server rather than by double-clicking `app/index.html`. The page loads its data with `fetch('data/trophies.json')`, and browsers block that request on a `file://` origin, so the tracker will show a "trophy list did not load" message instead of the list.

## Progress is stored in the browser

Ticking a trophy writes to `localStorage` immediately, and the page restores your ticks the next time it loads from the same origin. Two keys are used:

- `gta6-trophy-progress` holds the earned trophy ids, plus the data version, the game and list labels, and the total.
- `gta6-trophy-preferences` holds the active filters and the spoiler toggle.

Nothing is uploaded anywhere: progress never leaves the device, and there is no sync, account or server-side copy. Because the keys are scoped to the origin, ticks saved on `http://localhost:8080` belong to that origin — serving the app on a different port gives you what is effectively a fresh tracker. If the browser blocks storage entirely, the app notices at startup and keeps ticks in memory for the tab, telling you so in the Save & share panel instead of silently losing them.

## Exporting and importing progress

Save & share offers a JSON export and a JSON import so progress can survive a cleared browser, move to another machine, or be kept in version control.

Download JSON writes `gta6-trophy-progress.json` with the shape below. It is plain readable JSON, not a binary or an opaque token:

```json
{
  "tracker": "gta6-trophy-guide",
  "game": "Grand Theft Auto VI",
  "list": "PlayStation 5, 55 trophies",
  "v": 1,
  "earned": [2, 14, 20],
  "earnedCount": 3,
  "total": 55,
  "percent": 5
}
```

Import JSON reads a file back and applies it. It accepts this exact document, a bare array of trophy ids, or an object with an `earned` (or `ticks`) array, so a file from another copy of the guide still works. Ids that are not numbers, or that do not exist in this list, are skipped and reported in the toast ("Imported N of 55 ticks (M unknown ids skipped)"). An import replaces your current tick set rather than merging into it, and a file that is not JSON, or that has no list of ids, is rejected with a message and changes nothing. The same panel can copy a short text summary of your progress to the clipboard for pasting into a message.

## What the trophy data is, and what it is not

This repository is a competition entry, so be clear about where its content comes from. `app/data/trophies.json` is a fan-assembled dataset, compiled for this guide from community trophy sites (the file credits Exophase, PSNProfiles and PowerPyx per trophy). It is not an official publication from Rockstar Games, Take-Two or Sony, and it has not been verified against a released build of the game.

Treat everything in the checklist as provisional rather than authoritative:

- Trophy names, descriptions, grades and the 55-trophy total reflect that community dataset, not a confirmed platform list.
- The missable flags, the six-stage roadmap, the per-trophy routes and the ordering are editorial judgement about how to plan a run. They describe an intended route, not a tested one.
- Counts, hidden-trophy behaviour and mission names can differ from, or be missing in, the game as it eventually ships.

Use the tracker as a checklist to organize your own run and correct it as you learn more, not as a statement of official fact. Where the dataset and the game disagree, the game wins.

`main.ts` is the bounty packaging script rather than part of the guide: it copies `app/` and `screenshots/` into an output directory and writes the `dossier.json` the make.fun scorer reads. It is not needed to run the tracker locally.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
