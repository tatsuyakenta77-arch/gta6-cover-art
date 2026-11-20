// Takes the entry's screenshots with Playwright in a real desktop Chrome viewport:
// the editor with a photo loaded, and covers the app actually exported as PNGs,
// scaled down to the screenshot caps as JPEGs. Run from the repo root:
//   node scripts/take-shots.mjs
import { createRequire } from 'node:module';
// playwright-core lives in the ephemeral /tmp install, not in this repo.
const { chromium } = createRequire('/tmp/pw/package.json')('playwright-core');
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const shotsDir = join(root, 'screenshots');
mkdirSync(shotsDir, { recursive: true });

const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1181/chrome-linux/chrome`;
const PORT = 8091;
const BASE = `http://localhost:${PORT}`;

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`${BASE}/index.html`);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not come up');
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
const errors = [];
const externalRequests = [];
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, acceptDownloads: true });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('request', (r) => { if (!r.url().startsWith(BASE)) externalRequests.push(r.url()); });

  // 1. Editor with a photo loaded (3-panel, Vice Sunset).
  await page.goto(`${BASE}/?shot=editor&photo=vice-street,neon-alley,pier&caption=Sunset%20Heist&sub=Neon%20Nights&layout=trio&grade=sunset`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });
  await page.screenshot({ path: join(shotsDir, '2-editor.jpg'), type: 'jpeg', quality: 85 });

  // 2. Real exports: navigate to a scene, click the real Export button, keep the PNG.
  const exports = [
    { name: '1-cover.jpg', size: '1920x1080', shot: 'photo=vice-street,neon-alley,pier,boulevard&caption=Sunset%20Heist&sub=Neon%20Nights&layout=quad&grade=sunset', vw: 1280, vh: 720 },
    { name: '3-cover-portrait.jpg', size: '1080x1350', shot: 'photo=vice-street,neon-alley&caption=Neon%20Nights&sub=After%20Dark&layout=duo&grade=neon', vw: 1024, vh: 1280 },
    { name: '4-cover-square.jpg', size: '1080x1080', shot: 'photo=vice-street&caption=Golden%20Hour&sub=Ocean%20Drive&layout=solo&grade=gold', vw: 1024, vh: 1024, quality: 80 },
  ];
  for (const exp of exports) {
    await page.goto(`${BASE}/?shot=editor&${exp.shot}&size=${exp.size}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#export'),
    ]);
    const tmp = join('/tmp', `vice-cover-${exp.size}.png`);
    await download.saveAs(tmp);
    // Show the exported PNG itself, scaled to the caps, as a JPEG screenshot.
    const png = readFileSync(tmp);
    const shot = await browser.newPage({ viewport: { width: exp.vw, height: exp.vh } });
    await shot.setContent(
      `<body style="margin:0"><img src="data:image/png;base64,${png.toString('base64')}" style="width:${exp.vw}px;height:${exp.vh}px;display:block">`,
    );
    await shot.screenshot({ path: join(shotsDir, exp.name), type: 'jpeg', quality: exp.quality ?? 85 });
    await shot.close();
    console.log(`exported ${exp.size} -> ${exp.name} (${png.length} byte PNG)`);
  }

  console.log('console/page/request errors:', errors.length ? errors : 'none');
  console.log('external (non-localhost) requests:', externalRequests.length ? externalRequests : 'none');
  for (const f of ['1-cover.jpg', '2-editor.jpg', '3-cover-portrait.jpg', '4-cover-square.jpg']) {
    const s = statSync(join(shotsDir, f));
    console.log(f, s.size, 'bytes', s.size <= 262144 ? 'OK' : 'OVER 256 KiB');
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}
