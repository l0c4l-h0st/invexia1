# Journal de développement

## 2026-11-13 / 14 — Session 1

### Étape 0 — repo
- Tag `backup-avant-reset` créé **en local** sur le commit `583163d` (ancien projet Next.js).
- ⚠️ Le **push du tag a été refusé** (HTTP 403) : le proxy git de la session n'autorise que la
  branche de travail. La sauvegarde existe quand même à distance : la branche `main` pointe sur ce
  même commit et n'a pas été touchée. Commande à lancer depuis le PC : voir `docs/TODO.md`.
- Tout le contenu du repo supprimé (hors `.git`), nouveau projet créé sur la branche
  `claude/palace-rush-idle-hotel-okk14b`.

### J1 — contrôles + caméra + motel jouable
- Stack posée : Vite + TypeScript strict + Three.js, store minimal, sauvegarde versionnée.
- Joystick flottant (`src/core/input.ts`) : le doigt posé n'importe où crée le stick ; le socle suit
  le doigt quand on dépasse le rayon. Clavier ZQSD/flèches pour le test sur PC.
- Caméra aérienne à 50°, suivi lissé exponentiel, largeur visible fixe en portrait.
- Boucle complète : file d'attente → enregistrement (zone) → chambre → sommeil → cash + chambre sale →
  réserve de linge (pile sur le dos) → nettoyage (zone) → cash qui vole → dalles d'achat au sol.
- Guidage : flèche 3D sur la cible + chevron au sol près du joueur + jauge "prochain déblocage".

### Décisions prises (sans poser de questions)
- **Assets procéduraux** : Kenney / Quaternius / Poly Pizza bloqués par le réseau (403). Tout est
  modélisé par code avec des primitives arrondies fusionnées. Détails dans `docs/ASSETS.md`.
- **Audio procédural** (WebAudio) : pas de fichier son, pas de licence, poids nul.
- **Icônes SVG maison** plutôt que des emojis : rendu identique sur tous les téléphones.
- **Personnages instanciés** : ~9 draw calls pour tous les personnages, animation calculée sur CPU.
- **Navigation PNJ par "épine"** : chaque lieu connaît son chemin jusqu'au couloir central ; pas de
  pathfinding générique (inutile avec ce plan d'hôtel, et beaucoup plus léger).
- **Serviettes et papier** : un seul type de fourniture côté règles (1 par chambre), deux visuels
  alternés dans la pile. Plus simple à lire pour le joueur.
- **Le cash est crédité tout de suite** au ramassage ; le compteur du HUD rattrape en douceur et les
  billets volent pour le plaisir. Aucun cash perdu si on ferme l'app en plein vol.
- **Bot de test** (`?bot=1&speed=N&headless=1`) : suit la même logique que la flèche de guidage.
  Sert à vérifier la boucle et à mesurer la durée de chaque palier (`scripts/sim.cjs`).
