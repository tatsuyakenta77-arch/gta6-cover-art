// Vice Cover Studio — the hand-in program for make.fun's "Make GTA 6 Cover Art"
// bounty (gta6-cover-art-01). The entry is a folder of plain static files: app/
// (index.html plus its scripts, styles, vendored Anton font and sample photos)
// that opens in desktop Chrome with no network request, and screenshots/ (four
// JPEGs the maker took with Playwright: the editor at work and covers the app
// actually exported as PNGs). This program gathers both into /output and writes
// /output/dossier.json with the vendored make.fun library, so the sealed scorer
// can check the entry and the judge can read it. Node 22, standard library only.
//
// Try the app first with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root is the folder this file sits in; the output folder is
// /output in the grader, or MAKEFUN_OUTPUT_DIR when run by hand.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

/** Copies a whole directory tree, creating the destination first. */
function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyTree(join(repoRoot, 'app'), join(outDir, 'app'));
if (existsSync(join(repoRoot, 'screenshots'))) {
  copyTree(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the rest refuse an entry the scorer would refuse — more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files in all, or a path under app/ over 1000 bytes. app/ counts beside
// /output's own 1000-entry cap, its screenshots/ and dossier.json.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
