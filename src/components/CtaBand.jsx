import { useSectionHref } from '../lib/route'
import { SITE } from '../data/site'

// Bandeau de relance vers le devis, placé entre deux sections
export default function CtaBand({ label, title, text }) {
  const href = useSectionHref()
  return (
    <div className="cta-band reveal">
      <div className="cta-band-copy">
        <span className="cta-band-label">{label}</span>
        <div className="cta-band-title">{title}</div>
        {text && <p>{text}</p>}
      </div>
      <div className="cta-band-actions">
        <a href={href('contact')} className="btn btn-primary">
          Demander mon devis gratuit <span className="arrow">→</span>
        </a>
        <a href={`tel:${SITE.phoneE164}`} className="btn btn-ghost">
          {`Appeler · ${SITE.phoneDisplay}`}
        </a>
      </div>
    </div>
  )
}
