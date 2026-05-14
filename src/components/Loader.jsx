export default function Loader({ done }) {
  return (
    <div className={`loader ${done ? 'done' : ''}`} aria-hidden="true">
      <div className="loader-logo">LTNS<span>°</span></div>
      <div className="loader-bar"></div>
    </div>
  )
}
