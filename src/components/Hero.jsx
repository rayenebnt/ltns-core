import { useEffect } from 'react'
import { gsap } from 'gsap'
import FilmPlayer, { playFilm } from './Film'

// Arguments affichés sous les boutons : ce qui rassure avant de demander un devis
const PROOFS = [
  'Devis gratuit sous 48h',
  "Prix fixé à l'avance",
  'Site vitrine en ~2 semaines',
  'Tout vous appartient',
]

export default function Hero({ loaded }) {
  // Entrée GSAP
  useEffect(() => {
    if (!loaded) return
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.45 } })
    tl.from('.hero h1 .line span', { y: '110%', duration: 0.7, stagger: 0.06, ease: 'power4.out' }, 0)
      .from('.hero-tag', { y: 10, opacity: 0 }, 0)
      .from('.hero-sub', { y: 10, opacity: 0 }, 0.15)
      .from('.hero-ctas', { y: 10, opacity: 0 }, 0.2)
      .from('.hero-proof', { y: 8, opacity: 0 }, 0.3)
      .from('.hero-film', { y: 24, opacity: 0, duration: 0.7 }, 0.1)
      .from('nav', { y: -20, opacity: 0 }, 0)
    return () => tl.progress(1).kill()
  }, [loaded])

  return (
    <header className="hero">
      <div className="hero-main">
        <span className="hero-tag">DISPONIBLE · DEVIS GRATUIT SOUS 48H</span>
        <h1>
          <span className="line"><span>VOTRE SITE</span></span>
          <span className="line"><span>INTERNET,</span></span>
          <span className="line"><span>AU <em>BON</em> DEGRÉ<span className="deg-mark">°</span></span></span>
        </h1>
        <p className="hero-sub">
          Sites internet, logiciels et applications mobiles, créés sur mesure pour
          votre activité. <b>Un prix fixé à l'avance</b>, une seule personne en face
          de vous, du premier appel à la mise en ligne.
        </p>
        <div className="hero-ctas">
          <a href="#contact" className="btn btn-primary">
            Demander mon devis gratuit <span className="arrow">→</span>
          </a>
          <button type="button" className="btn btn-ghost" onClick={playFilm}>
            <span aria-hidden="true">▶</span> Voir le film · 43 s
          </button>
        </div>
        <ul className="hero-proof">
          {PROOFS.map(p => <li key={p}>{p}</li>)}
        </ul>
      </div>

      <div className="hero-film">
        <FilmPlayer />
      </div>
    </header>
  )
}
