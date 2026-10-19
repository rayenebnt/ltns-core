import PageHero from '../components/page/PageHero'
import PageSection from '../components/page/PageSection'
import Contact from '../components/Contact'
import CtaBand from '../components/CtaBand'
import { ProjectFigure, projects } from '../components/Realisations'
import { FORMULES, fmtPrice } from '../data/formules'

// Étude de cas PMSB, publiée seulement si SITE.flags.pmsbCaseStudy (src/routes.jsx).
// Uniquement des faits déjà publics : les cartes de Realisations.jsx et l'épisode
// TikTok 04 (video/tiktok-episode-04). Aucune citation, aucun avis, aucun chiffre
// de résultat ; ni formule ni délai pour le site vitrine (inconnus).

const SITE_PMSB = projects.find(p => p.id === 'P02')
const GESTION = projects.find(p => p.id === 'P03')
const [ESSENTIEL, PRO] = FORMULES.filter(f => f.price)

const PRESTATIONS = ['Ravalement de façade', 'Isolation', 'Peinture intérieure', 'Rénovation complète']

export default function RealisationPmsb() {
  // Numéros des sections dans l'ordre d'affichage
  let k = 0
  const num = () => String(++k).padStart(2, '0')

  return (
    <>
      <PageHero
        current="Réalisation PMSB"
        label={<><b>RÉALISATION</b><span className="sep">//</span> PMSB · {SITE_PMSB.year}–{GESTION.year}</>}
        title={'PMSB\u00a0: le site vitrine et le logiciel de gestion d\'une entreprise du bâtiment'}
        lead={`Prestations Multi Services Bâtiment est une entreprise de travaux tous corps d'état en Île-de-France. LTNS° a créé son site vitrine en ${SITE_PMSB.year}, puis son logiciel de gestion sur mesure en ${GESTION.year}.`}
      />

      <PageSection id="client" num={num()} label="ENTREPRISE" title="Le client">
        <div className="prose">
          <p>
            PMSB intervient sur tous les corps d'état du bâtiment, en Île-de-France. Les
            prestations présentées sur son site&nbsp;:
          </p>
        </div>
        <ul className="chips">
          {PRESTATIONS.map(x => <li key={x}>{x}</li>)}
        </ul>
      </PageSection>

      <PageSection id="site" num={num()} label="SITE INTERNET" title={`Le site vitrine (${SITE_PMSB.year})`}>
        <div className="page-split">
          <ProjectFigure {...SITE_PMSB} caption={SITE_PMSB.domain} />
          <div className="prose">
            <p>
              Un site vitrine qui présente les prestations de l'entreprise, avec une galerie de
              chantiers et une demande de devis.
            </p>
            <p><a href={SITE_PMSB.url} target="_blank" rel="noopener noreferrer">{`Voir ${SITE_PMSB.domain}\u00a0↗`}</a></p>
          </div>
        </div>
      </PageSection>

      <PageSection id="logiciel" num={num()} label="LOGICIEL" title={`Le logiciel PMSB Gestion (${GESTION.year})`}>
        <div className="page-split">
          <div>
            <ProjectFigure {...GESTION} caption="Outil interne, accès réservé" />
            <ul className="chips">
              {GESTION.features.map(f => <li key={f}>{f}</li>)}
            </ul>
          </div>
          <div className="prose">
            <p>Avant son logiciel, PMSB faisait tous ses devis à la main.</p>
            <p>
              D'abord, écouter&nbsp;: comment l'entreprise travaille, et ce qui lui fait perdre du
              temps. Ensuite, le plan&nbsp;: les clients, les devis et les factures, au même endroit.
            </p>
            <ul>
              <li><b>Bibliothèque de prix</b>&nbsp;: un chantier se chiffre en quelques clics.</li>
              <li><b>Relances</b>&nbsp;: les devis partent, et le logiciel rappelle lesquels relancer.</li>
              <li><b>Achats et échéancier</b>&nbsp;: les achats de matériel et l'échéancier des paiements sont suivis au même endroit.</li>
              <li>
                <b>Tableau de bord</b>&nbsp;: ce qu'il reste à encaisser, les retards, les retenues de
                garantie, mais aussi les devis en attente, le taux de transformation et les devis
                à relancer.
              </li>
            </ul>
            <p>
              Livré en 4 semaines&nbsp;: un logiciel qui suit la façon de travailler de l'entreprise,
              pas l'inverse.
            </p>
          </div>
        </div>
      </PageSection>

      <PageSection id="interlocuteur" num={num()} label="MÉTHODE" title="Un seul interlocuteur pour le site et l'outil">
        <div className="prose">
          <p>Le site et le logiciel ont été créés par la même personne, du premier échange à la livraison.</p>
        </div>
        <ul className="link-cards">
          <li>
            <a href="/creation-site-vitrine">
              <span className="num">01</span>
              <b>Un site vitrine pour votre entreprise</b>
              <span>{`Une page dès ${fmtPrice(ESSENTIEL.price)}\u00a0€ TTC, jusqu'à 6 pages dès ${fmtPrice(PRO.price)}\u00a0€ TTC.`}</span>
              <span className="arrow" aria-hidden="true">→</span>
            </a>
          </li>
          <li>
            <a href="/logiciel-sur-mesure">
              <span className="num">02</span>
              <b>Un logiciel pour votre métier</b>
              <span>Sur devis gratuit, prix fixé avant de commencer.</span>
              <span className="arrow" aria-hidden="true">→</span>
            </a>
          </li>
        </ul>
        <CtaBand
          label="VOTRE PROJET"
          title="Un site, un logiciel, ou les deux ?"
          text="Décrivez votre activité en 1 minute : vous recevez un devis détaillé sous 48h, sans engagement."
        />
      </PageSection>

      <Contact num={num()} />
    </>
  )
}
