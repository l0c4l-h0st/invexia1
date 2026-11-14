# TODO

## Demande ton PC ou ton téléphone (je ne peux pas le faire d'ici)

1. **Pousser le tag de sauvegarde.** Le push a été refusé par le proxy de la session (HTTP 403).
   `main` pointe toujours sur ce commit, donc rien n'est perdu, mais le tag n'existe pas à distance :
   ```bash
   git fetch origin
   git tag backup-avant-reset 583163d4201634d69ff6f7cc73ada5b7fd1e62fe
   git push origin backup-avant-reset
   ```
2. **Tester sur un vrai téléphone.** Tout a été vérifié dans un Chromium sans écran, en rendu
   logiciel. Restent à valider sur appareil :
   - le toucher : sensibilité du joystick (`max`, zone morte dans `src/core/input.ts`) ;
   - les 60 fps réels sur un milieu de gamme, surtout au Palace complet ;
   - le son : mixage musique / effets, jamais écouté à l'oreille ;
   - les vibrations (Android uniquement, iOS Safari ne les expose pas) ;
   - les safe areas (encoche, barre de gestes) et l'installation PWA sur l'écran d'accueil.
3. **Activer GitHub Pages** pour une URL publique : *Settings → Pages → Source : GitHub Actions*.
   Le workflow `.github/workflows/deploy.yml` déploie à chaque push sur `main`
   (URL attendue : `https://l0c4l-h0st.github.io/invexia1/`). Sur un dépôt privé, Pages demande une
   offre payante.
4. **Emballage Capacitor** (Android / iOS), quand tu voudras publier sur les stores :
   ```bash
   npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
   npm run build
   npx cap add android && npx cap add ios     # iOS : Mac + Xcode obligatoires
   npx cap sync
   npx cap open android
   ```
   `capacitor.config.json` est déjà prêt (`webDir: dist`). Pour le natif, désactiver le service
   worker (inutile dans une app) et brancher une vraie implémentation d'`AdProvider`.
5. **Essayer des packs GLB CC0** si ton réseau y accède (Kenney, Quaternius, Poly Pizza étaient
   bloqués ici). Le style procédural actuel est cohérent ; ne remplacer que si le rendu y gagne, et
   noter chaque licence dans `docs/ASSETS.md`.

## Jalons
- [x] J1 contrôles + caméra + motel jouable (boucle complète)
- [x] J2 graphismes, animations, sons, "juice"
- [x] J3 staff + améliorations + sauvegarde + hors-ligne
- [x] J4 5 paliers d'hôtel + économie équilibrée
- [x] J5 carte du monde + prestige + quêtes
- [x] J6 perf mobile, PWA, i18n, polish

## Reste à faire

### Priorité 1 — à confirmer en jouant (début refait en session 2)
- Rejouer les 3 premières minutes : le rythme est-il le bon ? Tout se règle dans `src/balance.ts`
  (`guest.sleep`, `guest.spawnEvery`, chaîne du motel, `unlock.staffTime`, `combo`, `tips`).
- Le combo est-il lisible et motivant, ou de trop ? Il se coupe en mettant `combo.per` à 0.

- Ajuster l'équilibrage global sur des parties humaines : il a été réglé avec un bot qui ne se trompe
  jamais (estimation : un humain est ~1,5× plus lent). Tout se règle dans `src/balance.ts`.
- Régler le feeling d'après le test réel : vitesse du joueur, zoom caméra (`VIEW_W` dans
  `src/gfx/stage.ts`), durée des cercles, volume des sons.
- Vérifier la lisibilité du tutoriel avec quelqu'un qui n'a jamais vu le jeu.

### Priorité 2 — contenu et profondeur
- Services interactifs : aujourd'hui ils rapportent passivement (les clients y passent et laissent du
  cash). Idées : réapprovisionner le restaurant, nettoyer la piscine, staff dédié par service.
- Bagagiste qui porte réellement les valises jusqu'à la chambre (actuellement il ramasse le cash et
  donne un bonus de pourboire).
- Clients qui arrivent en voiture, VIP qui arrivent en hélicoptère au Palace.
- Carte du monde illustrée (aujourd'hui : une liste de villes avec progression).
- Plus de variété de quêtes ; récompense quotidienne.
- Portes animées, plus d'animations de staff (balai, plumeau).

### Priorité 3 — technique
- Découper le bundle (three.js = l'essentiel des 720 Ko, 195 Ko gzip) si le premier chargement
  semble long en 4G.
- Tests unitaires sur `src/game/economy.ts` et `src/core/save.ts` (migrations).
- Sauvegarde cloud / export-import de sauvegarde (aujourd'hui : localStorage uniquement).
- Retirer ou protéger les paramètres d'URL de test (`?bot`, `?speed`, `?tier`…) avant une sortie
  publique : ils permettent de tricher.
- Autres langues (les textes sont déjà tous dans `src/i18n/`).

## Limites connues
- Les PNJ ne s'évitent pas entre eux (ils se croisent en se traversant légèrement).
- Les gains hors-ligne sont une estimation (`autoIncome`), pas une simulation exacte.
- Le gain d'étoiles grossit très vite au-delà de la 2e ville (×2 500 de revenus par ville sous une
  racine carrée). C'est voulu pour un idle, mais l'équilibrage long terme (villes 3+) n'a été
  simulé que partiellement.
- La musique est générée : elle boucle sur 4 mesures avec de petites variations aléatoires.
