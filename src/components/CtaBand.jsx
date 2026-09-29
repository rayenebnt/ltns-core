const PHONE = '0625206493'

// Bandeau de relance vers le devis, placé entre deux sections
export default function CtaBand({ label, title, text }) {
  return (
    <div className="cta-band reveal">
      <div className="cta-band-copy">
        <span className="cta-band-label">{label}</span>
        <h3>{title}</h3>
        {text && <p>{text}</p>}
      </div>
      <div className="cta-band-actions">
        <a href="#contact" className="btn btn-primary">
          Demander mon devis gratuit <span className="arrow">→</span>
        </a>
        <a href={`tel:${PHONE}`} className="btn btn-ghost">
          Appeler · 06 25 20 64 93
        </a>
      </div>
    </div>
  )
}
