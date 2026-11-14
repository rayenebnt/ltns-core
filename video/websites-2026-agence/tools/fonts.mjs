// Shared by build.mjs and tools/harness.mjs: every font of the project as base64 @font-face rules.
// Canvas textures drawn with these families (dial print, engravings, labels) must first
// `await document.fonts.load(...)`.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const RANGE = 'unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

export const FONTS = [
  // family, file, style, weight
  ['Cormorant SC', 'cormorant-sc-latin-500-normal.woff2', 'normal', '500'], // logo, nav, headlines (true small capitals)
  ['Cormorant SC', 'cormorant-sc-latin-600-normal.woff2', 'normal', '600'],
  ['Cormorant SC', 'cormorant-sc-latin-700-normal.woff2', 'normal', '700'],
  ['EB Garamond', 'eb-garamond-latin-400-normal.woff2', 'normal', '400'], // body text
  ['EB Garamond', 'eb-garamond-latin-400-italic.woff2', 'italic', '400'],
  ['EB Garamond', 'eb-garamond-latin-500-normal.woff2', 'normal', '500'],
  ['EB Garamond', 'eb-garamond-latin-500-italic.woff2', 'italic', '500'],
  ['EB Garamond', 'eb-garamond-latin-600-normal.woff2', 'normal', '600'],
  ['JetBrains Mono', 'jetbrains-mono-latin-400-normal.woff2', 'normal', '400'], // technical labels, part names, numbers
  ['JetBrains Mono', 'jetbrains-mono-latin-500-normal.woff2', 'normal', '500'],
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
