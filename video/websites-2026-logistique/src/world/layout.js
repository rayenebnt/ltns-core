// SILLAGE world layout, shared by the port module, the voyage module and the integrator.
// Units: metres. +Y up. The map is the XZ plane: east = +X (screen right in the top views),
// north = −Z (screen up in the top views), so « south » = +Z = down the screen.
// Starting values: the integrator may move things, but changes them HERE and nowhere else.

// --- the terminal (chapter 01, side view looking north (−Z) at the yard, then from above)
export const PORT = {
  ground: 0, // y of the yard
  // the 2-high stack of 40' containers whose long axis runs along X; the hero (orange) container
  // sits on top of it at the start
  stack: { x: 0, z: 0, high: 2 },
  // the straddle carrier (« cavalier ») travels along X over the stack and the truck lane (z = 0)
  carrierStart: { x: 0, z: 0 },
  // the waiting truck: the trailer's centre; the cab points +X (east); after loading it drives east
  truck: { x: 22, z: 0 },
  // the terminal exit, where the road (voyage module) starts, heading +X
  gate: { x: 72, z: 0 },
  // background stacks for depth in the side view (rows further north) and the yard seen from above
  yard: { minX: -70, maxX: 90, minZ: -90, maxZ: 30 },
};

// container sizes (ISO): length, height, width
export const CONTAINER = { l40: 12.192, l20: 6.058, h: 2.591, hHC: 2.896, w: 2.438 };

// --- the road (chapter 02, top view)
export const ROAD = {
  // centreline control points (x, z) from the gate: east, a sweeping right-hand curve, then due
  // south to the quay; a smooth spline (centripetal Catmull-Rom) through them
  points: [
    [72, 0],
    [140, 0],
    [188, 16],
    [214, 58],
    [222, 120],
    [222, 260],
    [222, 404], // the road runs onto the quay apron and ends at a stop line by the berth
  ],
  width: 15, // two wide lanes plus hard shoulders (drawn from an 11 m section scaled up: road.js)
  quayZ: 420, // the quay edge runs east–west at this z; open sea beyond (z > quayZ)
};

// --- the sea (chapter 03, top view)
export const SEA = {
  level: 0,
  // the container ship sails due south (+Z, down the screen); its position is a function of p
  ship: { x: 260, z: 620, length: 300, beam: 43 },
};

// --- the sky (chapter 04)
export const SKY = {
  cloudBase: 900, // the cloud layer the camera rises through
  cloudTop: 1500,
  planeAltitude: 2100, // the cargo plane flies above the clouds; the camera looks down on it
};
