# Palace Rush

Arcade idle de gestion d'hôtel en 3D, jouable à un doigt, en portrait. Du motel miteux au palace.
Web mobile (PWA), Vite + TypeScript + Three.js.

## Lancer

```bash
npm install
npm run dev        # http://<ip-du-pc>:5173 — à ouvrir sur un téléphone du même Wi-Fi
```

## Construire et déployer

```bash
npm run build      # build statique dans dist/ (PWA installable)
npm run preview    # vérifier le build en local
```

`dist/` est un site 100 % statique (chemins relatifs) : il se dépose tel quel sur n'importe quel
hébergeur. Le workflow `.github/workflows/deploy.yml` le publie sur GitHub Pages à chaque push sur
`main` (activer une fois : *Settings → Pages → Source : GitHub Actions*).

`npm run build:single` produit le jeu en **un seul fichier HTML** (`dist-single/index.html`), pratique
pour un partage rapide ; sans service worker, donc non installable.

## Documentation

- `CLAUDE.md` — règles du projet, architecture, commandes.
- `docs/GDD.md` — game design et formules d'économie.
- `docs/JOURNAL.md` — historique daté et décisions.
- `docs/TODO.md` — reste à faire.
- `docs/ASSETS.md` — assets et licences.
