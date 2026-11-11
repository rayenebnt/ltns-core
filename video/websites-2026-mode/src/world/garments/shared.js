// Disposal of the resources every garment shares (call when the whole world is torn down).
import { disposeTextures } from './textures.js';
import { disposeHangers } from './hanger.js';

export function disposeShared() {
  disposeTextures();
  disposeHangers();
}
