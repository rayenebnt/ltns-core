// A tileable smooth-noise texture shared by the shaders (sky clouds, lawn, fields, bark).
// RGBA = four independent periodic value-noise layers of increasing frequency, so a few
// fetches at different scales make a cheap fbm. Generated once at load time.
import * as THREE from 'three';
import { mulberry32 } from './noise.js';

function periodicNoise(N, period, seed) {
  const rnd = mulberry32(seed);
  const lat = new Float32Array(period * period);
  for (let i = 0; i < lat.length; i++) lat[i] = rnd();
  const out = new Float32Array(N * N);
  const q = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  for (let y = 0; y < N; y++) {
    const fy = (y / N) * period;
    const iy = Math.floor(fy), ty = q(fy - iy);
    const y0 = iy % period, y1 = (iy + 1) % period;
    for (let x = 0; x < N; x++) {
      const fx = (x / N) * period;
      const ix = Math.floor(fx), tx = q(fx - ix);
      const x0 = ix % period, x1 = (ix + 1) % period;
      const a = lat[y0 * period + x0], b = lat[y0 * period + x1];
      const c = lat[y1 * period + x0], d = lat[y1 * period + x1];
      out[y * N + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
  }
  return out;
}

let cached = null;
export function noiseTexture() {
  if (cached) return cached;
  const N = 256;
  const layers = [periodicNoise(N, 8, 11), periodicNoise(N, 16, 12), periodicNoise(N, 32, 13), periodicNoise(N, 64, 14)];
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) for (let c = 0; c < 4; c++) data[i * 4 + c] = Math.round(layers[c][i] * 255);
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  t.name = 'garden-noise';
  cached = t;
  return t;
}
