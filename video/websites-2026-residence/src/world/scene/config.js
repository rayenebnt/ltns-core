// Shared constants for the Cap Lumière scene (units: metres, Y up, north = -Z, east = +X).
import { Vector3, Matrix4 } from 'three';

const DEG = Math.PI / 180;

export function dirFromBearing(bearingDeg, elevationDeg) {
  const b = bearingDeg * DEG;
  const e = elevationDeg * DEG;
  return new Vector3(Math.sin(b) * Math.cos(e), Math.sin(e), -Math.cos(b) * Math.cos(e)).normalize();
}

// The sun we SEE (sky disc, sea glitter, haze glow) and the key light that shapes the
// buildings are art-directed separately, as in architectural photography.
export const SUN_VIEW = dirFromBearing(14, 1.4);
export const SUN_LIGHT = dirFromBearing(145, 15);

export const TOWER = {
  ground: 6.0, // plateau height
  lobbyH: 7.0,
  floorH: 3.5,
  floors: 26,
  slabT: 0.48,
  ga: 13.0, // glass line half size along local X
  gb: 10.5, // glass line half size along local Z
  gr: 5.0, // glass line corner radius
};

// The tower and the apartment are modelled in their own local frame, then the whole
// building is turned so that the living-room opening (local +X face) faces south (+Z),
// toward the hero camera: the dive then always looks north, into the bay and the sunset.
export const BUILDING_YAW = -Math.PI / 2;
const YAW = new Matrix4().makeRotationY(BUILDING_YAW);
export function toWorld(x, y, z) {
  return new Vector3(x, y, z).applyMatrix4(YAW);
}

export function floorY(k) {
  // top of the slab of floor k (k >= 1); floor 0 is the lobby
  if (k <= 0) return TOWER.ground;
  return TOWER.ground + TOWER.lobbyH + (k - 1) * TOWER.floorH;
}

export const ROOM_FLOOR = 99; // (Altière) no living room: the facade stays whole on every floor
export const FLOOR_MIN = 8;
export const FLOOR_MAX = ROOM_FLOOR;

// The living room occupies one corner of floor 14 (local frame: far wall at x = x0,
// side wall at z = z1, glazing on the x = ga face and around the rounded corner).
// The wide opening is on the straight part of the x = ga face, between openZ1 and openZ0;
// its two sliding panels stack into a wall pocket beyond openZ0.
export const ROOM = {
  x0: 4.0, // far (fireplace) wall
  z1: -1.5, // side wall
  y: floorY(ROOM_FLOOR),
  ceil: 2.98, // finished ceiling height above the slab top
  openZ0: -1.62,
  openZ1: -5.45,
};
ROOM.doorZ = (ROOM.openZ0 + ROOM.openZ1) / 2;
ROOM.doorW = ROOM.openZ0 - ROOM.openZ1;
// axis of the final, square-on view of the fireplace wall (local z): the fireplace, the
// painting and the chandelier are centred on it; it sits a little toward the windows so the
// sea shows on the right of the final frame
ROOM.axisZ = -6.5;

export const FLOOR_INFO = {
  8: ['2 pièces · 64\u00a0m² · vue mer', 'Exposition sud · balcon filant'],
  9: ['3 pièces · 82\u00a0m² · vue baie', 'Exposition sud-est · loggia 11\u00a0m²'],
  10: ['3 pièces · 98\u00a0m² · vue mer', 'Double exposition · terrasse 16\u00a0m²'],
  11: ['4 pièces · 112\u00a0m² · vue mer', 'Traversant · terrasse 18\u00a0m²'],
  12: ['3 pièces · 104\u00a0m² · vue baie', 'Angle sud-est · terrasse 20\u00a0m²'],
  13: ['4 pièces · 131\u00a0m² · vue mer', 'Double séjour · terrasse 22\u00a0m²'],
  14: ['5 pièces · 168\u00a0m² · vue mer', 'Séjour d’angle · terrasse 24\u00a0m²'],
};
