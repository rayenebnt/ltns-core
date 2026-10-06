/* ============================================================
   Avatar LTNS° — personnage vectoriel façon « autocollant »
   ------------------------------------------------------------
   LTNSAvatar.svg({ pose, expr, mouth, blink, look })
     pose  : 'idle' | 'wave' | 'pointUp' | 'pointSide' | 'shrug' | 'phone'
             | 'laptop' | 'money' | 'thumbs' | 'cheer' | 'think'
     expr  : 'happy' | 'surprised' | 'wink' | 'sly' | 'worried' | 'think' | 'proud'
     mouth : 0 → 1, ouverture de la bouche (synchronisée sur la voix)
     blink : 0 → 1, fermeture des paupières
     look  : [dx, dy] décalage du regard (en px)
     noFilter : true pour le dessin seul, sans contour d'autocollant
   Repère : 600 × 900, le bas du corps sort du cadre.
   Cadre : LTNSAvatar.VIEWBOX, assez large pour les bras tendus et le contour.
   ============================================================ */
(function () {
  const C = {
    skin: '#F6D2B8', skinShade: '#E9B896', skinDeep: '#D99E7C', blush: '#F2A190',
    hair: '#6B4226', hairLight: '#8C5A34', hairDark: '#4A2C18',
    iris: '#4F7FA8', irisDark: '#2F5677', pupil: '#17171C', line: '#2B1D15',
    lip: '#7A2E2A', mouthIn: '#5A1C1C', tongue: '#E07A72', teeth: '#FFFFFF',
    shirt: '#1E1E24', shirtLight: '#2A2A33', shirtDark: '#141418',
    paper: '#F5F3EE', orange: '#EA580C',
  }

  /* ---------- Mains (poignet en 0,0 ; les doigts vont vers +y) ---------- */
  const HANDS = {
    open: `
      <path d="M-24 -2 C-29 20 -27 48 -14 60 C-3 69 12 68 20 57 C29 45 29 20 24 -2 Z" fill="${C.skin}"/>
      <path d="M-10 40 L-11 60 M1 42 L1 64 M12 40 L13 60" stroke="${C.skinDeep}" stroke-width="3" stroke-linecap="round"/>
      <path d="M-21 10 C-38 14 -45 30 -37 38 C-30 44 -21 36 -17 27 Z" fill="${C.skin}"/>`,
    fist: `
      <path d="M-25 0 C-30 22 -26 48 -4 52 C17 55 30 42 27 17 C26 7 22 0 18 -2 Z" fill="${C.skin}"/>
      <path d="M-14 36 C-6 40 6 40 16 34" stroke="${C.skinDeep}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M-22 14 C-30 26 -24 38 -12 34" stroke="${C.skinDeep}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    point: `
      <path d="M-25 0 C-30 22 -26 46 -6 50 C14 53 28 42 26 17 C25 7 21 0 17 -2 Z" fill="${C.skin}"/>
      <path d="M-7 38 L-8 92 C-8 103 8 103 8 92 L8 38 Z" fill="${C.skin}"/>
      <path d="M-4 96 C-1 99 3 99 5 96" stroke="${C.skinDeep}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M-22 14 C-30 26 -24 38 -12 34" stroke="${C.skinDeep}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    thumb: `
      <path d="M-30 -2 C-36 20 -34 50 -20 58 C-6 64 16 64 26 56 C34 46 34 18 28 -2 Z" fill="${C.skin}"/>
      <path d="M-28 14 C-18 18 -6 18 4 14 M-29 28 C-19 32 -7 32 3 28 M-28 42 C-18 46 -6 46 4 42" stroke="${C.skinDeep}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M6 40 C4 62 4 82 10 94 C16 104 32 102 34 90 C36 74 34 56 30 40 Z" fill="${C.skin}"/>
      <path d="M13 88 C17 94 25 94 29 88" stroke="${C.skinDeep}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    hold: `
      <path d="M-24 -2 C-28 20 -26 44 -10 52 C4 58 20 52 25 38 C29 24 27 8 24 -2 Z" fill="${C.skin}"/>
      <path d="M-6 30 C2 36 12 34 18 28" stroke="${C.skinDeep}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  }

  /* ---------- Un bras : épaule → coude → poignet ---------- */
  // a1 : rotation du bras (0 = le long du corps), a2 : pli du coude, a3 : poignet
  function arm(x, y, a1, a2, a3, hand, extra = '') {
    return `
    <g transform="translate(${x} ${y}) rotate(${a1})">
      <path d="M-28 86 L-24 146 L24 146 L28 86 Z" fill="${C.skin}"/>
      <g transform="translate(0 140) rotate(${a2})">
        <circle r="25" fill="${C.skin}"/>
        <path d="M-25 0 L-21 124 L21 124 L25 0 Z" fill="${C.skin}"/>
        <path d="M-12 30 C-14 60 -12 90 -10 112" stroke="${C.skinShade}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
        <g transform="translate(0 122) rotate(${a3}) scale(1.12)">${HANDS[hand] || HANDS.open}${extra}</g>
      </g>
      <path d="M-40 -16 C-44 30 -40 74 -33 98 C-11 105 11 105 33 98 C40 74 44 30 40 -16 C24 -36 -24 -36 -40 -16 Z" fill="${C.shirt}"/>
      <path d="M-30 92 C-10 99 10 99 30 92" stroke="${C.shirtDark}" stroke-width="5" fill="none" stroke-linecap="round"/>
    </g>`
  }

  /* ---------- Accessoires tenus en main ---------- */
  const PHONE = `
    <g transform="translate(-6 18) rotate(180)">
      <rect x="-30" y="-58" width="60" height="112" rx="12" fill="#1A1A1F"/>
      <rect x="-25" y="-51" width="50" height="98" rx="8" fill="#2563EB"/>
      <rect x="-25" y="-51" width="50" height="98" rx="8" fill="url(#avScreen)"/>
      <rect x="-17" y="-36" width="34" height="6" rx="3" fill="#fff" opacity=".9"/>
      <rect x="-17" y="-24" width="24" height="4" rx="2" fill="#fff" opacity=".6"/>
      <rect x="-17" y="20" width="34" height="12" rx="6" fill="${C.orange}"/>
    </g>`

  const LAPTOP = `
    <g transform="translate(300 640)">
      <path d="M-150 -150 L150 -150 L150 30 L-150 30 Z" fill="#2B2B33"/>
      <rect x="-138" y="-138" width="276" height="156" rx="6" fill="#F5F3EE"/>
      <rect x="-138" y="-138" width="276" height="22" fill="#E7E2D7"/>
      <circle cx="-124" cy="-127" r="4" fill="${C.orange}"/><circle cx="-110" cy="-127" r="4" fill="#d97706"/><circle cx="-96" cy="-127" r="4" fill="#16a34a"/>
      <rect x="-120" y="-100" width="110" height="14" rx="3" fill="#1E1E24"/>
      <rect x="-120" y="-78" width="80" height="8" rx="3" fill="#9a958c"/>
      <rect x="-120" y="-52" width="70" height="56" rx="5" fill="#0891B2"/>
      <rect x="-42" y="-52" width="70" height="56" rx="5" fill="#7C3AED"/>
      <rect x="36" y="-52" width="84" height="56" rx="5" fill="${C.orange}"/>
      <path d="M-170 30 L170 30 L184 52 L-184 52 Z" fill="#3A3A44"/>
      <rect x="-40" y="34" width="80" height="6" rx="3" fill="#55555f"/>
    </g>`

  const BAG = `
    <g transform="translate(300 668)">
      <path d="M-40 -96 C-50 -116 -26 -126 -14 -112 C-6 -128 14 -128 18 -112 C30 -126 52 -116 40 -96 Z" fill="#C9A16A"/>
      <path d="M-46 -98 C-30 -90 30 -90 46 -98 L40 -84 C20 -78 -20 -78 -40 -84 Z" fill="#8B6A3E"/>
      <path d="M-40 -86 C-110 -40 -118 60 -60 96 C-20 116 20 116 60 96 C118 60 110 -40 40 -86 Z" fill="#D8B37C"/>
      <path d="M-60 -20 C-80 20 -74 70 -40 92" stroke="#B48E58" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>
      <text x="0" y="52" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="900" font-size="112" fill="#2B5E2B">€</text>
    </g>`

  /* ---------- Poses ---------- */
  // Épaules : gauche de l'écran (178, 478), droite (422, 478)
  const POSES = {
    idle:      { L: [12, -8, 0, 'open'],    R: [-12, 8, 0, 'open'] },
    wave:      { L: [12, -8, 0, 'open'],    R: [-128, -40, 0, 'open'] },
    pointUp:   { L: [12, -8, 0, 'open'],    R: [-22, -152, 0, 'point'] },
    pointSide: { L: [12, -8, 0, 'open'],    R: [-112, 22, 0, 'point'] },
    shrug:     { L: [30, 92, -20, 'open'],  R: [-30, -92, 20, 'open'] },
    phone:     { L: [12, -8, 0, 'open'],    R: [-14, -146, 0, 'hold', PHONE] },
    laptop:    { L: [16, -74, 0, 'hold'],   R: [-16, 74, 0, 'hold'], front: LAPTOP },
    money:     { L: [20, -100, 0, 'hold'],  R: [-20, 100, 0, 'hold'], front: BAG },
    thumbs:    { L: [12, -8, 0, 'open'],    R: [-24, -150, 0, 'thumb'] },
    cheer:     { L: [150, 20, 0, 'fist'],   R: [-150, -20, 0, 'fist'] },
    think:     { L: [12, -8, 0, 'open'],    R: [22, 150, 0, 'fist'] },
  }

  /* ---------- Visage ---------- */
  function eye(cx, cy, { blink = 0, look = [0, 0], wink = false, size = 1, lid = 0 }) {
    const rx = 24 * size, ry = 22 * size
    const shut = wink ? 1 : Math.max(blink, lid)
    if (shut >= 0.95) {
      return `<path d="M${cx - rx} ${cy + 2} Q${cx} ${cy + 14} ${cx + rx} ${cy + 2}" stroke="${C.line}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    }
    const [dx, dy] = look
    const id = `clip${cx}`
    // La paupière descend en couvrant le haut de l'œil
    const lidY = cy - ry + shut * ry * 2
    return `
      <clipPath id="${id}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff"/>
      <g clip-path="url(#${id})">
        <circle cx="${cx + dx}" cy="${cy + dy + 2}" r="${15 * size}" fill="${C.iris}"/>
        <circle cx="${cx + dx}" cy="${cy + dy + 2}" r="${15 * size}" fill="none" stroke="${C.irisDark}" stroke-width="3"/>
        <circle cx="${cx + dx}" cy="${cy + dy + 2}" r="${(size > 1.05 ? 6 : 7.5) * size}" fill="${C.pupil}"/>
        <circle cx="${cx + dx + 5}" cy="${cy + dy - 4}" r="${4.5 * size}" fill="#fff"/>
        ${shut > 0 ? `<rect x="${cx - rx - 2}" y="${cy - ry - 30}" width="${rx * 2 + 4}" height="${lidY - (cy - ry - 30)}" fill="${C.skin}"/>` : ''}
      </g>
      <path d="M${cx - rx - 2} ${lidY + 3} Q${cx} ${lidY - ry * 0.55 * (1 - shut)} ${cx + rx + 2} ${lidY + 3}" stroke="${C.line}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
  }

  function brow(cx, cy, angle, lift = 0) {
    return `<rect x="${cx - 28}" y="${cy - 7 - lift}" width="56" height="13" rx="6.5" fill="${C.hairDark}" transform="rotate(${angle} ${cx} ${cy - lift})"/>`
  }

  function mouthShape(kind, o) {
    const cx = 300, y = 350
    if (kind === 'O') {
      return `<ellipse cx="${cx}" cy="${y + 10}" rx="${13 + o * 4}" ry="${17 + o * 6}" fill="${C.mouthIn}"/>
              <ellipse cx="${cx}" cy="${y + 20 + o * 4}" rx="8" ry="5" fill="${C.tongue}"/>`
    }
    if (kind === 'smirk' && o < 0.08) {
      return `<path d="M276 352 Q302 360 326 340" stroke="${C.lip}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    }
    if (kind === 'worried' && o < 0.08) {
      return `<path d="M276 354 Q288 346 300 352 Q312 358 324 350" stroke="${C.lip}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    }
    // Sourire, plus ou moins ouvert selon la voix
    const w = kind === 'grin' ? 40 : 34
    const open = Math.max(0, Math.min(1, o))
    if (open < 0.08 && kind !== 'grin') {
      return `<path d="M${cx - w} ${y - 2} Q${cx} ${y + 22} ${cx + w} ${y - 2}" stroke="${C.lip}" stroke-width="5" fill="none" stroke-linecap="round"/>`
    }
    const depth = (kind === 'grin' ? 28 : 12) + open * 34
    const shape = `M${cx - w} ${y - 2} Q${cx} ${y + depth + 6} ${cx + w} ${y - 2} Q${cx} ${y + 4} ${cx - w} ${y - 2} Z`
    return `
      <clipPath id="mClip"><path d="${shape}"/></clipPath>
      <path d="${shape}" fill="${C.mouthIn}"/>
      <g clip-path="url(#mClip)">
        <rect x="${cx - w}" y="${y - 6}" width="${w * 2}" height="${10 + open * 2}" fill="${C.teeth}"/>
        <ellipse cx="${cx}" cy="${y + depth + 4}" rx="${w * 0.6}" ry="${8 + open * 6}" fill="${C.tongue}"/>
      </g>
      <path d="${shape}" fill="none" stroke="${C.lip}" stroke-width="3" stroke-linejoin="round"/>`
  }

  const EXPR = {
    happy:     { browL: [-4, 0], browR: [4, 0], mouth: 'smile', size: 1 },
    proud:     { browL: [-6, 4], browR: [6, 4], mouth: 'grin', size: 1 },
    surprised: { browL: [-8, 16], browR: [8, 16], mouth: 'O', size: 1.14 },
    wink:      { browL: [4, -2], browR: [4, 8], mouth: 'grin', size: 1, winkL: true },
    sly:       { browL: [6, -2], browR: [-10, 10], mouth: 'smirk', size: 1, lid: 0.38, look: [6, 0] },
    worried:   { browL: [14, 6], browR: [-14, 6], mouth: 'worried', size: 1.04, sweat: true },
    think:     { browL: [-2, 6], browR: [10, -2], mouth: 'smirk', size: 1, look: [8, -7] },
  }

  function face({ expr = 'happy', mouth = 0, blink = 0, look }) {
    const e = EXPR[expr] || EXPR.happy
    const lk = look || e.look || [0, 0]
    return `
      ${brow(255, 222, e.browL[0], e.browL[1])}
      ${brow(345, 222, e.browR[0], e.browR[1])}
      ${eye(255, 264, { blink, look: lk, wink: e.winkL, size: e.size, lid: e.lid || 0 })}
      ${eye(345, 264, { blink, look: lk, size: e.size, lid: e.lid || 0 })}
      <path d="M302 282 C298 300 290 314 300 318 C307 321 314 317 316 312" stroke="${C.skinDeep}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse cx="236" cy="318" rx="22" ry="11" fill="${C.blush}" opacity=".35"/>
      <ellipse cx="364" cy="318" rx="22" ry="11" fill="${C.blush}" opacity=".35"/>
      ${mouthShape(e.mouth, mouth)}
      <path d="M268 334 C282 324 296 327 300 331 C304 327 318 324 332 334 C320 339 308 339 300 336 C292 339 280 339 268 334 Z" fill="${C.hair}"/>
      ${e.sweat ? `<path d="M412 190 C404 206 400 216 404 224 C408 232 422 232 424 222 C426 214 420 204 412 190 Z" fill="#7CC4F0" stroke="#fff" stroke-width="3"/>` : ''}`
  }

  /* ---------- Assemblage ---------- */
  const VB = [-150, -40, 900, 1000]
  // Identifiants uniques par dessin : plusieurs avatars peuvent cohabiter sur une page
  let uid = 0
  const scope = (markup) => {
    const u = `av${++uid}`
    return markup.replace(/id="([^"]+)"/g, `id="${u}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${u}-$1)`)
  }

  function svg(opts = {}) {
    const pose = POSES[opts.pose] || POSES.idle
    const [la1, la2, la3, lh, lx] = pose.L
    const [ra1, ra2, ra3, rh, rx] = pose.R
    // Les bras levés au-dessus des épaules passent derrière la tête
    const armsBehind = opts.pose === 'cheer'
    const armL = arm(178, 478, la1, la2, la3, lh, lx || '')
    const armR = arm(422, 478, ra1, ra2, ra3, rh, rx || '')
    return scope(`
<svg class="ltns-avatar" viewBox="${VB.join(' ')}" width="${VB[2]}" height="${VB[3]}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="avSticker" filterUnits="userSpaceOnUse" x="${VB[0]}" y="${VB[1]}" width="${VB[2]}" height="${VB[3]}">
      <feMorphology in="SourceAlpha" operator="dilate" radius="17" result="o2"/>
      <feMorphology in="SourceAlpha" operator="dilate" radius="14" result="o1"/>
      <feGaussianBlur in="o2" stdDeviation="9" result="blur"/>
      <feOffset in="blur" dy="12" result="sh"/>
      <feFlood flood-color="#1d1d22" flood-opacity=".22"/><feComposite in2="sh" operator="in" result="shadow"/>
      <feFlood flood-color="#26262c"/><feComposite in2="o2" operator="in" result="dark"/>
      <feFlood flood-color="#ffffff"/><feComposite in2="o1" operator="in" result="white"/>
      <feMerge><feMergeNode in="shadow"/><feMergeNode in="dark"/><feMergeNode in="white"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <linearGradient id="avScreen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0891B2"/><stop offset=".5" stop-color="#7C3AED"/><stop offset="1" stop-color="#EA580C"/>
    </linearGradient>
  </defs>
  <g${opts.noFilter ? '' : ' filter="url(#avSticker)"'}>
    ${armsBehind ? armL + armR : ''}
    <!-- Corps -->
    <path d="M150 520 C148 470 184 444 240 432 L268 426 C282 442 318 442 332 426 L360 432 C416 444 452 470 450 520 L462 940 L138 940 Z" fill="${C.shirt}"/>
    <path d="M168 520 C170 600 172 760 176 940 L150 940 L148 560 Z" fill="${C.shirtDark}" opacity=".7"/>
    <path d="M432 520 C430 600 428 760 424 940 L450 940 L452 560 Z" fill="${C.shirtDark}" opacity=".7"/>
    <!-- Cou -->
    <path d="M266 360 L266 436 C282 452 318 452 334 436 L334 360 Z" fill="${C.skin}"/>
    <path d="M266 380 C282 404 318 404 334 380 L334 360 L266 360 Z" fill="${C.skinShade}"/>
    <path d="M258 428 C274 456 326 456 342 428" stroke="${C.shirtLight}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <!-- Logo sur le t-shirt -->
    <text x="300" y="590" text-anchor="middle" font-family="'Space Grotesk', sans-serif" font-weight="700" font-size="38" letter-spacing="-1" fill="${C.paper}">LTNS<tspan fill="${C.orange}">°</tspan></text>
    <g transform="translate(300 430) scale(1.22) translate(-300 -430)">
    <!-- Oreilles -->
    <ellipse cx="184" cy="266" rx="21" ry="33" fill="${C.skin}"/><path d="M186 248 C176 258 178 278 188 284" stroke="${C.skinDeep}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="416" cy="266" rx="21" ry="33" fill="${C.skin}"/><path d="M414 248 C424 258 422 278 412 284" stroke="${C.skinDeep}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- Visage -->
    <path d="M184 214 C184 140 238 108 300 108 C362 108 416 140 416 214 L416 262 C416 330 372 392 300 400 C228 392 184 330 184 262 Z" fill="${C.skin}"/>
    <!-- Barbe courte -->
    <path d="M186 262 C188 330 228 390 300 404 C372 390 412 330 414 262 C404 312 384 344 352 360 C338 350 320 346 300 348 C280 346 262 350 248 360 C216 344 196 312 186 262 Z" fill="${C.hairLight}" opacity=".78"/>
    <!-- Cheveux -->
    <path d="M176 252 C162 170 190 110 250 88 C294 72 354 76 394 102 C430 126 440 178 426 250 C420 214 412 194 398 180 C374 160 338 154 300 158 C262 160 232 166 212 182 C196 196 184 220 176 252 Z" fill="${C.hair}"/>
    <path d="M226 128 C244 70 334 46 388 88 C356 80 322 88 300 108 C284 92 254 100 226 128 Z" fill="${C.hairLight}"/>
    <path d="M250 104 C272 88 300 86 318 92 M330 80 C352 78 372 86 384 98" stroke="${C.hairDark}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>
    <path d="M180 214 L194 214 L196 266 L184 262 Z" fill="${C.hair}"/>
    <path d="M420 214 L406 214 L404 266 L416 262 Z" fill="${C.hair}"/>
    ${face(opts)}
    </g>
    ${armsBehind ? '' : armL + armR}
    ${pose.front || ''}
  </g>
</svg>`)
  }

  window.LTNSAvatar = { svg, VIEWBOX: VB, POSES: Object.keys(POSES), EXPR: Object.keys(EXPR) }
})()
