import { useEffect, useState } from 'react'

// Scroll-spy : renvoie l'id de la section en cours de lecture.
// `offset` compense la hauteur de la nav fixe.
export default function useActiveSection(ids, offset = 140) {
  const [active, setActive] = useState('')

  useEffect(() => {
    let raf = 0

    const compute = () => {
      raf = 0
      const line = window.scrollY + offset
      let current = ''

      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top + window.scrollY <= line) current = id
      }

      // En bas de page, la dernière section est forcément celle qu'on lit,
      // même si elle est trop courte pour franchir la ligne de repère.
      const bottom = window.scrollY + window.innerHeight
      if (bottom >= document.documentElement.scrollHeight - 4) current = ids[ids.length - 1]

      setActive(current)
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute)
    }

    compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ids, offset])

  return active
}
