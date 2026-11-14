// Bundles src/ into ONE self-contained file: dist/braise.html
// (JS + CSS + base64 fonts inline, no network access at runtime).
// WORLD=stub node build.mjs  -> resolves './world/index.js' to './world-stub/index.js' (shell work without the real 3D world).
// OUT=name.html node build.mjs -> writes dist/name.html instead (use it for stub builds, so dist/braise.html stays the real one).
import { build, context } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fontFaces } from './tools/fonts.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => path.join(root, 'src', p);
const out = path.join(root, 'dist', process.env.OUT || 'braise.html');

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
  legalComments: 'eof', // three.js's MIT notice stays in the file (the fonts' notice: style.css)
  write: false,
  logLevel: 'warning',
  plugins: [worldStub],
};

async function assemble(jsText) {
  const fonts = await fontFaces(src('fonts'));
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
