import { useRef, useState } from 'react'
import CtaBand from './CtaBand'
import ProjectPicture from './ProjectPicture'
import { SITE } from '../data/site'

// Aussi repris par les pages intérieures (ex. la carte PMSB).
// alt : description de la capture ; caseStudy : page de l'étude de cas sur le site,
// vers laquelle mène la carte quand l'étude est publiée (SITE.flags.pmsbCaseStudy)
export const projects = [
  {
    id: 'P01',
    year: '2025',
    name: 'RBTI',
    url: 'https://rbti.fr',
    domain: 'rbti.fr',
    type: 'Sous-location immobilière',
    tag: 'SITE DE PRÉSENTATION',
    description:
      'Site de présentation pour une activité de sous-location immobilière : offre, biens et mise en relation propriétaires / locataires, avec un parcours de contact direct.',
    img: { name: 'rbti', width: 1600, height: 898, variants: true },
    alt: 'Aperçu du site de RBTI (rbti.fr), activité de sous-location immobilière',
    bg: 'linear-gradient(135deg, #00101c 0%, #00223c 50%, #00080e 100%)',
    hi: '#0284c7',
  },
  {
    id: 'P02',
    year: '2025',
    name: 'PMSB',
    url: 'https://pmsbbatiment.fr',
    domain: 'pmsbbatiment.fr',
    type: 'Bâtiment & rénovation',
    tag: 'SITE VITRINE',
    description:
      "Prestations Multi Services Bâtiment — entreprise de travaux tous corps d'état en Île-de-France. Site vitrine des prestations (ravalement de façade, isolation, peinture intérieure, rénovation complète), avec galerie de chantiers et demande de devis.",
    img: { name: 'pmsb', width: 1600, height: 916, variants: true },
    alt: "Page d'accueil du site vitrine de PMSB (pmsbbatiment.fr), entreprise du bâtiment en Île-de-France",
    caseStudy: '/realisations/pmsb',
    bg: 'linear-gradient(135deg, #1c1206 0%, #3a2409 50%, #0e0803 100%)',
    hi: '#b45309',
  },
  {
    // Outil privé : pas de lien public ; la carte ne mène qu'à l'étude de cas
    id: 'P03',
    year: '2026',
    name: 'PMSB Gestion',
    chrome: 'pmsb · gestion — accès privé',
    type: 'Logiciel de gestion sur mesure',
    tag: 'LOGICIEL SUR-MESURE',
    description:
      "Le logiciel interne de PMSB, pensé pour le quotidien d'une entreprise du bâtiment. Clients, devis et factures au même endroit, achats de matériel, échéancier des paiements et bibliothèque de prix pour chiffrer plus vite. Le tableau de bord suit la trésorerie (à encaisser, retards, retenues de garantie) et l'activité commerciale : devis en attente, taux de transformation et devis à relancer.",
    features: ['Tableau de bord', 'Clients', 'Devis', 'Factures', 'Achats de matériel', 'Échéancier', 'Bibliothèque de prix'],
    img: { name: 'pmsb-gestion', width: 1600, height: 899, variants: true },
    alt: 'Aperçu du logiciel de gestion PMSB Gestion',
    caseStudy: '/realisations/pmsb#logiciel',
    bg: 'linear-gradient(135deg, #04101f 0%, #0a2340 50%, #030a14 100%)',
    hi: '#2563eb',
    wide: true,
  },
]

/* Aperçu généré : sert de repli tant que la photo du site n'est pas déposée
   dans public/realisations/, ou si elle échoue au chargement. */
function MockPreview({ bg, hi }) {
  return (
    <div className="realisation-mock" style={{ background: bg }}>
      <div className="mock-glow" style={{ background: `radial-gradient(ellipse at 50% 70%, ${hi}30, transparent 65%)` }} />
      <div className="mock-nav" style={{ borderColor: `${hi}28` }}>
        <div className="mock-logo" style={{ background: hi }} />
        <div className="mock-links">
          {[52, 36, 44].map((w, i) => (
            <div key={i} className="mock-link" style={{ width: w, background: `${hi}38` }} />
          ))}
        </div>
      </div>
      <div className="mock-hero">
        <div className="mock-h1" style={{ background: `${hi}70`, width: '72%' }} />
        <div className="mock-h1" style={{ background: `${hi}45`, width: '52%', height: 14 }} />
        <div className="mock-sub" style={{ background: `${hi}28`, width: '60%' }} />
        <div className="mock-sub" style={{ background: `${hi}20`, width: '45%' }} />
        <div className="mock-btn" style={{ background: hi }} />
      </div>
      <div className="mock-cards">
        {[0, 1, 2].map((i) => (
          <div key={i} className="mock-card" style={{ borderColor: `${hi}26`, background: `${hi}0d` }} />
        ))}
      </div>
      <div className="mock-grid" />
    </div>
  )
}

// Largeur affichée de la capture, pour que le navigateur choisisse la bonne variante.
// Carte large : pleine largeur sur une colonne, 766 px au plus sur deux colonnes.
const SIZES = '(max-width: 900px) 100vw, 640px'
const SIZES_WIDE = '(max-width: 860px) 100vw, 770px'

// La capture d'un projet dans sa fausse fenêtre de navigateur (barre, photo, reflet).
// Sans photo, ou si elle échoue au chargement, l'aperçu généré prend sa place.
export function ProjectScreen({ name, domain, chrome, type, img, alt, bg, hi, wide }) {
  const [hasPhoto, setHasPhoto] = useState(Boolean(img))

  return (
    <div className="realisation-screen" style={{ background: bg }}>
      <div className="realisation-chrome" style={{ borderColor: `${hi}20` }}>
        <span className="chrome-dots">
          {[0, 1, 2].map((i) => (
            <i key={i} style={{ background: `${hi}55` }} />
          ))}
        </span>
        <span className="chrome-url">{chrome || domain}</span>
      </div>

      <div className="realisation-shot">
        {hasPhoto ? (
          <ProjectPicture
            {...img}
            alt={alt || (domain ? `Aperçu du site ${name} — ${domain}` : `Aperçu de ${name} — ${type}`)}
            sizes={wide ? SIZES_WIDE : SIZES}
            onError={() => setHasPhoto(false)}
          />
        ) : (
          <MockPreview bg={bg} hi={hi} />
        )}
      </div>

      <div className="realisation-shine" style={{ background: `linear-gradient(180deg, transparent 55%, ${hi}14 100%)` }} />
    </div>
  )
}

// La capture seule, dans le cadre des cartes, avec une légende courte
// (pages intérieures : étude de cas, logiciel sur mesure). Toujours sur une
// demi-largeur au plus : jamais la taille d'une carte large.
export function ProjectFigure({ caption, ...p }) {
  return (
    <figure className="realisation">
      <ProjectScreen {...p} wide={false} />
      <figcaption className="realisation-body">
        <div className="realisation-head">
          <span>{caption}</span>
          <span>{p.year}</span>
        </div>
      </figcaption>
    </figure>
  )
}

// Lien de la carte vers l'étude de cas, seulement quand elle est publiée
export const caseLink = p => (SITE.flags.pmsbCaseStudy && p.caseStudy) || undefined

// href : lien interne facultatif (ex. vers l'étude de cas) ; il prime sur url,
// le lien externe qui s'ouvre dans un nouvel onglet
export function ProjectCard({ id, year, name, url, href, domain, chrome, type, tag, description, features, img, alt, bg, hi, wide }) {
  const ref = useRef(null)

  const onMouseMove = (e) => {
    const card = ref.current
    if (!card) return
    const r = card.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    card.style.transform = `perspective(1200px) rotateY(${x * 6}deg) rotateX(${-y * 5}deg) translateZ(10px)`
  }

  const onMouseLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  // Un projet sans lien (outil privé) n'est pas cliquable
  const Card = href || url ? 'a' : 'article'
  const linkProps = href ? { href } : url ? { href: url, target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <Card
      className={`realisation${wide ? ' realisation--wide' : ''}`}
      ref={ref}
      {...linkProps}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <ProjectScreen name={name} domain={domain} chrome={chrome} type={type} img={img} alt={alt} bg={bg} hi={hi} wide={wide} />

      <div className="realisation-body">
        <div className="realisation-head">
          <span>{id}</span>
          <span>{year}</span>
        </div>
        <h3>{name}</h3>
        <p className="realisation-type">{type}</p>
        <p className="realisation-desc">{description}</p>
        {features && (
          <ul className="realisation-features">
            {features.map(f => <li key={f} style={{ borderColor: `${hi}33` }}>{f}</li>)}
          </ul>
        )}
        <p className="realisation-url" style={{ color: hi }}>{domain || 'Outil interne · accès réservé'}</p>
        <div className="realisation-footer">
          <span className="tag" style={{ color: hi, borderColor: `${hi}33` }}>{tag}</span>
          {href ? <span className="realisation-arrow realisation-arrow--in" style={{ color: hi }}>→</span>
            : url && <span className="realisation-arrow" style={{ color: hi }}>↗</span>}
        </div>
      </div>
    </Card>
  )
}

export default function Realisations() {
  return (
    <section id="realisations" className="realisations">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>03</b><span className="sep">//</span> RÉALISATIONS
          </span>
          <h2 className="section-title">Sites et logiciel,<br /><em>livrés au degré</em>.</h2>
          <p className="section-intro">
            De la sous-location immobilière au logiciel de gestion d'une entreprise du
            bâtiment : chaque projet est taillé aux besoins du client, sans template générique.
          </p>
        </div>
        <div className="section-temp">
          34<span className="deg">°</span>
          <span className="label">PROJETS · LIVRÉS</span>
        </div>
      </div>

      <div className="realisations-grid reveal">
        {projects.map((p) => (
          <ProjectCard key={p.id} {...p} href={caseLink(p)} />
        ))}
      </div>

      <CtaBand
        label="VOTRE TOUR"
        title="Le prochain site en ligne, c'est le vôtre ?"
        text="Dites-moi en 1 minute ce dont vous avez besoin : vous recevez un devis détaillé sous 48h, sans engagement."
      />
    </section>
  )
}
