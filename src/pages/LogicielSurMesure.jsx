import PageHero from '../components/page/PageHero'
import PageSection from '../components/page/PageSection'
import StepsList from '../components/page/StepsList'
import FaqList from '../components/page/FaqList'
import Contact from '../components/Contact'
import CtaBand from '../components/CtaBand'
import { ProjectFigure, projects } from '../components/Realisations'
import { services } from '../components/Services'
import { SITE } from '../data/site'
import { useSectionHref } from '../lib/route'

// Page « Logiciel de gestion sur mesure ». L'exemple PMSB Gestion reste court :
// toute l'histoire du projet est sur l'étude de cas (/realisations/pmsb#logiciel).
// Jamais de fourchette de prix, de concurrent, ni de promesse sur la sécurité ou l'hébergement.

const GESTION = projects.find(p => p.id === 'P03')
// Textes des cartes de services de l'accueil : logiciels (S04) et applications (S05)
const LOGICIEL = services.find(s => s.id === 'S04').desc
const APPLICATION = services.find(s => s.id === 'S05').desc

const FONCTIONS = [
  'Clients', 'Devis et factures', 'Stocks', 'Plannings', 'Achats de matériel',
  'Échéancier des paiements', 'Bibliothèque de prix', 'Tableau de bord',
  'Automatisation des tâches répétitives', 'Connexion avec vos autres outils',
]

// Les étapes d'un projet de logiciel (celles d'un site sont dans src/data/steps.js)
const ETAPES = [
  { num: '01', title: 'Écoute', desc: "Vous me décrivez votre activité ; on s'appelle 20 minutes, gratuitement." },
  { num: '02', title: 'Plan', desc: 'Ensemble, on liste ce que le logiciel doit faire.' },
  { num: '03', title: 'Devis détaillé', desc: 'Sous 48h : ce qui est inclus, le prix et le délai, fixés avant de commencer.' },
  { num: '04', title: 'Construction', desc: "Vous suivez l'avancement sur un lien privé." },
  { num: '05', title: 'Livraison', desc: "Je vous remets tous les accès et je vous montre comment l'utiliser." },
  { num: '06', title: 'Suivi', desc: 'Je reste joignable : suivi et mises à jour dans la durée.' },
]

const FAQ_LOGICIEL = [
  {
    q: 'Combien coûte un logiciel sur mesure ?',
    a: 'Le prix dépend de ce que le logiciel doit faire : il est indiqué dans un devis gratuit, après un premier échange, et fixé avant de commencer.',
  },
  {
    q: 'En combien de temps est-il livré ?',
    a: "La date de livraison est indiquée dans le devis, une fois qu'on a listé ensemble ce dont vous avez besoin."
      + (SITE.flags.pmsbCaseStudy ? " À titre d'exemple, PMSB Gestion a été livré en 4 semaines." : ''),
  },
  {
    q: 'À qui appartient le logiciel ?',
    a: 'À vous. À la livraison, je vous remets tous les accès.',
  },
  {
    q: 'Faites-vous aussi des applications mobiles ?',
    a: 'Oui. Comme pour un logiciel, on liste ensemble ce dont vous avez besoin, puis le prix et le délai sont fixés dans un devis gratuit.',
  },
]

export default function LogicielSurMesure() {
  const href = useSectionHref()
  // Numéros des sections dans l'ordre d'affichage (l'exemple PMSB peut manquer)
  let k = 0
  const num = () => String(++k).padStart(2, '0')

  return (
    <>
      <PageHero
        current="Logiciel sur mesure"
        label={<><b>LOGICIEL SUR MESURE</b><span className="sep">//</span> TPE · ARTISANS · ENTREPRISES</>}
        title="Logiciel de gestion sur mesure, pensé pour votre métier"
        lead={`${LOGICIEL} Un seul interlocuteur de la première discussion à la livraison, partout en France à distance, et sur place en Île-de-France.`}
        ctas={<>
          <a href={href('contact')} className="btn btn-primary">Demander mon devis gratuit <span className="arrow">→</span></a>
          <a href={`tel:${SITE.phoneE164}`} className="btn btn-ghost">{`Appeler · ${SITE.phoneDisplay}`}</a>
        </>}
      />

      <PageSection id="fonctions" num={num()} label="FONCTIONS" title="Ce que peut gérer votre logiciel">
        <div className="prose">
          <p>Votre logiciel réunit au même endroit ce dont votre activité a besoin, par exemple&nbsp;:</p>
        </div>
        <ul className="chips">
          {FONCTIONS.map(f => <li key={f}>{f}</li>)}
        </ul>
        <div className="prose">
          <p>
            Il est construit avec <b>des fonctions rien que pour vous</b>, et peut se connecter à
            vos autres outils. Après la livraison&nbsp;: <b>suivi et mises à jour dans la durée</b>.
            Le prix est sur devis gratuit, fixé avant de commencer.
          </p>
          <p>Besoin aussi d'un site&nbsp;? <a href="/creation-site-vitrine">{'Voir la création de site vitrine\u00a0→'}</a></p>
        </div>
      </PageSection>

      {SITE.flags.pmsbCaseStudy && (
        <PageSection id="exemple" num={num()} label="EXEMPLE" title="Exemple : PMSB Gestion">
          <div className="page-split">
            <ProjectFigure {...GESTION} caption="Outil interne, accès réservé" />
            <div>
              <div className="prose">
                <p>
                  PMSB, entreprise du bâtiment en Île-de-France, faisait tous ses devis à la main.
                  Son logiciel, PMSB Gestion, réunit au même endroit clients, devis, factures, achats
                  de matériel, échéancier et bibliothèque de prix, avec un tableau de bord. Livré en
                  4 semaines pour ce projet&nbsp;; pour le vôtre, le délai est fixé dans le devis.
                </p>
              </div>
              <ul className="chips">
                {GESTION.features.map(f => <li key={f}>{f}</li>)}
              </ul>
              <div className="prose">
                <p><a href={GESTION.caseStudy}>{'Toute l\'histoire du projet PMSB\u00a0→'}</a></p>
              </div>
            </div>
          </div>
        </PageSection>
      )}

      <PageSection id="sur-mesure" num={num()} label="SUR MESURE" title="Sur mesure ou logiciel du marché ?">
        <div className="prose">
          <p>
            Un logiciel sur mesure suit votre façon de travailler, pas l'inverse. Tout vous
            appartient à la livraison. Le premier échange de 20 minutes est gratuit et sans engagement.
          </p>
        </div>
      </PageSection>

      <PageSection id="etapes" num={num()} label="ÉTAPES" title="Comment se passe un projet de logiciel">
        <StepsList steps={ETAPES} />
      </PageSection>

      <PageSection id="application" num={num()} label="APPLICATION" title="Et une application mobile ?">
        <div className="prose">
          <p>{`${APPLICATION.replace(/\.$/, '')}\u00a0: sur devis gratuit.`}</p>
        </div>
      </PageSection>

      <PageSection id="questions" num={num()} label="QUESTIONS" title="Questions fréquentes">
        <FaqList items={FAQ_LOGICIEL} />
        <CtaBand
          label="VOTRE OUTIL"
          title="Un logiciel à votre mesure ?"
          text="Dites-moi en 1 minute ce qui vous fait perdre du temps : devis détaillé sous 48h, sans engagement."
        />
      </PageSection>

      <Contact initialProjet="Logiciel pour mon métier" num={num()} />
    </>
  )
}
