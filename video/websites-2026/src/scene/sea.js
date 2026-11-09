import * as THREE from 'three';
import { ATMOS_GLSL, hazeUniform } from './atmosphere.js';
import { SUN_LIGHT } from './config.js';
import { mulberry32 } from './noise.js';

// Deep-water wave spectrum: direction, wavenumber, steepness, angular speed.
function waveTable(count, seed) {
  const rnd = mulberry32(seed);
  const waves = [];
  const wind = Math.atan2(-0.8, 0.6); // waves travel toward the north-east
  let lambda = 34;
  for (let i = 0; i < count; i++) {
    const u = i / (count - 1);
    const spread = (rnd() - 0.5) * (0.7 + u * 1.6) + (i % 5 === 3 ? 1.1 : 0);
    const a = wind + spread;
    const k = (2 * Math.PI) / lambda;
    // gentle swell, livelier small ripples (they make the glitter)
    let steep = (0.009 + 0.042 * u * u + 0.01 * rnd());
    if (i < 5) steep *= 0.5; // calmer long swell: no regular bands in the foreground
    const w = Math.sqrt(9.81 * k);
    waves.push([Math.cos(a), Math.sin(a), k, steep, w, rnd() * 6.283]);
    lambda *= 0.74 + rnd() * 0.05;
  }
  return waves;
}

export function createSea({ shoreTex, shoreRect, noiseTex, rippleTex, waveCount = 20, yachts = null, basin = [0, 0, 0, 0], marina = null }) {
  const NY = yachts ? yachts.count : 0;
  // marina: lamp heads and berthed yachts, mirrored in the calm basin water only
  const NL = marina ? marina.lampHeads.length : 0;
  const NMY = marina ? marina.berths.length : 0;
  const waves = waveTable(waveCount, 4);
  const f = (x) => x.toFixed(5);
  const wa = waves.map((w) => `vec4(${f(w[0])}, ${f(w[1])}, ${f(w[2])}, ${f(w[3])})`).join(',\n');
  const wb = waves.map((w) => `vec2(${f(w[4])}, ${f(w[5])})`).join(',\n');

  const geo = new THREE.PlaneGeometry(90000, 90000, 1, 1);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    name: 'Sea',
    uniforms: {
      fogDensity: hazeUniform,
      uTime: { value: 0 },
      uPixAngle: { value: 0.0006 },
      uShore: { value: shoreTex },
      uShoreRect: { value: shoreRect },
      uNoise: { value: noiseTex },
      uRipple: { value: rippleTex },
      uLightDir: { value: SUN_LIGHT.clone() },
      uGlitter: { value: 1.0 },
      uDpr: { value: 1.0 },
      uBasin: { value: new THREE.Vector4(...basin) },
      ...(NL ? { uLamps: { value: marina.lampHeads.map(([x, y, z]) => new THREE.Vector3(x, y, z)) } } : {}),
      ...(NMY ? { uMY: { value: marina.berths.map(([x, z, hd, sc]) => new THREE.Vector4(x, z, Math.cos(hd) / sc, -Math.sin(hd) / sc)) } } : {}),
      ...(yachts ? { uYacht: yachts.uYacht, uYachtS: yachts.uYachtS } : {}),
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vRel;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        vRel = wp.xyz - cameraPosition;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform float fogDensity;
      uniform float uTime;
      uniform float uPixAngle;
      uniform sampler2D uShore;
      uniform vec4 uShoreRect;
      uniform sampler2D uNoise;
      uniform sampler2D uRipple;
      uniform vec3 uLightDir;
      uniform float uGlitter;
      uniform float uDpr;
      uniform vec4 uBasin;   // marina basin (x0, z0, x1, z1): sheltered, almost flat water
      #define NL ${NL}
      #define NMY ${NMY}
      #if NL > 0
      uniform vec3 uLamps[NL];   // quay, pontoon and breakwater lamp heads
      #endif
      #if NMY > 0
      uniform vec4 uMY[NMY];     // berthed yachts: x, z, bow direction / scale
      #endif
      #define NY ${NY}
      #if NY > 0
      uniform vec4 uYacht[NY];   // x, z, bow direction (cos, sin) in the xz plane
      uniform vec2 uYachtS[NY];  // scale, distance travelled (0: anchored)
      #endif
      varying vec3 vWorld;
      varying vec3 vRel;
      ${ATMOS_GLSL}

      float h21(vec2 q) {
        q = fract(q * vec2(233.34, 851.73));
        q += dot(q, q + 23.45);
        return fract(q.x * q.y);
      }
      // sparse twinkling glints on a world-anchored lattice (cells: cz metres deep, cx wide);
      // mean 1 over space and time
      float glint(vec2 p, float lv, float aspect) {
        float c = 0.3 * exp2(lv);
        vec2 q = p / vec2(c * aspect, c);
        vec2 s = floor(q) + lv * 41.7;
        float a = h21(s);
        float ph = uTime * (1.6 + 2.6 * a) + a * 11.0;
        float on = step(h21(s + floor(ph) * vec2(5.17, 3.71)), 0.13);
        return on * sin(3.14159 * fract(ph)) * 12.08;
      }
      // reflection of a motor yacht along the reflected ray: an elliptic cylinder clipped to its
      // side profile (local metres of the 30 m model, bow toward +x). rgb colour, a weight
      vec4 yachtReflect(vec2 lo, vec2 rdW, float rY, float sc) {
        vec2 o = (lo - vec2(-0.5, 0.0)) / vec2(15.2, 3.3);
        vec2 rd = rdW / (sc * vec2(15.2, 3.3));
        float qa = dot(rd, rd), qb = 2.0 * dot(o, rd), qc = dot(o, o) - 1.0;
        float disc = qb * qb - 4.0 * qa * qc;
        if (qc > 0.0 && qb < 0.0 && disc > 0.0) {
          float th = (-qb - sqrt(disc)) / (2.0 * qa);
          float hy = th * rY / sc;                      // height on the yacht (local metres)
          float hx = (o.x + th * rd.x) * 15.2 - 0.5;    // and position along it
          float top = hx > 4.0 ? 2.4 + max(0.0, hx - 4.0) * 0.1 : (hx > 2.9 ? 4.64 : (hx > -10.2 ? 6.7 : (hx > -12.6 ? 4.64 : 2.2)));
          if (hy < top) {
            float gl = smoothstep(2.75, 2.9, hy) * smoothstep(4.1, 3.95, hy) + smoothstep(5.0, 5.15, hy) * smoothstep(6.2, 6.05, hy);
            vec3 yc = mix(vec3(0.74, 0.71, 0.66), vec3(0.03, 0.035, 0.045), gl * 0.85);
            yc = mix(yc, vec3(0.05, 0.06, 0.08), smoothstep(0.42, 0.28, hy));
            return vec4(yc, smoothstep(0.0, 0.3, top - hy));
          }
        }
        return vec4(0.0);
      }
      #define NW ${waves.length}
      const vec4 WA[NW] = vec4[NW](${wa});
      const vec2 WB[NW] = vec2[NW](${wb});

      void main() {
        float dist = length(vRel);
        vec3 V = -vRel / dist;                 // toward the camera
        float graze = max(abs(V.y), 0.02);
        float foot = dist * uPixAngle / graze;   // pixel footprint along the view direction
        vec2 p = vWorld.xz;
        vec2 g = vec2(0.0);
        float unresolved = 0.0;
        for (int i = 0; i < NW; i++) {
          vec4 a = WA[i];
          vec2 b = WB[i];
          float lambda = 6.2831853 / a.z;
          float fade = 1.0 - smoothstep(0.12, 0.45, foot / lambda);
          float ph = a.z * dot(a.xy, p) - b.x * uTime + b.y;
          g += a.xy * (a.w * cos(ph) * fade);
          unresolved += (1.0 - fade) * a.w * a.w * 0.5;
        }
        // two scrolling layers of tileable ripples break the regularity of the sines
        vec2 rA = texture2D(uRipple, p / 9.0 + vec2(0.011, 0.006) * uTime).xy * 2.0 - 1.0;
        vec2 rB = texture2D(uRipple, mat2(0.8, -0.6, 0.6, 0.8) * p / 3.3 + vec2(-0.017, 0.013) * uTime).xy * 2.0 - 1.0;
        vec2 rC = texture2D(uRipple, mat2(0.6, 0.8, -0.8, 0.6) * p / 41.0 + vec2(0.004, -0.003) * uTime).xy * 2.0 - 1.0;
        float fC = 1.0 - smoothstep(0.12, 0.45, foot / 5.0);
        g += rC * 0.05 * fC;
        unresolved += (1.0 - fC) * 0.0006;
        float fA = 1.0 - smoothstep(0.12, 0.45, foot / 1.1);
        float fB = 1.0 - smoothstep(0.12, 0.45, foot / 0.4);
        g += rA * 0.07 * fA + rB * 0.06 * fB;
        unresolved += (1.0 - fA) * 0.0012 + (1.0 - fB) * 0.0009;
        // shallow water and shore from the terrain depth map
        // wind slicks: large calm patches break the regular wave pattern
        float sl = texture2D(uNoise, p / 300.0 + vec2(0.37, 0.11)).r * 0.65 + texture2D(uNoise, p / 95.0 + vec2(0.71, 0.53)).g * 0.35;
        float slick = smoothstep(0.32, 0.68, sl);
        g *= mix(0.35, 1.0, slick);
        vec2 suv = (p - uShoreRect.xy) * uShoreRect.zw;
        float depth = 30.0;
        if (suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) depth = texture2D(uShore, suv).r * 30.0;
        float calm = smoothstep(0.0, 6.0, depth);
        g *= mix(0.35, 1.0, calm);
        float inBasin = smoothstep(uBasin.x, uBasin.x + 10.0, p.x) * smoothstep(uBasin.z, uBasin.z - 5.0, p.x)
          * smoothstep(uBasin.y, uBasin.y + 5.0, p.y) * smoothstep(uBasin.w, uBasin.w - 5.0, p.y);
        g *= 1.0 - 0.75 * inBasin;
        unresolved *= 1.0 - 0.85 * inBasin;
        vec3 N = normalize(vec3(-g.x, 1.0, -g.y));

        // sky reflection. Sub-pixel waves are not flat: their facets tilted toward the viewer
        // reflect higher, bluer sky and see the water at a steeper angle (darker, bluer sea
        // in the distance instead of a mirror of the bright horizon)
        float rough = sqrt(unresolved);
        vec3 R = reflect(-V, N);
        R.y = abs(R.y) * 0.9 + 0.004 + rough * 0.6;
        // the far sea mirrors the low, pale sky (peach-lavender toward the sun) rather than the
        // azure overhead; the near water keeps its blue
        R.y = min(R.y, mix(0.6, 0.05, smoothstep(150.0, 1300.0, dist)));
        vec3 Rn = normalize(R);
        vec3 refl = skyBase(Rn);
        // the sun's energy is carried by the glitter below: drop the sharp part of the glow
        // around the sun from the mirrored sky (otherwise a smooth, milky column)
        float sdR = max(dot(Rn, SUN_V), 0.0);
        refl -= vec3(1.0, 0.46, 0.16) * (pow(sdR, 48.0) * 0.14 + pow(sdR, 520.0) * 0.12) * 0.9;
        // the tower mirrored in the water: a soft, wave-broken, darker column of glass crossed by
        // thin bright slab streaks (closest approach of the reflected ray to the tower axis gives
        // soft sides; a ~5 m noise breaks its outline)
        {
          vec3 P0 = vWorld;
          float qa = dot(Rn.xz, Rn.xz);
          if (qa > 1e-6) {
            vec2 wob = texture2D(uNoise, p / 1100.0 + vec2(0.13, 0.71)).rg - 0.5;
            float perp = abs(P0.x * Rn.z - P0.z * Rn.x) / sqrt(qa) + wob.x * 5.0;
            float side = smoothstep(15.5, 10.0, perp);
            float th = -dot(P0.xz, Rn.xz) / qa;
            float hy = P0.y + th * Rn.y + wob.y * 4.0;
            if (side > 0.0 && th > 0.0 && hy > 6.0 && hy < 104.0) {
              float band = smoothstep(0.72, 0.8, fract((hy - 13.0) / 3.5));
              vec3 towerCol = mix(vec3(0.16, 0.20, 0.27), vec3(0.78, 0.68, 0.56), band);
              float edge = smoothstep(104.0, 96.0, hy) * smoothstep(6.0, 12.0, hy);
              refl = mix(refl, towerCol, 0.5 * edge * side);
            }
          }
        }
        // marina basin: a darker basin, the berthed yachts mirrored in the calm water
        refl *= 1.0 - 0.5 * inBasin;
        float inWide = step(uBasin.x - 20.0, p.x) * step(p.x, uBasin.z + 20.0) * step(uBasin.y - 10.0, p.y) * step(p.y, uBasin.w + 70.0);
        #if NMY > 0
        if (inBasin > 0.0) {
          for (int i = 0; i < NMY; i++) {
            vec4 Y = uMY[i];
            vec2 dd = p - Y.xy;
            vec2 lo = vec2(dot(dd, Y.zw), dd.y * Y.z - dd.x * Y.w);   // local metres of the model
            if (dot(lo, lo) > 1600.0) continue;   // its reflection lies within ~40 local metres
            float sc = inversesqrt(dot(Y.zw, Y.zw));
            vec4 yr = yachtReflect(lo, vec2(dot(Rn.xz, Y.zw), Rn.z * Y.z - Rn.x * Y.w) * sc, Rn.y, sc);
            refl = mix(refl, yr.rgb, 0.85 * yr.a);
          }
        }
        #endif
        // yachts: reflections (reflected ray against an elliptic cylinder, clipped to the
        // side profile), a foam line at the waterline and the wake of the cruising one
        float yFoam = 0.0;
        #if NY > 0
        for (int i = 0; i < NY; i++) {
          vec4 Y = uYacht[i];
          float sc = uYachtS[i].x;
          vec2 ax = Y.zw;
          vec2 pr = vec2(-ax.y, ax.x);
          vec2 dd = p - Y.xy;
          vec2 lo = vec2(dot(dd, ax), dot(dd, pr)) / sc;   // local metres, x toward the bow
          float run = uYachtS[i].y;
          if (dot(lo, lo) > (200.0 + run) * (200.0 + run)) continue;
          vec4 yr = yachtReflect(lo, vec2(dot(Rn.xz, ax), dot(Rn.xz, pr)), Rn.y, sc);
          refl = mix(refl, yr.rgb, 0.85 * yr.a);
          // foam hugging the waterline (pointed bow, square transom)
          vec2 wl = (lo - vec2(-1.5, 0.0)) / vec2(13.6, 2.95);
          float e = pow(abs(wl.x), wl.x > 0.0 ? 1.7 : 6.0) + wl.y * wl.y;
          float fn = texture2D(uNoise, p * 0.07 + vec2(uTime * 0.03, Y.x * 0.01)).r;
          yFoam += exp(-max(e - 1.0, 0.0) * 5.0) * step(1.0, e) * (0.25 + 0.3 * fn);
          // wake: Kelvin arms (19.5 deg) and the turbulent wash, as long as the run so far
          if (run > 0.0) {
            float b = -lo.x - 15.0;                         // metres behind the transom
            float bb = max(b, 0.0);
            float len = smoothstep(run, run - 25.0, bb) * smoothstep(-3.0, 1.0, b);
            float arm = exp(-pow((abs(lo.y) - 3.0 - bb * 0.354) / (1.1 + bb * 0.07), 2.0)) * exp(-bb / 120.0);
            float wash = exp(-pow(lo.y / (2.6 + bb * 0.07), 2.0)) * exp(-bb / 80.0);
            float n1 = texture2D(uNoise, p * 0.11 + vec2(uTime * 0.02, 0.0)).g;
            float n2 = texture2D(uNoise, p * 0.37 - vec2(0.0, uTime * 0.05)).b;
            float bow = exp(-pow((abs(lo.y) - 3.1 - max(0.0, 9.0 - lo.x) * 0.25) / 0.9, 2.0)) * smoothstep(-4.0, 6.0, lo.x) * smoothstep(16.0, 11.0, lo.x);
            yFoam += len * (arm * 0.8 * smoothstep(0.2, 0.7, n1) + wash * 1.2 * smoothstep(0.1, 0.6, n2 * 0.5 + n1 * 0.5)) + bow * 0.6 * n2;
          }
        }
        #endif
        float nv = max(dot(N, V), 0.0);
        float nvF = min(1.0, nv + rough * 0.6);
        float F = 0.02 + 0.98 * pow(1.0 - nvF, 5.0);

        // water body (deep blue, turquoise in the shallows)
        vec3 deep = vec3(0.012, 0.05, 0.10);
        vec3 shallow = vec3(0.020, 0.150, 0.150);
        vec3 bed = vec3(0.230, 0.200, 0.150);
        float sh = exp(-depth / 3.5);
        vec3 body = mix(deep, shallow, sh);
        body = mix(body, bed * 0.55, exp(-depth / 0.9) * 0.7);
        body *= 0.7 + 0.6 * max(uLightDir.y, 0.0);

        body *= 1.0 - 0.45 * inBasin;
        vec3 col = mix(body, refl, F);
        // warm lamps streaking on the sheltered water (and a little beyond the breakwater)
        #if NL > 0
        if (inWide > 0.0) {
          vec3 lg = vec3(0.0);
          float s2l = 0.006 + unresolved * 0.6;
          vec3 Rm = vec3(-V.x, V.y, -V.z);   // mirror direction of the flat water
          for (int i = 0; i < NL; i++) {
            vec3 Lp = uLamps[i] - vWorld;
            float d2 = dot(Lp, Lp);
            if (d2 > 6400.0) continue;
            vec3 Ld = Lp * inversesqrt(d2);
            if (dot(Ld, Rm) < 0.8) continue;   // far outside the streak
            vec3 Hl = normalize(Ld + V);
            float nhl = max(dot(N, Hl), 1e-3);
            float nhl2 = nhl * nhl;
            float Dl = exp(-(1.0 - nhl2) / nhl2 / (2.0 * s2l)) / (6.2831853 * s2l * nhl2 * nhl2);
            lg += vec3(Dl / d2 * smoothstep(6400.0, 3600.0, d2));
          }
          col += vec3(1.0, 0.6, 0.28) * lg * 9.0 * mix(0.35, 1.0, inBasin);
        }
        #endif

        // sun glitter: Beckmann lobe on the resolved normal, widened by the sub-pixel waves.
        // Its mean is drawn as sparse twinkling glints (bloom turns them into gold sparkles)
        // that merge into a continuous band toward the horizon. Moderate HDR values keep the
        // path golden through ACES instead of a milky white column.
        vec3 Hh = normalize(SUN_V + V);
        float nh = max(dot(N, Hh), 1e-3);
        float nh2 = nh * nh;
        float tan2 = (1.0 - nh2) / nh2;
        float s2g = 0.0014 + unresolved * 0.3;
        float D = exp(-tan2 / (2.0 * s2g)) / (6.2831853 * s2g * nh2 * nh2);
        float Fh = 0.02 + 0.98 * pow(1.0 - max(dot(V, Hh), 0.0), 5.0);
        float spec = D * Fh / (4.0 * max(nv, 0.08));
        float gMean = min(spec * 0.12, 0.32);
        // glint cells about 1.2-2.4 CSS px tall and 2.5 times as wide on screen (two lattice
        // levels, dithered, so nothing pops when the footprint changes)
        vec2 fp = abs(dFdx(p)) + abs(dFdy(p));          // pixel footprint along world x and z
        float lv = log2(max(fp.y, 1e-4) * 1.2 * uDpr / 0.3);   // sized in CSS pixels
        float l0 = floor(lv);
        float aspect = 2.5 * clamp(fp.x / max(fp.y, 1e-4), 0.03, 1.0);
        // one level per cell, dithered by the blend weight: averaging two levels would flatten
        // the sparkle into a smooth wash
        float cA = 0.3 * exp2(l0 + 1.0);
        float pick = h21(floor(p / vec2(cA * aspect, cA)) + 7.3);
        float spk = glint(p, pick < lv - l0 ? l0 + 2.0 : l0 + 1.0, aspect);
        spk = mix(spk, 1.0, smoothstep(400.0, 3000.0, dist) * 0.8);
        // saturated input: ACES turns it into gold (a less saturated orange comes out cream)
        col += vec3(1.0, 0.5, 0.1) * gMean * spk * uGlitter;

        // foam around the yachts and in the wake
        col = mix(col, vec3(0.92, 0.88, 0.82) * (0.7 + 0.6 * max(uLightDir.y, 0.0)), clamp(yFoam, 0.0, 1.0) * 0.75);

        // foam where the sea meets the rocks
        float fn = texture2D(uNoise, p * 0.045 + vec2(uTime * 0.02, 0.0)).g;
        float fn2 = texture2D(uNoise, p * 0.13 - vec2(0.0, uTime * 0.03)).b;
        float surge = 0.5 + 0.5 * sin(uTime * 0.9 + p.x * 0.05 + p.y * 0.04);
        float foam = smoothstep(0.9 + 0.5 * surge, 0.15, depth + fn * 0.9) * smoothstep(0.25, 0.65, fn2 + 0.25) * (1.0 - 0.8 * inBasin);
        vec3 foamCol = vec3(0.92, 0.88, 0.82) * (0.45 + 0.9 * max(dot(vec3(0.0, 1.0, 0.0), uLightDir), 0.0) + 0.25);
        col = mix(col, foamCol, foam * 0.55);

        col = applyAtmos(col, vRel, cameraPosition.y);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'sea';
  mesh.renderOrder = -10;
  return mesh;
}
