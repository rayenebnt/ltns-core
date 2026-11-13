// BALANCIER studio: the light studio, the blue, THE TIDE and the sapphire look (one import for the world).
// createStudio (studio.js) wires everything; the parts below stay available on their own.
export { createStudio, ENV_SIZE } from './studio.js';
export { createStudioEnv, ENV_RIGS } from './env.js';
export { createBackground, tideY, tideCssY } from './background.js';
export { createTideUniforms, setTideSize, patchTide, patchTideMeshes, TIDE_MATERIAL_GLSL } from './tide.js';
export { createSapphireKit } from './sapphire.js';
export { createShadows } from './shadow.js';
export { createStudioLights } from './lights.js';
export { TIDE, tideBase, tideWave, tideForCssY, TIDE_GLSL } from './wave.js';
