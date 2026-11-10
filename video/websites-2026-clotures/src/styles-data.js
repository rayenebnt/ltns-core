// The five fence types, in the world's type order (0 bois plein, 1 PVC blanc, 2 panneaux rigides,
// 3 ranch, 4 ganivelle). Numbers only: every visible text lives in index.html.
// lo-hi: price per metre installed at the tallest height (the card prices; fictional, the page
// says so); heights: the estimator's height chips (ascending; the tallest is the default);
// gate: price range per portillon; bars: the card meters (intimité, peu d'entretien, longévité).
export const TYPES = [
  { key: 'bois', lo: 120, hi: 180, heights: [1.5, 1.8], gate: [450, 750], bars: [5, 2, 3] },
  { key: 'pvc', lo: 140, hi: 200, heights: [1.5, 1.8], gate: [550, 850], bars: [5, 5, 4] },
  { key: 'rigide', lo: 60, hi: 95, heights: [1.2, 1.5, 1.8], gate: [300, 500], bars: [1, 5, 4] },
  { key: 'ranch', lo: 55, hi: 85, heights: [1.2], gate: [350, 600], bars: [1, 3, 3] },
  { key: 'ganivelle', lo: 35, hi: 60, heights: [1.2, 1.5], gate: [200, 350], bars: [2, 4, 3] },
];

export const N_TYPES = TYPES.length;
