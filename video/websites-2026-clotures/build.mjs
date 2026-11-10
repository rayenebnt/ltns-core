// Bundles src/ into ONE self-contained file: dist/cordeau.html
// (JS + CSS + base64 fonts inline, no network access at runtime).
// WORLD=stub node build.mjs  -> resolves './world/index.js' to './world-stub/index.js' (shell work without the real 3D world).
import { build, context } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => path.join(root, 'src', p);
const out = path.join(root, 'dist', process.env.OUT || 'cordeau.html');

const worldStub = {
  name: 'world-stub',
  setup(b) {
    if (process.env.WORLD !== 'stub') return;
    b.onResolve({ filter: /(^|\/)world\/index\.js$/ }, () => {
      const p = src('world-stub/index.js');
      if (!existsSync(p)) throw new Error('WORLD=stub but src/world-stub/index.js is missing');
      return { path: p };
    });
  },
};

const esbuildOptions = {
  entryPoints: [src('main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['chrome100', 'edge100', 'safari15.4', 'firefox110'],
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
  plugins: [worldStub],
};

const RANGE = 'unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
async function face(family, file, style, weight) {
  const b64 = (await readFile(src('fonts/' + file))).toString('base64');
  return `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:block;` +
    `src:url(data:font/woff2;base64,${b64}) format('woff2');${RANGE}}`;
}

async function assemble(jsText) {
  const fonts = [
    await face('Inter Tight', 'inter-tight-latin.woff2', 'normal', '100 900'),
    await face('Instrument Serif', 'instrument-serif-latin-400-normal.woff2', 'normal', '400'),
    await face('Instrument Serif', 'instrument-serif-latin-400-italic.woff2', 'italic', '400'),
  ].join('');
  const css = (await readFile(src('style.css'), 'utf8')).replace('/*@FONTS@*/', fonts);
  const js = jsText.replace(/<\/script/gi, '<\\/script');
  let html = await readFile(src('index.html'), 'utf8');
  html = html.replace('<!--@STYLE@-->', () => `<style>${css}</style>`).replace('<!--@SCRIPT@-->', () => `<script>${js}</script>`);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, html);
  return html.length;
}

const label = path.relative(root, out);
if (process.argv.includes('--watch')) {
  const ctx = await context({
    ...esbuildOptions,
    plugins: [...esbuildOptions.plugins, {
      name: 'assemble',
      setup(b) {
        b.onEnd(async (r) => {
          if (r.errors.length) return;
          const size = await assemble(r.outputFiles[0].text);
          console.log(`${label}  ${(size / 1024).toFixed(0)} KB`);
        });
      },
    }],
  });
  await ctx.watch();
  // index.html, style.css and the fonts are read outside the JS graph: watch them as well
  let timer = 0;
  for (const f of ['index.html', 'style.css', 'fonts']) {
    watch(src(f), () => {
      clearTimeout(timer);
      timer = setTimeout(() => ctx.rebuild().catch((e) => console.error(e.message)), 100);
    });
  }
} else {
  const r = await build(esbuildOptions);
  const size = await assemble(r.outputFiles[0].text);
  console.log(`${label}  ${(size / 1024).toFixed(0)} KB`);
}
