// Stills of the garment harness (one browser, software GL).
// usage: node tools/harness-garments/shoot.mjs <outdir> <W> <H> <q> view1 view2 ...   (view[:zoom])
// env QS='&light=side' adds query parameters. Build the harness first:
//   node tools/harness.mjs tools/harness-garments/main.js .cache/harness-garments.html
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [out, W, H, q, ...views] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const FILE = path.join(root, '.cache/harness-garments.html');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
await page.goto(`file://${FILE}?q=${q}${process.env.QS || ''}`);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 600000, polling: 250 });
const err = await page.evaluate(() => window.__error);
if (err) { console.log('ERROR', err); console.log(logs.join('\n')); await browser.close(); process.exit(1); }
console.log('ready', (Date.now() - t0) / 1000, 's  build', await page.evaluate(() => Math.round(window.__buildMs)), 'ms');
console.log(JSON.stringify(await page.evaluate(() => window.__stats())));
for (const v of views) {
  const [name, zoom] = v.split(':');
  const info = await page.evaluate(([n, z]) => window.__view(n, z ? { zoom: +z } : {}), [name, zoom]);
  await page.screenshot({ path: `${out}/${v.replace(':', '_z')}.png` });
  console.log(v, JSON.stringify(info));
}
if (logs.length) console.log(logs.slice(0, 30).join('\n'));
await browser.close();
