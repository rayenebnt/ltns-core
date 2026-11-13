// Stills of the watch harness (software WebGL).
//   node tools/harness-watch/shoot.mjs <outDir> <shots.json | inline JSON> [q] [WxH] [env]
// shots: [{ name, e, b, view, t, float, bg, size: 'WxH' }]. Build first:
//   node tools/harness.mjs tools/harness-watch/entry.js .cache/harness-watch.html
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const [out = '.cache/shots', shotsArg = '[]', q = 'high', size = '960x600', env = 'studio'] = process.argv.slice(2);
const shots = shotsArg.trim().startsWith('[') ? JSON.parse(shotsArg) : JSON.parse(await readFile(shotsArg, 'utf8'));
const [W, H] = size.split('x').map(Number);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  const t0 = Date.now();
  await page.goto(`file://${root}/.cache/harness-watch.html?capture&q=${q}&env=${env}`);
  await page.waitForFunction(() => window.__ready === true || window.__ready === 'error', null, { timeout: 600000, polling: 300 });
  const err = await page.evaluate(() => window.__error);
  if (err) { console.log('ERROR', err); console.log(logs.join('\n')); process.exit(1); }
  console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  const stats = [];
  for (const s of shots) {
    if (s.size) { const [w, h] = s.size.split('x').map(Number); await page.setViewportSize({ width: w, height: h }); }
    else await page.setViewportSize({ width: W, height: H });
    const t1 = Date.now();
    const r = await page.evaluate((s) => window.__shot(s), s);
    await page.screenshot({ path: `${out}/${s.name}.png`, timeout: 600000 });
    stats.push({ name: s.name, ...r });
    console.log(`${s.name} calls=${r.calls} tris=${r.triangles} prog=${r.programs} tex=${r.textures} watch=${JSON.stringify(r.watch)} (${Date.now() - t1} ms)`);
  }
  await writeFile(`${out}/stats-${q}.json`, JSON.stringify(stats, null, 1));
  const errs = logs.filter((l) => !l.includes('GPU stall') && !l.includes('Automatic fallback'));
  if (errs.length) console.log(errs.slice(0, 30).map((l) => l.slice(0, 600)).join('\n'));
} finally {
  await browser.close();
}
