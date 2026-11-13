// Cost of the watch per quality level (draw calls, triangles, load time) + a runtime setQuality round trip.
//   node tools/harness-watch/levels.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const q of ['low', 'medium', 'high', 'max']) {
    const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 });
    const logs = [];
    page.on('pageerror', (e) => logs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.text()); });
    await page.goto(`file://${root}/.cache/harness-watch.html?capture&q=${q}`);
    await page.waitForFunction(() => window.__ready === true || window.__ready === 'error', null, { timeout: 300000 });
    const r = await page.evaluate(() => {
      const a = window.__shot({ e: 0, view: 'front34' });
      const b = window.__shot({ e: 1, b: 0, view: 'line' });
      const w = window.__watch;
      const kinds = {};
      for (const m of w.meshes()) kinds[m.userData.kind] = (kinds[m.userData.kind] || 0) + 1;
      return { loadMs: a.loadMs, front: { calls: a.calls, tris: a.triangles }, line: { calls: b.calls, tris: b.triangles }, watch: w.stats(), kinds, programs: a.programs };
    });
    console.log(q, JSON.stringify(r));
    if (q === 'high') {
      const rt = await page.evaluate(() => {
        const out = [];
        for (const lv of ['low', 'max', 'high']) {
          const t0 = performance.now();
          window.__watch.setQuality(lv);
          const ms = performance.now() - t0;
          const s = window.__shot({ e: 0.5, view: 'mid', t: 1.3 });
          out.push({ lv, ms: Math.round(ms), tris: s.watch.triangles, calls: s.calls });
        }
        // timing of the per-frame updates (twin test below)
        const w = window.__watch;
        const t0 = performance.now();
        for (let i = 0; i < 600; i++) { const t = i / 60; w.pose((i % 120) / 120, t); w.bracelet(((i % 90) / 90) * 2); w.setTime(t); w.setMovement(t); }
        out.push({ perFrameUpdateMs: ((performance.now() - t0) / 600).toFixed(3) });
        return out;
      });
      console.log('runtime setQuality', JSON.stringify(rt));
      const tw = await page.evaluate(async () => {
        const before = window.__shot({ e: 0, view: 'front34' });
        const r = await window.__twin();
        const after = window.__shot({ e: 0, view: 'front34' });
        window.__watch2.dispose();
        const disposed = window.__shot({ e: 0, view: 'front34' });
        return { twinMs: r.ms, texBefore: before.textures, texAfter: after.textures, texAfterDispose: disposed.textures, callsAfter: after.calls };
      });
      console.log('twin', JSON.stringify(tw));
    }
    if (logs.length) console.log('LOGS', logs.slice(0, 10).join('\n'));
    await page.close();
  }
} finally {
  await browser.close();
}
