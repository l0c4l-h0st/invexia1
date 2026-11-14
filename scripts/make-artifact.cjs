// Transforme dist-single/index.html (document complet) en fragment publiable comme aperçu hébergé :
// titre + styles + contenu du body + script, sans <html>/<head>/<body>. Sortie : dist-single/palace-rush.html
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'dist-single');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, 'Palace Rush'])[1];
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join('\n');
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/) || [, ''])[1].replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
if (!styles || !scripts.length) throw new Error('build mono-fichier introuvable : lancer `npm run build:single` avant');

const out = [
  `<title>${title}</title>`,
  '<style>:root{color-scheme:dark}</style>',
  styles,
  body.trim(),
  ...scripts,
].join('\n');
fs.writeFileSync(path.join(dir, 'palace-rush.html'), out);
console.log('dist-single/palace-rush.html', (out.length / 1024).toFixed(0) + ' Ko');
