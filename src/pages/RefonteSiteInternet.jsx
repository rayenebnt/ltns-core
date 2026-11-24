import PageHero from '../components/page/PageHero'
import PageSection from '../components/page/PageSection'
import FaqList from '../components/page/FaqList'
import Contact from '../components/Contact'
import CtaBand from '../components/CtaBand'
import { ProjectCard, projects } from '../components/Realisations'
import { FORMULES, priceText, enDelai } from '../data/formules'
import { STEPS } from '../data/steps'
import { SITE } from '../data/site'
import { useSectionHref } from '../lib/route'

// Page « Refonte de site internet ». Exemple réel : Swatter TV (P04 de Realisations.jsx).
// Le prix d'une refonte est sur devis : les prix des formules n'y sont cités qu'à titre
// de repère, pour un site neuf. Aucune promesse de position sur Google.

const SWATTER = projects.find(p => p.id === 'P04')
const [ESSENTIEL, PRO] = FORMULES.filter(f => f.price)

// Chapeau de la page, repris par ses données structurées (src/routes.jsx)
export const LEAD = "Un site ancien, lent ou difficile à lire sur téléphone ne donne pas envie de vous contacter. Je crée votre nouveau site en gardant ce qui fonctionne : vos textes, vos photos, votre adresse internet. Partout en France à distance, et sur place en Île-de-France."

const FAQ_REFONTE = [
  {
    q: "Combien coûte la refonte d'un site internet ?",
    a: `Le prix est fixé dans le devis gratuit, selon ce que le nouveau site doit faire. Pour repère, un site neuf d'une page coûte ${priceText(ESSENTIEL)}, un site jusqu'à 6 pages ${priceText(PRO)}.`,
  },
  {
    q: 'Vais-je garder mon adresse internet ?',
    a: 'Oui : votre adresse internet (votre nom de domaine) reste la même ; seul le site change.',
  },
  {
    q: 'Vais-je perdre ma place sur Google ?',
    a: 'Une refonte bien faite garde ce qui fonctionne : les anciennes adresses de vos pages sont redirigées vers les nouvelles. Personne ne peut garantir une position sur Google.',
  },
  {
    q: "Mon site actuel a été fait par quelqu'un d'autre : est-ce un problème ?",
    a: "Non : le nouveau site est créé à partir de ce qui existe (vos textes, vos photos), quel que soit le prestataire d'avant.",
  },
  {
    q: 'Combien de temps dure une refonte ?',
    a: `Le délai est écrit dans le devis. Pour repère, un site neuf d'une page est en ligne ${enDelai(ESSENTIEL)}, un site jusqu'à 6 pages ${enDelai(PRO)}.`,
  },
  {
    q: "Travaillez-vous en dehors de l'Île-de-France ?",
    a: 'Oui, partout en France : tout peut se faire à distance (téléphone, WhatsApp, email). En Île-de-France, je peux aussi venir vous rencontrer sur place.',
  },
]

export default function RefonteSiteInternet() {
  const href = useSectionHref()
  let k = 0
  const num = () => String(++k).padStart(2, '0')

  return (
    <>
      <PageHero
        current="Refonte de site internet"
        label={<><b>REFONTE DE SITE</b><span className="sep">//</span> NOUVEAU DESIGN · CONTENUS GARDÉS</>}
        title="Refonte de site internet : un site neuf, sans repartir de zéro"
        lead={LEAD}
        ctas={<>
          <a href={href('contact')} className="btn btn-primary">Demander mon devis gratuit <span className="arrow">→</span></a>
          <a href={`tel:${SITE.phoneE164}`} className="btn btn-ghost">{`Appeler · ${SITE.phoneDisplay}`}</a>
        </>}
      />

      <PageSection id="quand" num={num()} label="QUAND" title="Quand refaire son site internet ?">
        <div className="prose">
          <p>Quelques signes qui ne trompent pas&nbsp;:</p>
          <ul>
            <li>il est difficile à lire sur téléphone&nbsp;;</li>
            <li>il met du temps à s'afficher&nbsp;;</li>
            <li>son design a vieilli et ne vous ressemble plus&nbsp;;</li>
            <li>vous ne pouvez pas modifier vos textes vous-même&nbsp;;</li>
            <li>vous n'avez plus les accès, ou plus personne à appeler&nbsp;;</li>
            <li>il ne vous apporte pas de demandes de contact.</li>
          </ul>
        </div>
      </PageSection>

      <PageSection id="exemple" num={num()} label="EXEMPLE" title={`Un exemple : la refonte du site de ${SWATTER.name}`}>
        <ProjectCard {...SWATTER} />
        <div className="prose">
          <p><a href={href('realisations')}>{'Voir toutes les réalisations\u00a0→'}</a></p>
        </div>
      </PageSection>

      <PageSection id="methode" num={num()} label="MÉTHODE" title="Comment se passe une refonte">
        <div className="prose">
          <ul>
            <li><b>On fait le point</b>&nbsp;: ce qui fonctionne sur votre site actuel, ce qui manque, ce que vos clients y cherchent.</li>
            <li><b>On garde le meilleur</b>&nbsp;: vos textes, vos photos et votre adresse internet sont repris quand ils sont bons.</li>
            <li><b>Un nouveau design, créé pour vous</b>&nbsp;: lisible sur ordinateur comme sur téléphone.</li>
            <li><b>Les anciennes adresses redirigées</b>&nbsp;: un visiteur qui arrive de Google sur une ancienne page retrouve la nouvelle.</li>
            <li><b>La mise en ligne</b>&nbsp;: je vous remets tous les accès et je vous montre comment gérer votre site.</li>
          </ul>
          <p>
            Les {STEPS.length} étapes, de la maquette à la mise en ligne&nbsp;: <a href="/creation-site-vitrine#etapes">voir le détail</a>.
          </p>
        </div>
      </PageSection>

      <PageSection id="prix" num={num()} label="PRIX" title="Combien coûte la refonte d'un site ?">
        <div className="prose">
          <p>
            Une refonte, c'est un nouveau site&nbsp;: son prix dépend de ce qu'il doit faire, et il est
            fixé dans un devis gratuit, avant de commencer. Pour repère, un site neuf d'une page
            coûte {priceText(ESSENTIEL)}, un site jusqu'à 6 pages {priceText(PRO)}&nbsp;; avec boutique ou
            espace client, c'est sur devis.
          </p>
          <p>
            <a href="/site-internet-pas-cher">{'Voir le prix d\'un site internet →'}</a>
            {' · '}
            <a href="/boutique-en-ligne">Boutique en ligne</a>
          </p>
        </div>
      </PageSection>

      <PageSection id="propriete" num={num()} label="PROPRIÉTÉ" title="Reprendre la main sur votre site">
        <div className="prose">
          <p>
            Le nouveau site vous appartient&nbsp;: le site, les textes, les images, les mots de passe,
            l'adresse internet. Si un jour vous voulez travailler avec quelqu'un d'autre, vous êtes
            libre de le faire.
          </p>
        </div>
      </PageSection>

      <PageSection id="questions" num={num()} label="QUESTIONS" title="Questions fréquentes">
        <FaqList items={FAQ_REFONTE} />
        <CtaBand
          label="VOTRE REFONTE"
          title="Votre site, remis au bon degré ?"
          text="Envoyez-moi l'adresse de votre site actuel : devis détaillé sous 48h, sans engagement."
        />
      </PageSection>

      <Contact initialProjet="Site de présentation" num={num()} />
    </>
  )
}
