// Robustness and CPU-cost checks of the studio kit on the harness page (software WebGL: GPU times are
// meaningless here; the CPU side and the GL error state are what this measures).
//   node tools/harness-studio/check.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(`file://${root}/.cache/harness-studio.html?capture&q=high`);
  await page.waitForFunction(() => window.__ready === true || window.__ready === 'error', null, { timeout: 600000, polling: 300 });
  const r = await page.evaluate(() => {
    const { renderer, kit, bg, tide, watch, glass, envLight, envNight } = window.__three;
    const gl = renderer.getContext();
    const out = {};
    const shot = (o) => { const s = window.__shot(o); return { calls: s.calls, programs: s.programs, glError: gl.getError() }; };
    // every mode once
    out.modes = ['studio', 'blue', 'night', 'tide'].map((mode) => ({ mode, ...shot({ view: 'front34', mode, tide: mode === 'tide' ? 0.5 : null }) }));
    // CPU cost of the per-frame calls
    let t0 = performance.now();
    for (let i = 0; i < 2000; i++) kit.sync();
    out.syncMs = (performance.now() - t0) / 2000;
    t0 = performance.now();
    for (let i = 0; i < 2000; i++) bg.update({ tide: 0.5, time: i * 0.016 });
    out.bgUpdateMs = (performance.now() - t0) / 2000;
    t0 = performance.now();
    for (let i = 0; i < 2000; i++) bg.lineCssY(960, 600);
    out.lineCssYMs = (performance.now() - t0) / 2000;
    out.twinMeshes = glass.meshes.length;
    out.sharedGeometry = glass.meshes.every((t) => t.geometry === t.userData.source.geometry);
    out.sharedInstances = glass.meshes.filter((t) => t.isInstancedMesh).every((t) => t.instanceMatrix === t.userData.source.instanceMatrix);
    // quality rebuild: the twin follows the swapped geometries
    watch.setQuality('low');
    out.low = shot({ view: 'front34', mode: 'tide', tide: 0.5 });
    out.lowShared = glass.meshes.every((t) => t.geometry === t.userData.source.geometry);
    watch.setQuality('high');
    // env swap (same size: no recompile), rotation, tide off/on
    const p0 = renderer.info.programs.length;
    kit.setEnvMap(envNight.texture);
    out.envSwap = shot({ view: 'front34', mode: 'blue' });
    out.envSwapNewPrograms = renderer.info.programs.length - p0;
    kit.setEnvMap(envLight.texture);
    kit.setEnvRotation(0.7);
    out.rot = shot({ view: 'front34', mode: 'blue' });
    kit.setEnvRotation(0);
    kit.setTide(false);
    out.tideOff = shot({ view: 'front34', mode: 'blue' });
    kit.setTide(true);
    out.lineAt05 = bg.update({ tide: 0.5, time: 0 }) || bg.lineCssY(960, 600);
    out.lineAt0 = (bg.update({ tide: 0, time: 0 }), bg.lineCssY(960, 600));
    out.lineAt1 = (bg.update({ tide: 1, time: 0 }), bg.lineCssY(960, 600));
    out.textures = renderer.info.memory.textures;
    out.geometries = renderer.info.memory.geometries;
    out.programsTotal = renderer.info.programs.length;
    out.programNames = renderer.info.programs.map((p) => p.name).filter(Boolean).slice(0, 60);
    return out;
  });
  console.log(JSON.stringify(r, null, 1));
  const errs = logs.filter((l) => !l.includes('GPU stall') && !l.includes('Automatic fallback'));
  if (errs.length) console.log(errs.slice(0, 20).map((l) => l.slice(0, 600)).join('\n'));
} finally {
  await browser.close();
}
