import Hero from '../components/Hero'
import Tarifs from '../components/Tarifs'
import Contact from '../components/Contact'
import Realisations from '../components/Realisations'
import Services from '../components/Services'
import Process from '../components/Process'
import Faq from '../components/Faq'

// L'accueil : toutes les sections, dans l'ordre de lecture du site
export default function Home({ loaded }) {
  return (
    <>
      <Hero loaded={loaded} />
      <Tarifs />
      <Contact />
      <Realisations />
      <Services />
      <Process />
      <Faq />
    </>
  )
}
