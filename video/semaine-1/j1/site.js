/* Site d'exemple « Plomberie Varenne » (entreprise fictive), version téléphone.
   Utilisé par tiktok.html (vidéo verticale) et pc.html (version à filmer sur l'ordinateur).
   Dessiné sur 400 px de large ; la page qui l'affiche le met à l'échelle.
   Site.build(conteneur) → { el, sections, update({ scroll, glow, zone, call }) } */
(function () {
  const ICONS = {
    drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    bath: '<path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M10 5 8 7M2 12h20M7 19v2M17 19v2"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  }
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24">${ICONS[n]}</svg>`
  // Illustrations des chantiers (à plat, sans photo réelle)
  const CHANTIERS = [
    `<svg viewBox="0 0 120 90"><rect width="120" height="90" fill="#E0ECFF"/><g fill="#fff" stroke="#BFD3F5" stroke-width="1.5">${[0, 1, 2, 3].map(r => [0, 1, 2, 3, 4].map(c => `<rect x="${c * 24}" y="${r * 18}" width="24" height="18"/>`).join('')).join('')}</g><rect x="14" y="52" width="92" height="26" rx="12" fill="#fff" stroke="#1D4ED8" stroke-width="3"/><path d="M88 30 v16 M84 30 h8" stroke="#64748B" stroke-width="3" stroke-linecap="round"/></svg>`,
    `<svg viewBox="0 0 120 90"><rect width="120" height="90" fill="#F1F5F9"/><rect x="38" y="10" width="44" height="54" rx="6" fill="#fff" stroke="#94A3B8" stroke-width="3"/><circle cx="60" cy="30" r="8" fill="none" stroke="#F97316" stroke-width="3"/><rect x="52" y="46" width="16" height="6" rx="2" fill="#1D4ED8"/><path d="M48 64 v18 M60 64 v18 M72 64 v18" stroke="#64748B" stroke-width="4"/></svg>`,
    `<svg viewBox="0 0 120 90"><rect width="120" height="90" fill="#ECFEFF"/><path d="M10 40 h40 a10 10 0 0 1 10 10 v30" fill="none" stroke="#1D4ED8" stroke-width="7" stroke-linecap="round"/><path d="M110 40 h-30 a10 10 0 0 0 -10 10 v30" fill="none" stroke="#0891B2" stroke-width="7" stroke-linecap="round"/><circle cx="60" cy="22" r="7" fill="#1D4ED8"/><path d="M60 29 v8" stroke="#1D4ED8" stroke-width="3"/></svg>`,
  ]

  const CSS = `
  .pv { width: 400px; font-family: 'Montserrat', sans-serif; color: #0F172A; background: #fff; }
  .pv .ic { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; flex: none; }
  .pv-head { height: 64px; display: flex; align-items: center; gap: 10px; padding: 0 18px; }
  .pv-logo { width: 40px; height: 40px; border-radius: 12px; background: #1D4ED8; color: #fff; display: grid; place-items: center; }
  .pv-head b { display: block; font-weight: 800; font-size: 19px; letter-spacing: -.4px; line-height: 1.05; }
  .pv-head small { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 3px; color: #64748B; margin-top: 3px; }
  .pv-ex { margin: 0 18px 10px; display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 1px; color: #fff; background: #0F172A; padding: 4px 9px; border-radius: 7px; }
  .pv-sec { position: relative; margin: 0 14px 14px; border-radius: 18px; }
  .pv-sec::after { content: ''; position: absolute; inset: -4px; border-radius: 22px; border: 4px solid #22D3EE; opacity: var(--glow, 0); pointer-events: none; }
  #pv-call { background: #1D4ED8; color: #fff; padding: 16px 18px; display: flex; align-items: center; gap: 14px; box-shadow: 0 14px 24px -14px rgba(29, 78, 216, .9); }
  #pv-call .ic { width: 28px; height: 28px; }
  #pv-call b { font-family: 'JetBrains Mono', monospace; font-weight: 500; font-size: 19px; letter-spacing: 0; flex: 1; white-space: nowrap; }
  #pv-call span { background: #fff; color: #1D4ED8; font-weight: 800; font-size: 15px; padding: 7px 12px; border-radius: 10px; }
  #pv-zone { background: #F1F5F9; padding: 16px; }
  #pv-zone h3, .pv-t { font-weight: 800; font-size: 19px; letter-spacing: -.3px; }
  #pv-zone p { font-size: 14px; color: #475569; margin-top: 2px; }
  .pv-map { position: relative; height: 150px; margin-top: 12px; border-radius: 14px; overflow: hidden; background:
      linear-gradient(rgba(15,23,42,.06) 1.5px, transparent 1.5px) 0 0 / 26px 26px, linear-gradient(90deg, rgba(15,23,42,.06) 1.5px, transparent 1.5px) 0 0 / 26px 26px, #E2E8F0; }
  .pv-map::before { content: ''; position: absolute; left: -10%; right: -10%; top: 58%; height: 12px; background: #fff; transform: rotate(-9deg); }
  .pv-map::after { content: ''; position: absolute; left: 30%; top: -10%; bottom: -10%; width: 10px; background: #fff; transform: rotate(14deg); }
  .pv-circle { position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%; background: rgba(29, 78, 216, .16); border: 3px solid #1D4ED8; z-index: 1; }
  .pv-map .pin { position: absolute; left: 50%; top: 50%; width: 30px; height: 30px; margin: -26px 0 0 -15px; color: #1D4ED8; z-index: 2; stroke-width: 2.4; fill: #DBEAFE; }
  .pv-km { position: absolute; right: 10px; bottom: 10px; z-index: 2; font-family: 'JetBrains Mono', monospace; font-size: 13px; background: #fff; padding: 4px 8px; border-radius: 8px; }
  #pv-serv { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  #pv-serv div { background: #fff; border: 2px solid #E2E8F0; border-radius: 16px; padding: 14px 6px; text-align: center; font-weight: 700; font-size: 14px; }
  #pv-serv .ic { width: 30px; height: 30px; color: #1D4ED8; margin: 0 auto 8px; display: block; }
  #pv-chant .row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; }
  #pv-chant svg { width: 100%; display: block; border-radius: 12px; }
  #pv-contact { background: #F8FAFC; border: 2px solid #E2E8F0; padding: 16px; }
  #pv-contact .in { height: 42px; border: 2px solid #CBD5E1; border-radius: 10px; background: #fff; margin-top: 10px; }
  #pv-contact .in.ta { height: 70px; }
  #pv-contact .btn { margin-top: 12px; display: inline-flex; align-items: center; gap: 8px; background: #1D4ED8; color: #fff; font-weight: 800; font-size: 15px; padding: 11px 16px; border-radius: 10px; }
  #pv-contact .btn .ic { width: 18px; height: 18px; }
  .pv-foot { background: #0F172A; color: #CBD5E1; font-size: 12px; padding: 18px; text-align: center; margin-top: 18px; }
  `

  function build(root) {
    if (!document.getElementById('pv-css')) { const st = document.createElement('style'); st.id = 'pv-css'; st.textContent = CSS; document.head.appendChild(st) }
    root.innerHTML = `
    <div class="pv" id="pv">
      <div class="pv-head"><span class="pv-logo">${icon('drop')}</span><div><b>Plomberie Varenne</b><small>PLOMBIER</small></div></div>
      <span class="pv-ex">EXEMPLE · ENTREPRISE FICTIVE</span>
      <div class="pv-sec" id="pv-call">${icon('phone')}<b>06 •• •• •• ••</b><span>Appeler</span></div>
      <div class="pv-sec" id="pv-zone"><h3>Je viens chez toi</h3><p>Dépannage à 15 km autour</p>
        <div class="pv-map"><div class="pv-circle" id="pv-circle"></div><svg class="ic pin" viewBox="0 0 24 24">${ICONS.pin}</svg><span class="pv-km">15 km</span></div></div>
      <div class="pv-sec" id="pv-serv"><div>${icon('drop')}Fuite</div><div>${icon('flame')}Chauffe-eau</div><div>${icon('bath')}Salle de bain</div></div>
      <div class="pv-sec" id="pv-chant"><div class="pv-t">Mes chantiers</div><div class="row">${CHANTIERS.join('')}</div></div>
      <div class="pv-sec" id="pv-contact"><div class="pv-t">Une fuite ? Écris-moi</div><div class="in"></div><div class="in ta"></div><span class="btn">${icon('send')}Envoyer</span></div>
      <div class="pv-foot">Plomberie Varenne · entreprise fictive</div>
    </div>`
    const el = root.querySelector('#pv')
    const sections = { call: el.querySelector('#pv-call'), zone: el.querySelector('#pv-zone'), serv: el.querySelector('#pv-serv'), chant: el.querySelector('#pv-chant'), contact: el.querySelector('#pv-contact') }
    const circle = el.querySelector('#pv-circle')
    return {
      el, sections,
      // scroll : 0 → 1 (haut → bas de la page) ; glow : { nom: 0..1 } ; zone : agrandissement du cercle ; call : éclat du bandeau
      update({ scroll = 0, glow = {}, zone = 0, call = 0, viewH = 760 }) {
        const max = Math.max(0, el.scrollHeight - viewH)
        el.style.transform = `translateY(${-scroll * max}px)`
        for (const [k, s] of Object.entries(sections)) s.style.setProperty('--glow', (glow[k] || 0).toFixed(3))
        circle.style.transform = `scale(${1 + 0.45 * zone})`
        circle.style.background = `rgba(29, 78, 216, ${0.16 + 0.2 * zone})`
        sections.call.style.transform = `scale(${1 + 0.05 * call})`
        sections.call.style.boxShadow = call > 0.02 ? `0 0 0 ${Math.round(12 * call)}px rgba(34, 211, 238, ${0.45 * call}), 0 14px 24px -14px rgba(29, 78, 216, .9)` : ''
      },
      // Position (0 → 1) qui amène une section en haut de la zone visible
      scrollFor(name, viewH = 760) {
        const max = Math.max(1, el.scrollHeight - viewH)
        return Math.min(1, Math.max(0, (sections[name].offsetTop - 70) / max))
      },
    }
  }
  window.Site = { build, icon }
})()
