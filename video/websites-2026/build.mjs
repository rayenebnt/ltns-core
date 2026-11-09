// Bundles src/ into ONE self-contained file: dist/cap-lumiere.html
// (JS + CSS + base64 font inline, no network access at runtime).
import { build, context } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = (p) => path.join(root, 'src', p);
const out = path.join(root, 'dist', 'cap-lumiere.html');

const esbuildOptions = {
  entryPoints: [src('main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['chrome100', 'edge100', 'safari15.4', 'firefox110'],
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
};

async function assemble(jsText) {
  const font = (await readFile(src('fonts/inter-tight-latin.woff2'))).toString('base64');
  const fontFace =
    `@font-face{font-family:'Inter Tight';font-style:normal;font-weight:100 900;font-display:block;` +
    `src:url(data:font/woff2;base64,${font}) format('woff2');` +
    `unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}`;
  const css = (await readFile(src('style.css'), 'utf8')).replace('/*@FONTS@*/', fontFace);
  const js = jsText.replace(/<\/script/gi, '<\\/script');
  let html = await readFile(src('index.html'), 'utf8');
  html = html.replace('<!--@STYLE@-->', () => `<style>${css}</style>`).replace('<!--@SCRIPT@-->', () => `<script>${js}</script>`);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, html);
  return html.length;
}

if (process.argv.includes('--watch')) {
  const ctx = await context({
    ...esbuildOptions,
    plugins: [{
      name: 'assemble',
      setup(b) {
        b.onEnd(async (r) => {
          if (r.errors.length) return;
          const size = await assemble(r.outputFiles[0].text);
          console.log(`dist/cap-lumiere.html  ${(size / 1024).toFixed(0)} KB`);
        });
      },
    }],
  });
  await ctx.watch();
  // index.html, style.css and the font are read outside the JS graph: watch them as well
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
  console.log(`dist/cap-lumiere.html  ${(size / 1024).toFixed(0)} KB`);
}
