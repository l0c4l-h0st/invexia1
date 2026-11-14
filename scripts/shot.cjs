// Outil de test : ouvre le jeu en viewport mobile, attend, capture, remonte les erreurs console.
// usage: node scripts/shot.cjs "<query>" <secondes> <sortie.png> [jsAvantAttente] [jsApres]
const { chromium } = require('playwright');
(async () => {
  const [query = '', wait = '3', out = 'shot.png', pre = '', post = ''] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const scale = Number(process.env.SCALE || 1);
  const ctx = await browser.newContext({ viewport: { width: Number(process.env.W || 390), height: Number(process.env.H || 844) }, deviceScaleFactor: scale, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    const t = m.text();
    if ((m.type() === 'error' || m.type() === 'warning') && !/GL Driver|vibrate/.test(t)) errors.push('[' + m.type() + '] ' + t);
  });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.goto('http://localhost:' + (process.env.PORT || 4173) + '/?' + query);
  await page.waitForTimeout(1200);
  if (pre) await page.evaluate(pre);
  await page.waitForTimeout(Number(wait) * 1000);
  if (post) console.log('eval:', JSON.stringify(await page.evaluate(post)));
  await page.screenshot({ path: out });
  console.log(errors.slice(0, 12).join('\n') || 'no console errors');
  await browser.close();
})();
