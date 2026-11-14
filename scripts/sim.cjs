// Équilibrage : fait jouer le bot en accéléré sans rendu et journalise les étapes.
// usage: node scripts/sim.cjs [minutesDeJeuMax=180] [speed=400] [query supplémentaire]
const { chromium } = require('playwright');
(async () => {
  const [maxMin = '180', speed = '400', extra = ''] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const port = process.env.PORT || 4173;
  await page.goto('http://localhost:' + port + '/?bot=1&headless=1&speed=' + speed + (extra ? '&' + extra : ''));
  const probe = () =>
    page.evaluate(() => {
      const g = window.__game;
      const s = g.s;
      return {
        t: s.stats.playTime,
        city: s.city,
        tier: s.tier,
        rooms: s.rooms,
        lvl: s.roomLevel,
        cash: Math.round(s.cash),
        run: Math.round(s.runCash),
        staff: s.staff,
        svc: s.services.length,
        f: Object.keys(s.features).filter((k) => s.features[k]).join(','),
        up: s.up,
        bought: Object.keys(s.bought).length,
        guests: s.stats.guests,
        target: g.target && g.target.kind,
        pos: [g.px.toFixed(1), g.pz.toFixed(1)],
      };
    });
  const mm = (t) => (t / 60).toFixed(1) + 'min';
  let last = '';
  let lastBought = -1;
  let stale = 0;
  const t0 = Date.now();
  for (;;) {
    await page.waitForTimeout(400);
    const p = await probe();
    const key = p.city + '.' + p.tier + '|' + p.f;
    if (key !== last) {
      console.log('@' + mm(p.t) + ' ville ' + p.city + ' palier ' + p.tier + ' | systèmes: ' + (p.f || '-') + ' | run $' + p.run + ' | étoiles≈' + Math.floor(Math.sqrt(p.run / 15000)));
      last = key;
    }
    const b = p.bought + p.tier * 100 + p.city * 1000;
    if (b !== lastBought) {
      lastBought = b;
      stale = 0;
      console.log('   ' + mm(p.t) + ' achats=' + p.bought + ' ch=' + p.rooms + ' niv=' + p.lvl + ' svc=' + p.svc + ' staff=' + p.staff.receptionist + '/' + p.staff.housekeeper + '/' + p.staff.bellhop + ' cash=$' + p.cash + ' clients=' + p.guests);
    } else if (++stale % 40 === 0) {
      console.log('   … ' + mm(p.t) + ' en attente : cash=$' + p.cash + ' cible=' + p.target + ' pos=' + p.pos + ' up=' + JSON.stringify(p.up));
    }
    if (p.t / 60 > Number(maxMin) || Date.now() - t0 > 540000) break;
  }
  await browser.close();
})();
