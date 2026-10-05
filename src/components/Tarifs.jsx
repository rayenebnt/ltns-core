import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { tempColor } from '../hooks/useThermal'
import { prefillDevis } from './Contact'

gsap.registerPlugin(ScrollTrigger)

// Formules affichées — prix, contenu et délais modifiables ici.
// price: null → « sur devis ». projet: type de projet pré-coché dans le devis.
const FORMULES = [
  {
    id: '01', name: 'Essentiel', temp: 38, heat: 'TIÈDE',
    pitch: 'Pour être présent sur internet, simplement.',
    price: 490,
    pour: 'Artisans, indépendants',
    delai: '≈ 2 semaines',
    features: [
      "Un site d'une seule page",
      'Lisible sur ordinateur et téléphone',
      'Design créé pour vous',
      'Formulaire de contact',
      'Les bases pour être trouvé sur Google',
      '1ʳᵉ année en ligne offerte',
    ],
    projet: 'Site de présentation',
  },
  {
    id: '02', name: 'Pro', temp: 66, heat: 'CHAUD', featured: true,
    pitch: 'Un site complet qui travaille pour vous.',
    price: 990,
    pour: 'Entreprises, associations',
    delai: '2 à 4 semaines',
    features: [
      "Jusqu'à 6 pages",
      'Design soigné, simple à utiliser',
      'Animations créées pour vous',
      'Un espace pour modifier vos textes',
      'Mieux placé sur Google + suivi des visites',
      '1ʳᵉ année en ligne offerte',
    ],
    projet: 'Site de présentation',
  },
  {
    id: '03', name: 'Sur-mesure', temp: 99, heat: 'BRÛLANT',
    pitch: 'Boutique, logiciel ou application : on construit votre outil.',
    price: null,
    pour: 'Projets plus ambitieux',
    delai: 'Fixé dans le devis',
    features: [
      'Boutique en ligne ou espace client',
      'Logiciel ou application mobile',
      'Des fonctions rien que pour vous',
      'Connexion avec vos autres outils',
      'Suivi et mises à jour dans la durée',
    ],
    projet: null,
  },
]

// Ce que toutes les formules ont en commun
const INCLUS = [
  'Devis gratuit sous 48h',
  "Prix fixé avant de commencer",
  'Un seul interlocuteur',
  'Tout vous appartient',
]

const SEGMENTS = 12
const pos = temp => (temp - 12) / 87 // 12° → 0, 99° → 1
const rgb = t => { const c = tempColor(t); return `${c.r}, ${c.g}, ${c.b}` }
const fmtPrice = v => Math.round(v).toLocaleString('fr-FR')

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function TarifCard({ f }) {
  const lit = Math.max(1, Math.round(pos(f.temp) * SEGMENTS))
  const heat = rgb(pos(f.temp))

  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse') return
    const el = e.currentTarget, r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <article
      className={`tf${f.featured ? ' tf--featured' : ''}`}
      style={{
        '--accent': `rgb(${heat})`,
        '--accent-rgb': heat,
        '--accent-soft': `rgba(${heat}, 0.12)`,
        '--accent-glow': `rgba(${heat}, 0.45)`,
        '--accent-line': `rgba(${heat}, 0.35)`,
      }}
      onPointerMove={onPointerMove}
    >
      {f.featured && <span className="tf-ring" aria-hidden="true" />}
      <div className="tf-inner">
        <div className="tf-head">
          <span>FORMULE {f.id} · {f.heat}</span>
          {f.featured && <span className="tf-badge">LE PLUS CHOISI</span>}
        </div>

        <div className="tf-title">
          <h3>{f.name}</h3>
          <span className="tf-temp" aria-hidden="true">
            <b data-count={f.temp} data-from="12">{f.temp}</b><i>°</i>
          </span>
        </div>
        <p className="tf-pitch">{f.pitch}</p>

        <div className="tf-gauge" aria-hidden="true">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <i key={i} className={i < lit ? 'on' : ''} style={{ '--seg': `rgb(${rgb(i / (SEGMENTS - 1))})`, '--k': i }} />
          ))}
        </div>

        <div className="tf-price">
          {f.price ? (
            <>
              <small>à partir de</small>
              <strong><b data-count={f.price} data-from="0">{fmtPrice(f.price)}</b>&nbsp;€</strong>
              <small>TTC</small>
            </>
          ) : (
            <>
              <small>prix selon le projet</small>
              <strong className="tf-quote">Sur devis</strong>
              <small>gratuit</small>
            </>
          )}
        </div>

        <dl className="tf-meta">
          <div><dt>Idéal pour</dt><dd>{f.pour}</dd></div>
          <div><dt>Délai</dt><dd>{f.delai}</dd></div>
        </dl>

        <ul className="tf-list">
          {f.features.map(x => <li key={x}>{x}</li>)}
        </ul>

        <a
          href="#contact"
          className={`btn ${f.featured ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => prefillDevis(f.projet, { formule: f.name })}
        >
          {f.price ? `Choisir ${f.name}` : 'Parlons de mon projet'} <span className="arrow">→</span>
        </a>
      </div>
    </article>
  )
}

export default function Tarifs() {
  const rootRef = useRef(null)

  // Motion design : les cartes montent, la jauge chauffe, les chiffres défilent
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || prefersReducedMotion()) return

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.tf')
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        scrollTrigger: { trigger: '.tf-grid', start: 'top 80%', once: true },
        onComplete: () => root.classList.add('is-live'),
      })

      tl.fromTo(cards,
        { y: 70, opacity: 0, rotateX: 14, transformPerspective: 1000 },
        { y: 0, opacity: 1, rotateX: 0, duration: 0.9, stagger: 0.14, clearProps: 'transform,opacity' })

      cards.forEach((card, k) => {
        const at = 0.25 + k * 0.14
        const segs = card.querySelectorAll('.tf-gauge i.on')
        const heatTime = 0.12 + segs.length * 0.07

        tl.fromTo(segs,
          { scaleY: 0.2, opacity: 0.15 },
          { scaleY: 1, opacity: 1, duration: 0.25, stagger: 0.07, ease: 'back.out(3)', clearProps: 'transform,opacity' }, at)

        card.querySelectorAll('[data-count]').forEach(el => {
          const end = +el.dataset.count
          const from = +el.dataset.from
          const o = { v: from }
          el.textContent = fmtPrice(from)
          tl.to(o, {
            v: end, duration: heatTime + 0.3, ease: 'power2.out',
            onUpdate: () => { el.textContent = fmtPrice(o.v) },
          }, at)
        })

        tl.fromTo(card.querySelectorAll('.tf-list li'),
          { x: -14, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, clearProps: 'transform,opacity' }, at + 0.2)
          .fromTo(card.querySelector('.btn'),
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, clearProps: 'transform,opacity' }, at + 0.45)
      })

      tl.fromTo('.tf-badge',
        { scale: 2.6, opacity: 0, rotate: -18 },
        { scale: 1, opacity: 1, rotate: 0, duration: 0.35, ease: 'power4.in', clearProps: 'transform,opacity' }, 0.9)
        .fromTo('.tf--featured', { x: 0 }, { x: 4, duration: 0.05, repeat: 3, yoyo: true, clearProps: 'x' }, 1.25)
        .fromTo('.tf-quote',
          { clipPath: 'inset(0 100% 0 0)' },
          { clipPath: 'inset(0 0% 0 0)', duration: 0.6, ease: 'steps(9)', clearProps: 'clipPath' }, 0.6)

      gsap.fromTo('.tf-inclus li',
        { y: 16, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: 'power3.out', clearProps: 'transform,opacity',
          scrollTrigger: { trigger: '.tf-inclus', start: 'top 90%', once: true },
        })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <section id="tarifs" ref={rootRef}>
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>04</b><span className="sep">//</span> TARIFS
          </span>
          <h2 className="section-title">Trois formules,<br/><em>zéro surprise</em>.</h2>
          <p className="section-intro">
            Plus votre projet est complet, plus il chauffe. Choisissez votre niveau :
            le prix est annoncé à l'avance et le devis précis reste gratuit.
          </p>
        </div>
        <div className="section-temp">
          66<span className="deg">°</span>
          <span className="label">DES PRIX CLAIRS</span>
        </div>
      </div>

      <div className="tf-grid">
        {FORMULES.map(f => <TarifCard key={f.id} f={f} />)}
      </div>

      <div className="tf-foot">
        <ul className="tf-inclus" aria-label="Inclus dans toutes les formules">
          {INCLUS.map(x => <li key={x}><span aria-hidden="true">✓</span>{x}</li>)}
        </ul>
        <p className="tf-help">
          Vous hésitez ? <a href="#contact">Décrivez votre projet</a>, je vous dis quelle formule vous convient.
        </p>
      </div>
    </section>
  )
}
