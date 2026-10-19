import PageHero from '../components/page/PageHero'
import PageSection from '../components/page/PageSection'
import StepsList from '../components/page/StepsList'
import FaqList from '../components/page/FaqList'
import { TarifsBlock } from '../components/Tarifs'
import Contact from '../components/Contact'
import CtaBand from '../components/CtaBand'
import { ProjectCard, projects } from '../components/Realisations'
import { FORMULES, fmtPrice, priceText, delaiText, enDelai } from '../data/formules'
import { STEPS } from '../data/steps'
import { SITE } from '../data/site'
import { useSectionHref } from '../lib/route'

// Page « Création de site vitrine » : prix, contenu, étapes et questions.
// Prix et délais viennent de src/data/formules.js, jamais écrits en dur.
// Rien sur le prix après la 1re année offerte (SITE.hostingAfterFirstYear).

// Les deux formules à prix fixe : Essentiel (une page) et Pro (jusqu'à 6 pages)
const [ESSENTIEL, PRO] = FORMULES.filter(f => f.price)
const SUR_MESURE = FORMULES.find(f => !f.price)
const PMSB = projects.find(p => p.id === 'P02')

const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

const FAQ_VITRINE = [
  {
    q: 'En combien de temps mon site vitrine est-il en ligne ?',
    a: `${cap(delaiText(ESSENTIEL))} pour un site d'une page (${ESSENTIEL.name}), ${delaiText(PRO)} jusqu'à 6 pages (${PRO.name}). Le délai exact est écrit dans le devis.`,
  },
  {
    q: 'Pouvez-vous venir me voir ?',
    a: "Oui, partout en Île-de-France : je me déplace chez vous pour parler de votre projet. Ailleurs en France, tout se fait à distance : par téléphone, sur WhatsApp ou par email.",
  },
  {
    q: 'Pourrai-je modifier mes textes moi-même ?',
    a: `Avec la formule ${PRO.name}, oui : un espace pour modifier vos textes est inclus. Avec ${ESSENTIEL.name}, un message suffit si vous prenez l'option maintenance : je m'occupe des petites modifications.`,
  },
  {
    q: "Un site internet pas cher, c'est possible ?",
    a: `Oui : le site d'une page commence à ${fmtPrice(ESSENTIEL.price)} € TTC, et son prix est fixé avant de commencer, sans surprise en cours de route.`,
    link: { href: '#prix', label: 'Voir les deux formules et leur contenu' },
  },
]

export default function CreationSiteVitrine() {
  const href = useSectionHref()
  // Numéros des sections dans l'ordre d'affichage (l'exemple PMSB peut manquer)
  let k = 0
  const num = () => String(++k).padStart(2, '0')

  return (
    <>
      <PageHero
        current="Création de site vitrine"
        label={<><b>SITE VITRINE</b><span className="sep">//</span> ARTISANS · TPE · ASSOCIATIONS</>}
        title="Création de site vitrine pour artisans et TPE, partout en France"
        lead="Un site simple et soigné pour vous faire connaître et être trouvé sur internet, créé pour vous et jamais copié d'un modèle tout prêt. Un seul interlocuteur du premier appel à la mise en ligne : à distance partout en France, ou chez vous en Île-de-France."
        ctas={<>
          <a href={href('contact')} className="btn btn-primary">Demander mon devis gratuit <span className="arrow">→</span></a>
          <a href={`tel:${SITE.phoneE164}`} className="btn btn-ghost">{`Appeler · ${SITE.phoneDisplay}`}</a>
        </>}
      />

      <PageSection id="prix" num={num()} label="PRIX" title="Combien coûte un site vitrine ?" intro="Deux formules, un prix fixé avant de commencer.">
        <TarifsBlock
          formules={[ESSENTIEL, PRO]}
          help={<>Boutique en ligne, espace client ou logiciel&nbsp;? C'est sur devis gratuit&nbsp;: <a href="#sur-mesure">formule {SUR_MESURE.name}</a> · <a href="/logiciel-sur-mesure">logiciel de gestion sur mesure</a>.</>}
        />
      </PageSection>

      <PageSection id="formules" num={num()} label="FORMULES" title={`${ESSENTIEL.name} ou ${PRO.name} : quelle formule choisir ?`}>
        <div className="prose">
          <h3>Formule {ESSENTIEL.name}</h3>
          <p>
            Un site d'une seule page, pour être présent sur internet, simplement.
            Idéal pour&nbsp;: {ESSENTIEL.pour.toLowerCase()}. <b>{cap(priceText(ESSENTIEL))}</b>, {enDelai(ESSENTIEL)}.
          </p>
          <h3>Formule {PRO.name}</h3>
          <p>
            Jusqu'à 6 pages&nbsp;: un site complet qui travaille pour vous, avec un espace pour
            modifier vos textes, des animations créées pour vous, un référencement Google
            plus poussé et le suivi des visites.
            Idéal pour&nbsp;: {PRO.pour.toLowerCase()}. <b>{cap(priceText(PRO))}</b>, {enDelai(PRO)}.
          </p>
          <p>Vous hésitez&nbsp;? <a href={href('contact')}>Décrivez votre projet</a>, je vous dis quelle formule vous convient.</p>
        </div>
      </PageSection>

      <PageSection id="inclus" num={num()} label="CONTENU" title="Ce que contient votre site">
        <div className="prose">
          <p>Votre site vitrine comprend&nbsp;:</p>
          <ul>
            <li>un design créé pour vous, jamais copié d'un modèle tout prêt&nbsp;;</li>
            <li>un affichage lisible sur ordinateur comme sur téléphone&nbsp;;</li>
            <li>un formulaire de contact&nbsp;;</li>
            <li>les bases pour être trouvé sur Google, et un référencement plus poussé avec la formule {PRO.name}&nbsp;;</li>
            <li>la 1<sup className="ord">re</sup> année en ligne offerte.</li>
          </ul>
          <p>
            Selon votre activité, on peut ajouter, chiffré dans le devis&nbsp;: prise de rendez-vous,
            galerie photos, paiement en ligne, espace client, plusieurs langues.
          </p>
        </div>
      </PageSection>

      <PageSection id="sur-mesure" num={num()} label={SUR_MESURE.name.toUpperCase()} title="Besoin d'une boutique ou d'un espace client ?">
        <div className="prose">
          <p>
            C'est la formule {SUR_MESURE.name}&nbsp;: boutique en ligne ou espace client, des fonctions
            rien que pour vous, connexion avec vos autres outils. Prix sur devis gratuit&nbsp;; comptez
            4 à 8 semaines selon ce que le site doit faire.
          </p>
          <p>Vous cherchez plutôt un outil de gestion&nbsp;? <a href="/logiciel-sur-mesure">{'Voir le logiciel de gestion sur mesure\u00a0→'}</a></p>
        </div>
      </PageSection>

      <PageSection
        id="etapes"
        num={num()}
        label="ÉTAPES"
        title="Comment se passe la création de votre site"
        intro={`${STEPS.length} étapes, du premier message à la mise en ligne. À chaque étape, vous savez ce que vous recevez.`}
      >
        <StepsList steps={STEPS} />
      </PageSection>

      <PageSection id="a-distance" num={num()} label="À DISTANCE" title="Partout en France, à distance">
        <div className="prose">
          <p>Où que vous soyez en France, votre projet peut se faire entièrement à distance&nbsp;:</p>
          <ul>
            <li><b>Les échanges</b>&nbsp;: par téléphone, par email ou sur WhatsApp.</li>
            <li><b>Le devis</b>&nbsp;: détaillé, envoyé par email sous 48h.</li>
            <li><b>La maquette</b>&nbsp;: vous la découvrez en ligne, on l'ajuste ensemble, puis vous la validez.</li>
            <li><b>La construction</b>&nbsp;: vous suivez l'avancement sur un lien privé.</li>
            <li><b>La mise en ligne</b>&nbsp;: je vous remets tous les accès et je vous montre comment gérer votre site.</li>
          </ul>
          <p>En Île-de-France, je peux aussi venir vous rencontrer sur place.</p>
        </div>
      </PageSection>

      <PageSection id="propriete" num={num()} label="PROPRIÉTÉ" title="Votre site vous appartient">
        <div className="prose">
          <p>
            Le site, les textes, les images, les mots de passe, l'adresse internet&nbsp;: tout vous
            revient le jour de la livraison. Si un jour vous voulez travailler avec quelqu'un
            d'autre, vous êtes libre de le faire.
          </p>
        </div>
      </PageSection>

      <PageSection id="google" num={num()} label="GOOGLE" title="Être trouvé sur Google">
        <div className="prose">
          <p>
            Chaque site est livré avec les bases pour être trouvé sur Google. La formule {PRO.name} ajoute
            un référencement plus poussé et le suivi des visites. Personne ne peut garantir une
            position sur Google.
          </p>
        </div>
      </PageSection>

      {SITE.flags.pmsbCaseStudy && (
        <PageSection id="exemple" num={num()} label="EXEMPLE" title="Un exemple : le site de PMSB">
          <div className="page-split">
            <ProjectCard {...PMSB} href={PMSB.caseStudy} />
            <div className="prose">
              <p>
                Le même client a ensuite fait créer son logiciel de gestion sur mesure. Les deux
                projets sont racontés sur la page de la réalisation.
              </p>
              <p><a href={PMSB.caseStudy}>{'Voir la réalisation PMSB\u00a0→'}</a></p>
            </div>
          </div>
        </PageSection>
      )}

      <PageSection id="apres" num={num()} label="SUIVI" title="Après la mise en ligne">
        <div className="prose">
          <p>
            Si vous le souhaitez, je continue de m'occuper de votre site avec un suivi de
            maintenance, proposé en option dans votre devis avec un prix fixé à l'avance&nbsp;:
          </p>
          <ul>
            <li><b>Mises à jour et sécurité</b>&nbsp;: votre site reste à jour et protégé.</li>
            <li><b>Sauvegardes régulières</b>&nbsp;: rien n'est perdu en cas de problème.</li>
            <li><b>Surveillance</b>&nbsp;: je vérifie que le site reste en ligne et rapide.</li>
            <li><b>Petites modifications</b>&nbsp;: un texte, une photo, un horaire à changer&nbsp;? Un message suffit.</li>
            <li><b>Un interlocuteur joignable</b>&nbsp;: en cas de souci, vous savez qui appeler.</li>
          </ul>
          <p>D'autres questions&nbsp;? <a href={href('faq')}>Voir toutes les questions fréquentes</a>.</p>
        </div>
      </PageSection>

      <PageSection id="questions" num={num()} label="QUESTIONS" title="Questions fréquentes">
        <FaqList items={FAQ_VITRINE} />
        <CtaBand
          label="VOTRE SITE"
          title="Votre site vitrine, au bon degré ?"
          text="Dites-moi en 1 minute ce dont vous avez besoin : devis détaillé sous 48h, sans engagement."
        />
      </PageSection>

      <Contact initialProjet="Site de présentation" num={num()} />
    </>
  )
}
