// Outil de test : ouvre le jeu en viewport mobile, attend, capture, remonte les erreurs console.
// usage: node scripts/shot.cjs "<query>" <secondes> <sortie.png> [evalJS]
const { chromium } = require('playwright');
(async () => {
const [query = '', wait = '3', out = 'shot.png', evalJs = ''] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
await page.goto(`http://localhost:${process.env.PORT || 4173}/?${query}`);
await page.waitForTimeout(Number(wait) * 1000);
if (evalJs) console.log('eval:', JSON.stringify(await page.evaluate(evalJs)));
await page.screenshot({ path: out });
console.log(errors.slice(0, 12).join('\n') || 'no console errors');
await browser.close();
})();
