// main.ts — the handoff program for the GTA 6 Trophy Guide entry.
//
// What this program does, in plain terms: the deliverable of this bounty is a
// static web app (the guide itself, in app/) plus four screenshots of it in
// action. The grader does not run the app from this repository directly; it
// runs THIS file in a sandbox and inspects whatever lands in the output
// directory. So main.ts is a courier, not a server:
//
//   1. It copies app/ and screenshots/ from beside itself into the output
//      directory ($MAKEFUN_OUTPUT_DIR when set, otherwise /output).
//   2. It then asks the vendored dossier builder to describe that exact
//      output — every file, every screenshot — and writes the result to
//      dossier.json, so the grader can verify byte-for-byte that what it
//      judged is what was submitted.
//
// The program uses only the Node standard library, touches no network, and
// is deterministic: the same repository always produces the same output.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The folder this file lives in — app/ and screenshots/ sit beside it.
const here = dirname(fileURLToPath(import.meta.url));

// Where the grader wants the finished entry: an explicit override when the
// harness provides one, the conventional /output otherwise.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Step 1: carry the two payload folders across, byte for byte.
mkdirSync(outDir, { recursive: true });
for (const folder of ['app', 'screenshots']) {
  cpSync(join(here, folder), join(outDir, folder), { recursive: true });
}

// Step 2: describe the output exactly as it now stands and file the
// description next to the payload. The caps below are this competition's
// limits for dossier text, screenshots, and app size.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(`guide handed off to ${outDir} (dossier ${dossier.length} bytes)`);
