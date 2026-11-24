import PageHero from '../components/page/PageHero'
import PageSection from '../components/page/PageSection'
import FaqList from '../components/page/FaqList'
import Contact from '../components/Contact'
import CtaBand from '../components/CtaBand'
import { services } from '../components/Services'
import { FORMULES, priceText } from '../data/formules'
import { STEPS } from '../data/steps'
import { SITE } from '../data/site'
import { useSectionHref } from '../lib/route'

// Page « Boutique en ligne et espace client » : la formule Sur-mesure, toujours sur
// devis. Le délai « 4 à 8 semaines » est celui annoncé ailleurs sur le site (FAQ de
// l'accueil, page site vitrine). Aucune promesse sur la sécurité ou l'hébergement.

// Texte de la carte « Boutiques et espaces clients » de l'accueil (S03)
const BOUTIQUE = services.find(s => s.id === 'S03').desc
const [ESSENTIEL] = FORMULES.filter(f => f.price)
const SUR_MESURE = FORMULES.find(f => !f.price)
const DELAI = '4 à 8 semaines'

// Des exemples de fonctions, pas une liste figée
const FONCTIONS = [
  'Catalogue de produits', 'Paiement en ligne', 'Comptes clients', 'Suivi des commandes',
  'Gestion des stocks', 'Codes promo', 'Retrait ou livraison', 'Réservation de créneaux',
  'Modifier vos contenus vous-même', 'Connexion avec vos autres outils',
]

const FAQ_BOUTIQUE = [
  {
    q: 'Combien coûte une boutique en ligne ?',
    a: 'Le prix dépend de ce que la boutique doit faire : il est indiqué dans un devis gratuit, après un premier échange, et fixé avant de commencer.',
  },
  {
    q: 'En combien de temps est-elle en ligne ?',
    a: `Comptez ${DELAI} selon ce que le site doit faire ; la date exacte est écrite dans le devis.`,
  },
  {
    q: 'Pourrai-je ajouter mes produits moi-même ?',
    a: 'Oui : vous gérez vos contenus vous-même, sans passer par moi.',
  },
  {
    q: "Une boutique en ligne pas chère, c'est possible ?",
    a: "Oui, en commençant par l'essentiel : quelques produits, le paiement en ligne, le retrait ou la livraison. Le reste peut venir ensuite.",
  },
  {
    q: 'Et si je veux seulement présenter mes produits ?',
    a: `Sans vente en ligne, un site vitrine suffit : ${priceText(ESSENTIEL)} pour un site d'une page.`,
    link: { href: '/creation-site-vitrine', label: 'Voir la création de site vitrine' },
  },
  {
    q: "Travaillez-vous en dehors de l'Île-de-France ?",
    a: 'Oui, partout en France : tout peut se faire à distance (téléphone, WhatsApp, email). En Île-de-France, je peux aussi venir vous rencontrer sur place.',
  },
]

export default function BoutiqueEnLigne() {
  const href = useSectionHref()
  let k = 0
  const num = () => String(++k).padStart(2, '0')

  return (
    <>
      <PageHero
        current="Boutique en ligne"
        label={<><b>BOUTIQUE EN LIGNE</b><span className="sep">//</span> E-COMMERCE · ESPACE CLIENT</>}
        title="Création de boutique en ligne et d'espace client"
        lead={`${BOUTIQUE} Un seul interlocuteur, partout en France à distance, et sur place en Île-de-France.`}
        ctas={<>
          <a href={href('contact')} className="btn btn-primary">Demander mon devis gratuit <span className="arrow">→</span></a>
          <a href={`tel:${SITE.phoneE164}`} className="btn btn-ghost">{`Appeler · ${SITE.phoneDisplay}`}</a>
        </>}
      />

      <PageSection id="fonctions" num={num()} label="FONCTIONS" title="Ce que peut faire votre boutique">
        <div className="prose">
          <p>Votre boutique réunit ce dont votre commerce a besoin, par exemple&nbsp;:</p>
        </div>
        <ul className="chips">
          {FONCTIONS.map(f => <li key={f}>{f}</li>)}
        </ul>
        <div className="prose">
          <p>
            Elle est construite pour vous, jamais copiée d'un modèle tout prêt, et lisible sur
            ordinateur comme sur téléphone.
          </p>
        </div>
      </PageSection>

      <PageSection id="espace-client" num={num()} label="ESPACE CLIENT" title="Un espace réservé à vos clients">
        <div className="prose">
          <p>
            Comptes clients, documents à télécharger, suivi des commandes ou des dossiers&nbsp;: un
            espace client réunit sur votre site ce que vos clients viennent chercher, avec ou sans
            boutique.
          </p>
        </div>
      </PageSection>

      <PageSection id="prix" num={num()} label="PRIX" title="Combien coûte une boutique en ligne ?">
        <div className="prose">
          <p>
            C'est la formule {SUR_MESURE.name}&nbsp;: le prix dépend de ce que la boutique doit faire
            (nombre de produits, paiement, livraison, comptes clients). Il est fixé dans un devis
            gratuit, avant de commencer&nbsp;; comptez {DELAI} selon ce que le site doit faire.
          </p>
          <p>
            Pour un budget serré, on peut commencer avec quelques produits, le paiement en ligne et
            le retrait ou la livraison, puis ajouter le reste ensuite.
          </p>
          <p>
            Vous voulez seulement présenter vos produits, sans vente en ligne&nbsp;? Un site vitrine
            suffit, {priceText(ESSENTIEL)}. <a href="/site-internet-pas-cher">{'Voir le prix d\'un site internet →'}</a>
          </p>
        </div>
      </PageSection>

      <PageSection id="a-distance" num={num()} label="À DISTANCE" title="Partout en France, à distance">
        <div className="prose">
          <p>
            Les échanges par téléphone, WhatsApp ou email, le devis sous 48h, la maquette à valider
            en ligne, puis l'avancement à suivre sur un lien privé&nbsp;: tout peut se faire à distance.
            En Île-de-France, je peux aussi venir vous rencontrer.
          </p>
          <p>
            Les {STEPS.length} étapes, du premier message à la mise en ligne&nbsp;: <a href="/creation-site-vitrine#etapes">voir le détail</a>.
          </p>
        </div>
      </PageSection>

      <PageSection id="propriete" num={num()} label="PROPRIÉTÉ" title="Votre boutique vous appartient">
        <div className="prose">
          <p>
            Le site, les textes, les images, les mots de passe, l'adresse internet&nbsp;: tout vous
            revient le jour de la livraison. Si un jour vous voulez travailler avec quelqu'un
            d'autre, vous êtes libre de le faire.
          </p>
        </div>
      </PageSection>

      <PageSection id="questions" num={num()} label="QUESTIONS" title="Questions fréquentes">
        <FaqList items={FAQ_BOUTIQUE} />
        <CtaBand
          label="VOTRE BOUTIQUE"
          title="Une boutique en ligne à votre mesure ?"
          text="Dites-moi en 1 minute ce que vous vendez : devis détaillé sous 48h, sans engagement."
        />
      </PageSection>

      <Contact initialProjet="Site avec boutique ou espace client" num={num()} />
    </>
  )
}
