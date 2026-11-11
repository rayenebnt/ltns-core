// usage: node tools/harness-studio/shoot.mjs <outdir> <W> <H> <q> view1 view2 ...
// Renders the studio harness (.cache/harness-studio.html) in software GL, one still per view,
// and prints the composition numbers of each view (JSON lines).
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const [out, W, H, q, ...views] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const FILE = path.join(root, '.cache/harness-studio.html');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) logs.push(`[network] ${r.url()}`); });
const t0 = Date.now();
await page.goto(`file://${FILE}?q=${q}`);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 600000, polling: 250 });
const err = await page.evaluate(() => window.__error);
if (err) { console.log('ERROR', err); console.log(logs.join('\n')); await browser.close(); process.exit(1); }
console.log('ready', (Date.now() - t0) / 1000, 's  build', await page.evaluate(() => window.__buildMs), 'ms');
console.log(JSON.stringify(await page.evaluate(() => window.__stats())));
for (const v of views) {
  const t1 = Date.now();
  const info = await page.evaluate((n) => window.__view(n), v);
  await page.screenshot({ path: `${out}/${v}.png` });
  console.log(v, JSON.stringify(info), (Date.now() - t1) / 1000, 's');
}
if (logs.length) console.log(logs.slice(0, 40).join('\n'));
await browser.close();
