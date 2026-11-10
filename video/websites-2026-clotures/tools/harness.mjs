// Bundles a module test page into ONE offline HTML (no fonts, no UI shell).
// usage: node tools/harness.mjs <entry.js> <out.html> [title]
// The entry creates its own renderer/canvas. Output goes to .cache/ (git-ignored) unless told otherwise.
import { build } from 'esbuild';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const [entry, outFile, title = 'harness'] = process.argv.slice(2);
if (!entry || !outFile) { console.error('usage: node tools/harness.mjs <entry.js> <out.html> [title]'); process.exit(1); }
const r = await build({ entryPoints: [entry], bundle: true, minify: false, format: 'iife', write: false, logLevel: 'warning', target: ['chrome100'] });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title>` +
  `<style>html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block;width:100%;height:100%}</style>` +
  `</head><body><script>${js}</script></body></html>`;
await mkdir(path.dirname(outFile), { recursive: true });
await writeFile(outFile, html);
console.log(outFile, (html.length / 1024).toFixed(0) + ' KB');
