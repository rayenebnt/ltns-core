// BALANCIER: shared world measures and the exploded-line layout. 1 world unit = 1 mm.
// The watch has its OWN local frame (src/world/watch/ builds everything in it):
//   +Z = out of the dial (towards the person looking at the time), +Y = 12 o'clock, +X = 3 o'clock;
//   origin = the centre of the case, half-way through its thickness.
// The exploded line (hero, and again in sapphire) is the watch's own axis: every part slides along local
// Z, the crystal and the front bracelet at the +Z end, the caseback and the clasp at the -Z end.
// The integrator (src/world/index.js) turns the watch group so that local Z runs along the screen's
// horizontal for the line, and turns it again for the assembled views. Values are starting points.

export const WATCH = {
  case: { diameter: 40, thickness: 11.6, lugToLug: 47.5, lugWidth: 20, lugThickness: 4.2 },
  bezel: { outer: 40.6, inner: 31.6, height: 2.4, insertInner: 33.2, insertOuter: 38.6 }, // blue ceramic insert, 60-minute scale
  crystal: { diameter: 31.4, thickness: 2.0, dome: 0.6 },
  dial: { diameter: 31.0, thickness: 0.5, z: 2.1 },
  hands: { hour: 9.6, minute: 14.2, seconds: 15.0 }, // lengths from the centre
  crown: { diameter: 6.4, length: 3.6 }, // at 3 o'clock, screw-down, with two crown guards
  movement: { diameter: 26.2, thickness: 5.4 }, // automatic, 4 Hz (28 800 vibrations an hour = 8 a second)
  caseback: { diameter: 36.0, window: 24.0, thickness: 2.6 },
  bracelet: { width: 20, clasp: 16, pitch: 6.8, links: 10 }, // three-row links (brushed outer, polished centre), per side
};

// the exploded line, in order from the +Z end (front) to the -Z end (back): part id → the part's centre
// on the local Z axis when fully exploded (mm), and where its DOM label sits ('above' / 'below' the line,
// alternating so neighbours never collide). Label texts: src/texts.js PARTS (same ids).
export const PARTS = [
  { id: 'braceletFront', z: 150, label: 'below' }, // the 12 o'clock half of the bracelet, laid straight along the axis
  { id: 'crystal', z: 96, label: 'above' },
  { id: 'bezel', z: 78, label: 'below' },
  { id: 'dial', z: 60, label: 'above' },
  { id: 'hands', z: 44, label: 'below' },
  { id: 'caseMiddle', z: 0, label: 'above' }, // with the crown and its stem, the case tube, the lugs
  { id: 'mainplate', z: -26, label: 'below' },
  { id: 'train', z: -40, label: 'above' }, // barrel and gear wheels
  { id: 'balance', z: -53, label: 'below' }, // the balance wheel, its hairspring and the pallet fork
  { id: 'bridges', z: -66, label: 'above' }, // bridges and the balance cock, with their screws and jewels
  { id: 'rotor', z: -80, label: 'below' },
  { id: 'caseback', z: -98, label: 'above' },
  { id: 'braceletBack', z: -152, label: 'below' }, // the 6 o'clock half with the folding clasp
];
// the whole line spans about 330 mm on local Z (the shorter line: the parts read ~20 % bigger) (bracelet ends included): the hero view must frame it
// with margins at every window from 1280×720 to 1920×1080 (the integrator sets the camera)

// the time shown by the hands when the watch is assembled (the seconds hand keeps running in real time)
export const SHOWN_TIME = { hours: 10, minutes: 9, seconds: 30 };

// studio colours (sRGB hex; the background and the materials read them)
export const COLORS = {
  studio: '#eceef0', // the light studio void (centre a little lighter, edges a little darker)
  studioEdge: '#dfe2e6',
  blue: '#183a8c', // « bleu acier »: the brand blue (heat-blued steel), the blue sections and the tide
  blueDeep: '#0b1f4d', // the blue's dark end (gradient, vignette)
  blueGlow: '#4f86ff', // highlights in the blue (rims, glints)
  ruby: '#b0102e', // « rubis »: jewels, the seconds hand tip, the stamp, the rail marker (sparingly)
  ink: '#10151c',
  dialBlue: '#1d3f94', // sunburst dial and bezel insert, a little brighter than the page blue
  gilt: '#c9a55a', // gilded wheels in the movement
};
