import { useState, useRef } from 'react'
import CtaBand from './CtaBand'
import { FAQ } from '../data/faq'
import { nbsp } from '../lib/typo'

// Une réponse : textes simples et listes à puces (voir src/data/faq.js), en
// typographie française (src/lib/typo.js).
// Réponse repliée : son lien ne reçoit pas le focus au clavier (il est caché).
function FaqAnswer({ a, link, open }) {
  const parts = Array.isArray(a) ? a : [a]
  return (
    <>
      {parts.map((part, i) => typeof part === 'string' ? nbsp(part) : (
        <ul key={i} className="faq-maint">
          {part.list.map(({ b, t }) => <li key={b}><b>{b}</b>{nbsp(` : ${t}`)}</li>)}
        </ul>
      ))}
      {link && <>{' '}<a className="faq-link" href={link.href} tabIndex={open ? undefined : -1}>{link.label}</a></>}
    </>
  )
}

export function FaqItem({ q, a, link, idx }) {
  const [open, setOpen] = useState(false)
  const answerRef = useRef(null)

  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button
        className="faq-q"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="idx">Q.{String(idx + 1).padStart(2, '0')}</span>
        <span>{nbsp(q)}</span>
        <span className="faq-icon" aria-hidden="true"></span>
      </button>
      <div
        className="faq-a"
        ref={answerRef}
        style={{ maxHeight: open ? answerRef.current?.scrollHeight + 'px' : '0' }}
      >
        <div className="faq-a-inner"><FaqAnswer a={a} link={link} open={open} /></div>
      </div>
    </div>
  )
}

export default function Faq() {
  return (
    <section id="faq">
      <div className="section-head reveal">
        <div>
          <span className="section-label">
            <b>06</b><span className="sep">//</span> QUESTIONS
          </span>
          <h2 className="section-title">Vos questions,<br/><em>mes réponses</em>.</h2>
          <p className="section-intro">
            Les questions qu'on me pose le plus souvent. Si la vôtre n'y est pas,
            écrivez-moi : mes coordonnées sont juste en dessous.
          </p>
        </div>
        <div className="section-temp">
          90<span className="deg">°</span>
          <span className="label">RÉPONSES CLAIRES</span>
        </div>
      </div>
      <div className="faq-list reveal">
        {FAQ.map((f, i) => <FaqItem key={i} idx={i} {...f} />)}
      </div>

      <CtaBand
        label="UNE AUTRE QUESTION ?"
        title="Parlons de votre projet."
        text="Demandez votre devis en 1 minute, ou appelez-moi directement : je vous réponds sous 48h, sans engagement."
      />
    </section>
  )
}
