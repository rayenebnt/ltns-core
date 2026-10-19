// Les étapes d'un projet, en liste numérotée lisible sans JavaScript.
// steps : [{ num, title, desc, out? }] (ex. STEPS de src/data/steps.js) ;
// out, s'il existe, devient « Vous recevez : … ».
export default function StepsList({ steps }) {
  return (
    <ol className="steps-list">
      {steps.map(s => (
        <li key={s.num}>
          <span className="num">{s.num}</span>
          <h3>{s.title}</h3>
          <p>{s.desc}</p>
          {s.out && <p className="steps-out">{`Vous recevez : ${s.out}`}</p>}
        </li>
      ))}
    </ol>
  )
}
