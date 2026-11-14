// Shared by build.mjs and tools/harness.mjs: every font of the project as base64 @font-face rules.
// Canvas textures drawn with these families (dial print, engravings, labels) must first
// `await document.fonts.load(...)`.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const RANGE = 'unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

export const FONTS = [
  // family, file, style, weight
  ['Instrument Serif', 'instrument-serif-latin-400-normal.woff2', 'normal', '400'], // headlines, the name
  ['Instrument Serif', 'instrument-serif-latin-400-italic.woff2', 'italic', '400'],
  ['Archivo', 'archivo-latin-400-normal.woff2', 'normal', '400'], // captions, nav, labels
  ['Archivo', 'archivo-latin-500-normal.woff2', 'normal', '500'],
  ['Archivo', 'archivo-latin-600-normal.woff2', 'normal', '600'],
  ['Archivo', 'archivo-latin-700-normal.woff2', 'normal', '700'],
  ['Archivo', 'archivo-latin-800-normal.woff2', 'normal', '800'],
  ['Yellowtail', 'yellowtail-latin-400-normal.woff2', 'normal', '400'], // the bottles' script
];

export async function fontFaces(fontDir) {
  const out = [];
  for (const [family, file, style, weight] of FONTS) {
    const b64 = (await readFile(path.join(fontDir, file))).toString('base64');
    out.push(`@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:block;` +
      `src:url(data:font/woff2;base64,${b64}) format('woff2');${RANGE}}`);
  }
  return out.join('');
}
