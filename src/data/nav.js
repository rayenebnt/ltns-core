// Source unique des entrées de navigation — utilisée par la nav, le menu
// mobile et le footer, pour qu'ils ne puissent plus diverger.
export const NAV_LINKS = [
  { id: 'pourquoi', label: 'Pourquoi moi' },
  { id: 'services', label: 'Services' },
  { id: 'process',  label: 'Process' },
  { id: 'tarifs',   label: 'Tarifs' },
  { id: 'faq',      label: 'FAQ' },
  { id: 'contact',  label: 'Contact' },
]

export const NAV_IDS = NAV_LINKS.map((l) => l.id)
