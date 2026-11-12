// Stills of the port harness: node tools/harness-port/shoot.mjs <outDir> --shots "hero;lift:0.06;top" [--w 1440 --h 900 --q high --t 4 --tag v1_]
// a shot is view[:p]; writes <outDir>/<tag><view>[-p].png and stats.json
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const outDir = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const W = +opt('w', 1440), H = +opt('h', 900);
const file = opt('file', path.join(here, '../../.cache/harness-port.html'));
const tag = opt('tag', '');
const q = opt('q', 'high');
const shots = opt('shots', 'hero').split(';').filter(Boolean).map((s) => { const [view, p] = s.split(':'); return { view, p: p === undefined ? null : +p, name: `${tag}${view}${p !== undefined ? '-' + p : ''}` }; });
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
await page.goto(`file://${file}?capture=1&q=${q}&t=${opt('t', '4')}&view=${shots[0].view}${opt('extra', '')}`);
await page.waitForFunction(() => window.__ready === true || window.__ready === 'error', null, { timeout: 600000 });
const ready = await page.evaluate(() => window.__ready);
console.log(`ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`, ready);
if (ready !== true) { console.log(await page.evaluate(() => window.__error)); console.log(logs.join('\n').slice(0, 6000)); await browser.close(); process.exit(1); }
const stats = [];
for (const s of shots) {
  const t1 = Date.now();
  const st = await page.evaluate(([view, p, t, q]) => window.__render({ view, p, t, q }), [s.view, s.p, +opt('t', '4'), q]);
  await page.screenshot({ path: `${outDir}/${s.name}.png`, timeout: 600000 });
  stats.push({ ...s, ...st, ms: Date.now() - t1 });
  console.log(`${s.name}: calls=${st.calls} tris=${st.triangles} tex=${st.textures} geo=${st.geometries} prog=${st.programs} portTris=${st.port.triangles} (${Date.now() - t1} ms)`);
}
await writeFile(`${outDir}/${tag}stats.json`, JSON.stringify(stats, null, 2));
const errs = logs.filter((l) => !l.includes('GPU stall') && !l.includes('Automatic fallback'));
if (errs.length) console.log(errs.slice(0, 30).map((l) => l.slice(0, 3000)).join('\n'));
await browser.close();
