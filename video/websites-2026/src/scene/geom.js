import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Merge geometries that may mix indexed / non-indexed and slightly different attribute sets.
export function mergeSafe(list) {
  const flat = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const names = ['position', 'normal', 'uv', 'color'].filter((n) => flat.every((g) => g.attributes[n]));
  const clean = flat.map((g) => {
    for (const n of Object.keys(g.attributes)) if (!names.includes(n)) g.deleteAttribute(n);
    g.morphAttributes = {};
    return g;
  });
  const merged = mergeGeometries(clean, false);
  if (!merged) throw new Error('mergeSafe failed');
  return merged;
}
