// An entry for gta6-trophy-guide: an offline trophy guide and tracker for Grand Theft Auto VI on PlayStation 5.
//
// The guide itself is this directory's app/ folder: plain static files a browser opens at app/index.html, no build
// step, ES modules and one stylesheet, and nothing loaded over the network at run time. The 55 trophies, the six-stage
// roadmap and every walkthrough come from app/data/trophies.json; ticks and filter preferences live in the browser's
// localStorage under gta6-trophy-progress and gta6-trophy-preferences.
//
// The program hands that folder in. It copies app/ and screenshots/ from beside this file into the output directory
// and writes dossier.json there — the summary the judge reads: the screenshots, the first load's files and bytes, and
// the source. dossier.json is produced by the vendored make.fun library, which is left exactly as it shipped, because
// the scorer compares the file byte for byte against what its own copy of that library writes.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

/** The scorer's caps, copied from its reference gate: exceeding any of them refuses the entry. */
const CAPS = {
  /** dossier.json's text budget, in bytes. */
  textMaxBytes: 163840,
  /** At most four screenshots, none larger than 256 KiB. */
  screenshotsMax: 4,
  screenshotsMaxBytes: 262144,
  /** app/ may hold at most 993 files and directories, totalling no more than 48 MiB. */
  appMaxFiles: 993,
  appMaxBytes: 50331648,
} as const;

const here = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/**
 * Copy one folder from beside this file into the output directory, if it exists. Screenshots are optional when the
 * guide is built before they are captured, so a missing screenshots/ is not an error; a missing app/ is.
 */
function copyFolder(name: string, required: boolean): boolean {
  const from = join(here, name);
  const to = join(outputDir, name);
  if (!existsSync(from)) {
    if (required) throw new Error(`expected ${name}/ beside main.ts, at ${from}`);
    return false;
  }
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  return true;
}

mkdirSync(outputDir, { recursive: true });
copyFolder('app', true);
const hasScreenshots = copyFolder('screenshots', false);

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: CAPS.textMaxBytes,
    screenshots: { max: CAPS.screenshotsMax, max_bytes: CAPS.screenshotsMaxBytes },
    app_max_files: CAPS.appMaxFiles,
    app_max_bytes: CAPS.appMaxBytes,
  }),
);

console.log(
  `wrote ${join(outputDir, 'dossier.json')} from app/${hasScreenshots ? ' and screenshots/' : ' (no screenshots/ yet)'}`,
);
