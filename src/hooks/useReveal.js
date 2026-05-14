import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function useReveal(active) {
  useEffect(() => {
    if (!active) return

    const triggers = []
    document.querySelectorAll('.reveal').forEach(el => {
      const trigger = ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        onEnter: () => el.classList.add('visible'),
        once: true
      })
      triggers.push(trigger)
    })

    return () => triggers.forEach(t => t.kill())
  }, [active])
}
