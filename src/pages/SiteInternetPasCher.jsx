import PageHero from '../components/page/PageHero'
import PageSection from '../components/page/PageSection'
import FaqList from '../components/page/FaqList'
import { TarifsBlock } from '../components/Tarifs'
import Contact from '../components/Contact'
import CtaBand from '../components/CtaBand'
import { FORMULES, fmtPrice, priceText, enDelai } from '../data/formules'
import { STEPS } from '../data/steps'
import { SITE } from '../data/site'
import { useSectionHref } from '../lib/route'

// Page « Site internet pas cher » : ce que coûte un site, ce que comprend le prix et
// les pièges à éviter. Elle répond aux recherches « site pas cher », « prix d'un
// site internet » ; le détail du service reste sur /creation-site-vitrine.
// Prix et délais viennent de src/data/formules.js, jamais écrits en dur. Rien sur le
// prix après la 1re année offerte (SITE.hostingAfterFirstYear), aucun concurrent
// nommé, aucune comparaison chiffrée.

const [ESSENTIEL, PRO] = FORMULES.filter(f => f.price)
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

// Chapeau de la page, repris par ses données structurées (src/routes.jsx)
export const LEAD = "Un site simple et soigné, créé pour vous et jamais copié d'un modèle tout prêt, à un prix connu avant de commencer. Un seul interlocuteur du premier appel à la mise en ligne : partout en France à distance, et sur place en Île-de-France."

const FAQ_PAS_CHER = [
  {
    q: 'Quel est le site internet le moins cher ?',
    a: `La formule ${ESSENTIEL.name} : un site d'une seule page, ${priceText(ESSENTIEL)}, en ligne ${enDelai(ESSENTIEL)}. La 1re année en ligne est offerte.`,
  },
  {
    q: 'Y a-t-il des frais cachés ?',
    a: "Non. Le prix est écrit dans le devis avant de commencer et ne change pas en cours de route. Une option (prise de rendez-vous, paiement en ligne, maintenance…) n'est ajoutée que si vous la demandez, chiffrée dans le même devis.",
  },
  {
    q: 'Comment un site peut-il coûter si peu ?',
    a: "C'est un site d'une seule page, créé par un seul interlocuteur, sans intermédiaire : vous payez le travail fait pour vous, rien d'autre.",
  },
  {
    q: 'Un site pas cher sera-t-il visible sur Google ?',
    a: `Chaque site est livré avec les bases pour être trouvé sur Google ; la formule ${PRO.name} ajoute un référencement plus poussé et le suivi des visites. Personne ne peut garantir une position sur Google.`,
  },
  {
    q: "Travaillez-vous en dehors de l'Île-de-France ?",
    a: 'Oui, partout en France : tout peut se faire à distance (téléphone, WhatsApp, email). En Île-de-France, je peux aussi venir vous rencontrer sur place.',
  },
]

export default function SiteInternetPasCher() {
  const href = useSectionHref()
  let k = 0
  const num = () => String(++k).padStart(2, '0')

  return (
    <>
      <PageHero
        current="Site internet pas cher"
        label={<><b>SITE PAS CHER</b><span className="sep">//</span> PRIX FIXE · SANS SURPRISE</>}
        title={`Site internet pas cher : dès ${fmtPrice(ESSENTIEL.price)} € TTC, prix fixé à l'avance`}
        lead={LEAD}
        ctas={<>
          <a href={href('contact')} className="btn btn-primary">Demander mon devis gratuit <span className="arrow">→</span></a>
          <a href={`tel:${SITE.phoneE164}`} className="btn btn-ghost">{`Appeler · ${SITE.phoneDisplay}`}</a>
        </>}
      />

      <PageSection id="prix" num={num()} label="PRIX" title="Combien coûte un site internet ?" intro="Deux formules à prix fixe, écrit dans le devis avant de commencer.">
        <TarifsBlock
          formules={[ESSENTIEL, PRO]}
          help={<>Boutique en ligne ou application&nbsp;? C'est sur devis gratuit&nbsp;: <a href="/boutique-en-ligne">boutique en ligne</a> · <a href="/creation-application-mobile">application mobile</a>.</>}
        />
      </PageSection>

      <PageSection id="petit-prix" num={num()} label="PETIT PRIX" title="Un petit prix, pas un site au rabais">
        <div className="prose">
          <p>Le prix reste bas parce que tout est simple et direct&nbsp;:</p>
          <ul>
            <li><b>Un seul interlocuteur</b>&nbsp;: vous parlez directement à la personne qui crée votre site, sans intermédiaire.</li>
            <li><b>La bonne taille</b>&nbsp;: un site d'une seule page suffit souvent pour démarrer. Vous payez ce dont vous avez besoin, rien de plus.</li>
            <li><b>Un prix fixé avant de commencer</b>&nbsp;: il est écrit dans le devis et ne change pas en cours de route.</li>
          </ul>
          <p>
            Le site, lui, n'a rien d'un site au rabais&nbsp;: un design créé pour vous, un affichage
            lisible sur ordinateur comme sur téléphone, un formulaire de contact et les bases pour
            être trouvé sur Google.
          </p>
        </div>
      </PageSection>

      <PageSection id="options" num={num()} label="OPTIONS" title="Les options, seulement si vous en avez besoin">
        <div className="prose">
          <p>
            Selon votre activité, on peut ajouter, chiffré dans le devis&nbsp;: prise de rendez-vous,
            galerie photos, paiement en ligne, espace client, plusieurs langues. Rien n'est ajouté
            sans votre accord.
          </p>
          <p>
            Après la mise en ligne, un suivi de maintenance est proposé en option, avec un prix fixé
            à l'avance&nbsp;: mises à jour, sauvegardes, petites modifications.
          </p>
        </div>
      </PageSection>

      <PageSection id="pieges" num={num()} label="À ÉVITER" title="Site pas cher : les pièges à éviter">
        <div className="prose">
          <p>Un prix bas ne doit pas cacher de mauvaises surprises. Avant de choisir, vérifiez ces points&nbsp;:</p>
          <ul>
            <li><b>Le prix final</b>&nbsp;: est-il écrit avant de commencer&nbsp;? Ici, oui, dans le devis.</li>
            <li><b>La propriété</b>&nbsp;: le site, les textes, les images et l'adresse internet sont-ils à vous&nbsp;? Ici, tout vous revient le jour de la livraison.</li>
            <li><b>Le design</b>&nbsp;: est-il créé pour vous, ou copié d'un modèle tout prêt&nbsp;? Ici, il est créé pour vous.</li>
            <li><b>Le téléphone</b>&nbsp;: le site est-il lisible sur téléphone&nbsp;? Ici, sur ordinateur comme sur téléphone.</li>
            <li><b>Le suivi</b>&nbsp;: saurez-vous qui appeler en cas de souci&nbsp;? Ici, vous avez un seul interlocuteur, et un suivi de maintenance est proposé en option.</li>
          </ul>
        </div>
      </PageSection>

      <PageSection id="en-kit" num={num()} label="EN KIT OU SUR MESURE" title="Site gratuit en kit ou site créé pour vous ?">
        <div className="prose">
          <p>
            Les créateurs de sites en kit sont souvent gratuits pour commencer, mais tout est à faire
            soi-même&nbsp;: les textes, la mise en page, les réglages pour Google. Une adresse internet
            à votre nom passe en général par un abonnement payant.
          </p>
          <p>
            Ici, je crée le site pour vous, à un prix fixé à l'avance, et il vous appartient. Vous
            gardez votre temps pour votre métier.
          </p>
        </div>
      </PageSection>

      <PageSection id="pour-qui" num={num()} label="POUR QUI" title="Pour les artisans, indépendants et petites entreprises">
        <div className="prose">
          <p>
            Artisans, auto-entrepreneurs, indépendants, commerçants&nbsp;: la formule {ESSENTIEL.name} suffit
            pour être présent sur internet, simplement. <b>{cap(priceText(ESSENTIEL))}</b>, {enDelai(ESSENTIEL)}.
          </p>
          <p>
            Entreprises et associations&nbsp;: la formule {PRO.name}, jusqu'à 6 pages, avec un espace pour
            modifier vos textes. <b>{cap(priceText(PRO))}</b>, {enDelai(PRO)}.
          </p>
          <p>
            <a href="/creation-site-vitrine">{'Tout savoir sur la création de site vitrine →'}</a>
            {' · '}
            <a href={href('realisations')}>Voir les réalisations</a>
          </p>
        </div>
      </PageSection>

      <PageSection id="partout" num={num()} label="PARTOUT EN FRANCE" title="Où que vous soyez en France">
        <div className="prose">
          <p>
            Tout peut se faire à distance&nbsp;: les échanges par téléphone, WhatsApp ou email, le devis
            sous 48h, la maquette à valider en ligne, puis l'avancement à suivre sur un lien privé.
          </p>
          <p>
            En Île-de-France (Paris, Hauts-de-Seine, Seine-Saint-Denis, Val-de-Marne, Essonne,
            Yvelines, Val-d'Oise, Seine-et-Marne), je peux aussi venir vous rencontrer.
          </p>
          <p>
            Les {STEPS.length} étapes, du premier message à la mise en ligne&nbsp;: <a href="/creation-site-vitrine#etapes">voir le détail</a>.
          </p>
        </div>
      </PageSection>

      <PageSection id="questions" num={num()} label="QUESTIONS" title="Questions fréquentes">
        <FaqList items={FAQ_PAS_CHER} />
        <CtaBand
          label="VOTRE SITE"
          title="Un site à petit prix, au bon degré ?"
          text="Dites-moi en 1 minute ce dont vous avez besoin : devis détaillé sous 48h, sans engagement."
        />
      </PageSection>

      <Contact initialProjet="Site de présentation" num={num()} />
    </>
  )
}
