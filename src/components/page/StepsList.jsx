import { nbsp } from '../../lib/typo'

// Les étapes d'un projet, en liste numérotée lisible sans JavaScript.
// steps : [{ num, title, desc, out? }] (ex. STEPS de src/data/steps.js) ;
// out, s'il existe, devient « Vous recevez : … » (première lettre en minuscule).
// Textes en typographie française (src/lib/typo.js).

const lowerFirst = s => s.charAt(0).toLowerCase() + s.slice(1)

export default function StepsList({ steps }) {
  return (
    <ol className="steps-list">
      {steps.map(s => (
        <li key={s.num}>
          <span className="num">{s.num}</span>
          <h3>{nbsp(s.title)}</h3>
          <p>{nbsp(s.desc)}</p>
          {s.out && <p className="steps-out">{nbsp(`Vous recevez : ${lowerFirst(s.out)}`)}</p>}
        </li>
      ))}
    </ol>
  )
}
