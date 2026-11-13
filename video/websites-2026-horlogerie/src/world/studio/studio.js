// BALANCIER studio: everything of src/world/studio wired together for the world (one call), so the tide's
// shared uniforms, render order, visibility, env swaps and twin sync cannot drift apart.
//
//   const studio = createStudio({ renderer, quality });      // envs (light + night), background, tide
//   scene.add(studio.group);                                  // uniforms, shadows, lights, sapphire kit
//   const glass = studio.attach(watch);                       // patches the steel materials 'above' the
//                                                             // line, builds the sapphire twin (shared buffers)
//   every frame, AFTER watch.pose / bracelet / setTime / setMovement:
//   studio.update({ tide, wipe, night, time, density });
//     tide   0..1  the background's line: 0 light studio … 1 blue (the shadows fade with it)
//     wipe   0..1  the materials' line (default = tide): steel above, sapphire below; in 05 Restauration keep
//                  tide = 1 and run wipe 1 → 0 (the reverse wipe: the steel comes back from the top)
//     night  0..1  the blue's night variant + the night env and lights for the steel (swap it while the
//                  steel is hidden, i.e. while wipe = 1: the env swap itself is a hard switch at 0.5)
//     time   s     the ripple and the blue's light play
//     density      sapphire body light + streaks (1.4 assembled, the default; ~1.8 on the exploded line)
//   studio.resize(renderer) after every renderer.setSize / setPixelRatio
//   studio.lineCssY(w, h) → anchors().tide.y;  studio.stage() → 'studio' | 'tide' | 'blue' | 'night'
//   studio.warmup(renderer, scene, camera) compiles every studio program once (call in world.warmup)
//
// Render order: background -1000 (opaque list, first; no depth), shadows -900 (first transparent), the
// steel watch (0), the sapphire twin 100 … 100 + n (last, fixed blend order). Keep other transparent
// objects outside 100 … 160.
import * as THREE from 'three';
import { createStudioEnv } from './env.js';
import { createBackground } from './background.js';
import { createTideUniforms, setTideSize, patchTideMeshes } from './tide.js';
import { createSapphireKit } from './sapphire.js';
import { createShadows } from './shadow.js';
import { createStudioLights } from './lights.js';

// PMREM cube size per quality level (r170's fromScene is fixed at 256; other sizes go through a cube camera).
// The size is chosen once: a later size change recompiles the env-mapped programs.
export const ENV_SIZE = { low: 128, medium: 256, high: 256, max: 512 };

export function createStudio({ renderer, quality = 'high', envSize = null } = {}) {
  const size = envSize || ENV_SIZE[quality] || 256;
  const tide = createTideUniforms();
  const env = {
    light: createStudioEnv(renderer, { variant: 'light', size }),
    night: createStudioEnv(renderer, { variant: 'night', size }),
  };
  const background = createBackground({ uniforms: tide });
  const shadows = createShadows({ uniforms: tide });
  const lights = createStudioLights();
  const kit = createSapphireKit({ envMap: env.light.texture, uniforms: tide });
  const group = new THREE.Group();
  group.name = 'studio';
  group.add(background.mesh, shadows.group, lights.group);
  setTideSize(tide, renderer);

  let watch = null, glass = null, steelEnv = null;
  const state = { tide: 0, wipe: 0, night: 0, time: 0 };

  function attach(w, { renderOrder = 100 } = {}) {
    watch = w;
    patchTideMeshes(w.meshes(), 'above', tide);
    glass = kit.twin(w.group, { renderOrder });
    group.add(glass.group); // sync() writes world matrices relative to this parent
    steelEnv = null;
    apply();
    return glass;
  }

  function apply() {
    const { tide: k, wipe, night, time } = state;
    background.update({ tide: k, time, night });
    tide.uWipe.value = wipe;
    lights.setVariant(night);
    if (watch) {
      const want = night >= 0.5 ? env.night.texture : env.light.texture;
      if (want !== steelEnv) { watch.setEnvMap(want); steelEnv = want; }
      watch.group.visible = wipe < 1; // the steel draws above the line only: off-screen at wipe = 1
      glass.group.visible = wipe > 0; // the sapphire below it only: off-screen at wipe = 0
      if (glass.group.visible) glass.sync();
    }
  }

  return {
    group,
    tide,
    uniforms: tide,
    env,
    background,
    shadows,
    lights,
    kit,
    get glass() { return glass; },
    attach,
    update({ tide: k = 0, wipe = k, night = 0, time = 0, density } = {}) {
      Object.assign(state, { tide: k, wipe, night, time });
      if (density !== undefined) kit.setDensity(density);
      apply();
    },
    resize(r = renderer) { setTideSize(tide, r); },
    lineCssY(w, h) { return background.lineCssY(w, h); },
    stage() {
      if (state.night >= 0.5) return 'night';
      if (state.tide <= 0 && state.wipe <= 0) return 'studio';
      if (state.tide >= 1 && state.wipe >= 1) return 'blue';
      return 'tide';
    },
    // compiles the studio's programs (background, shadows, steel patched, sapphire) in one go: renders the
    // tide state once with everything visible, then restores the state
    warmup(r = renderer, scene, camera) {
      const saved = { ...state };
      const shadowVis = [shadows.contact.mesh.visible, shadows.band.mesh.visible];
      shadows.contact.mesh.visible = shadows.band.mesh.visible = true;
      Object.assign(state, { tide: 0.5, wipe: 0.5 });
      apply();
      if (scene && camera) { r.compile(scene, camera); r.render(scene, camera); }
      shadows.contact.mesh.visible = shadowVis[0];
      shadows.band.mesh.visible = shadowVis[1];
      Object.assign(state, saved);
      apply();
    },
    dispose() {
      kit.dispose();
      background.dispose();
      shadows.dispose();
      lights.dispose();
      env.light.dispose();
      env.night.dispose();
      group.removeFromParent();
    },
  };
}
