// Génère les icônes PWA (public/icons/*.png) à partir d'un SVG dessiné ici. `npm run icons`
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const art = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6a4be0"/><stop offset="1" stop-color="#2b2350"/>
    </linearGradient>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffb65c"/><stop offset="1" stop-color="#ff8a3d"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 262) scale(${pad}) translate(-256 -262)">
    <ellipse cx="256" cy="432" rx="170" ry="26" fill="#1a1338" opacity=".55"/>
    <rect x="132" y="150" width="248" height="280" rx="30" fill="url(#wall)"/>
    <rect x="110" y="120" width="292" height="62" rx="26" fill="#e8651c"/>
    <rect x="110" y="120" width="292" height="30" rx="15" fill="#ff8a3d"/>
    <g fill="#fff5c2">
      <rect x="166" y="210" width="62" height="62" rx="14"/><rect x="284" y="210" width="62" height="62" rx="14"/>
      <rect x="166" y="296" width="62" height="62" rx="14"/><rect x="284" y="296" width="62" height="62" rx="14"/>
    </g>
    <rect x="222" y="352" width="68" height="78" rx="16" fill="#7a3410"/>
    <circle cx="274" cy="394" r="7" fill="#ffc933"/>
    <path d="M256 22l27 58 63 8-46 44 12 63-56-31-56 31 12-63-46-44 63-8z" fill="#ffd23f" stroke="#e8951c" stroke-width="12" stroke-linejoin="round"/>
    <path d="M256 54l15 32 14 2" fill="none" stroke="#fff6c9" stroke-width="10" stroke-linecap="round"/>
  </g>
</svg>`;

(async () => {
  const out = path.join(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const jobs = [
    ['icon-192.png', 192, 1, 42],
    ['icon-512.png', 512, 1, 112],
    ['icon-maskable-512.png', 512, 0.74, 0],
  ];
  for (const [name, size, pad, radius] of jobs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;border-radius:${radius}px;overflow:hidden">${art(pad)}</div></body>`);
    await page.screenshot({ path: path.join(out, name), omitBackground: true });
    await page.close();
  }
  fs.writeFileSync(path.join(out, 'icon.svg'), art(1).trim());
  await browser.close();
  console.log('icônes écrites dans public/icons');
})();
