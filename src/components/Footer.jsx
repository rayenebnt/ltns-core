export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-logo">LTNS<span className="deg">°</span></div>
        <div className="footer-meta">
          <a href="#services">Services</a>
          <a href="#contact">Contact</a>
          <a href="#" aria-label="Instagram">Instagram</a>
          <a href="#" aria-label="LinkedIn">LinkedIn</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} LTNS° — Tous droits réservés</span>
        <span>Le web au bon degré.</span>
      </div>
    </footer>
  )
}
