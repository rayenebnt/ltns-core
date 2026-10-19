import PageHero from '../components/page/PageHero'
import PageSection from '../components/page/PageSection'
import OptOutButton from '../components/OptOutButton'
import { LEGAL, SITE, TODO, isTodo } from '../data/site'
import { useSectionHref } from '../lib/route'

// Mentions légales et données personnelles (#donnees-personnelles, lien des formulaires).
// Toutes les valeurs viennent de src/data/site.js (LEGAL et SITE), rien n'est écrit ici.
// Une mention qui manque s'affiche « [à compléter] » ; tant qu'il en reste une, la page
// est hors de Google (noindex, hors du sitemap, sans données structurées : src/routes.jsx).

// Une valeur de site.js, ou « [à compléter] » bien visible si elle manque encore
const V = ({ v }) => (isTodo(v) ? <mark className="todo">{TODO}</mark> : v)

// Une adresse de site : un lien une fois renseignée
const Url = ({ v }) => (isTodo(v)
  ? <V v={v} />
  : <a href={v} target="_blank" rel="noopener noreferrer">{v.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>)

const DOMAIN = SITE.url.replace(/^https?:\/\//, '')
const FULL_NAME = <>{LEGAL.firstName} <V v={LEGAL.lastName} /></>
const MAIL = <a href={`mailto:${SITE.email}`}>{SITE.email}</a>

// « 2026-10-19 » → « 19 octobre 2026 », sans Date : le même texte au build et dans le navigateur
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const dateFr = iso => {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d === 1 ? '1er' : d} ${MOIS[m - 1]} ${y}`
}

export default function MentionsLegales() {
  const href = useSectionHref()
  let k = 0
  const num = () => String(++k).padStart(2, '0')

  return (
    <>
      <PageHero
        current="Mentions légales"
        label={<><b>LÉGAL</b><span className="sep">//</span> ÉDITEUR · HÉBERGEUR · DONNÉES</>}
        title="Mentions légales"
        lead="Qui édite ce site, qui l'héberge, et ce que deviennent les informations que vous envoyez par ses formulaires."
      />

      <PageSection id="editeur" num={num()} label="ÉDITEUR" title="Éditeur du site">
        <div className="prose">
          <p>
            Le site {DOMAIN} est édité par {FULL_NAME}, <V v={LEGAL.legalForm} />, exerçant sous
            le nom {SITE.name}.
          </p>
          <ul>
            <li><b>SIRET</b>&nbsp;: <V v={LEGAL.siret} /></li>
            <li><b>Adresse</b>&nbsp;: <V v={LEGAL.address} /></li>
            <li><b>Téléphone</b>&nbsp;: <a href={`tel:${SITE.phoneE164}`}>{SITE.phoneDisplay}</a></li>
            <li><b>Email</b>&nbsp;: {MAIL}</li>
            <li><b>TVA</b>&nbsp;: <V v={LEGAL.vat} /></li>
          </ul>
        </div>
      </PageSection>

      <PageSection id="publication" num={num()} label="PUBLICATION" title="Directeur de la publication">
        <div className="prose">
          <p>{FULL_NAME}.</p>
        </div>
      </PageSection>

      <PageSection id="hebergeur" num={num()} label="HÉBERGEMENT" title="Hébergeur">
        <div className="prose">
          <p>
            {LEGAL.host.name}, <V v={LEGAL.host.address} />, téléphone <V v={LEGAL.host.phone} />,{' '}
            <Url v={LEGAL.host.url} />.
          </p>
        </div>
      </PageSection>

      <PageSection id="donnees-personnelles" num={num()} label="RGPD" title="Données personnelles">
        <div className="prose">
          <h3>Responsable du traitement</h3>
          <p>{FULL_NAME} ({SITE.name}), {MAIL}.</p>

          <h3>Données collectées</h3>
          <ul>
            <li><b>Formulaire de devis</b>&nbsp;: projet, formule, budget, fonctions souhaitées, message, nom, email.</li>
            <li><b>Demande de formule</b>&nbsp;: nom, email, téléphone (facultatif), activité (facultative).</li>
          </ul>
          <p>Les champs obligatoires sont le nom et l'email.</p>

          <h3>Finalité et base légale</h3>
          <p>
            Les informations envoyées par le <a href={href('contact')}>formulaire de devis</a> ou
            par une demande de formule servent à répondre à votre demande et à établir votre devis.
            Base légale&nbsp;: mesures précontractuelles prises à votre demande (art. 6.1.b RGPD).
          </p>

          <h3>Destinataires et prestataires</h3>
          <ul>
            <li><b>Formspree</b>&nbsp;: transmission des formulaires&nbsp;;</li>
            <li><b>Google</b>&nbsp;: messagerie Gmail&nbsp;;</li>
            <li><b>Vercel</b>&nbsp;: hébergement{SITE.analytics.vercel && " et mesure d'audience"}&nbsp;;</li>
            <li><b>Umami</b>&nbsp;: mesure d'audience&nbsp;;</li>
            <li><b>WhatsApp (Meta)</b>, si vous me contactez par WhatsApp.</li>
          </ul>

          <h3>Transferts hors de l'Union européenne</h3>
          <p><V v={LEGAL.transfers} /></p>

          <h3>Durée de conservation</h3>
          <p><V v={LEGAL.retention} /></p>

          <h3>Vos droits</h3>
          <p>
            Vous pouvez demander l'accès à vos données, leur rectification, leur effacement ou la
            limitation de leur traitement, vous opposer à ce traitement, demander la portabilité
            de vos données, et donner des directives sur le sort de vos données après votre décès,
            en écrivant à {MAIL}. Vous pouvez aussi adresser une réclamation à la CNIL
            (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>).
          </p>
          <p>Aucune décision automatisée n'est prise à partir de vos données.</p>
        </div>
      </PageSection>

      <PageSection id="mesure-audience" num={num()} label="AUDIENCE" title="Mesure d'audience">
        <div className="prose">
          <p>
            Ce site mesure sa fréquentation avec Umami{SITE.analytics.vercel && ' et Vercel Web Analytics'}&nbsp;:
            des statistiques de fréquentation agrégées, sans cookie. Base légale&nbsp;: intérêt légitime
            (art. 6.1.f RGPD).
          </p>
          <p>Vous pouvez désactiver cette mesure sur cet appareil&nbsp;:</p>
          <p className="optout"><OptOutButton /></p>
        </div>
      </PageSection>

      <PageSection id="mediation" num={num()} label="MÉDIATION" title="Médiation de la consommation">
        <div className="prose">
          <p>
            En cas de litige, vous pouvez faire appel au médiateur de la consommation&nbsp;:{' '}
            <V v={LEGAL.mediator.name} />, <Url v={LEGAL.mediator.url} />.
          </p>
        </div>
      </PageSection>

      <PageSection id="propriete" num={num()} label="PROPRIÉTÉ" title="Propriété intellectuelle">
        <div className="prose">
          <p>
            Les textes, le logo {SITE.name} et les visuels de ce site ne peuvent pas être reproduits
            sans accord.
          </p>
          <p>Les captures des sites et logiciels réalisés pour des clients appartiennent à leurs propriétaires.</p>
          <p>Polices Space Grotesk, JetBrains Mono et Inter Tight, sous licence SIL Open Font License.</p>
        </div>
        <p className="page-updated">
          Dernière mise à jour&nbsp;: <time dateTime={LEGAL.updated}>{dateFr(LEGAL.updated)}</time>
        </p>
      </PageSection>
    </>
  )
}
