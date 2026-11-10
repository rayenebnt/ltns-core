// Extracts the outlines of the few glyphs used by the 3D relief words (Inter Tight Black Italic,
// SIL OFL 1.1, see src/fonts/OFL-inter-tight.txt) into a small typeface JSON read by three's Font.
// The JSON is committed: this script only needs to run again if the words change.
//
//   npm i --no-save @fontsource/inter-tight@5.3.0
//   node tools/glyphs.mjs [path/to/inter-tight-latin-900-italic.woff]
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = process.argv[2] || path.join(root, 'node_modules/@fontsource/inter-tight/files/inter-tight-latin-900-italic.woff');
const WORDS = ['ÉNERGIE', 'ÉLAN', 'TONUS', 'ÉCLAT'];

const buf = readFileSync(src);
const json = new TTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const chars = [...new Set(WORDS.join(''))].sort();
const glyphs = {};
for (const c of chars) {
  if (!json.glyphs[c]) throw new Error(`glyph missing: ${c}`);
  glyphs[c] = json.glyphs[c];
}
const out = {
  license: 'Inter Tight Black Italic, Copyright 2022 The Inter Project Authors. SIL Open Font License 1.1 (src/fonts/OFL-inter-tight.txt). Subset: glyph outlines of ' + chars.join(''),
  familyName: json.familyName,
  ascender: json.ascender,
  descender: json.descender,
  underlinePosition: json.underlinePosition,
  underlineThickness: json.underlineThickness,
  boundingBox: json.boundingBox,
  resolution: json.resolution,
  glyphs,
};
const dst = path.join(root, 'src/fonts/inter-tight-black-italic-words.json');
writeFileSync(dst, JSON.stringify(out));
console.log(dst, (JSON.stringify(out).length / 1024).toFixed(1), 'KB', chars.join(''), 'resolution', json.resolution);
