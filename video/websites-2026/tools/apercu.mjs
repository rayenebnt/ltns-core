// Renders the preview video dist/apercu.mp4: the autoplay take (key P), frame by frame.
// p(t) follows AUTO_KEYS from src/main.js through the same critically damped camera spring as
// main.js; __setTime keeps the sea, the flames and the yachts at real speed; the CSS animation of
// the scroll hint is paused and set to each frame's time. WebGL runs in SwiftShader (software):
// about 2.5 s per frame at 1280 x 800, so roughly 15 min for the 15 s take.
//
// Needs: node build.mjs first, Playwright (npm i -D playwright && npx playwright install chromium)
// and ffmpeg. PLAYWRIGHT=/path/to/playwright/index.mjs uses a Playwright installed elsewhere.
// usage: node tools/apercu.mjs [--w 1280] [--h 800] [--fps 24] [--q high] [--out dist/apercu.mp4] [--resume]
import { readFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const W = +opt('w', 1280), H = +opt('h', 800), FPS = +opt('fps', 24), Q = opt('q', 'high');
const OUT = path.resolve(ROOT, opt('out', 'dist/apercu.mp4'));
const FRAMES = path.join(ROOT, '.cache', 'apercu');
const T0 = 4.0; // scene clock at the first frame

// the autoplay timeline, read from main.js so that the video follows the code
const { monotone } = await import(pathToFileURL(path.join(ROOT, 'src/scene/path.js')).href);
const src = readFileSync(path.join(ROOT, 'src/main.js'), 'utf8');
const keysMatch = src.match(/const AUTO_KEYS = monotone\((\[\[.*?\]\])\);/);
const durMatch = src.match(/tween = \{ keys: AUTO_KEYS, dur: ([\d.]+), t: 0 \}/);
if (!keysMatch || !durMatch || !/const omega = 4\.4;/.test(src) || !/Math\.min\(rem, 1 \/ 120\)/.test(src)) {
  throw new Error('the autoplay or the camera spring changed in src/main.js: update tools/apercu.mjs');
}
const K = monotone(JSON.parse(keysMatch[1]));
const dur = +durMatch[1];
const ps = [0];
for (let n = 1, p = 0, v = 0; n <= Math.ceil(dur * FPS); n++) {
  const target = K(Math.min(dur, n / FPS));
  for (let rem = 1 / FPS; rem > 1e-6; ) {
    const h = Math.min(rem, 1 / 120);
    v += (4.4 * 4.4 * (target - p) - 2 * 4.4 * v) * h;
    p += v * h;
    rem -= h;
  }
  if (Math.abs(target - p) < 1e-5 && Math.abs(v) < 1e-4) { p = target; v = 0; }
  ps.push(p);
}

const html = path.join(ROOT, 'dist/cap-lumiere.html');
if (!existsSync(html)) throw new Error('dist/cap-lumiere.html is missing: run node build.mjs first');
if (!args.includes('--resume') && existsSync(FRAMES)) rmSync(FRAMES, { recursive: true });
mkdirSync(FRAMES, { recursive: true });
console.log(`autoplay ${dur} s -> ${ps.length} frames at ${FPS} fps, ${W} x ${H}, q=${Q}`);

const pw = process.env.PLAYWRIGHT;
const { chromium } = await import(pw ? pathToFileURL(path.resolve(pw)).href : 'playwright');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${pathToFileURL(html).href}?capture=1&q=${Q}&t=${T0}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 900000, polling: 200 });
await page.evaluate(() => { document.getElementById('loader').style.display = 'none'; });
const t0 = Date.now();
for (let n = 0; n < ps.length; n++) {
  const file = path.join(FRAMES, `f${String(n).padStart(4, '0')}.png`);
  if (existsSync(file)) continue; // --resume
  const t = n / FPS;
  await page.evaluate(([p, time, ms]) => {
    window.__setTime(time);
    window.__setProgress(p);
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; }
  }, [ps[n], T0 + t, t * 1000]);
  await page.screenshot({ path: file, timeout: 600000 });
  if (n % 24 === 0) console.log(`  ${n}/${ps.length - 1}  ${((Date.now() - t0) / 60000).toFixed(1)} min`);
}
await browser.close();
if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
if (readdirSync(FRAMES).length < ps.length) throw new Error('missing frames');

const ff = spawnSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%04d.png'),
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-level', '4.0', '-g', String(FPS * 2),
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-movflags', '+faststart', OUT,
], { stdio: 'inherit' });
if (ff.status !== 0) throw new Error('ffmpeg failed');
const shown = OUT.startsWith(ROOT + path.sep) ? path.relative(ROOT, OUT) : OUT;
console.log(`${shown}: ${(ps.length / FPS).toFixed(2)} s, ${W} x ${H}, ${FPS} fps`);
