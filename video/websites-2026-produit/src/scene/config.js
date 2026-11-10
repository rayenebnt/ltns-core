// Brand, palette, products and the camera of the ARDEUR concept page (fictional brand).
// Units: centimetres. The camera looks down -Z at the table (z = 0); "up" on screen is +Y.
import * as THREE from 'three';

export const BRAND = 'ARDEUR';

export const PALETTE = {
  page: '#f5f5f3', // plain white stage (matches the CSS --bg)
  teal: '#0f4c4a',
  tealDeep: '#0a3533',
  tealHi: '#1d6e69',
  orange: '#f26a1b',
  orangeDeep: '#c94c0c',
  ink: '#2b2f33',
  inkSoft: '#5b6268',
  yellow: '#f7c623',
  curcuma: '#e3a31f',
  curcumaDeep: '#b97809',
  paper: '#fbfaf6',
};

// carousel order (tabs, arrows); the scroll story always features FEATURED
export const PRODUCTS = [
  { key: 'gommes', kind: 'tin' },
  { key: 'gingembre', kind: 'bottle' },
  { key: 'curcuma', kind: 'bottle' },
];
export const FEATURED = 1;

// lens: a short telephoto on a table top seen from above, tilted a little so the relief words
// read in perspective (the tilt goes back to zero behind the white fade)
export const CAMERA = { distance: 44, fov: 22, tilt: 0.12 };

// key light: soft overhead box from the top left of the frame
export const KEY_DIR = new THREE.Vector3(-0.42, 0.5, 1).normalize();

// bottle dimensions (local frame: axis +Y, base at y = 0)
export const BOTTLE = {
  R: 1.9, // body radius
  labelY: [0.95, 6.05],
  neckTop: 9.04, // lip
  capY: [8.14, 9.3],
  capR: 1.2,
  fillY: 6.95, // liquid level, a little up the shoulder
  pivotY: 4.65, // rotation centre (half the height with cap)
};
