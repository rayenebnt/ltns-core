import { useEffect, useState } from 'react'

export default function Loader({ done }) {
  const [temp, setTemp] = useState(12)

  useEffect(() => {
    if (done) return
    const start = performance.now()
    const dur = 1100
    let raf
    const tick = (now) => {
      const k = Math.min(1, (now - start) / dur)
      setTemp(12 + k * 87)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [done])

  return (
    <div className={`loader ${done ? 'done' : ''}`} aria-hidden="true">
      <div className="loader-logo">LTNS<span>°</span></div>
      <div className="loader-readout">
        <span>BOOT</span>
        <span className="brackets">[</span>
        <b>{temp.toFixed(1)}°</b>
        <span className="brackets">/</span>
        <span>99.0°</span>
        <span className="brackets">]</span>
      </div>
      <div className="loader-bar"></div>
      <div className="loader-readout">
        <span>LE WEB</span>
        <span className="brackets">//</span>
        <span>AU BON DEGRÉ</span>
      </div>
    </div>
  )
}
