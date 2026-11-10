// French typography helpers: narrow no-break space (U+202F) as the thousands separator and
// before units and the euro sign, comma as the decimal separator.
export const NNBSP = ' ';

// 5250 -> "5 250" (U+202F between the groups)
export function groupThousands(n) {
  const s = String(Math.round(Math.abs(n)));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += NNBSP;
    out += s[i];
  }
  return (n < 0 ? '−' : '') + out;
}

// 5250 -> "5 250 €"
export const euros = (n) => `${groupThousands(n)}${NNBSP}€`;

// 1.8 -> "1,80"
export const metres2 = (h) => h.toFixed(2).replace('.', ',');

// 40 -> "40 m"
export const metres = (n) => `${Math.round(n)}${NNBSP}m`;
