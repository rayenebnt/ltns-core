import PageHero from '../components/page/PageHero'
import PageSection from '../components/page/PageSection'
import StepsList from '../components/page/StepsList'
import FaqList from '../components/page/FaqList'
import Contact from '../components/Contact'
import CtaBand from '../components/CtaBand'
import { services } from '../components/Services'
import { FORMULES, priceText } from '../data/formules'
import { SITE } from '../data/site'
import { useSectionHref } from '../lib/route'

// Page « Création d'application mobile ». Le prix est toujours sur devis : jamais de
// fourchette ni de prix d'appel tant qu'il n'est pas dans src/data/formules.js. Aucune
// application n'est citée en exemple tant qu'il n'y en a pas de publique.

// Texte de la carte « Applications mobiles » de l'accueil (S05)
const APPLICATION = services.find(s => s.id === 'S05').desc
const [ESSENTIEL] = FORMULES.filter(f => f.price)

// Des exemples d'usages, pas des réalisations
const POUR_CLIENTS = [
  'Prise de rendez-vous', 'Commande et paiement', 'Suivi de commande',
  'Notifications', 'Carte de fidélité', 'Espace client',
]
const POUR_EQUIPE = [
  'Plannings', 'Interventions', 'Photos de chantier',
  'Signature sur le téléphone', 'Stocks', 'Connexion avec vos autres outils',
]

// Les étapes d'un projet d'application (celles d'un site sont dans src/data/steps.js)
const ETAPES = [
  { num: '01', title: 'Écoute', desc: "Vous me décrivez votre projet ; on s'appelle 20 minutes, gratuitement." },
  { num: '02', title: 'Plan', desc: "Ensemble, on liste ce que l'application doit faire." },
  { num: '03', title: 'Devis détaillé', desc: 'Sous 48h : ce qui est inclus, le prix et le délai, fixés avant de commencer.' },
  { num: '04', title: 'Construction', desc: "Vous suivez l'avancement tout au long du projet." },
  { num: '05', title: 'Livraison', desc: "Je vous remets tous les accès et je vous montre comment l'utiliser." },
  { num: '06', title: 'Suivi', desc: 'Je reste joignable : suivi et mises à jour dans la durée.' },
]

const FAQ_APPLICATION = [
  {
    q: 'Combien coûte une application mobile ?',
    a: "Le prix dépend de ce que l'application doit faire : il est indiqué dans un devis gratuit, après un premier échange, et fixé avant de commencer.",
  },
  {
    q: "Une application mobile pas chère, c'est possible ?",
    a: "Oui, en commençant par l'essentiel : une première version avec les fonctions indispensables, puis les autres ensuite. Et si un site suffit pour votre besoin, je vous le dis.",
    link: { href: '/site-internet-pas-cher', label: "Voir le prix d'un site internet" },
  },
  {
    q: 'Sur iPhone et sur Android ?',
    a: "Oui, l'application peut être créée pour iPhone et pour Android.",
  },
  {
    q: 'En combien de temps est-elle livrée ?',
    a: "La date de livraison est indiquée dans le devis, une fois qu'on a listé ensemble ce dont vous avez besoin.",
  },
  {
    q: "À qui appartient l'application ?",
    a: 'À vous. À la livraison, je vous remets tous les accès.',
  },
  {
    q: "Travaillez-vous en dehors de l'Île-de-France ?",
    a: 'Oui, partout en France : tout peut se faire à distance (téléphone, WhatsApp, email). En Île-de-France, je peux aussi venir vous rencontrer sur place.',
  },
]

export default function ApplicationMobile() {
  const href = useSectionHref()
  let k = 0
  const num = () => String(++k).padStart(2, '0')

  return (
    <>
      <PageHero
        current="Application mobile"
        label={<><b>APPLICATION MOBILE</b><span className="sep">//</span> IPHONE · ANDROID</>}
        title="Création d'application mobile pour iPhone et Android"
        lead={`${APPLICATION} Un seul interlocuteur de la première discussion à la livraison, partout en France à distance, et sur place en Île-de-France.`}
        ctas={<>
          <a href={href('contact')} className="btn btn-primary">Demander mon devis gratuit <span className="arrow">→</span></a>
          <a href={`tel:${SITE.phoneE164}`} className="btn btn-ghost">{`Appeler · ${SITE.phoneDisplay}`}</a>
        </>}
      />

      <PageSection id="usages" num={num()} label="USAGES" title="Une application, pour quoi faire ?" intro="Quelques exemples de ce qu'elle peut faire.">
        <div className="prose"><h3>Pour vos clients</h3></div>
        <ul className="chips">
          {POUR_CLIENTS.map(f => <li key={f}>{f}</li>)}
        </ul>
        <div className="prose"><h3>Pour votre équipe</h3></div>
        <ul className="chips">
          {POUR_EQUIPE.map(f => <li key={f}>{f}</li>)}
        </ul>
      </PageSection>

      <PageSection id="prix" num={num()} label="PRIX" title="Combien coûte une application mobile ?">
        <div className="prose">
          <p>
            Le prix dépend de ce que l'application doit faire&nbsp;: le nombre d'écrans, les comptes
            utilisateurs, le paiement, les notifications, la connexion avec vos outils. Il est indiqué
            dans un devis gratuit, envoyé sous 48h après un premier échange, et fixé avant de commencer.
          </p>
          <p>Pour garder un budget raisonnable&nbsp;:</p>
          <ul>
            <li><b>Commencer par l'essentiel</b>&nbsp;: une première version avec les fonctions indispensables, les autres ensuite.</li>
            <li><b>Partir de ce que vous avez</b>&nbsp;: l'application peut se connecter à vos outils actuels plutôt que tout remplacer.</li>
            <li><b>Vérifier qu'il vous faut une application</b>&nbsp;: pour vous faire connaître, un site lisible sur téléphone suffit souvent, {priceText(ESSENTIEL)}.</li>
          </ul>
          <p><a href="/site-internet-pas-cher">{'Voir le prix d\'un site internet →'}</a></p>
        </div>
      </PageSection>

      <PageSection id="etapes" num={num()} label="ÉTAPES" title="Comment se passe la création de votre application">
        <StepsList steps={ETAPES} />
      </PageSection>

      <PageSection id="site-ou-application" num={num()} label="SITE OU APPLICATION" title="Application ou site internet ?">
        <div className="prose">
          <p>
            Une application devient utile quand vos clients ou votre équipe s'en servent souvent&nbsp;:
            réserver, commander, suivre une intervention. Pour vous faire connaître et recevoir des
            demandes, un site suffit souvent, et coûte moins cher.
          </p>
          <p>
            Pour gérer votre activité (clients, devis, factures, plannings), voyez aussi
            le <a href="/logiciel-sur-mesure">logiciel de gestion sur mesure</a>.
          </p>
          <p>Vous hésitez&nbsp;? <a href={href('contact')}>Décrivez votre projet</a>, je vous dis ce qui vous convient.</p>
        </div>
      </PageSection>

      <PageSection id="propriete" num={num()} label="PROPRIÉTÉ" title="Votre application vous appartient">
        <div className="prose">
          <p>
            À la livraison, je vous remets tous les accès. Si un jour vous voulez travailler avec
            quelqu'un d'autre, vous êtes libre de le faire.
          </p>
        </div>
      </PageSection>

      <PageSection id="questions" num={num()} label="QUESTIONS" title="Questions fréquentes">
        <FaqList items={FAQ_APPLICATION} />
        <CtaBand
          label="VOTRE APPLICATION"
          title="Une application à votre mesure ?"
          text="Dites-moi en 1 minute ce que l'application doit faire : devis détaillé sous 48h, sans engagement."
        />
      </PageSection>

      <Contact initialProjet="Application mobile" num={num()} />
    </>
  )
}
