// Stills of the voyage harness (software WebGL): node tools/harness-voyage/shoot.mjs <outDir> [views,comma] [q] [WxH] [t]
// Builds nothing: run `node tools/harness.mjs tools/harness-voyage/main.js .cache/harness-voyage.html` first.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const [out = '.cache/shots', viewsArg = '', q = 'high', size = '1440x900', tArg = '4'] = process.argv.slice(2);
const [W, H] = size.split('x').map(Number);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
await page.goto(`file://${root}/.cache/harness-voyage.html?capture&q=${q}&t=${tArg}`);
await page.waitForFunction(() => window.__ready === true || window.__ready === 'error', null, { timeout: 600000, polling: 300 });
const err = await page.evaluate(() => window.__error);
if (err) {
  console.log('ERROR', err);
  console.log(logs.join('\n'));
  await browser.close();
  process.exit(1);
}
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
const views = viewsArg ? viewsArg.split(',') : await page.evaluate(() => Object.keys(window.__views));
const stats = [];
for (const v of views) {
  const t1 = Date.now();
  const r = await page.evaluate(([v, t]) => window.__render(v, t), [v, +tArg]);
  await page.screenshot({ path: `${out}/${v}.png`, timeout: 600000 });
  stats.push(r);
  console.log(`${v} p=${r.p} calls=${r.calls} tris=${r.triangles} voyage=${JSON.stringify(r.voyage)} prog=${r.programs} (${Date.now() - t1} ms)`);
}
await writeFile(`${out}/stats-${q}.json`, JSON.stringify(stats, null, 2));
const errs = logs.filter((l) => !l.includes('GPU stall') && !l.includes('Automatic fallback'));
if (errs.length) console.log(errs.slice(0, 30).map((l) => l.slice(0, 600)).join('\n'));
await browser.close();
