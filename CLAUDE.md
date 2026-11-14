# Palace Rush — règles du projet

Jeu mobile web 3D : arcade idle de gestion d'hôtel, jouable à un doigt, portrait.
Le titre se change dans **un seul fichier** : `src/config.ts`.

## À lire / tenir à jour à CHAQUE session
- `docs/JOURNAL.md` — ce qui a été fait (daté) + décisions prises.
- `docs/TODO.md` — ce qui reste, par priorité, et ce qui demande le PC du propriétaire.
- `docs/GDD.md` — game design et formules d'économie (miroir lisible de `src/balance.ts`).
- `docs/ASSETS.md` — origine et licence de chaque asset.

## Stack
- Vite + TypeScript (strict) + Three.js. Aucun framework UI : DOM + CSS.
- État : store minimal (`src/core/store.ts`), sauvegarde localStorage versionnée (`src/core/save.ts`).
- PWA via `vite-plugin-pwa` (manifest généré depuis `src/config.ts`).
- Audio 100 % procédural (WebAudio), modèles 100 % procéduraux : aucun fichier binaire d'asset.

## Commandes
| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de dev (accessible sur le réseau local : tester sur téléphone) |
| `npm run build` | typecheck + build statique dans `dist/` (PWA) |
| `npm run preview` | sert `dist/` |
| `npm run build:single` | build en UN fichier HTML dans `dist-single/` (partage rapide) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run icons` | régénère les icônes PWA (`public/icons/`) |
| `node scripts/shot.cjs "<query>" <s> <out.png>` | capture en viewport mobile (serveur preview lancé) |
| `node scripts/sim.cjs <minutes> <speed>` | fait jouer le bot en accéléré pour équilibrer |

Paramètres d'URL de test : `?bot=1` (auto-joueur), `?speed=N` (accéléré), `?headless=1` (sans rendu),
`?tier=0..4&city=N` (saute à un palier), `&demo=1` (tout acheté). Les sauts ne sauvegardent pas.

## Architecture
```
src/config.ts        titre, clé de sauvegarde, couleur de thème
src/balance.ts       TOUTE l'économie (coûts, vitesses, déblocages, prestige)
src/core/            store, save, input (joystick), audio, ads (AdProvider factice), format (K, M, aa…)
src/game/layout.ts   géométrie logique d'un établissement + navigation des PNJ
src/game/economy.ts  formules dérivées de balance.ts
src/game/game.ts     simulation : joueur, clients, staff, zones, dalles d'achat, guidage, bot
src/game/quests.ts   quêtes et succès
src/gfx/             rendu : stage (caméra/lumières), build (fusion de primitives), props, hotel,
                     chars (persos instanciés), fx (billets, particules, zones), tiles, styles
src/ui/              HUD + panneaux (ui.ts), icônes SVG maison (icons.ts), style.css
src/i18n/            fr.ts (défaut), en.ts — AUCUN texte en dur ailleurs
```

## Règles non négociables
1. **Un seul contrôle** : joystick flottant (doigt posé n'importe où). Aucun bouton d'action :
   tout se déclenche en entrant dans une zone au sol. Les seuls boutons sont ceux de l'UI.
2. **Aucune valeur de gameplay hors de `src/balance.ts`.** Toute modif d'équilibrage → mettre à jour `docs/GDD.md`.
3. **Aucun texte en dur** : passer par `t('clé')` et renseigner `fr.ts` ET `en.ts`.
4. **Perf mobile** : tout ce qui se répète est instancié (`InstancedMesh`), le décor est fusionné
   (`Builder`), pas d'ombres temps réel (blob shadows + ombres cuites), pixel ratio ≤ 2.
5. **Style unifié** : formes arrondies "chunky", couleurs de `src/gfx/styles.ts`, pas de look prototype.
6. **Systèmes introduits un par un** (`B.unlock` + `Game.checkFeatures`) : boucle de base, puis staff,
   améliorations, bonus, quêtes, prestige.
7. Monétisation **factice** : tout passe par `AdProvider` (`src/core/ads.ts`). Aucune pub forcée.
8. À chaque jalon : `npm run build`, test en viewport mobile (`scripts/shot.cjs`), commit, journal à jour.
9. Ne pas poser de questions au propriétaire : décider, noter le choix dans `docs/JOURNAL.md`,
   lister dans `docs/TODO.md` ce qui demande son PC.

## Capacitor (plus tard)
`capacitor.config.json` est prêt (`webDir: dist`). Voir `docs/TODO.md` pour les commandes à lancer sur PC.
