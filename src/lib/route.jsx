import { createContext, useContext, useMemo } from 'react'
import { normalize } from '../routes'

// La page en cours, accessible partout sans passer de props.
// Tout dépend seulement de l'adresse : le serveur et le navigateur
// calculent donc exactement les mêmes liens.
const RouteContext = createContext(null)

export function RouteProvider({ path, route, children }) {
  const value = useMemo(() => ({ path, route }), [path, route])
  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>
}

// { path, route } de la page en cours
export function useRoute() {
  const ctx = useContext(RouteContext)
  if (!ctx) throw new Error('useRoute doit être appelé dans <RouteProvider>')
  return ctx
}

// Lien vers une section de l'accueil : « #id » si la section est sur la page,
// « /#id » sinon (l'accueil garde donc ses liens « #tarifs », « #contact »…)
export function useSectionHref() {
  const { route } = useRoute()
  return id => (route.sections.includes(id) ? '#' + id : '/#' + id)
}

export function useIsHome() {
  return normalize(useRoute().path) === '/'
}
