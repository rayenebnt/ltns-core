// Shared by build.mjs and tools/harness.mjs: every font of the project as base64 @font-face rules.
// Canvas textures drawn with these families (container stencils, signs, labels) must first
// `await document.fonts.load(...)`.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const RANGE = 'unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

export const FONTS = [
  // family, file, style, weight
  ['Inter Tight', 'inter-tight-latin.woff2', 'normal', '100 900'], // UI and body text
  ['Big Shoulders Display', 'big-shoulders-display-latin-600-normal.woff2', 'normal', '600'], // headlines (industrial condensed)
  ['Big Shoulders Display', 'big-shoulders-display-latin-800-normal.woff2', 'normal', '800'],
  ['Big Shoulders Display', 'big-shoulders-display-latin-900-normal.woff2', 'normal', '900'],
  ['Big Shoulders Stencil Display', 'big-shoulders-stencil-display-latin-700-normal.woff2', 'normal', '700'], // logo, container stencils
  ['Big Shoulders Stencil Display', 'big-shoulders-stencil-display-latin-900-normal.woff2', 'normal', '900'],
  ['JetBrains Mono', 'jetbrains-mono-latin-400-normal.woff2', 'normal', '400'], // labels, codes, split-flap board
  ['JetBrains Mono', 'jetbrains-mono-latin-500-normal.woff2', 'normal', '500'],
  ['JetBrains Mono', 'jetbrains-mono-latin-700-normal.woff2', 'normal', '700'],
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
